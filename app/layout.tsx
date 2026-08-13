import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "第十届挺好萌 · 淘汰赛抽签器",
  description: "基于第十届挺好萌48强结果与官方规则制作的可复现淘汰赛抽签工具。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
