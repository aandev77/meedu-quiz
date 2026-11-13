import React, { useEffect, useState } from 'react';
import { AvatarConfig, GameMode, QuizPack } from '../types/game';
import {
  ArrowRight,
  Gamepad2,
  Users,
  BookOpen,
  Trophy,
  Brain,
  Check,
  Map,
  Trash2,
} from 'lucide-react';

interface LobbyViewProps {
  userRole: 'teacher' | 'student';
  quizPacks: QuizPack[];
  onHostGame: (pack: QuizPack, mode: GameMode) => void;
  onJoinGame: (pin: string, name: string) => void;
  onQuickPlay: () => void;
  onOpenCustomizer: () => void;
  onOpenCreator: () => void;
  onTestMap: (pack: QuizPack) => void;
  onDeleteQuizPack: (packId: string) => void;
  playerName: string;
  avatar: AvatarConfig;
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  userRole,
  quizPacks,
  onHostGame,
  onJoinGame,
  onTestMap,
  onDeleteQuizPack,
  playerName,
  avatar,
}) => {
  const [pinInput, setPinInput] = useState('');
  const [selectedPackId, setSelectedPackId] = useState('');
  const [selectedMode] = useState<GameMode>('adventure');
  const [joinError, setJoinError] = useState('');

  const selectedPack = quizPacks.find(
    (pack) => pack.id === selectedPackId
  );

  useEffect(() => {
    if (!quizPacks.some((pack) => pack.id === selectedPackId)) {
      setSelectedPackId('');
    }
  }, [quizPacks, selectedPackId]);

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const cleanPin = pinInput.trim().replace(/\D/g, '');

    if (cleanPin.length < 4 || cleanPin.length > 6) {
      setJoinError('Masukkan PIN permainan 4–6 digit.');
      return;
    }

    setJoinError('');
    onJoinGame(cleanPin, playerName || 'Pemain');
  };

  return (
    <main className="min-h-screen bg-[#FFF9FC]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-7 sm:py-10 space-y-9">

        {/* HEADER LOBBY */}
        <section className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-pink-600 mb-2">
              MEEDU QUIZ / LOBBY
            </p>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-800">
              {userRole === 'teacher'
                ? 'Siapkan permainan kelas'
                : 'Selamat datang di arena kuis'}
            </h1>

            <p className="text-sm text-slate-500 leading-6 mt-3">
              {userRole === 'teacher'
                ? 'Pilih materi kuis dan mulai sesi permainan bersama siswa.'
                : 'Gabung ke ruang permainan menggunakan PIN dari guru dan mulai tantanganmu.'}
            </p>
          </div>

          {userRole === 'student' && (
            <div className="flex items-center gap-3 bg-white border border-pink-100 rounded-xl px-4 py-3 shadow-sm w-full sm:w-auto">
              <div
                className="w-10 h-10 rounded-full border-2 border-pink-200 flex items-center justify-center text-xs font-bold text-white shrink-0"
                style={{ backgroundColor: avatar.shirtColor }}
              >
                {playerName
                  ? playerName.slice(0, 2).toUpperCase()
                  : 'ME'}
              </div>

              <div className="min-w-0">
                <p className="text-[11px] text-slate-400">Pemain</p>
                <p className="text-sm font-semibold text-slate-800 truncate">
                  {playerName || 'Pemain Baru'}
                </p>
              </div>
            </div>
          )}
        </section>

        {/* STUDENT LOBBY */}
        {userRole === 'student' && (
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-8 bg-white border border-pink-100 rounded-2xl p-5 sm:p-7 shadow-sm">
              <div className="flex items-start gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center shrink-0">
                  <Gamepad2 className="w-5 h-5" />
                </div>

                <div>
                  <h2 className="text-lg font-bold text-slate-800">
                    Gabung Permainan
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    Masukkan PIN untuk bergabung ke ruang kuis.
                  </p>
                </div>
              </div>

              <form onSubmit={handleJoinSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="game-pin"
                    className="block text-xs font-semibold text-slate-600 mb-2"
                  >
                    PIN Permainan
                  </label>

                  <input
                    id="game-pin"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={6}
                    value={pinInput}
                    onChange={(e) => {
                      setPinInput(
                        e.target.value.replace(/\D/g, '').slice(0, 6)
                      );
                      setJoinError('');
                    }}
                    placeholder="Masukkan 4–6 digit PIN"
                    className={`w-full px-4 py-4 rounded-xl bg-[#FFFAFC] border text-center text-xl sm:text-2xl font-bold tracking-[0.35em] text-pink-600 placeholder:text-slate-300 placeholder:text-sm placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400 transition ${
                      joinError ? 'border-red-300' : 'border-pink-200'
                    }`}
                  />

                  {joinError && (
                    <p className="text-xs text-red-500 mt-2">
                      {joinError}
                    </p>
                  )}

                  <p className="text-[11px] text-slate-400 mt-2">
                    PIN diberikan oleh guru atau pembuat room.
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full sm:w-auto sm:min-w-48 flex items-center justify-center gap-2 px-6 py-3 bg-pink-600 hover:bg-pink-700 text-white text-sm font-semibold rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-pink-300 focus:ring-offset-2 active:scale-[0.98]"
                >
                  Gabung Sekarang
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>

            <div className="lg:col-span-4 bg-[#FCE7F3] border border-pink-100 rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-white text-pink-600 flex items-center justify-center mb-4">
                  <Trophy className="w-5 h-5" />
                </div>

                <h3 className="font-bold text-slate-800">
                  Tunjukkan kemampuanmu
                </h3>

                <p className="text-xs text-slate-600 leading-5 mt-2">
                  Kumpulkan poin, jawab pertanyaan dengan tepat,
                  dan raih posisi terbaik di leaderboard.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-pink-200">
                <p className="text-[11px] text-pink-700 font-medium">
                  Siapkan dirimu dan mulai permainan!
                </p>
              </div>
            </div>
          </section>
        )}

        {/* TEACHER LOBBY */}
        {userRole === 'teacher' && (
          <section className="bg-white border border-pink-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 sm:p-7 border-b border-pink-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>

                <div>
                  <h2 className="text-lg font-bold text-slate-800">
                    Buat Sesi Kuis
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    Pilih paket soal untuk memulai permainan.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-7 space-y-6">
              <div>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h3 className="text-sm font-semibold text-slate-700">
                    Pilih Paket Kuis
                  </h3>

                  <span className="text-[11px] text-slate-400">
                    {quizPacks.length} paket tersedia
                  </span>
                </div>

                {quizPacks.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1">
                    {quizPacks.map((pack) => {
                      const isSelected = pack.id === selectedPackId;
                      const firstType = pack.questions[0]?.type;

                      return (
                        <div
                          key={pack.id}
                          className={`relative text-left p-4 rounded-xl border transition-all duration-200 ${
                            isSelected
                              ? 'bg-pink-50 border-pink-400 ring-1 ring-pink-200'
                              : 'bg-white border-pink-100 hover:border-pink-300 hover:bg-pink-50/30'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => setSelectedPackId(pack.id)}
                            aria-pressed={isSelected}
                            className="w-full text-left"
                          >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-2xl shrink-0">
                                {pack.thumbnail}
                              </span>

                              <span className="text-[10px] font-semibold text-slate-600 bg-pink-50 px-2 py-1 rounded-md">
                                {firstType === 'ox'
                                  ? 'Benar / Salah'
                                  : firstType === 'essay'
                                    ? 'Esai'
                                    : 'Pilihan Ganda'}
                              </span>
                            </div>

                            {isSelected && (
                              <div className="w-5 h-5 rounded-full bg-pink-600 text-white flex items-center justify-center shrink-0">
                                <Check className="w-3 h-3" />
                              </div>
                            )}
                          </div>

                          <h4 className="font-semibold text-sm text-slate-800 mt-3 leading-5">
                            {pack.title}
                          </h4>

                          <p className="text-xs text-slate-500 mt-1.5 leading-5 line-clamp-2">
                            {pack.description}
                          </p>

                          <div className="mt-4 pt-3 border-t border-pink-100 flex items-center justify-between gap-2">
                            <span className="text-[11px] text-slate-500">
                              {pack.questions.length} soal
                            </span>

                            <span className="text-[11px] text-slate-400 truncate">
                              {pack.creator}
                            </span>
                          </div>
                          </button>

                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              onDeleteQuizPack(pack.id);
                              if (selectedPackId === pack.id) {
                                setSelectedPackId('');
                              }
                            }}
                            title={`Hapus paket ${pack.title}`}
                            aria-label={`Hapus paket ${pack.title}`}
                            className="absolute top-2 right-2 z-10 w-8 h-8 flex items-center justify-center rounded-lg bg-white/95 border border-rose-200 text-rose-500 hover:bg-rose-500 hover:text-white hover:border-rose-500 shadow-sm transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-10 border border-dashed border-pink-200 rounded-xl">
                    <BookOpen className="w-8 h-8 text-pink-300 mx-auto mb-2" />
                    <p className="text-sm font-medium text-slate-600">
                      Belum ada paket kuis
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Buat paket kuis terlebih dahulu.
                    </p>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">
                  Mode Permainan
                </h3>

                <div className="flex items-center gap-3 p-3 rounded-xl border border-pink-200 bg-pink-50 max-w-sm">
                  <div className="w-9 h-9 rounded-lg bg-white text-pink-600 flex items-center justify-center">
                    <Gamepad2 className="w-5 h-5" />
                  </div>

                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800">
                      Adventure
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Eksplorasi arena dan jawab tantangan.
                    </p>
                  </div>

                  <Check className="w-4 h-4 text-pink-600" />
                </div>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="px-5 sm:px-7 py-5 bg-[#FFFAFC] border-t border-pink-100">
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    Siap memulai?
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Pilih sesi permainan atau uji peta menggunakan paket kuis terpilih.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedPack) {
                        onHostGame(selectedPack, selectedMode);
                      }
                    }}
                    disabled={!selectedPack || !selectedPack.questions.length}
                    className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-pink-600 hover:bg-pink-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
                  >
                    <Users className="w-4 h-4" />
                    Buka Ruang Kuis
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (selectedPack) {
                        onTestMap(selectedPack);
                      }
                    }}
                    disabled={!selectedPack || !selectedPack.questions.length}
                    className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-white border border-pink-300 hover:bg-pink-50 disabled:bg-slate-100 disabled:border-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-pink-700 text-sm font-semibold rounded-xl transition-colors"
                  >
                    <Map className="w-4 h-4" />
                    Tes Peta
                  </button>
                </div>

                {!selectedPack?.questions.length && (
                  <p className="text-xs text-red-500">
                    Pilih paket kuis yang memiliki soal terlebih dahulu.
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* FEATURES */}
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              Fitur Meedu Quiz
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Pengalaman belajar dan bermain dalam satu platform.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white border border-pink-100 rounded-xl p-5">
              <div className="w-9 h-9 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center mb-4">
                <Gamepad2 className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-slate-800">
                Arena Interaktif
              </h3>
              <p className="text-xs text-slate-500 leading-5 mt-2">
                Gerakkan karakter di arena dan temukan tantangan soal
                dalam permainan.
              </p>
            </div>

            <div className="bg-white border border-pink-100 rounded-xl p-5">
              <div className="w-9 h-9 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center mb-4">
                <Trophy className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-slate-800">
                Leaderboard
              </h3>
              <p className="text-xs text-slate-500 leading-5 mt-2">
                Pantau perolehan skor dan bersaing untuk mendapatkan
                posisi terbaik.
              </p>
            </div>

            <div className="bg-white border border-pink-100 rounded-xl p-5 sm:col-span-2 lg:col-span-1">
              <div className="w-9 h-9 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center mb-4">
                <Brain className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-slate-800">
                Tantangan Pengetahuan
              </h3>
              <p className="text-xs text-slate-500 leading-5 mt-2">
                Latih kemampuan melalui berbagai tipe pertanyaan
                dan tantangan kuis.
              </p>
            </div>
          </div>
        </section>

        <footer className="pt-5 border-t border-pink-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400">
          <span>© 2026 Meedu Quiz</span>
          <span>Platform Kuis Edukasi Interaktif</span>
        </footer>
      </div>
    </main>
  );
};
