import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function Home() {
  const { user, profile } = useAuth();

  return (
    <div className="max-w-5xl mx-auto px-5 py-16 text-center">
      <div className="text-xs tracking-[0.2em] text-silver-400 mb-4">SIXTY-FOUR SQUARES, ONE ROOM</div>
      <h1 className="font-display text-5xl md:text-6xl mb-4">
        Play Chess <em className="italic text-silver-400">Your Way</em>
      </h1>
      <p className="text-silver-400 max-w-xl mx-auto mb-10">
        Sharpen your calculation against the engine, or open a room and pass the link to a friend. No clocks. No noise.
      </p>

      <div className="grid sm:grid-cols-2 gap-4 max-w-xl mx-auto">
        <Link
          to="/play-ai"
          className="bg-ink-800 border border-ink-700 hover:border-silver-400 rounded-lg p-6 text-left transition-colors"
        >
          <div className="text-2xl mb-2">♟</div>
          <h3 className="font-display text-lg">Play vs AI</h3>
          <p className="text-sm text-silver-400 mt-1">Five difficulty levels. Practice without pressure.</p>
        </Link>
        <Link
          to="/multiplayer"
          className="bg-ink-800 border border-ink-700 hover:border-silver-400 rounded-lg p-6 text-left transition-colors"
        >
          <div className="text-2xl mb-2">⚔</div>
          <h3 className="font-display text-lg">Online Multiplayer</h3>
          <p className="text-sm text-silver-400 mt-1">Create a room or join one with a code. Real-time, no refresh.</p>
        </Link>
      </div>

      {user && profile && (
        <div className="mt-14 inline-flex gap-8 bg-ink-800 border border-ink-700 rounded-lg px-8 py-5">
          <Stat label="Played" value={profile.games_played} />
          <Stat label="Wins" value={profile.wins} />
          <Stat label="Losses" value={profile.losses} />
          <Stat label="Draws" value={profile.draws} />
          <Stat label="Rating" value={profile.rating} />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="font-display text-2xl">{value}</div>
      <div className="text-xs text-silver-400 uppercase tracking-wide">{label}</div>
    </div>
  );
}
