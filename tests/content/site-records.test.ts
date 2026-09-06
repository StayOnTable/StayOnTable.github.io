import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  computeXiaohongshuPostSha256,
  loadXiaohongshuPosts,
  xiaohongshuPostContentSchema,
  xiaohongshuPostSchema,
  xiaohongshuPosts,
  siteMeta,
} from "../../src/content/site";

test("site profile exposes a stable Xiaohongshu link without transient tracking tokens", () => {
  const profileUrl = new URL(siteMeta.xiaohongshu.profileUrl);

  assert.equal(profileUrl.origin, "https://www.xiaohongshu.com");
  assert.equal(profileUrl.pathname, "/user/profile/61f54602000000002102111b");
  assert.equal(profileUrl.search, "");
});

test("checked-in Xiaohongshu records are explicit placeholders", () => {
  assert.ok(xiaohongshuPosts.length > 0);
  assert.ok(xiaohongshuPosts.every((post) => post.publicationStatus === "placeholder"));
  assert.ok(xiaohongshuPosts.every((post) => post.placeholder));
});

test("approved Xiaohongshu content requires http(s), date, and exact hash", () => {
  const content = xiaohongshuPostContentSchema.parse({
    title: "一条经过确认的短内容",
    summary: "本人确认过的公开摘要。",
    publishedAt: "2026-08-31",
    sourceUrl: "https://www.xiaohongshu.com/explore/example",
  });
  const approved = {
    ...content,
    publicationStatus: "approved" as const,
    placeholder: false as const,
    contentSha256: computeXiaohongshuPostSha256(content),
  };

  loadXiaohongshuPosts([approved], "2026-09-01");
  assert.throws(
    () => loadXiaohongshuPosts([{ ...approved, summary: "审批后被修改" }], "2026-09-01"),
    /SHA-256/,
  );
  assert.throws(
    () => loadXiaohongshuPosts([{ ...approved, publishedAt: "2026-09-02" }], "2026-09-01"),
    /future/,
  );
});

test("pending or non-http Xiaohongshu records fail closed", () => {
  assert.equal(xiaohongshuPostSchema.safeParse({
    ...xiaohongshuPosts[0],
    publicationStatus: "pending-review",
  }).success, false);
  assert.equal(xiaohongshuPostSchema.safeParse({
    ...xiaohongshuPosts[0],
    sourceUrl: "ftp://example.com/post",
  }).success, false);
});

test("Ask keeps provenance metadata out of reader-facing answers", () => {
  const askPage = readFileSync(new URL("../../src/app/ask/page.tsx", import.meta.url), "utf8");
  const askPreview = readFileSync(
    new URL("../../src/components/ask-preview.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(askPage, /公开材料建议|公开材料把 fake work/u);
  assert.match(askPage, /参考来源/u);
  assert.doesNotMatch(askPreview, /sourceIds\.join|reasoningLabels/u);
  assert.match(askPreview, /<strong>参考来源<\/strong>/u);
});
