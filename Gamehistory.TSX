import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabaseClient';
import type { GameRecord, Profile } from '../lib/types';
import { Board } from '../components/Board';

export function GameHistory() {
  const { user } = useAuth();
  const [games, setGames] = useState<GameRecord[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<GameRecord | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('games')
        .select('*')
        .or(`white_player_id.eq.${user.id},black_player_id.eq.${user.id}`)
        .order('finished_at', { ascending: false });
      setGames((data as GameRecord[]) ?? []);

      const ids = Array.from(
        new Set((data ?? []).flatMap((g: any) => [g.white_player_id, g.black_player_id]).filter(Boolean))
      );
      if (ids.length) {
        const { data: profiles } = await supabase.from('profiles').select('id, username').in('id', ids);
        const map: Record<string, string> = {};
        (profiles as Profile[] | null)?.forEach((p) => (map[p.id] = p.username));
        setNames(map);
      }
      setLoading(false);
    })();
  }, [user]);

  if (!user) return <div className="text-center py-24 text-silver-400">Authentication Required</div>;
  if (loading) return <div className="text-center py-24 text-silver-400">Loading…</div>;

  return (
    <div className="max-w-3xl mx-auto px-5 py-14">
      <h1 className="font-display text-3xl mb-8">Game History</h1>
      {games.length === 0 && <p className="text-silver-400">No games yet. Play one to see it here.</p>}
      <div className="space-y-2">
        {games.map((g) => {
          const isWhite = g.white_player_id === user.id;
          const opponentId = isWhite ? g.black_player_id : g.white_player_id;
          const opponentName = g.mode === 'ai' ? `AI (${g.ai_difficulty})` : names[opponentId ?? ''] ?? 'Opponent';
          return (
            <button
              key={g.id}
              onClick={() => setSelected(g)}
              className="w-full flex items-center justify-between bg-ink-800 border border-ink-700 hover:border-silver-400 rounded-md px-4 py-3 text-left transition-colors"
            >
              <div>
                <div className="text-sm font-semibold">vs {opponentName}</div>
                <div className="text-xs text-silver-400">
                  {isWhite ? 'White' : 'Black'} · {g.mode} · {new Date(g.finished_at).toLocaleDateString()} · {g.move_history.length} moves
                </div>
              </div>
              <div className="text-xs text-silver-400 uppercase">{g.result_reason.replace('_', ' ')}</div>
            </button>
          );
        })}
      </div>

      {selected && <ReviewModal game={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function ReviewModal({ game, onClose }: { game: GameRecord; onClose: () => void }) {
  const [index, setIndex] = useState(game.move_history.length - 1);
  const fen = index >= 0 ? game.move_history[index].fen : 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const lastMove = index >= 0 ? { from: game.move_history[index].from, to: game.move_history[index].to } : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-5">
      <div className="bg-ink-800 border border-ink-600 rounded-lg p-6 max-w-lg w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-display text-lg">Game Review</h3>
          <button onClick={onClose} className="text-silver-400 hover:text-silver-200">✕</button>
        </div>
        <div className="flex justify-center mb-4">
          <Board fen={fen} orientation="w" interactive={false} lastMove={lastMove} onMove={() => {}} onPromotionNeeded={() => {}} />
        </div>
        <div className="flex justify-center gap-3">
          <button
            onClick={() => setIndex((i) => Math.max(-1, i - 1))}
            disabled={index <= -1}
            className="border border-ink-600 px-3 py-1.5 rounded-md text-sm disabled:opacity-30"
          >
            ← Prev
          </button>
          <span className="text-sm text-silver-400 self-center">
            {index + 1} / {game.move_history.length}
          </span>
          <button
            onClick={() => setIndex((i) => Math.min(game.move_history.length - 1, i + 1))}
            disabled={index >= game.move_history.length - 1}
            className="border border-ink-600 px-3 py-1.5 rounded-md text-sm disabled:opacity-30"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
