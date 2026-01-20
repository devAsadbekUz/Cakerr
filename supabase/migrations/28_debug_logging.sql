create table if not exists debug_logs (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  message text,
  payload jsonb
);

-- Open access for debugging (will delete later)
alter table debug_logs enable row level security;
create policy "Public Insert" on debug_logs for insert with check (true);
create policy "Public Select" on debug_logs for select using (true);
