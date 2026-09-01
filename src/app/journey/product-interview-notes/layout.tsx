import type { Metadata } from "next";
import type { ReactNode } from "react";

import { CommentedArticleLayout } from "@/components/commented-article-layout";

export const metadata: Metadata = {
  title: "一次 AI 产品业务面的复盘",
  description: "从模糊目标拆解业务假设的面试复盘示例。",
};

export default function JourneyArticleLayout({ children }: { children: ReactNode }) {
  return <CommentedArticleLayout>{children}</CommentedArticleLayout>;
}
