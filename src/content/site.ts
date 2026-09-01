import { z } from "zod";

const hrefSchema = z.string().startsWith("/");
const externalUrlSchema = z.string().url().nullable();

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

const libraryEntrySchema = z.object({
  date: z.string(),
  title: z.string(),
  takeaway: z.string(),
  sourceType: z.enum(["文章", "视频", "播客", "论文"]),
  creator: z.string(),
  sourceUrl: externalUrlSchema,
  topic: z.string(),
  href: hrefSchema,
  placeholder: z.boolean().default(false),
});

const xiaohongshuPostSchema = z.object({
  title: z.string(),
  summary: z.string(),
  publishedAt: z.string(),
  sourceUrl: externalUrlSchema,
  placeholder: z.boolean().default(false),
});

export type Project = z.infer<typeof projectSchema>;
export type Note = z.infer<typeof noteSchema>;
export type LibraryEntry = z.infer<typeof libraryEntrySchema>;
export type XiaohongshuPost = z.infer<typeof xiaohongshuPostSchema>;

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
    title: "课代表立正",
    summary: "先问清目标和约束，再基于公开语料给出带来源的行动建议。",
    stage: "概念验证",
    tags: ["AI", "MiniMax", "RAG"],
    href: "/ask/",
    tone: "fern",
    placeholder: true,
  },
  {
    slug: "personal-site",
    title: "在场笔记",
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

export const libraryEntries = z.array(libraryEntrySchema).parse([
  {
    date: "2026-08-31",
    title: "从收藏到观点：建立自己的内容处理管线",
    takeaway: "记录来源只是第一步；更重要的是写下它改变了哪个判断，并在未来能被重新找到。",
    sourceType: "文章",
    creator: "作者待补充",
    sourceUrl: null,
    topic: "知识管理",
    href: "/library/2026-08-31/",
    placeholder: true,
  },
  {
    date: "2026-08-30",
    title: "优秀演示视频的节奏从哪里来",
    takeaway: "镜头不是越碎越好。每次切换都应该服务于信息层级，而不是掩盖内容本身。",
    sourceType: "视频",
    creator: "频道待补充",
    sourceUrl: null,
    topic: "内容创作",
    href: "/library/",
    placeholder: true,
  },
  {
    date: "2026-08-28",
    title: "把 AI 产品的价值假设写成可验证的问题",
    takeaway: "先定义用户愿意改变什么行为，再讨论模型能力；技术演示不能替代需求证据。",
    sourceType: "播客",
    creator: "节目待补充",
    sourceUrl: null,
    topic: "AI 产品",
    href: "/library/",
    placeholder: true,
  },
  {
    date: "2026-08-25",
    title: "如何做一场信息密度更高的访谈",
    takeaway: "用具体经历代替态度表达，用追问还原真实决策环境。",
    sourceType: "文章",
    creator: "作者待补充",
    sourceUrl: null,
    topic: "沟通",
    href: "/library/",
    placeholder: true,
  },
]);

export const xiaohongshuPosts = z.array(xiaohongshuPostSchema).parse([
  {
    title: "一个工具怎样慢慢变成工作流",
    summary: "用短内容记录从临时技巧到可复用方法的过程。",
    publishedAt: "待补充",
    sourceUrl: null,
    placeholder: true,
  },
  {
    title: "最近一次 AI 产品实验的三个观察",
    summary: "先用真实素材替换示例，再开放对应的小红书原文链接。",
    publishedAt: "待补充",
    sourceUrl: null,
    placeholder: true,
  },
]);

export const siteMeta = {
  name: "在场笔记",
  owner: "立正",
  description: "写作、项目、求职、每日输入与投资复盘。一个持续更新的个人主页。",
  xiaohongshu: {
    handle: "小红书账号待补充",
    profileUrl: null,
  },
} as const;
