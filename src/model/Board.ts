import { Color, PieceType, ChessPiece } from './Piece';
import { Move, indexToChessCoordinate } from './Move';

export interface CastlingRights {
  whiteKingSide: boolean;
  whiteQueenSide: boolean;
  blackKingSide: boolean;
  blackQueenSide: boolean;
}

export class Board {
  grid: (ChessPiece | null)[][];
  activeTurn: Color;
  enPassantTarget: { row: number; col: number } | null;
  castlingRights: CastlingRights;
  halfmoveClock: number;
  fullmoveNumber: number;
  moveHistory: Move[];
  stateHistory: string[];

  constructor() {
    this.grid = this.initDefaultGrid();
    this.activeTurn = Color.WHITE;
    this.enPassantTarget = null;
    this.castlingRights = {
      whiteKingSide: true,
      whiteQueenSide: true,
      blackKingSide: true,
      blackQueenSide: true,
    };
    this.halfmoveClock = 0;
    this.fullmoveNumber = 1;
    this.moveHistory = [];
    this.stateHistory = [];
    // Initialize initial state signature
    this.stateHistory.push(this.getStateSignature());
  }

  // Clones the complete board state for minimax search / search evaluation
  clone(): Board {
    const newBoard = new Board();
    newBoard.grid = this.grid.map(row => row.map(piece => piece ? { ...piece } : null));
    newBoard.activeTurn = this.activeTurn;
    newBoard.enPassantTarget = this.enPassantTarget ? { ...this.enPassantTarget } : null;
    newBoard.castlingRights = { ...this.castlingRights };
    newBoard.halfmoveClock = this.halfmoveClock;
    newBoard.fullmoveNumber = this.fullmoveNumber;
    newBoard.moveHistory = [...this.moveHistory];
    newBoard.stateHistory = [...this.stateHistory];
    return newBoard;
  }

  private initDefaultGrid(): (ChessPiece | null)[][] {
    const grid: (ChessPiece | null)[][] = Array(8).fill(null).map(() => Array(8).fill(null));

    // Setup major black pieces (Row 0)
    const blackBackRow = [
      PieceType.ROOK, PieceType.KNIGHT, PieceType.BISHOP, PieceType.QUEEN,
      PieceType.KING, PieceType.BISHOP, PieceType.KNIGHT, PieceType.ROOK
    ];
    for (let c = 0; c < 8; c++) {
      grid[0][c] = {
        id: `black-${blackBackRow[c]}-${c}`,
        type: blackBackRow[c],
        color: Color.BLACK,
        hasMoved: false,
      };
    }
    // Black pawns (Row 1)
    for (let c = 0; c < 8; c++) {
      grid[1][c] = {
        id: `black-pawn-${c}`,
        type: PieceType.PAWN,
        color: Color.BLACK,
        hasMoved: false,
      };
    }

    // White pawns (Row 6)
    for (let c = 0; c < 8; c++) {
      grid[6][c] = {
        id: `white-pawn-${c}`,
        type: PieceType.PAWN,
        color: Color.WHITE,
        hasMoved: false,
      };
    }

    // Setup major white pieces (Row 7)
    const whiteBackRow = [
      PieceType.ROOK, PieceType.KNIGHT, PieceType.BISHOP, PieceType.QUEEN,
      PieceType.KING, PieceType.BISHOP, PieceType.KNIGHT, PieceType.ROOK
    ];
    for (let c = 0; c < 8; c++) {
      grid[7][c] = {
        id: `white-${whiteBackRow[c]}-${c}`,
        type: whiteBackRow[c],
        color: Color.WHITE,
        hasMoved: false,
      };
    }

    return grid;
  }

  getPiece(row: number, col: number): ChessPiece | null {
    if (row < 0 || row > 7 || col < 0 || col > 7) return null;
    return this.grid[row][col];
  }

  // Verifies if the check conditions exist
  isInCheck(color: Color, customGrid?: (ChessPiece | null)[][]): boolean {
    const checkGrid = customGrid || this.grid;
    // Find King of this color
    let kingRow = -1;
    let kingCol = -1;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = checkGrid[r][c];
        if (piece && piece.type === PieceType.KING && piece.color === color) {
          kingRow = r;
          kingCol = c;
          break;
        }
      }
      if (kingRow !== -1) break;
    }

    if (kingRow === -1 || kingCol === -1) return false; // Edge case (king is missing)
    const opponentColor = color === Color.WHITE ? Color.BLACK : Color.WHITE;
    return this.isSquareAttacked(kingRow, kingCol, opponentColor, checkGrid);
  }

  // Check if a cell is attacked by an opponent color on some grid state
  isSquareAttacked(row: number, col: number, attackerColor: Color, checkGrid: (ChessPiece | null)[][]): boolean {
    // 1. Pawn attacks
    const pawnDir = attackerColor === Color.WHITE ? 1 : -1; // Opponent moves toward row opposite to theirs
    const attackerPawnRow = row + pawnDir;
    for (const dc of [-1, 1]) {
      const pCol = col + dc;
      if (attackerPawnRow >= 0 && attackerPawnRow <= 7 && pCol >= 0 && pCol <= 7) {
        const attacker = checkGrid[attackerPawnRow][pCol];
        if (attacker && attacker.type === PieceType.PAWN && attacker.color === attackerColor) {
          return true;
        }
      }
    }

    // 2. Knight moves
    const knightDirs = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1]
    ];
    for (const [dr, dc] of knightDirs) {
      const nRow = row + dr;
      const nCol = col + dc;
      if (nRow >= 0 && nRow <= 7 && nCol >= 0 && nCol <= 7) {
        const attacker = checkGrid[nRow][nCol];
        if (attacker && attacker.type === PieceType.KNIGHT && attacker.color === attackerColor) {
          return true;
        }
      }
    }

    // 3. Sliding Attacks (Rook, Bishop, Queen)
    // Lateral Dirs (Rook, Queen)
    const lateralDirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of lateralDirs) {
      let r = row + dr;
      let c = col + dc;
      while (r >= 0 && r <= 7 && c >= 0 && c <= 7) {
        const piece = checkGrid[r][c];
        if (piece) {
          if (piece.color === attackerColor && (piece.type === PieceType.ROOK || piece.type === PieceType.QUEEN)) {
            return true;
          }
          break; // Stop at first blocker
        }
        r += dr;
        c += dc;
      }
    }

    // Diagonal Dirs (Bishop, Queen)
    const diagonalDirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    for (const [dr, dc] of diagonalDirs) {
      let r = row + dr;
      let c = col + dc;
      while (r >= 0 && r <= 7 && c >= 0 && c <= 7) {
        const piece = checkGrid[r][c];
        if (piece) {
          if (piece.color === attackerColor && (piece.type === PieceType.BISHOP || piece.type === PieceType.QUEEN)) {
            return true;
          }
          break; // Stop at first blocker
        }
        r += dr;
        c += dc;
      }
    }

    // 4. King attacks (to avoid infinite loop and adjacent king situations)
    const kingDirs = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],           [0, 1],
      [1, -1],  [1, 0],  [1, 1]
    ];
    for (const [dr, dc] of kingDirs) {
      const kRow = row + dr;
      const kCol = col + dc;
      if (kRow >= 0 && kRow <= 7 && kCol >= 0 && kCol <= 7) {
        const attacker = checkGrid[kRow][kCol];
        if (attacker && attacker.type === PieceType.KING && attacker.color === attackerColor) {
          return true;
        }
      }
    }

    return false;
  }

  // Generates pseudolegal moves (moves that respect movement rules, but might leave King in check)
  generatePseudoLegalMoves(row: number, col: number, checkGrid?: (ChessPiece | null)[][]): Move[] {
    const grid = checkGrid || this.grid;
    const piece = grid[row][col];
    if (!piece) return [];

    const moves: Move[] = [];
    const color = piece.color;
    const opponentColor = color === Color.WHITE ? Color.BLACK : Color.WHITE;

    switch (piece.type) {
      case PieceType.PAWN: {
        const dir = color === Color.WHITE ? -1 : 1; // white goes up (-1), black goes down (+1)
        const startRow = color === Color.WHITE ? 6 : 1;

        // One square forward
        const nextRow = row + dir;
        if (nextRow >= 0 && nextRow <= 7 && !grid[nextRow][col]) {
          // Normal moves & promotions
          if (nextRow === 0 || nextRow === 7) {
            moves.push({ fromRow: row, fromCol: col, toRow: nextRow, toCol: col, piece, promotion: PieceType.QUEEN });
            moves.push({ fromRow: row, fromCol: col, toRow: nextRow, toCol: col, piece, promotion: PieceType.ROOK });
            moves.push({ fromRow: row, fromCol: col, toRow: nextRow, toCol: col, piece, promotion: PieceType.BISHOP });
            moves.push({ fromRow: row, fromCol: col, toRow: nextRow, toCol: col, piece, promotion: PieceType.KNIGHT });
          } else {
            moves.push({ fromRow: row, fromCol: col, toRow: nextRow, toCol: col, piece });
          }

          // Two squares forward
          const doubleRow = row + 2 * dir;
          if (row === startRow && !grid[doubleRow][col]) {
            moves.push({ fromRow: row, fromCol: col, toRow: doubleRow, toCol: col, piece, isDoublePawnPush: true });
          }
        }

        // Standard diagonals & En Passant
        const attackCols = [col - 1, col + 1];
        for (const targetCol of attackCols) {
          if (targetCol >= 0 && targetCol <= 7) {
            const targetPiece = grid[nextRow]?.[targetCol];
            // Diagonal capture
            if (targetPiece && targetPiece.color === opponentColor) {
              if (nextRow === 0 || nextRow === 7) {
                moves.push({ fromRow: row, fromCol: col, toRow: nextRow, toCol: targetCol, piece, captured: targetPiece, promotion: PieceType.QUEEN });
                moves.push({ fromRow: row, fromCol: col, toRow: nextRow, toCol: targetCol, piece, captured: targetPiece, promotion: PieceType.ROOK });
                moves.push({ fromRow: row, fromCol: col, toRow: nextRow, toCol: targetCol, piece, captured: targetPiece, promotion: PieceType.BISHOP });
                moves.push({ fromRow: row, fromCol: col, toRow: nextRow, toCol: targetCol, piece, captured: targetPiece, promotion: PieceType.KNIGHT });
              } else {
                moves.push({ fromRow: row, fromCol: col, toRow: nextRow, toCol: targetCol, piece, captured: targetPiece });
              }
            }

            // En Passant
            if (this.enPassantTarget && this.enPassantTarget.row === nextRow && this.enPassantTarget.col === targetCol) {
              const epCapturedPiece = grid[row][targetCol]; // Capture the pawn sitting adjacent
              if (epCapturedPiece && epCapturedPiece.color === opponentColor && epCapturedPiece.type === PieceType.PAWN) {
                moves.push({
                  fromRow: row,
                  fromCol: col,
                  toRow: nextRow,
                  toCol: targetCol,
                  piece,
                  captured: epCapturedPiece,
                  isEnPassant: true,
                });
              }
            }
          }
        }
        break;
      }

      case PieceType.KNIGHT: {
        const jumps = [
          [-2, -1], [-2, 1], [-1, -2], [-1, 2],
          [1, -2], [1, 2], [2, -1], [2, 1]
        ];
        for (const [dr, dc] of jumps) {
          const r = row + dr;
          const c = col + dc;
          if (r >= 0 && r <= 7 && c >= 0 && c <= 7) {
            const target = grid[r][c];
            if (!target) {
              moves.push({ fromRow: row, fromCol: col, toRow: r, toCol: c, piece });
            } else if (target.color === opponentColor) {
              moves.push({ fromRow: row, fromCol: col, toRow: r, toCol: c, piece, captured: target });
            }
          }
        }
        break;
      }

      case PieceType.BISHOP:
      case PieceType.ROOK:
      case PieceType.QUEEN: {
        const dirs: [number, number][] = [];
        if (piece.type === PieceType.BISHOP || piece.type === PieceType.QUEEN) {
          dirs.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
        }
        if (piece.type === PieceType.ROOK || piece.type === PieceType.QUEEN) {
          dirs.push([-1, 0], [1, 0], [0, -1], [0, 1]);
        }

        for (const [dr, dc] of dirs) {
          let r = row + dr;
          let c = col + dc;
          while (r >= 0 && r <= 7 && c >= 0 && c <= 7) {
            const target = grid[r][c];
            if (!target) {
              moves.push({ fromRow: row, fromCol: col, toRow: r, toCol: c, piece });
            } else {
              if (target.color === opponentColor) {
                moves.push({ fromRow: row, fromCol: col, toRow: r, toCol: c, piece, captured: target });
              }
              break; // Blocked by piece
            }
            r += dr;
            c += dc;
          }
        }
        break;
      }

      case PieceType.KING: {
        const dirs = [
          [-1, -1], [-1, 0], [-1, 1],
          [0, -1],           [0, 1],
          [1, -1],  [1, 0],  [1, 1]
        ];
        for (const [dr, dc] of dirs) {
          const r = row + dr;
          const c = col + dc;
          if (r >= 0 && r <= 7 && c >= 0 && c <= 7) {
            const target = grid[r][c];
            if (!target) {
              moves.push({ fromRow: row, fromCol: col, toRow: r, toCol: c, piece });
            } else if (target.color === opponentColor) {
              moves.push({ fromRow: row, fromCol: col, toRow: r, toCol: c, piece, captured: target });
            }
          }
        }

        // Castling moves (Calculated as pseudolegal, filtered in validation)
        this.addCastlingPseudoMoves(row, col, piece, grid, moves);
        break;
      }
    }

    return moves;
  }

  // Check and append pseudolegal castling moves
  private addCastlingPseudoMoves(row: number, col: number, king: ChessPiece, grid: (ChessPiece | null)[][], moves: Move[]) {
    if (king.hasMoved) return;

    if (king.color === Color.WHITE) {
      if (row !== 7 || col !== 4) return;
      // White King Side
      if (this.castlingRights.whiteKingSide) {
        const rook = grid[7][7];
        if (rook && rook.type === PieceType.ROOK && !rook.hasMoved) {
          if (!grid[7][5] && !grid[7][6]) {
            moves.push({
              fromRow: 7, fromCol: 4, toRow: 7, toCol: 6,
              piece: king, isCastling: { kingSide: true }
            });
          }
        }
      }
      // White Queen Side
      if (this.castlingRights.whiteQueenSide) {
        const rook = grid[7][0];
        if (rook && rook.type === PieceType.ROOK && !rook.hasMoved) {
          if (!grid[7][1] && !grid[7][2] && !grid[7][3]) {
            moves.push({
              fromRow: 7, fromCol: 4, toRow: 7, toCol: 2,
              piece: king, isCastling: { kingSide: false }
            });
          }
        }
      }
    } else {
      if (row !== 0 || col !== 4) return;
      // Black King Side
      if (this.castlingRights.blackKingSide) {
        const rook = grid[0][7];
        if (rook && rook.type === PieceType.ROOK && !rook.hasMoved) {
          if (!grid[0][5] && !grid[0][6]) {
            moves.push({
              fromRow: 0, fromCol: 4, toRow: 0, toCol: 6,
              piece: king, isCastling: { kingSide: true }
            });
          }
        }
      }
      // Black Queen Side
      if (this.castlingRights.blackQueenSide) {
        const rook = grid[0][0];
        if (rook && rook.type === PieceType.ROOK && !rook.hasMoved) {
          if (!grid[0][1] && !grid[0][2] && !grid[0][3]) {
            moves.push({
              fromRow: 0, fromCol: 4, toRow: 0, toCol: 2,
              piece: king, isCastling: { kingSide: false }
            });
          }
        }
      }
    }
  }

  // Generates valid moves (filtered so playing the move does not resulting in King in check)
  generateValidMoves(row: number, col: number): Move[] {
    const piece = this.getPiece(row, col);
    if (!piece || piece.color !== this.activeTurn) return [];

    const pseudoMoves = this.generatePseudoLegalMoves(row, col);
    const validMoves: Move[] = [];

    for (const move of pseudoMoves) {
      if (this.simulateMoveAndCheckCheck(move)) {
        continue; // Leaves King in check, invalid!
      }

      // Check special castling constraints (King cannot castle out of, through, or into check)
      if (move.isCastling) {
        const isKingCheck = this.isInCheck(piece.color);
        if (isKingCheck) continue; // Cannot castle OUT of check

        // Check columns must not be under attack
        const cDir = move.toCol > move.fromCol ? 1 : -1;
        const colPassed = move.fromCol + cDir;
        const opponentColor = piece.color === Color.WHITE ? Color.BLACK : Color.WHITE;
        if (this.isSquareAttacked(move.fromRow, colPassed, opponentColor, this.grid)) {
          continue; // Cannot castle THROUGH check
        }
        if (this.isSquareAttacked(move.fromRow, move.toCol, opponentColor, this.grid)) {
          continue; // Cannot castle INTO check
        }
      }

      validMoves.push(move);
    }

    return validMoves;
  }

  // Simulates a move and returns true if the player is in check after the move
  private simulateMoveAndCheckCheck(move: Move): boolean {
    const backupGrid = this.grid.map(row => row.slice());
    const color = move.piece.color;

    // Apply simulation
    this.applyMoveOnGrid(move, backupGrid);

    const check = this.isInCheck(color, backupGrid);
    return check;
  }

  // Modifies a target grid in place (for evaluation or simulation)
  private applyMoveOnGrid(move: Move, grid: (ChessPiece | null)[][]) {
    const { fromRow, fromCol, toRow, toCol, isEnPassant, isCastling, promotion } = move;
    const movingPiece = { ...move.piece };

    // Move Piece
    grid[fromRow][fromCol] = null;

    if (isEnPassant) {
      grid[fromRow][toCol] = null; // Remove en-passant captured pawn sitting next to it
    }

    if (isCastling) {
      const isKingSide = isCastling.kingSide;
      if (movingPiece.color === Color.WHITE) {
        if (isKingSide) {
          // move rook from 7,7 to 7,5
          const rook = grid[7][7];
          grid[7][7] = null;
          grid[7][5] = rook ? { ...rook, hasMoved: true } : null;
        } else {
          // move rook from 7,0 to 7,3
          const rook = grid[7][0];
          grid[7][0] = null;
          grid[7][3] = rook ? { ...rook, hasMoved: true } : null;
        }
      } else {
        if (isKingSide) {
          // move rook from 0,7 to 0,5
          const rook = grid[0][7];
          grid[0][7] = null;
          grid[0][5] = rook ? { ...rook, hasMoved: true } : null;
        } else {
          // move rook from 0,0 to 0,3
          const rook = grid[0][0];
          grid[0][0] = null;
          grid[0][3] = rook ? { ...rook, hasMoved: true } : null;
        }
      }
    }

    if (promotion) {
      movingPiece.type = promotion;
      movingPiece.id = movingPiece.id + '-promoted-' + promotion;
    }

    movingPiece.hasMoved = true;
    grid[toRow][toCol] = movingPiece;
  }

  // Executes a move permanently on the board state
  executeMove(move: Move): boolean {
    // Generate algebraic notation beforehand
    const notation = this.generateAlgebraicNotation(move);
    move.notation = notation;

    // Apply permanently to this grid
    this.applyMoveOnGrid(move, this.grid);

    // Update castling rights permanently if King or Rook moves
    this.updateCastlingRights(move);

    // Update en passant target pawn
    if (move.isDoublePawnPush) {
      const dir = move.piece.color === Color.WHITE ? 1 : -1;
      this.enPassantTarget = { row: move.fromRow - dir, col: move.fromCol };
    } else {
      this.enPassantTarget = null;
    }

    // Fifty-move rule clock and fullmove number updates
    if (move.piece.type === PieceType.PAWN || move.captured) {
      this.halfmoveClock = 0;
    } else {
      this.halfmoveClock++;
    }

    if (this.activeTurn === Color.BLACK) {
      this.fullmoveNumber++;
    }

    // Push history
    this.moveHistory.push(move);

    // Switch color turn.
    this.activeTurn = this.activeTurn === Color.WHITE ? Color.BLACK : Color.WHITE;

    // Push the state signature for repetition tracking
    if (this.stateHistory) {
      this.stateHistory.push(this.getStateSignature());
    }

    return true;
  }

  private updateCastlingRights(move: Move) {
    const { fromRow, fromCol, toRow, toCol, piece } = move;

    // If King moves
    if (piece.type === PieceType.KING) {
      if (piece.color === Color.WHITE) {
        this.castlingRights.whiteKingSide = false;
        this.castlingRights.whiteQueenSide = false;
      } else {
        this.castlingRights.blackKingSide = false;
        this.castlingRights.blackQueenSide = false;
      }
    }

    // If Rook moves or is captured
    // White Rooks
    if (fromRow === 7 && fromCol === 7) this.castlingRights.whiteKingSide = false;
    if (fromRow === 7 && fromCol === 0) this.castlingRights.whiteQueenSide = false;
    // Black Rooks
    if (fromRow === 0 && fromCol === 7) this.castlingRights.blackKingSide = false;
    if (fromRow === 0 && fromCol === 0) this.castlingRights.blackQueenSide = false;

    // Capture of Rooks also voids rights
    if (toRow === 7 && toCol === 7) this.castlingRights.whiteKingSide = false;
    if (toRow === 7 && toCol === 0) this.castlingRights.whiteQueenSide = false;
    if (toRow === 0 && toCol === 7) this.castlingRights.blackKingSide = false;
    if (toRow === 0 && toCol === 0) this.castlingRights.blackQueenSide = false;
  }

  // Generates algebraic notation of the move
  private generateAlgebraicNotation(move: Move): string {
    if (move.isCastling) {
      return move.isCastling.kingSide ? 'O-O' : 'O-O-O';
    }

    let pieceLetter = '';
    switch (move.piece.type) {
      case PieceType.KNIGHT: pieceLetter = 'N'; break;
      case PieceType.BISHOP: pieceLetter = 'B'; break;
      case PieceType.ROOK: pieceLetter = 'R'; break;
      case PieceType.QUEEN: pieceLetter = 'Q'; break;
      case PieceType.KING: pieceLetter = 'K'; break;
      case PieceType.PAWN: pieceLetter = 'P'; break;
    }

    const startSquare = indexToChessCoordinate(move.fromRow, move.fromCol);
    const endSquare = indexToChessCoordinate(move.toRow, move.toCol);

    let notation = pieceLetter;

    if (move.piece.type === PieceType.PAWN) {
      if (move.captured) {
        notation += startSquare[0] + 'x'; // e.g. exd5
      }
    } else {
      if (move.captured) {
        notation += 'x';
      }
    }

    notation += endSquare;

    if (move.promotion) {
      let promoLetter = 'Q';
      switch (move.promotion) {
        case PieceType.ROOK: promoLetter = 'R'; break;
        case PieceType.BISHOP: promoLetter = 'B'; break;
        case PieceType.KNIGHT: promoLetter = 'N'; break;
      }
      notation += '=' + promoLetter;
    }

    // Check notation injection is handled in Controller/Game loop after turn swap and actual updates

    return notation;
  }

  getAllMovesForPlayer(color: Color): Move[] {
    const list: Move[] = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = this.grid[r][c];
        if (piece && piece.color === color) {
          list.push(...this.generateValidMoves(r, c));
        }
      }
    }
    return list;
  }

  isCheckmate(color: Color): boolean {
    if (!this.isInCheck(color)) return false;
    const moves = this.getAllMovesForPlayer(color);
    return moves.length === 0;
  }

  isStalemate(color: Color): boolean {
    if (this.isInCheck(color)) return false;
    const moves = this.getAllMovesForPlayer(color);
    return moves.length === 0;
  }

  isDraw(): boolean {
    // 1. Stalemate
    if (this.isStalemate(this.activeTurn)) return true;

    // 2. Fifty-move rule (50 consecutive halfmoves without capture or pawn push)
    if (this.halfmoveClock >= 100) return true;

    // 3. Insufficient material
    if (this.hasInsufficientMaterial()) return true;

    // 4. Threefold repetition
    if (this.isThreefoldRepetition()) return true;

    return false;
  }

  /**
   * Generates a unique FEN-like signature representing the current position, including 
   * piece placement, active color, castling rights, and en passant target.
   */
  getStateSignature(): string {
    if (!this.grid) return '';

    // 1. Pieces layout row by row
    let layout = '';
    for (let r = 0; r < 8; r++) {
      let emptyCount = 0;
      for (let c = 0; c < 8; c++) {
        const p = this.grid[r][c];
        if (p) {
          if (emptyCount > 0) {
            layout += emptyCount;
            emptyCount = 0;
          }
          const colChar = p.color === Color.WHITE ? 'w' : 'b';
          let typeChar = '';
          switch (p.type) {
            case PieceType.PAWN: typeChar = 'P'; break;
            case PieceType.KNIGHT: typeChar = 'N'; break;
            case PieceType.BISHOP: typeChar = 'B'; break;
            case PieceType.ROOK: typeChar = 'R'; break;
            case PieceType.QUEEN: typeChar = 'Q'; break;
            case PieceType.KING: typeChar = 'K'; break;
          }
          layout += colChar + typeChar;
        } else {
          emptyCount++;
        }
      }
      if (emptyCount > 0) {
        layout += emptyCount;
      }
      if (r < 7) {
        layout += '/';
      }
    }

    // 2. Active turn
    const turn = this.activeTurn === Color.WHITE ? 'w' : 'b';

    // 3. Castling rights
    let castling = '';
    if (this.castlingRights) {
      if (this.castlingRights.whiteKingSide) castling += 'K';
      if (this.castlingRights.whiteQueenSide) castling += 'Q';
      if (this.castlingRights.blackKingSide) castling += 'k';
      if (this.castlingRights.blackQueenSide) castling += 'q';
    }
    if (castling === '') castling = '-';

    // 4. En-passant target square
    let ep = '-';
    if (this.enPassantTarget) {
      ep = indexToChessCoordinate(this.enPassantTarget.row, this.enPassantTarget.col);
    }

    return `${layout} ${turn} ${castling} ${ep}`;
  }

  /**
   * Generates a standard FEN string conforming to official chess standards
   * (used by external chess engines like Stockfish).
   */
  getFEN(): string {
    if (!this.grid) return '';

    // 1. Pieces layout row by row
    let layout = '';
    for (let r = 0; r < 8; r++) {
      let emptyCount = 0;
      for (let c = 0; c < 8; c++) {
        const p = this.grid[r][c];
        if (p) {
          if (emptyCount > 0) {
            layout += emptyCount;
            emptyCount = 0;
          }
          let typeChar = '';
          switch (p.type) {
            case PieceType.PAWN: typeChar = 'p'; break;
            case PieceType.KNIGHT: typeChar = 'n'; break;
            case PieceType.BISHOP: typeChar = 'b'; break;
            case PieceType.ROOK: typeChar = 'r'; break;
            case PieceType.QUEEN: typeChar = 'q'; break;
            case PieceType.KING: typeChar = 'k'; break;
          }
          if (p.color === Color.WHITE) {
            typeChar = typeChar.toUpperCase();
          }
          layout += typeChar;
        } else {
          emptyCount++;
        }
      }
      if (emptyCount > 0) {
        layout += emptyCount;
      }
      if (r < 7) {
        layout += '/';
      }
    }

    // 2. Active turn
    const turn = this.activeTurn === Color.WHITE ? 'w' : 'b';

    // 3. Castling rights
    let castling = '';
    if (this.castlingRights) {
      if (this.castlingRights.whiteKingSide) castling += 'K';
      if (this.castlingRights.whiteQueenSide) castling += 'Q';
      if (this.castlingRights.blackKingSide) castling += 'k';
      if (this.castlingRights.blackQueenSide) castling += 'q';
    }
    if (castling === '') castling = '-';

    // 4. En-passant target square
    let ep = '-';
    if (this.enPassantTarget) {
      ep = indexToChessCoordinate(this.enPassantTarget.row, this.enPassantTarget.col);
    }

    // 5. Halfmove clock and fullmove number
    const halfmove = this.halfmoveClock !== undefined ? this.halfmoveClock : 0;
    const fullmove = Math.floor(this.moveHistory.length / 2) + 1;

    return `${layout} ${turn} ${castling} ${ep} ${halfmove} ${fullmove}`;
  }

  /**
   * Evaluates how many times the specified signature (default current signature) 
   * has occurred in the game so far.
   */
  getRepetitionCount(sig?: string): number {
    const currentSig = sig || this.getStateSignature();
    if (!this.stateHistory) return 0;
    
    let count = 0;
    for (const historicSig of this.stateHistory) {
      if (historicSig === currentSig) {
        count++;
      }
    }
    return count;
  }

  /**
   * If a state repeats exactly 3 or more times, THREEFOLD REPETITION is achieved.
   */
  isThreefoldRepetition(): boolean {
    return this.getRepetitionCount() >= 3;
  }

  // Returns true if there is insufficient mating material
  hasInsufficientMaterial(): boolean {
    const whitePieces: ChessPiece[] = [];
    const blackPieces: ChessPiece[] = [];

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = this.grid[r][c];
        if (piece) {
          if (piece.type === PieceType.KING) continue;
          if (piece.color === Color.WHITE) {
            whitePieces.push(piece);
          } else {
            blackPieces.push(piece);
          }
        }
      }
    }

    // King vs King
    if (whitePieces.length === 0 && blackPieces.length === 0) return true;

    // King + Knight vs King OR King + Bishop vs King
    if (whitePieces.length === 1 && blackPieces.length === 0) {
      const type = whitePieces[0].type;
      if (type === PieceType.KNIGHT || type === PieceType.BISHOP) return true;
    }
    if (blackPieces.length === 1 && whitePieces.length === 0) {
      const type = blackPieces[0].type;
      if (type === PieceType.KNIGHT || type === PieceType.BISHOP) return true;
    }

    // King + Bishop vs King + Bishop (if bishops of same color squares)
    // For simplicity, Bishop/Knight vs Bishop/Knight draws are handled here
    if (whitePieces.length === 1 && blackPieces.length === 1) {
      const wType = whitePieces[0].type;
      const bType = blackPieces[0].type;
      if (wType === PieceType.BISHOP && bType === PieceType.BISHOP) return true;
    }

    return false;
  }
}
