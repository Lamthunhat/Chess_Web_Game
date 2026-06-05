import { useState, useEffect } from 'react';
import { MainMenuView } from './view/MainMenuView';
import { BoardView } from './view/BoardView';
import { AuthController } from './controller/AuthController';
import { ScreenType, GameSettings } from './controller/MenuController';
import { GameController } from './controller/GameController';
import { User, GameRecord } from './model/User';
import { Board } from './model/Board';
import { Github } from 'lucide-react';
import { reconstructMovesFromNotation } from './utils/reconstruct';
import { UTCLogo } from './view/UTCLogo';

export default function App() {
  const [activeScreen, setActiveScreen] = useState<ScreenType>('menu');
  const [user, setUser] = useState<User | null>(() => AuthController.getSession());
  const [gameController, setGameController] = useState<GameController | null>(null);
  const [replayMode, setReplayMode] = useState<boolean>(false);

  // Initialize session on mount
  useEffect(() => {
    const session = AuthController.getSession();
    setUser(session);
    setActiveScreen('menu');
  }, []);



  const handleLogout = () => {
    // Clear custom username and reload session
    const resetUser = AuthController.resetStats();
    setUser(resetUser);
    setActiveScreen('menu');
  };

  const handleStartGame = (settings: GameSettings) => {
    const controller = new GameController(
      settings.mode,
      settings.botDifficulty,
      settings.playerColor,
      settings.timeLimit
    );
    // Begin initial set-ups if color configuration calls for black start
    controller.resetGame();

    setGameController(controller);
    setActiveScreen('game');
  };

  const handleRefreshStats = () => {
    const updated = AuthController.getSession();
    setUser(updated);
  };

  const handleShowHistory = (record: GameRecord) => {
    // Reconstruct all history moves step-by-step
    const reconstructed = reconstructMovesFromNotation(record.moves);
    
    // Create replaying controller matching the original game mode and bot difficulty
    const playerCol = record.playerColor === 'white' ? 'white' : 'black';
    const isBot = record.opponent.startsWith('BOT');
    
    let difficulty = 1;
    if (isBot) {
      if (record.opponent.includes('Tập Sự')) difficulty = 1;
      else if (record.opponent.includes('Trung Cấp')) difficulty = 2;
      else if (record.opponent.includes('Chuyên Nghiệp')) difficulty = 3;
      else if (record.opponent.includes('Cao Thủ')) difficulty = 4;
      else {
        // e.g. "BOT (2000 Elo)" or "BOT (1200 Elo)"
        const match = record.opponent.match(/\((\d+)\s+Elo\)/);
        if (match) {
          difficulty = parseInt(match[1]);
        } else {
          difficulty = 1200; // default bot difficulty
        }
      }
    }

    const controller = new GameController(
      isBot ? 'ai' : 'local',
      difficulty,
      playerCol
    );
    
    // Position pieces at final point
    const displayBoard = new Board();
    for (const m of reconstructed) {
      displayBoard.executeMove(m);
    }
    controller.board = displayBoard;
    
    setGameController(controller);
    setReplayMode(true);
    setActiveScreen('game');
  };

  return (
    <div className="min-h-screen bg-[#302e2c] text-[#E0E0E0] flex flex-col justify-between font-sans antialiased selection:bg-[#81b64c]/20">
      {/* Header Bar */}
      <header className="bg-[#2b2925] border-b border-[#3c3a37] py-3.5 px-6 shadow-xs select-none">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UTCLogo size={40} />
            <span className="font-sans font-extrabold text-xl tracking-wide text-[#E0E0E0]">
              Chess<span className="text-[#81b64c]">.utc</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
          </div>
        </div>
      </header>

      {/* Main Body Stage */}
      <main className="flex-1 w-full bg-[#302e2c]">


        {activeScreen === 'menu' && user && (
          <MainMenuView
            user={user}
            onStartGame={handleStartGame}
            onShowHistory={handleShowHistory}
            onUpdateUser={(updated) => setUser(updated)}
          />
        )}

        {activeScreen === 'game' && gameController && (
          <BoardView
            controller={gameController}
            onExit={() => {
              setActiveScreen('menu');
              setGameController(null);
              setReplayMode(false);
            }}
            onRefreshStats={handleRefreshStats}
            initialReviewMode={replayMode}
            isHistoricalReview={replayMode}
          />
        )}
      </main>

      {/* Footer Bar */}
      <footer className="bg-[#21201d] border-t border-[#3c3a37] py-4 select-none text-[10px] uppercase tracking-widest text-[#8E9299]">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#E0E0E0]">Chess.utc</span>
            <span>•</span>
            <div className="flex items-center gap-1.5 normal-case tracking-normal text-[#8E9299]">
              <Github size={12} className="text-[#8E9299]" />
              <span className="font-semibold">Lamthunhat</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
