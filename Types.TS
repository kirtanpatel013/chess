export interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  games_played: number;
  wins: number;
  losses: number;
  draws: number;
  rating: number;
  created_at: string;
}

export type RoomStatus = 'waiting' | 'active' | 'finished';
export type GameResult = 'white_wins' | 'black_wins' | 'draw' | null;

export interface MoveRecord {
  san: string;
  from: string;
  to: string;
  promotion?: string;
  fen: string;
  captured?: string | null;
  color?: 'w' | 'b';
}

export interface Room {
  id: string;
  room_code: string;
  creator_id: string;
  player_white_id: string | null;
  player_black_id: string | null;
  status: RoomStatus;
  current_turn: 'w' | 'b';
  fen: string;
  move_history: MoveRecord[];
  game_result: GameResult;
  result_reason: string | null;
  draw_offered_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface GameRecord {
  id: string;
  room_id: string | null;
  white_player_id: string | null;
  black_player_id: string | null;
  mode: 'multiplayer' | 'ai';
  ai_difficulty: string | null;
  result: string;
  result_reason: string;
  final_fen: string;
  move_history: MoveRecord[];
  created_at: string;
  finished_at: string;
}
