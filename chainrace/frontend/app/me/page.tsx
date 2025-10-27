"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";
import Navbar from "../../components/Navbar";
import { useChainRace } from "../../hooks/useChainRace";

export default function MePage() {
  const [provider, setProvider] = useState<ethers.Eip1193Provider | undefined>();
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | undefined>();
  const [chainId, setChainId] = useState<number | undefined>();
  const [myAddress, setMyAddress] = useState<string>("");
  const [myBest, setMyBest] = useState<bigint | undefined>();
  const [myAttempts, setMyAttempts] = useState<bigint | undefined>();
  const [loading, setLoading] = useState(false);

  const { contractAddress, instance, loadAndDecryptMyRecord } = useChainRace({
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
        if (s) setMyAddress(await s.getAddress());
        const idHex = await eth.request({ method: "eth_chainId" });
        setChainId(parseInt(idHex as string, 16));
      })();
    }
  }, []);

  const handleDecrypt = async () => {
    if (!instance || !signer || !contractAddress) return;
    setLoading(true);
    try {
      const result = await loadAndDecryptMyRecord();
      if (result) {
        setMyBest(result.best);
        setMyAttempts(result.attempts);
      }
    } catch (e: any) {
      alert("解密失败: " + (e?.message ?? e));
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (ms: bigint) => {
    const n = Number(ms);
    const minutes = Math.floor(n / 60000);
    const seconds = Math.floor((n % 60000) / 1000);
    const milliseconds = n % 1000;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  };

  return (
    <>
      <Navbar />
      <main style={{
        minHeight: '100vh',
        paddingTop: '100px',
        padding: '100px 2rem 2rem',
        maxWidth: '1000px',
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
            👤 我的记录
          </h1>
          <p style={{ fontSize: '1.125rem', color: '#64748B' }}>
            第 1 赛季个人数据
          </p>
        </div>

        {/* User Info Card */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.8)',
          border: '1px solid rgba(37, 99, 235, 0.3)',
          borderRadius: '16px',
          padding: '2rem',
          marginBottom: '2rem',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '1.5rem',
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #2563EB 0%, #EF4444 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.5rem',
            }}>
              🏎️
            </div>
            <div>
              <div style={{
                fontSize: '0.875rem',
                color: '#64748B',
                marginBottom: '0.25rem',
              }}>
                钱包地址
              </div>
              <div style={{
                fontFamily: 'monospace',
                fontSize: '1.25rem',
                color: '#E0E6ED',
                fontWeight: 700,
              }}>
                {myAddress ? `${myAddress.slice(0, 10)}...${myAddress.slice(-8)}` : '未连接'}
              </div>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '1rem',
          }}>
            <div style={{
              padding: '1.5rem',
              background: 'rgba(37, 99, 235, 0.05)',
              border: '1px solid rgba(37, 99, 235, 0.2)',
              borderRadius: '12px',
            }}>
              <div style={{
                fontSize: '0.875rem',
                color: '#64748B',
                marginBottom: '0.5rem',
              }}>
                最佳成绩
              </div>
              <div style={{
                fontFamily: 'Orbitron, sans-serif',
                fontSize: '2rem',
                fontWeight: 900,
                color: '#2563EB',
              }}>
                {myBest !== undefined ? formatTime(myBest) : '--:--:---'}
              </div>
            </div>

            <div style={{
              padding: '1.5rem',
              background: 'rgba(239, 68, 68, 0.05)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '12px',
            }}>
              <div style={{
                fontSize: '0.875rem',
                color: '#64748B',
                marginBottom: '0.5rem',
              }}>
                尝试次数
              </div>
              <div style={{
                fontFamily: 'Orbitron, sans-serif',
                fontSize: '2rem',
                fontWeight: 900,
                color: '#EF4444',
              }}>
                {myAttempts !== undefined ? myAttempts.toString() : '--'}
              </div>
            </div>
          </div>
        </div>

        {/* Decrypt Button */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <button
            onClick={handleDecrypt}
            disabled={loading || !instance || !signer}
            style={{
              padding: '1.25rem 3rem',
              fontSize: '1.25rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              color: '#fff',
              background: loading || !instance || !signer
                ? '#334155'
                : 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
              border: 'none',
              borderRadius: '12px',
              boxShadow: loading || !instance || !signer ? 'none' : '0 8px 32px rgba(37, 99, 235, 0.4)',
              cursor: loading || !instance || !signer ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={(e) => {
              if (!loading && instance && signer) {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = '0 12px 40px rgba(37, 99, 235, 0.6)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading && instance && signer) {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(37, 99, 235, 0.4)';
              }
            }}
          >
            {loading ? '解密中...' : '🔓 解密我的加密记录'}
          </button>
          <p style={{
            marginTop: '1rem',
            fontSize: '0.875rem',
            color: '#64748B',
          }}>
            点击后将通过 FHEVM 用户解密流程读取您的加密成绩
          </p>
        </div>

        {/* Info Box */}
        <div style={{
          padding: '1.5rem',
          background: 'rgba(37, 99, 235, 0.05)',
          border: '1px solid rgba(37, 99, 235, 0.2)',
          borderRadius: '12px',
        }}>
          <h3 style={{
            fontSize: '1.125rem',
            fontWeight: 700,
            color: '#2563EB',
            marginBottom: '1rem',
          }}>
            💡 关于加密存储
          </h3>
          <ul style={{
            listStyle: 'none',
            padding: 0,
            fontSize: '0.9375rem',
            color: '#94A3B8',
            lineHeight: 1.8,
          }}>
            <li>✅ 您的成绩以加密形式存储在链上（FHE 同态加密）</li>
            <li>✅ 只有您本人可以通过签名解密查看详细数据</li>
            <li>✅ 排行榜显示的是公开时间，加密记录用于隐私保护演示</li>
            <li>✅ 解密过程使用 EIP-712 签名 + FHEVM userDecrypt</li>
          </ul>
        </div>
      </main>
    </>
  );
}


