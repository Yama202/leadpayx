import { ProfileAdminEditor } from "@/components/admin/profile-admin-editor";
import type { CaptadorSubmissionBrief, Profile } from "@/lib/types";

export function ProfileAdminCard({
  profile,
  depositBrief,
}: {
  profile: Profile;
  depositBrief?: CaptadorSubmissionBrief | null;
}) {
  return (
    <article className="rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-xl shadow-slate-950/5 dark:border-white/10 dark:bg-slate-900/80">
      <p className="text-lg font-black text-slate-950 dark:text-white">
        {profile.name ?? profile.email}
      </p>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{profile.email}</p>
      <div className="mt-4">
        <ProfileAdminEditor dangerZone="prominent" depositBrief={depositBrief} profile={profile} />
      </div>
    </article>
  );
}
