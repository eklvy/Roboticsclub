-- Private authoritative state. Only the server service role can read/write.
create table public.event_state (
 id integer primary key check (id = 1),
 version bigint not null default 0,
 data jsonb not null
);
alter table public.event_state enable row level security;
revoke all on public.event_state from anon, authenticated;
grant all on public.event_state to service_role;
insert into public.event_state(id, data) values (1, '{"version":0,"config":{"duration":3600,"levelPoints":100,"puzzlePoints":25,"firstBonus":10,"hintPenalty":15,"wrongPenalty":5,"timeBonus":1,"enabled":[true,true,true,true,true,true]},"runs":[]}');
-- Realtime broadcasts a revision only. Clients fetch sanitized standings through the API.
create table public.leaderboard_signal(id integer primary key check(id=1),version bigint not null default 0);
insert into public.leaderboard_signal values(1,0);
alter table public.leaderboard_signal enable row level security;
create policy "Public revision notifications" on public.leaderboard_signal for select using (true);
grant select on public.leaderboard_signal to anon,authenticated;
grant all on public.leaderboard_signal to service_role;
alter publication supabase_realtime add table public.leaderboard_signal;
