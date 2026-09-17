import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function Navbar() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="border-b border-ink-700 bg-ink-950/90 backdrop-blur sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
        <Link to="/" className="font-display text-xl tracking-wide">
          End<span className="italic text-silver-400">game</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm text-silver-400">
          <Link to="/play-ai" className="hover:text-silver-200">Play vs AI</Link>
          <Link to="/multiplayer" className="hover:text-silver-200">Multiplayer</Link>
          {user && <Link to="/history" className="hover:text-silver-200">Game History</Link>}
          <Link to="/leaderboard" className="hover:text-silver-200">Leaderboard</Link>
          {user && <Link to="/profile" className="hover:text-silver-200">Profile</Link>}
        </nav>
        <div className="flex items-center gap-3 text-sm">
          {user ? (
            <>
              <span className="text-silver-400 hidden sm:inline">{profile?.username ?? user.email}</span>
              <button
                onClick={async () => {
                  await signOut();
                  navigate('/');
                }}
                className="border border-ink-600 px-3 py-1.5 rounded-md hover:border-silver-400"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="border border-ink-600 px-3 py-1.5 rounded-md hover:border-silver-400">Login</Link>
              <Link to="/signup" className="bg-silver-200 text-ink-950 font-semibold px-3 py-1.5 rounded-md hover:brightness-95">Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
