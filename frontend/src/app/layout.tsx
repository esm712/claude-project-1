import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "커피 당번",
  description: "누가 언제 커피를 샀는지 기록하고 다음 당번을 알려줍니다.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
