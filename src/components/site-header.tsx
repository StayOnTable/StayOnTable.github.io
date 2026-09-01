"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navigation = [
  { href: "/", label: "首页" },
  { href: "/journey/", label: "求职旅程" },
  { href: "/library/", label: "每日输入" },
  { href: "/investing/", label: "投资复盘" },
  { href: "/projects/", label: "项目" },
  { href: "/ask/", label: "问问立正" },
  { href: "/about/", label: "关于" },
] as const;

function isCurrent(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href.replace(/\/$/, ""));
}

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link className="brand-mark" href="/" aria-label="在场笔记，返回首页">
          <span className="brand-mark__dot" aria-hidden="true" />
          <span>在场笔记</span>
        </Link>

        <nav className="pill-nav" aria-label="主要导航">
          {navigation.map((item) => (
            <Link
              key={item.href}
              className="pill-nav__link"
              data-active={isCurrent(pathname, item.href)}
              href={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <button
          type="button"
          className="menu-button"
          aria-expanded={open}
          aria-controls="mobile-navigation"
          aria-label={open ? "关闭导航" : "打开导航"}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X size={19} /> : <Menu size={19} />}
        </button>
      </div>

      <nav
        id="mobile-navigation"
        className="mobile-nav"
        data-open={open}
        aria-label="移动端导航"
      >
        {navigation.map((item, index) => (
          <Link
            key={item.href}
            className="mobile-nav__link"
            data-active={isCurrent(pathname, item.href)}
            href={item.href}
            onClick={() => setOpen(false)}
          >
            <span className="mobile-nav__index">0{index + 1}</span>
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
