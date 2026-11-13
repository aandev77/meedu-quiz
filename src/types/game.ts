export type QuizType = 'ox' | 'multiple' | 'essay';

export interface Question {
  id: string;
  type: QuizType;
  question: string;

  // Pilihan jawaban untuk soal pilihan ganda
  options?: string[];

  // O/X, indeks pilihan ganda, atau jawaban essay
  correctAnswer: string | number;

  // Kata kunci untuk pemeriksaan jawaban essay
  keywords?: string[];

  // Alternatif jawaban essay yang dianggap benar
  acceptedAnswers?: string[];

  // Penjelasan yang dibuat saat kuis disusun
  explanation?: string;

  timeLimit: number;
  category?: string;

  groupId?: string;
  questionRole?: 'main' | 'backup';
  backupIndex?: number;
}

export interface QuizPack {
  id: string;
  title: string;
  description: string;
  category: string;
  thumbnail: string;
  questions: Question[];
  creator: string;
  isCustom?: boolean;
}

export interface AvatarConfig {
  skinColor: string;
  hairStyle: 'spiky' | 'curly' | 'short' | 'ponytail' | 'cap' | 'bob';
  hairColor: string;
  shirtColor: string;
  pantsColor: string;
  accessory: 'none' | 'glasses' | 'headband' | 'crown' | 'headphones' | 'flower';
  gender?: 'neutral' | 'boy' | 'girl';
}

export interface EmoteBubble {
  id: string;
  emoji: string;
  text?: string;
  timestamp: number;
}

export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  isBot?: boolean;
  avatar: AvatarConfig;
  x: number; // 0 to 1 normalized canvas coordinate
  y: number; // 0 to 1 normalized canvas coordinate
  targetX?: number;
  targetY?: number;
  facing: 'left' | 'right' | 'up' | 'down';
  isJumping: boolean;
  jumpOffset: number;
  currentZone: 'none' | 'O' | 'X' | 'A' | 'B' | 'C' | 'D';
  score: number;
  streak: number;
  isCorrectLastRound?: boolean;
  isEliminated?: boolean;
  emote?: EmoteBubble | null;
}

export type GameStage = 
  | 'lobby'
  | 'waiting'
  | 'question_intro'
  | 'answering'
  | 'times_up'
  | 'reveal'
  | 'round_result'
  | 'podium';

export type GameMode = 'classic' | 'survival' | 'speedrun' | 'adventure';

export interface GameRoom {
  code: string;
  hostId: string;
  mode: GameMode;
  quizPack: QuizPack;
  currentQuestionIndex: number;
  stage: GameStage;
  timeLeft: number;
  totalTime: number;
  players: Player[];
  roundResults?: {
    correctZone: string;
    survivorsCount: number;
    eliminatedCount: number;
    leaderboard: { id: string; name: string; score: number; scoreDelta: number }[];
  };
}
