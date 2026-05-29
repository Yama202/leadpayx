insert into public.app_settings(key, value) values
  ('daily_prize_active', 'false'),
  ('daily_prize_description', '')
on conflict (key) do nothing;
