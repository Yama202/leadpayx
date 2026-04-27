"use client";

import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export function BackButton({
  fallbackHref = "/",
  label = "Voltar",
  className = "",
}: {
  fallbackHref?: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  function goBack() {
    const referrer = document.referrer ? new URL(document.referrer) : null;
    const isSameOrigin = referrer?.origin === window.location.origin;
    const isDifferentPage = referrer?.pathname !== pathname;

    if (isSameOrigin && isDifferentPage && window.history.length > 1) {
      router.back();
      return;
    }

    router.push(fallbackHref);
  }

  return (
    <Button className={className} onClick={goBack} type="button" variant="secondary">
      {label}
    </Button>
  );
}
