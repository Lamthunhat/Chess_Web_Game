class SoundService {
  private isMuted: boolean = false;

  constructor() {
    this.isMuted = this.loadMuteState();
  }

  private loadMuteState(): boolean {
    try {
      const stored = localStorage.getItem('chess_muted');
      return stored === 'true';
    } catch {
      return false;
    }
  }

  private saveMuteState(muted: boolean) {
    try {
      localStorage.setItem('chess_muted', String(muted));
    } catch {}
  }

  private playSoundFile(path: string) {
    if (this.isMuted) return;
    try {
      const audio = new Audio(path);
      audio.volume = 0.7;
      audio.play().catch(err => {
        console.warn(`Không thể phát âm thanh từ file ${path}:`, err);
      });
    } catch (e) {
      console.warn(`Lỗi khi khởi tạo âm thanh cho file ${path}:`, e);
    }
  }

  toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    this.saveMuteState(this.isMuted);
    return this.isMuted;
  }

  getMutedState(): boolean {
    return this.isMuted;
  }

  // --- Bắt đầu trận đấu ---
  playGameStart() {
    this.playSoundFile('/sounds/start.mp3');
  }

  // --- Nước đi bình thường ---
  playMove() {
    this.playSoundFile('/sounds/move.mp3');
  }

  // --- Nhập thành ---
  playCastle() {
    this.playSoundFile('/sounds/castling.mp3');
  }

  // --- Ăn quân ---
  playCapture() {
    this.playSoundFile('/sounds/capture.mp3');
  }

  // --- Chiếu tướng ---
  playCheck() {
    this.playSoundFile('/sounds/check.mp3');
  }

  // --- Kết thúc trận thông thường (Đầu hàng, hết giờ) ---
  playGameOver(isWin: boolean) {
    this.playSoundFile('/sounds/game-over.mp3');
  }

  // --- Hòa cờ ---
  playStalemate() {
    this.playSoundFile('/sounds/stalemate.mp3');
  }

  // --- Chiếu bí ---
  playCheckmate(isWin: boolean) {
    this.playSoundFile('/sounds/checkmate.mp3');
  }

  // --- Phong cấp Tốt ---
  playPromotion() {
    this.playSoundFile('/sounds/promotion.mp3');
  }
}

export const sound = new SoundService();
