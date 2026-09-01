import type { Metadata } from "next";
import type { ReactNode } from "react";

import { CommentedArticleLayout } from "@/components/commented-article-layout";

export const metadata: Metadata = {
  title: "从收藏到观点：建立自己的内容处理管线",
  description: "2026-08-31 的每日输入示例记录。",
};

export default function LibraryArticleLayout({ children }: { children: ReactNode }) {
  return <CommentedArticleLayout>{children}</CommentedArticleLayout>;
}
