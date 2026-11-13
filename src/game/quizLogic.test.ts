import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateScore,
  getZoneFromPosition,
  isAnswerCorrect,
  getZoneCenterCoordinates,
  generateRoomCode,
} from './quizLogic';
import { Question } from '../types/game';

test('calculateScore awards 0 points for incorrect answers and resets streak', () => {
  const result = calculateScore(false, 10, 15, 3);
  assert.equal(result.pointsAwarded, 0);
  assert.equal(result.newStreak, 0);
});

test('calculateScore calculates base score plus speed bonus with streak multipliers', () => {
  // Full time left (15/15), streak 0 -> base 1000 + 500 = 1500 * 1.0 = 1500
  const r1 = calculateScore(true, 15, 15, 0);
  assert.equal(r1.pointsAwarded, 1500);
  assert.equal(r1.newStreak, 1);

  // 0 time left, streak 0 -> base 1000 * 1.0 = 1000
  const r2 = calculateScore(true, 0, 15, 0);
  assert.equal(r2.pointsAwarded, 1000);
  assert.equal(r2.newStreak, 1);

  // High streak (streak 5) gets 2.0x multiplier
  const r3 = calculateScore(true, 15, 15, 5);
  assert.equal(r3.pointsAwarded, 3000);
  assert.equal(r3.newStreak, 6);
});

test('getZoneFromPosition accurately detects OX arena zones', () => {
  // Left side is O
  assert.equal(getZoneFromPosition(0.2, 0.5, 'ox'), 'O');
  assert.equal(getZoneFromPosition(0.4, 0.2, 'ox'), 'O');

  // Right side is X
  assert.equal(getZoneFromPosition(0.8, 0.5, 'ox'), 'X');
  assert.equal(getZoneFromPosition(0.6, 0.9, 'ox'), 'X');

  // Center neutral alleyway
  assert.equal(getZoneFromPosition(0.5, 0.5, 'ox'), 'none');
});

test('getZoneFromPosition accurately detects 4-Choice arena quadrants', () => {
  // Top-left is A
  assert.equal(getZoneFromPosition(0.2, 0.2, 'multiple'), 'A');
  // Top-right is B
  assert.equal(getZoneFromPosition(0.8, 0.2, 'multiple'), 'B');
  // Bottom-left is C
  assert.equal(getZoneFromPosition(0.2, 0.8, 'multiple'), 'C');
  // Bottom-right is D
  assert.equal(getZoneFromPosition(0.8, 0.8, 'multiple'), 'D');
  // Center neutral divider
  assert.equal(getZoneFromPosition(0.5, 0.5, 'multiple'), 'none');
});

test('isAnswerCorrect validates both OX and Multiple Choice questions', () => {
  const oxQuestion: Question = {
    id: 'q1',
    type: 'ox',
    question: 'Bumi itu bulat?',
    correctAnswer: 'O',
    timeLimit: 15,
  };

  assert.equal(isAnswerCorrect('O', oxQuestion), true);
  assert.equal(isAnswerCorrect('X', oxQuestion), false);
  assert.equal(isAnswerCorrect('none', oxQuestion), false);

  const mcQuestion: Question = {
    id: 'q2',
    type: 'multiple',
    question: 'Ibukota Indonesia?',
    options: ['Bandung', 'Jakarta', 'Surabaya', 'Medan'],
    correctAnswer: 1, // 'B' (Jakarta)
    timeLimit: 15,
  };

  assert.equal(isAnswerCorrect('B', mcQuestion), true);
  assert.equal(isAnswerCorrect('A', mcQuestion), false);
  assert.equal(isAnswerCorrect('C', mcQuestion), false);
});

test('generateRoomCode produces a 6-digit numeric string', () => {
  const code = generateRoomCode();
  assert.equal(code.length, 6);
  assert.match(code, /^\d{6}$/);
});

test('getZoneCenterCoordinates returns valid centers within bounds', () => {
  const oxCenter = getZoneCenterCoordinates('O', 'ox');
  assert.equal(oxCenter.x, 0.25);
  assert.equal(oxCenter.y, 0.5);

  const mcCenter = getZoneCenterCoordinates('B', 'multiple');
  assert.equal(mcCenter.x, 0.75);
  assert.equal(mcCenter.y, 0.25);
});
