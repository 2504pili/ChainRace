"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";
import Navbar from "../components/Navbar";
import Link from "next/link";

export default function Home() {
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState<string>("");
  const [chainId, setChainId] = useState<number | undefined>();
  const [season, setSeason] = useState(1);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      try {
        const accounts = await provider.listAccounts();
        if (accounts.length > 0) {
          setIsConnected(true);
          setAccount(accounts[0].address);
          const network = await provider.getNetwork();
          setChainId(Number(network.chainId));
        }
      } catch {}
    }
  };

  const connectWallet = async () => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      try {
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        await provider.send("eth_requestAccounts", []);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        setAccount(address);
        setIsConnected(true);
        const network = await provider.getNetwork();
        setChainId(Number(network.chainId));
      } catch (error: any) {
        alert("连接钱包失败: " + (error?.message ?? error));
      }
    } else {
      alert("请安装 MetaMask 钱包");
    }
  };

  return (
    <>
      <Navbar />
      <main style={{
        minHeight: '100vh',
        paddingTop: '80px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          textAlign: 'center',
          maxWidth: '800px',
          padding: '3rem 2rem',
        }} className="animate-slide-in">
          {/* Logo Animation */}
          <div style={{
            fontSize: '8rem',
            marginBottom: '1.5rem',
            filter: 'drop-shadow(0 0 30px rgba(239, 68, 68, 0.8))',
          }} className="animate-pulse">
            🏁
          </div>

          {/* Title */}
          <h1 style={{
            fontFamily: 'Orbitron, sans-serif',
            fontSize: '4rem',
            fontWeight: 900,
            marginBottom: '1rem',
            background: 'linear-gradient(135deg, #2563EB 0%, #EF4444 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: '0 0 40px rgba(37, 99, 235, 0.3)',
            letterSpacing: '0.15em',
          }}>
            CHAINRACE
          </h1>

          {/* Subtitle */}
          <p style={{
            fontSize: '1.5rem',
            color: '#94A3B8',
            marginBottom: '3rem',
            fontWeight: 500,
            letterSpacing: '0.1em',
          }}>
            链上赛车计时 · 成绩上链 · 公平竞速
          </p>

          {/* Season Info */}
          <div style={{
            display: 'inline-block',
            padding: '0.75rem 2rem',
            background: 'rgba(37, 99, 235, 0.1)',
            border: '1px solid rgba(37, 99, 235, 0.3)',
            borderRadius: '12px',
            marginBottom: '3rem',
          }} className="animate-glow">
            <span style={{
              fontSize: '1.25rem',
              fontWeight: 600,
              color: '#2563EB',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}>
              🏆 第 {season} 赛季进行中
            </span>
          </div>

          {/* Connect/Start Button */}
          {!isConnected ? (
            <button
              onClick={connectWallet}
              style={{
                padding: '1.5rem 4rem',
                fontSize: '1.5rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: '#fff',
                background: 'linear-gradient(135deg, #2563EB 0%, #EF4444 100%)',
                border: 'none',
                borderRadius: '12px',
                boxShadow: '0 8px 32px rgba(37, 99, 235, 0.4)',
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 12px 40px rgba(37, 99, 235, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(37, 99, 235, 0.4)';
              }}
            >
              连接钱包开始
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
              <div style={{
                padding: '1rem 2rem',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '8px',
                fontSize: '1rem',
                color: '#10B981',
              }}>
                ✅ 已连接: {account.slice(0, 6)}...{account.slice(-4)} | Chain: {chainId}
              </div>
              <Link href="/race">
                <button style={{
                  padding: '1.5rem 4rem',
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: '#fff',
                  background: 'linear-gradient(135deg, #2563EB 0%, #EF4444 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '0 8px 32px rgba(37, 99, 235, 0.4)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 12px 40px rgba(37, 99, 235, 0.6)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 8px 32px rgba(37, 99, 235, 0.4)';
                }}>
                  进入比赛 →
                </button>
              </Link>
            </div>
          )}

          {/* Features */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '2rem',
            marginTop: '4rem',
          }}>
            {[
              { icon: '🔒', title: '成绩上链', desc: '永久记录，不可篡改' },
              { icon: '⚡', title: '公平竞速', desc: '智能合约验证' },
              { icon: '🏆', title: '排行榜', desc: '公开透明竞技' },
            ].map((feature, i) => (
              <div
                key={i}
                style={{
                  padding: '2rem',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(37, 99, 235, 0.2)',
                  borderRadius: '12px',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(37, 99, 235, 0.5)';
                  e.currentTarget.style.transform = 'translateY(-4px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(37, 99, 235, 0.2)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{feature.icon}</div>
                <h3 style={{
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  marginBottom: '0.5rem',
                  color: '#E0E6ED',
                }}>{feature.title}</h3>
                <p style={{ fontSize: '1rem', color: '#64748B' }}>{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
