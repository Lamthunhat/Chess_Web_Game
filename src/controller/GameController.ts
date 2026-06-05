import { Board } from '../model/Board';
import { ChessPiece, Color, PieceType } from '../model/Piece';
import { Move } from '../model/Move';
import { ChessEngine } from '../ai/ChessEngine';
import { UserManager } from '../model/User';
import { sound } from '../utils/sound';
import { analyzeMove } from '../utils/analysis';

export class GameController {
  board: Board;
  mode: 'local' | 'ai';
  botDifficulty: number;
  playerColor: Color; // The human colors (mostly White)
  timeLimit: number | null = null; // Countdown time limit in seconds per side
  
  selectedSquare: { row: number; col: number } | null = null;
  validMoves: Move[] = [];
  promotionPendingMove: Move | null = null; // Holds a move waiting for pawn promotion selection
  onStateChangeCallback?: () => void; // Registered update callback for global state updates
  resignedColor: Color | null = null; // Keeps track of which player resigned

  // Captured trackings
  capturedPieces: {
    white: ChessPiece[];
    black: ChessPiece[];
  } = { white: [], black: [] };

  constructor(mode: 'local' | 'ai', botDifficulty: number, playerColor: 'white' | 'black' | 'random', timeLimit: number | null = null) {
    this.board = new Board();
    this.mode = mode;
    this.botDifficulty = botDifficulty;
    this.timeLimit = timeLimit;

    if (playerColor === 'random') {
      this.playerColor = Math.random() < 0.5 ? Color.WHITE : Color.BLACK;
    } else {
      this.playerColor = playerColor === 'white' ? Color.WHITE : Color.BLACK;
    }
  }

  // Handle a tile being clicked
  handleSquareClick(
    row: number,
    col: number,
    onStateChange: () => void,
    onPromotionPrompt: (move: Move) => void
  ): void {
    if (this.isGameOver()) return;

    const currentTurn = this.board.activeTurn;
    
    // Check if player is allowed to move right now (cannot move Bot's pieces or during Bot's thinking session)
    const isBotTurn = this.mode === 'ai' && currentTurn !== this.playerColor;
    if (isBotTurn) return;

    const clickedPiece = this.board.getPiece(row, col);

    // Dynamic Select/Reselect piece of same team
    if (clickedPiece && clickedPiece.color === currentTurn) {
      if (this.selectedSquare && this.selectedSquare.row === row && this.selectedSquare.col === col) {
        // Deselect if clicked twice!
        this.selectedSquare = null;
        this.validMoves = [];
        onStateChange();
        return;
      }
      this.selectedSquare = { row, col };
      this.validMoves = this.board.generateValidMoves(row, col);
      onStateChange();
      return;
    }

    // Attempting to complete a move if a piece is selected
    if (this.selectedSquare) {
      const matchMove = this.validMoves.find(m => m.toRow === row && m.toCol === col);
      if (matchMove) {
        // Promotion check: Pawn reaching back row
        const isPromotion =
          matchMove.piece.type === PieceType.PAWN &&
          (matchMove.toRow === 0 || matchMove.toRow === 7);

        if (isPromotion) {
          this.promotionPendingMove = matchMove;
          onPromotionPrompt(matchMove);
        } else {
          this.makeMove(matchMove);
          this.selectedSquare = null;
          this.validMoves = [];
          onStateChange();

          // If AI mode, trigger the bot response with delayed timing (2s)
          if (this.mode === 'ai' && !this.isGameOver()) {
            setTimeout(() => {
              this.handleBotTurn();
              onStateChange();
              if (this.onStateChangeCallback) this.onStateChangeCallback();
            }, 2000);
          }
        }
      } else {
        // Deselect if clicking an invalid square
        this.selectedSquare = null;
        this.validMoves = [];
        onStateChange();
      }
    }
  }

  // Completes a specific promotion move
  selectPromotion(pieceType: PieceType, onStateChange: () => void): void {
    if (!this.promotionPendingMove) return;
    
    const finalizedMove: Move = {
      ...this.promotionPendingMove,
      promotion: pieceType
    };

    this.promotionPendingMove = null;
    this.makeMove(finalizedMove);
    this.selectedSquare = null;
    this.validMoves = [];
    onStateChange();

    // Trigger AI with delayed timing (2s)
    if (this.mode === 'ai' && !this.isGameOver()) {
      setTimeout(() => {
        this.handleBotTurn();
        onStateChange();
        if (this.onStateChangeCallback) this.onStateChangeCallback();
      }, 2000);
    }
  }

  cancelPromotion(onStateChange: () => void): void {
    this.promotionPendingMove = null;
    this.selectedSquare = null;
    this.validMoves = [];
    onStateChange();
  }

  // Apply move in model structures
  private makeMove(move: Move): void {
    // Record Captured
    if (move.captured) {
      if (move.captured.color === Color.WHITE) {
        this.capturedPieces.white.push(move.captured);
      } else {
        this.capturedPieces.black.push(move.captured);
      }
    }

    const boardBefore = this.board.clone();

    this.board.executeMove(move);

    if (!move.analysis) {
      move.analysis = analyzeMove(boardBefore, move, boardBefore.moveHistory.length);
    }

    let playedSound = false;

    // Post-move checkmate / stalemate assessment
    const activeColor = this.board.activeTurn;
    const historyLen = this.board.moveHistory.length;
    if (historyLen > 0) {
      const lastMove = this.board.moveHistory[historyLen - 1];
      
      // Annotate Check or Mate symbol to Move History
      if (this.board.isCheckmate(activeColor)) {
        lastMove.notation += '#';
        this.concludeGameAndLogResult();
        const isPlayerWin = this.mode === 'ai' ? (activeColor !== this.playerColor) : true;
        sound.playCheckmate(isPlayerWin);
        playedSound = true;
      } else if (this.board.isInCheck(activeColor)) {
        lastMove.notation += '+';
        sound.playCheck();
        playedSound = true;
      } else if (this.board.isDraw()) {
        this.concludeGameAndLogResult();
        sound.playStalemate();
        playedSound = true;
      }
    }

    if (!playedSound) {
      const isCastle = move.piece.type === PieceType.KING && Math.abs(move.fromCol - move.toCol) === 2;
      const isPromotion = !!move.promotion;
      const isCapture = !!move.captured;

      if (isPromotion) {
        sound.playPromotion();
      } else if (isCastle) {
        sound.playCastle();
      } else if (isCapture) {
        sound.playCapture();
      } else {
        sound.playMove();
      }
    }
  }

  // Computer move calculation and play
  handleBotTurn(): void {
    if (this.isGameOver()) return;

    const botColor = this.board.activeTurn;
    const botMove = ChessEngine.getBestMove(this.board, this.botDifficulty);

    if (botMove) {
      this.makeMove(botMove);
    } else {
      // If mate or draw
      this.concludeGameAndLogResult();
    }
  }

  // Checks and archives the match in User History
  private concludeGameAndLogResult(): void {
    let result: 'win' | 'loss' | 'draw' = 'draw';
    let opponentLabel = '';
    let recordedColor: 'white' | 'black' = 'white';

    if (this.mode === 'ai') {
      const isBotColorWhite = this.playerColor !== Color.WHITE;

      if (this.resignedColor !== null) {
        result = this.resignedColor === this.playerColor ? 'loss' : 'win';
      } else if (this.timedOutColor !== null) {
        result = this.timedOutColor === this.playerColor ? 'loss' : 'win';
      } else if (this.board.isCheckmate(this.playerColor)) {
        result = 'loss';
      } else if (this.board.isCheckmate(isBotColorWhite ? Color.WHITE : Color.BLACK)) {
        result = 'win';
      } else if (this.board.isDraw()) {
        result = 'draw';
      } else {
        return; // Not completed yet
      }

      if (this.botDifficulty <= 4) {
        const diffNames = ['Tập Sự', 'Trung Cấp', 'Chuyên Nghiệp', 'Cao Thủ'];
        opponentLabel = `BOT ${diffNames[this.botDifficulty - 1] || 'Cổ Điển'}`;
      } else {
        opponentLabel = `BOT (${this.botDifficulty} Elo)`;
      }
      recordedColor = this.playerColor === Color.WHITE ? 'white' : 'black';
    } else {
      // Local mode
      if (this.resignedColor !== null) {
        result = this.resignedColor === Color.WHITE ? 'loss' : 'win';
      } else if (this.timedOutColor !== null) {
        result = this.timedOutColor === Color.WHITE ? 'loss' : 'win';
      } else if (this.board.isCheckmate(Color.WHITE)) {
        result = 'loss'; // White lost
      } else if (this.board.isCheckmate(Color.BLACK)) {
        result = 'win'; // White won (Black lost)
      } else if (this.board.isDraw()) {
        result = 'draw';
      } else {
        return; // Not completed yet
      }
      opponentLabel = 'Hai người chơi';
      recordedColor = 'white';
    }

    const movesList = this.board.moveHistory.map(m => m.notation || '');

    UserManager.addGameToHistory(
      opponentLabel,
      recordedColor,
      result,
      movesList
    );
  }

  // Resets game structures
  resetGame(): void {
    this.board = new Board();
    this.selectedSquare = null;
    this.validMoves = [];
    this.promotionPendingMove = null;
    this.capturedPieces = { white: [], black: [] };
    this.resignedColor = null;
    this.timedOutColor = null;

    sound.playGameStart();

    // If AI mode and Bot color is white, Bot makes the initial move with delayed timing (2s)
    if (this.mode === 'ai' && this.playerColor === Color.BLACK) {
      setTimeout(() => {
        this.handleBotTurn();
        if (this.onStateChangeCallback) this.onStateChangeCallback();
      }, 2000);
    }
  }

  // Regress 1 move (local) or 2 moves (AI mode)
  undoLastMove(): void {
    if (this.board.moveHistory.length === 0) return;

    if (this.mode === 'local') {
      this.popLastMove();
    } else {
      // Retracting Bot's response + User's move if possible
      if (this.board.moveHistory.length >= 2) {
        this.popLastMove();
        this.popLastMove();
      } else {
        // Pop just 1 if Black (Bot) had completed initial turn
        this.popLastMove();
      }
    }
    this.selectedSquare = null;
    this.validMoves = [];
  }

  private popLastMove(): void {
    const history = this.board.moveHistory;
    if (history.length === 0) return;

    // Pop the move from history
    history.pop();

    // Rebuild complete board from scratch using history moves to ensure flawless states!
    // This is mathematically elegant and prevents messy undo state tracking!
    const newBoard = new Board();
    const newCaptured: { white: ChessPiece[]; black: ChessPiece[] } = { white: [], black: [] };

    for (const historicMove of history) {
      if (historicMove.captured) {
        if (historicMove.captured.color === Color.WHITE) {
          newCaptured.white.push(historicMove.captured);
        } else {
          newCaptured.black.push(historicMove.captured);
        }
      }
      newBoard.executeMove(historicMove);
    }

    this.board = newBoard;
    this.capturedPieces = newCaptured;
  }

  // Declares resignation
  resign(onStateChange: () => void): void {
    if (this.isGameOver()) return;

    this.resignedColor = this.board.activeTurn;

    this.concludeGameAndLogResult();
    
    // Play game-over loss/win sound based on which team resigned
    const isPlayerWin = this.resignedColor !== this.playerColor;
    sound.playGameOver(isPlayerWin);

    onStateChange();
  }

  timedOutColor: Color | null = null; // Keeps track of who timed out on countdown

  // Declares timeout
  triggerTimeout(onStateChange: () => void): void {
    if (this.isGameOver()) return;

    this.timedOutColor = this.board.activeTurn;

    this.concludeGameAndLogResult();
    
    // Play game-over loss/win sound based on which team timed out
    const isPlayerWin = this.timedOutColor !== this.playerColor;
    sound.playGameOver(isPlayerWin);

    onStateChange();
  }

  isGameOver(): boolean {
    if (this.resignedColor !== null) return true;
    if (this.timedOutColor !== null) return true;
    const activeColor = this.board.activeTurn;
    return this.board.isCheckmate(activeColor) || this.board.isDraw();
  }

  getGameOutcome(): { gameOver: boolean; title: string; subtitle: string; score: string } {
    if (this.timedOutColor !== null) {
      const winnerColor = this.timedOutColor === Color.WHITE ? Color.BLACK : Color.WHITE;
      if (this.mode === 'ai') {
        const isPlayerTimedOut = this.timedOutColor === this.playerColor;
        const scoreVal = this.playerColor === Color.WHITE ? '0 - 1' : '1 - 0';
        return {
          gameOver: true,
          title: isPlayerTimedOut ? 'Bạn đã hết giờ!' : 'BOT đã hết giờ!',
          subtitle: isPlayerTimedOut ? 'Thời gian của bạn đã trôi sạch. Bạn bị xử thua trên thời gian (Flagged).' : 'BOT máy đã hết thời gian thực thi nước đi. Bạn giành chiến thắng.',
          score: scoreVal
        };
      } else {
        const timedOutName = this.timedOutColor === Color.WHITE ? 'Quân Trắng' : 'Quân Đen';
        const winnerName = winnerColor === Color.WHITE ? 'Quân Trắng' : 'Quân Đen';
        const scoreVal = winnerColor === Color.WHITE ? '1 - 0' : '0 - 1';
        return {
          gameOver: true,
          title: `${timedOutName} hết giờ!`,
          subtitle: `${winnerName} đạt chiến thắng do đối phương cạn kiệt thời gian.`,
          score: scoreVal
        };
      }
    }

    if (this.resignedColor !== null) {
      const winnerColor = this.resignedColor === Color.WHITE ? Color.BLACK : Color.WHITE;
      if (this.mode === 'ai') {
        const isPlayerResigned = this.resignedColor === this.playerColor;
        const scoreVal = this.playerColor === Color.WHITE ? '0 - 1' : '1 - 0'; // Resigned player gets 0, opponent gets 1
        return {
          gameOver: true,
          title: isPlayerResigned ? 'Bạn đã đầu hàng' : 'BOT đã đầu hàng',
          subtitle: isPlayerResigned ? 'Bạn đã chấp nhận thất bại và xin thua.' : 'BOT máy đã tự nhận thua và dâng chiến thắng cho bạn.',
          score: scoreVal
        };
      } else {
        const resignerName = this.resignedColor === Color.WHITE ? 'Quân Trắng' : 'Quân Đen';
        const winnerName = winnerColor === Color.WHITE ? 'Quân Trắng' : 'Quân Đen';
        const scoreVal = winnerColor === Color.WHITE ? '1 - 0' : '0 - 1';
        return {
          gameOver: true,
          title: `${resignerName} đầu hàng`,
          subtitle: `${winnerName} đạt chiến thắng chung cuộc.`,
          score: scoreVal
        };
      }
    }

    const checkmateWhite = this.board.isCheckmate(Color.WHITE);
    const checkmateBlack = this.board.isCheckmate(Color.BLACK);
    const draw = this.board.isDraw();

    if (checkmateWhite) {
      const msg = this.mode === 'ai' && this.playerColor === Color.WHITE ? 'Thất bại!' : 'Quân Đen Thắng!';
      return {
        gameOver: true,
        title: msg,
        subtitle: 'Bên Đen đã chiếu bí bên Trắng thành công.',
        score: '0 - 1'
      };
    }

    if (checkmateBlack) {
      const msg = this.mode === 'ai' && this.playerColor === Color.BLACK ? 'Thất bại!' : 'Quân Trắng Thắng!';
      return {
        gameOver: true,
        title: msg,
        subtitle: 'Bên Trắng đã chiếu bí bên Đen thành công.',
        score: '1 - 0'
      };
    }

    if (draw) {
      let drawType = 'Hòa cờ';
      if (this.board.isStalemate(this.board.activeTurn)) drawType = 'Hòa do hết nước đi pháp định (Stalemate)';
      else if (this.board.halfmoveClock >= 100) drawType = 'Hòa do luật 50 nước đi không ăn quân/đẩy tốt';
      else if (this.board.hasInsufficientMaterial()) drawType = 'Hòa do không đủ quân lực chiếu bí';
      else if (this.board.isThreefoldRepetition()) drawType = 'Hòa do lặp lại thế cờ 3 lần (Threefold Repetition)';

      return {
        gameOver: true,
        title: 'Hòa Cờ!',
        subtitle: drawType,
        score: '½ - ½'
      };
    }

    return {
      gameOver: false,
      title: '',
      subtitle: '',
      score: ''
    };
  }

  getStatusMessage(): string {
    if (this.isGameOver()) {
      return 'Trận đấu kết thúc';
    }

    const turn = this.board.activeTurn;
    const isBot = this.mode === 'ai' && turn !== this.playerColor;

    if (isBot) {
      return 'Máy (BOT) đang tính toán...';
    }

    const tag = turn === Color.WHITE ? 'Bên Trắng' : 'Bên Đen';
    const suffix = ' tới lượt đi';

    if (this.board.isInCheck(turn)) {
      return `⚠️ CHIẾU TƯỚNG! - ${tag}${suffix}`;
    }

    return `${tag}${suffix}`;
  }
}
