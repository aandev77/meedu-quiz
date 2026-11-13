import React, { useState } from 'react';
import { Question, QuizPack, QuizType } from '../types/game';
import {
  Plus,
  Trash2,
  BookOpen,
  Save,
  X,
  Sparkles,
  FileText,
  UploadCloud,
  FileCheck2,
  CheckCircle2,
  AlertCircle,
  FileUp,
} from 'lucide-react';
import {
  extractTextFromDocx,
  extractTextFromPdf,
  extractTextFromPptx,
  parseQuestionsFromText,
} from '../utils/documentParser';

interface QuizCreatorModalProps {
  onSaveQuiz: (quiz: QuizPack) => void;
  onClose: () => void;
}

export const QuizCreatorModal: React.FC<QuizCreatorModalProps> = ({
  onSaveQuiz,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'manual' | 'import'>('manual');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Sains');

  // Import State
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [useAiEnhance, setUseAiEnhance] = useState(true);
  const [extractedRawText, setExtractedRawText] = useState('');
  const [importedQuestions, setImportedQuestions] = useState<Question[]>([]);

  const [questions, setQuestions] = useState<Question[]>([]);

  const handleAddQuestion = (type: QuizType) => {
    setQuestions([
      ...questions,
      {
        id: `custom-${Date.now()}`,
        type,
        question: '',
        options: type === 'multiple' ? ['', '', '', ''] : undefined,
        correctAnswer: type === 'ox' ? 'O' : type === 'essay' ? '' : 0,
        keywords: type === 'essay' ? [] : undefined,
        acceptedAnswers: type === 'essay' ? [] : undefined,
        timeLimit: 15,
        explanation: '',
      },
    ]);
  };

  const handleRemoveQuestion = (index: number) => {
    if (questions.length <= 1) return;
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleUpdateQuestion = (index: number, updates: Partial<Question>) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], ...updates };
    setQuestions(updated);
  };

  const handleUpdateOption = (qIndex: number, optIndex: number, val: string) => {
    const q = questions[qIndex];
    if (!q.options) return;
    const newOptions = [...q.options];
    newOptions[optIndex] = val;
    handleUpdateQuestion(qIndex, { options: newOptions });
  };

  // Process text with either Gemini server endpoint or local parser
  const processDocumentText = async (rawText: string, docName: string) => {
    setIsExtracting(true);
    setImportError(null);

    try {
      let finalQuestions: Question[] = [];
      const isPptx = docName.toLowerCase().endsWith('.pptx');

      if (isPptx && !useAiEnhance) {
        throw new Error('Untuk membuat soal dari materi PowerPoint, aktifkan Gemini AI Parsing terlebih dahulu.');
      }

      if (useAiEnhance) {
        try {
          const res = await fetch('/api/quiz/ai-parse', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: rawText }),
          });

          if (res.ok) {
            const data = await res.json();

            if (data.success === false) {
              throw new Error(data.message || data.error || 'Gemini tidak berhasil membuat soal dari materi.');
            }

            if (
              data.questions &&
              Array.isArray(data.questions) &&
              data.questions.length > 0
            ) {
              const normalizeQuestion = (
                q: any,
                id: string,
                groupId: string,
                role: 'main' | 'backup',
                backupIndex?: number
              ): Question | null => {
                // Jangan pernah menganggap tipe yang tidak dikenal sebagai pilihan ganda.
                if (!q || !['multiple', 'ox', 'essay'].includes(q.type)) return null;
                if (typeof q.question !== 'string' || !q.question.trim()) return null;

                const type = q.type as QuizType;
                let correctAnswer: string | number;

                if (type === 'ox') {
                  const answer = String(q.correctAnswer ?? '').trim().toUpperCase();
                  if (['O', 'BENAR', 'TRUE'].includes(answer)) correctAnswer = 'O';
                  else if (['X', 'SALAH', 'FALSE'].includes(answer)) correctAnswer = 'X';
                  else return null;
                } else if (type === 'multiple') {
                  const answer = String(q.correctAnswer ?? '').trim().toUpperCase();
                  const letterIndex = ['A', 'B', 'C', 'D'].indexOf(answer);
                  if (letterIndex >= 0) correctAnswer = letterIndex;
                  else if (/^[0-3]$/.test(String(q.correctAnswer))) correctAnswer = Number(q.correctAnswer);
                  else return null;

                  if (!Array.isArray(q.options) || q.options.length !== 4 ||
                      q.options.some((option: any) => !String(option ?? '').trim())) return null;
                } else {
                  correctAnswer = String(q.correctAnswer ?? '').trim();
                  if (!correctAnswer) return null;
                }

                return {
                  id,
                  type,
                  question: q.question.trim(),
                  options: type === 'multiple' ? q.options.map((option: any) => String(option)) : undefined,
                  correctAnswer,
                  keywords: type === 'essay' && Array.isArray(q.keywords) ? q.keywords : undefined,
                  acceptedAnswers: type === 'essay' && Array.isArray(q.acceptedAnswers) ? q.acceptedAnswers : undefined,
                  explanation: String(q.explanation || ''),
                  timeLimit: 15,
                  groupId,
                  questionRole: role,
                  backupIndex,
                } as Question;
              };

              // Batas komposisi ditegakkan lagi di frontend sebagai pengaman.
              const typeCounts: Record<'multiple' | 'ox' | 'essay', number> = {
                multiple: 0, ox: 0, essay: 0,
              };
              const acceptedGroups: any[] = [];

              for (const candidate of data.questions) {
                if (acceptedGroups.length >= 5) break;
                if (!candidate || !['multiple', 'ox', 'essay'].includes(candidate.type)) continue;

                const mainType = candidate.type as 'multiple' | 'ox' | 'essay';
                const limit = mainType === 'essay' ? 1 : 2;
                if (typeCounts[mainType] >= limit) continue;

                const main = normalizeQuestion(
                  candidate,
                  `imported-main-${Date.now()}-${acceptedGroups.length}`,
                  `group-${acceptedGroups.length + 1}`,
                  'main'
                );
                if (!main) continue;

                // Kelompok tidak diterima jika cadangan kurang dari 3 atau tipenya berbeda.
                if (!Array.isArray(candidate.backupQuestions) || candidate.backupQuestions.length < 3) continue;
                const groupId = `group-${acceptedGroups.length + 1}`;
                const mainId = main.id;
                const backups = candidate.backupQuestions.slice(0, 3).map(
                  (backup: any, backupIndex: number) =>
                    normalizeQuestion(
                      backup,
                      `${mainId}-backup-${backupIndex + 1}`,
                      groupId,
                      'backup',
                      backupIndex + 1
                    )
                );
                if (backups.some((backup: Question | null) => !backup)) continue;

                typeCounts[mainType] += 1;
                acceptedGroups.push({
                  main: { ...main, groupId },
                  backups: backups as Question[],
                });
              }

              finalQuestions = acceptedGroups.flatMap((group) => [
                group.main,
                ...group.backups,
              ]);
            }
          }
        } catch (e: any) {
          console.warn('AI document generation failed:', e);
          // PPTX berisi materi harus diproses oleh AI. Jangan fallback ke parser
          // pola soal karena itu akan salah menganggap materi sebagai dokumen kosong.
          if (isPptx) {
            throw new Error(e?.message || 'Gagal membuat soal dari materi PowerPoint. Periksa koneksi dan GEMINI_API_KEY.');
          }
        }
      }

      // Fallback parser lokal hanya untuk dokumen non-PPTX yang memang berisi soal.
      if (finalQuestions.length === 0 && !isPptx) {
        finalQuestions = parseQuestionsFromText(rawText);
      }

      if (finalQuestions.length === 0) {
        setImportError(
          isPptx
            ? 'AI belum dapat membuat soal dari materi PowerPoint. Pastikan materi cukup jelas dan Gemini AI Parsing aktif.'
            : 'Tidak dapat mendeteksi format soal di dokumen. Pastikan terdapat nomor soal (1., 2.) dan pilihan (A., B., C., D. atau O/X).'
        );
      } else {
        setImportedQuestions(finalQuestions);
        if (!title) {
          setTitle(`Kuis dari ${docName.replace(/\.[^/.]+$/, '')}`);
        }
      }
    } catch (err: any) {
      setImportError(err.message || 'Gagal memproses dokumen');
    } finally {
      setIsExtracting(false);
    }
  };

  // Handle File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setImportError(null);
    setIsExtracting(true);

    try {
      const buffer = await file.arrayBuffer();
      let text = '';

      if (
        file.name.toLowerCase().endsWith('.pptx') ||
        file.type.includes('presentationml')
      ) {
        text = await extractTextFromPptx(buffer);
      } else if (
        file.name.toLowerCase().endsWith('.docx') ||
        file.type.includes('wordprocessingml')
      ) {
        text = await extractTextFromDocx(buffer);
      } else if (
        file.name.toLowerCase().endsWith('.pdf') ||
        file.type.includes('pdf')
      ) {
        text = await extractTextFromPdf(buffer);
      } else if (file.name.toLowerCase().endsWith('.txt')) {
        text = new TextDecoder('utf-8').decode(buffer);
      } else {
        throw new Error('Format file tidak didukung.');
      }

      setExtractedRawText(text);
      await processDocumentText(text, file.name);
    } catch (err: any) {
      setImportError(err.message || 'Gagal membaca isi file');
      setIsExtracting(false);
    }
  };

  // Preset Sample Templates
  const handleLoadSampleDocument = (type: 'sains-mc' | 'trivia-ox') => {
    let sampleText = '';
    let docTitle = '';

    if (type === 'sains-mc') {
      docTitle = 'Soal_Ujian_Sains_Kelas_5.docx';
      sampleText = `SOAL EVALUASI SAINS & ALAM
Tahun Ajaran 2026/2027

1. Danau vulkanik terbesar di dunia yang terletak di Indonesia adalah?
A. Danau Singkarak
B. Danau Toba
C. Danau Matano
D. Danau Sentani
Kunci: B
Pembahasan: Danau Toba adalah kaldera vulkanik purba raksasa hasil letusan supervolcano.

2. Candi Buddha terbesar di dunia yang merupakan warisan UNESCO di Jawa Tengah adalah?
A. Candi Prambanan
B. Candi Mendut
C. Candi Borobudur
D. Candi Plaosan
Kunci: C
Pembahasan: Candi Borobudur dibangun pada abad ke-8 oleh Dinasti Syailendra.

3. Gas paling melimpah di atmosfer bumi yang kita hirup adalah?
A. Oksigen (O2)
B. Nitrogen (N2)
C. Karbon Dioksida (CO2)
D. Argon (Ar)
Kunci: B
Pembahasan: Nitrogen menyumbang sekitar 78% dari komposisi udara bumi.

4. Mamalia laut yang terkenal sangat cerdas dan bernapas dengan paru-paru adalah?
A. Hiu Putih
B. Ikan Pari
C. Lumba-lumba
D. Barakuda
Kunci: C
Pembahasan: Lumba-lumba adalah mamalia ordo Cetacea yang bernapas lewat blowhole.`;
    } else {
      docTitle = 'Kuis_Trivia_Fakta_Dunia.pdf';
      sampleText = `KUIS OX FAKTA MENARIK DUNIA

1. Matahari adalah bintang yang posisinya paling dekat dengan planet Bumi? (Benar/Salah)
Kunci: Benar (O)
Pembahasan: Matahari berjarak sekitar 150 juta kilometer dari Bumi.

2. Kelelawar termasuk dalam kelompok bangsa burung karena memiliki sayap? (O/X)
Kunci: Salah (X)
Pembahasan: Kelelawar adalah hewan menyusui (mamalia) bertangan selaput.

3. Cahaya merambat jauh lebih cepat dibandingkan dengan rambatan suara? (O/X)
Kunci: Benar (O)
Pembahasan: Kecepatan cahaya ~300.000 km/detik sedangkan suara ~343 m/detik.

4. Petir tidak pernah dapat menyambar tempat atau gedung yang sama dua kali? (O/X)
Kunci: Salah (X)
Pembahasan: Gedung pencakar langit dapat tersambar petir puluhan kali setiap tahunnya.`;
    }

    setUploadedFileName(docTitle);
    setExtractedRawText(sampleText);
    processDocumentText(sampleText, docTitle);
  };

  // Apply imported questions
  const handleApplyImportedQuestions = () => {
    if (importedQuestions.length === 0) return;
    setQuestions(importedQuestions);
    setActiveTab('manual');
  };

  const handleSave = () => {
    if (!title.trim()) {
      alert('Mohon masukkan judul kuis terlebih dahulu!');
      return;
    }

    const validQuestions = questions.filter(
      (q) => q.question.trim().length > 0
    );

    if (validQuestions.length === 0) {
      alert('Mohon isi minimal satu pertanyaan!');
      return;
    }

    const newPack: QuizPack = {
      id: `custom-pack-${Date.now()}`,
      title,
      description: description || 'Kuis kustom yang diimport dan dibuat sendiri',
      category,
      thumbnail: '📄',
      questions: validQuestions,
      creator: 'Guru / Kreator Kamu',
      isCustom: true,
    };

    onSaveQuiz(newPack);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-pink-950/30 backdrop-blur-md p-2 sm:p-4">
      <div className="quiz-modal-scroll relative my-0 sm:my-4 flex max-h-[calc(100dvh-1rem)] w-full max-w-3xl flex-col overflow-x-hidden overflow-y-auto overscroll-contain rounded-2xl sm:rounded-3xl border border-pink-100 bg-white p-4 sm:p-6 md:p-8 text-slate-800 shadow-2xl shadow-pink-200/40">
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-pink-100">
          <div className="flex min-w-0 items-start gap-2 sm:gap-3">
            <div className="w-8 h-8 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center font-bold">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold leading-snug text-slate-800">
                Pembuat & Import Kuis Meedu
              </h2>
              <p className="mt-1 text-[11px] sm:text-xs leading-relaxed text-slate-500">
                Buat manual atau import soal dari file PDF/PPTX
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Tutup pembuat kuis"
            className="shrink-0 p-2 hover:bg-pink-50 rounded-xl text-slate-500 hover:text-pink-600 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="mt-4 sm:mt-5 grid grid-cols-2 gap-1.5 sm:gap-2 rounded-2xl border border-pink-100 bg-pink-50 p-1">
          <button
            onClick={() => setActiveTab('manual')}
            className={`min-w-0 px-2 py-2 sm:py-2.5 rounded-xl text-[11px] sm:text-xs font-bold transition flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer ${
              activeTab === 'manual'
                ? 'bg-pink-500 text-white shadow-md shadow-pink-500/30'
                : 'text-slate-500 hover:text-pink-600 hover:bg-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span className="text-center leading-tight">Editor Kuis ({questions.length} Soal)</span>
          </button>

          <button
            onClick={() => setActiveTab('import')}
            className={`min-w-0 px-2 py-2 sm:py-2.5 rounded-xl text-[11px] sm:text-xs font-bold transition flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer ${
              activeTab === 'import'
                ? 'bg-pink-500 text-white shadow-md shadow-pink-500/30'
                : 'text-slate-500 hover:text-pink-600 hover:bg-white'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span className="text-center leading-tight">Import PDF/PowerPoint</span>
          </button>
        </div>

        {activeTab === 'import' ? (
          /* TAB IMPORT */
          <div className="mt-4 sm:mt-5 space-y-4 sm:space-y-6">

            {/* Upload Zone */}
            <div className="relative border-2 border-dashed border-pink-300 hover:border-pink-500 rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-center bg-pink-50/70 transition cursor-pointer group">
              <input
                type="file"
                accept=".pdf,.docx,.doc,.pptx,.txt"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />

              <div className="flex flex-col items-center gap-3 pointer-events-none">
                <div className="w-14 h-14 rounded-2xl bg-pink-100 text-pink-600 group-hover:scale-110 flex items-center justify-center transition">
                  <FileUp className="w-7 h-7" />
                </div>

                <div>
                  <h3 className="font-extrabold text-slate-800 text-base">
                    Unggah Dokumen Soal Kuis
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Seret & lepas file{' '}
                    <span className="text-pink-600 font-bold">PDF</span>
                    {' / '}
                    <span className="text-pink-600 font-bold">PPTX</span>
                    {' '}Anda di sini, atau klik untuk memilih file
                  </p>
                </div>
              </div>
            </div>

            {/* AI Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-pink-50 border border-pink-100">
              <div className="flex items-center gap-2.5">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    Gunakan Gemini AI untuk Parsing Pintar
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Menganalisis dokumen secara cerdas untuk memisahkan pertanyaan, kunci jawaban, dan pembahasan
                  </span>
                </div>
              </div>

              <input
                type="checkbox"
                checked={useAiEnhance}
                onChange={(e) => setUseAiEnhance(e.target.checked)}
                className="w-4 h-4 accent-pink-500 cursor-pointer"
              />
            </div>

            {/* Loading Indicator */}
            {isExtracting && (
              <div className="flex items-center justify-center gap-2 p-6 rounded-2xl bg-pink-50 border border-pink-100 text-slate-600 text-sm animate-pulse">
                <Sparkles className="w-5 h-5 text-pink-500 animate-spin" />
                <span>Sedang mengekstrak & menyusun soal dari dokumen...</span>
              </div>
            )}

            {/* Error Message */}
            {importError && (
              <div className="flex items-start gap-2.5 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{importError}</span>
              </div>
            )}

            {/* Parsed Preview */}
            {importedQuestions.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-bold text-slate-800">
                      Berhasil Membuat {importedQuestions.filter((q) => q.questionRole === 'main').length} Soal Utama
                      <span className="block text-[11px] font-medium text-slate-500">
                        {importedQuestions.filter((q) => q.questionRole === 'backup').length} soal cadangan · {importedQuestions.length} total
                        {' '}dari &ldquo;{uploadedFileName}&rdquo;
                      </span>
                    </span>
                  </div>

                  <button
                    onClick={handleApplyImportedQuestions}
                    className="px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-pink-200 transition cursor-pointer"
                  >
                    Gunakan Hasil Import ke Editor
                  </button>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {importedQuestions.map((q, idx) => (
                    <div
                      key={q.id}
                      className="p-3 rounded-xl bg-pink-50 border border-pink-100 text-xs text-left"
                    >
                      <div className="flex items-center justify-between font-bold text-slate-600 mb-1">
                        <span className={q.questionRole === 'backup' ? 'text-amber-600' : 'text-pink-600'}>
                          {q.questionRole === 'backup'
                            ? `Cadangan ${q.backupIndex ?? ''} · Kelompok ${q.groupId?.replace('group-', '') ?? ''}`
                            : `Soal Utama ${q.groupId?.replace('group-', '') ?? ''}`}
                          {' '}{q.type === 'ox' ? '(Mode OX)' : q.type === 'essay' ? '(Mode Esai)' : '(Mode 4-Pilihan)'}
                        </span>

                        <span className="text-emerald-600">
                          Kunci: {q.type === 'ox' ? q.correctAnswer : q.type === 'essay' ? 'Jawaban Esai' : ['A', 'B', 'C', 'D'][Number(q.correctAnswer)] || 'A'}
                        </span>
                      </div>

                      <p className="text-slate-800 font-medium">{q.question}</p>

                      {q.type === 'multiple' && q.options && (
                        <div className="grid grid-cols-2 gap-1 mt-1.5 text-slate-500 text-[11px]">
                          {q.options.map((opt, oIdx) => (
                            <span
                              key={oIdx}
                              className={oIdx === Number(q.correctAnswer) ? 'text-emerald-600 font-semibold' : ''}
                            >
                              {['A', 'B', 'C', 'D'][oIdx]}. {opt}
                            </span>
                          ))}
                        </div>
                      )}

                      {q.explanation && (
                        <p className="text-[11px] text-slate-500 italic mt-1 border-t border-pink-100 pt-1">
                          💡 {q.explanation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* TAB MANUAL EDITOR */
          <>
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Judul Kuis
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Isi dengan judul kuis..."
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-pink-200 text-slate-800 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-pink-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Kategori
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Masukkan kategori kuis..."
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-pink-200 text-slate-800 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-pink-400"
                />
              </div>
            </div>

            {/* Questions List */}
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <span className="text-sm font-bold text-slate-700">
                  Daftar Pertanyaan ({questions.length})
                </span>

                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => handleAddQuestion('ox')}
                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> + Soal OX (True/False)
                  </button>

                  <button
                    onClick={() => handleAddQuestion('multiple')}
                    className="px-3 py-1.5 bg-pink-50 hover:bg-pink-100 border border-pink-200 text-pink-700 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> + Soal 4 Pilihan
                  </button>

                  <button
                    onClick={() => handleAddQuestion('essay')}
                    className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> + Soal Esai
                  </button>
                </div>
              </div>

              {questions.map((q, idx) => (
                <div
                  key={q.id}
                  className="p-4 rounded-2xl bg-white border border-pink-100 shadow-sm space-y-3"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-pink-600">
                      Pertanyaan #{idx + 1} (
                      {q.type === 'ox'
                        ? 'Mode OX True/False'
                        : q.type === 'multiple'
                          ? 'Mode 4 Pilihan A/B/C/D'
                          : 'Mode Esai'}
                      )
                    </span>

                    {questions.length > 1 && (
                      <button
                        onClick={() => handleRemoveQuestion(idx)}
                        className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <input
                    type="text"
                    value={q.question}
                    onChange={(e) =>
                      handleUpdateQuestion(idx, { question: e.target.value })
                    }
                    placeholder="Tuliskan pertanyaan di sini..."
                    className="w-full px-3.5 py-2 rounded-xl bg-pink-50/50 border border-pink-200 text-slate-800 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
                  />

                  {q.type === 'ox' ? (
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xs text-slate-600 font-semibold">
                        Kunci Jawaban:
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateQuestion(idx, { correctAnswer: 'O' })
                        }
                        className={`px-4 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                          q.correctAnswer === 'O'
                            ? 'bg-emerald-500 text-white shadow-md'
                            : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                        }`}
                      >
                        O (Benar)
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateQuestion(idx, { correctAnswer: 'X' })
                        }
                        className={`px-4 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                          q.correctAnswer === 'X'
                            ? 'bg-rose-500 text-white shadow-md'
                            : 'bg-rose-50 border border-rose-200 text-rose-700'
                        }`}
                      >
                        X (Salah)
                      </button>
                    </div>
                  ) : q.type === 'multiple' ? (
                    <div className="space-y-2">
                      <span className="text-xs text-slate-600 font-semibold">
                        Pilihan Jawaban (Pilih radio untuk jawaban benar):
                      </span>

                      {['A', 'B', 'C', 'D'].map((letter, optIdx) => (
                        <div key={letter} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`correct-${q.id}`}
                            checked={Number(q.correctAnswer) === optIdx}
                            onChange={() =>
                              handleUpdateQuestion(idx, {
                                correctAnswer: optIdx,
                              })
                            }
                            className="accent-pink-500 cursor-pointer"
                          />

                          <span className="text-xs font-bold text-slate-500 w-4">
                            {letter}.
                          </span>

                          <input
                            type="text"
                            value={q.options?.[optIdx] || ''}
                            onChange={(e) =>
                              handleUpdateOption(idx, optIdx, e.target.value)
                            }
                            placeholder={`Teks pilihan ${letter}...`}
                            className="flex-1 px-3 py-1.5 rounded-lg bg-pink-50/50 border border-pink-200 text-slate-800 placeholder:text-slate-400 text-xs focus:outline-none focus:ring-1 focus:ring-pink-400"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3 rounded-xl border border-pink-200 bg-pink-50/50 p-4">
                      <div>
                        <label className="mb-1 block text-xs font-bold text-pink-700">
                          Jawaban Esai yang Benar
                        </label>

                        <textarea
                          value={String(q.correctAnswer ?? '')}
                          onChange={(e) =>
                            handleUpdateQuestion(idx, {
                              correctAnswer: e.target.value,
                            })
                          }
                          placeholder="Tuliskan jawaban lengkap yang diharapkan..."
                          rows={3}
                          className="w-full rounded-lg bg-white border border-pink-200 p-3 text-slate-800 placeholder:text-slate-400 text-xs focus:outline-none focus:ring-1 focus:ring-pink-400"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-bold text-pink-700">
                          Kata Kunci Penilaian
                        </label>

                        <input
                          type="text"
                          value={(q.keywords ?? []).join(', ')}
                          onChange={(e) =>
                            handleUpdateQuestion(idx, {
                              keywords: e.target.value
                                .split(',')
                                .map((word) => word.trim())
                                .filter(Boolean),
                            })
                          }
                          placeholder="Contoh: fotosintesis, tumbuhan, makanan"
                          className="w-full rounded-lg bg-white border border-pink-200 p-3 text-slate-800 placeholder:text-slate-400 text-xs focus:outline-none focus:ring-1 focus:ring-pink-400"
                        />

                        <p className="mt-1 text-[10px] text-slate-500">
                          Pisahkan setiap kata kunci dengan koma. Semua kata
                          kunci harus ditemukan agar jawaban dinilai benar.
                        </p>
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-bold text-pink-700">
                          Jawaban Alternatif (Opsional)
                        </label>

                        <textarea
                          value={(q.acceptedAnswers ?? []).join('\n')}
                          onChange={(e) =>
                            handleUpdateQuestion(idx, {
                              acceptedAnswers: e.target.value
                                .split('\n')
                                .map((answer) => answer.trim())
                                .filter(Boolean),
                            })
                          }
                          placeholder={'Jawaban alternatif 1\nJawaban alternatif 2'}
                          rows={2}
                          className="w-full rounded-lg bg-white border border-pink-200 p-3 text-slate-800 placeholder:text-slate-400 text-xs focus:outline-none focus:ring-1 focus:ring-pink-400"
                        />

                        <p className="mt-1 text-[10px] text-slate-500">
                          Setiap baris merupakan satu jawaban alternatif yang
                          diterima.
                        </p>
                      </div>
                    </div>
                  )}

                  <input
                    type="text"
                    value={q.explanation || ''}
                    onChange={(e) =>
                      handleUpdateQuestion(idx, {
                        explanation: e.target.value,
                      })
                    }
                    placeholder="Penjelasan edukasi singkat ketika jawaban terungkap..."
                    className="w-full px-3 py-1.5 rounded-lg bg-pink-50/50 border border-pink-200 text-slate-700 placeholder:text-slate-400 text-xs focus:outline-none focus:ring-1 focus:ring-pink-400"
                  />
                </div>
              ))}
            </div>
          </>
        )}

        {/* Action Buttons */}
        <div className="mt-5 sm:mt-6 pt-4 border-t border-pink-100 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 sm:sticky sm:bottom-0 sm:bg-white/95 sm:backdrop-blur-sm">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 bg-pink-50 hover:bg-pink-100 border border-pink-100 text-slate-600 rounded-xl font-semibold text-xs transition cursor-pointer"
          >
            Batal
          </button>

          <button
            onClick={handleSave}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-5 sm:px-6 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-pink-200 transition cursor-pointer"
          >
            <Save className="w-4 h-4" />
            Simpan Kuis Saya
          </button>
        </div>
      </div>
    </div>
  );
};
