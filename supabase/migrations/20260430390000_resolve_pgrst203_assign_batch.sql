-- Resolve PGRST203 on PostgREST function resolution:
-- remove overloaded signatures that create ambiguity for RPC payload typing.
-- Keep a single callable signature for RPC: (uuid, int).

drop function if exists public.assign_next_batch_to_operator(uuid);
drop function if exists public.assign_next_batch_to_operator(uuid, numeric);

grant execute on function public.assign_next_batch_to_operator(uuid, int) to authenticated;
