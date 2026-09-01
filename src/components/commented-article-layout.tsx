import type { ReactNode } from "react";

import { GiscusComments } from "./giscus-comments";

export function CommentedArticleLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <div className="article-comments-shell">
        <GiscusComments />
      </div>
    </>
  );
}
