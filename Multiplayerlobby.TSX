import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { createRoom, joinRoom } from '../hooks/useRoom';

export function MultiplayerLobby() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<'create' | 'join' | null>(null);

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-5 py-20 text-center">
        <h1 className="font-display text-2xl mb-3">Online Multiplayer Requires an Account</h1>
        <p className="text-silver-400 text-sm mb-6">
          Rooms are tied to a player profile so results, reconnection and history work correctly.
        </p>
        <div className="flex gap-3 justify-center">
          <a href="/signup" className="bg-silver-200 text-ink-950 font-semibold px-5 py-2.5 rounded-md">Sign Up</a>
          <a href="/login" className="border border-ink-600 px-5 py-2.5 rounded-md">Log In</a>
        </div>
      </div>
    );
  }

  async function handleCreate() {
    setLoading('create');
    setError(null);
    try {
      const { room } = await createRoom();
      navigate(`/room/${room.id}`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(null);
    }
  }

  async function handleJoin() {
    setLoading('join');
    setError(null);
    try {
      const { room } = await joinRoom(roomCode);
      navigate(`/room/${room.id}`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="max-w-md mx-auto px-5 py-16">
      <h1 className="font-display text-3xl mb-1 text-center">Online Multiplayer</h1>
      <p className="text-silver-400 text-sm mb-10 text-center">No clock. Take the time you need.</p>

      <div className="bg-ink-800 border border-ink-700 rounded-lg p-6 mb-5">
        <h3 className="font-display text-lg mb-2">Create Room</h3>
        <p className="text-sm text-silver-400 mb-4">You'll get a room code to share. You play White by default.</p>
        <button
          onClick={handleCreate}
          disabled={loading !== null}
          className="w-full bg-silver-200 text-ink-950 font-semibold py-2.5 rounded-md disabled:opacity-50"
        >
          {loading === 'create' ? 'Creating…' : 'Create Room'}
        </button>
      </div>

      <div className="bg-ink-800 border border-ink-700 rounded-lg p-6">
        <h3 className="font-display text-lg mb-2">Join Room</h3>
        <input
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
          placeholder="CHESS-7K92X"
          className="w-full bg-ink-900 border border-ink-600 rounded-md px-3 py-2.5 mb-3 focus:outline-none focus:border-silver-400 tracking-wider"
        />
        <button
          onClick={handleJoin}
          disabled={loading !== null || !roomCode}
          className="w-full border border-ink-600 py-2.5 rounded-md hover:border-silver-400 disabled:opacity-50"
        >
          {loading === 'join' ? 'Joining…' : 'Join Room'}
        </button>
      </div>

      {error && <p className="text-sm text-red-400 mt-4 text-center">{error}</p>}
    </div>
  );
}
