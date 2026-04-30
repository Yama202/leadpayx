-- Compatibilidade de assinatura para RPC via PostgREST/Supabase.
-- Em alguns ambientes o payload pode chegar como numeric em vez de integer,
-- e versões antigas podem chamar apenas com target_operator_id.

create or replace function public.assign_next_batch_to_operator(target_operator_id uuid)
returns int
language sql
security definer
set search_path = public, pg_temp
as $$
  select public.assign_next_batch_to_operator(target_operator_id, 2::integer);
$$;

create or replace function public.assign_next_batch_to_operator(
  target_operator_id uuid,
  batch_size numeric
)
returns int
language sql
security definer
set search_path = public, pg_temp
as $$
  select public.assign_next_batch_to_operator(
    target_operator_id,
    greatest(1, least(coalesce(floor(batch_size), 2), 2))::integer
  );
$$;

grant execute on function public.assign_next_batch_to_operator(uuid) to authenticated;
grant execute on function public.assign_next_batch_to_operator(uuid, numeric) to authenticated;
