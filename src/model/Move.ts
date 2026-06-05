import { ChessPiece, PieceType } from './Piece';

export interface Move {
  fromRow: number;
  fromCol: number;
  toRow: number;
  toCol: number;
  piece: ChessPiece;
  captured?: ChessPiece;
  promotion?: PieceType;
  isCastling?: { kingSide: boolean };
  isEnPassant?: boolean;
  isDoublePawnPush?: boolean;
  notation?: string; // Algebraic notation, e.g., Nf3, O-O
  analysis?: 'book' | 'brilliant' | 'great' | 'best' | 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'miss' | 'blunder';
}

export function indexToChessCoordinate(row: number, col: number): string {
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
  if (row < 0 || row > 7 || col < 0 || col > 7) return '';
  return files[col] + ranks[row];
}
