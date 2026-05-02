"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

export function CopyTextButton({
  text,
  idleLabel = "Copiar",
  copiedLabel = "Copiado",
  className = "",
}: {
  text: string;
  idleLabel?: string;
  copiedLabel?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copyText() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <Button className={className} onClick={copyText} type="button" variant="secondary">
      {copied ? copiedLabel : idleLabel}
    </Button>
  );
}
