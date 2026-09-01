import type { Metadata, Viewport } from "next";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { siteMeta } from "@/content/site";
import "./globals.css";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://stayontable.github.io").replace(/\/$/, "");
const shareImageUrl = `${siteUrl}/og.png`;

export const metadata: Metadata = {
  metadataBase: new URL(`${siteUrl}/`),
  title: {
    default: `${siteMeta.name} · ${siteMeta.owner}`,
    template: `%s · ${siteMeta.name}`,
  },
  description: siteMeta.description,
  applicationName: siteMeta.name,
  openGraph: {
    type: "website",
    locale: "zh_CN",
    title: `${siteMeta.name} · ${siteMeta.owner}`,
    description: siteMeta.description,
    siteName: siteMeta.name,
    images: [
      {
        url: shareImageUrl,
        width: 1536,
        height: 1024,
        alt: "在场笔记：写作、项目、求职、每日输入与投资复盘",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteMeta.name} · ${siteMeta.owner}`,
    description: siteMeta.description,
    images: [shareImageUrl],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f2eddf",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <a className="skip-link" href="#main-content">
          跳到正文
        </a>
        <SiteHeader />
        <main id="main-content">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
