import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Profile } from '../lib/types';

export function Leaderboard() {
  const [rows, setRows] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('profiles')
      .select('*')
      .order('rating', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setRows((data as Profile[]) ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-5 py-14">
      <h1 className="font-display text-3xl mb-2">Leaderboard</h1>
      <p className="text-silver-400 text-sm mb-8">
        Ranked by rating (simple placeholder Elo-style adjustment — see README for how to swap in real Elo).
      </p>
      {loading ? (
        <p className="text-silver-400">Loading…</p>
      ) : (
        <div className="bg-ink-800 border border-ink-700 rounded-lg overflow-hidden">
          <div className="grid grid-cols-[40px_1fr_60px_60px_60px_60px_70px] gap-2 px-4 py-2.5 text-xs uppercase tracking-wide text-silver-400 border-b border-ink-700">
            <span>#</span><span>Player</span><span>Games</span><span>Wins</span><span>Draws</span><span>Losses</span><span>Rating</span>
          </div>
          {rows.map((p, i) => (
            <div key={p.id} className="grid grid-cols-[40px_1fr_60px_60px_60px_60px_70px] gap-2 px-4 py-2.5 text-sm border-b border-ink-700 last:border-0">
              <span className="text-silver-400">{i + 1}</span>
              <span className="font-medium">{p.username}</span>
              <span>{p.games_played}</span>
              <span>{p.wins}</span>
              <span>{p.draws}</span>
              <span>{p.losses}</span>
              <span className="font-semibold">{p.rating}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
