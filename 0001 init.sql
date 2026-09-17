-- ============================================================
-- Endgame chess platform — initial schema
-- Run this once in Supabase SQL Editor, or via `supabase db push`
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- PROFILES ----------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  avatar_url text,
  games_played int not null default 0,
  wins int not null default 0,
  losses int not null default 0,
  draws int not null default 0,
  rating int not null default 1200,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "Profiles are publicly readable"
  on profiles for select
  using (true);

create policy "Users can update their own profile"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------- ROOMS ----------
-- A room is the live, mutable game session. Once it finishes it is archived
-- into `games` (see below) for history/leaderboard purposes.
create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  room_code text unique not null,
  creator_id uuid not null references profiles(id),
  player_white_id uuid references profiles(id),
  player_black_id uuid references profiles(id),
  status text not null default 'waiting' check (status in ('waiting','active','finished')),
  current_turn text not null default 'w' check (current_turn in ('w','b')),
  fen text not null default 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  move_history jsonb not null default '[]'::jsonb,
  game_result text,
  result_reason text,
  draw_offered_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_rooms_room_code on rooms(room_code);
create index if not exists idx_rooms_status on rooms(status);

alter table rooms enable row level security;

-- Anyone authenticated can look up a room by code to join it, and
-- participants can keep reading their own room for realtime sync.
create policy "Participants and joiners can read rooms"
  on rooms for select
  using (
    status = 'waiting'
    or auth.uid() in (creator_id, player_white_id, player_black_id)
  );

create policy "Authenticated users can create rooms"
  on rooms for insert
  to authenticated
  with check (auth.uid() = creator_id);

-- Direct client updates to rooms are intentionally NOT allowed except for
-- joining an open seat. All game-state mutations (moves, resign, draw,
-- result) go through the `game-action` Edge Function using the service
-- role key, which bypasses RLS after it has verified the request itself.
create policy "A user may join an open seat"
  on rooms for update
  to authenticated
  using (status = 'waiting')
  with check (
    status in ('waiting','active')
    and (player_white_id = auth.uid() or player_black_id = auth.uid() or player_white_id is null or player_black_id is null)
  );

-- ---------- GAMES (archive of finished rooms) ----------
create table if not exists games (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id),
  white_player_id uuid references profiles(id),
  black_player_id uuid references profiles(id),
  mode text not null default 'multiplayer' check (mode in ('multiplayer','ai')),
  ai_difficulty text,
  result text not null,
  result_reason text not null,
  final_fen text not null,
  move_history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  finished_at timestamptz not null default now()
);

create index if not exists idx_games_players on games(white_player_id, black_player_id);

alter table games enable row level security;

create policy "Players can read their own games"
  on games for select
  using (auth.uid() in (white_player_id, black_player_id));

-- Games are only ever inserted by the Edge Function (service role),
-- so no insert/update policy is granted to normal clients.

-- ---------- MOVES (granular move log, optional deep history) ----------
create table if not exists moves (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references games(id) on delete cascade,
  room_id uuid references rooms(id) on delete cascade,
  move_number int not null,
  player_id uuid references profiles(id),
  from_square text not null,
  to_square text not null,
  promotion text,
  notation text not null,
  fen_after_move text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_moves_room on moves(room_id);
create index if not exists idx_moves_game on moves(game_id);

alter table moves enable row level security;

create policy "Players can read moves from their own games/rooms"
  on moves for select
  using (
    auth.uid() in (
      select player_white_id from rooms where rooms.id = moves.room_id
      union
      select player_black_id from rooms where rooms.id = moves.room_id
    )
  );

-- ---------- Helper: unique room code generator ----------
create or replace function public.generate_room_code()
returns text
language plpgsql
as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
  exists_already boolean;
begin
  loop
    code := 'CHESS-' || (
      select string_agg(substr(chars, (floor(random()*length(chars))+1)::int, 1), '')
      from generate_series(1,5)
    );
    select exists(select 1 from rooms where room_code = code) into exists_already;
    exit when not exists_already;
  end loop;
  return code;
end;
$$;

-- Keep updated_at current on every row change.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_rooms_touch on rooms;
create trigger trg_rooms_touch before update on rooms
  for each row execute procedure public.touch_updated_at();

-- Enable Realtime on rooms so clients get postgres_changes events.
alter publication supabase_realtime add table rooms;
