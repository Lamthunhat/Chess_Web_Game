import { Board } from '../model/Board';
import { Color, PieceType } from '../model/Piece';

// Positional values (Piece-Square Tables) for White. 
// Black will use these tables flipped vertically.
// Top is row 0 (rank 8, Black start), bottom is row 7 (rank 1, White start).

const pawnPST = [
  [0,  0,  0,  0,  0,  0,  0,  0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5,  5, 10, 25, 25, 10,  5,  5],
  [0,  0,  0, 20, 20,  0,  0,  0],
  [5, -5,-10,  0,  0,-10, -5,  5],
  [5, 10, 10,-20,-20, 10, 10,  5],
  [0,  0,  0,  0,  0,  0,  0,  0]
];

const knightPST = [
  [-50,-40,-30,-30,-30,-30,-40,-50],
  [-40,-20,  0,  0,  0,  0,-20,-40],
  [-30,  0, 10, 15, 15, 10,  0,-30],
  [-30,  5, 15, 20, 20, 15,  5,-30],
  [-30,  0, 15, 20, 20, 15,  0,-30],
  [-30,  5, 10, 15, 15, 10,  5,-30],
  [-40,-20,  0,  5,  5,  0,-20,-40],
  [-50,-40,-30,-30,-30,-30,-40,-50]
];

const bishopPST = [
  [-20,-10,-10,-10,-10,-10,-10,-20],
  [-10,  0,  0,  0,  0,  0,  0,-10],
  [-10,  0,  5, 10, 10,  5,  0,-10],
  [-10,  5,  5, 10, 10,  5,  5,-10],
  [-10,  0, 10, 10, 10, 10,  0,-10],
  [-10, 10, 10, 10, 10, 10, 10,-10],
  [-10,  5,  0,  0,  0,  0,  5,-10],
  [-20,-10,-10,-10,-10,-10,-10,-20]
];

const rookPST = [
  [0,  0,  0,  0,  0,  0,  0,  0],
  [5, 10, 10, 10, 10, 10, 10,  5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [0,  0,  0,  5,  5,  0,  0,  0]
];

const queenPST = [
  [-20,-10,-10, -5, -5,-10,-10,-20],
  [-10,  0,  0,  0,  0,  0,  0,-10],
  [-10,  0,  5,  5,  5,  5,  0,-10],
  [-5,  0,  5,  5,  5,  5,  0, -5],
  [0,  0,  5,  5,  5,  5,  0, -5],
  [-10,  5,  5,  5,  5,  5,  0,-10],
  [-10,  0,  5,  0,  0,  5,  0,-10],
  [-20,-10,-10, -5, -5,-10,-10,-20]
];

const kingMiddlePST = [
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-20,-30,-30,-40,-40,-30,-30,-20],
  [-10,-20,-20,-20,-20,-20,-20,-10],
  [20, 20,  0,  0,  0,  0, 20, 20],
  [20, 30, 10,  0,  0, 10, 30, 20]
];

// In the endgame, the king is driven to the center to assist pawns
const kingEndGamePST = [
  [-50,-40,-30,-20,-20,-30,-40,-50],
  [-30,-20,-10,  0,  0,-10,-20,-30],
  [-30,-10, 20, 30, 30, 20,-10,-30],
  [-30,-10, 30, 40, 40, 30,-10,-30],
  [-30,-10, 30, 40, 40, 30,-10,-30],
  [-30,-10, 20, 30, 30, 20,-10,-30],
  [-30,-30,  0,  0,  0,  0,-30,-30],
  [-50,-30,-30,-30,-30,-30,-30,-50]
];

export function evaluateBoard(board: Board): number {
  let score = 0;
  const grid = board.grid;

  // Let's count pieces to determine if it is Endgame (queens are gone or very few major pieces remain)
  let totalWhitePiecesCount = 0;
  let totalBlackPiecesCount = 0;
  let whiteHasQueen = false;
  let blackHasQueen = false;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = grid[r][c];
      if (piece) {
        if (piece.color === Color.WHITE) {
          totalWhitePiecesCount++;
          if (piece.type === PieceType.QUEEN) whiteHasQueen = true;
        } else {
          totalBlackPiecesCount++;
          if (piece.type === PieceType.QUEEN) blackHasQueen = true;
        }
      }
    }
  }

  // End game condition
  const isEndGame = (!whiteHasQueen && !blackHasQueen) || 
                    (totalWhitePiecesCount <= 3 && totalBlackPiecesCount <= 3);

  // Pieces material weights
  const weights: Record<PieceType, number> = {
    [PieceType.PAWN]: 100,
    [PieceType.KNIGHT]: 320,
    [PieceType.BISHOP]: 330,
    [PieceType.ROOK]: 500,
    [PieceType.QUEEN]: 900,
    [PieceType.KING]: 20000,
  };

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = grid[r][c];
      if (!piece) continue;

      const type = piece.type;
      const isWhite = piece.color === Color.WHITE;

      let val = weights[type];

      // Grab positional matrix value
      let posVal = 0;
      const rIdx = isWhite ? r : 7 - r; // Flip for Black
      const cIdx = isWhite ? c : 7 - c;

      switch (type) {
        case PieceType.PAWN:
          posVal = pawnPST[rIdx][cIdx];
          break;
        case PieceType.KNIGHT:
          posVal = knightPST[rIdx][cIdx];
          break;
        case PieceType.BISHOP:
          posVal = bishopPST[rIdx][cIdx];
          break;
        case PieceType.ROOK:
          posVal = rookPST[rIdx][cIdx];
          break;
        case PieceType.QUEEN:
          posVal = queenPST[rIdx][cIdx];
          break;
        case PieceType.KING:
          posVal = isEndGame ? kingEndGamePST[rIdx][cIdx] : kingMiddlePST[rIdx][cIdx];
          break;
      }

      // Explicit Center Control & Piece Positioning enhancements
      let centerControlBonus = 0;
      // 1. Direct occupation of the center squares (d4, e4, d5, e5)
      if (r >= 3 && r <= 4 && c >= 3 && c <= 4) {
        centerControlBonus += 25; // 0.25 pawn worth for occupying precious inner center
      } 
      // 2. Direct occupation of the extended/outer center squares
      else if (r >= 2 && r <= 5 && c >= 2 && c <= 5) {
        centerControlBonus += 8; // small bonus for active outer-center positioning
      }

      // 3. Knight and Bishop active center-pointing positions
      if (type === PieceType.KNIGHT || type === PieceType.BISHOP) {
        // Encourage them to influence the center squares from nearby distances
        const distToCenterRow = Math.min(Math.abs(r - 3.5), Math.abs(r - 4.5));
        const distToCenterCol = Math.min(Math.abs(c - 3.5), Math.abs(c - 4.5));
        if (distToCenterRow <= 1.5 && distToCenterCol <= 1.5) {
          centerControlBonus += 12;
        }
      }

      const totalVal = val + posVal + centerControlBonus;

      if (isWhite) {
        score += totalVal;
      } else {
        score -= totalVal;
      }
    }
  }

  // Adjust score if current board position is repeating, to prevent mindless infinite checks
  const repCount = board.getRepetitionCount();
  if (repCount >= 2) {
    if (score > 100) {
      // White is winning. If White repeats, penalize White
      score -= 150 * (repCount - 1);
    } else if (score < -100) {
      // Black is winning. If Black repeats, penalize Black (shift towards positive/White)
      score += 150 * (repCount - 1);
    } else {
      // Even position. Apply small penalty to encourage progress over repetition
      if (score > 0) {
        score -= 30 * (repCount - 1);
      } else if (score < 0) {
        score += 30 * (repCount - 1);
      }
    }
  }

  return score;
}
