import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CommentedArticleLayout } from "@/components/commented-article-layout";
import { PageIntro, PlaceholderBadge } from "@/components/ui";
import { journeyEntries } from "@/content/journey";

const STATIC_MDX_SLUGS = new Set(["product-interview-notes"]);

export const dynamicParams = false;

export function generateStaticParams() {
  return journeyEntries
    .filter((entry) => !STATIC_MDX_SLUGS.has(entry.slug))
    .map((entry) => ({ slug: entry.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const entry = journeyEntries.find((candidate) => candidate.slug === slug);
  if (!entry) return {};
  return { title: entry.title, description: entry.summary };
}

export default async function JourneyDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = journeyEntries.find((candidate) => candidate.slug === slug);
  if (!entry || STATIC_MDX_SLUGS.has(entry.slug)) notFound();

  return (
    <CommentedArticleLayout>
      <article className="shell page-shell article-shell">
        <PageIntro
          eyebrow={`JOURNEY · 发布于 ${entry.publishedAt}`}
          title={entry.title}
          description={entry.summary}
        />
        {entry.placeholder ? <PlaceholderBadge /> : null}
        <p className="timeline-card__role">
          {entry.company} · {entry.role} · {entry.round} · {entry.interviewStatus}
        </p>
        <div className="prose">
          {entry.body.split(/\n{2,}/).map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </article>
    </CommentedArticleLayout>
  );
}
