import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Room } from '../lib/types';

async function callGameAction(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('game-action', { body });
  if (error) {
    // supabase-js wraps non-2xx responses here; try to surface our own message.
    const message = (error as any)?.context?.error ?? error.message ?? 'Something went wrong';
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

/**
 * Subscribes to a single room row via Supabase Realtime (postgres_changes)
 * so both players see every update — move, resign, draw offer/response —
 * without polling or refreshing. Handles reconnection by re-fetching the
 * row on mount, so a browser refresh restores exactly where the game was.
 */
export function useRoom(roomId: string | null) {
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId) return;
    let active = true;
    setLoading(true);

    supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .single()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setError('Room not found');
        else setRoom(data as Room);
        setLoading(false);
      });

    const channel = supabase
      .channel(`room-${roomId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
        (payload) => setRoom(payload.new as Room)
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  const move = useCallback(
    (from: string, to: string, promotion?: string) => callGameAction({ type: 'move', roomId, from, to, promotion }),
    [roomId]
  );
  const resign = useCallback(() => callGameAction({ type: 'resign', roomId }), [roomId]);
  const offerDraw = useCallback(() => callGameAction({ type: 'offer_draw', roomId }), [roomId]);
  const respondDraw = useCallback((accept: boolean) => callGameAction({ type: 'respond_draw', roomId, accept }), [roomId]);

  return { room, loading, error, move, resign, offerDraw, respondDraw };
}

export async function createRoom() {
  return callGameAction({ type: 'create_room' }) as Promise<{ room: Room }>;
}

export async function joinRoom(roomCode: string) {
  return callGameAction({ type: 'join_room', roomCode }) as Promise<{ room: Room }>;
}
