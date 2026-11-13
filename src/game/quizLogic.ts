import { Player, Question, QuizType } from '../types/game';

/**
 * Calculates points earned for a correct answer based on remaining time and streak.
 * Base score: 1000
 * Time bonus: up to 500 points depending on speed
 * Streak multiplier: 1x, 1.2x, 1.5x, 2.0x
 */
export function calculateScore(
  isCorrect: boolean,
  timeLeft: number,
  totalTime: number,
  currentStreak: number
): { pointsAwarded: number; newStreak: number } {
  if (!isCorrect) {
    return { pointsAwarded: 0, newStreak: 0 };
  }

  const baseScore = 1000;
  const timeRatio = totalTime > 0 ? Math.max(0, Math.min(1, timeLeft / totalTime)) : 0;
  const timeBonus = Math.round(timeRatio * 500);

  // Streak multiplier: streak 0 -> 1x, streak 1 -> 1.2x, streak 2 -> 1.4x, streak >= 3 -> 1.5x, streak >= 5 -> 2.0x
  let multiplier = 1.0;
  if (currentStreak >= 5) multiplier = 2.0;
  else if (currentStreak >= 3) multiplier = 1.5;
  else if (currentStreak >= 2) multiplier = 1.3;
  else if (currentStreak >= 1) multiplier = 1.1;

  const pointsAwarded = Math.round((baseScore + timeBonus) * multiplier);
  return {
    pointsAwarded,
    newStreak: currentStreak + 1,
  };
}

/**
 * Evaluates which zone the player is standing in on a normalized 0..1 arena coordinate.
 * In OX mode:
 * - Left half (x < 0.46) = 'O'
 * - Right half (x > 0.54) = 'X'
 * - Neutral middle (0.46 <= x <= 0.54) = 'none'
 *
 * In 4-choice mode:
 * - Top-left (x < 0.47 && y < 0.47) = 'A'
 * - Top-right (x > 0.53 && y < 0.47) = 'B'
 * - Bottom-left (x < 0.47 && y > 0.53) = 'C'
 * - Bottom-right (x > 0.53 && y > 0.53) = 'D'
 * - Neutral alleyways = 'none'
 */
export function getZoneFromPosition(
  x: number,
  y: number,
  quizType: QuizType
): 'none' | 'O' | 'X' | 'A' | 'B' | 'C' | 'D' {
  // Clamped coordinates 0..1
  const cx = Math.max(0, Math.min(1, x));
  const cy = Math.max(0, Math.min(1, y));

  if (quizType === 'ox') {
    if (cx < 0.46) return 'O';
    if (cx > 0.54) return 'X';
    return 'none';
  } else {
    // 4-choice
    if (cx < 0.47 && cy < 0.47) return 'A';
    if (cx > 0.53 && cy < 0.47) return 'B';
    if (cx < 0.47 && cy > 0.53) return 'C';
    if (cx > 0.53 && cy > 0.53) return 'D';
    return 'none';
  }
}

/**
 * Returns the target coordinates (center of the zone) for bots or pathing
 */
export function getZoneCenterCoordinates(
  zone: 'O' | 'X' | 'A' | 'B' | 'C' | 'D',
  quizType: QuizType
): { x: number; y: number } {
  if (quizType === 'ox') {
    if (zone === 'O') return { x: 0.25, y: 0.5 };
    if (zone === 'X') return { x: 0.75, y: 0.5 };
    return { x: 0.5, y: 0.5 };
  } else {
    if (zone === 'A') return { x: 0.25, y: 0.25 };
    if (zone === 'B') return { x: 0.75, y: 0.25 };
    if (zone === 'C') return { x: 0.25, y: 0.75 };
    if (zone === 'D') return { x: 0.75, y: 0.75 };
    return { x: 0.5, y: 0.5 };
  }
}

/**
 * Checks if a player's selected zone matches the correct answer
 */
export function isAnswerCorrect(
  playerZone: string,
  question: Question
): boolean {
  if (question.type === 'ox') {
    return playerZone === String(question.correctAnswer).toUpperCase();
  } else {
    const optionMap: Record<number, string> = { 0: 'A', 1: 'B', 2: 'C', 3: 'D' };
    const correctLetter = optionMap[Number(question.correctAnswer)] || 'A';
    return playerZone === correctLetter;
  }
}

/**
 * Generates an easy-to-type 6-digit room PIN
 */
export function generateRoomCode(): string {
  const chars = '0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * AI Bot decision logic for lively simulated classmates
 * Bots have different knowledge proficiencies (some smart, some followers, some random)
 */
export function getBotTargetZone(
  question: Question,
  botIntelligence: number // 0 to 1
): 'O' | 'X' | 'A' | 'B' | 'C' | 'D' {
  const willAnswerCorrectly = Math.random() < botIntelligence;
  
  if (question.type === 'ox') {
    const correct = String(question.correctAnswer).toUpperCase() as 'O' | 'X';
    if (willAnswerCorrectly) return correct;
    return correct === 'O' ? 'X' : 'O';
  } else {
    const options: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];
    const optionMap: Record<number, 'A' | 'B' | 'C' | 'D'> = { 0: 'A', 1: 'B', 2: 'C', 3: 'D' };
    const correct = optionMap[Number(question.correctAnswer)] || 'A';
    
    if (willAnswerCorrectly) return correct;
    
    // Choose wrong option
    const wrongOptions = options.filter(opt => opt !== correct);
    return wrongOptions[Math.floor(Math.random() * wrongOptions.length)];
  }
}
