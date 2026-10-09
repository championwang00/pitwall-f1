import type { Metadata } from "next";
import "./globals.css";
import RaceLoadingProvider from "@/components/shell/RaceLoading";

export const metadata: Metadata = {
  title: "PITWALL · F1 百科与实时数据",
  description: "以年份、赛道、车手、车队为基础单元的 F1 数据百科，含实时计时、赛历订阅与历史回溯。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Titillium+Web:wght@300;400;600;700&family=Noto+Sans+SC:wght@400;500;700;900&display=swap" rel="stylesheet" />
        <link rel="preconnect" href="https://media.formula1.com" crossOrigin="" />
      </head>
      <body><RaceLoadingProvider>{children}</RaceLoadingProvider></body>
    </html>
  );
}
