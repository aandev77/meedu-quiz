import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { adminAuth, adminDb } from './firebaseAdmin';

dotenv.config();

const app = express();
app.use(express.json({ limit: '25mb' }));

const verifyFirebaseToken = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Token autentikasi tidak ditemukan.',
      });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    res.locals.user = {
      uid: decodedToken.uid,
      email: decodedToken.email?.toLowerCase() ?? '',
      emailVerified: decodedToken.email_verified === true,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Token tidak valid atau sudah kedaluwarsa.',
    });
  }
};

// Middleware untuk memeriksa apakah pengguna memiliki role Guru
const verifyTeacher = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  try {
    const user = res.locals.user;

    if (!user) {
      return res.status(401).json({
        error: 'Pengguna belum login.',
      });
    }

    const userDoc = await adminDb
      .collection('users')
      .doc(user.uid)
      .get();

    const role = userDoc.exists
      ? userDoc.data()?.role
      : 'student';

    if (role !== 'teacher') {
      return res.status(403).json({
        error: 'Fitur ini hanya tersedia untuk Guru.',
      });
    }

    next();
  } catch (error) {
    console.error('Teacher verification error:', error);

    return res.status(500).json({
      error: 'Gagal memverifikasi role pengguna.',
    });
  }
};


// Mengambil profil dan role pengguna
app.get(
  '/api/auth/profile',
  verifyFirebaseToken,
  async (req, res) => {
    try {
      const user = res.locals.user;

      const userRef = adminDb
        .collection('users')
        .doc(user.uid);

      const userDoc = await userRef.get();

      let role: 'teacher' | 'student' = 'student';

      if (userDoc.exists) {
        const savedRole = userDoc.data()?.role;

        if (savedRole === 'teacher' || savedRole === 'student') {
          role = savedRole;
        }
      } else {
        // Pengguna baru secara default menjadi Murid
        await userRef.set({
          uid: user.uid,
          email: user.email,
          role: 'student',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      return res.json({
        success: true,
        user: {
          uid: user.uid,
          email: user.email,
          emailVerified: user.emailVerified,
          role,
        },
      });
    } catch (error) {
      console.error('Get profile error:', error);

      return res.status(500).json({
        error: 'Gagal mengambil profil pengguna.',
      });
    }
  }
);


// Menyimpan atau mengubah role pengguna
app.post(
  '/api/auth/role',
  verifyFirebaseToken,
  async (req, res) => {
    try {
      const user = res.locals.user;
      const { role } = req.body;

      if (role !== 'teacher' && role !== 'student') {
        return res.status(400).json({
          error: 'Role harus teacher atau student.',
        });
      }

      const userRef = adminDb
        .collection('users')
        .doc(user.uid);

      const userDoc = await userRef.get();

      await userRef.set(
        {
          uid: user.uid,
          email: user.email,
          role,
          updatedAt: new Date(),
          ...(!userDoc.exists
            ? { createdAt: new Date() }
            : {}),
        },
        { merge: true }
      );

      return res.json({
        success: true,
        message: 'Role berhasil diperbarui.',
        role,
      });
    } catch (error) {
      console.error('Update role error:', error);

      return res.status(500).json({
        error: 'Gagal memperbarui role pengguna.',
      });
    }
  }
);


// Memeriksa akses Guru
app.get(
  '/api/teacher/check',
  verifyFirebaseToken,
  verifyTeacher,
  (req, res) => {
    return res.json({
      success: true,
      message: 'Autentikasi Guru berhasil.',
    });
  }
);

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// API endpoint to parse questions from document text using Gemini

app.post('/api/quiz/ai-parse', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        error: 'Text document is required',
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      return res.json({
        success: false,
        fallback: true,
        message: 'Gemini API key not configured',
      });
    }

    const questionSchema = {
      type: Type.OBJECT,
      properties: {
        type: {
          type: Type.STRING,
          enum: ['multiple', 'ox', 'essay'],
          description: "Jenis soal wajib salah satu: multiple, ox, atau essay.",
        },
        question: {
          type: Type.STRING,
          description: 'Teks pertanyaan',
        },
        options: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Tepat 4 pilihan untuk multiple. Kosong untuk ox dan essay.',
        },
        correctAnswer: {
          type: Type.STRING,
          description: 'Kunci jawaban. O/X untuk ox, indeks 0-3 untuk multiple, jawaban lengkap untuk essay.',
        },
        explanation: {
          type: Type.STRING,
          description: 'Penjelasan edukatif jawaban',
        },
        keywords: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Kata kunci penilaian untuk soal essay',
        },
        acceptedAnswers: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Jawaban alternatif yang diterima untuk soal essay',
        },
      },
      required: [
        'type',
        'question',
        'options',
        'correctAnswer',
        'explanation',
        'keywords',
        'acceptedAnswers',
      ],
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: `
Kamu adalah generator soal pendidikan Meedu. Dokumen berikut adalah SUMBER MATERI, bukan kumpulan soal. Baca dan pahami seluruh materi, lalu buat soal baru yang jawabannya didukung oleh materi.

MATERI DOKUMEN:
---
${text.slice(0, 30000)}
---

KOMPOSISI SOAL UTAMA (BATAS MAKSIMAL):
- Maksimal 2 soal type "multiple" (pilihan ganda).
- Maksimal 2 soal type "ox" (benar/salah).
- Maksimal 1 soal type "essay" (esai).
- Jadi maksimal 5 soal utama. Jangan mengganti komposisi ini dengan 5 pilihan ganda.
- Jika materi tidak cukup untuk suatu soal yang bermutu, keluarkan lebih sedikit. Jangan mengarang fakta dan jangan memaksakan jumlah.
- Gunakan urutan: pilihan ganda, benar/salah, lalu esai. Jika materi terbatas, prioritaskan soal yang paling kuat didukung materi.

SOAL CADANGAN:
- Setiap soal utama yang dibuat harus memiliki tepat 3 soal cadangan.
- Setiap cadangan wajib memiliki type yang SAMA dengan soal utama dalam kelompoknya.
- Cadangan menguji konsep/kompetensi yang sama tetapi redaksi dan fokus pertanyaannya berbeda.
- Jangan menduplikasi soal utama atau satu sama lain.
- Jika materi tidak cukup untuk membuat 3 cadangan yang valid bagi sebuah soal utama, jangan keluarkan kelompok soal utama tersebut. Lebih baik hasilkan lebih sedikit kelompok lengkap daripada cadangan yang dikarang.

ATURAN TIPE:
1. "multiple": tepat 4 opsi berbeda dan masuk akal. correctAnswer berupa huruf A/B/C/D. Opsi harus sesuai materi.
2. "ox": question berupa pernyataan yang jelas; correctAnswer hanya "O" untuk benar atau "X" untuk salah.
3. "essay": pertanyaan uraian; correctAnswer berisi jawaban ideal, keywords berisi kata kunci penilaian, acceptedAnswers boleh berisi variasi jawaban yang benar.

UNTUK SEMUA SOAL:
- explanation berisi pembahasan singkat yang merujuk konsep dalam materi.
- Hindari pertanyaan ambigu, pengulangan, dan fakta di luar materi.
- Bahasa Indonesia yang jelas dan sesuai tingkat pembelajaran.

KELUARAN:
- Keluarkan JSON sesuai schema saja.
- mainQuestions berisi maksimal 5 objek.
- Setiap objek wajib memiliki backupQuestions berisi tepat 3 objek.
- Jangan menambahkan teks di luar JSON.
`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            mainQuestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  ...questionSchema.properties,
                  backupQuestions: {
                    type: Type.ARRAY,
                    items: questionSchema,
                    description: 'Tepat 3 soal cadangan dengan tipe yang sama',
                  },
                },
                required: [
                  'type',
                  'question',
                  'options',
                  'correctAnswer',
                  'explanation',
                  'keywords',
                  'acceptedAnswers',
                  'backupQuestions',
                ],
              },
            },
          },
          required: ['mainQuestions'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{"mainQuestions":[]}');
    const candidates = Array.isArray(parsed.mainQuestions)
      ? parsed.mainQuestions
      : [];

    // Batas tipe ditegakkan di server, bukan hanya melalui prompt AI.
    const counts: Record<'multiple' | 'ox' | 'essay', number> = {
      multiple: 0, ox: 0, essay: 0,
    };

    const normalizeAndValidate = (item: any, expectedType?: string) => {
      if (!item || !['multiple', 'ox', 'essay'].includes(item.type)) return null;
      if (expectedType && item.type !== expectedType) return null;
      if (typeof item.question !== 'string' || !item.question.trim()) return null;

      const type = item.type as 'multiple' | 'ox' | 'essay';
      const options = Array.isArray(item.options)
        ? item.options.map((value: any) => String(value ?? '').trim())
        : [];

      if (type === 'multiple' && (options.length !== 4 || options.some((v: string) => !v))) return null;

      let correctAnswer = String(item.correctAnswer ?? '').trim();
      if (type === 'multiple') {
        const answer = correctAnswer.toUpperCase();
        if (['A', 'B', 'C', 'D'].includes(answer)) correctAnswer = answer;
        else if (/^[0-3]$/.test(correctAnswer)) correctAnswer = ['A', 'B', 'C', 'D'][Number(correctAnswer)];
        else return null;
      } else if (type === 'ox') {
        const answer = correctAnswer.toUpperCase();
        if (['O', 'BENAR', 'TRUE'].includes(answer)) correctAnswer = 'O';
        else if (['X', 'SALAH', 'FALSE'].includes(answer)) correctAnswer = 'X';
        else return null;
      } else if (!correctAnswer) {
        return null;
      }

      return {
        type,
        question: item.question.trim(),
        options: type === 'multiple' ? options : [],
        correctAnswer,
        explanation: String(item.explanation ?? ''),
        keywords: type === 'essay' && Array.isArray(item.keywords) ? item.keywords.map((v: any) => String(v)) : [],
        acceptedAnswers: type === 'essay' && Array.isArray(item.acceptedAnswers) ? item.acceptedAnswers.map((v: any) => String(v)) : [],
      };
    };

    const questions: any[] = [];
    for (const candidate of candidates) {
      if (questions.length >= 5) break;
      if (!candidate || !['multiple', 'ox', 'essay'].includes(candidate.type)) continue;

      const type = candidate.type as 'multiple' | 'ox' | 'essay';
      const limit = type === 'essay' ? 1 : 2;
      if (counts[type] >= limit) continue;

      const main = normalizeAndValidate(candidate);
      if (!main) continue;

      const rawBackups = Array.isArray(candidate.backupQuestions) ? candidate.backupQuestions : [];
      const backups = rawBackups.slice(0, 3).map((backup: any) => normalizeAndValidate(backup, type));
      // Terima kelompok hanya jika ketiga cadangannya valid dan bertipe sama.
      if (backups.length !== 3 || backups.some((backup: any) => !backup)) continue;

      counts[type] += 1;
      questions.push({ ...main, backupQuestions: backups });
    }

    return res.json({
      success: true,
      questions,
      counts,
      message: questions.length === 0
        ? 'Tidak ada kelompok soal valid. Setiap soal utama harus memiliki 3 cadangan dengan tipe yang sama.'
        : undefined,
    });
  } catch (err: any) {
    console.warn('Gemini doc parse error:', err?.message);

    return res.status(500).json({
      error: err?.message || 'Failed to parse with AI',
    });
  }
});

async function startServer() {
  const PORT = process.env.PORT
    ? parseInt(process.env.PORT, 10)
    : 3000;

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });

    app.use(vite.middlewares);

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  }
}

if (process.env.NODE_ENV !== 'production') {
  startServer();
}

export default app;