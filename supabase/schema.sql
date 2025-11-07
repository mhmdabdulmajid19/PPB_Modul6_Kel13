create table if not exists public.sensor_readings (
  id uuid primary key default gen_random_uuid(),
  temperature numeric(6,2) not null,
  threshold_value numeric(6,2),
  recorded_at timestamptz not null default timezone('utc', now())
);

create index if not exists sensor_readings_recorded_at_idx
  on public.sensor_readings (recorded_at desc);

create table if not exists public.threshold_settings (
  id uuid primary key default gen_random_uuid(),
  value numeric(6,2) not null,
  note text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists threshold_settings_created_at_idx
  on public.threshold_settings (created_at desc);
