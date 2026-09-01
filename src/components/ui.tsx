import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export function PlaceholderBadge() {
  return <span className="placeholder-badge">示例占位</span>;
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <div className="eyebrow">{children}</div>;
}

export function PageIntro({
  eyebrow,
  title,
  description,
  aside,
}: {
  eyebrow: string;
  title: string;
  description: string;
  aside?: ReactNode;
}) {
  return (
    <section className="page-intro">
      <div className="page-intro__copy">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {aside ? <div className="page-intro__aside">{aside}</div> : null}
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  href,
  linkLabel = "查看全部",
}: {
  eyebrow: string;
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="section-heading">
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {href ? (
        <Link className="text-link" href={href}>
          {linkLabel} <ArrowUpRight size={15} aria-hidden="true" />
        </Link>
      ) : null}
    </div>
  );
}

export function ArrowLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link className="arrow-link" href={href}>
      <span>{children}</span>
      <ArrowUpRight size={16} aria-hidden="true" />
    </Link>
  );
}

export function ContentNotice({ children }: { children?: ReactNode }) {
  return (
    <aside className="content-notice">
      <span className="content-notice__label">内容说明</span>
      <p>{children ?? "当前文字用于展示页面结构，后续会替换为本人确认后的真实内容。"}</p>
    </aside>
  );
}
