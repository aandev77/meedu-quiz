import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { Question, QuizType } from '../types/game';

/**
 * Parses raw text extracted from PDF or Word into structured Question objects.
 */
export function parseQuestionsFromText(text: string): Question[] {
  if (!text || !text.trim()) return [];

  const questions: Question[] = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  let currentQuestion: Partial<Question> | null = null;
  let currentOptions: string[] = [];
  let readingExplanation = false;

  const pushCurrentQuestion = () => {
    if (currentQuestion && currentQuestion.question) {
      if (currentQuestion.type === 'multiple') {
        // Pad or trim options to 4
        while (currentOptions.length < 4) {
          currentOptions.push(`Pilihan ${String.fromCharCode(65 + currentOptions.length)}`);
        }
        currentQuestion.options = currentOptions.slice(0, 4);
        if (currentQuestion.correctAnswer === undefined) {
          currentQuestion.correctAnswer = 0;
        }
      } else {
        // OX
        if (!currentQuestion.correctAnswer || (currentQuestion.correctAnswer !== 'O' && currentQuestion.correctAnswer !== 'X')) {
          currentQuestion.correctAnswer = 'O';
        }
      }
      currentQuestion.timeLimit = currentQuestion.timeLimit || 15;
      questions.push(currentQuestion as Question);
    }
    currentQuestion = null;
    currentOptions = [];
    readingExplanation = false;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if line indicates a new question (e.g., "1.", "1)", "Soal 1:", "Q1:", "[1]")
    const questionMatch = line.match(/^(?:Soal\s*)?(?:\d+[\.\)]|Q\d+[:\.]|\[\d+\])\s*(.+)/i);

    if (questionMatch) {
      pushCurrentQuestion();
      const questionText = questionMatch[1].trim();

      // Check if it's an OX question (contains (O/X), (Benar/Salah), (True/False))
      const isOX = /\((?:O\/X|Benar\/Salah|True\/False|B\/S)\)/i.test(questionText) ||
                   /(benar atau salah|true or false)/i.test(questionText);

      currentQuestion = {
        id: `imported-${Date.now()}-${questions.length + 1}`,
        type: isOX ? 'ox' : 'multiple',
        question: questionText.replace(/\s*\((?:O\/X|Benar\/Salah|True\/False|B\/S)\)/gi, '').trim(),
        correctAnswer: isOX ? 'O' : 0,
        timeLimit: 15,
        explanation: '',
      };
      continue;
    }

    if (!currentQuestion) {
      // If no question started yet, see if this line itself looks like a question
      if (line.endsWith('?') || /^(Apakah|Siapakah|Dimanakah|Kapan|Mengapa|Bagaimana|What|Who|Where|When)/i.test(line)) {
        currentQuestion = {
          id: `imported-${Date.now()}-${questions.length + 1}`,
          type: 'multiple',
          question: line,
          correctAnswer: 0,
          timeLimit: 15,
          explanation: '',
        };
        continue;
      }
      continue;
    }

    // Check for Answer Key line (e.g., "Kunci: B", "Jawaban: A", "Kunci Jawaban: Benar", "Answer: O")
    const answerMatch = line.match(/^(?:Kunci|Jawaban|Kunci Jawaban|Answer|Key)\s*[:=\-]\s*(.+)/i);
    if (answerMatch) {
      const rawAns = answerMatch[1].trim().toUpperCase();
      if (rawAns === 'BENAR' || rawAns === 'TRUE' || rawAns === 'O') {
        currentQuestion.correctAnswer = 'O';
        currentQuestion.type = 'ox';
      } else if (rawAns === 'SALAH' || rawAns === 'FALSE' || rawAns === 'X' || rawAns === 'S') {
        currentQuestion.correctAnswer = 'X';
        currentQuestion.type = 'ox';
      } else if (currentQuestion.type === 'ox' && (rawAns === 'B' || rawAns === 'BENAR')) {
        currentQuestion.correctAnswer = 'O';
      } else {
        // Multiple choice letter A, B, C, D
        const letterMatch = rawAns.match(/^([A-D])/);
        if (letterMatch) {
          const charCode = letterMatch[1].charCodeAt(0);
          currentQuestion.correctAnswer = charCode - 65; // A=0, B=1, C=2, D=3
          currentQuestion.type = 'multiple';
        } else if (/^[0-3]/.test(rawAns)) {
          currentQuestion.correctAnswer = parseInt(rawAns.charAt(0), 10);
          currentQuestion.type = 'multiple';
        }
      }
      continue;
    }

    // Check for Explanation / Pembahasan line
    const explanationMatch = line.match(/^(?:Pembahasan|Penjelasan|Explanation|Catatan)\s*[:=\-]\s*(.+)/i);
    if (explanationMatch) {
      currentQuestion.explanation = explanationMatch[1].trim();
      readingExplanation = true;
      continue;
    }

    if (readingExplanation) {
      currentQuestion.explanation = (currentQuestion.explanation ? currentQuestion.explanation + ' ' : '') + line;
      continue;
    }

    // Check for Multiple Choice Options (A. ..., B. ..., C. ..., D. ...)
    const optionMatch = line.match(/^([A-Da-d])[\.\)\-]\s*(.+)/);
    if (optionMatch) {
      currentQuestion.type = 'multiple';
      currentOptions.push(optionMatch[2].trim());
      continue;
    }

    // Check for OX indicator in options
    if (/^[OXox][\.\)\-]\s*(.+)/.test(line) || /^(Benar|Salah|True|False)/i.test(line)) {
      currentQuestion.type = 'ox';
      continue;
    }

    // If options are still few and line doesn't match keys, append to question or treat as option
    if (currentOptions.length > 0 && currentOptions.length < 4) {
      currentOptions.push(line);
    } else if (currentOptions.length === 0 && !currentQuestion.explanation) {
      currentQuestion.question += ' ' + line;
    }
  }

  pushCurrentQuestion();
  return questions;
}

/**
 * Extracts raw text from a Word (.docx) file ArrayBuffer using mammoth
 */
export async function extractTextFromDocx(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value || '';
  } catch (err) {
    console.error('Failed to parse docx with mammoth:', err);
    throw new Error('Gagal mengekstrak teks dari file Word (.docx). Pastikan format file valid.');
  }
}

/**
 * Extracts raw text from a PDF file ArrayBuffer using pdfjs-dist
 */

/**
 * Extract text from PDF using local PDF.js worker.
 */
export async function extractTextFromPdf(arrayBuffer: ArrayBuffer): Promise<string> {
  let loadingTask: any;

  try {
    const pdfjsLib = await import('pdfjs-dist');

    // Gunakan worker lokal dari node_modules, bukan CDN.
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

    loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
    });

    const pdf = await loadingTask.promise;
    const pages: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();

      const lines: string[] = [];
      let currentLine = '';
      let previousY: number | null = null;

      for (const item of content.items) {
        if (!('str' in item)) continue;

        const text = item.str.trim();
        if (!text) continue;

        const y = item.transform[5];

        // Deteksi pergantian baris berdasarkan posisi teks.
        if (
          previousY !== null &&
          Math.abs(y - previousY) > 3 &&
          currentLine
        ) {
          lines.push(currentLine.trim());
          currentLine = '';
        }

        currentLine += (currentLine ? ' ' : '') + text;
        previousY = y;

        if (item.hasEOL) {
          lines.push(currentLine.trim());
          currentLine = '';
          previousY = null;
        }
      }

      if (currentLine.trim()) {
        lines.push(currentLine.trim());
      }

      pages.push(lines.join('\n'));
    }

    const fullText = pages.join('\n\n');

    if (!fullText.trim()) {
      throw new Error(
        'PDF tidak mengandung teks yang dapat dibaca. Jika PDF berupa hasil scan, diperlukan OCR.'
      );
    }

    return fullText;
  } catch (err: any) {
    console.error('PDF extraction error:', err);

    if (err?.name === 'PasswordException') {
      throw new Error('PDF dilindungi password. Silakan gunakan PDF tanpa password.');
    }

    if (err?.message?.includes('tidak mengandung teks')) {
      throw err;
    }

    throw new Error(
      `Gagal membaca PDF: ${err?.message || 'Kesalahan tidak diketahui'}`
    );
  } finally {
    if (loadingTask) {
      try {
        await loadingTask.destroy();
      } catch {
        // Abaikan error saat membersihkan worker.
      }
    }
  }
}

import JSZip from 'jszip';

export const extractTextFromPptx = async (
  buffer: ArrayBuffer
): Promise<string> => {
  const zip = await JSZip.loadAsync(buffer);

  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const numA = Number(a.match(/slide(\d+)\.xml$/)?.[1] || 0);
      const numB = Number(b.match(/slide(\d+)\.xml$/)?.[1] || 0);
      return numA - numB;
    });

  const slideTexts: string[] = [];

  for (const slideFile of slideFiles) {
    const file = zip.file(slideFile);
    if (!file) continue;

    const xml = await file.async('text');
    const parser = new DOMParser();
    const document = parser.parseFromString(xml, 'application/xml');

    const textElements = Array.from(
      document.getElementsByTagName('a:t')
    );

    const text = textElements
      .map((element) => element.textContent?.trim() || '')
      .filter(Boolean)
      .join(' ');

    if (text) {
      const slideNumber = slideFile.match(/slide(\d+)\.xml$/)?.[1];
      slideTexts.push(`SLIDE ${slideNumber}\n${text}`);
    }
  }

  if (slideTexts.length === 0) {
    throw new Error('Tidak ditemukan teks pada slide PowerPoint.');
  }

  return slideTexts.join('\n\n');
};

