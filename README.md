# Chess.UTC 🏆

[English](#english) | [Tiếng Việt](#tiếng-việt)

---

## English

Chess.UTC is a premium React-based chess application inspired by the look, feel, and performance of Chess.com. It is designed using a clean MVC (Model-View-Controller) architecture, featuring dynamic scaling, advanced game history tracking, and custom local asset support.

### 📁 Project Structure

```
├── public/
│   ├── images/pieces/      # Custom chess piece PNG files directory
│   └── sounds/             # Sound effects (MP3s) for moves, captures, checks, etc.
└── src/
    ├── ai/                 # Chess engines and minimax decision algorithms
    │   ├── ChessEngine.ts  # Alpha-beta minimax solver for bot moves
    │   └── Evaluation.ts   # Heuristic piece-square table evaluator
    ├── controller/         # Application workflow controllers (MVC)
    │   ├── AuthController.ts # User session and stats reset controllers
    │   └── GameController.ts # Main game loops, timer ticking, moves execution
    ├── css/                # Modular stylesheet structures
    │   ├── theme.css       # Font properties, Tailwind v4 @theme, background
    │   ├── animations.css  # CSS keyframes and transitions (zoom, blink)
    │   └── scrollbar.css   # Custom scrollbars for move log history lists
    ├── model/              # Core game objects and schemas (MVC)
    │   ├── Board.ts        # 8x8 Board representation, move generator, FEN, checks
    │   ├── Move.ts         # Move interface and coordinate converters
    │   ├── Piece.ts        # Piece types, colors, and coordinates properties
    │   └── User.ts         # LocalStorage UserManager database actions
    ├── utils/              # Helper utilities
    │   ├── sound.ts        # Audio sound player controllers
    │   ├── analysis.ts     # Move classification (brilliant, blunder, excellent)
    │   └── reconstruct.ts  # Historical move notation reconstructor
    ├── view/               # React UI components (MVC Views)
    │   ├── BoardView.tsx   # The main gameplay board view and side controls
    │   ├── MainMenuView.tsx# Sảnh chờ (lobby), settings, and match history
    │   ├── PieceSVG.tsx    # Renders PNG image pieces with automated SVG vector fallback
    │   └── UTCLogo.tsx     # Vector representation of UTC Emblem
    ├── index.css           # Global entry style loader importing modular modules
    └── main.tsx            # React application startup entry point
```

### ⚙️ How It Works

1. **MVC Architecture**:
   - **Model**: [Board.ts](src/model/Board.ts) holds the state of the 8x8 grid. It generates legal moves and evaluates checks, draws, stalemates, and castling rights.
   - **View**: React components in `src/view/` handle user interactions, render captured boards, sound players, and animations.
   - **Controller**: [GameController.ts](src/controller/GameController.ts) handles square clicks, pawn promotions, timer countdowns, and forwards updates to views.

2. **Game Modes & Filtering**:
   - **AI Bot Mode**: Users play against a Minimax Bot (depth-based difficulty). Moves are computed asynchronously. Real-time evaluations are computed using Stockfish depth 10 via Web Workers.
   - **Two Player Mode**: Two players play locally on the same screen.
   - **Filtered History**: Game records are saved to `localStorage` under dynamic identifiers. The main lobby filters histories so that AI bot games are only visible when selecting Bot mode, and local games are visible under 2-Player mode.

3. **Assets Loading with Fallback**:
   - The app attempts to load custom piece PNGs from `public/images/pieces/` (e.g. `white-rook.png`).
   - If a file is missing or triggers an error, [PieceSVG.tsx](src/view/PieceSVG.tsx) automatically catches the error and falls back to clean, custom SVG vectors to avoid broken images.

4. **Dynamic Scaling**:
   - The game fits cleanly in standard viewports without vertical scrollbars by leveraging height constraints (`vh` units) on containers.

---

## Tiếng Việt

Chess.UTC là ứng dụng cờ vua cao cấp viết bằng React, lấy cảm hứng thiết kế từ Chess.com. Dự án được triển khai theo mô hình MVC (Model-View-Controller) chặt chẽ, hỗ trợ scale màn hình linh hoạt, ghi nhận lịch sử đấu nâng cao và tải hình ảnh quân cờ tùy biến.

### 📁 Cấu Trúc Dự Án

*   `public/`: Chứa các tài nguyên tĩnh như file nhạc hiệu ứng MP3 và thư mục ảnh tốt, mã, xe...
*   `src/ai/`: Giải thuật AI Minimax độ sâu alpha-beta và bảng lượng giá thế trận.
*   `src/controller/`: Điều khiển luồng nghiệp vụ game, bộ đếm giờ và điều phối dữ liệu.
*   `src/css/`: Tách biệt mã CSS thành các file mô-đun: theme, hiệu ứng chuyển động và thanh cuộn.
*   `src/model/`: Mô phỏng bàn cờ 8x8, nước đi hợp lệ, thực thi nước đi và lưu trữ dữ liệu người dùng tại LocalStorage.
*   `src/utils/`: Tiện ích âm thanh, phân loại nước đi (sai lầm, thiên tài, tối ưu) và khôi phục ván cờ cũ.
*   `src/view/`: Các thành phần giao diện React (Bàn cờ, Sảnh chính, Biểu tượng quân cờ SVG Fallback).

### ⚙️ Cách Thức Hoạt Động

1. **Kiến trúc MVC**:
   - **Model**: Quản lý trạng thái quân cờ và luật chơi (chiếu tướng, nhập thành, bắt chốt qua đường, hòa cờ).
   - **View**: Hiển thị bàn cờ, quân cờ ăn được, thanh đánh giá thế trận và điều khiển.
   - **Controller**: Tiếp nhận sự kiện bấm ô cờ, xử lý phong cấp, cập nhật thời gian và cập nhật lại View.

2. **Lọc lịch sử đấu theo chế độ**:
   - Trận đấu chống máy (AI) và chơi hai người cục bộ (Local) đều được ghi nhận vào lịch sử đấu.
   - Sảnh chính sẽ tự động lọc danh sách đấu tương ứng với tab bạn chọn giúp giao diện trực quan và chuyên nghiệp.

3. **Fallback Tải Ảnh Quân Cờ**:
   - Ứng dụng ưu tiên tải các file ảnh dạng `.png` từ thư mục ảnh quân cờ của người dùng.
   - Nếu ảnh bị thiếu hoặc lỗi đường dẫn, hệ thống tự động fallback chuyển sang vẽ quân cờ bằng mã SVG vector tích hợp sẵn, đảm bảo không bao giờ bị lỗi hiển thị.

4. **Tự động Co giãn (Scale)**:
   - Toàn bộ giao diện đấu cờ tự động co giãn theo chiều cao trình duyệt, không gây cuộn trang và giữ cân đối.

---

## 🚀 Development & Commands

### Prerequisites: Node.js (v18+)

1. **Install Dependencies / Cài đặt thư viện**:
   ```bash
   npm install
   ```
2. **Start Development Server / Chạy thử nghiệm**:
   ```bash
   npm run dev
   ```
3. **Build for Production / Đóng gói sản phẩm**:
   ```bash
   npm run build
   ```
