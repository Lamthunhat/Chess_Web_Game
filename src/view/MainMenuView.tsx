import React, { useState } from 'react';
import { User, GameRecord } from '../model/User';
import { GameSettings, GameMode } from '../controller/MenuController';
import { AuthController } from '../controller/AuthController';
import { Swords, History, Settings, RotateCcw, BookOpen } from 'lucide-react';

interface MainMenuViewProps {
  user: User;
  onStartGame: (settings: GameSettings) => void;
  onShowHistory: (record: GameRecord) => void;
  onUpdateUser: (user: User) => void;
}

export const MainMenuView: React.FC<MainMenuViewProps> = ({
  user,
  onStartGame,
  onShowHistory,
  onUpdateUser,
}) => {
  const [mode, setMode] = useState<GameMode>('ai');
  const [botDifficulty, setBotDifficulty] = useState<number>(1200);
  const [playerColor, setPlayerColor] = useState<'white' | 'black' | 'random'>('white');
  const [timeLimit, setTimeLimit] = useState<number | null>(null);

  const filteredHistory = user.history.filter((record) => {
    const isAi = record.opponent.startsWith('BOT');
    return mode === 'ai' ? isAi : !isAi;
  });

  const handleLaunch = () => {
    onStartGame({
      mode,
      botDifficulty,
      playerColor,
      timeLimit,
    });
  };

  const handleResetStats = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử đấu này?')) {
      const freshUser = AuthController.resetStats();
      onUpdateUser(freshUser);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Overview Greeting */}
      <div className="mb-6 pb-4 border-b border-[#3c3a37] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-extrabold text-slate-100 uppercase tracking-widest text-[#81b64c]">
            SẢNH ĐẤU
          </h2>
        </div>
        <button
          onClick={handleResetStats}
          title="Xóa lịch sử đấu"
          className="px-3 py-1.5 border border-[#3c3a37] hover:border-transparent bg-[#312e2b] hover:bg-rose-950/40 text-[#8E9299] hover:text-rose-400 rounded-lg text-xs font-semibold cursor-pointer transition flex items-center gap-1.5"
        >
          <RotateCcw size={13} />
          <span>Xóa Lịch Sử</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left options column (Matchmaking / Sandbox Setup) */}
        <div className="lg:col-span-12 xl:col-span-5 space-y-6">
          <div className="bg-[#2b2925] border border-[#3c3a37] rounded-2xl shadow-sm p-6 space-y-6 h-full flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex items-center gap-2 pb-4 border-b border-[#3c3a37]">
                <Settings size={20} className="text-[#81b64c]" />
                <h3 className="font-sans font-extrabold text-slate-100 text-lg">Cấu Hình Ván Đấu</h3>
              </div>

              {/* Mode Selection */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#8E9299] mb-2">
                  Chế Độ Chơi
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setMode('ai')}
                    className={`py-3 px-4 rounded-xl font-medium text-sm border transition flex flex-col items-center gap-1 cursor-pointer ${
                      mode === 'ai'
                        ? 'bg-[#81b64c] text-white border-[#81b64c] font-bold shadow-md shadow-[#81b64c]/10'
                        : 'bg-[#312e2b] text-[#E0E0E0] border-[#3c3a37] hover:border-[#81b64c]/40'
                    }`}
                  >
                    <span className="font-bold text-xs">ĐẤU VỚI MÁY</span>
                    <span className="text-[9px] opacity-80 font-normal">Tập luyện với AI Bot</span>
                  </button>
                  <button
                    onClick={() => setMode('local')}
                    className={`py-3 px-4 rounded-xl font-medium text-sm border transition flex flex-col items-center gap-1 cursor-pointer ${
                      mode === 'local'
                        ? 'bg-[#81b64c] text-white border-[#81b64c] font-bold shadow-md shadow-[#81b64c]/10'
                        : 'bg-[#312e2b] text-[#E0E0E0] border-[#3c3a37] hover:border-[#81b64c]/40'
                    }`}
                  >
                    <span className="font-bold text-xs">HAI NGƯỜI CHƠI</span>
                    <span className="text-[9px] opacity-80 font-normal">Chơi cục bộ tại chỗ</span>
                  </button>
                </div>
              </div>

              {/* AI Difficulty Slider */}
              {mode === 'ai' && (() => {
                let label = 'Tập Sự';
                let colorClass = 'text-emerald-400';
                if (botDifficulty > 1700) {
                  label = 'Cao Thủ';
                  colorClass = 'text-rose-400';
                } else if (botDifficulty > 1200) {
                  label = 'Chuyên Nghiệp';
                  colorClass = 'text-amber-400';
                } else if (botDifficulty > 700) {
                  label = 'Trung Cấp';
                  colorClass = 'text-blue-400';
                }

                return (
                  <div className="space-y-3 font-sans">
                    <div className="flex items-center justify-between">
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-[#8E9299]">
                        Cấp Độ Của Bot
                      </label>
                      <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-[#312e2b] border border-[#3c3a37] ${colorClass}`}>
                        {label}
                      </span>
                    </div>

                    <div className="bg-[#21201d] border border-[#3c3a37] rounded-xl p-4 space-y-3">
                      <div className="flex items-baseline justify-between">
                        <span className="text-2xl font-mono font-black text-[#81b64c] leading-none">
                          {botDifficulty <= 4 ? 1200 : botDifficulty} <span className="text-xs font-bold text-slate-400 uppercase font-sans">Elo</span>
                        </span>
                      </div>

                      <input
                        type="range"
                        min="200"
                        max="2000"
                        step="50"
                        value={botDifficulty <= 4 ? 1200 : botDifficulty}
                        onChange={(e) => setBotDifficulty(Number(e.target.value))}
                        className="w-full h-2 bg-[#3c3a37] rounded-lg appearance-none cursor-pointer accent-[#81b64c] focus:outline-none"
                      />

                      <div className="flex justify-between text-[9px] font-bold text-[#8E9299] font-mono">
                        <span>200 Elo</span>
                        <span>1100 Elo</span>
                        <span>2000 Elo</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Side / Team color selection */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#8E9299] mb-2">
                  Chọn Quân Cờ Của Bạn
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setPlayerColor('white')}
                    className={`py-2 px-3 text-center text-xs font-medium rounded-xl border transition cursor-pointer flex flex-col items-center gap-1.5 ${
                      playerColor === 'white'
                        ? 'bg-[#312e2b] border-[#81b64c] text-[#81b64c] font-bold'
                        : 'bg-[#312e2b]/60 border-[#3c3a37] text-slate-400 hover:border-[#81b64c]/30'
                    }`}
                  >
                    <div className="w-4 h-4 rounded-full bg-slate-100 border border-slate-300"></div>
                    <span className="text-[10px]">Quân Trắng</span>
                  </button>
                  <button
                    onClick={() => setPlayerColor('black')}
                    className={`py-2 px-3 text-center text-xs font-medium rounded-xl border transition cursor-pointer flex flex-col items-center gap-1.5 ${
                      playerColor === 'black'
                        ? 'bg-[#312e2b] border-[#81b64c] text-[#81b64c] font-bold'
                        : 'bg-[#312e2b]/60 border-[#3c3a37] text-slate-400 hover:border-[#81b64c]/30'
                    }`}
                  >
                    <div className="w-4 h-4 rounded-full bg-slate-900 border border-slate-950"></div>
                    <span className="text-[10px]">Quân Đen</span>
                  </button>
                  <button
                    onClick={() => setPlayerColor('random')}
                    className={`py-2 px-3 text-center text-xs font-medium rounded-xl border transition cursor-pointer flex flex-col items-center gap-1.5 ${
                      playerColor === 'random'
                        ? 'bg-[#312e2b] border-[#81b64c] text-[#81b64c] font-bold'
                        : 'bg-[#312e2b]/60 border-[#3c3a37] text-slate-400 hover:border-[#81b64c]/30'
                    }`}
                  >
                    <div className="w-4 h-4 rounded-full bg-gradient-to-r from-slate-100 to-slate-900 border border-slate-300"></div>
                    <span className="text-[10px]">Ngẫu Nhiên</span>
                  </button>
                </div>
              </div>

              {/* Time Limit Selection */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#8E9299] mb-2 font-sans">
                  Thời Gian Mỗi Bên
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { val: null, label: 'Vô Hạn', desc: 'Không giới hạn' },
                    { val: 300, label: '5 Phút', desc: 'Chớp nhoáng' },
                    { val: 600, label: '10 Phút', desc: 'Cờ nhanh' },
                    { val: 1800, label: '30 Phút', desc: 'Tiêu chuẩn' },
                  ].map((item) => (
                    <button
                      key={item.val === null ? 'infinite' : item.val}
                      onClick={() => setTimeLimit(item.val)}
                      type="button"
                      className={`py-2 px-1 text-center rounded-xl border transition cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                        timeLimit === item.val
                          ? 'bg-[#312e2b] border-[#81b64c] text-[#81b64c] font-bold shadow-sm shadow-[#81b64c]/10'
                          : 'bg-[#312e2b]/60 border-[#3c3a37] text-[#8E9299] hover:text-[#E0E0E0] hover:border-[#81b64c]/30'
                      }`}
                    >
                      <span className="text-[10px] font-extrabold whitespace-nowrap">{item.label}</span>
                      <span className="text-[8px] opacity-75 font-normal tracking-tight whitespace-nowrap">{item.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleLaunch}
              className="w-full mt-6 py-4 px-6 bg-[#81b64c] text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:opacity-90 active:scale-98 transition flex items-center justify-center gap-2 shadow-lg shadow-[#81b64c]/10 cursor-pointer"
            >
              <Swords size={18} />
              Bắt Đầu Ván Đấu
            </button>
          </div>
        </div>

        {/* Right dashboard column (Game History & Achievements) */}
        <div className="lg:col-span-12 xl:col-span-7">
          <div className="bg-[#2b2925] border border-[#3c3a37] rounded-2xl shadow-sm p-6 flex flex-col h-full min-h-[420px]">
            <div className="flex items-center gap-2 pb-4 border-b border-[#3c3a37] mb-4">
              <History size={20} className="text-[#81b64c]" />
              <h3 className="font-sans font-extrabold text-slate-100 text-lg">Lịch sử đấu</h3>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 max-h-[450px] space-y-3 custom-scrollbar">
              {filteredHistory.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center py-12 text-[#8E9299]">
                  <History size={48} className="stroke-1 mb-3 opacity-60 text-[#81b64c]" />
                  <p className="text-sm font-medium">Chưa có trận đấu nào được lưu lại.</p>
                  <p className="text-xs mt-1 text-[#8E9299]/60 text-center font-sans">
                    {mode === 'ai'
                      ? 'Hãy trải nghiệm các ván đấu với Bot để rèn luyện kỹ năng kì sĩ ngay!'
                      : 'Hãy thử tài đấu trí trực tiếp cùng bạn bè tại chỗ ngay!'}
                  </p>
                </div>
              ) : (
                filteredHistory.map((record) => {
                  const isWin = record.result === 'win';
                  const isLoss = record.result === 'loss';
                  const isDraw = record.result === 'draw';

                  return (
                    <div
                      key={record.id}
                      className="flex items-center justify-between p-4 bg-[#312e2b]/50 hover:bg-[#312e2b] border border-[#3c3a37] rounded-xl transition duration-150"
                    >
                      <div className="flex items-center gap-3">
                        {/* Result badge icon */}
                        <div
                           className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold border ${
                            isWin
                              ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800'
                              : isLoss
                              ? 'bg-rose-950/40 text-rose-400 border-rose-800'
                              : 'bg-zinc-850 text-zinc-300 border-zinc-700'
                          }`}
                        >
                          {isWin ? 'WIN' : isLoss ? 'LOST' : 'DRAW'}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-[#E0E0E0]">{record.opponent}</span>
                            <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider border ${
                              record.playerColor === 'white'
                                ? 'bg-[#312e2b] text-[#E0E0E0] border-[#3c3a37]'
                                : 'bg-[#21201d] text-[#8E9299] border-[#3c3a37]'
                            }`}>
                              Quân {record.playerColor === 'white' ? 'Trắng' : 'Đen'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-[#8E9299]">
                            <span>📅 Ngày {record.date}</span>
                            <span>⚔️ {record.movesCount} nước đi</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 justify-center">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded border ${
                          isWin
                            ? 'bg-emerald-950/20 text-emerald-400 border-emerald-800/40'
                            : isLoss
                            ? 'bg-rose-950/20 text-rose-400 border-rose-800/40'
                            : 'bg-[#312e2b] text-slate-400 border-[#3c3a37]'
                        }`}>
                          {isWin ? 'Chiến thắng' : isLoss ? 'Thua cuộc' : 'Hòa cờ'}
                        </span>
                        
                        {record.moves && record.moves.length > 0 && (
                          <button
                            onClick={() => onShowHistory(record)}
                            className="px-2.5 py-1 bg-[#312e2b] hover:bg-[#81b64c] hover:text-white border border-[#3c3a37] hover:border-transparent text-[10px] font-bold text-[#81b64c] rounded-md cursor-pointer flex items-center gap-1 transition duration-150 shadow-sm"
                          >
                            <BookOpen size={11} />
                            Xem lại
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
