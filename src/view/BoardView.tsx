import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { GameController } from '../controller/GameController';
import { ChessPiece, Color, PieceType } from '../model/Piece';
import { Board } from '../model/Board';
import { Move, indexToChessCoordinate } from '../model/Move';
import { PieceSVG } from './PieceSVG';
import { 
  RotateCcw, ArrowLeft, ShieldAlert, Flag, Award, 
  ChevronRight, Swords, RefreshCw, Trophy, Volume2, VolumeX,
  History, Lightbulb, X, Clock
} from 'lucide-react';
import { sound } from '../utils/sound';
import { getAnalysisDetails } from '../utils/analysis';
import { AnalysisIcon } from './AnalysisIcon';
import { ChessEngine } from '../ai/ChessEngine';
import { evaluateBoard } from '../ai/Evaluation';

interface BoardViewProps {
  controller: GameController;
  onExit: () => void;
  onRefreshStats: () => void;
  initialReviewMode?: boolean;
  isHistoricalReview?: boolean;
}

export const BoardView: React.FC<BoardViewProps> = ({ 
  controller, 
  onExit, 
  onRefreshStats,
  initialReviewMode = false,
  isHistoricalReview = false
}) => {
  // Simple tick to trigger React state updates when the underlying MVC controller mutates data
  const [, setTick] = useState<number>(0);
  const forceUpdate = () => setTick(prev => prev + 1);

  const [whiteTime, setWhiteTime] = useState<number>(controller.timeLimit || 0);
  const [blackTime, setBlackTime] = useState<number>(controller.timeLimit || 0);

  const [promotionMove, setPromotionMove] = useState<Move | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isMuted, setIsMuted] = useState<boolean>(sound.getMutedState());

  const [isReviewMode, setIsReviewMode] = useState<boolean>(initialReviewMode);
  const [reviewIndex, setReviewIndex] = useState<number>(initialReviewMode ? controller.board.moveHistory.length : 0);

  // Stockfish evaluation states
  const [evaluation, setEvaluation] = useState<number>(0);
  const [mateMoves, setMateMoves] = useState<number | null>(null);
  const [isStockfishReady, setIsStockfishReady] = useState<boolean>(false);
  const stockfishWorkerRef = useRef<Worker | null>(null);
  const stockfishBestMoveRef = useRef<{ fromStr: string; toStr: string; promoChar?: string } | null>(null);



  // Custom confirmation state to bypass iframe popup sandbox blocks
  const [confirmAction, setConfirmAction] = useState<'reset' | 'resign' | null>(null);



  // Delayed game over popup state & visual effects
  const [showGameOverDialog, setShowGameOverDialog] = useState<boolean>(false);
  const [gameOverEffect, setGameOverEffect] = useState<'checkmate' | 'stalemate' | 'draw' | 'resign' | null>(null);

  // Capture visual feedback states & action handlers
  const [shakenSquares, setShakenSquares] = useState<Record<string, boolean>>({});
  const [captureParticles, setCaptureParticles] = useState<{ id: string; row: number; col: number; particles: { size: number; color: string; angle: number; distance: number; duration: number }[] }[]>([]);

  const triggerCaptureEffect = (row: number, col: number, capturedPiece: ChessPiece) => {
    // Capture visual effects disabled
  };

  const lastMoveHistoryLengthRef = useRef(controller.board.moveHistory.length);

  useEffect(() => {
    const currentLen = controller.board.moveHistory.length;
    if (currentLen > lastMoveHistoryLengthRef.current) {
      const lastMove = controller.board.moveHistory[currentLen - 1];
      if (lastMove && lastMove.captured) {
        triggerCaptureEffect(lastMove.toRow, lastMove.toCol, lastMove.captured);
      }
    }
    lastMoveHistoryLengthRef.current = currentLen;
  }, [controller.board.moveHistory.length]);

  const playMoveSound = (move: Move) => {
    const isCheckmate = move.notation?.endsWith('#');
    const isCheck = move.notation?.endsWith('+');
    const isCastle = !!move.isCastling;
    const isPromotion = !!move.promotion;
    const isCapture = !!move.captured;

    if (isCheckmate) {
      sound.playCheckmate(true);
    } else if (isCheck) {
      sound.playCheck();
    } else if (isPromotion) {
      sound.playPromotion();
    } else if (isCastle) {
      sound.playCastle();
    } else if (isCapture) {
      sound.playCapture();
    } else {
      sound.playMove();
    }
  };

  const lastReviewIndexRef = useRef(reviewIndex);

  useEffect(() => {
    if (isReviewMode) {
      const prevIdx = lastReviewIndexRef.current;
      const curIdx = reviewIndex;
      
      if (curIdx !== prevIdx) {
        if (curIdx === prevIdx + 1) {
          // Step forward by 1
          const replayedMove = controller.board.moveHistory[curIdx - 1];
          if (replayedMove) {
            playMoveSound(replayedMove);
            if (replayedMove.captured) {
              triggerCaptureEffect(replayedMove.toRow, replayedMove.toCol, replayedMove.captured);
            }
          }
        } else if (curIdx === prevIdx - 1) {
          // Step backward by 1
          sound.playMove();
        } else if (curIdx === 0) {
          // Jump to start
          sound.playGameStart();
        } else if (curIdx === controller.board.moveHistory.length) {
          // Jump to end
          const lastM = controller.board.moveHistory[curIdx - 1];
          if (lastM) {
            playMoveSound(lastM);
          }
        }
      }
      lastReviewIndexRef.current = curIdx;
    }
  }, [reviewIndex, isReviewMode]);

  // Suggested moves states
  const [suggestedMove, setSuggestedMove] = useState<Move | null>(null);
  const [isCalculatingSuggestion, setIsCalculatingSuggestion] = useState<boolean>(false);

  const handleGetHint = () => {
    if (isCalculatingSuggestion) return;
    setIsCalculatingSuggestion(true);
    setSuggestedMove(null);

    setTimeout(() => {
      try {
        let hint: Move | null = null;

        // 1. First, check if powerful Stockfish background analysis has calculated a grandmaster best move
        if (stockfishBestMoveRef.current) {
          const { fromStr, toStr } = stockfishBestMoveRef.current;
          const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
          const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

          const fromCol = files.indexOf(fromStr[0]);
          const fromRow = ranks.indexOf(fromStr[1]);
          const toCol = files.indexOf(toStr[0]);
          const toRow = ranks.indexOf(toStr[1]);

          if (fromCol !== -1 && fromRow !== -1 && toCol !== -1 && toRow !== -1) {
            const activeColor = activeBoard.activeTurn;
            const allMoves = activeBoard.getAllMovesForPlayer(activeColor);
            const found = allMoves.find(m => 
              m.fromRow === fromRow && 
              m.fromCol === fromCol && 
              m.toRow === toRow && 
              m.toCol === toCol
            );
            if (found) {
              hint = found;
            }
          }
        }

        // 2. Fall back to depth 4 advanced alpha-beta minimax if Stockfish is not ready/not run yet
        if (!hint) {
          hint = ChessEngine.getBestMove(activeBoard, 4);
        }

        if (hint) {
          setSuggestedMove(hint);
        } else {
          alert('Không tìm thấy nước đi gợi ý nào thích hợp trong thế cờ này.');
        }
      } catch (err) {
        console.error('Lỗi khi tính gợi ý:', err);
      } finally {
        setIsCalculatingSuggestion(false);
      }
    }, 300);
  };

  // Helper to clear suggestions when move list updates
  useEffect(() => {
    setSuggestedMove(null);
  }, [controller.board.moveHistory.length]);







  // Helper function to build board state at a specific historical point
  const getBoardAtMoveIndex = (moves: Move[], index: number) => {
    const b = new Board();
    const clampedIndex = Math.min(Math.max(0, index), moves.length);
    for (let i = 0; i < clampedIndex; i++) {
      const m = moves[i];
      if (m && m.piece) {
        b.executeMove(m);
      }
    }
    return b;
  };

  // Helper function to build captured pieces collections at a specific historical point
  const getCapturedAtMoveIndex = (moves: Move[], index: number) => {
    const caps: { white: ChessPiece[]; black: ChessPiece[] } = { white: [], black: [] };
    const clampedIndex = Math.min(Math.max(0, index), moves.length);
    for (let i = 0; i < clampedIndex; i++) {
      const m = moves[i];
      if (m && m.captured) {
        if (m.captured.color === Color.WHITE) {
          caps.white.push(m.captured);
        } else {
          caps.black.push(m.captured);
        }
      }
    }
    return caps;
  };

  const activeBoard = isReviewMode 
    ? getBoardAtMoveIndex(controller.board.moveHistory, reviewIndex)
    : controller.board;

  const activeFEN = activeBoard.getFEN();

  const activeTurnRef = useRef(activeBoard.activeTurn);
  useEffect(() => {
    activeTurnRef.current = activeBoard.activeTurn;
  }, [activeFEN]);

  // Hook 1: Initialize background Stockfish.js Web Worker using Blob URL to bypass sandboxed iFrame CORS
  useEffect(() => {
    let worker: Worker | null = null;
    try {
      const blobCode = `
        let stockfishWorker = null;
        
        self.onmessage = function(e) {
          const data = e.data;
          if (data.cmd === 'init') {
            try {
              importScripts('https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js');
              if (typeof self.STOCKFISH === 'function') {
                stockfishWorker = self.STOCKFISH();
                stockfishWorker.onmessage = function(event) {
                  self.postMessage({ type: 'stockfish_output', data: event.data });
                };
                self.postMessage({ type: 'status', data: 'ready' });
              } else {
                self.postMessage({ type: 'status', data: 'error', error: 'STOCKFISH constructor function not found' });
              }
            } catch(err) {
              self.postMessage({ type: 'status', data: 'error', error: err.toString() });
            }
          } else if (stockfishWorker) {
            if (data.cmd === 'uci') {
              stockfishWorker.postMessage(data.value);
            }
          }
        };
      `;
      const blob = new Blob([blobCode], { type: 'application/javascript' });
      worker = new Worker(URL.createObjectURL(blob));
      stockfishWorkerRef.current = worker;

      worker.onmessage = (e) => {
        const msg = e.data;
        if (msg.type === 'status') {
          if (msg.data === 'ready') {
            setIsStockfishReady(true);
            worker?.postMessage({ cmd: 'uci', value: 'uci' });
            worker?.postMessage({ cmd: 'uci', value: 'isready' });
          } else {
            console.warn('Stockfish Worker Status:', msg);
          }
        } else if (msg.type === 'stockfish_output') {
          const line = msg.data;
          
          if (line.startsWith('bestmove')) {
            const parts = line.split(' ');
            if (parts.length >= 2) {
              const uciMove = parts[1];
              if (uciMove.length >= 4) {
                const fromStr = uciMove.slice(0, 2);
                const toStr = uciMove.slice(2, 4);
                const promoChar = uciMove.length === 5 ? uciMove.slice(4, 5) : undefined;
                stockfishBestMoveRef.current = { fromStr, toStr, promoChar };
              }
            }
          }
          
          if (line.includes('score')) {
            const cpMatch = line.match(/score cp (-?\d+)/);
            const mateMatch = line.match(/score mate (-?\d+)/);
            
            if (cpMatch) {
              const cpValue = parseInt(cpMatch[1], 10);
              // Flip if Black's turn to keep evaluated score relative to White
              let score = cpValue / 100;
              if (activeTurnRef.current === Color.BLACK) {
                score = -score;
              }
              setEvaluation(score);
              setMateMoves(null);
            } else if (mateMatch) {
              const mateVal = parseInt(mateMatch[1], 10);
              let relativeMate = mateVal;
              if (activeTurnRef.current === Color.BLACK) {
                relativeMate = -relativeMate;
              }
              setMateMoves(relativeMate);
            }
          }
        }
      };

      // Trigger initialization
      worker.postMessage({ cmd: 'init' });

    } catch (e) {
      console.warn('Failed to start Stockfish Web Worker:', e);
    }

    return () => {
      if (worker) {
        worker.terminate();
      }
    };
  }, []);

  // Synchronize timer limits whenever the controller's board resets or changes
  useEffect(() => {
    if (controller.timeLimit) {
      setWhiteTime(controller.timeLimit);
      setBlackTime(controller.timeLimit);
    }
  }, [controller, controller.timeLimit, controller.board]);

  // Handle active countdown ticking
  useEffect(() => {
    if (!controller.timeLimit) return;
    if (controller.isGameOver()) return;
    if (isReviewMode) return;

    const interval = setInterval(() => {
      const activeColor = activeBoard.activeTurn;
      if (activeColor === Color.WHITE) {
        setWhiteTime((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setTimeout(() => {
              controller.triggerTimeout(forceUpdate);
            }, 0);
            return 0;
          }
          return prev - 1;
        });
      } else {
        setBlackTime((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setTimeout(() => {
              controller.triggerTimeout(forceUpdate);
            }, 0);
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [controller, activeBoard.activeTurn, isReviewMode, forceUpdate]);

  // Format utility for rendering mm:ss
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Hook 2: Dynamic analysis update triggered on activeBoard state updates
  useEffect(() => {
    // 1. Trigger local heuristic evaluation instantly for zero-latency UI updates
    const localEval = evaluateBoard(activeBoard) / 100;
    setEvaluation(localEval);
    setMateMoves(null);
    stockfishBestMoveRef.current = null;

    // 2. Schedule background Stockfish depth 10 evaluation
    if (stockfishWorkerRef.current && isStockfishReady) {
      const fen = activeBoard.getFEN();
      stockfishWorkerRef.current.postMessage({ cmd: 'uci', value: 'stop' });
      stockfishWorkerRef.current.postMessage({ cmd: 'uci', value: `position fen ${fen}` });
      stockfishWorkerRef.current.postMessage({ cmd: 'uci', value: 'go depth 10' });
    }
  }, [activeFEN, isStockfishReady]);

  const handleToggleMute = () => {
    const nextMuted = sound.toggleMute();
    setIsMuted(nextMuted);
  };

  // Register callback to synchronize and force re-render on async events (like delayed Bot moves)
  useEffect(() => {
    controller.onStateChangeCallback = forceUpdate;
    return () => {
      controller.onStateChangeCallback = undefined;
    };
  }, [controller]);

  // Auto-scroll the move log scroll box to the bottom on every turn
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [controller.board.moveHistory.length]);

  const activeTurn = activeBoard.activeTurn;
  const isBotThinking = controller.mode === 'ai' && activeTurn !== controller.playerColor;

  // Let's check if the human's color is Black. If so, flip the board vertically and horizontally for the optimal playing view!
  const isBoardFlipped = controller.playerColor === Color.BLACK;

  const isTopTurnActive = isBoardFlipped ? activeBoard.activeTurn === Color.WHITE : activeBoard.activeTurn === Color.BLACK;
  const isBottomTurnActive = isBoardFlipped ? activeBoard.activeTurn === Color.BLACK : activeBoard.activeTurn === Color.WHITE;
  const topTime = isBoardFlipped ? whiteTime : blackTime;
  const bottomTime = isBoardFlipped ? blackTime : whiteTime;

   // Handles clicking a square
  const handleCellClick = (r: number, c: number) => {
    if (isReviewMode) return; // Prevent board clicks when analyzing history
    if (isBotThinking) return;



    setSuggestedMove(null); // Clear suggestion highlight on interaction

    controller.handleSquareClick(
      r,
      c,
      forceUpdate, // Controller updates and requests state draw
      (move) => {
        // Triggered when pawn promotion is needed
        setPromotionMove(move);
      }
    );
  };

  const handlePromotionSelection = (type: PieceType) => {
    if (promotionMove) {
      controller.selectPromotion(type, forceUpdate);
      setPromotionMove(null);
    }
  };

  const handlePromotionCancel = () => {
    controller.cancelPromotion(forceUpdate);
    setPromotionMove(null);
  };

  const handleUndo = () => {
    controller.undoLastMove();
    forceUpdate();
  };

  const handleReset = () => {
    setConfirmAction('reset');
  };

  const handleResign = () => {
    setConfirmAction('resign');
  };

  const executeConfirmReset = () => {
    controller.resetGame();
    setConfirmAction(null);
    forceUpdate();
  };

  const executeConfirmResign = () => {
    controller.resign(forceUpdate);
    onRefreshStats(); // Update Elo and history
    setConfirmAction(null);
    forceUpdate();
  };

  // Determine last played adventure squares to highlight
  const lastMove = isReviewMode 
    ? controller.board.moveHistory[reviewIndex - 1] 
    : controller.board.moveHistory[controller.board.moveHistory.length - 1];

  const reviewedMove = isReviewMode && reviewIndex > 0 ? controller.board.moveHistory[reviewIndex - 1] : undefined;
  const reviewedDetails = reviewedMove?.analysis ? getAnalysisDetails(reviewedMove.analysis) : null;

  // Helper info about Game Over States
  const outcome = controller.getGameOutcome();

  useEffect(() => {
    if (outcome.gameOver && !isReviewMode) {
      const isCheckmate = activeBoard.isCheckmate(Color.WHITE) || activeBoard.isCheckmate(Color.BLACK);
      const isStalemateResult = activeBoard.isStalemate(activeBoard.activeTurn);
      const isResignResult = controller.resignedColor !== null;

      let effectType: 'checkmate' | 'stalemate' | 'draw' | 'resign' = 'draw';
      if (isCheckmate) effectType = 'checkmate';
      else if (isStalemateResult) effectType = 'stalemate';
      else if (isResignResult) effectType = 'resign';

      setGameOverEffect(effectType);

      // Wait 1 second (1000ms) before opening the rating modal/outcome popup dialog
      const timer = setTimeout(() => {
        setShowGameOverDialog(true);
      }, 1000);

      return () => clearTimeout(timer);
    } else {
      setShowGameOverDialog(false);
      setGameOverEffect(null);
    }
  }, [outcome.gameOver, isReviewMode, activeBoard, controller.resignedColor]);

  // Generate grids order depending on flip state
  const rows = isBoardFlipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
  const cols = isBoardFlipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];

  // Helper strings
  const filesLabels = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranksLabels = ['8', '7', '6', '5', '4', '3', '2', '1'];

  // Check if king is in check
  const isWhiteKingInCheck = activeBoard.isInCheck(Color.WHITE);
  const isBlackKingInCheck = activeBoard.isInCheck(Color.BLACK);

  // Group captured pieces for visual summary
  // Captured pieces are those that are food for the opposite color
  const activeCaptured = isReviewMode
    ? getCapturedAtMoveIndex(controller.board.moveHistory, reviewIndex)
    : controller.capturedPieces;

  const whiteCaptured = activeCaptured.white; // White pieces eaten by Black
  const blackCaptured = activeCaptured.black; // Black pieces eaten by White

  const getCaptureSubtotal = (captured: ChessPiece[]) => {
    return captured.reduce((sum, p) => {
      if (!p || !p.type) return sum;
      const val = {
        [PieceType.PAWN]: 1,
        [PieceType.KNIGHT]: 3,
        [PieceType.BISHOP]: 3,
        [PieceType.ROOK]: 5,
        [PieceType.QUEEN]: 9,
        [PieceType.KING]: 0,
      }[p.type] || 0;
      return sum + val;
    }, 0);
  };

  // Advantage and points calculations (e.g. Chess.com comparative scoring style)
  const topCaptured = isBoardFlipped ? blackCaptured : whiteCaptured;
  const bottomCaptured = isBoardFlipped ? whiteCaptured : blackCaptured;

  const topCapturedValue = getCaptureSubtotal(topCaptured);
  const bottomCapturedValue = getCaptureSubtotal(bottomCaptured);

  const topAdvantage = topCapturedValue > bottomCapturedValue ? topCapturedValue - bottomCapturedValue : null;
  const bottomAdvantage = bottomCapturedValue > topCapturedValue ? bottomCapturedValue - topCapturedValue : null;

  // Group move logs in pairs (rounds)
  const pairedMoves: { white: string; black?: string; round: number }[] = [];
  const history = controller.board.moveHistory;
  for (let i = 0; i < history.length; i += 2) {
    pairedMoves.push({
      round: Math.floor(i / 2) + 1,
      white: history[i].notation || '',
      black: history[i + 1]?.notation || undefined,
    });
  }

  // Assemble the list of active pieces on the board for smooth absolute-positioned Framer Motion transitions
  const piecesToRender: { piece: ChessPiece; row: number; col: number; isSelected: boolean }[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = activeBoard.grid[r][c];
      if (p) {
        const isSel = controller.selectedSquare?.row === r && controller.selectedSquare?.col === c;
        piecesToRender.push({ piece: p, row: r, col: c, isSelected: isSel });
      }
    }
  }

  // Compute evaluation bar helper variables
  const isEvaluatingMate = mateMoves !== null;
  const isWhiteWinning = evaluation > 0;
  const isWhiteWinningMate = isEvaluatingMate && mateMoves! > 0;

  // Clamp visual evaluation score to [-8, +8] for elegant visual scaling of the bar
  const clampedEval = Math.max(-8, Math.min(8, evaluation));
  // Map value from [-8, 8] to percentage [0, 100]
  const percentageWhite = ((clampedEval + 8) / 16) * 100;

  const evalText = evaluation === 0 
    ? '0.0' 
    : `${evaluation > 0 ? '+' : ''}${evaluation.toFixed(1)}`;

  const renderCapturedGrouped = (captured: ChessPiece[], advantage: number | null) => {
    const typeOrder = [
      PieceType.PAWN,
      PieceType.BISHOP,
      PieceType.KNIGHT,
      PieceType.ROOK,
      PieceType.QUEEN,
    ];

    const groups: Record<PieceType, ChessPiece[]> = {
      [PieceType.PAWN]: [],
      [PieceType.BISHOP]: [],
      [PieceType.KNIGHT]: [],
      [PieceType.ROOK]: [],
      [PieceType.QUEEN]: [],
      [PieceType.KING]: [],
    };

    captured.forEach(p => {
      if (p && p.type) {
        groups[p.type].push(p);
      }
    });

    return (
      <div className="flex items-center gap-1 select-none shrink-0">
        {typeOrder.map(type => {
          const list = groups[type];
          if (list.length === 0) return null;
          return (
            <div key={type} className="flex items-center" style={{ marginRight: '2px' }}>
              {list.map((p, idx) => (
                <div
                  key={idx}
                  className="w-[18px] h-[18px] transition-all hover:scale-110"
                  style={{
                    marginLeft: idx > 0 ? '-8px' : '0px',
                    zIndex: idx,
                  }}
                  title={p.type}
                >
                  <PieceSVG type={p.type} color={p.color} />
                </div>
              ))}
            </div>
          );
        })}
        {advantage !== null && (
          <span className="text-[10px] font-bold text-[#8E9299] ml-1 font-mono shrink-0">
            +{advantage}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-2 md:py-3.5 flex flex-col justify-center">
      {/* Back button & Audio controls */}
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              onRefreshStats();
              onExit();
            }}
            className="px-4 py-2.5 bg-[#312e2b] hover:bg-[#3c3a37] text-[#E0E0E0] border border-[#3c3a37] hover:border-[#81b64c]/50 font-bold text-xs rounded-xl flex items-center gap-2 cursor-pointer transition-all"
          >
            <ArrowLeft size={14} className="text-[#81b64c]" />
            Về Sảnh Chờ
          </button>

          <button
            onClick={handleToggleMute}
            className="p-2.5 bg-[#312e2b] hover:bg-[#3c3a37] text-[#E0E0E0] border border-[#3c3a37] hover:border-[#81b64c]/50 rounded-xl flex items-center justify-center cursor-pointer transition-all"
            title={isMuted ? 'Mở âm thanh' : 'Tắt âm thanh'}
          >
            {isMuted ? (
              <VolumeX size={14} className="text-rose-500" />
            ) : (
              <Volume2 size={14} className="text-[#81b64c]" />
            )}
          </button>
        </div>

        <div className="flex items-center gap-2 bg-[#2b2925] px-3.5 py-1.5 rounded-xl border border-[#3c3a37] text-xs font-semibold text-[#8E9299] shadow-sm select-none">
          <span className="w-2.5 h-2.5 rounded-full bg-[#81b64c] animate-pulse"></span>
          <span>
            {controller.mode === 'ai'
              ? `Đấu với Máy (${controller.botDifficulty <= 4 ? 1200 : controller.botDifficulty} Elo)`
              : 'Chế độ: Chơi 2 kỳ thủ'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT COLUMN: Chess board & Captures */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col items-center">
          
          <div className="w-full max-w-[min(720px,68vh)] h-[46px] px-3 flex items-center justify-between bg-[#2b2925] border border-[#3c3a37] rounded-t-xl select-none">
            <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
              <div className="flex items-center gap-2 shrink-0">
                <div className={`w-3 h-3 rounded-full shrink-0 ${isBoardFlipped ? 'bg-slate-200 border border-slate-400' : 'bg-neutral-900 border border-[#3c3a37]'}`}></div>
                <span className="text-xs font-bold text-[#E0E0E0] whitespace-nowrap shrink-0">
                  {controller.mode === 'ai' 
                    ? `BOT Máy (${controller.botDifficulty <= 4 ? 1200 : controller.botDifficulty} Elo)` 
                    : (isBoardFlipped ? 'Quân Trắng' : 'Quân Đen')}
                </span>
              </div>
              {/* Captured items by this opponent (eaten pieces list) */}
              {renderCapturedGrouped(isBoardFlipped ? blackCaptured : whiteCaptured, topAdvantage)}
            </div>

            {/* Top Timer Clock */}
            {controller.timeLimit && (
              <div className={`px-2.5 py-1 rounded-lg font-mono text-xs font-bold tracking-wider flex items-center gap-1.5 transition-all border ${
                isTopTurnActive 
                  ? 'bg-amber-950/40 text-amber-400 border-amber-800' 
                  : 'bg-[#312e2b]/50 text-[#8E9299] border-transparent'
              }`}>
                <Clock size={12} className={isTopTurnActive ? 'animate-pulse' : ''} />
                <span>{formatTime(topTime)}</span>
              </div>
            )}
          </div>

          {/* HORIZONTAL Flex Layout wrapper for Real-time Evaluation Bar + Chess Board Panel */}
          <div className="w-full max-w-[min(720px,68vh)] flex items-stretch gap-2.5 relative select-none mb-2 md:mb-3">
            
            {/* Real-time vertical evaluation bar (Chess.com alignment style) */}
            <div 
              className={`w-6 md:w-7 bg-[#312e2b] border border-[#3c3a37]/80 rounded-lg overflow-hidden flex shadow-lg shrink-0 transition-all relative ${
                isBoardFlipped ? 'flex-col' : 'flex-col-reverse'
              }`}
              title="Thanh Đánh Giá Thế Trận Thời Gian Thực (Stockfish)"
            >
              {/* White advantage slice */}
              <div 
                style={{ height: `${percentageWhite}%` }} 
                className="w-full bg-[#EAEAEA] transition-all duration-300 relative border-b border-[#3c3a37]/25"
              />
              
              {/* Black advantage slice (occupying remaining layout area) */}
              <div 
                className="w-full flex-1 bg-[#1A1A1D] transition-all duration-300"
              />

              {/* Equator / middle balance line mark */}
              <div className="absolute top-1/2 left-0 right-0 h-[1.5px] bg-[#6B7280]/40 z-10 pointer-events-none" />

              {/* Evaluation score indicator tag */}
              {isEvaluatingMate ? (
                <div 
                  className={`absolute left-1/2 -translate-x-1/2 text-[8px] md:text-[9.5px] font-black font-mono tracking-tighter leading-none pointer-events-none z-20 ${
                    isWhiteWinningMate 
                      ? `${isBoardFlipped ? 'top-2.5 text-[#1A1A1D]' : 'bottom-2.5 text-[#1A1A1D]'}` 
                      : `${isBoardFlipped ? 'bottom-2.5 text-white' : 'top-2.5 text-white'}`
                  }`}
                >
                  M{Math.abs(mateMoves!)}
                </div>
              ) : (
                <div 
                  className={`absolute left-1/2 -translate-x-1/2 text-[8.5px] md:text-[10px] font-black font-mono tracking-tighter leading-none pointer-events-none z-20 ${
                    isWhiteWinning 
                      ? `${isBoardFlipped ? 'top-2.5 text-[#1A1A1D]' : 'bottom-2.5 text-[#1A1A1D]'}` 
                      : `${isBoardFlipped ? 'bottom-2.5 text-white' : 'top-2.5 text-white'}`}
                  `}
                >
                  {evalText}
                </div>
              )}
            </div>

            {/* MAIN CHESSBOARD STAGE CONTAINER */}
            <div 
              id="chessboard-panel"
              className="flex-1 aspect-square bg-[#312e2b] border-4 border-[#1E1E24] rounded-sm overflow-hidden shadow-2xl relative"
            >
              {/* The 8x8 squares mapping */}
              <div className="grid grid-cols-8 grid-rows-8 w-full h-full relative">
              {rows.map((rIndex) => {
                return cols.map((cIndex) => {
                  const piece = activeBoard.getPiece(rIndex, cIndex);
                  
                  // Coordinate assessment
                  const coordinateStr = indexToChessCoordinate(rIndex, cIndex);
                  
                  // Chess.com standard Green theme palette
                  const isLightSquare = (rIndex + cIndex) % 2 !== 0;
                  const baseCellClass = isLightSquare 
                    ? 'bg-[#EEEED2] text-[#769656]' 
                    : 'bg-[#769656] text-[#EEEED2]';

                  // Highlights:
                  // 1. Selected square
                  const isSelected = controller.selectedSquare?.row === rIndex && controller.selectedSquare?.col === cIndex;
                  
                  // 2. Candidate target moves
                  const isCandidateMove = controller.validMoves.some(m => m.toRow === rIndex && m.toCol === cIndex);
                  const candidateMoveDetail = controller.validMoves.find(m => m.toRow === rIndex && m.toCol === cIndex);
                  const isCaptureCandidate = isCandidateMove && !!candidateMoveDetail?.captured;

                  // 3. Last move departure/arrival squares
                  const isLastMoveSquare = lastMove && (
                    (lastMove.fromRow === rIndex && lastMove.fromCol === cIndex) ||
                    (lastMove.toRow === rIndex && lastMove.toCol === cIndex)
                  );

                  // 4. Checking indicators
                  const isKingCheckHighlight = (piece?.type === PieceType.KING) && (
                    (piece.color === Color.WHITE && isWhiteKingInCheck) ||
                    (piece.color === Color.BLACK && isBlackKingInCheck)
                  );

                  // 5. Suggested moves highlights
                  const isSuggestedMoveDeparture = suggestedMove && suggestedMove.fromRow === rIndex && suggestedMove.fromCol === cIndex;
                  const isSuggestedMoveArrival = suggestedMove && suggestedMove.toRow === rIndex && suggestedMove.toCol === cIndex;

                  return (
                    <motion.div
                      key={`${rIndex}-${cIndex}`}
                      id={`square-${coordinateStr}`}
                      onClick={() => handleCellClick(rIndex, cIndex)}
                      className={`relative flex items-center justify-center w-full h-full cursor-pointer select-none transition-all duration-100 ${baseCellClass}`}
                    >
                      {/* Suggested move highlight departure (with pulsing cyan glow) */}
                      {isSuggestedMoveDeparture && (
                        <div className="absolute inset-0 bg-cyan-400/20 ring-4 ring-cyan-400/60 ring-inset animate-pulse pointer-events-none z-10" />
                      )}

                      {/* Suggested move highlight arrival (with pulsing emerald ring) */}
                      {isSuggestedMoveArrival && (
                        <div className="absolute inset-0 bg-emerald-400/20 ring-4 ring-emerald-400/60 ring-inset animate-pulse pointer-events-none z-10" />
                      )}

                      {/* Last move overlay (Chess.com premium yellow-gold highlight) */}
                      {isLastMoveSquare && (
                        <div className="absolute inset-0 bg-amber-500/20 border border-amber-500/30 ring-1 ring-amber-500/25 pointer-events-none z-[1]" />
                      )}

                      {/* Selected overlay (Chess.com transparent gold highlight) */}
                      {isSelected && (
                        <div className="absolute inset-0 bg-[#F7F785]/60 ring-2 ring-[#F7F785]/80" />
                      )}

                      {/* Check warning background for king */}
                      {isKingCheckHighlight && (
                        <div className="absolute inset-0 bg-red-600/50 animate-pulse ring-2 ring-red-500" />
                      )}

                      {/* Valid empty candidate circles (Chess.com semi-transparent black center dot) */}
                      {isCandidateMove && !isCaptureCandidate && (
                        <div className="absolute w-4 h-4 bg-black/15 rounded-full z-10 hover:scale-110 transition" />
                      )}

                      {/* Valid capture rings (Chess.com circle border overlay) */}
                      {isCaptureCandidate && (
                        <div className="absolute w-4/5 h-4/5 border-4 border-black/15 rounded-full z-10 animate-scale" />
                      )}

                      {/* No physical chess pieces are drawn in the grid cells anymore to support absolute-positioned glide transitions below */}

                      {/* Chess.com style Move feedback badge on arrival square */}
                      {lastMove && lastMove.toRow === rIndex && lastMove.toCol === cIndex && lastMove.analysis && (
                        <div className="absolute -top-1 -right-1 z-30 filter drop-shadow animate-bounce-short" style={{ transform: 'translate(15%, -15%)' }}>
                          <AnalysisIcon category={lastMove.analysis} size={20} />
                        </div>
                      )}

                      {/* Coordinates notations inside edges */}
                      {/* Left side coordinates (ranks 1-8) */}
                      {cIndex === (isBoardFlipped ? 7 : 0) && (
                        <span className="absolute top-1.5 left-1.5 text-[9px] font-mono opacity-50 font-bold leading-none pointer-events-none select-none">
                          {ranksLabels[rIndex]}
                        </span>
                      )}
                      {/* Bottom side coordinates (files a-h) */}
                      {rIndex === (isBoardFlipped ? 0 : 7) && (
                        <span className="absolute bottom-1.5 right-1.5 text-[9px] font-mono opacity-50 font-bold leading-none pointer-events-none select-none">
                          {filesLabels[cIndex]}
                        </span>
                      )}
                    </motion.div>
                  );
                });
              })}
            </div>

            {/* Particle effects overlays */}
            <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
              {captureParticles.map((effect) => {
                const rVisual = isBoardFlipped ? 7 - effect.row : effect.row;
                const cVisual = isBoardFlipped ? 7 - effect.col : effect.col;

                return (
                  <div
                    key={effect.id}
                    className="absolute"
                    style={{
                      left: `${cVisual * 12.5}%`,
                      top: `${rVisual * 12.5}%`,
                      width: '12.5%',
                      height: '12.5%',
                    }}
                  >
                    {effect.particles.map((p, idx) => (
                      <motion.div
                        key={idx}
                        className="absolute rounded-full pointer-events-none shadow-sm"
                        style={{
                          width: p.size,
                          height: p.size,
                          backgroundColor: p.color,
                          left: '50%',
                          top: '50%',
                          transform: 'translate(-50%, -50%)',
                        }}
                        initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                        animate={{
                          x: Math.cos(p.angle) * p.distance,
                          y: Math.sin(p.angle) * p.distance,
                          scale: 0,
                          opacity: [1, 0.8, 0],
                        }}
                        transition={{
                          duration: p.duration,
                          ease: "easeOut",
                        }}
                      />
                    ))}
                  </div>
                );
              })}
            </div>

            {/* Absolute overlay of active pieces for incredibly smooth gliding transitions */}
            <div className="absolute inset-0 pointer-events-none z-20">
              {piecesToRender.map(({ piece, row, col, isSelected }) => {
                const rVisual = isBoardFlipped ? 7 - row : row;
                const cVisual = isBoardFlipped ? 7 - col : col;

                return (
                  <motion.div
                    key={`piece-${piece.id}`}
                    layoutId={`piece-${piece.id}`}
                    className="absolute flex items-center justify-center select-none pointer-events-auto cursor-pointer"
                    style={{
                      width: '12.5%',
                      height: '12.5%',
                      touchAction: 'none',
                    }}
                    animate={{
                      left: `${cVisual * 12.5}%`,
                      top: `${rVisual * 12.5}%`,
                      x: 0,
                      y: isSelected ? -14 : 0,
                      scale: isSelected ? 1.25 : 1,
                      filter: isSelected 
                        ? 'drop-shadow(0 14px 10px rgba(0,0,0,0.45))' 
                        : 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))',
                      zIndex: isSelected ? 50 : 20,
                    }}
                    transition={{
                      left: { type: "tween", duration: 0.1, ease: "easeOut" },
                      top: { type: "tween", duration: 0.1, ease: "easeOut" },
                      x: { duration: 0 },
                      y: { type: "tween", duration: 0.1, ease: "easeOut" },
                      scale: { duration: 0.15 },
                      filter: { duration: 0.15 },
                    }}
                    onClick={() => handleCellClick(row, col)}
                  >
                    <div className="w-[92%] h-[92%] flex items-center justify-center select-none" draggable="false">
                      <PieceSVG type={piece.type} color={piece.color} />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

            {/* PROMOTION DIALOG OVERLAY */}
            {promotionMove && (() => {
              const rVisual = isBoardFlipped ? 7 - promotionMove.toRow : promotionMove.toRow;
              const cVisual = isBoardFlipped ? 7 - promotionMove.toCol : promotionMove.toCol;
              const verticalStyle = rVisual === 0 
                ? { top: '0%', left: `${cVisual * 12.5}%` } 
                : { bottom: '0%', left: `${cVisual * 12.5}%` };

              return (
                <div 
                  id="promotion-box"
                  className="absolute w-[12.5%] h-[62.5%] bg-white rounded-md border border-slate-300 shadow-[0_12px_40px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col z-50 select-none animate-fade-in animate-duration-150"
                  style={verticalStyle}
                >
                  {[
                    { type: PieceType.QUEEN, label: 'Hậu' },
                    { type: PieceType.KNIGHT, label: 'Mã' },
                    { type: PieceType.ROOK, label: 'Xe' },
                    { type: PieceType.BISHOP, label: 'Tượng' },
                  ].map((opt) => (
                    <button
                      key={opt.type}
                      onClick={() => handlePromotionSelection(opt.type)}
                      className="h-[20%] w-full flex items-center justify-center bg-white hover:bg-slate-100 transition duration-150 cursor-pointer p-1"
                      title={opt.label}
                    >
                      <div className="w-[80%] h-[80%]">
                        <PieceSVG type={opt.type} color={promotionMove.piece.color} />
                      </div>
                    </button>
                  ))}
                  
                  <button
                    onClick={handlePromotionCancel}
                    className="h-[20%] w-full bg-[#EDEDED] hover:bg-red-50 text-[#8E9299] hover:text-red-500 border-t border-[#3c3a37] flex items-center justify-center transition duration-150 cursor-pointer"
                    title="Hủy nước đi"
                  >
                    <X size={14} strokeWidth={3} />
                  </button>
                </div>
              );
            })()}

            {/* CUSTOM CONFIRMATION DIALOG OVERLAY */}
            {confirmAction && (
              <div className="absolute inset-0 bg-[#262421]/90 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in select-none">
                <div className="bg-[#2b2925] border border-[#3c3a37] rounded-2xl shadow-2xl p-6 max-w-sm w-11/12 text-center text-[#E0E0E0]">
                  <div className="w-12 h-12 bg-[#312e2b] text-[#81b64c] rounded-xl flex items-center justify-center mx-auto mb-3 border border-[#3c3a37] shadow-inner">
                    <ShieldAlert size={26} />
                  </div>
                  
                  {confirmAction === 'resign' ? (
                    <>
                      <h3 className="text-lg font-extrabold text-rose-400 tracking-wide mb-2 font-sans">
                        Xác Nhận Đầu Hàng?
                      </h3>
                      <p className="text-xs text-[#8E9299] leading-relaxed mb-6">
                        Bạn có thực sự muốn nhận thua ván đấu này không? Điểm hệ số Elo của bạn sẽ bị ảnh hưởng.
                      </p>

                      <div className="flex flex-col gap-2">
                        <button
                          onClick={executeConfirmResign}
                          className="w-full py-2.5 bg-rose-700 hover:bg-rose-600 text-white text-xs font-bold uppercase tracking-wider rounded-lg cursor-pointer flex items-center justify-center gap-2 transition"
                        >
                          <Flag size={14} />
                          Chấp Nhận Đầu Hàng
                        </button>
                        <button
                          onClick={() => setConfirmAction(null)}
                          className="w-full py-2.5 bg-[#312e2b] border border-[#3c3a37] hover:bg-[#3c3a37] text-slate-300 text-xs font-bold rounded-lg cursor-pointer transition uppercase tracking-wider"
                        >
                          Quay Lại Ván Đấu
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <h3 className="text-lg font-extrabold text-[#81b64c] tracking-wide mb-2 font-sans">
                        Thiết Lập Lại Ván Cờ?
                      </h3>
                      <p className="text-xs text-[#8E9299] leading-relaxed mb-6">
                        Tất cả nước đi hiện tại sẽ bị xóa bỏ. Bạn có chắc chắn muốn làm mới lại ván đấu từ đầu không?
                      </p>

                      <div className="flex flex-col gap-2">
                        <button
                          onClick={executeConfirmReset}
                          className="w-full py-2.5 bg-[#81b64c] text-white text-xs font-bold uppercase tracking-wider rounded-lg cursor-pointer flex items-center justify-center gap-2 transition"
                        >
                          <RefreshCw size={14} />
                          Làm Mới Ván Đấu
                        </button>
                        <button
                          onClick={() => setConfirmAction(null)}
                          className="w-full py-2.5 bg-[#312e2b] border border-[#3c3a37] hover:bg-[#3c3a37] text-slate-300 text-xs font-bold rounded-lg cursor-pointer transition uppercase tracking-wider"
                        >
                          Hủy Bỏ
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* GAME OVER VISUAL SPLASH EFFECT OVERLAYS */}
            {outcome.gameOver && !isReviewMode && gameOverEffect && (
              <>
                {gameOverEffect === 'checkmate' && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 bg-red-950/45 pointer-events-none flex flex-col items-center justify-center z-35"
                  >
                    <motion.div 
                      initial={{ scale: 0.2, rotate: -15, opacity: 0 }}
                      animate={{ scale: 1, rotate: 0, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                      className="bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 px-6 py-3 rounded-full border-2 border-amber-300 shadow-2xl flex items-center gap-2"
                    >
                      <Trophy size={18} className="text-amber-300 animate-bounce" />
                      <span className="text-xs font-black text-white font-sans uppercase tracking-widest leading-none drop-shadow">
                        Chiếu Bí! (Checkmate)
                      </span>
                    </motion.div>
                    <div className="absolute inset-0 border-4 border-red-500/70 rounded-xs pointer-events-none animate-pulse" />
                  </motion.div>
                )}

                {gameOverEffect === 'stalemate' && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 bg-slate-900/50 pointer-events-none flex flex-col items-center justify-center z-35"
                  >
                    <motion.div 
                      initial={{ scale: 0.2, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 rounded-full border-2 border-indigo-200 shadow-2xl flex items-center gap-2"
                    >
                      <ShieldAlert size={18} className="text-white" />
                      <span className="text-xs font-black text-white font-sans uppercase tracking-widest leading-none drop-shadow">
                        Hòa Cờ (Stalemate)
                      </span>
                    </motion.div>
                    <div className="absolute inset-0 border-4 border-blue-400/50 rounded-xs pointer-events-none" />
                  </motion.div>
                )}

                {gameOverEffect === 'resign' && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 bg-rose-950/30 pointer-events-none flex flex-col items-center justify-center z-35"
                  >
                    <motion.div 
                      initial={{ scale: 0.2, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                      className="bg-gradient-to-r from-rose-800 to-zinc-800 px-6 py-3 rounded-full border-2 border-rose-400 shadow-2xl flex items-center gap-2"
                    >
                      <Flag size={18} className="text-white" />
                      <span className="text-xs font-black text-white font-sans uppercase tracking-widest leading-none drop-shadow">
                        Đầu Hàng (Resign)
                      </span>
                    </motion.div>
                    <div className="absolute inset-0 border-4 border-rose-500/50 rounded-xs pointer-events-none" />
                  </motion.div>
                )}
              </>
            )}

            {/* GAME OVER DIALOG OVERLAY */}
            {outcome.gameOver && showGameOverDialog && !isReviewMode && (
              <div className="absolute inset-0 bg-[#262421]/90 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
                <div 
                  id="game-over-box"
                  className="bg-[#2b2925] border border-[#3c3a37] rounded-2xl shadow-2xl p-8 max-w-sm w-11/12 text-center select-none text-[#E0E0E0]"
                >
                  <div className="w-16 h-16 bg-[#312e2b] text-[#81b64c] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#3c3a37] shadow-inner font-mono">
                    <Trophy size={36} />
                  </div>
                  <h3 className="text-2xl font-extrabold text-[#81b64c] tracking-wide mb-2 font-sans">
                    {outcome.title}
                  </h3>
                  <p className="text-[10px] uppercase tracking-widest text-[#8E9299] font-semibold mb-1">KẾT QUẢ VÁN ĐẤU</p>
                  <div className="text-3xl font-mono font-black text-[#81b64c] bg-[#312e2b] py-2 border border-[#3c3a37] rounded-xl mb-4 tracking-wider">
                    {outcome.score}
                  </div>
                  <p className="text-xs text-[#8E9299] leading-relaxed mb-6">
                    {outcome.subtitle}
                  </p>

                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        controller.resetGame();
                        onRefreshStats();
                        forceUpdate();
                      }}
                      className="w-full py-3 bg-[#81b64c] text-white text-xs font-bold uppercase tracking-widest rounded-xl hover:opacity-95 shadow-md shadow-[#81b64c]/5 cursor-pointer flex items-center justify-center gap-2 transition"
                    >
                      <RefreshCw size={14} />
                      Chơi Ván Mới
                    </button>
                    
                    <button
                      onClick={() => {
                        setIsReviewMode(true);
                        setReviewIndex(controller.board.moveHistory.length);
                        forceUpdate();
                      }}
                      className="w-full py-3 bg-[#312e2b] border border-[#81b64c]/40 hover:bg-[#3c3a37] text-[#81b64c] text-xs font-bold rounded-xl cursor-pointer transition uppercase tracking-widest flex items-center justify-center gap-2"
                    >
                      Xem Lại Ván Đấu
                    </button>

                    <button
                      onClick={() => {
                        onRefreshStats();
                        onExit();
                      }}
                      className="w-full py-3 bg-[#312e2b] border border-[#3c3a37] hover:bg-[#3c3a37] text-slate-300 text-xs font-bold rounded-xl cursor-pointer transition uppercase tracking-widest"
                    >
                      Trở Lại Sảnh Chính
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>



          {/* Player Captured tracker details */}
          <div className="w-full max-w-[min(720px,68vh)] h-[46px] px-3 flex items-center justify-between bg-[#2b2925] border border-t-0 border-[#3c3a37] rounded-b-xl select-none">
            <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
              <div className="flex items-center gap-2 shrink-0">
                <div className={`w-3 h-3 rounded-full shrink-0 ${isBoardFlipped ? 'bg-neutral-900 border border-[#3c3a37]' : 'bg-slate-200 border border-slate-400'}`}></div>
                <span className="text-xs font-bold text-[#E0E0E0] whitespace-nowrap shrink-0">
                  {controller.mode === 'ai' 
                    ? (isBoardFlipped ? 'Bạn (Đen)' : 'Bạn (Trắng)') 
                    : (isBoardFlipped ? 'Quân Đen' : 'Quân Trắng')}
                </span>
              </div>
              {/* Captured items by player (eaten pieces list) */}
              {renderCapturedGrouped(isBoardFlipped ? whiteCaptured : blackCaptured, bottomAdvantage)}
            </div>

            {/* Bottom Timer Clock */}
            {controller.timeLimit && (
              <div className={`px-2.5 py-1 rounded-lg font-mono text-xs font-bold tracking-wider flex items-center gap-1.5 transition-all border ${
                isBottomTurnActive 
                  ? 'bg-amber-950/40 text-amber-400 border-amber-800' 
                  : 'bg-[#312e2b]/50 text-[#8E9299] border-transparent'
              }`}>
                <Clock size={12} className={isBottomTurnActive ? 'animate-pulse' : ''} />
                <span>{formatTime(bottomTime)}</span>
              </div>
            )}
          </div>

          {/* Mobile Fast HUD Control Actions (visible only on mobile) */}
          {!isHistoricalReview && (
            <div className="lg:hidden w-full max-w-[min(720px,68vh)] bg-[#2b2925] border border-[#3c3a37] rounded-2xl p-4 shadow-sm mt-3">
              <div className="flex items-center justify-between gap-2">
                {/* 1. Gợi ý nước đi */}
                <button
                  onClick={handleGetHint}
                  disabled={isBotThinking || isCalculatingSuggestion || outcome.gameOver}
                  title="Gợi ý nước đi"
                  className="flex-1 py-2.5 bg-[#312e2b] hover:bg-[#3c3a37] disabled:opacity-30 disabled:hover:bg-[#312e2b] border border-[#81b64c]/40 text-[#81b64c] rounded-xl flex items-center justify-center cursor-pointer transition-all"
                >
                  <Lightbulb size={18} className={isCalculatingSuggestion ? "animate-pulse text-[#81b64c]" : "text-[#81b64c]"} />
                </button>

                {/* 2. Đi lại */}
                <button
                  onClick={handleUndo}
                  disabled={controller.board.moveHistory.length === 0 || isBotThinking}
                  title="Đi lại"
                  className="flex-1 py-2.5 bg-[#312e2b] hover:bg-[#3c3a37] disabled:opacity-30 disabled:hover:bg-[#312e2b] border border-[#3c3a37] text-[#E0E0E0] rounded-xl flex items-center justify-center cursor-pointer transition-all"
                >
                  <RotateCcw size={18} className="text-[#81b64c]" />
                </button>

                {/* 3. Xin thua */}
                <button
                  onClick={handleResign}
                  disabled={outcome.gameOver}
                  title="Xin thua"
                  className="flex-1 py-2.5 bg-[#312e2b] hover:bg-[#3c3a37] disabled:opacity-30 disabled:hover:bg-[#312e2b] border border-rose-900/50 text-rose-400 rounded-xl flex items-center justify-center cursor-pointer transition-all"
                >
                  <Flag size={18} className={outcome.gameOver ? "opacity-30" : "text-rose-400"} />
                </button>

                {/* 4. Làm mới */}
                <button
                  onClick={handleReset}
                  title="Làm mới"
                  className="flex-1 py-2.5 bg-[#312e2b] hover:bg-[#3c3a37] border border-[#3c3a37] text-[#E0E0E0] rounded-xl flex items-center justify-center cursor-pointer transition-all"
                >
                  <RefreshCw size={18} className="text-[#81b64c]" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Gameplay HUD, Move list, Controls */}
        <div className="lg:col-span-5 xl:col-span-4 h-full flex flex-col gap-4">
          
          {/* Active Status Display Panel */}
          <div className="bg-[#2b2925] text-[#E0E0E0] rounded-2xl p-3 px-4 shadow-md border border-[#3c3a37]">
            <p className="text-[9px] font-bold uppercase tracking-widest text-[#81b64c]/80 font-mono">Trạng Thái Trận Đấu</p>
            <div className="flex items-center justify-between mt-1">
              <span id="game-status-label" className="text-xs font-extrabold text-[#E0E0E0] tracking-wide font-sans">
                {controller.getStatusMessage()}
              </span>
              {isBotThinking && (
                <div className="flex gap-1">
                  <span className="w-1 h-1 rounded-full bg-[#81b64c] animate-zoom animate-pulse"></span>
                  <span className="w-1 h-1 rounded-full bg-[#81b64c] animate-zoom animate-pulse delay-75"></span>
                  <span className="w-1 h-1 rounded-full bg-[#81b64c] animate-zoom animate-pulse delay-150"></span>
                </div>
              )}
            </div>
          </div>

          {/* Move Log History List Table */}
          <div className="bg-[#2b2925] border border-[#3c3a37] rounded-2xl p-3 px-4 flex flex-col">
            <div className="flex items-center justify-between border-b border-[#3c3a37] pb-2 mb-2">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#8E9299]">Biên Bản Các Nước Đi</h4>
              <span className="text-[9px] px-2 py-0.5 bg-[#312e2b] text-[#81b64c] border border-[#3c3a37] font-bold rounded">
                {controller.board.moveHistory.length} Nửa nước
              </span>
            </div>

            {/* Chess.com Move Quality Statistics Summary Header */}
            {(() => {
              const stats = {
                white: { best: 0, excellent: 0, brilliant: 0, great: 0, inaccuracy: 0, mistake: 0, blunder: 0, miss: 0 },
                black: { best: 0, excellent: 0, brilliant: 0, great: 0, inaccuracy: 0, mistake: 0, blunder: 0, miss: 0 }
              };
              history.forEach((m, idx) => {
                const cat = m.analysis;
                if (cat) {
                  const side = idx % 2 === 0 ? 'white' : 'black';
                  if (stats[side][cat] !== undefined) {
                    stats[side][cat]++;
                  }
                }
              });

              // Render empty stats header at start to prevent layout shifts

              return (
                <div className="grid grid-cols-2 gap-3 pb-2.5 mb-2.5 border-b border-[#3c3a37]/50 text-[9px]">
                  {/* White side metrics */}
                  <div className="flex flex-col gap-1 border-r border-[#3c3a37]/40 pr-1.5">
                    <div className="flex justify-between items-center text-[#8E9299] font-extrabold tracking-wider">
                      <span>TRẮNG</span>
                      <span className="text-[8px] opacity-75 font-mono">Đánh giá</span>
                    </div>
                    <div className="grid grid-cols-5 gap-0.5 select-none font-bold text-center">
                      <span className="py-0.5 bg-[#2E3C26] text-emerald-400 rounded-sm whitespace-nowrap flex items-center justify-center gap-0.5" title="Tối ưu nhất (Best / Excellent)">
                        <span className="text-[8px]">★</span>
                        <span>{stats.white.best + stats.white.excellent}</span>
                      </span>
                      <span className="py-0.5 bg-cyan-500/10 text-cyan-400 rounded-sm whitespace-nowrap flex items-center justify-center gap-0.5" title="Tuyệt vời (Brilliant / Great)">
                        <span className="text-[8px]">!!</span>
                        <span>{stats.white.brilliant + stats.white.great}</span>
                      </span>
                      <span className="py-0.5 bg-amber-500/10 text-amber-500 rounded-sm whitespace-nowrap flex items-center justify-center gap-0.5" title="Thiếu chuẩn xác (Inaccuracy)">
                        <span className="text-[8px]">?!</span>
                        <span>{stats.white.inaccuracy}</span>
                      </span>
                      <span className="py-0.5 bg-orange-500/10 text-orange-400 rounded-sm whitespace-nowrap flex items-center justify-center gap-0.5" title="Sai lầm (Mistake)">
                        <span className="text-[8px]">?</span>
                        <span>{stats.white.mistake}</span>
                      </span>
                      <span className="py-0.5 bg-rose-500/10 text-rose-500 rounded-sm whitespace-nowrap flex items-center justify-center gap-0.5" title="Sai sót nặng (Blunder)">
                        <span className="text-[8px]">??</span>
                        <span>{stats.white.blunder + stats.white.miss}</span>
                      </span>
                    </div>
                  </div>

                  {/* Black side metrics */}
                  <div className="flex flex-col gap-1 pl-1.5">
                    <div className="flex justify-between items-center text-[#8E9299] font-extrabold tracking-wider">
                      <span>ĐEN</span>
                      <span className="text-[8px] opacity-75 font-mono">Đánh giá</span>
                    </div>
                    <div className="grid grid-cols-5 gap-0.5 select-none font-bold text-center">
                      <span className="py-0.5 bg-[#2E3C26] text-emerald-400 rounded-sm whitespace-nowrap flex items-center justify-center gap-0.5" title="Tối ưu nhất (Best / Excellent)">
                        <span className="text-[8px]">★</span>
                        <span>{stats.black.best + stats.black.excellent}</span>
                      </span>
                      <span className="py-0.5 bg-cyan-500/10 text-cyan-400 rounded-sm whitespace-nowrap flex items-center justify-center gap-0.5" title="Tuyệt vời (Brilliant / Great)">
                        <span className="text-[8px]">!!</span>
                        <span>{stats.black.brilliant + stats.black.great}</span>
                      </span>
                      <span className="py-0.5 bg-amber-500/10 text-amber-500 rounded-sm whitespace-nowrap flex items-center justify-center gap-0.5" title="Thiếu chuẩn xác (Inaccuracy)">
                        <span className="text-[8px]">?!</span>
                        <span>{stats.black.inaccuracy}</span>
                      </span>
                      <span className="py-0.5 bg-orange-500/10 text-orange-400 rounded-sm whitespace-nowrap flex items-center justify-center gap-0.5" title="Sai lầm (Mistake)">
                        <span className="text-[8px]">?</span>
                        <span>{stats.black.mistake}</span>
                      </span>
                      <span className="py-0.5 bg-rose-500/10 text-rose-500 rounded-sm whitespace-nowrap flex items-center justify-center gap-0.5" title="Sai sót nặng (Blunder)">
                        <span className="text-[8px]">??</span>
                        <span>{stats.black.blunder + stats.black.miss}</span>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Pairs list scrollbox */}
            <div 
              ref={scrollContainerRef}
              className="overflow-y-auto h-[88px] min-h-[88px] max-h-[88px] pr-1 space-y-1 custom-scrollbar text-[11px]"
            >
              {pairedMoves.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-3 text-slate-500 h-full">
                  <Swords size={16} className="opacity-55 stroke-1 mb-0.5 text-[#81b64c]" />
                  <span className="text-[10px]">Khai cuộc chưa bắt đầu</span>
                </div>
              ) : (
              pairedMoves.map((m) => {
                const whiteIdx = (m.round - 1) * 2 + 1;
                const blackIdx = (m.round - 1) * 2 + 2;
                const isWhiteActive = isReviewMode && reviewIndex === whiteIdx;
                const isBlackActive = isReviewMode && reviewIndex === blackIdx;

                const whiteMove = history[whiteIdx - 1];
                const blackMove = blackIdx - 1 < history.length ? history[blackIdx - 1] : undefined;

                const whiteAnalysis = whiteMove?.analysis;
                const blackAnalysis = blackMove?.analysis;

                const whiteDetails = whiteAnalysis ? getAnalysisDetails(whiteAnalysis) : null;
                const blackDetails = blackAnalysis ? getAnalysisDetails(blackAnalysis) : null;

                return (
                  <div key={m.round} className="grid grid-cols-12 py-1 px-2 bg-[#312e2b]/30 hover:bg-[#312e2b] rounded font-mono text-center border-b border-[#3c3a37]/10 items-center">
                    <span className="col-span-2 text-[#8E9299] font-semibold text-left">{m.round}.</span>
                    <span 
                      onClick={() => {
                        if (isReviewMode) {
                          setReviewIndex(whiteIdx);
                          forceUpdate();
                        }
                      }}
                      className={`col-span-5 flex items-center justify-between font-bold text-left transition-all px-1.5 py-0.5 border border-transparent rounded ${isReviewMode ? 'cursor-pointer hover:text-[#81b64c]' : ''} ${isWhiteActive ? 'text-[#81b64c] bg-[#81b64c]/10 border-[#81b64c]/30' : 'text-[#E0E0E0]'}`}
                    >
                      <span className="truncate">{m.white}</span>
                      {whiteDetails && whiteAnalysis && (
                        <span 
                          title={whiteDetails.label} 
                          className="flex items-center ml-1 cursor-help transform hover:scale-110 transition"
                        >
                          <AnalysisIcon category={whiteAnalysis} size={15} />
                        </span>
                      )}
                    </span>
                    <span 
                      onClick={() => {
                        if (m.black && isReviewMode) {
                          setReviewIndex(blackIdx);
                          forceUpdate();
                        }
                      }}
                      className={`col-span-5 flex items-center justify-between text-left transition-all px-1.5 py-0.5 border border-transparent rounded ${isReviewMode && m.black ? 'cursor-pointer hover:text-[#81b64c]' : ''} ${isBlackActive ? 'text-[#81b64c] bg-[#81b64c]/10 border-[#81b64c]/30 font-bold' : 'text-[#8E9299] font-medium'}`}
                    >
                      <span className="truncate">{m.black || '...'}</span>
                      {blackDetails && blackAnalysis && (
                        <span 
                          title={blackDetails.label} 
                          className="flex items-center ml-1 cursor-help transform hover:scale-110 transition"
                        >
                          <AnalysisIcon category={blackAnalysis} size={15} />
                        </span>
                      )}
                    </span>
                  </div>
                );
              })
              )}
            </div>
          </div>

          {/* REAL-TIME ENGINE ANALYSIS PANEL REMOVED */}

          {/* Fast HUD Control Actions */}
          <div className={`${isHistoricalReview ? '' : 'hidden lg:block'} bg-[#2b2925] border border-[#3c3a37] rounded-2xl p-5 shadow-sm space-y-3`}>
            {isHistoricalReview ? (
              <div className="space-y-3 text-center">
                <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-400">
                  <History size={16} className="text-[#81b64c]" />
                  <span>Chế độ Xem lại Lịch sử Đấu</span>
                </div>
                <button
                  onClick={onExit}
                  className="w-full py-2.5 bg-[#81b64c] hover:opacity-90 text-[#0F0F11] text-xs font-bold rounded-lg cursor-pointer transition-all uppercase tracking-wider"
                >
                  Trở Lại Sảnh Chính
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2">
                  {/* 1. Gợi ý nước đi */}
                  <button
                    onClick={handleGetHint}
                    disabled={isBotThinking || isCalculatingSuggestion || outcome.gameOver}
                    title="Gợi ý nước đi"
                    className="flex-1 py-2.5 bg-[#312e2b] hover:bg-[#3c3a37] disabled:opacity-30 disabled:hover:bg-[#312e2b] border border-[#81b64c]/40 text-[#81b64c] rounded-xl flex items-center justify-center cursor-pointer transition-all"
                  >
                    <Lightbulb size={18} className={isCalculatingSuggestion ? "animate-pulse text-[#81b64c]" : "text-[#81b64c]"} />
                  </button>

                  {/* 2. Đi lại */}
                  <button
                    onClick={handleUndo}
                    disabled={controller.board.moveHistory.length === 0 || isBotThinking}
                    title="Đi lại"
                    className="flex-1 py-2.5 bg-[#312e2b] hover:bg-[#3c3a37] disabled:opacity-30 disabled:hover:bg-[#312e2b] border border-[#3c3a37] text-[#E0E0E0] rounded-xl flex items-center justify-center cursor-pointer transition-all"
                  >
                    <RotateCcw size={18} className="text-[#81b64c]" />
                  </button>

                  {/* 3. Xin thua */}
                  <button
                    onClick={handleResign}
                    disabled={outcome.gameOver}
                    title="Xin thua"
                    className="flex-1 py-2.5 bg-[#312e2b] hover:bg-[#3c3a37] disabled:opacity-30 disabled:hover:bg-[#312e2b] border border-rose-900/50 text-rose-400 rounded-xl flex items-center justify-center cursor-pointer transition-all"
                  >
                    <Flag size={18} className={outcome.gameOver ? "opacity-30" : "text-rose-400"} />
                  </button>

                  {/* 4. Làm mới */}
                  <button
                    onClick={handleReset}
                    title="Làm mới"
                    className="flex-1 py-2.5 bg-[#312e2b] hover:bg-[#3c3a37] border border-[#3c3a37] text-[#E0E0E0] rounded-xl flex items-center justify-center cursor-pointer transition-all"
                  >
                    <RefreshCw size={18} className="text-[#81b64c]" />
                  </button>
                </div>
              </>
            )}
          </div>

          {/* New Review Mode Navigation and Details Cards */}
          {isReviewMode && (
            <div className="bg-[#2b2925] border border-[#81b64c]/35 rounded-2xl p-4 shadow-md flex flex-col gap-3 select-none animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-[#81b64c] uppercase tracking-widest">
                  {isHistoricalReview ? 'Lịch Sử Đấu' : 'Xem Lại Trận Đấu'}
                </span>
                <span className="text-xs text-[#E0E0E0]">
                  Nước đi: <strong className="text-white font-mono">{reviewIndex}</strong> / {controller.board.moveHistory.length}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 bg-[#312e2b] p-1 rounded-xl border border-[#3c3a37] flex-1 justify-center">
                  <button
                    onClick={() => {
                      setReviewIndex(0);
                      forceUpdate();
                    }}
                    disabled={reviewIndex === 0}
                    className="px-2.5 py-1.5 text-[10px] bg-[#2b2925] hover:bg-[#3c3a37] disabled:opacity-30 border border-[#3c3a37] cursor-pointer rounded-lg text-slate-300 font-bold transition font-mono uppercase"
                    title="Về đầu ván"
                  >
                    Đầu
                  </button>
                  <button
                    onClick={() => {
                      setReviewIndex(prev => Math.max(0, prev - 1));
                      forceUpdate();
                    }}
                    disabled={reviewIndex === 0}
                    className="px-3 py-1.5 text-xs bg-[#2b2925] hover:bg-[#3c3a37] disabled:opacity-30 border border-[#3c3a37] cursor-pointer rounded-lg text-[#81b64c] font-black transition-all"
                    title="Nước trước"
                  >
                    &lt;
                  </button>
                  <button
                    onClick={() => {
                      setReviewIndex(prev => Math.min(controller.board.moveHistory.length, prev + 1));
                      forceUpdate();
                    }}
                    disabled={reviewIndex === controller.board.moveHistory.length}
                    className="px-3 py-1.5 text-xs bg-[#2b2925] hover:bg-[#3c3a37] disabled:opacity-30 border border-[#3c3a37] cursor-pointer rounded-lg text-[#81b64c] font-black transition-all"
                    title="Nước tiếp theo"
                  >
                    &gt;
                  </button>
                  <button
                    onClick={() => {
                      setReviewIndex(controller.board.moveHistory.length);
                      forceUpdate();
                    }}
                    disabled={reviewIndex === controller.board.moveHistory.length}
                    className="px-2.5 py-1.5 text-[10px] bg-[#2b2925] hover:bg-[#3c3a37] disabled:opacity-30 border border-[#3c3a37] cursor-pointer rounded-lg text-slate-300 font-bold transition font-mono uppercase"
                    title="Đến nước cuối"
                  >
                    Cuối
                  </button>
                </div>

                <button
                  onClick={() => {
                    if (isHistoricalReview) {
                      onExit();
                    } else {
                      setIsReviewMode(false);
                    }
                    forceUpdate();
                  }}
                  className="px-3.5 py-2 bg-rose-950/40 hover:bg-rose-950/60 border border-rose-900/50 text-rose-300 hover:text-rose-200 text-[10px] font-bold rounded-xl cursor-pointer transition uppercase tracking-wider text-center"
                >
                  Thoát
                </button>
              </div>
            </div>
          )}

          {isReviewMode && reviewedMove && reviewedDetails && (
            <div className="bg-[#1A1A20] border border-[#3c3a37] rounded-2xl p-3 px-4 shadow-md select-none animate-fade-in h-[94px] min-h-[94px] max-h-[94px] overflow-hidden flex items-center">
              <div className="flex items-start gap-3 w-full h-full">
                <div className="flex-none flex items-center justify-center select-none pt-0.5">
                  <AnalysisIcon category={reviewedMove.analysis} size={32} />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-between h-full">
                  <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                    <span className="text-[10px] font-bold text-white font-mono uppercase bg-[#262630] px-1.5 py-0.5 rounded border border-[#3A3A4A] shrink-0">
                      {reviewedMove.notation}
                    </span>
                    <span className="text-[9px] text-slate-400 font-medium shrink-0">bởi</span>
                    <span className="text-[10px] font-bold text-[#E0E0E0] underline decoration-[#D4AF37] truncate shrink-0">
                      {reviewedMove.piece.color === Color.WHITE ? 'Bên Trắng' : 'Bên Đen'}
                    </span>
                    <span className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded ml-auto truncate shrink-0 ${reviewedDetails.colorClass} ${reviewedDetails.bgColorClass} border ${reviewedDetails.borderColorClass}`}>
                      {reviewedDetails.label}
                    </span>
                  </div>
                  <div className="overflow-y-auto custom-scrollbar h-[36px] min-h-[36px] max-h-[36px] mt-1 pr-0.5">
                    <p className="text-[10.5px] text-[#A8B2C1] leading-relaxed">
                      {reviewedDetails.description}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
