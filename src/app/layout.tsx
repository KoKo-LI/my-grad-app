import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "My Grad Path | 研究生申请仪表盘",
  description: "智能研究生选校与申请进度追踪 Dashboard",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html className="h-full antialiased" lang="zh-CN">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
