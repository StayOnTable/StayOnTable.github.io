import type { Metadata } from "next";
import type { ReactNode } from "react";

import { CommentedArticleLayout } from "@/components/commented-article-layout";

export const metadata: Metadata = {
  title: "投资周报 · 2026 W35",
  description: "用于验证投资周报结构的演示页面，不包含真实账户数据。",
};

export default function InvestmentWeeklyLayout({ children }: { children: ReactNode }) {
  return <CommentedArticleLayout>{children}</CommentedArticleLayout>;
}
