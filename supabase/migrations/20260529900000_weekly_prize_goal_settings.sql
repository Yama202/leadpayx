insert into public.app_settings(key, value) values
  ('weekly_prize_active',         'false'::jsonb),
  ('weekly_prize_description',    '""'::jsonb),
  ('weekly_goal_active',          'false'::jsonb),
  ('weekly_goal_min_accounts',    '10'::jsonb),
  ('weekly_goal_min_referrals',   '3'::jsonb),
  ('weekly_goal_prize_description', '""'::jsonb)
on conflict (key) do nothing;
