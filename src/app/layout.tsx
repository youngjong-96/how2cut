import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "How2Cut",
  description: "알루미늄 원자재 절단 계획을 빠르게 계산하는 웹 도구"
};

// 전체 앱의 HTML 뼈대와 공통 언어 설정을 구성한다.
export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
