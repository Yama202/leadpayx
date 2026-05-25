"use client";

import { useActionState } from "react";

import { adminApproveCaptadorAction } from "@/lib/actions/domain";
import { initialActionState } from "@/lib/validation";

export function ApproveCaptadorButton({ profileId }: { profileId: string }) {
  const [state, action, pending] = useActionState(adminApproveCaptadorAction, initialActionState);

  return (
    <form action={action} className="flex flex-col gap-2">
      <input name="profileId" type="hidden" value={profileId} />
      {state.message && !state.ok ? (
        <p className="text-xs text-rose-400">{state.message}</p>
      ) : null}
      <button
        className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-xl bg-[#00E07A]/15 px-4 text-sm font-bold text-[#16F28A] ring-1 ring-[#00E07A]/30 transition-colors hover:bg-[#00E07A]/25 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={pending}
        type="submit"
      >
        {pending ? "Aprovando…" : "Aprovar captador"}
      </button>
    </form>
  );
}
