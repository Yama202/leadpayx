alter table public.profiles
  add column if not exists whatsapp text;

alter table public.profiles
  drop constraint if exists profiles_whatsapp_br_format;

alter table public.profiles
  add constraint profiles_whatsapp_br_format
  check (
    whatsapp is null
    or (
      whatsapp ~ '^55[0-9]{10,11}$'
      and length(whatsapp) between 12 and 13
    )
  );

create index if not exists profiles_whatsapp_idx
  on public.profiles(whatsapp)
  where whatsapp is not null;
