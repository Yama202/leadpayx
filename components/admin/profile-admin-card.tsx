import { ProfileAdminEditor } from "@/components/admin/profile-admin-editor";
import type { Profile } from "@/lib/types";

export function ProfileAdminCard({ profile }: { profile: Profile }) {
  return (
    <article className="rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-xl shadow-slate-950/5 dark:border-white/10 dark:bg-slate-900/80">
      <p className="text-lg font-black text-slate-950 dark:text-white">
        {profile.name ?? profile.email}
      </p>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{profile.email}</p>
      <div className="mt-4">
        <ProfileAdminEditor dangerZone="prominent" profile={profile} />
      </div>
    </article>
  );
}
