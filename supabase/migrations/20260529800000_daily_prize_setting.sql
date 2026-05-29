insert into public.app_settings(key, value) values
  ('daily_prize_active', 'false'::jsonb),
  ('daily_prize_description', '""'::jsonb)
on conflict (key) do nothing;
