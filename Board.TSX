import { useMemo, useRef, useState } from 'react';
import { Chess, type Square } from 'chess.js';
import { Piece } from './Piece';

interface Props {
  fen: string;
  orientation: 'w' | 'b';
  interactive: boolean;
  lastMove: { from: string; to: string } | null;
  onMove: (from: string, to: string, promotion?: string) => void;
  onPromotionNeeded: (from: string, to: string) => void;
  onIllegalAttempt?: () => void;
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

export function Board({ fen, orientation, interactive, lastMove, onMove, onPromotionNeeded, onIllegalAttempt }: Props) {
  const game = useMemo(() => new Chess(fen), [fen]);
  const [selected, setSelected] = useState<Square | null>(null);
  const [drag, setDrag] = useState<{ from: Square; x: number; y: number } | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  const board = game.board();
  const squares: { alg: Square; file: number; rank: number; piece: ReturnType<Chess['get']> | null }[] = [];
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const rank = 8 - r;
      const alg = (FILES[f] + rank) as Square;
      squares.push({ alg, file: f, rank, piece: board[r][f] });
    }
  }
  if (orientation === 'b') squares.reverse();

  const legalTargets = selected
    ? game.moves({ square: selected, verbose: true }).map((m) => ({ to: m.to, captured: !!m.captured }))
    : [];

  const kingSquare = (() => {
    if (!game.isCheck()) return null;
    const b = game.board();
    for (let r = 0; r < 8; r++)
      for (let f = 0; f < 8; f++) {
        const p = b[r][f];
        if (p && p.type === 'k' && p.color === game.turn()) return (FILES[f] + (8 - r)) as Square;
      }
    return null;
  })();

  function attemptMove(from: Square, to: Square) {
    const piece = game.get(from);
    const isPromotion = piece?.type === 'p' && (to[1] === '8' || to[1] === '1');
    const legal = game.moves({ square: from, verbose: true }).some((m) => m.to === to);
    if (!legal) {
      onIllegalAttempt?.();
      return;
    }
    if (isPromotion) {
      onPromotionNeeded(from, to);
      return;
    }
    onMove(from, to);
  }

  function handleSquareClick(alg: Square) {
    if (!interactive) return;
    const piece = game.get(alg);
    if (selected) {
      if (legalTargets.some((t) => t.to === alg)) {
        attemptMove(selected, alg);
        setSelected(null);
        return;
      }
      if (piece && piece.color === game.turn()) {
        setSelected(alg);
      } else {
        setSelected(null);
      }
    } else if (piece && piece.color === game.turn()) {
      setSelected(alg);
    }
  }

  function squareFromPoint(x: number, y: number): Square | null {
    const el = boardRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const size = rect.width / 8;
    let col = Math.floor((x - rect.left) / size);
    let row = Math.floor((y - rect.top) / size);
    if (col < 0 || col > 7 || row < 0 || row > 7) return null;
    if (orientation === 'w') {
      return (FILES[col] + (8 - row)) as Square;
    }
    return (FILES[7 - col] + (row + 1)) as Square;
  }

  function handlePointerDown(e: React.PointerEvent, alg: Square) {
    if (!interactive) return;
    const piece = game.get(alg);
    if (!piece || piece.color !== game.turn()) return;
    setSelected(alg);
    setDrag({ from: alg, x: e.clientX, y: e.clientY });
    (e.target as Element).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!drag) return;
    setDrag({ ...drag, x: e.clientX, y: e.clientY });
  }

  function handlePointerUp(e: React.PointerEvent) {
    if (!drag) return;
    const target = squareFromPoint(e.clientX, e.clientY);
    if (target && target !== drag.from) {
      attemptMove(drag.from, target);
    }
    setDrag(null);
    setSelected(null);
  }

  return (
    <div className="relative select-none touch-none" ref={boardRef}>
      <div className="grid grid-cols-8 grid-rows-8 border-4 border-ink-700 shadow-card rounded-sm overflow-hidden w-[min(92vw,560px)] h-[min(92vw,560px)]">
        {squares.map((sq) => {
          const isLight = (sq.file + sq.rank) % 2 === 0;
          const isLast = lastMove && (lastMove.from === sq.alg || lastMove.to === sq.alg);
          const isSelected = selected === sq.alg;
          const isCheck = kingSquare === sq.alg;
          const target = legalTargets.find((t) => t.to === sq.alg);
          const isDraggingThis = drag?.from === sq.alg;

          return (
            <div
              key={sq.alg}
              onClick={() => handleSquareClick(sq.alg)}
              onPointerDown={(e) => handlePointerDown(e, sq.alg)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className={`relative flex items-center justify-center cursor-pointer ${
                isLight ? 'bg-board-light' : 'bg-board-dark'
              }`}
              style={{
                boxShadow: isCheck
                  ? 'inset 0 0 0 999px rgba(180,40,40,0.5)'
                  : isSelected
                  ? 'inset 0 0 0 999px rgba(200,200,200,0.35)'
                  : isLast
                  ? 'inset 0 0 0 999px rgba(200,200,200,0.2)'
                  : undefined,
              }}
            >
              {sq.piece && !isDraggingThis && (
                <Piece type={sq.piece.type} color={sq.piece.color} className="w-[78%] h-[78%] relative z-10" />
              )}
              {target &&
                (target.captured ? (
                  <div className="absolute inset-[6%] rounded-full border-4 border-black/25" />
                ) : (
                  <div className="absolute w-[26%] h-[26%] rounded-full bg-black/25" />
                ))}
              {sq.rank === (orientation === 'w' ? 1 : 8) && (
                <span className={`absolute bottom-0.5 right-1 text-[9px] font-bold ${isLight ? 'text-board-dark' : 'text-board-light'}`}>
                  {sq.alg[0]}
                </span>
              )}
              {sq.file === (orientation === 'w' ? 0 : 7) && (
                <span className={`absolute top-0.5 left-1 text-[9px] font-bold ${isLight ? 'text-board-dark' : 'text-board-light'}`}>
                  {sq.rank}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {drag &&
        (() => {
          const piece = game.get(drag.from);
          if (!piece) return null;
          return (
            <div
              className="fixed pointer-events-none z-50 w-16 h-16"
              style={{ left: drag.x - 32, top: drag.y - 32 }}
            >
              <Piece type={piece.type} color={piece.color} className="w-full h-full" />
            </div>
          );
        })()}
    </div>
  );
}
