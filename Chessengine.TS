import { Chess, type Move } from 'chess.js';

export type Difficulty = 'beginner' | 'easy' | 'medium' | 'hard' | 'expert';

export const DIFFICULTIES: { id: Difficulty; label: string; depth: number; randomness: number }[] = [
  { id: 'beginner', label: 'Beginner', depth: 1, randomness: 0.55 },
  { id: 'easy', label: 'Easy', depth: 1, randomness: 0.25 },
  { id: 'medium', label: 'Medium', depth: 2, randomness: 0.1 },
  { id: 'hard', label: 'Hard', depth: 3, randomness: 0.03 },
  { id: 'expert', label: 'Expert', depth: 3, randomness: 0 },
];

// Standard piece-square tables (white's perspective, a8=index 0).
const PST_PAWN = [0,0,0,0,0,0,0,0,50,50,50,50,50,50,50,50,10,10,20,30,30,20,10,10,5,5,10,25,25,10,5,5,0,0,0,20,20,0,0,0,5,-5,-10,0,0,-10,-5,5,5,10,10,-20,-20,10,10,5,0,0,0,0,0,0,0,0];
const PST_KNIGHT = [-50,-40,-30,-30,-30,-30,-40,-50,-40,-20,0,0,0,0,-20,-40,-30,0,10,15,15,10,0,-30,-30,5,15,20,20,15,5,-30,-30,0,15,20,20,15,0,-30,-30,5,10,15,15,10,5,-30,-40,-20,0,5,5,0,-20,-40,-50,-40,-30,-30,-30,-30,-40,-50];
const PST_BISHOP = [-20,-10,-10,-10,-10,-10,-10,-20,-10,0,0,0,0,0,0,-10,-10,0,5,10,10,5,0,-10,-10,5,5,10,10,5,5,-10,-10,0,10,10,10,10,0,-10,-10,10,10,10,10,10,10,-10,-10,5,0,0,0,0,5,-10,-20,-10,-10,-10,-10,-10,-10,-20];
const PST_ROOK = [0,0,0,0,0,0,0,0,5,10,10,10,10,10,10,5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,0,0,0,5,5,0,0,0];
const PST_QUEEN = [-20,-10,-10,-5,-5,-10,-10,-20,-10,0,0,0,0,0,0,-10,-10,0,5,5,5,5,0,-10,-5,0,5,5,5,5,0,-5,0,0,5,5,5,5,0,-5,-10,5,5,5,5,5,0,-10,-10,0,5,0,0,0,0,-10,-20,-10,-10,-5,-5,-10,-10,-20];
const PST_KING = [-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-20,-30,-30,-40,-40,-30,-30,-20,-10,-20,-20,-20,-20,-20,-20,-10,20,20,0,0,0,0,20,20,20,30,10,0,0,10,30,20];

const VAL: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
const PST: Record<string, number[]> = { p: PST_PAWN, n: PST_KNIGHT, b: PST_BISHOP, r: PST_ROOK, q: PST_QUEEN, k: PST_KING };

function evalBoard(game: Chess): number {
  const board = game.board();
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const p = board[r][f];
      if (!p) continue;
      const idx = p.color === 'w' ? r * 8 + f : (7 - r) * 8 + f;
      const val = VAL[p.type] + PST[p.type][idx];
      score += p.color === 'w' ? val : -val;
    }
  }
  if (game.isCheckmate()) score += game.turn() === 'w' ? -100000 : 100000;
  return score;
}

function minimax(game: Chess, depth: number, alpha: number, beta: number, maximizing: boolean): number {
  if (depth === 0 || game.isGameOver()) return evalBoard(game);
  const moves = game.moves();
  if (maximizing) {
    let best = -Infinity;
    for (const m of moves) {
      game.move(m);
      best = Math.max(best, minimax(game, depth - 1, alpha, beta, false));
      game.undo();
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const m of moves) {
      game.move(m);
      best = Math.min(best, minimax(game, depth - 1, alpha, beta, true));
      game.undo();
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }
}

/**
 * Picks a move for the side to move. Not a substitute for a real engine
 * like Stockfish at higher levels, but it genuinely searches and its
 * strength scales with `difficulty` — it does not choose randomly except
 * where the difficulty's `randomness` deliberately injects human-like error.
 */
export function chooseAIMove(game: Chess, difficulty: Difficulty): Move | null {
  const conf = DIFFICULTIES.find((d) => d.id === difficulty)!;
  const moves = game.moves({ verbose: true });
  if (moves.length === 0) return null;

  if (Math.random() < conf.randomness) {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  const maximizing = game.turn() === 'w';
  let bestScore = maximizing ? -Infinity : Infinity;
  let bestMoves: Move[] = [];

  for (const m of moves) {
    game.move(m.san);
    const sc = minimax(game, conf.depth - 1, -Infinity, Infinity, !maximizing);
    game.undo();
    if (maximizing ? sc > bestScore : sc < bestScore) {
      bestScore = sc;
      bestMoves = [m];
    } else if (sc === bestScore) {
      bestMoves.push(m);
    }
  }
  return bestMoves[Math.floor(Math.random() * bestMoves.length)] ?? moves[0];
}
