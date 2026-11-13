import test from 'node:test';
import assert from 'node:assert/strict';
import { parseQuestionsFromText } from './documentParser';

test('parseQuestionsFromText parses 4-choice questions with answer key and explanation', () => {
  const docText = `
1. Danau vulkanik terbesar di dunia adalah?
A. Danau Singkarak
B. Danau Toba
C. Danau Matano
D. Danau Sentani
Kunci: B
Pembahasan: Danau Toba adalah kaldera vulkanik purba di Sumatera Utara.

2. Ibukota Indonesia adalah?
A. Bandung
B. Jakarta
C. Surabaya
D. Medan
Jawaban: B
  `;

  const questions = parseQuestionsFromText(docText);
  assert.equal(questions.length, 2);

  // Question 1
  assert.equal(questions[0].type, 'multiple');
  assert.match(questions[0].question, /Danau vulkanik terbesar/);
  assert.equal(questions[0].options?.length, 4);
  assert.equal(questions[0].options?.[1], 'Danau Toba');
  assert.equal(questions[0].correctAnswer, 1); // B is index 1
  assert.match(questions[0].explanation || '', /Danau Toba adalah/);

  // Question 2
  assert.equal(questions[1].type, 'multiple');
  assert.equal(questions[1].correctAnswer, 1);
});

test('parseQuestionsFromText parses OX (True/False) questions correctly', () => {
  const oxText = `
1. Matahari adalah bintang yang paling dekat dengan planet Bumi? (Benar/Salah)
Kunci: Benar
Pembahasan: Jarak rata-rata Bumi ke Matahari sekitar 150 juta km.

2. Kelelawar termasuk dalam kelompok burung? (O/X)
Kunci: X
Penjelasan: Kelelawar adalah mamalia terbang.
  `;

  const questions = parseQuestionsFromText(oxText);
  assert.equal(questions.length, 2);

  assert.equal(questions[0].type, 'ox');
  assert.equal(questions[0].correctAnswer, 'O');

  assert.equal(questions[1].type, 'ox');
  assert.equal(questions[1].correctAnswer, 'X');
});
