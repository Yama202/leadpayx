"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

export function CopyLinkButton({ url, className = "" }: { url: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <Button className={className} type="button" variant="secondary" onClick={copyLink}>
      {copied ? "Copiado" : "Copiar link"}
    </Button>
  );
}
