import type { Metadata } from "next";
import type { ReactNode } from "react";

import { CommentedArticleLayout } from "@/components/commented-article-layout";

export const metadata: Metadata = {
  title: "把一次剪辑，变成下一次可以复用的系统",
  description: "视频动效与剪辑工作流的项目手记。",
};

export default function VideoWorkflowLayout({ children }: { children: ReactNode }) {
  return <CommentedArticleLayout>{children}</CommentedArticleLayout>;
}
