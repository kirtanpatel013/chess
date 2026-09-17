// Supabase Edge Function — the single authoritative gatekeeper for every
// multiplayer game-state change. The frontend NEVER writes moves, turns,
// or results directly to the `rooms` table; it calls this function, which
// uses the service_role key (server-side only) to validate and apply
// changes, then relies on Postgres Realtime to fan the new row out to
// both players.
//
// Deploy with:
//   supabase functions deploy game-action
//   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=... SUPABASE_URL=...
//
// Invoke from the client with the user's own JWT in the Authorization
// header (supabase-js does this automatically via `functions.invoke`).

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { Chess } from 'https://esm.sh/chess.js@1.0.0-beta.8';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const userClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: 'Authentication required' }, 401);

    // Service-role client for the actual writes, now that we trust `user.id`.
    const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const body = await req.json();
    const { type } = body;

    switch (type) {
      case 'create_room':
        return await createRoom(db, user.id);
      case 'join_room':
        return await joinRoom(db, user.id, body.roomCode);
      case 'move':
        return await makeMove(db, user.id, body.roomId, body.from, body.to, body.promotion);
      case 'resign':
        return await resign(db, user.id, body.roomId);
      case 'offer_draw':
        return await offerDraw(db, user.id, body.roomId);
      case 'respond_draw':
        return await respondDraw(db, user.id, body.roomId, body.accept);
      default:
        return json({ error: 'Unknown action type' }, 400);
    }
  } catch (e) {
    console.error(e);
    return json({ error: 'Something went wrong' }, 500);
  }
});

async function createRoom(db: ReturnType<typeof createClient>, userId: string) {
  const { data: codeData, error: codeErr } = await db.rpc('generate_room_code');
  if (codeErr) return json({ error: 'Could not generate room code' }, 500);

  const { data, error } = await db
    .from('rooms')
    .insert({
      room_code: codeData,
      creator_id: userId,
      player_white_id: userId, // creator defaults to White
      status: 'waiting',
    })
    .select()
    .single();

  if (error) return json({ error: 'Could not create room' }, 500);
  return json({ room: data });
}

async function joinRoom(db: ReturnType<typeof createClient>, userId: string, roomCode: string) {
  if (!roomCode) return json({ error: 'Room code is required' }, 400);

  const { data: room, error } = await db
    .from('rooms')
    .select('*')
    .eq('room_code', roomCode.trim().toUpperCase())
    .maybeSingle();

  if (error || !room) return json({ error: 'Room not found' }, 404);
  if (room.status === 'finished') return json({ error: 'This game has ended' }, 409);

  if (room.player_white_id === userId || room.player_black_id === userId) {
    return json({ room }); // reconnecting player
  }

  if (room.player_white_id && room.player_black_id) {
    return json({ error: 'Room is already full' }, 409);
  }

  // Atomic guard: the `.is(seatField, null)` condition is re-checked by
  // Postgres at write time, not just at the read above. If two players
  // hit "join" in the same instant, only one UPDATE actually matches a
  // row — the loser gets zero rows back instead of silently overwriting
  // the winner's seat.
  const seatField = room.player_white_id ? 'player_black_id' : 'player_white_id';
  const { data: updatedRows, error: updateErr } = await db
    .from('rooms')
    .update({ [seatField]: userId, status: 'active' })
    .eq('id', room.id)
    .is(seatField, null)
    .select();

  if (updateErr) return json({ error: 'Could not join room' }, 500);
  if (!updatedRows || updatedRows.length === 0) {
    return json({ error: 'Room is already full' }, 409);
  }
  return json({ room: updatedRows[0] });
}

async function loadRoomForPlayer(db: ReturnType<typeof createClient>, userId: string, roomId: string) {
  const { data: room, error } = await db.from('rooms').select('*').eq('id', roomId).maybeSingle();
  if (error || !room) return { error: json({ error: 'Room not found' }, 404) };
  if (room.player_white_id !== userId && room.player_black_id !== userId) {
    return { error: json({ error: 'You are not a player in this room' }, 403) };
  }
  return { room };
}

async function makeMove(
  db: ReturnType<typeof createClient>,
  userId: string,
  roomId: string,
  from: string,
  to: string,
  promotion?: string
) {
  const { room, error } = await loadRoomForPlayer(db, userId, roomId);
  if (error) return error;
  if (room.status !== 'active') return json({ error: 'Game is not active' }, 409);

  const myColor = room.player_white_id === userId ? 'w' : 'b';
  if (room.current_turn !== myColor) return json({ error: 'Not your turn' }, 409);

  const chess = new Chess(room.fen);
  let move;
  try {
    move = chess.move({ from, to, promotion: promotion || 'q' });
  } catch {
    move = null;
  }
  if (!move) return json({ error: 'Illegal Move' }, 422);

  let result: string | null = null;
  let reason: string | null = null;
  if (chess.isCheckmate()) {
    result = myColor === 'w' ? 'white_wins' : 'black_wins';
    reason = 'checkmate';
  } else if (chess.isStalemate()) {
    result = 'draw';
    reason = 'stalemate';
  } else if (chess.isThreefoldRepetition()) {
    result = 'draw';
    reason = 'threefold_repetition';
  } else if (chess.isInsufficientMaterial()) {
    result = 'draw';
    reason = 'insufficient_material';
  }

  const newHistory = [
    ...(room.move_history as unknown[]),
    { san: move.san, from, to, promotion, fen: chess.fen(), captured: move.captured ?? null, color: move.color },
  ];
  const status = result ? 'finished' : 'active';

  // Optimistic concurrency: only write if the FEN is still what we read.
  // Guards against two near-simultaneous move requests (e.g. a double
  // click, or a retried request after a slow response) both being
  // validated against the same starting position and both landing.
  const { data: updatedRows, error: updateErr } = await db
    .from('rooms')
    .update({
      fen: chess.fen(),
      current_turn: chess.turn(),
      move_history: newHistory,
      status,
      game_result: result,
      result_reason: reason,
      draw_offered_by: null,
    })
    .eq('id', roomId)
    .eq('fen', room.fen)
    .select();

  if (updateErr) return json({ error: 'Could not save move' }, 500);
  if (!updatedRows || updatedRows.length === 0) {
    return json({ error: 'Board changed before this move was saved — please retry' }, 409);
  }
  const updated = updatedRows[0];

  await db.from('moves').insert({
    room_id: roomId,
    move_number: newHistory.length,
    player_id: userId,
    from_square: from,
    to_square: to,
    promotion: promotion || null,
    notation: move.san,
    fen_after_move: chess.fen(),
  });

  if (result) await archiveGame(db, updated, reason!);

  return json({ room: updated });
}

async function resign(db: ReturnType<typeof createClient>, userId: string, roomId: string) {
  const { room, error } = await loadRoomForPlayer(db, userId, roomId);
  if (error) return error;
  if (room.status === 'finished') return json({ error: 'Game Already Finished' }, 409);

  const winnerColor = room.player_white_id === userId ? 'black_wins' : 'white_wins';
  const { data: updated, error: updateErr } = await db
    .from('rooms')
    .update({ status: 'finished', game_result: winnerColor, result_reason: 'resignation' })
    .eq('id', roomId)
    .select()
    .single();

  if (updateErr) return json({ error: 'Could not resign' }, 500);
  await archiveGame(db, updated, 'resignation');
  return json({ room: updated });
}

async function offerDraw(db: ReturnType<typeof createClient>, userId: string, roomId: string) {
  const { room, error } = await loadRoomForPlayer(db, userId, roomId);
  if (error) return error;
  if (room.status !== 'active') return json({ error: 'Game is not active' }, 409);

  const { data: updated, error: updateErr } = await db
    .from('rooms')
    .update({ draw_offered_by: userId })
    .eq('id', roomId)
    .select()
    .single();

  if (updateErr) return json({ error: 'Could not offer draw' }, 500);
  return json({ room: updated });
}

async function respondDraw(db: ReturnType<typeof createClient>, userId: string, roomId: string, accept: boolean) {
  const { room, error } = await loadRoomForPlayer(db, userId, roomId);
  if (error) return error;
  if (!room.draw_offered_by || room.draw_offered_by === userId) {
    return json({ error: 'No draw offer to respond to' }, 409);
  }

  const patch = accept
    ? { status: 'finished', game_result: 'draw', result_reason: 'agreement', draw_offered_by: null }
    : { draw_offered_by: null };

  const { data: updated, error: updateErr } = await db
    .from('rooms')
    .update(patch)
    .eq('id', roomId)
    .select()
    .single();

  if (updateErr) return json({ error: 'Could not update draw offer' }, 500);
  if (accept) await archiveGame(db, updated, 'agreement');
  return json({ room: updated });
}

async function archiveGame(db: ReturnType<typeof createClient>, room: any, reason: string) {
  await db.from('games').insert({
    room_id: room.id,
    white_player_id: room.player_white_id,
    black_player_id: room.player_black_id,
    mode: 'multiplayer',
    result: room.game_result,
    result_reason: reason,
    final_fen: room.fen,
    move_history: room.move_history,
    finished_at: new Date().toISOString(),
  });

  await updateProfileStats(db, room.player_white_id, room.game_result, 'w');
  await updateProfileStats(db, room.player_black_id, room.game_result, 'b');
}

async function updateProfileStats(
  db: ReturnType<typeof createClient>,
  playerId: string | null,
  result: string | null,
  color: 'w' | 'b'
) {
  if (!playerId) return;
  const { data: profile } = await db.from('profiles').select('*').eq('id', playerId).single();
  if (!profile) return;

  const won = (color === 'w' && result === 'white_wins') || (color === 'b' && result === 'black_wins');
  const drew = result === 'draw';
  const lost = !won && !drew;

  await db
    .from('profiles')
    .update({
      games_played: profile.games_played + 1,
      wins: profile.wins + (won ? 1 : 0),
      losses: profile.losses + (lost ? 1 : 0),
      draws: profile.draws + (drew ? 1 : 0),
      rating: profile.rating + (won ? 12 : drew ? 0 : -10), // simple placeholder, see README
    })
    .eq('id', playerId);
}
