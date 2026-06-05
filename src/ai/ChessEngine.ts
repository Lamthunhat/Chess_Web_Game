import { Board } from '../model/Board';
import { Move } from '../model/Move';
import { Color } from '../model/Piece';
import { evaluateBoard } from './Evaluation';

export class ChessEngine {
  // Calculates the best move for the active player
  static getBestMove(board: Board, difficulty: number): Move | null {
    const activeColor = board.activeTurn;
    const allMoves = board.getAllMovesForPlayer(activeColor);

    if (allMoves.length === 0) return null;

    // Map ELO difficulty (200 - 2000) or old level difficulty (1 - 4) to search depth
    let depth = 2;
    let isEasy = false;

    if (difficulty <= 4) {
      depth = difficulty;
      isEasy = difficulty === 1;
    } else {
      if (difficulty <= 700) {
        depth = 1;
        isEasy = true;
      } else if (difficulty <= 1200) {
        depth = 2;
      } else if (difficulty <= 1700) {
        depth = 3;
      } else {
        depth = 4;
      }
    }

    // Easy: 25% chance of picking a random valid move to feel humanely clumsy
    if (isEasy && Math.random() < 0.25) {
      const idx = Math.floor(Math.random() * allMoves.length);
      return allMoves[idx];
    }

    const isWhite = activeColor === Color.WHITE;

    // Order moves to maximize alpha-beta pruning speed
    const orderedMoves = this.orderMoves(allMoves);

    let bestMove: Move | null = null;
    let alpha = -Infinity;
    let beta = Infinity;

    if (isWhite) {
      let maxScore = -Infinity;
      for (const move of orderedMoves) {
        const nextBoard = board.clone();
        nextBoard.executeMove(move);
        const score = this.minimax(nextBoard, depth - 1, alpha, beta, false);
        if (score > maxScore) {
          maxScore = score;
          bestMove = move;
        }
        alpha = Math.max(alpha, maxScore);
        if (beta <= alpha) break; // Pruning
      }
    } else {
      let minScore = Infinity;
      for (const move of orderedMoves) {
        const nextBoard = board.clone();
        nextBoard.executeMove(move);
        const score = this.minimax(nextBoard, depth - 1, alpha, beta, true);
        if (score < minScore) {
          minScore = score;
          bestMove = move;
        }
        beta = Math.min(beta, minScore);
        if (beta <= alpha) break; // Pruning
      }
    }

    // Fallback in case of identical evaluations
    if (!bestMove && allMoves.length > 0) {
      return allMoves[0];
    }

    return bestMove;
  }

  private static minimax(
    board: Board,
    depth: number,
    alpha: number,
    beta: number,
    isMaximizingPlayer: boolean
  ): number {
    // Terminal nodes check
    if (board.isInCheck(Color.WHITE) || board.isInCheck(Color.BLACK)) {
      // If checkmate
      if (board.isCheckmate(Color.WHITE)) return -99999 + (4 - depth); // Prefer faster mates
      if (board.isCheckmate(Color.BLACK)) return 99999 - (4 - depth);
    }
    if (board.isDraw()) return 0;
    if (depth === 0) return evaluateBoard(board);

    const activeColor = board.activeTurn;
    const moves = this.orderMoves(board.getAllMovesForPlayer(activeColor));

    if (moves.length === 0) {
      if (board.isInCheck(activeColor)) {
        return isMaximizingPlayer ? -99999 : 99999;
      }
      return 0; // Stalemate
    }

    if (isMaximizingPlayer) {
      let maxScore = -Infinity;
      for (const move of moves) {
        const nextBoard = board.clone();
        nextBoard.executeMove(move);
        const score = this.minimax(nextBoard, depth - 1, alpha, beta, false);
        maxScore = Math.max(maxScore, score);
        alpha = Math.max(alpha, maxScore);
        if (beta <= alpha) break; // Pruning
      }
      return maxScore;
    } else {
      let minScore = Infinity;
      for (const move of moves) {
        const nextBoard = board.clone();
        nextBoard.executeMove(move);
        const score = this.minimax(nextBoard, depth - 1, alpha, beta, true);
        minScore = Math.min(minScore, score);
        beta = Math.min(beta, minScore);
        if (beta <= alpha) break; // Pruning
      }
      return minScore;
    }
  }

  // Sorts moves to optimize Alpha-Beta cuts. Captures and promotions go first.
  private static orderMoves(moves: Move[]): Move[] {
    return [...moves].sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;

      // Capture scoring: e.g. capturing high value piece with low value piece is awesome
      if (a.captured) {
        scoreA += 10 + (this.getPieceScoreValue(a.captured.type) - this.getPieceScoreValue(a.piece.type) * 0.1);
      }
      if (b.captured) {
        scoreB += 10 + (this.getPieceScoreValue(b.captured.type) - this.getPieceScoreValue(b.piece.type) * 0.1);
      }

      // Promotion check
      if (a.promotion) scoreA += 8;
      if (b.promotion) scoreB += 8;

      // Checking checks can be powerful, but might require too much processing.
      // Castling carries some weight
      if (a.isCastling) scoreA += 2;
      if (b.isCastling) scoreB += 2;

      return scoreB - scoreA;
    });
  }

  private static getPieceScoreValue(type: string): number {
    switch (type) {
      case 'pawn': return 1;
      case 'knight': return 3;
      case 'bishop': return 3;
      case 'rook': return 5;
      case 'queen': return 9;
      case 'king': return 100;
      default: return 0;
    }
  }
}
