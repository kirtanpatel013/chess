import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useRoom } from '../hooks/useRoom';
import { Board } from '../components/Board';
import { PlayerCard } from '../components/PlayerCard';
import { PromotionModal } from '../components/PromotionModal';
import { GameOverModal } from '../components/GameOverModal';
import { Piece } from '../components/Piece';
import { supabase } from '../lib/supabaseClient';
import { useEffect } from 'react';
import type { Profile } from '../lib/types';

export function GameRoom() {
  const { roomId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { room, loading, error, move, resign, offerDraw, respondDraw } = useRoom(roomId ?? null);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: string; to: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [confirmResign, setConfirmResign] = useState(false);
  const [names, setNames] = useState<{ white?: Profile; black?: Profile }>({});

  useEffect(() => {
    if (!room) return;
    (async () => {
      const ids = [room.player_white_id, room.player_black_id].filter(Boolean) as string[];
      if (ids.length === 0) return;
      const { data } = await supabase.from('profiles').select('*').in('id', ids);
      const white = data?.find((p) => p.id === room.player_white_id);
      const black = data?.find((p) => p.id === room.player_black_id);
      setNames({ white, black });
    })();
  }, [room?.player_white_id, room?.player_black_id]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  if (loading) return <div className="text-center py-24 text-silver-400">Loading game…</div>;
  if (error || !room) return <div className="text-center py-24 text-red-400">{error ?? 'Room not found'}</div>;
  if (!user) return <div className="text-center py-24 text-silver-400">Authentication Required</div>;

  const myColor = room.player_white_id === user.id ? 'w' : room.player_black_id === user.id ? 'b' : null;

  if (!myColor) {
    return <div className="text-center py-24 text-red-400">You are not a player in this room.</div>;
  }

  if (room.status === 'waiting') {
    return (
      <div className="max-w-md mx-auto px-5 py-20 text-center">
        <h1 className="font-display text-2xl mb-2">Waiting for opponent…</h1>
        <p className="text-silver-400 text-sm mb-6">Share this code with the person you want to play.</p>
        <div className="bg-ink-800 border border-ink-700 rounded-lg py-6 mb-4">
          <div className="text-xs uppercase tracking-widest text-silver-400 mb-1">Your Room ID</div>
          <div className="font-display text-3xl tracking-widest">{room.room_code}</div>
        </div>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => { navigator.clipboard.writeText(room.room_code); showToast('Room ID copied'); }}
            className="border border-ink-600 px-4 py-2 rounded-md hover:border-silver-400"
          >
            Copy Room ID
          </button>
          {typeof navigator.share === 'function' && (
            <button
              onClick={() => navigator.share({ title: 'Join my chess game', text: `Join me with room code ${room.room_code}` })}
              className="border border-ink-600 px-4 py-2 rounded-md hover:border-silver-400"
            >
              Share Room
            </button>
          )}
        </div>
        {toast && <div className="mt-6 text-sm text-silver-400">{toast}</div>}
      </div>
    );
  }

  const lastMove = room.move_history.length > 0 ? room.move_history[room.move_history.length - 1] : null;
  const isMyTurn = room.current_turn === myColor && room.status === 'active';
  const opponentColor = myColor === 'w' ? 'b' : 'w';
  const myName = myColor === 'w' ? names.white?.username : names.black?.username;
  const oppName = opponentColor === 'w' ? names.white?.username : names.black?.username;

  const capturedByMe = room.move_history.filter((m) => m.color === myColor && m.captured).map((m) => m.captured as string);
  const capturedByOpp = room.move_history.filter((m) => m.color === opponentColor && m.captured).map((m) => m.captured as string);

  async function handleMove(from: string, to: string, promotion?: string) {
    try {
      await move(from, to, promotion);
    } catch (e: any) {
      showToast(e.message ?? 'Illegal Move');
    }
  }

  function resultTitle() {
    if (!room?.game_result) return '';
    const reason = room.result_reason ?? '';
    const reasonLabel: Record<string, string> = {
      checkmate: 'CHECKMATE',
      stalemate: 'STALEMATE - DRAW',
      threefold_repetition: 'DRAW - THREEFOLD REPETITION',
      insufficient_material: 'DRAW - INSUFFICIENT MATERIAL',
      resignation: 'BY RESIGNATION',
      agreement: 'BY AGREEMENT',
    };
    if (room.game_result === 'draw') return reasonLabel[reason] ?? 'DRAW';
    const winner = room.game_result === 'white_wins' ? 'WHITE' : 'BLACK';
    return `${winner} WINS — ${reasonLabel[reason] ?? reason.toUpperCase()}`;
  }

  return (
    <div className="max-w-5xl mx-auto px-5 py-8 flex flex-wrap gap-8 justify-center">
      <div className="flex flex-col items-center gap-3">
        <PlayerCard
          name={oppName ?? 'Opponent'}
          colorLabel={opponentColor === 'w' ? 'White' : 'Black'}
          active={room.current_turn === opponentColor && room.status === 'active'}
          capturedSvgs={capturedByMe.map((t, i) => (
            <Piece key={i} type={t as any} color={opponentColor} className="w-4 h-4" />
          ))}
        />
        <Board
          fen={room.fen}
          orientation={myColor}
          interactive={isMyTurn}
          lastMove={lastMove ? { from: lastMove.from, to: lastMove.to } : null}
          onMove={handleMove}
          onPromotionNeeded={(from, to) => setPendingPromotion({ from, to })}
          onIllegalAttempt={() => showToast('Illegal Move')}
        />
        <PlayerCard
          name={myName ?? 'You'}
          colorLabel={myColor === 'w' ? 'White' : 'Black'}
          active={isMyTurn}
          capturedSvgs={capturedByOpp.map((t, i) => (
            <Piece key={i} type={t as any} color={myColor} className="w-4 h-4" />
          ))}
        />
      </div>

      <div className="w-full max-w-xs flex flex-col gap-4">
        <div className="bg-ink-800 border border-ink-700 rounded-md p-4 text-sm text-silver-400 min-h-[3rem]">
          {room.status === 'finished' ? resultTitle() : isMyTurn ? "YOUR TURN" : "OPPONENT'S TURN"}
        </div>

        {room.draw_offered_by && room.draw_offered_by !== user.id && room.status === 'active' && (
          <div className="bg-ink-800 border border-silver-400 rounded-md p-4 text-sm">
            <p className="mb-3">Opponent offered a draw</p>
            <div className="flex gap-2">
              <button onClick={() => respondDraw(true)} className="flex-1 bg-silver-200 text-ink-950 rounded-md py-1.5 text-sm font-semibold">Accept Draw</button>
              <button onClick={() => respondDraw(false)} className="flex-1 border border-ink-600 rounded-md py-1.5 text-sm">Decline</button>
            </div>
          </div>
        )}
        {room.draw_offered_by === user.id && room.status === 'active' && (
          <div className="bg-ink-800 border border-ink-700 rounded-md p-4 text-sm text-silver-400">Draw offer sent — waiting for response…</div>
        )}

        <div className="bg-ink-800 border border-ink-700 rounded-md p-4">
          <h4 className="text-xs uppercase tracking-wide text-silver-400 mb-3">Move History</h4>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {Array.from({ length: Math.ceil(room.move_history.length / 2) }).map((_, i) => (
              <div key={i} className="grid grid-cols-[24px_1fr_1fr] gap-1 text-sm">
                <span className="text-silver-400">{i + 1}.</span>
                <span>{room.move_history[i * 2]?.san ?? ''}</span>
                <span>{room.move_history[i * 2 + 1]?.san ?? ''}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => navigate('/multiplayer')} className="bg-ink-800 border border-ink-700 rounded-md py-2 text-sm hover:border-silver-400">
            New Game
          </button>
          <button
            onClick={() => offerDraw().catch((e) => showToast(e.message))}
            disabled={room.status !== 'active' || !!room.draw_offered_by}
            className="bg-ink-800 border border-ink-700 rounded-md py-2 text-sm hover:border-silver-400 disabled:opacity-40"
          >
            Offer Draw
          </button>
          <button
            onClick={() => setConfirmResign(true)}
            disabled={room.status !== 'active'}
            className="col-span-2 border border-red-900 text-red-400 rounded-md py-2 text-sm hover:bg-red-950/40 disabled:opacity-40"
          >
            Resign
          </button>
        </div>
      </div>

      {pendingPromotion && (
        <PromotionModal
          color={myColor}
          onChoose={(piece) => {
            handleMove(pendingPromotion.from, pendingPromotion.to, piece);
            setPendingPromotion(null);
          }}
        />
      )}

      {confirmResign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-5">
          <div className="bg-ink-800 border border-ink-600 rounded-lg p-6 text-center max-w-xs w-full">
            <p className="mb-5">Are you sure you want to resign?</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setConfirmResign(false)} className="border border-ink-600 px-4 py-2 rounded-md">Cancel</button>
              <button
                onClick={async () => { setConfirmResign(false); try { await resign(); } catch (e: any) { showToast(e.message); } }}
                className="bg-red-700 px-4 py-2 rounded-md"
              >
                Resign
              </button>
            </div>
          </div>
        </div>
      )}

      {room.status === 'finished' && (
        <GameOverModal title={resultTitle()} onPlayAgain={() => navigate('/multiplayer')} onHome={() => navigate('/')} />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-ink-800 border border-ink-600 px-5 py-2.5 rounded-full text-sm z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
