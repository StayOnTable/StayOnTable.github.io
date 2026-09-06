import { createHash } from "node:crypto";
import { z } from "zod";

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const ISO_DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const sourceTypeSchema = z.enum(["文章", "视频", "播客", "论文"]);

const thumbnailSchema = z.object({
  src: z.string().refine(
    (value) => value.startsWith("/") || /^https?:\/\//.test(value),
    "thumbnail src must be a local public path or an http(s) URL",
  ),
  alt: z.string().min(1),
});

const publicHttpUrlSchema = z.string().url().refine(
  (value) => /^https?:\/\//.test(value),
  "source URL must use http(s)",
);

const internalHrefSchema = z.string().startsWith("/").refine(
  (value) => !value.startsWith("//") && !value.includes(".."),
  "href must stay within this site",
);

const libraryRecordContentShape = {
  id: z.string().regex(/^[a-z0-9-]+$/),
  date: z.string().regex(ISO_DAY_PATTERN),
  title: z.string().min(1),
  takeaway: z.string().min(1),
  sourceType: sourceTypeSchema,
  creator: z.string().min(1),
  sourceUrl: publicHttpUrlSchema.nullable(),
  topic: z.string().min(1),
  topicId: z.string().regex(/^[a-z0-9-]+$/),
  href: internalHrefSchema,
  thumbnail: thumbnailSchema.nullable(),
  expanded: z.object({
    intro: z.string().min(1),
    points: z.array(z.string().min(1)).min(1),
  }),
};

export const libraryRecordContentSchema = z.object(libraryRecordContentShape).strict();

const placeholderLibraryRecordSchema = z.object({
  ...libraryRecordContentShape,
  publicationStatus: z.literal("placeholder"),
  placeholder: z.literal(true),
  contentSha256: z.null(),
}).strict();

const approvedLibraryRecordSchema = z.object({
  ...libraryRecordContentShape,
  sourceUrl: publicHttpUrlSchema,
  publicationStatus: z.literal("approved"),
  placeholder: z.literal(false),
  contentSha256: z.string().regex(SHA256_PATTERN),
}).strict();

export const libraryRecordSchema = z.discriminatedUnion("publicationStatus", [
  placeholderLibraryRecordSchema,
  approvedLibraryRecordSchema,
]);

export type LibraryRecord = z.infer<typeof libraryRecordSchema>;
export type LibraryRecordContent = z.infer<typeof libraryRecordContentSchema>;

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

function contentFromRecord(record: LibraryRecord): LibraryRecordContent {
  return libraryRecordContentSchema.parse({
    id: record.id,
    date: record.date,
    title: record.title,
    takeaway: record.takeaway,
    sourceType: record.sourceType,
    creator: record.creator,
    sourceUrl: record.sourceUrl,
    topic: record.topic,
    topicId: record.topicId,
    href: record.href,
    thumbnail: record.thumbnail,
    expanded: record.expanded,
  });
}

export function computeLibraryRecordSha256(content: LibraryRecordContent): string {
  return createHash("sha256")
    .update(JSON.stringify(libraryRecordContentSchema.parse(content)))
    .digest("hex");
}

export function loadLibraryRecords(value: unknown, asOfDate = beijingDay()): LibraryRecord[] {
  const records = z.array(libraryRecordSchema).parse(value);
  const ids = new Set<string>();
  for (const record of records) {
    if (ids.has(record.id)) throw new Error(`library:${record.id}: duplicate id`);
    ids.add(record.id);
    if (record.date > asOfDate) throw new Error(`library:${record.id}: date is in the future`);
    if (
      record.publicationStatus === "approved" &&
      computeLibraryRecordSha256(contentFromRecord(record)) !== record.contentSha256
    ) {
      throw new Error(`library:${record.id}: approved content SHA-256 does not match`);
    }
  }
  return records;
}

/**
 * Library 的单一展示数据源。
 *
 * 后续收到真实素材时，在这里补充 sourceUrl、thumbnail、摘要与本人观点；
 * 未经确认的条目继续保持 placeholder: true，不以示例内容冒充真实阅读记录。
 */
export const libraryRecords = loadLibraryRecords([
  {
    id: "collection-to-opinion",
    date: "2026-08-31",
    title: "从收藏到观点：建立自己的内容处理管线",
    takeaway: "记录来源只是第一步；更重要的是写下它改变了哪个判断，并在未来能被重新找到。",
    sourceType: "文章",
    creator: "作者待补充",
    sourceUrl: null,
    topic: "知识管理",
    topicId: "knowledge",
    href: "/library/2026-08-31/",
    publicationStatus: "placeholder",
    placeholder: true,
    contentSha256: null,
    thumbnail: null,
    expanded: {
      intro: "这是一条用于演示知识输入结构的占位记录。正式内容会从本人确认过的真实来源与观点生成。",
      points: [
        "收藏解决“以后可能会看”，笔记应该解决“它后来怎样参与了判断”。",
        "每条输入会保留原始来源、核心观点、我是否认同，以及它可能改变的行动。",
      ],
    },
  },
  {
    id: "presentation-video-rhythm",
    date: "2026-08-30",
    title: "优秀演示视频的节奏从哪里来",
    takeaway: "镜头不是越碎越好。每次切换都应该服务于信息层级，而不是掩盖内容本身。",
    sourceType: "视频",
    creator: "频道待补充",
    sourceUrl: null,
    topic: "内容创作",
    topicId: "content",
    href: "/library/",
    publicationStatus: "placeholder",
    placeholder: true,
    contentSha256: null,
    thumbnail: null,
    expanded: {
      intro: "这条记录目前用于展示视频内容在缩略卡片与展开视图中的呈现方式。",
      points: ["收到真实视频后，会补充缩略图、原始链接，以及经本人审核的摘要和观点。"],
    },
  },
  {
    id: "ai-product-value-hypothesis",
    date: "2026-08-28",
    title: "把 AI 产品的价值假设写成可验证的问题",
    takeaway: "先定义用户愿意改变什么行为，再讨论模型能力；技术演示不能替代需求证据。",
    sourceType: "播客",
    creator: "节目待补充",
    sourceUrl: null,
    topic: "AI 产品",
    topicId: "ai-product",
    href: "/library/",
    publicationStatus: "placeholder",
    placeholder: true,
    contentSha256: null,
    thumbnail: null,
    expanded: {
      intro: "这条记录目前用于展示播客内容在缩略卡片与展开视图中的呈现方式。",
      points: ["收到真实节目后，会补充节目封面、原始链接，以及经本人审核的摘要和观点。"],
    },
  },
  {
    id: "high-density-interview",
    date: "2026-08-25",
    title: "如何做一场信息密度更高的访谈",
    takeaway: "用具体经历代替态度表达，用追问还原真实决策环境。",
    sourceType: "文章",
    creator: "作者待补充",
    sourceUrl: null,
    topic: "沟通",
    topicId: "communication",
    href: "/library/",
    publicationStatus: "placeholder",
    placeholder: true,
    contentSha256: null,
    thumbnail: null,
    expanded: {
      intro: "这条记录目前用于展示文章内容在缩略卡片与展开视图中的呈现方式。",
      points: ["收到真实文章后，会补充题图、原始链接，以及经本人审核的摘要和观点。"],
    },
  },
]);
