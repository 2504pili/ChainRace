"use client";

import { useEffect, useState, useRef } from "react";
import { ethers } from "ethers";
import Navbar from "../../components/Navbar";
import { useChainRace } from "../../hooks/useChainRace";
import RaceCanvas from "../../components/RaceCanvas";

export default function RacePage() {
  const [provider, setProvider] = useState<ethers.Eip1193Provider | undefined>();
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | undefined>();
  const [chainId, setChainId] = useState<number | undefined>();
  const [isRacing, setIsRacing] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const { contractAddress, canSubmit, submitEncryptedTime, message } = useChainRace({
    provider,
    chainId,
    signer,
  });

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      const eth = (window as any).ethereum as ethers.Eip1193Provider;
      setProvider(eth);
      (async () => {
        const browser = new ethers.BrowserProvider(eth);
        const s = await browser.getSigner().catch(() => undefined);
        setSigner(s);
        const idHex = await eth.request({ method: "eth_chainId" });
        setChainId(parseInt(idHex as string, 16));
      })();
    }
  }, []);

  // 按下加速键（W/↑/Space）时自动开始比赛
  useEffect(() => {
    const accelKeys = ["ArrowUp", "Space", "KeyW"];
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isRacing && accelKeys.includes(e.code)) {
        e.preventDefault();
        handleStart();
      }
    };
    document.addEventListener("keydown", onKeyDown, { capture: true });
    return () => {
      document.removeEventListener("keydown", onKeyDown, { capture: true } as any);
    };
  }, [isRacing]);

  useEffect(() => {
    if (isRacing) {
      timerRef.current = setInterval(() => {
        setElapsedTime(Date.now() - startTime);
      }, 10);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRacing, startTime]);

  const handleStart = () => {
    setStartTime(Date.now());
    setElapsedTime(0);
    setIsRacing(true);
  };

  const handleStop = () => {
    setIsRacing(false);
  };

  const handleSubmit = async () => {
    if (!canSubmit || elapsedTime === 0) return;
    await submitEncryptedTime(Math.floor(elapsedTime));
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = Math.floor((ms % 1000) / 10);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <Navbar />
      <main style={{
        minHeight: '100vh',
        paddingTop: '100px',
        padding: '100px 2rem 2rem',
        maxWidth: '1200px',
        margin: '0 auto',
      }}>
        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{
            fontFamily: 'Orbitron, sans-serif',
            fontSize: '3rem',
            fontWeight: 900,
            background: 'linear-gradient(135deg, #2563EB 0%, #EF4444 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '0.5rem',
            letterSpacing: '0.1em',
          }}>
            🏁 赛车计时
          </h1>
          <p style={{ fontSize: '1.125rem', color: '#64748B' }}>
            点击开始按钮开始计时，完成后点击结束并上传成绩
          </p>
        </div>

        {/* 赛道 Canvas 模拟 + HUD */}
        <div
          style={{
          background: 'rgba(15, 23, 42, 0.8)',
          border: '2px solid rgba(37, 99, 235, 0.3)',
          borderRadius: '16px',
          padding: '1.25rem',
          marginBottom: '1.5rem',
          position: 'relative',
          overflow: 'hidden',
        }} className={isRacing ? 'animate-glow' : ''}>
          <RaceCanvas
            running={isRacing}
            onFinish={(ms) => {
              setIsRacing(false);
              setElapsedTime(ms);
            }}
          />
        </div>

        {/* 控制按钮 + 计时显示 */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            fontFamily: 'Orbitron, sans-serif',
            fontSize: '4rem',
            fontWeight: 900,
            color: isRacing ? '#2563EB' : '#64748B',
            textShadow: isRacing ? '0 0 20px rgba(37, 99, 235, 0.7)' : 'none',
            marginBottom: '1rem',
          }}>
            {formatTime(elapsedTime)}
          </div>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            {!isRacing ? (
              <button onClick={handleStart} style={{
                padding: '1.25rem 2.5rem', fontSize: '1.25rem', fontWeight: 700, color: '#fff',
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', border: 'none', borderRadius: 12,
              }}>🚀 开始</button>
            ) : (
              <button onClick={handleStop} style={{
                padding: '1.25rem 2.5rem', fontSize: '1.25rem', fontWeight: 700, color: '#fff',
                background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)', border: 'none', borderRadius: 12,
              }}>🏁 结束</button>
            )}

            {!isRacing && elapsedTime > 0 && (
              <button onClick={handleSubmit} disabled={!canSubmit} style={{
                padding: '1.25rem 2.5rem', fontSize: '1.25rem', fontWeight: 700, color: '#fff', borderRadius: 12,
                border: 'none', background: canSubmit ? 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' : '#334155',
              }}>📤 上传成绩到链上</button>
            )}
          </div>
        </div>

        {/* Info Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '1.5rem',
          marginBottom: '2rem',
        }}>
          <div style={{
            padding: '1.5rem',
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(37, 99, 235, 0.2)',
            borderRadius: '12px',
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📍</div>
            <div style={{ fontSize: '0.875rem', color: '#64748B', marginBottom: '0.25rem' }}>合约地址</div>
            <div style={{ fontSize: '1rem', color: '#E0E6ED', fontFamily: 'monospace' }}>
              {contractAddress ? `${contractAddress.slice(0, 6)}...${contractAddress.slice(-4)}` : 'N/A'}
            </div>
          </div>

          <div style={{
            padding: '1.5rem',
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(37, 99, 235, 0.2)',
            borderRadius: '12px',
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏱️</div>
            <div style={{ fontSize: '0.875rem', color: '#64748B', marginBottom: '0.25rem' }}>本次成绩</div>
            <div style={{ fontSize: '1.25rem', color: '#2563EB', fontWeight: 700 }}>
              {elapsedTime > 0 ? `${Math.floor(elapsedTime)} ms` : '--'}
            </div>
          </div>
        </div>

        {/* Message Log */}
        {message && (
          <div style={{
            padding: '1rem 1.5rem',
            background: 'rgba(37, 99, 235, 0.1)',
            border: '1px solid rgba(37, 99, 235, 0.3)',
            borderRadius: '8px',
            color: '#2563EB',
            fontSize: '0.875rem',
            fontFamily: 'monospace',
          }}>
            {message}
          </div>
        )}
      </main>
    </>
  );
}

