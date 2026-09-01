import createMDX from "@next/mdx";
import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  turbopack: {
    root: process.cwd(),
  },
  pageExtensions: ["ts", "tsx", "md", "mdx"],
  images: {
    unoptimized: true,
  },
  basePath,
  assetPrefix: basePath || undefined,
};

const withMDX = createMDX({});

export default withMDX(nextConfig);
