import Link from "next/link";
import { siteMeta } from "@/content/site";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div>
          <div className="site-footer__mark">Stay on table</div>
          <p>把公开表达，当作一种长期的自我校准。</p>
        </div>
        <div className="site-footer__links">
          <Link href="/about/">关于本站</Link>
          <Link href="/projects/">正在做的事</Link>
          <a href={`mailto:${siteMeta.email}`}>联系邮箱</a>
          <a href={siteMeta.github.profileUrl} target="_blank" rel="noreferrer">GitHub</a>
        </div>
      </div>
      <div className="site-footer__legal">
        <span>© 2026 JoJo Liu · 个人内容保留权利</span>
        <span>代码以 MIT 许可开放</span>
      </div>
    </footer>
  );
}
