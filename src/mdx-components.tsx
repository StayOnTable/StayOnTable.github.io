import type { MDXComponents } from "mdx/types";
import Link from "next/link";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    a: ({ href = "", children }) => {
      const external = href.startsWith("http");
      return (
        <Link href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined}>
          {children}
        </Link>
      );
    },
    ...components,
  };
}
