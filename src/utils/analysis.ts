import { Board } from '../model/Board';
import { Move } from '../model/Move';
import { Color, PieceType } from '../model/Piece';
import { evaluateBoard } from '../ai/Evaluation';

export type MoveAnalysisClass = 'book' | 'brilliant' | 'great' | 'best' | 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'miss' | 'blunder';

export interface AnalysisResult {
  category: MoveAnalysisClass;
  label: string;
  colorClass: string;
  bgColorClass: string;
  borderColorClass: string;
  icon: string;
  badgeBg: string;
  description: string;
}

// Danh sách các nước đi khai cuộc phổ biến trong Sách giáo khoa (Book moves)
const BOOK_MOVES = [
  'e4', 'e5', 'd4', 'd5', 'Nf3', 'Nf6', 'Nc3', 'Nc6', 'c4', 'c5', 
  'e6', 'g3', 'g6', 'O-O', 'Bc4', 'Bb5', 'Bc5', 'Be7', 'Be2', 'd3', 'd6', 'c6', 
  'a6', 'h6', 'a3', 'h3'
];

/**
 * Phân tích và chấm điểm nước đi theo Mô hình Điểm Dự kiến (Expected Points - Classification V2) của Chess.com
 * @param boardBefore Thế cờ trước khi thực hiện nước đi
 * @param move Nước đi được chọn
 * @param historyLength Số lượng nước đi trong lịch sử trận đấu (dùng để xác định nước đi khai cuộc)
 * @returns Phân loại nước đi ('book' | 'brilliant' | 'great' | 'best' | 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'miss' | 'blunder')
 */
export function analyzeMove(boardBefore: Board, move: Move, historyLength: number): MoveAnalysisClass {
  const activeColor = boardBefore.activeTurn;
  const isWhite = activeColor === Color.WHITE;

  // 1. Phân loại BOOK (Sách giáo khoa)
  // Nếu nằm trong 6 nước đi đầu tiên và khớp dữ liệu khai cuộc phổ biến
  const notationClean = (move.notation || '').replace(/[+#]$/, '');
  if (historyLength < 6 && BOOK_MOVES.includes(notationClean)) {
    return 'book';
  }

  // Lấy tất cả nước đi hợp lệ tiếp theo để tìm nước đi tối ưu (Best Move)
  const allMoves = boardBefore.getAllMovesForPlayer(activeColor);
  if (allMoves.length === 0) {
    return 'best'; // Thế cờ không còn nước đi hợp lệ (Máp cờ hết nước)
  }

  // Tính toán Mô hình Điểm Dự kiến (Expected Points) cho mỗi nước đi hợp lệ
  // Công thức: E = 1 / (1 + 10^(-Eval_active / 400))
  // Trong đó Eval_active là điểm đánh giá thế cờ từ góc nhìn của người chơi chủ động (Trắng dương, Đen âm đổi chiều)
  const moveData: { move: Move; expectedPoints: number; score: number }[] = [];

  for (const m of allMoves) {
    const cloned = boardBefore.clone();
    cloned.executeMove(m);
    const evalScore = evaluateBoard(cloned);

    // Tính điểm từ góc nhìn của quân đang đi (White tối đa hóa, Black tối thiểu hóa)
    const activeScore = isWhite ? evalScore : -evalScore;
    const expectedPoints = 1 / (1 + Math.pow(10, -activeScore / 400));

    moveData.push({ move: m, expectedPoints, score: evalScore });
  }

  // Sắp xếp các lựa chọn theo Điểm Dự kiến từ cao xuống thấp (Nước đi tối ưu nhất của máy tính xếp đầu tiên)
  const sortedMoves = moveData.sort((a, b) => b.expectedPoints - a.expectedPoints);

  const bestMoveInfo = sortedMoves[0];
  const bestExpectedPoints = bestMoveInfo.expectedPoints;

  // Tìm kiếm thông tin về nước cờ THỰC TẾ được đi
  let actualMoveInfo = sortedMoves.find(item => 
    item.move.fromRow === move.fromRow && item.move.fromCol === move.fromCol && 
    item.move.toRow === move.toRow && item.move.toCol === move.toCol && 
    item.move.promotion === move.promotion
  );

  // Fallback phòng khi nước đi không tìm thấy trực tiếp
  if (!actualMoveInfo) {
    const cloned = boardBefore.clone();
    cloned.executeMove(move);
    const evalScore = evaluateBoard(cloned);
    const activeScore = isWhite ? evalScore : -evalScore;
    const expectedPoints = 1 / (1 + Math.pow(10, -activeScore / 400));
    actualMoveInfo = { move, expectedPoints, score: evalScore };
  }

  const actualExpectedPoints = actualMoveInfo.expectedPoints;
  // Số Điểm Dự Kiến Bị Mất (Expected Points Drop) = Giá trị tối ưu nhất - Giá trị thực tế đạt được
  const loss = bestExpectedPoints - actualExpectedPoints;

  // ==========================================
  // 2. Phân loại MISS (Bỏ lỡ cơ hội)
  // Xảy ra khi đối phương vừa phạm sai lầm giúp bạn có cơ hội thắng lớn (bestExpectedPoints >= 0.72)
  // Tuy nhiên bạn lại chọn nước đi không tận dụng được, kéo tỷ lệ thắng tụt xuống mức hòa/thua (actualExpectedPoints <= 0.58)
  if (bestExpectedPoints >= 0.72 && actualExpectedPoints <= 0.58) {
    return 'miss';
  }

  // ==========================================
  // 3. Phân loại BRILLIANT (Thiên tài)
  // Theo quy tắc mới của Chess.com: Bạn thực hiện một nước "thí quân tốt" (Sacrifice)
  // Các điều kiện nghiêm ngặt:
  // - Đi vào ô bị quân địch tấn công và có thể bị bắt (isUnderAttackOnArrival)
  // - Quân thí có giá trị (Từ Tốt, Mã, Tượng, Xe trở lên)
  // - Chất lượng nước đi cực tốt (loss <= 0.02 - tức là nước đi xuất sắc hoặc tối ưu)
  // - Bạn không rơi vào hoàn cảnh thảm hại sau nước thí quân này (vẫn giữ được điểm dự kiến cao actualExpectedPoints >= 0.45)
  // - Bạn không phải đang ở thế thắng hoàn toàn áp đảo từ trước (bestExpectedPoints <= 0.95)
  const opponentColor = activeColor === Color.WHITE ? Color.BLACK : Color.WHITE;
  const isUnderAttackOnArrival = boardBefore.isSquareAttacked(move.toRow, move.toCol, opponentColor, boardBefore.grid);
  
  if (isUnderAttackOnArrival && loss <= 0.02 && bestExpectedPoints <= 0.95 && actualExpectedPoints >= 0.45) {
    // Thí quân (Pawn/Knight/Bishop/Rook/Queen)
    // Coi như là thí nếu ô đến có địch phòng ngự hoặc có nguy cơ bị bắt trực tiếp
    const pieceVal = getPieceValue(move.piece.type);
    if (pieceVal >= 100) { 
      return 'brilliant';
    }
  }

  // ==========================================
  // 4. Phân loại GREAT (Tuyệt vời)
  // Các nước đi then chốt quyết định kết quả ván cờ:
  // A. Nước đi duy nhất đúng (Only Move): Nếu không chọn nước này thì cục diện sẽ chuyển biến tệ hại
  //    (Nước thứ nhất rất tốt, nước thứ hai kém hơn ít nhất 0.15 điểm dự kiến)
  if (loss <= 0.015 && sortedMoves.length > 1) {
    const secondBestExpectedPoints = sortedMoves[1].expectedPoints;
    const differenceToSecond = bestExpectedPoints - secondBestExpectedPoints;
    
    if (differenceToSecond >= 0.15) {
      return 'great';
    }

    // B. Xoay chuyển thế khó thành hòa hoặc thắng:
    //    Nếu nước đi thứ hai có điểm dự kiến thấp (<= 0.40) mà nước thực tế kéo lên thế cân bằng hoặc tốt (>= 0.48)
    if (secondBestExpectedPoints <= 0.40 && actualExpectedPoints >= 0.48) {
      return 'great';
    }

    // C. Chuyển từ thế cân bằng thành ưu thế thắng chắc chắn:
    //    Nước thứ hai thường hòa (<= 0.55), nước đi này đột phá lên thắng (>= 0.70)
    if (secondBestExpectedPoints <= 0.55 && actualExpectedPoints >= 0.70) {
      return 'great';
    }
  }

  // ==========================================
  // 5. Phân loại thông thường dựa trên Số Điểm Dự Kiến Bị Mất (Expected Points Drop - Loss)
  // Ngưỡng phân loại Chess.com V2 chuẩn chỉ:
  // - Tốt nhất (Best Move): Loss = 0.00
  // - Xuất sắc (Excellent): Loss <= 0.02 (0.00 -> 0.02)
  // - Tốt (Good): Loss <= 0.05 (0.02 -> 0.05)
  // - Không chuẩn xác (Inaccuracy): Loss <= 0.10 (0.05 -> 0.10)
  // - Sai lầm (Mistake): Loss <= 0.20 (0.10 -> 0.20)
  // - Sai sót nghiêm trọng (Blunder): Loss > 0.20 (0.20 -> 1.00)
  if (loss <= 0.001) {
    return 'best';
  } else if (loss <= 0.02) {
    return 'excellent';
  } else if (loss <= 0.05) {
    return 'good';
  } else if (loss <= 0.10) {
    return 'inaccuracy';
  } else if (loss <= 0.20) {
    return 'mistake';
  } else {
    return 'blunder';
  }
}

function getPieceValue(type: PieceType): number {
  switch (type) {
    case PieceType.PAWN: return 100;
    case PieceType.KNIGHT: return 320;
    case PieceType.BISHOP: return 330;
    case PieceType.ROOK: return 500;
    case PieceType.QUEEN: return 900;
    case PieceType.KING: return 20000;
    default: return 0;
  }
}

export function getAnalysisDetails(category: MoveAnalysisClass): AnalysisResult {
  switch (category) {
    case 'book':
      return {
        category,
        label: 'Sách giáo khoa (Book)',
        colorClass: 'text-[#A5753F]',
        bgColorClass: 'bg-[#A5753F]/10',
        borderColorClass: 'border-[#A5753F]/30',
        badgeBg: 'bg-[#A5753F]',
        icon: '📖',
        description: 'Nước đi lý thuyết bài bản trong giai đoạn khai cuộc.'
      };
    case 'brilliant':
      return {
        category,
        label: 'Thiên tài (Brilliant)',
        colorClass: 'text-[#01ebc6]',
        bgColorClass: 'bg-[#01ebc6]/10',
        borderColorClass: 'border-[#01ebc6]/30',
        badgeBg: 'bg-[#01ebc6]',
        icon: '✨',
        description: 'Nước thí quân xuất thần đầy dũng cảm mở rộng ưu thế đoạt thế thắng!'
      };
    case 'great':
      return {
        category,
        label: 'Tuyệt vời (Great)',
        colorClass: 'text-[#3699FF]',
        bgColorClass: 'bg-[#3699FF]/10',
        borderColorClass: 'border-[#3699FF]/30',
        badgeBg: 'bg-[#3699FF]',
        icon: '🚀',
        description: 'Nước đi then chốt thay đổi hoàn toàn cục diện trận đấu hoặc là sự lựa chọn cứu vãn duy nhất.'
      };
    case 'best':
      return {
        category,
        label: 'Tốt nhất (Best)',
        colorClass: 'text-[#28A745]',
        bgColorClass: 'bg-[#28A745]/10',
        borderColorClass: 'border-[#28A745]/30',
        badgeBg: 'bg-[#28A745]',
        icon: '⭐',
        description: 'Lựa chọn hàng đầu được đề xuất bởi động cơ cờ vua mạnh nhất.'
      };
    case 'excellent':
      return {
        category,
        label: 'Xuất sắc (Excellent)',
        colorClass: 'text-[#5CD85C]',
        bgColorClass: 'bg-[#5CD85C]/10',
        borderColorClass: 'border-[#5CD85C]/30',
        badgeBg: 'bg-[#5CD85C]',
        icon: '✔️',
        description: 'Một nước đi siêu việt hầu như tốt tương đương nước tối ưu nhất.'
      };
    case 'good':
      return {
        category,
        label: 'Tốt (Good)',
        colorClass: 'text-[#8E9299]',
        bgColorClass: 'bg-[#8E9299]/10',
        borderColorClass: 'border-[#8E9299]/20',
        badgeBg: 'bg-[#8E9299]',
        icon: '👍',
        description: 'Lựa chọn an toàn, hợp lý giúp ổn định thế trận trên bàn cờ.'
      };
    case 'inaccuracy':
      return {
        category,
        label: 'Không chuẩn xác (Inaccuracy)',
        colorClass: 'text-[#FFC107]',
        bgColorClass: 'bg-[#FFC107]/10',
        borderColorClass: 'border-[#FFC107]/30',
        badgeBg: 'bg-[#FFC107]',
        icon: '⚠️',
        description: 'Nước đi hơi thiếu chuẩn xác làm suy giảm một phần lợi thế của bạn.'
      };
    case 'mistake':
      return {
        category,
        label: 'Sai lầm (Mistake)',
        colorClass: 'text-[#FD7E14]',
        bgColorClass: 'bg-[#FD7E14]/10',
        borderColorClass: 'border-[#FD7E14]/30',
        badgeBg: 'bg-[#FD7E14]',
        icon: '❓',
        description: 'Một sai lầm khiến thế cờ của bạn xấu đi lập tức.'
      };
    case 'miss':
      return {
        category,
        label: 'Bỏ lỡ cơ hội (Miss)',
        colorClass: 'text-[#F34D4D]',
        bgColorClass: 'bg-[#F34D4D]/10',
        borderColorClass: 'border-[#F34D4D]/30',
        badgeBg: 'bg-[#F34D4D]',
        icon: '❌',
        description: 'Bỏ lỡ cơ hội ngàn vàng để trừng phạt sai lầm của đối thủ hoặc xoay chuyển kết quả.'
      };
    case 'blunder':
      return {
        category,
        label: 'Sai sót nghiêm trọng (Blunder)',
        colorClass: 'text-[#DC3545]',
        bgColorClass: 'bg-[#DC3545]/10',
        borderColorClass: 'border-[#DC3545]/30',
        badgeBg: 'bg-[#DC3545]',
        icon: '❌',
        description: 'Nước đi đại bại tai họa dẫn đến mất chất quân lớn hoặc thua cuộc ngay lập tức!'
      };
  }
}
