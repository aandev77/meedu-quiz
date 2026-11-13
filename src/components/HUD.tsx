import React from 'react';
import { GameRoom, Player, Question } from '../types/game';
import { Volume2, VolumeX, Flame, Trophy, Copy, Check, Sparkles } from 'lucide-react';

interface HUDProps {
  room: GameRoom;
  currentPlayer: Player;
  onLeaveRoom: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  room,
  currentPlayer,
  onLeaveRoom,
  isMuted,
  onToggleMute,
}) => {
  const [copied, setCopied] = React.useState(false);
  const currentQuestion: Question | undefined = room.quizPack.questions[room.currentQuestionIndex];

  const handleCopyPin = () => {
    navigator.clipboard.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Calculate player rank
  const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);
  const myRank = sortedPlayers.findIndex((p) => p.id === currentPlayer.id) + 1;

  // Time bar percentage
  const timePercent = room.totalTime > 0 ? (room.timeLeft / room.totalTime) * 100 : 0;
  const isTimeUrgent = room.timeLeft <= 5 && room.stage === 'answering';

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 z-20">
      {/* TOP SECTION: BAR & QUESTION CARD DOCKED AT TOP */}
      <div className="flex flex-col gap-3 pointer-events-auto max-w-4xl w-full mx-auto">
        {/* Top Info Bar */}
        <div className="flex flex-wrap items-start justify-between gap-1.5 sm:gap-3">
          {/* Room Code Badge */}
          <div className="flex min-w-0 max-w-[min(58%,260px)] items-center gap-1 sm:gap-2 bg-slate-900/90 border border-slate-700/80 px-2 sm:px-3.5 py-1.5 rounded-xl sm:rounded-2xl shadow-xl backdrop-blur-md">
            <span className="shrink-0 text-[9px] sm:text-[11px] font-semibold text-slate-400">PIN</span>
            <span className="min-w-0 truncate font-black text-indigo-300 tracking-wide text-[10px] sm:text-sm">{room.code}</span>
            <button
              onClick={handleCopyPin}
              className="shrink-0 p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
              title="Salin PIN"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Player Stats & Rank */}
          <div className="flex min-w-0 flex-wrap items-center justify-end gap-1 sm:gap-2.5">
            {currentPlayer.streak > 1 && (
              <div className="flex shrink-0 items-center gap-1 px-1.5 sm:gap-1.5 sm:px-3 py-1 bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/40 rounded-lg sm:rounded-xl text-orange-400 font-bold text-[9px] sm:text-xs shadow-md animate-pulse">
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                <span>x{currentPlayer.streak} Streak!</span>
              </div>
            )}

            <div className="flex shrink-0 items-center gap-1 sm:gap-2 bg-slate-900/90 border border-slate-700/80 px-1.5 sm:px-3 py-1 rounded-lg sm:rounded-xl shadow-xl backdrop-blur-md">
              <Trophy className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400" />
              <div className="flex items-center gap-1">
                <span className="text-[8px] sm:text-[10px] text-slate-400 font-bold uppercase">
                  #{myRank}
                </span>
                <span className="text-[9px] sm:text-xs font-black text-white tabular-nums whitespace-nowrap">
                  {currentPlayer.score.toLocaleString()} pts
                </span>
              </div>
            </div>

            {/* Audio toggle & leave button */}
            <div className="flex shrink-0 items-center gap-0.5 bg-slate-900/90 border border-slate-700/80 p-0.5 rounded-lg sm:rounded-xl shadow-xl">
              <button
                onClick={onToggleMute}
                className="p-1 sm:p-1.5 rounded-md sm:rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                title={isMuted ? 'Nyalakan Suara' : 'Matikan Suara'}
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
              </button>
              <button
                onClick={onLeaveRoom}
                className="px-1.5 sm:px-2.5 py-1 text-[9px] sm:text-[11px] font-semibold text-rose-300 hover:text-white hover:bg-rose-600/30 rounded-md sm:rounded-lg transition cursor-pointer whitespace-nowrap"
              >
                Keluar
              </button>
            </div>
          </div>
        </div>

        {/* QUESTION DISPLAY CARD (DOCKED AT TOP) */}
        {currentQuestion && room.mode !== 'adventure' && (
          <div className="bg-slate-900/95 border border-indigo-500/40 rounded-2xl p-3.5 shadow-2xl backdrop-blur-xl text-center relative overflow-hidden transition-all">
            {/* Top Info Bar */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-indigo-400 uppercase tracking-wider text-[11px]">
                  Soal {room.currentQuestionIndex + 1} / {room.quizPack.questions.length}
                </span>
                {currentQuestion.category && (
                  <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-medium text-[10px]">
                    {currentQuestion.category}
                  </span>
                )}
              </div>

              {/* Countdown Timer Badge */}
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-slate-400">WAKTU:</span>
                <span
                  className={`text-sm font-black px-2 py-0.5 rounded-lg tabular-nums ${
                    isTimeUrgent
                      ? 'bg-red-500/30 text-red-400 border border-red-500/40 animate-ping'
                      : 'bg-indigo-500/20 text-indigo-300'
                  }`}
                >
                  {room.timeLeft}s
                </span>
              </div>
            </div>

            {/* Timer Progress Bar */}
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
              <div
                className={`h-full transition-all duration-300 rounded-full ${
                  isTimeUrgent
                    ? 'bg-red-500'
                    : timePercent < 50
                    ? 'bg-amber-500'
                    : 'bg-gradient-to-r from-indigo-500 to-purple-500'
                }`}
                style={{ width: `${Math.max(0, Math.min(100, timePercent))}%` }}
              />
            </div>

            {/* Question Text */}
            <h2 className="text-base md:text-lg font-extrabold text-white mt-2 leading-snug">
              {currentQuestion.question}
            </h2>

            {/* Current Player Zone Hint */}
            <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <div className="flex items-center gap-1">
                <span>Zona Kamu:</span>
                <span
                  className={`font-black px-2 py-0.5 rounded text-[10px] ${
                    currentPlayer.currentZone === 'none'
                      ? 'bg-slate-800 text-slate-400'
                      : currentPlayer.currentZone === 'O'
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : currentPlayer.currentZone === 'X'
                      ? 'bg-rose-500 text-white shadow-sm'
                      : 'bg-indigo-600 text-white'
                  }`}
                >
                  {currentPlayer.currentZone === 'none' ? 'Belum Masuk Zona' : `Zona ${currentPlayer.currentZone}`}
                </span>
              </div>

              <div className="text-[10px] text-slate-400 hidden sm:block">
                {currentQuestion.type === 'ox' ? 'Lari ke sisi O (Benar) atau X (Salah)!' : 'Lari ke sudut A, B, C, atau D!'}
              </div>
            </div>

            {/* REVEAL EXPLANATION OVERLAY */}
            {(room.stage === 'reveal' || room.stage === 'times_up' || room.stage === 'round_result') && (
              <div className="mt-2 p-2.5 rounded-xl bg-gradient-to-r from-indigo-950/90 to-purple-950/90 border border-indigo-500/50 text-left animate-in fade-in duration-200">
                <div className="flex items-center gap-1.5 text-emerald-400 font-extrabold text-xs mb-0.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Jawaban Benar: Zona {room.roundResults?.correctZone}
                </div>
                {currentQuestion.explanation && (
                  <p className="text-slate-200 text-[11px] leading-relaxed">
                    {currentQuestion.explanation}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
};
