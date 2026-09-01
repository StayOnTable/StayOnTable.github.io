import type { MetadataRoute } from "next";

import { journeyEntries } from "@/content/journey";

export const dynamic = "force-static";

const baseRoutes = [
  "",
  "/journey",
  "/library",
  "/investing",
  "/projects",
  "/ask",
  "/about",
  "/notes/video-workflow",
  "/notes/build-in-public",
  "/library/2026-08-31",
  "/investing/weekly/2026-w35",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://stayontable.github.io";
  const routes = [
    ...baseRoutes,
    ...journeyEntries.map((entry) => entry.href.replace(/\/$/, "")),
  ].filter((route, index, allRoutes) => allRoutes.indexOf(route) === index);
  return routes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: new Date("2026-09-01T00:00:00+08:00"),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.7,
  }));
}
