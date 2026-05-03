-- Atualização atômica das comissões globais em uma única chamada.
-- Os valores são convertidos no banco para jsonb (`to_jsonb`), evitando falhas na
-- deserialização de parâmetros jsonb vindos do PostgREST/JS em alguns casos.

create or replace function public.upsert_global_commissions(
  p_captador_brl numeric,
  p_operator_brl numeric
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'admin required';
  end if;

  if p_captador_brl < 0 or p_operator_brl < 0 then
    raise exception 'commission must be non-negative';
  end if;

  perform public.upsert_app_setting(
    'captador_commission_per_account',
    to_jsonb(p_captador_brl)
  );
  perform public.upsert_app_setting(
    'operator_commission_per_account',
    to_jsonb(p_operator_brl)
  );
  perform public.upsert_app_setting(
    'commission_amount_brl',
    to_jsonb(p_captador_brl)
  );
  perform public.upsert_app_setting(
    'operator_commission_amount_brl',
    to_jsonb(p_operator_brl)
  );
end;
$$;

revoke execute on function public.upsert_global_commissions(numeric, numeric) from public, anon;
grant execute on function public.upsert_global_commissions(numeric, numeric) to authenticated;
