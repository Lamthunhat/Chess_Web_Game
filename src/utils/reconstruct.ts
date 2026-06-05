import { Board } from '../model/Board';
import { Move, indexToChessCoordinate } from '../model/Move';
import { PieceType } from '../model/Piece';
import { analyzeMove } from './analysis';

/**
 * Reconstructs a full list of physical Move objects from standard chess algebraic notations
 */
export function reconstructMovesFromNotation(notations: string[]): Move[] {
  const tempBoard = new Board();
  const reconstructedMoves: Move[] = [];

  for (const notation of notations) {
    const activeColor = tempBoard.activeTurn;
    const allValidMoves = tempBoard.getAllMovesForPlayer(activeColor);

    const cleanInput = notation.replace(/[+#]$/, '');

    // Try exact notation match first
    let foundMove = allValidMoves.find(m => {
      // @ts-ignore
      const mNot = tempBoard.generateAlgebraicNotation(m).replace(/[+#]$/, '');
      return mNot === cleanInput;
    });

    // Loose match fallback (using target square and piece letters)
    if (!foundMove) {
      foundMove = allValidMoves.find(m => {
        const dest = indexToChessCoordinate(m.toRow, m.toCol);
        if (!cleanInput.endsWith(dest)) return false;

        let pieceLetter = '';
        switch (m.piece.type) {
          case PieceType.KNIGHT: pieceLetter = 'N'; break;
          case PieceType.BISHOP: pieceLetter = 'B'; break;
          case PieceType.ROOK: pieceLetter = 'R'; break;
          case PieceType.QUEEN: pieceLetter = 'Q'; break;
          case PieceType.KING: pieceLetter = 'K'; break;
          default: pieceLetter = ''; break;
        }

        if (pieceLetter) {
          return cleanInput.startsWith(pieceLetter);
        } else {
          // Pawn move: e.g. exd5 starts with file letter 'e'
          if (m.captured) {
            const startColName = indexToChessCoordinate(m.fromRow, m.fromCol)[0];
            return cleanInput.startsWith(startColName);
          }
          return true;
        }
      });
    }

    if (foundMove) {
      const boardBefore = tempBoard.clone();
      tempBoard.executeMove(foundMove);

      const mResult = { ...foundMove };
      mResult.analysis = analyzeMove(boardBefore, foundMove, reconstructedMoves.length);
      mResult.notation = notation;

      reconstructedMoves.push(mResult);
    } else {
      console.warn(`Could not reconstruct move for notation: ${notation}`);
      break;
    }
  }

  return reconstructedMoves;
}
