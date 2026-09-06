import { createHash } from "node:crypto";
import { z } from "zod";

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const ISO_DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const publicSourceSchema = z.object({
  label: z.string().min(1),
  url: z.string().url().refine((value) => /^https:\/\//.test(value), "source URL must use https"),
}).strict();

const reflectionContentShape = {
  id: z.string().regex(/^[a-z0-9-]+$/),
  date: z.string().regex(ISO_DAY_PATTERN),
  title: z.string().min(1),
  body: z.string().min(1),
  sources: z.array(publicSourceSchema),
};

export const investmentReflectionContentSchema = z.object(reflectionContentShape).strict();

export const investmentReflectionSchema = z.object({
  ...reflectionContentShape,
  publicationStatus: z.literal("approved"),
  contentSha256: z.string().regex(SHA256_PATTERN),
}).strict();

export type InvestmentReflection = z.infer<typeof investmentReflectionSchema>;
export type InvestmentReflectionContent = z.infer<typeof investmentReflectionContentSchema>;

function contentFromRecord(record: InvestmentReflection): InvestmentReflectionContent {
  return investmentReflectionContentSchema.parse({
    id: record.id,
    date: record.date,
    title: record.title,
    body: record.body,
    sources: record.sources,
  });
}

export function computeInvestmentReflectionSha256(content: InvestmentReflectionContent): string {
  return createHash("sha256")
    .update(JSON.stringify(investmentReflectionContentSchema.parse(content)))
    .digest("hex");
}

export function loadInvestmentReflections(value: unknown): InvestmentReflection[] {
  const records = z.array(investmentReflectionSchema).parse(value);
  const ids = new Set<string>();

  for (const record of records) {
    if (ids.has(record.id)) throw new Error(`investment-reflection:${record.id}: duplicate id`);
    ids.add(record.id);

    if (computeInvestmentReflectionSha256(contentFromRecord(record)) !== record.contentSha256) {
      throw new Error(`investment-reflection:${record.id}: approved content SHA-256 does not match`);
    }
  }

  return [...records].sort((left, right) => right.date.localeCompare(left.date));
}

export const investmentReflections = loadInvestmentReflections([
  {
    id: "semiconductor-strength-and-buying-discipline",
    date: "2026-09-04",
    title: "半导体走强，更要保持买入纪律",
    body: "周五，半导体与存储板块明显走强，闪迪（SNDK）仍处相对高位；Snowflake 及软件股相较之下缺少持续性，SNOW 从前一日约 385 美元的高点回落至约 337 美元。回头看，没有在急涨时追高，是更合适的选择。接下来我会更谨慎地控制买卖节奏。我仍没有看到市场对 AI capex 最终 ROI 的充分信心，因此较大的波动可能还会持续。近期我在分批配置 Broadcom（AVGO）和 Qualcomm（QCOM）；我的判断是，它们仍可能处在估值偏低、等待催化剂的阶段，这让我想到 Palantir 过去等待重估的一段走势，但类比并不等于结论。此前逢低布局的 Meta 近期也在回升。对我而言，面对基本面认可的公司，buy the dip 应建立在耐心、分批和仓位纪律上，而不是追涨。",
    sources: [
      {
        label: "9 月 4 日美股与半导体板块表现",
        url: "https://apnews.com/article/1af16359af43eb8abc66445465f633c8",
      },
      {
        label: "Snowflake 历史行情",
        url: "https://stockanalysis.com/stocks/snow/history/",
      },
    ],
    publicationStatus: "approved",
    contentSha256: "b9812629e3185f129b1735eea78962c88eafdd7d6e5f1d7144cd44f0673027ec",
  },
  {
    id: "snowflake-earnings-and-dip-buying",
    date: "2026-09-03",
    title: "Snowflake财报后暴涨22%",
    body: "Snowflake财报后暴涨22%，我在前几天清仓卖飞了，但是落袋为安不遗憾。与其接盘估值离谱、靠逼空续命的软件公司，不如保持耐心，逢低布局 (Dip Buying) 那些拥有恐怖现金流、利润率极高且估值便宜的硬件巨头。",
    sources: [
      {
        label: "Snowflake FY2027 Q2 财报",
        url: "https://www.sec.gov/Archives/edgar/data/1640147/000164014726000033/fy2027q2earnings.htm",
      },
      {
        label: "财报后市场涨幅记录",
        url: "https://primexbt.com/news/snowflake-shares-jump-22-after-earnings-beat-and-raised-guidance/",
      },
    ],
    publicationStatus: "approved",
    contentSha256: "f52c65fec17f27cb763942e2035d1af9fcc077ce26c89685b249ee8051c8a662",
  },
]);
