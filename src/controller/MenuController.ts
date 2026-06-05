export type ScreenType = 'menu' | 'game';

export type GameMode = 'local' | 'ai';

export interface GameSettings {
  mode: GameMode;
  botDifficulty: number; // 200 to 2000 Elo
  playerColor: 'white' | 'black' | 'random';
  timeLimit?: number | null; // in seconds (e.g., 300, 600, 1800) or null
}

