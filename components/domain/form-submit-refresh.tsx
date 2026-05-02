"use client";

import { useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";

/**
 * Deve ficar dentro de um <form>. Após o utilizador submeter e a action terminar,
 * chama router.refresh() para repor os Server Components (ex.: fila do operador).
 */
export function FormSubmitRefresh() {
  const { pending } = useFormStatus();
  const router = useRouter();
  const wasPending = useRef(false);

  useEffect(() => {
    if (pending) {
      wasPending.current = true;
      return;
    }
    if (wasPending.current) {
      wasPending.current = false;
      router.refresh();
    }
  }, [pending, router]);

  return null;
}
