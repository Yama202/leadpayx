-- Garantia idempotente do recurso "Exigir depósito no envio" por captador.
-- Em alguns ambientes a tabela/policies não estavam presentes no schema cache (PGRST205).

create table if not exists public.captador_submission_briefs (
  captador_id uuid primary key references public.profiles(id) on delete cascade,
  min_deposit_brl numeric(12,2) not null check (min_deposit_brl > 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

create index if not exists captador_submission_briefs_updated_idx
  on public.captador_submission_briefs(updated_at desc);

alter table public.captador_submission_briefs enable row level security;

drop policy if exists "captador submission briefs admin all" on public.captador_submission_briefs;
create policy "captador submission briefs admin all"
  on public.captador_submission_briefs
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "captador submission briefs captador read own" on public.captador_submission_briefs;
create policy "captador submission briefs captador read own"
  on public.captador_submission_briefs
  for select
  to authenticated
  using (captador_id = auth.uid());

grant select, insert, update, delete on public.captador_submission_briefs to authenticated;
