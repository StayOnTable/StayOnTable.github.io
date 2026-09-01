import type { Metadata } from "next";
import type { ReactNode } from "react";

import { CommentedArticleLayout } from "@/components/commented-article-layout";

export const metadata: Metadata = {
  title: "为什么我要把学习和作品放到同一个地方",
  description: "一个个人主页如何成为持续积累、接受反馈的工作台。",
};

export default function BuildInPublicLayout({ children }: { children: ReactNode }) {
  return <CommentedArticleLayout>{children}</CommentedArticleLayout>;
}
