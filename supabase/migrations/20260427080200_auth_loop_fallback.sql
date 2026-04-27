drop policy if exists "profiles authenticated fallback insert own" on public.profiles;

create policy "profiles authenticated fallback insert own"
on public.profiles
for insert to authenticated
with check (
  id = auth.uid()
  and role = 'captador'
  and status = 'active'
);
