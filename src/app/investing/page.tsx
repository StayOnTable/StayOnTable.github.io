import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { InvestmentDashboard } from "@/components/investment-dashboard";
import { InvestmentDisclaimer } from "@/components/investment-disclaimer";
import { InvestmentReflectionsPanel } from "@/components/investment-reflections-panel";
import investmentJson from "@/content/investment-public.json";
import { PublicInvestmentPanelSchema } from "@/lib/investment";
import { investmentReflections } from "./investment-reflections";

export const metadata: Metadata = {
  title: "投资复盘",
  description: "计划每周更新的 IBKR 投资组合表现、公开持仓和交易复盘。仅个人复盘，非投资建议。",
};

const investmentPanel = PublicInvestmentPanelSchema.parse(investmentJson);

export default function InvestingPage() {
  return (
    <div className="shell page-shell investing-page">
      <section className="investing-intro" aria-labelledby="investing-title">
        <div className="investing-intro__copy">
          <span>INVESTING / 投资复盘</span>
          <h1 id="investing-title">记录我的美股投资历程</h1>
          <p>这里是一个程序员，在接触美股的过程中增进了对行业和世界的跟进和认知。</p>
          <div className="investing-intro__meta" aria-label="投资数据说明">
            <span>USD</span>
            <span><ShieldCheck aria-hidden="true" size={13} />IBKR READ-ONLY</span>
          </div>
        </div>
        <InvestmentReflectionsPanel reflections={investmentReflections} />
      </section>
      <div className="investing-page__disclaimer"><InvestmentDisclaimer /></div>
      <InvestmentDashboard panel={investmentPanel} />
    </div>
  );
}
