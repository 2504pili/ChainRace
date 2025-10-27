import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <title>ChainRace - 链上赛车计时</title>
        <meta name="description" content="区块链赛车成绩记录与排行榜" />
      </head>
      <body>{children}</body>
    </html>
  );
}


