"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

type TurnstileApi = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  remove: (widgetId: string) => void;
  reset: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export function TurnstileWidget({
  resetNonce,
  siteKey,
  onTokenChange,
}: {
  resetNonce: number;
  siteKey: string;
  onTokenChange: (token: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const callbackRef = useRef(onTokenChange);
  const [scriptReady, setScriptReady] = useState(false);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    callbackRef.current = onTokenChange;
  }, [onTokenChange]);

  useEffect(() => {
    if (!scriptReady || !siteKey || !containerRef.current || !window.turnstile || widgetIdRef.current) return;
    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      action: "ask",
      appearance: "interaction-only",
      execution: "render",
      language: "zh-CN",
      size: "flexible",
      theme: "light",
      callback: (token: string) => {
        setVerified(true);
        callbackRef.current(token);
      },
      "error-callback": () => {
        setVerified(false);
        callbackRef.current("");
      },
      "expired-callback": () => {
        setVerified(false);
        callbackRef.current("");
      },
      "timeout-callback": () => {
        setVerified(false);
        callbackRef.current("");
      },
    });
    return () => {
      if (widgetIdRef.current && window.turnstile) window.turnstile.remove(widgetIdRef.current);
      widgetIdRef.current = null;
    };
  }, [scriptReady, siteKey]);

  useEffect(() => {
    if (resetNonce > 0 && widgetIdRef.current && window.turnstile) {
      setVerified(false);
      callbackRef.current("");
      window.turnstile.reset(widgetIdRef.current);
    }
  }, [resetNonce]);

  if (!siteKey) return null;
  return (
    <div className="ask-turnstile" aria-label="Cloudflare 安全验证">
      <Script
        id="cloudflare-turnstile"
        onLoad={() => setScriptReady(true)}
        onReady={() => setScriptReady(true)}
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
      />
      <div ref={containerRef} />
      <span><i data-ready={verified} />{verified ? "安全验证通过" : scriptReady ? "正在完成安全验证" : "正在加载安全验证"}</span>
    </div>
  );
}
