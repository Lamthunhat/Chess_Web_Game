export enum Color {
  WHITE = 'white',
  BLACK = 'black',
}

export enum PieceType {
  PAWN = 'pawn',
  KNIGHT = 'knight',
  BISHOP = 'bishop',
  ROOK = 'rook',
  QUEEN = 'queen',
  KING = 'king',
}

export interface ChessPiece {
  id: string; // unique ID for keys and animations
  type: PieceType;
  color: Color;
  hasMoved: boolean;
}

export function getPieceSymbol(type: PieceType, color: Color): string {
  const symbols: Record<PieceType, { white: string; black: string }> = {
    [PieceType.KING]: { white: '♔', black: '♚' },
    [PieceType.QUEEN]: { white: '♕', black: '♛' },
    [PieceType.ROOK]: { white: '♖', black: '♜' },
    [PieceType.BISHOP]: { white: '♗', black: '♝' },
    [PieceType.KNIGHT]: { white: '♘', black: '♞' },
    [PieceType.PAWN]: { white: '♙', black: '♟' },
  };
  return color === Color.WHITE ? symbols[type].white : symbols[type].black;
}
