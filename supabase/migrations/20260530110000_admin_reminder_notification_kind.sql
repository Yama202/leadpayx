-- Adiciona kind 'admin_reminder' para lembretes enviados pelo admin a captadores
-- com contas em pending de correção (sem saldo, selfie, senha incorreta).

alter table public.user_notifications
  drop constraint if exists user_notifications_kind_check;

alter table public.user_notifications
  add constraint user_notifications_kind_check check (
    kind in (
      'account_approved',
      'account_completed',
      'account_rejected',
      'payout_completed',
      'referral_bonus',
      'wrong_password',
      'admin_reminder'
    )
  );

select pg_notify('pgrst', 'reload schema');
