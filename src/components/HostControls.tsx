import React from 'react';
import { GameRoom } from '../types/game';
import { Play, SkipForward, Users, RotateCcw, Award } from 'lucide-react';

interface HostControlsProps {
  room: GameRoom;
  onStartGame: () => void;
  onNextQuestion: () => void;
  onForceReveal: () => void;
  onRestart: () => void;
  onAddBots: () => void;
}

export const HostControls: React.FC<HostControlsProps> = ({
  room,
  onStartGame,
  onNextQuestion,
  onForceReveal,
  onRestart,
  onAddBots,
}) => {
  return (
    <div className="bg-slate-900/95 border border-amber-500/40 rounded-2xl p-3 px-4 shadow-2xl backdrop-blur-md flex flex-wrap items-center justify-between gap-3 text-xs">
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
        <span className="font-extrabold text-amber-400 uppercase tracking-wider">
          Panel Guru / Host
        </span>
        <span className="text-slate-400">
          ({room.players.length} Pemain Bergabung)
        </span>
      </div>

      <div className="flex items-center gap-2">
        {room.stage === 'waiting' && (
          <>
            <button
              onClick={onAddBots}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl transition cursor-pointer"
            >
              <Users className="w-3.5 h-3.5" />
              +5 Teman Sekelas (Bot)
            </button>
            <button
              onClick={onStartGame}
              data-start="true"
              className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-black rounded-xl shadow-lg shadow-emerald-500/25 transition cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Mulai Game Sekarang
            </button>
          </>
        )}

        {room.stage === 'answering' && (
          <button
            onClick={onForceReveal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition cursor-pointer"
          >
            Buka Jawaban Langsung
          </button>
        )}

        {(room.stage === 'reveal' || room.stage === 'times_up' || room.stage === 'round_result') && (
          <button
            onClick={onNextQuestion}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-black rounded-xl shadow-lg shadow-indigo-500/25 transition cursor-pointer"
          >
            {room.currentQuestionIndex + 1 < room.quizPack.questions.length ? (
              <>
                <SkipForward className="w-3.5 h-3.5" />
                Soal Berikutnya
              </>
            ) : (
              <>
                <Award className="w-3.5 h-3.5" />
                Lihat Podium Juara
              </>
            )}
          </button>
        )}

        {room.stage === 'podium' && (
          <button
            onClick={onRestart}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Mainkan Ulang
          </button>
        )}
      </div>
    </div>
  );
};
