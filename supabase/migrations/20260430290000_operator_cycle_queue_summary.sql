create or replace function public.get_operator_cycle_queue_summary()
returns table (
  captador_id uuid,
  captador_name text,
  pending_count bigint,
  first_created_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_role text;
  minimum_batch int;
begin
  actor_role := public.current_user_role();
  if actor_role not in ('admin', 'operator') then
    raise exception 'queue summary denied';
  end if;

  minimum_batch := least(greatest(public.get_numeric_setting('operational_min_batch_size', 2)::int, 1), 2);

  return query
  select
    a.captador_id,
    coalesce(p.name, p.email, 'Captador')::text as captador_name,
    count(*)::bigint as pending_count,
    min(a.created_at) as first_created_at
  from public.accounts a
  join public.profiles p on p.id = a.captador_id
  where a.status = 'pending'
  group by a.captador_id, p.name, p.email
  having count(*) >= minimum_batch
  order by min(a.created_at) asc;
end;
$$;

grant execute on function public.get_operator_cycle_queue_summary() to authenticated;
