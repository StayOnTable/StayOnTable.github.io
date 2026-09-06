import { createHash } from "node:crypto";
import { z } from "zod";

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const ISO_DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const hrefSchema = z.string().startsWith("/").refine(
  (value) => !value.startsWith("//") && !value.includes(".."),
  "href must stay within this site",
);
const publicHttpUrlSchema = z.string().url().refine(
  (value) => /^https?:\/\//.test(value),
  "external URL must use http(s)",
);
const externalUrlSchema = publicHttpUrlSchema.nullable();

const projectSchema = z.object({
  slug: z.string(),
  title: z.string(),
  summary: z.string(),
  stage: z.string(),
  tags: z.array(z.string()),
  href: hrefSchema,
  tone: z.enum(["fern", "clay", "ink"]),
  placeholder: z.boolean().default(false),
});

const noteSchema = z.object({
  slug: z.string(),
  title: z.string(),
  summary: z.string(),
  kind: z.string(),
  publishedAt: z.string(),
  readTime: z.string(),
  href: hrefSchema,
  placeholder: z.boolean().default(false),
});

const xiaohongshuPostContentShape = {
  title: z.string(),
  summary: z.string(),
  publishedAt: z.string(),
  sourceUrl: externalUrlSchema,
};

export const xiaohongshuPostContentSchema = z.object(xiaohongshuPostContentShape).strict();

const placeholderXiaohongshuPostSchema = z.object({
  ...xiaohongshuPostContentShape,
  publicationStatus: z.literal("placeholder"),
  placeholder: z.literal(true),
  contentSha256: z.null(),
}).strict();

const approvedXiaohongshuPostSchema = z.object({
  ...xiaohongshuPostContentShape,
  publishedAt: z.string().regex(ISO_DAY_PATTERN),
  sourceUrl: publicHttpUrlSchema,
  publicationStatus: z.literal("approved"),
  placeholder: z.literal(false),
  contentSha256: z.string().regex(SHA256_PATTERN),
}).strict();

export const xiaohongshuPostSchema = z.discriminatedUnion("publicationStatus", [
  placeholderXiaohongshuPostSchema,
  approvedXiaohongshuPostSchema,
]);

export type Project = z.infer<typeof projectSchema>;
export type Note = z.infer<typeof noteSchema>;
export type XiaohongshuPost = z.infer<typeof xiaohongshuPostSchema>;
export type XiaohongshuPostContent = z.infer<typeof xiaohongshuPostContentSchema>;

function beijingDay(now: Date | string = new Date()): string {
  const date = now instanceof Date ? now : new Date(now);
  if (!Number.isFinite(date.valueOf())) throw new Error("Expected a valid timestamp");
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function contentFromXiaohongshuPost(post: XiaohongshuPost): XiaohongshuPostContent {
  return xiaohongshuPostContentSchema.parse({
    title: post.title,
    summary: post.summary,
    publishedAt: post.publishedAt,
    sourceUrl: post.sourceUrl,
  });
}

export function computeXiaohongshuPostSha256(content: XiaohongshuPostContent): string {
  return createHash("sha256")
    .update(JSON.stringify(xiaohongshuPostContentSchema.parse(content)))
    .digest("hex");
}

export function loadXiaohongshuPosts(
  value: unknown,
  asOfDate = beijingDay(),
): XiaohongshuPost[] {
  const posts = z.array(xiaohongshuPostSchema).parse(value);
  const titles = new Set<string>();
  for (const post of posts) {
    if (titles.has(post.title)) throw new Error(`xiaohongshu:${post.title}: duplicate title`);
    titles.add(post.title);
    if (post.publicationStatus === "approved") {
      if (post.publishedAt > asOfDate) {
        throw new Error(`xiaohongshu:${post.title}: publishedAt is in the future`);
      }
      if (computeXiaohongshuPostSha256(contentFromXiaohongshuPost(post)) !== post.contentSha256) {
        throw new Error(`xiaohongshu:${post.title}: approved content SHA-256 does not match`);
      }
    }
  }
  return posts;
}

export const projects = z.array(projectSchema).parse([
  {
    slug: "motion-workflow",
    title: "视频动效与剪辑工作流",
    summary: "把字幕、关键帧、转场和导出规范整理成可以复用的开源工作流。",
    stage: "整理中",
    tags: ["Motion", "Workflow", "Open source"],
    href: "/projects/#motion-workflow",
    tone: "clay",
    placeholder: true,
  },
  {
    slug: "ask-lizheng",
    title: "问问立正",
    summary: "基于立正公开 Context 的独立问答实验：先问清目标和约束，再根据公开语料给出带来源的行动建议。",
    stage: "概念验证",
    tags: ["AI", "MiniMax", "RAG"],
    href: "/ask/",
    tone: "fern",
    placeholder: true,
  },
  {
    slug: "personal-site",
    title: "Stay on table",
    summary: "把写作、项目、求职和长期输入放进同一个可持续更新的个人主页。",
    stage: "正在搭建",
    tags: ["Next.js", "GitHub Pages", "Build in public"],
    href: "/projects/#personal-site",
    tone: "ink",
    placeholder: false,
  },
]);

export const notes = z.array(noteSchema).parse([
  {
    slug: "video-workflow",
    title: "把一次剪辑，变成下一次可以复用的系统",
    summary: "从素材命名、粗剪到动效预设，记录我准备如何拆解一套视频工作流。",
    kind: "项目手记",
    publishedAt: "2026-08-30",
    readTime: "5 分钟",
    href: "/notes/video-workflow/",
    placeholder: true,
  },
  {
    slug: "build-in-public",
    title: "为什么我要把学习和作品放到同一个地方",
    summary: "一个个人主页不只是名片，也可以成为持续积累、接受反馈的工作台。",
    kind: "建站笔记",
    publishedAt: "2026-08-26",
    readTime: "4 分钟",
    href: "/notes/build-in-public/",
    placeholder: true,
  },
  {
    slug: "weekly-input",
    title: "本周输入：从收藏夹走向可检索的知识库",
    summary: "比起收藏更多内容，我更想留下它为什么重要，以及它改变了什么判断。",
    kind: "每周输入",
    publishedAt: "2026-08-23",
    readTime: "3 分钟",
    href: "/library/2026-08-31/",
    placeholder: true,
  },
]);

export const xiaohongshuPosts = loadXiaohongshuPosts([
  {
    title: "一个工具怎样慢慢变成工作流",
    summary: "用短内容记录从临时技巧到可复用方法的过程。",
    publishedAt: "待补充",
    sourceUrl: null,
    publicationStatus: "placeholder",
    placeholder: true,
    contentSha256: null,
  },
  {
    title: "最近一次 AI 产品实验的三个观察",
    summary: "先用真实素材替换示例，再开放对应的小红书原文链接。",
    publishedAt: "待补充",
    sourceUrl: null,
    publicationStatus: "placeholder",
    placeholder: true,
    contentSha256: null,
  },
]);

export const siteMeta = {
  name: "Stay on table",
  owner: "JoJo Liu",
  description: "写作、项目、求职、每日输入与投资复盘。一个持续更新的个人主页。",
  email: "zdliu20@fudan.edu.cn",
  github: {
    handle: "StayOnTable",
    profileUrl: "https://github.com/StayOnTable",
  },
  xiaohongshu: {
    handle: "落得一身星",
    profileUrl: "https://www.xiaohongshu.com/user/profile/61f54602000000002102111b",
  },
} as const;
