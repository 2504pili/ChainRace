"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      background: 'rgba(10, 14, 26, 0.95)',
      backdropFilter: 'blur(10px)',
      borderBottom: '1px solid rgba(37, 99, 235, 0.3)',
      boxShadow: '0 4px 20px rgba(37, 99, 235, 0.1)',
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '1rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        {/* Logo */}
        <Link href="/" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          textDecoration: 'none',
        }}>
          <div style={{
            fontSize: '2rem',
            filter: 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.6))',
          }}>
            🏁
          </div>
          <h1 style={{
            fontFamily: 'Orbitron, sans-serif',
            fontSize: '1.75rem',
            fontWeight: 900,
            background: 'linear-gradient(135deg, #2563EB 0%, #EF4444 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '0.1em',
          }}>
            ChainRace
          </h1>
        </Link>

        {/* Nav Links */}
        <div style={{
          display: 'flex',
          gap: '1rem',
        }}>
          {[
            { path: '/', label: '首页' },
            { path: '/race', label: '比赛' },
            { path: '/leaderboard', label: '排行榜' },
            { path: '/me', label: '我的' },
          ].map(({ path, label }) => (
            <Link
              key={path}
              href={path}
              style={{
                padding: '0.5rem 1.5rem',
                fontFamily: 'Rajdhani, sans-serif',
                fontSize: '1.125rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: isActive(path) ? '#2563EB' : '#94A3B8',
                background: isActive(path) ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
                border: '1px solid',
                borderColor: isActive(path) ? 'rgba(37, 99, 235, 0.5)' : 'transparent',
                borderRadius: '8px',
                textDecoration: 'none',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => {
                if (!isActive(path)) {
                  e.currentTarget.style.color = '#E0E6ED';
                  e.currentTarget.style.borderColor = 'rgba(37, 99, 235, 0.3)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive(path)) {
                  e.currentTarget.style.color = '#94A3B8';
                  e.currentTarget.style.borderColor = 'transparent';
                }
              }}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}


