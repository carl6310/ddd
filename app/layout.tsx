import type { Metadata } from "next";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "上海板块写作工作台",
  description: "把上海板块解析文章的研究、提纲、初稿和质检串成一条可复用的协作链路。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}

