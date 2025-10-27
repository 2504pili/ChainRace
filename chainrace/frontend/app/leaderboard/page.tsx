"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";
import Navbar from "../../components/Navbar";
import { ChainRaceABI } from "../../abi/ChainRaceABI";
import { ChainRaceAddresses } from "../../abi/ChainRaceAddresses";

type LeaderRecord = {
  address: string;
  bestTime: number;
  attempts: number;
  rank: number;
};

export default function LeaderboardPage() {
  const [provider, setProvider] = useState<ethers.Eip1193Provider | undefined>();
  const [chainId, setChainId] = useState<number | undefined>();
  const [contractAddress, setContractAddress] = useState<string>("");
  const [records, setRecords] = useState<LeaderRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [myAddress, setMyAddress] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      const eth = (window as any).ethereum as ethers.Eip1193Provider;
      setProvider(eth);
      (async () => {
        const idHex = await eth.request({ method: "eth_chainId" });
        const cid = parseInt(idHex as string, 16);
        setChainId(cid);
        const entry = (ChainRaceAddresses as any)[String(cid)] as { address?: string } | undefined;
        if (entry?.address) setContractAddress(entry.address);

        const browser = new ethers.BrowserProvider(eth);
        const signer = await browser.getSigner().catch(() => undefined);
        if (signer) setMyAddress(await signer.getAddress());
      })();
    }
  }, []);

  const loadLeaderboard = async () => {
    if (!contractAddress || !provider) return;
    setLoading(true);
    try {
      const readProvider = new ethers.BrowserProvider(provider);
      const contract = new ethers.Contract(contractAddress, ChainRaceABI.abi, readProvider);
      const total: bigint = await contract.getParticipantsLength(1);
      const participants: string[] = await contract.getParticipants(1, 0, Number(total));

      const list: LeaderRecord[] = [];
      for (const addr of participants) {
        const best: number = await contract.getBestTimePublic(1, addr);
        const att: number = await contract.getAttemptsPublic(1, addr);
        if (best > 0) {
          list.push({ address: addr, bestTime: best, attempts: att, rank: 0 });
        }
      }

      list.sort((a, b) => a.bestTime - b.bestTime);
      list.forEach((r, i) => r.rank = i + 1);

      setRecords(list.slice(0, 50));
    } catch (e: any) {
      console.error("Load leaderboard failed:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (contractAddress) loadLeaderboard();
  }, [contractAddress]);

  const getMedalColor = (rank: number) => {
    if (rank === 1) return 'linear-gradient(135deg, #FCD34D 0%, #F59E0B 100%)';
    if (rank === 2) return 'linear-gradient(135deg, #D1D5DB 0%, #9CA3AF 100%)';
    if (rank === 3) return 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)';
    return 'transparent';
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = ms % 1000;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  };

  return (
    <>
      <Navbar />
      <main style={{
        minHeight: '100vh',
        paddingTop: '100px',
        padding: '100px 2rem 2rem',
        maxWidth: '1400px',
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
            🏆 排行榜
          </h1>
          <p style={{ fontSize: '1.125rem', color: '#64748B' }}>
            第 1 赛季 · Top 50
          </p>
          <button
            onClick={loadLeaderboard}
            disabled={loading}
            style={{
              marginTop: '1rem',
              padding: '0.75rem 2rem',
              fontSize: '1rem',
              fontWeight: 600,
              color: '#fff',
              background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? '加载中...' : '🔄 刷新'}
          </button>
        </div>

        {/* Leaderboard Table */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.8)',
          border: '1px solid rgba(37, 99, 235, 0.3)',
          borderRadius: '16px',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '80px 1fr 200px 120px',
            gap: '1rem',
            padding: '1.5rem 2rem',
            background: 'rgba(37, 99, 235, 0.1)',
            borderBottom: '1px solid rgba(37, 99, 235, 0.3)',
            fontSize: '0.875rem',
            fontWeight: 700,
            color: '#2563EB',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            <div>名次</div>
            <div>地址</div>
            <div>最佳成绩</div>
            <div>尝试次数</div>
          </div>

          {/* Rows */}
          {records.length === 0 && !loading && (
            <div style={{
              padding: '4rem 2rem',
              textAlign: 'center',
              color: '#64748B',
              fontSize: '1.125rem',
            }}>
              暂无记录
            </div>
          )}

          {records.map((record) => (
            <div
              key={record.address}
              style={{
                display: 'grid',
                gridTemplateColumns: '80px 1fr 200px 120px',
                gap: '1rem',
                padding: '1.5rem 2rem',
                borderBottom: '1px solid rgba(37, 99, 235, 0.1)',
                background: record.address.toLowerCase() === myAddress.toLowerCase()
                  ? 'rgba(16, 185, 129, 0.05)'
                  : 'transparent',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = record.address.toLowerCase() === myAddress.toLowerCase()
                  ? 'rgba(16, 185, 129, 0.1)'
                  : 'rgba(37, 99, 235, 0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = record.address.toLowerCase() === myAddress.toLowerCase()
                  ? 'rgba(16, 185, 129, 0.05)'
                  : 'transparent';
              }}
            >
              {/* Rank */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'Orbitron, sans-serif',
                fontSize: '1.5rem',
                fontWeight: 900,
                background: getMedalColor(record.rank),
                WebkitBackgroundClip: record.rank <= 3 ? 'text' : 'initial',
                WebkitTextFillColor: record.rank <= 3 ? 'transparent' : '#E0E6ED',
              }}>
                {record.rank <= 3 ? ['🥇', '🥈', '🥉'][record.rank - 1] : `#${record.rank}`}
              </div>

              {/* Address */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                fontFamily: 'monospace',
                fontSize: '1rem',
                color: record.address.toLowerCase() === myAddress.toLowerCase() ? '#10B981' : '#E0E6ED',
                fontWeight: record.address.toLowerCase() === myAddress.toLowerCase() ? 700 : 400,
              }}>
                {record.address.slice(0, 8)}...{record.address.slice(-6)}
                {record.address.toLowerCase() === myAddress.toLowerCase() && (
                  <span style={{
                    marginLeft: '0.5rem',
                    padding: '0.25rem 0.5rem',
                    background: 'rgba(16, 185, 129, 0.2)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    color: '#10B981',
                  }}>
                    YOU
                  </span>
                )}
              </div>

              {/* Best Time */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                fontFamily: 'Orbitron, sans-serif',
                fontSize: '1.125rem',
                fontWeight: 700,
                color: '#2563EB',
              }}>
                {formatTime(record.bestTime)}
              </div>

              {/* Attempts */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1rem',
                color: '#94A3B8',
              }}>
                {record.attempts}
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}


