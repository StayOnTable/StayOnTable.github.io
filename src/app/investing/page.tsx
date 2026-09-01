import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { InvestmentDashboard } from "@/components/investment-dashboard";
import { InvestmentDisclaimer } from "@/components/investment-disclaimer";
import { PageIntro } from "@/components/ui";
import investmentJson from "@/content/investment-public.json";
import { PublicInvestmentPanelSchema } from "@/lib/investment";

export const metadata: Metadata = {
  title: "投资复盘",
  description: "计划每周更新的 IBKR 投资组合表现、公开持仓和交易复盘。仅个人复盘，非投资建议。",
};

const investmentPanel = PublicInvestmentPanelSchema.parse(investmentJson);

export default function InvestingPage() {
  return (
    <div className="shell page-shell investing-page">
      <PageIntro
        eyebrow="INVESTING / 投资复盘"
        title="把每一次操作，放回长期曲线里看"
        description="公开记录账户表现、持仓变化与判断修正。这里不展示融资、现金、账户权益或原始流水，也不把结果包装成可复制的答案。"
        aside={<div className="read-only-chip"><ShieldCheck size={18} /><span>IBKR READ-ONLY</span><strong>只读 · 脱敏发布</strong></div>}
      />
      <div className="investing-page__disclaimer"><InvestmentDisclaimer /></div>
      <InvestmentDashboard panel={investmentPanel} />
    </div>
  );
}
