import { useEffect, useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import { Board } from '../components/Board';
import { PlayerCard } from '../components/PlayerCard';
import { PromotionModal } from '../components/PromotionModal';
import { GameOverModal } from '../components/GameOverModal';
import { Piece } from '../components/Piece';
import { DIFFICULTIES, chooseAIMove, type Difficulty } from '../lib/chessEngine';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabaseClient';

type ColorChoice = 'w' | 'b' | 'random';

export function PlayAI() {
  const { user } = useAuth();
  const [started, setStarted] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [colorChoice, setColorChoice] = useState<ColorChoice>('w');
  const [humanColor, setHumanColor] = useState<'w' | 'b'>('w');
  const [game, setGame] = useState(() => new Chess());
  const [fen, setFen] = useState(game.fen());
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: string; to: string } | null>(null);
  const [aiThinking, setAiThinking] = useState(false);
  const [result, setResult] = useState<{ title: string; subtitle: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function start() {
    const c = colorChoice === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : colorChoice;
    setHumanColor(c);
    const g = new Chess();
    setGame(g);
    setFen(g.fen());
    setLastMove(null);
    setResult(null);
    setStarted(true);
  }

  useEffect(() => {
    if (!started || result) return;
    if (game.turn() !== humanColor && !game.isGameOver()) {
      setAiThinking(true);
      const t = setTimeout(() => {
        const mv = chooseAIMove(game, difficulty);
        if (mv) applyMove(mv.from, mv.to, mv.promotion);
        setAiThinking(false);
      }, 350);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fen, started]);

  function checkGameOver(g: Chess) {
    if (!g.isGameOver()) return false;
    let title = 'Draw';
    let subtitle = '';
    if (g.isCheckmate()) {
      const winner = g.turn() === 'w' ? 'Black' : 'White';
      title = `${winner.toUpperCase()} WINS — CHECKMATE`;
    } else if (g.isStalemate()) {
      title = 'STALEMATE - DRAW';
    } else if (g.isThreefoldRepetition()) {
      title = 'DRAW - THREEFOLD REPETITION';
    } else if (g.isInsufficientMaterial()) {
      title = 'DRAW - INSUFFICIENT MATERIAL';
    }
    setResult({ title, subtitle });
    saveGameRecord(g, title);
    return true;
  }

  async function saveGameRecord(g: Chess, resultLabel: string) {
    if (!user) return; // guests can still play, just no history saved
    await supabase.from('games').insert({
      white_player_id: humanColor === 'w' ? user.id : null,
      black_player_id: humanColor === 'b' ? user.id : null,
      mode: 'ai',
      ai_difficulty: difficulty,
      result: resultLabel,
      result_reason: resultLabel.toLowerCase().includes('checkmate') ? 'checkmate' : 'draw',
      final_fen: g.fen(),
      move_history: g.history({ verbose: true }).map((m) => ({ san: m.san, from: m.from, to: m.to, promotion: m.promotion, fen: m.after })),
    });
  }

  function applyMove(from: string, to: string, promotion?: string) {
    const move = game.move({ from, to, promotion: promotion || 'q' });
    if (!move) {
      setToast('Illegal Move');
      setTimeout(() => setToast(null), 1800);
      return;
    }
    setFen(game.fen());
    setLastMove({ from, to });
    checkGameOver(game);
  }

  function handleMove(from: string, to: string) {
    if (aiThinking || result) return;
    applyMove(from, to);
  }

  function handlePromotionNeeded(from: string, to: string) {
    setPendingPromotion({ from, to });
  }

  function choosePromotion(piece: string) {
    if (pendingPromotion) applyMove(pendingPromotion.from, pendingPromotion.to, piece);
    setPendingPromotion(null);
  }

  const captured = useMemo(() => {
    const hist = game.history({ verbose: true });
    const byWhite: string[] = [];
    const byBlack: string[] = [];
    hist.forEach((m) => {
      if (m.captured) {
        if (m.color === 'w') byWhite.push(m.captured);
        else byBlack.push(m.captured);
      }
    });
    return { byWhite, byBlack };
  }, [fen]);

  if (!started) {
    return (
      <div className="max-w-lg mx-auto px-5 py-16">
        <h1 className="font-display text-3xl mb-1">Play vs AI</h1>
        <p className="text-silver-400 text-sm mb-8">Choose a difficulty and a side. No clock — take your time.</p>

        <Field title="Difficulty">
          <div className="flex flex-wrap gap-2">
            {DIFFICULTIES.map((d) => (
              <Chip key={d.id} active={difficulty === d.id} onClick={() => setDifficulty(d.id)}>
                {d.label}
              </Chip>
            ))}
          </div>
        </Field>

        <Field title="Play As">
          <div className="flex gap-2">
            <Chip active={colorChoice === 'w'} onClick={() => setColorChoice('w')}>White</Chip>
            <Chip active={colorChoice === 'b'} onClick={() => setColorChoice('b')}>Black</Chip>
            <Chip active={colorChoice === 'random'} onClick={() => setColorChoice('random')}>Random</Chip>
          </div>
        </Field>

        {!user && (
          <p className="text-xs text-silver-400 mb-6">
            Playing as a guest — your result won't be saved to a profile. <a href="/signup" className="underline">Sign up</a> to track history.
          </p>
        )}

        <button onClick={start} className="bg-silver-200 text-ink-950 font-semibold px-6 py-2.5 rounded-md hover:brightness-95">
          Start Game
        </button>
      </div>
    );
  }

  const flip = humanColor === 'b';

  return (
    <div className="max-w-5xl mx-auto px-5 py-8 flex flex-wrap gap-8 justify-center">
      <div className="flex flex-col items-center gap-3">
        <PlayerCard
          name={`Engine — ${DIFFICULTIES.find((d) => d.id === difficulty)!.label}`}
          colorLabel={flip ? 'White' : 'Black'}
          active={game.turn() === (flip ? 'w' : 'b') && !result}
          capturedSvgs={(flip ? captured.byBlack : captured.byWhite).map((t, i) => (
            <Piece key={i} type={t as any} color={flip ? 'w' : 'b'} className="w-4 h-4" />
          ))}
        />
        <Board
          fen={fen}
          orientation={flip ? 'b' : 'w'}
          interactive={!aiThinking && !result && game.turn() === humanColor}
          lastMove={lastMove}
          onMove={handleMove}
          onPromotionNeeded={handlePromotionNeeded}
          onIllegalAttempt={() => {
            setToast('Illegal Move');
            setTimeout(() => setToast(null), 1500);
          }}
        />
        <PlayerCard
          name="You"
          colorLabel={flip ? 'Black' : 'White'}
          active={game.turn() === humanColor && !result}
          capturedSvgs={(flip ? captured.byWhite : captured.byBlack).map((t, i) => (
            <Piece key={i} type={t as any} color={flip ? 'b' : 'w'} className="w-4 h-4" />
          ))}
        />
      </div>

      <div className="w-full max-w-xs flex flex-col gap-4">
        <div className="bg-ink-800 border border-ink-700 rounded-md p-4 text-sm text-silver-400 min-h-[3rem]">
          {aiThinking ? 'The engine is thinking…' : result ? result.title : game.isCheck() ? 'Check.' : `${game.turn() === 'w' ? 'White' : 'Black'} to move.`}
        </div>

        <div className="bg-ink-800 border border-ink-700 rounded-md p-4">
          <h4 className="text-xs uppercase tracking-wide text-silver-400 mb-3">Move List</h4>
          <MoveList game={game} />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => { setStarted(false); }} className="bg-ink-800 border border-ink-700 rounded-md py-2 text-sm hover:border-silver-400">
            New Game
          </button>
          <button
            onClick={() => {
              const mv = chooseAIMove(game, difficulty);
              if (mv) setToast(`Consider: ${mv.san}`);
              setTimeout(() => setToast(null), 2200);
            }}
            className="bg-ink-800 border border-ink-700 rounded-md py-2 text-sm hover:border-silver-400"
          >
            Hint
          </button>
          <button
            onClick={() => {
              const h = game.history();
              if (h.length === 0) return;
              game.undo();
              if (game.history().length > 0 && game.turn() !== humanColor) game.undo();
              setFen(game.fen());
              setLastMove(null);
            }}
            className="bg-ink-800 border border-ink-700 rounded-md py-2 text-sm hover:border-silver-400"
          >
            Takeback
          </button>
          <button
            onClick={() => {
              if (result) return;
              const winner = humanColor === 'w' ? 'Black' : 'White';
              setResult({ title: `${winner.toUpperCase()} WINS — WHITE RESIGNED`.replace('WHITE RESIGNED', `${humanColor === 'w' ? 'WHITE' : 'BLACK'} RESIGNED`), subtitle: '' });
            }}
            className="border border-red-900 text-red-400 rounded-md py-2 text-sm hover:bg-red-950/40"
          >
            Resign
          </button>
        </div>
      </div>

      {pendingPromotion && <PromotionModal color={humanColor} onChoose={choosePromotion} />}
      {result && (
        <GameOverModal
          title={result.title}
          onPlayAgain={() => { setStarted(false); }}
          onHome={() => { window.location.href = '/'; }}
        />
      )}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-ink-800 border border-ink-600 px-5 py-2.5 rounded-full text-sm z-50">
          {toast}
        </div>
      )}
    </div>
  );
}

function Field({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <label className="block text-xs uppercase tracking-wide text-silver-400 mb-2">{title}</label>
      {children}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-full text-sm border transition-colors ${
        active ? 'bg-silver-200 text-ink-950 border-silver-200 font-semibold' : 'border-ink-600 text-silver-400 hover:border-silver-400'
      }`}
    >
      {children}
    </button>
  );
}

function MoveList({ game }: { game: Chess }) {
  const hist = game.history();
  const rows: JSX.Element[] = [];
  for (let i = 0; i < hist.length; i += 2) {
    rows.push(
      <div key={i} className="grid grid-cols-[24px_1fr_1fr] gap-1 text-sm">
        <span className="text-silver-400">{i / 2 + 1}.</span>
        <span>{hist[i]}</span>
        <span>{hist[i + 1] ?? ''}</span>
      </div>
    );
  }
  return <div className="max-h-48 overflow-y-auto space-y-1">{rows}</div>;
}
