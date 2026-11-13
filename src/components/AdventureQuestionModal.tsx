
import React, { useEffect, useRef, useState } from 'react';
import { Question } from '../types/game';

interface AdventureQuestionModalProps {
  question: Question;
  timeLeft: number;
  setTimeLeft: React.Dispatch<React.SetStateAction<number>>;
  isOpen: boolean;
  showAnswer: boolean;
  onAnswer: (answer: string | number) => void;
  onClose: () => void;
  onContinue: () => void;
}

export const AdventureQuestionModal: React.FC<AdventureQuestionModalProps> = ({
  question,
  timeLeft,
  setTimeLeft,
  isOpen,
  showAnswer,
  onAnswer,
  onClose,
  onContinue,
}) => {
  const [essayAnswer, setEssayAnswer] = useState('');

  const onAnswerRef = useRef(onAnswer);
  const timeoutHandled = useRef(false);

  useEffect(() => {
    onAnswerRef.current = onAnswer;
  }, [onAnswer]);

  useEffect(() => {
    timeoutHandled.current = false;
    setEssayAnswer('');
  }, [question.id]);

  useEffect(() => {
    if (!isOpen || showAnswer || timeLeft <= 0) return;

    const timer = window.setInterval(() => {
      setTimeLeft(previous => {
        if (previous <= 1) {
          window.clearInterval(timer);

          if (!timeoutHandled.current) {
            timeoutHandled.current = true;
            onAnswerRef.current(
              question.type === 'ox' ? '__TIMEOUT__' : -1
            );
          }

          return 0;
        }

        return previous - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isOpen, showAnswer, question.id, question.type, setTimeLeft]);

  if (!isOpen) return null;

  const handleAnswer = (answer: string | number) => {
    if (showAnswer || timeoutHandled.current) return;
    onAnswer(answer);
  };

  const handleEssaySubmit = () => {
    const answer = essayAnswer.trim();

    if (!answer) return;

    handleAnswer(answer);
  };

  const getCorrectAnswer = () => {
    if (question.type === 'ox') {
      return String(question.correctAnswer).toUpperCase();
    }

    if (question.type === 'multiple') {
      return question.options?.[Number(question.correctAnswer)] ?? 'Tidak tersedia';
    }

    return String(question.correctAnswer || 'Jawaban belum tersedia');
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-black/70 p-4">
      <div className="my-auto max-h-[calc(100vh-2rem)] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/20 bg-slate-900 p-6 text-white shadow-2xl">

        {!showAnswer ? (
          <>
            <div className="mb-5 flex items-center justify-between">
              <span className="rounded-full bg-amber-500/20 px-3 py-1 text-sm font-bold text-amber-300">
                PETI HARTA KARUN
              </span>

              <span className={`rounded-lg px-4 py-2 font-bold ${
                timeLeft <= 5
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-700 text-white'
              }`}>
                {timeLeft} detik
              </span>
            </div>

            <h2 className="mb-6 text-xl font-bold leading-relaxed">
              {question.question}
            </h2>

            {question.type === 'ox' ? (
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleAnswer('O')}
                  className="rounded-xl bg-green-600 p-5 text-2xl font-bold hover:bg-green-500"
                >
                  O
                </button>

                <button
                  onClick={() => handleAnswer('X')}
                  className="rounded-xl bg-red-600 p-5 text-2xl font-bold hover:bg-red-500"
                >
                  X
                </button>
              </div>
            ) : question.type === 'multiple' ? (
              <div className="grid gap-3">
                {(question.options ?? []).map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleAnswer(index)}
                    className="rounded-xl border border-white/10 bg-slate-800 p-4 text-left hover:border-blue-400 hover:bg-slate-700"
                  >
                    <span className="mr-3 font-bold text-blue-300">
                      {String.fromCharCode(65 + index)}.
                    </span>
                    {option}
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <textarea
                  value={essayAnswer}
                  onChange={(e) => setEssayAnswer(e.target.value)}
                  placeholder="Ketik jawabanmu di sini..."
                  rows={4}
                  className="w-full resize-y rounded-xl border border-white/10 bg-slate-800 p-4 text-white placeholder-slate-400 outline-none focus:border-blue-400"
                />

                <button
                  onClick={handleEssaySubmit}
                  disabled={!essayAnswer.trim()}
                  className="w-full rounded-xl bg-blue-600 py-3 font-bold hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Kirim Jawaban
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              className="mt-6 w-full rounded-xl bg-slate-700 py-3 font-semibold hover:bg-slate-600"
            >
              Tutup Sementara
            </button>
          </>
        ) : (
          <div className="py-4 text-center">
            <h2 className="mb-4 text-2xl font-extrabold text-amber-300">
              BELAJAR LEBIH GIAT LAGI YAAAAA
            </h2>

            <p className="mb-3 text-slate-300">
              Jawaban yang benar:
            </p>

            <p className="mb-5 whitespace-pre-wrap text-xl font-bold text-green-400">
              {getCorrectAnswer()}
            </p>

            <div className="mb-6 rounded-xl bg-slate-800 p-4 text-left">
              <p className="mb-2 font-bold text-amber-300">
                Pembahasan
              </p>
              <p className="text-sm leading-relaxed text-slate-300">
                {question.explanation || 'Tidak ada penjelasan untuk soal ini.'}
              </p>
            </div>

            <button
              onClick={onContinue}
              className="w-full rounded-xl bg-green-600 py-3 font-bold hover:bg-green-500"
            >
              Lanjutkan Petualangan
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
