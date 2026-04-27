import { BRAND_NAME } from "@/lib/constants";

export function BrandMark() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#00E07A]/30 bg-[#00E07A]/10 text-sm font-black tracking-tight text-[#16F28A] shadow-[0_0_28px_rgba(0,224,122,0.22)]">
        LPX
      </div>
      <div>
        <p className="text-lg font-black tracking-tight text-white">{BRAND_NAME}</p>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-300">
          Ops Finance
        </p>
      </div>
    </div>
  );
}
