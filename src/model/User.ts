export interface GameRecord {
  id: string;
  date: string;
  opponent: string; // "AI Bot Level X", "Local Player"
  playerColor: string;
  result: 'win' | 'loss' | 'draw';
  movesCount: number;
  moves: string[]; // Algebraic move history, e.g. ["e4", "e5", "Nf3"...]
}

export interface User {
  username: string;
  elo: number;
  history: GameRecord[];
}

const DEFAULT_USER: User = {
  username: 'Kỳ Thủ',
  elo: 1200,
  history: []
};

export class UserManager {
  static getActiveUser(): User {
    const stored = localStorage.getItem('chess_mvc_user');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        // Fallback
      }
    }
    // Set default user
    localStorage.setItem('chess_mvc_user', JSON.stringify(DEFAULT_USER));
    return DEFAULT_USER;
  }

  static saveUser(user: User): void {
    localStorage.setItem('chess_mvc_user', JSON.stringify(user));
  }

  static addGameToHistory(opponent: string, color: 'white' | 'black', result: 'win' | 'loss' | 'draw', moves: string[]): User {
    const user = this.getActiveUser();
    
    // Simple ELO Rating Adjustments
    let eloChange = 0;
    if (result === 'win') eloChange = 15;
    else if (result === 'loss') eloChange = -15;
    else eloChange = 0; // Draw

    const newElo = Math.max(100, user.elo + eloChange);

    const newRecord: GameRecord = {
      id: 'g-' + Date.now(),
      date: new Date().toISOString().split('T')[0],
      opponent,
      playerColor: color,
      result,
      movesCount: moves.length,
      moves,
    };

    const updatedUser: User = {
      ...user,
      elo: newElo,
      history: [newRecord, ...user.history]
    };

    this.saveUser(updatedUser);
    return updatedUser;
  }

  static resetStats(): User {
    const fresh: User = {
      username: 'Kỳ Thủ',
      elo: 1200,
      history: []
    };
    this.saveUser(fresh);
    return fresh;
  }
}
