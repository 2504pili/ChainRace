"use client";

import { useEffect, useRef } from "react";

type Props = {
  running: boolean;
  onFinish: (elapsedMs: number) => void;
};

// 升级版赛车：弯道赛道 + 出弯惩罚 + 氮气
export default function RaceCanvas({ running, onFinish }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // 保存外部回调，避免因父组件重渲染而重置主循环
  const finishRef = useRef(onFinish);
  useEffect(() => { finishRef.current = onFinish; }, [onFinish]);

  type KeysType = { left: boolean; right: boolean; accel: boolean; nitro: boolean };
  type Point = { x: number; y: number; theta: number; kappa: number; vmax: number };

  const stateRef = useRef({
    startTs: 0,
    lastTs: 0,
    elapsed: 0,
    // 车辆动力
    speed: 0, // m/s
    baseMaxSpeed: 85,
    accel: 60,
    friction: 28,
    lateral: 0, // 车辆相对中心线的横向偏移 (m)
    lateralVel: 0,
    steerStrength: 18, // 越大转向越快
    // 赛道
    s: 0, // 已行驶里程 (m)
    S: 1300, // 总长度(m)
    trackWidth: 12, // 赛道半宽 6m
    path: [] as Point[],
    // 氮气
    nitro: 100, // 百分比
    nitroUseRate: 30, // /s
    nitroRecharge: 12, // /s
    nitroBoost: 55, // 额外加速度
    nitroTopUp: 35, // 顶速加成
    // 键盘
    keys: { left: false, right: false, accel: false, nitro: false } as KeysType,
    // 渲染
    rafId: 0 as number | 0,
    width: 1000,
    height: 480,
    // 惩罚与提示
    offTrack: false,
    slipTimer: 0,
  });

  // 构建弯道赛道（曲率片段）
  const buildTrack = (S: number): Point[] => {
    // 片段：len(m), kappa(曲率), vmax(建议最大速度)
    const segs = [
      { len: 200, kappa: 0.0, vmax: 80 }, // 起步直线
      { len: 180, kappa: +0.006, vmax: 55 }, // 右弯
      { len: 140, kappa: 0.0, vmax: 80 },
      { len: 200, kappa: -0.007, vmax: 52 }, // 左弯
      { len: 160, kappa: 0.0, vmax: 80 },
      { len: 220, kappa: +0.004, vmax: 62 }, // 长右弯
      { len: 200, kappa: 0.0, vmax: 80 },
    ];
    const pts: Point[] = [];
    let theta = Math.PI / 2; // 向下
    let x = 0, y = 0;
    for (const seg of segs) {
      const ds = 5; // 采样步长
      const steps = Math.floor(seg.len / ds);
      for (let i = 0; i < steps; i++) {
        theta += seg.kappa * ds; // dθ/ds = κ
        x += Math.cos(theta) * ds;
        y += Math.sin(theta) * ds;
        pts.push({ x, y, theta, kappa: seg.kappa, vmax: seg.vmax });
      }
    }
    // 归一化到屏幕：y 单调增即可，x 在[-W, W]
    return pts;
  };

  // 键盘控制（全局捕获，避免必须聚焦某元素）
  useEffect(() => {
    const shouldIgnore = (target: EventTarget | null) => {
      if (!target || !(target as HTMLElement)) return false;
      const el = target as HTMLElement;
      const tag = el.tagName;
      const editable = el.getAttribute && (el.getAttribute("contenteditable")?.toLowerCase() === "true");
      return tag === "INPUT" || tag === "TEXTAREA" || editable;
    };

    const onKey = (e: KeyboardEvent, down: boolean) => {
      const controlKeys = [
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "Space",
        "ShiftLeft",
        "ShiftRight",
        // 兼容 WASD 与 N
        "KeyA",
        "KeyD",
        "KeyW",
        "KeyS",
        "KeyN",
      ];
      if (controlKeys.includes(e.code)) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (shouldIgnore(e.target)) return; // 不干扰输入框
      if (e.code === "ArrowLeft" || e.code === "KeyA") stateRef.current.keys.left = down;
      if (e.code === "ArrowRight" || e.code === "KeyD") stateRef.current.keys.right = down;
      if (e.code === "ArrowUp" || e.code === "Space" || e.code === "KeyW") stateRef.current.keys.accel = down;
      if (e.code === "ShiftLeft" || e.code === "ShiftRight" || e.code === "KeyN") stateRef.current.keys.nitro = down;
    };
    const down = (e: KeyboardEvent) => onKey(e, true);
    const up = (e: KeyboardEvent) => onKey(e, false);
    // 在捕获阶段监听，避免被其他组件阻断
    document.addEventListener("keydown", down, { capture: true });
    document.addEventListener("keyup", up, { capture: true });
    return () => {
      document.removeEventListener("keydown", down, { capture: true } as any);
      document.removeEventListener("keyup", up, { capture: true } as any);
    };
  }, []);

  // 初始化与主循环
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reset = () => {
      const s = stateRef.current;
      s.startTs = 0;
      s.lastTs = 0;
      s.elapsed = 0;
      s.speed = 0;
      s.lateral = 0;
      s.lateralVel = 0;
      s.s = 0;
      s.path = buildTrack(s.S);
      s.nitro = 100;
      s.offTrack = false;
      s.slipTimer = 0;
    };

    const worldToScreen = (wx: number, wy: number, s: number) => {
      // 将世界坐标映射到屏幕：y 相对当前里程 s 的窗口移动
      const yOffset = wy - s; // 相对车辆位置（车辆在底部）
      const sy = canvas.height - (yOffset * 0.4 + 120); // 纵向压缩比例
      const sx = canvas.width / 2 + wx * 0.6; // 横向比例
      return { x: sx, y: sy };
    };

    const drawTrack = (st: typeof stateRef.current) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#0b1220";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 渲染可视窗口段
      const pts = st.path;
      if (pts.length < 2) return;
      const W = st.trackWidth; // 半宽 12m → 实际画宽 *比例

      ctx.save();
      // 画赛道面（多边形条带）
      ctx.beginPath();
      for (let i = 0; i < pts.length - 1; i++) {
        const p = pts[i];
        const n = { x: -Math.sin(p.theta), y: Math.cos(p.theta) }; // 法向
        const L = worldToScreen(p.x + n.x * W, p.y + n.y * W, st.s);
        if (i === 0) ctx.moveTo(L.x, L.y);
        else ctx.lineTo(L.x, L.y);
      }
      for (let i = pts.length - 1; i >= 0; i--) {
        const p = pts[i];
        const n = { x: -Math.sin(p.theta), y: Math.cos(p.theta) };
        const R = worldToScreen(p.x - n.x * W, p.y - n.y * W, st.s);
        ctx.lineTo(R.x, R.y);
      }
      ctx.closePath();
      ctx.fillStyle = "#0f172a";
      ctx.fill();

      // 边线
      ctx.strokeStyle = "rgba(37,99,235,0.35)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < pts.length - 1; i += 2) {
        const p = pts[i];
        const n = { x: -Math.sin(p.theta), y: Math.cos(p.theta) };
        const L = worldToScreen(p.x + n.x * W, p.y + n.y * W, st.s);
        if (i === 0) ctx.moveTo(L.x, L.y); else ctx.lineTo(L.x, L.y);
      }
      ctx.stroke();
      ctx.beginPath();
      for (let i = 0; i < pts.length - 1; i += 2) {
        const p = pts[i];
        const n = { x: -Math.sin(p.theta), y: Math.cos(p.theta) };
        const R = worldToScreen(p.x - n.x * W, p.y - n.y * W, st.s);
        if (i === 0) ctx.moveTo(R.x, R.y); else ctx.lineTo(R.x, R.y);
      }
      ctx.strokeStyle = "rgba(239,68,68,0.35)";
      ctx.stroke();

      // 中线虚线
      ctx.setLineDash([10, 16]);
      ctx.lineDashOffset = -((st.elapsed / 1000) * 120) % 26;
      ctx.beginPath();
      for (let i = 0; i < pts.length - 1; i++) {
        const p = pts[i];
        const c = worldToScreen(p.x, p.y, st.s);
        if (i === 0) ctx.moveTo(c.x, c.y); else ctx.lineTo(c.x, c.y);
      }
      ctx.strokeStyle = "rgba(148,163,184,0.35)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);

      // 终点棋盘
      const remain = st.S - st.s;
      if (remain < 60) {
        const p = pts[Math.max(0, pts.length - 20)];
        const n = { x: -Math.sin(p.theta), y: Math.cos(p.theta) };
        const base = worldToScreen(p.x, p.y, st.s);
        const step = 16;
        for (let i = -20; i < 20; i++) {
          const offset = i * step;
          const pos = worldToScreen(p.x + n.x * offset, p.y + n.y * offset, st.s);
          ctx.fillStyle = i % 2 === 0 ? "rgba(255,255,255,0.9)" : "rgba(30,41,59,0.9)";
          ctx.fillRect(pos.x - 8, base.y - 8, 16, 16);
        }
      }

      ctx.restore();

      // 车辆（按相对中心线的 lateral 偏移绘制）
      const idx = Math.min(pts.length - 1, Math.max(0, Math.floor(st.s / 5)));
      const p = pts[idx];
      const n = { x: -Math.sin(p.theta), y: Math.cos(p.theta) };
      const carW = 16;
      const car = worldToScreen(p.x + n.x * st.lateral, p.y + n.y * st.lateral, st.s);
      ctx.save();
      ctx.translate(car.x, car.y);
      ctx.rotate(p.theta + Math.PI / 2);
      ctx.fillStyle = st.offTrack ? "#f87171" : "#38bdf8";
      ctx.shadowColor = st.offTrack ? "rgba(248,113,113,0.8)" : "rgba(56,189,248,0.9)";
      ctx.shadowBlur = 22;
      ctx.beginPath();
      ctx.moveTo(0, -carW);
      ctx.lineTo(12, carW);
      ctx.lineTo(-12, carW);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    const drawHUD = (st: typeof stateRef.current) => {
      ctx.save();
      // 信息面板
      ctx.fillStyle = "rgba(10,14,26,0.6)";
      ctx.fillRect(16, 16, 300, 128);
      ctx.strokeStyle = "rgba(37,99,235,0.6)";
      ctx.strokeRect(16, 16, 300, 128);
      ctx.fillStyle = "#E0E6ED";
      ctx.font = "700 18px Rajdhani, sans-serif";
      const idx = Math.min(st.path.length - 1, Math.max(0, Math.floor(st.s / 5)));
      const vmax = Math.round(st.path[idx]?.vmax ?? 80);
      ctx.fillText(`速度: ${st.speed.toFixed(0)} m/s`, 28, 44);
      ctx.fillText(`建议弯速: ${vmax} m/s`, 28, 68);
      ctx.fillText(`距离: ${st.s.toFixed(0)} / ${st.S} m`, 28, 92);
      ctx.fillText(`时间: ${(st.elapsed / 1000).toFixed(2)} s`, 28, 116);

      // 进度条
      const barW = canvas.width - 32;
      const barX = 16, barY = canvas.height - 32, barH = 12;
      ctx.fillStyle = "rgba(148,163,184,0.2)";
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = "rgba(37,99,235,0.8)";
      const p = Math.min(1, st.s / st.S);
      ctx.fillRect(barX, barY, barW * p, barH);

      // 氮气条
      const nx = 16, ny = canvas.height - 56, nw = 220, nh = 12;
      ctx.fillStyle = "rgba(148,163,184,0.2)";
      ctx.fillRect(nx, ny, nw, nh);
      ctx.fillStyle = "rgba(56,189,248,0.9)";
      ctx.fillRect(nx, ny, nw * (st.nitro / 100), nh);
      ctx.strokeStyle = "rgba(56,189,248,0.6)";
      ctx.strokeRect(nx, ny, nw, nh);

      if (st.offTrack) {
        ctx.fillStyle = "rgba(239,68,68,0.9)";
        ctx.font = "800 20px Orbitron, sans-serif";
        ctx.fillText("离赛道惩罚", 340, 56);
      }
      ctx.restore();
    };

    const step = (ts: number) => {
      const st = stateRef.current;
      if (!st.startTs) st.startTs = ts;
      if (!st.lastTs) st.lastTs = ts;
      const dt = Math.min(0.05, (ts - st.lastTs) / 1000);
      st.lastTs = ts;
      st.elapsed = ts - st.startTs;

      // 当前弯速限制
      const idx = Math.min(st.path.length - 1, Math.max(0, Math.floor(st.s / 5)));
      const seg = st.path[idx];
      const suggestV = seg?.vmax ?? 80;

      // 加速度（含氮气）
      let a = 0;
      if (st.keys.accel) a += st.accel;
      else a -= st.friction;
      if (st.keys.nitro && st.nitro > 0) {
        a += st.nitroBoost;
        st.nitro = Math.max(0, st.nitro - st.nitroUseRate * dt);
      } else {
        st.nitro = Math.min(100, st.nitro + st.nitroRecharge * dt);
      }

      const top = st.baseMaxSpeed + (st.keys.nitro ? st.nitroTopUp : 0);
      st.speed = Math.max(0, Math.min(top, st.speed + a * dt));
      st.s += st.speed * dt;

      // 转向与侧偏（速度越大转向效果越显著）
      const steerInput = (st.keys.right ? 1 : 0) + (st.keys.left ? -1 : 0);
      st.lateralVel += steerInput * st.steerStrength * (st.speed / (top || 1)) * dt;
      // 通过法向“弹簧”让车辆自动回中心，避免无限偏移
      st.lateralVel += (-st.lateral) * 0.9 * dt;
      st.lateral += st.lateralVel * dt;

      // 出弯惩罚：若速度超过建议弯速，则向曲率外侧“推”并增加摩擦
      if (st.speed > suggestV && Math.abs(seg?.kappa ?? 0) > 0) {
        const sign = Math.sign(seg.kappa); // 右弯(+): 往左甩
        st.lateralVel += sign * 10 * (st.speed - suggestV) * dt;
        st.speed -= 12 * dt;
        st.slipTimer = 0.2; // 短暂打滑提示
      }

      // 离赛道惩罚
      st.offTrack = Math.abs(st.lateral) > (st.trackWidth - 2);
      if (st.offTrack) {
        st.speed = Math.max(0, st.speed - 25 * dt);
        // 将车拉回赛道边缘
        st.lateral = Math.sign(st.lateral) * (st.trackWidth - 2);
        st.lateralVel *= 0.5;
      }

      // 衰减侧向速度
      st.lateralVel *= 0.98;

      drawTrack(st);
      drawHUD(st);

      if (st.s >= st.S) {
        cancelAnimationFrame(st.rafId);
        finishRef.current(st.elapsed);
        return;
      }

      st.rafId = requestAnimationFrame(step);
    };

    if (running) {
      reset();
      stateRef.current.rafId = requestAnimationFrame(step);
    } else {
      reset();
      drawTrack(stateRef.current);
      drawHUD(stateRef.current);
    }

    return () => {
      const id = stateRef.current.rafId;
      if (id) cancelAnimationFrame(id);
    };
  }, [running]);

  // 自适应
  useEffect(() => {
    const syncSize = () => {
      const c = canvasRef.current;
      if (!c) return;
      const parent = c.parentElement;
      if (!parent) return;
      const w = Math.min(parent.clientWidth, 1200);
      const h = 520;
      c.width = w;
      c.height = h;
      stateRef.current.width = w;
      stateRef.current.height = h;
    };
    syncSize();
    window.addEventListener("resize", syncSize);
    return () => window.removeEventListener("resize", syncSize);
  }, []);

  return (
    <canvas ref={canvasRef} style={{ width: "100%", height: 520, borderRadius: 16 }} />
  );
}



