
import React, { useEffect, useState } from 'react';
import { Player } from '../types/game';
import confetti from 'canvas-confetti';
import {
  Trophy,
  Medal,
  RotateCcw,
  Home,
  Sparkles,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  BookOpen,
} from 'lucide-react';
import { sounds } from '../game/audio';

export interface AdventureAnswerRecord {
  chestIndex: number;
  questionIndex: number;
  question: any;
  playerAnswer: string | number;
  correctAnswer: string | number;
  isCorrect: boolean;
  explanation?: string;
}

interface PodiumModalProps {
  players: Player[];
  onHome: () => void;
  adventureReview?: AdventureAnswerRecord[];
}

export const PodiumModal: React.FC<PodiumModalProps> = ({
  players,
  onHome,
  adventureReview,
}) => {
  const [showAdventureReview, setShowAdventureReview] = useState(false);

  const sorted = [...players].sort((a, b) => b.score - a.score);
  const first = sorted[0];
  const second = sorted[1];
  const third = sorted[2];

  const correctCount =
    adventureReview?.filter((item) => item.isCorrect).length ?? 0;

  const wrongCount =
    adventureReview?.filter((item) => !item.isCorrect).length ?? 0;

  useEffect(() => {
    sounds.playFanfare();

    const duration = 3.5 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
      });

      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  }, []);

  // Mengubah jawaban menjadi teks yang mudah dibaca
  const formatAnswer = (
    question: any,
    answer: string | number
  ): string => {
    if (answer === '__TIMEOUT__') return 'Waktu habis';
    if (answer === -1) return 'Tidak menjawab';

    if (
      question?.type === 'ox' ||
      question?.type === 'true_false'
    ) {
      const value = String(answer).toUpperCase();

      if (value === 'O' || value === 'TRUE') return 'O / Benar';
      if (value === 'X' || value === 'FALSE') return 'X / Salah';

      return String(answer);
    }

    if (Array.isArray(question?.options)) {
      const numericAnswer = Number(answer);

      if (
        Number.isInteger(numericAnswer) &&
        numericAnswer >= 0 &&
        numericAnswer < question.options.length
      ) {
        const option = question.options[numericAnswer];

        return typeof option === 'string'
          ? option
          : option?.text ?? option?.label ?? String(option);
      }

      const matchingOption = question.options.find(
        (option: any) =>
          String(option?.value) === String(answer) ||
          String(option?.id) === String(answer)
      );

      if (matchingOption) {
        return typeof matchingOption === 'string'
          ? matchingOption
          : matchingOption?.text ??
              matchingOption?.label ??
              String(answer);
      }
    }

    return String(answer);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border-2 border-indigo-500/50 rounded-3xl p-6 md:p-8 max-w-2xl w-full text-center shadow-2xl relative my-auto animate-in zoom-in-95 duration-300">

        {/* HEADER */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 font-extrabold text-xs uppercase tracking-widest mb-3">
          <Trophy className="w-4 h-4" />
          Podium Juara Meedu Quiz
        </div>

        <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
          Pemenang Kuis Terhebat!
        </h1>

        <p className="text-slate-400 text-sm mt-1">
          Pertarungan sengit di arena telah selesai. Inilah para juara terpintar!
        </p>

        {/* PODIUM COLUMNS */}
        <div className="flex items-end justify-center gap-3 md:gap-6 mt-8 mb-8 pt-6">

          {/* JUARA 2 */}
          {second && (
            <div className="flex flex-col items-center flex-1 max-w-[130px]">
              <div className="text-2xl mb-1">🥈</div>

              <div className="w-12 h-12 rounded-full border-2 border-slate-400 bg-slate-800 flex items-center justify-center font-bold text-white shadow-md text-sm mb-2">
                {second.name.slice(0, 2).toUpperCase()}
              </div>

              <span className="text-xs font-bold text-slate-200 truncate w-full">
                {second.name}
              </span>

              <span className="text-[11px] font-extrabold text-indigo-400 tabular-nums">
                {second.score.toLocaleString()} pts
              </span>

              <div className="w-full h-24 bg-gradient-to-t from-slate-800 to-slate-700/80 rounded-t-2xl border-t-2 border-slate-400 flex items-center justify-center text-slate-300 font-black text-xl shadow-inner mt-2">
                2
              </div>
            </div>
          )}

          {/* JUARA 1 */}
          {first && (
            <div className="flex flex-col items-center flex-1 max-w-[150px]">
              <div className="text-3xl mb-1 animate-bounce">👑</div>

              <div className="w-16 h-16 rounded-full border-4 border-amber-400 bg-amber-500/20 flex items-center justify-center font-black text-amber-300 shadow-xl shadow-amber-500/20 text-base mb-2">
                {first.name.slice(0, 2).toUpperCase()}
              </div>

              <span className="text-sm font-extrabold text-white truncate w-full">
                {first.name}
              </span>

              <span className="text-xs font-black text-amber-400 tabular-nums">
                {first.score.toLocaleString()} pts
              </span>

              <div className="w-full h-32 bg-gradient-to-t from-amber-600 to-yellow-500 rounded-t-2xl border-t-4 border-yellow-300 flex items-center justify-center text-slate-950 font-black text-3xl shadow-xl mt-2">
                1
              </div>
            </div>
          )}

          {/* JUARA 3 */}
          {third && (
            <div className="flex flex-col items-center flex-1 max-w-[130px]">
              <div className="text-2xl mb-1">🥉</div>

              <div className="w-12 h-12 rounded-full border-2 border-amber-700 bg-slate-800 flex items-center justify-center font-bold text-white shadow-md text-sm mb-2">
                {third.name.slice(0, 2).toUpperCase()}
              </div>

              <span className="text-xs font-bold text-slate-200 truncate w-full">
                {third.name}
              </span>

              <span className="text-[11px] font-extrabold text-amber-600 tabular-nums">
                {third.score.toLocaleString()} pts
              </span>

              <div className="w-full h-18 bg-gradient-to-t from-amber-950 to-amber-900 rounded-t-2xl border-t-2 border-amber-600 flex items-center justify-center text-amber-200 font-black text-xl shadow-inner mt-2">
                3
              </div>
            </div>
          )}
        </div>

        {/* REST OF LEADERBOARD */}
        <div className="max-h-40 overflow-y-auto bg-slate-950/60 rounded-2xl p-3 border border-slate-800 divide-y divide-slate-800/60 text-left">
          {sorted.slice(3).map((p, idx) => (
            <div
              key={p.id}
              className="flex items-center justify-between py-2 px-2 text-xs"
            >
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-500 w-5">
                  #{idx + 4}
                </span>

                <span className="text-slate-300 font-semibold">
                  {p.name}
                </span>

                {p.isHost && (
                  <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">
                    Host
                  </span>
                )}
              </div>

              <span className="font-extrabold text-white tabular-nums">
                {p.score.toLocaleString()} pts
              </span>
            </div>
          ))}
        </div>

        {/* DETAIL JAWABAN ADVENTURE */}
        {adventureReview !== undefined && (
          <div className="mt-6 text-left">

            <button
              type="button"
              onClick={() =>
                setShowAdventureReview((previous) => !previous)
              }
              className="w-full flex items-center justify-between gap-3 rounded-2xl border border-indigo-400/40 bg-indigo-500/10 hover:bg-indigo-500/20 px-4 py-3 text-indigo-300 transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>

                <div>
                  <p className="font-extrabold text-sm">
                    Lihat Detail Jawaban
                  </p>

                  <p className="text-xs text-slate-400">
                    Periksa semua jawaban soal Adventure
                  </p>
                </div>
              </div>

              {showAdventureReview ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>

            {showAdventureReview && (
              <div className="mt-4 space-y-4">

                {/* RINGKASAN */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-3 text-center">
                    <p className="text-lg font-black text-white">
                      {adventureReview.length}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Total Soal
                    </p>
                  </div>

                  <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-center">
                    <p className="text-lg font-black text-emerald-400">
                      {correctCount}
                    </p>
                    <p className="text-[10px] text-emerald-300">
                      Benar
                    </p>
                  </div>

                  <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-center">
                    <p className="text-lg font-black text-rose-400">
                      {wrongCount}
                    </p>
                    <p className="text-[10px] text-rose-300">
                      Salah
                    </p>
                  </div>
                </div>

                {/* DAFTAR SOAL */}
                <div className="max-h-[45vh] overflow-y-auto space-y-3 pr-1">

                  {adventureReview.length > 0 ? (
                    adventureReview.map((record, index) => (
                      <div
                        key={`${record.chestIndex}-${record.questionIndex}-${index}`}
                        className={`rounded-2xl border p-4 ${
                          record.isCorrect
                            ? 'border-emerald-500/30 bg-emerald-500/5'
                            : 'border-rose-500/30 bg-rose-500/5'
                        }`}
                      >

                        {/* NOMOR DAN STATUS */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <div className="flex flex-wrap gap-2">
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-950/70 px-2 py-1 rounded-lg">
                              PETI {record.chestIndex + 1}
                            </span>

                            <span className="text-[10px] font-bold text-slate-400 bg-slate-950/70 px-2 py-1 rounded-lg">
                              SOAL {record.questionIndex + 1}
                            </span>
                          </div>

                          {record.isCorrect ? (
                            <span className="flex items-center gap-1 text-xs font-extrabold text-emerald-400">
                              <CheckCircle2 className="w-4 h-4" />
                              BENAR
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs font-extrabold text-rose-400">
                              <XCircle className="w-4 h-4" />
                              SALAH
                            </span>
                          )}
                        </div>

                        {/* PERTANYAAN */}
                        <p className="text-sm font-bold leading-relaxed text-white">
                          {record.question?.question ?? 'Pertanyaan tidak tersedia'}
                        </p>

                        {/* JAWABAN PEMAIN */}
                        <div className="mt-3 rounded-xl bg-slate-950/70 p-3">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                            Jawaban kamu
                          </p>

                          <p className={`mt-1 text-sm font-semibold ${
                            record.isCorrect
                              ? 'text-emerald-400'
                              : 'text-rose-400'
                          }`}>
                            {formatAnswer(
                              record.question,
                              record.playerAnswer
                            )}
                          </p>
                        </div>

                        {/* KUNCI JAWABAN */}
                        <div className="mt-2 rounded-xl bg-slate-950/70 p-3">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                            Jawaban yang benar
                          </p>

                          <p className="mt-1 text-sm font-semibold text-emerald-400">
                            {formatAnswer(
                              record.question,
                              record.correctAnswer
                            )}
                          </p>
                        </div>

                        {/* PENJELASAN */}
                        {record.explanation && (
                          <div className="mt-2 rounded-xl bg-slate-950/70 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                              Penjelasan
                            </p>

                            <p className="mt-1 text-xs leading-relaxed text-slate-300">
                              {record.explanation}
                            </p>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-6 text-center">
                      <BookOpen className="w-8 h-8 mx-auto text-slate-600 mb-2" />

                      <p className="text-sm font-bold text-slate-300">
                        Belum ada riwayat jawaban
                      </p>

                      <p className="text-xs text-slate-500 mt-1">
                        Riwayat jawaban akan muncul setelah kamu menjawab soal.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ACTION BUTTONS */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
          <button
            onClick={onHome}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-2xl transition cursor-pointer"
          >
            <Home className="w-4 h-4" />
            Kembali ke Beranda
          </button>
        </div>
      </div>
    </div>
  );
};
