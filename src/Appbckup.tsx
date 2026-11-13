import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  AvatarConfig,
  GameMode,
  GameRoom,
  Player,
  QuizPack,
  QuizType,
} from './types/game';
import { DEFAULT_QUIZ_PACKS } from './data/defaultQuizzes';
import {
  calculateScore,
  generateRoomCode,
  getBotTargetZone,
  getZoneCenterCoordinates,
  isAnswerCorrect,
} from './game/quizLogic';
import { sounds } from './game/audio';
import { Navbar } from './components/Navbar';
import { LobbyView } from './components/LobbyView';
import { ArenaCanvas } from './components/ArenaCanvas';
import { AdventureCanvas } from './components/AdventureCanvas';
import { HUD } from './components/HUD';
import { HostControls } from './components/HostControls';
import { PodiumModal } from './components/PodiumModal';
import { AvatarCustomizer } from './components/AvatarCustomizer';
import { QuizCreatorModal } from './components/QuizCreatorModal';
import { AdventureQuestionModal } from './components/AdventureQuestionModal';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebase';
import { LoginView } from './components/LoginView';
import {
  createRoom,
  getRoom,
  joinRoom,
  subscribeRoom,
  subscribePlayers,
  updateRoom,
  updatePlayer,
} from './services/roomService';

const DEFAULT_AVATAR: AvatarConfig = {
  skinColor: '#ffd39b',
  hairStyle: 'spiky',
  hairColor: '#2d3748',
  shirtColor: '#3b82f6',
  pantsColor: '#1e293b',
  accessory: 'headphones',
};

const BOT_NAMES = ['Siti Pintar', 'Kevin Cerdas', 'Rizky Juara', 'Maya Genius', 'Dani Hebat', 'Aisyah Kreatif', 'Bima Tangkas'];
export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [serverRole, setServerRole] = useState<'teacher' | 'student'>('student');
  // Active Game Room
const [currentRoom, setCurrentRoom] = useState<GameRoom | null>(null);
  const lastPositionSyncRef = useRef(0);

  // Memverifikasi role pengguna melalui server
// Menyinkronkan pilihan role pengguna dengan server
const verifyUserRole = async (firebaseUser: User) => {
  try {
    const token = await firebaseUser.getIdToken();

    // Ambil role yang dipilih dari halaman login
    const selectedRole = localStorage.getItem('meedu_selected_role');

    // Jika ada pilihan role, simpan ke Firestore
    if (selectedRole === 'teacher' || selectedRole === 'student') {
      const updateResponse = await fetch('/api/auth/role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          role: selectedRole,
        }),
      });

      if (!updateResponse.ok) {
        throw new Error('Gagal menyimpan pilihan role.');
      }
    }

    // Ambil role terbaru dari server
    const response = await fetch('/api/auth/profile', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Gagal mengambil profil pengguna.');
    }

    const result = await response.json();

    setServerRole(
      result.user.role === 'teacher' ? 'teacher' : 'student'
    );
  } catch (error) {
    console.error('Role verification error:', error);
    setServerRole('student');
  }
};

  // Memantau status login Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        await verifyUserRole(firebaseUser);
      } else {
        setServerRole('student');
      }

      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

useEffect(() => {
  if (!currentRoom?.code) return;

  const roomCode = currentRoom.code;

  // Mendengarkan perubahan data room
  const unsubscribeRoom = subscribeRoom(roomCode, (room) => {
    if (!room) {
      setCurrentRoom(null);
      return;
    }

    setCurrentRoom((prev) => {
      if (!prev || prev.code !== roomCode) return prev;

      return {
        ...room,
        players: prev.players,
      };
    });
  });

  // Mendengarkan perubahan data pemain
  const unsubscribePlayers = subscribePlayers(roomCode, (players) => {
    setCurrentRoom((prev) => {
      if (!prev || prev.code !== roomCode) return prev;

      return {
        ...prev,
        players,
      };
    });
  });

  return () => {
    unsubscribeRoom();
    unsubscribePlayers();
  };
}, [currentRoom?.code]);

const userRole = serverRole;

  // Local Player Profile
  const [playerName, setPlayerName] = useState<string>(() => {
    return localStorage.getItem('zep_player_name') || 'Siswa Juara';
  });
  const [avatar, setAvatar] = useState<AvatarConfig>(() => {
    const saved = localStorage.getItem('zep_player_avatar');
    return saved ? JSON.parse(saved) : DEFAULT_AVATAR;
  });
  const [playerId] = useState<string>(() => {
    return 'p_' + Math.random().toString(36).substring(2, 9);
  });

  // Quiz Packs (default + user saved)
  const [quizPacks, setQuizPacks] = useState<QuizPack[]>(() => {
    const saved = localStorage.getItem('zep_custom_quizzes');
    if (saved) {
      try {
        return [...DEFAULT_QUIZ_PACKS, ...JSON.parse(saved)];
      } catch (e) {
        return DEFAULT_QUIZ_PACKS;
      }
    }
    return DEFAULT_QUIZ_PACKS;
  });

  // Active Game Room
  useEffect(() => {
  if (!currentRoom?.code) return;

  const unsubscribe = subscribeRoom(currentRoom.code, (room) => {
    if (room) {
      setCurrentRoom(room);
    } else {
      setCurrentRoom(null);
    }
  });

  return () => unsubscribe();
}, [currentRoom?.code]);
  const [nearbyChest, setNearbyChest] = useState<number | null>(null);
  const [activeChest, setActiveChest] = useState<number | null>(null);
  const [isQuestionOpen, setIsQuestionOpen] = useState(false);

  // Adventure Question System
const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
const [wrongAttempts, setWrongAttempts] = useState(0);
const [timeLeft, setTimeLeft] = useState(0);
const [showAnswer, setShowAnswer] = useState(false);
const [chestCompleted, setChestCompleted] = useState<number[]>([]);
const [chestScores, setChestScores] = useState<Record<number, number>>({});
// Total skor Adventure
const adventureTotalScore = Object.values(chestScores).reduce(
  (total, score) => total + score,
  0
);

// Jumlah peti yang tersedia
const adventureTotalChests = Math.ceil(
  (currentRoom?.quizPack.questions.length ?? 0) / 4
);

  useEffect(() => {
  if (nearbyChest === null) return;

  // Jangan membuka peti yang sudah selesai
  if (chestCompleted.includes(nearbyChest)) return;

  // Peti baru
  if (activeChest === null) {
    const firstQuestion =
      currentRoom?.quizPack.questions[nearbyChest * 4];

    if (!firstQuestion) return;

    setActiveChest(nearbyChest);
    setActiveQuestionIndex(0);
    setWrongAttempts(0);
    setTimeLeft(7 * 60);
    setShowAnswer(false);
    setIsQuestionOpen(true);
    
    return;
  }

  // Membuka kembali peti yang sama setelah pemain mendekatinya lagi
  if (activeChest === nearbyChest) {
    setIsQuestionOpen(true);
  }
}, [
  nearbyChest,
  activeChest,
  chestCompleted,
  currentRoom,
]);

  // UI Modals
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [showCreator, setShowCreator] = useState(false);
  const [isMuted, setIsMuted] = useState<boolean>(() => sounds.getMuted());

  // BroadcastChannel for cross-tab multiplayer sync
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Initialize BroadcastChannel
  // BroadcastChannel for cross-tab multiplayer sync
useEffect(() => {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    const channel = new BroadcastChannel('zep_quiz_metaverse_v1');
    channelRef.current = channel;

    channel.onmessage = (event) => {
      const { type, payload } = event.data;
      if (!type || !payload) return;

      if (type === 'ROOM_SYNC') {
        // Sync room if we are in this room and not the host
        setCurrentRoom((prev) => {
          if (prev && prev.code === payload.code && prev.hostId !== playerId) {
            return payload;
          }
          return prev;
        });
      } else if (type === 'PLAYER_MOVE') {
        // Update another player's position
        setCurrentRoom((prev) => {
          if (!prev || prev.code !== payload.roomCode) return prev;

          const updated = prev.players.map((p) =>
            p.id === payload.playerId ? { ...p, ...payload.data } : p
          );

          return { ...prev, players: updated };
        });
      }
    };

    return () => {
      channel.close();
      channelRef.current = null;
    };
  }
}, [playerId]);

// Adventure Question Data
const adventureQuestions = currentRoom?.quizPack.questions ?? [];

const activeAdventureQuestion =
  activeChest !== null
    ? adventureQuestions[activeChest * 4 + activeQuestionIndex]
    : undefined;

// Adventure answer handler

const handleAdventureAnswer = (answer: string | number) => {
  if (!activeAdventureQuestion || activeChest === null) return;

  const question = activeAdventureQuestion;

  // Normalisasi teks agar huruf besar, spasi, dan tanda baca tidak mengganggu.
  const normalizeText = (value: string | number) =>
    String(value)
      .toLowerCase()
      .trim()
      .replace(/[^\p{L}\p{N}\s]/gu, '')
      .replace(/\s+/g, ' ');

  let isCorrect = false;

  // Penilaian berdasarkan jenis soal
  if (question.type === 'ox') {
    isCorrect =
      answer !== '__TIMEOUT__' &&
      String(answer).toUpperCase() ===
        String(question.correctAnswer).toUpperCase();
  } else if (question.type === 'multiple') {
    isCorrect =
      answer !== -1 &&
      Number(answer) === Number(question.correctAnswer);
  } else if (question.type === 'essay') {
    const studentAnswer = normalizeText(answer);
    const correctAnswer = normalizeText(question.correctAnswer);

    const acceptedAnswers = (question.acceptedAnswers ?? [])
      .map(normalizeText)
      .filter(Boolean);

    const keywords = (question.keywords ?? [])
      .map(normalizeText)
      .filter(Boolean);

    // Jawaban esai bisa benar melalui jawaban alternatif
    // atau jika seluruh kata kunci ditemukan.
    const matchesAcceptedAnswer = acceptedAnswers.some(
      accepted => studentAnswer === accepted
    );

    const matchesKeywords =
      keywords.length > 0 &&
      keywords.every(keyword => studentAnswer.includes(keyword));

    const matchesCorrectAnswer =
      correctAnswer.length > 0 && studentAnswer === correctAnswer;

    isCorrect =
      studentAnswer.length > 0 &&
      (
        matchesAcceptedAnswer ||
        matchesKeywords ||
        matchesCorrectAnswer
      );
  }

  if (isCorrect) {
    const totalChests = Math.ceil(adventureQuestions.length / 4);
    const pointsPerChest = totalChests > 0 ? 100 / totalChests : 0;

    // Setiap jawaban salah mengurangi 5 poin
    const score = Math.max(0, pointsPerChest - wrongAttempts * 5);

    setChestScores(previous => ({
      ...previous,
      [activeChest]: score,
    }));

    setChestCompleted(previous =>
      previous.includes(activeChest)
        ? previous
        : [...previous, activeChest]
    );

    setShowAnswer(false);
    setIsQuestionOpen(false);
    setActiveChest(null);
    return;
  }

  // Jawaban salah
  const nextWrongAttempts = wrongAttempts + 1;
  setWrongAttempts(nextWrongAttempts);

  // Jika empat soal sudah dijawab salah
  if (nextWrongAttempts >= 4 || activeQuestionIndex >= 3) {
    setChestScores(previous => ({
      ...previous,
      [activeChest]: 0,
    }));

    setChestCompleted(previous =>
      previous.includes(activeChest)
        ? previous
        : [...previous, activeChest]
    );

    setShowAnswer(true);
    return;
  }

  // Pindah ke soal cadangan berikutnya
  const nextIndex = activeQuestionIndex + 1;
  const nextQuestion = adventureQuestions[activeChest * 4 + nextIndex];

  if (!nextQuestion) {
    setChestScores(previous => ({
      ...previous,
      [activeChest]: 0,
    }));

    setChestCompleted(previous =>
      previous.includes(activeChest)
        ? previous
        : [...previous, activeChest]
    );

    setShowAnswer(true);
    return;
  }

  setActiveQuestionIndex(nextIndex);
  setTimeLeft(5 * 60);
};

const handleContinueAdventure = () => {
  setShowAnswer(false);
  setIsQuestionOpen(false);
  setActiveChest(null);
  setActiveQuestionIndex(0);
  setWrongAttempts(0);
  setTimeLeft(0);
};

// Hilangkan scrollbar khusus saat Adventure Mode aktif
useEffect(() => {
  if (currentRoom?.mode !== 'adventure') return;

  const previousBodyOverflow = document.body.style.overflow;
  const previousHtmlOverflow = document.documentElement.style.overflow;
  // Adventure active question
  
  document.body.style.overflow = 'hidden';
  document.documentElement.style.overflow = 'hidden';

  return () => {
    document.body.style.overflow = previousBodyOverflow;
    document.documentElement.style.overflow = previousHtmlOverflow;
  };
}, [currentRoom?.mode]);

  // Save profile changes
  const handleNameChange = (name: string) => {
    setPlayerName(name);
    localStorage.setItem('zep_player_name', name);
  };

  const handleAvatarChange = (newAvatar: AvatarConfig) => {
    setAvatar(newAvatar);
    localStorage.setItem('zep_player_avatar', JSON.stringify(newAvatar));
  };

  // Helper to create lively simulated bots
  const createBots = (count: number, currentQuizType: QuizType): Player[] => {
    const bots: Player[] = [];
    for (let i = 0; i < count; i++) {
      const bName = BOT_NAMES[i % BOT_NAMES.length];
      bots.push({
        id: `bot_${i}_${Date.now()}`,
        name: bName,
        isHost: false,
        isBot: true,
        avatar: {
          skinColor: ['#f8d5b8', '#ffd39b', '#d2a177', '#a67c52'][i % 4],
          hairStyle: (['spiky', 'curly', 'short', 'bob', 'ponytail', 'cap'] as const)[i % 6],
          hairColor: ['#2d3748', '#713f12', '#eab308', '#ef4444', '#3b82f6'][i % 5],
          shirtColor: ['#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'][i % 5],
          pantsColor: '#1e293b',
          accessory: (['none', 'glasses', 'headphones', 'flower'] as const)[i % 4],
        },
        x: 0.2 + (i % 4) * 0.18,
        y: 0.3 + Math.floor(i / 4) * 0.25,
        facing: i % 2 === 0 ? 'right' : 'left',
        isJumping: false,
        jumpOffset: 0,
        currentZone: 'none',
        score: 0,
        streak: 0,
      });
    }
    return bots;
  };

// Host a new game room
const handleHostGame = async (pack: QuizPack, mode: GameMode) => {
  if (!user || userRole !== 'teacher') return;

  const code = generateRoomCode();

  const newRoom: GameRoom = {
    code,
    hostId: user.uid,
    mode,
    quizPack: pack,
    currentQuestionIndex: 0,
    stage: 'waiting',
    timeLeft: pack.questions[0]?.timeLimit || 15,
    totalTime: pack.questions[0]?.timeLimit || 15,
    players: [], // Guru bukan pemain dan tidak ada bot otomatis
  };

  try {
    await createRoom(newRoom);
    setCurrentRoom(newRoom);
  } catch (error) {
    console.error('Gagal membuat room:', error);
    alert('Gagal membuat room. Periksa koneksi dan Firestore Rules.');
  }
};

  // Quick Play / Solo auto-start
  const handleQuickPlay = useCallback(() => {
    const pack = quizPacks[0];
    const code = generateRoomCode();
    const me: Player = {
      id: playerId,
      name: playerName || 'Siswa Bintang',
      isHost: true,
      avatar,
      x: 0.5,
      y: 0.5,
      facing: 'down',
      isJumping: false,
      jumpOffset: 0,
      currentZone: 'none',
      score: 0,
      streak: 0,
    };

    const bots = createBots(6, pack.questions[0]?.type || 'ox');

    const room: GameRoom = {
      code,
      hostId: playerId,
      mode: 'classic',
      quizPack: pack,
      currentQuestionIndex: 0,
      stage: 'answering',
      timeLeft: pack.questions[0]?.timeLimit || 15,
      totalTime: pack.questions[0]?.timeLimit || 15,
      players: [me, ...bots],
    };

    setCurrentRoom(room);
  }, [avatar, playerId, playerName, quizPacks]);

  // Support ?autostart=1 query parameter
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') {
        handleQuickPlay();
      }
    }
  }, [handleQuickPlay]);

// Join an existing game room by PIN
const handleJoinGame = async (pin: string, name: string) => {
  if (!user || userRole !== 'student') {
    alert('Hanya siswa yang dapat bergabung ke room.');
    return;
  }

  const me: Player = {
    id: user.uid,
    name,
    isHost: false,
    avatar,
    x: 0.45 + Math.random() * 0.1,
    y: 0.45 + Math.random() * 0.1,
    facing: 'down',
    isJumping: false,
    jumpOffset: 0,
    currentZone: 'none',
    score: 0,
    streak: 0,
  };

  try {
    // Periksa apakah room dengan PIN tersebut tersedia
    const room = await getRoom(pin);

    if (!room) {
      alert('Room tidak ditemukan. Periksa kembali PIN.');
      return;
    }

    // Gabungkan siswa ke room
    await joinRoom(pin, me);

    // Ambil data room terbaru
    const updatedRoom = await getRoom(pin);

    if (!updatedRoom) {
      alert('Gagal mengambil data room.');
      return;
    }

    setCurrentRoom(updatedRoom);

    channelRef.current?.postMessage({
      type: 'ROOM_SYNC',
      payload: updatedRoom,
    });
  } catch (error) {
    console.error('Gagal bergabung ke room:', error);

    alert(
      error instanceof Error
        ? error.message
        : 'Gagal bergabung ke room. Periksa koneksi Firestore.'
    );
  }
};

  // Add more bot classmates
  const handleAddBots = () => {
    if (!currentRoom) return;
    const currentQ = currentRoom.quizPack.questions[currentRoom.currentQuestionIndex];
    const newBots = createBots(5, currentQ?.type || 'ox');
    const updated = {
      ...currentRoom,
      players: [...currentRoom.players, ...newBots],
    };
    setCurrentRoom(updated);
    channelRef.current?.postMessage({ type: 'ROOM_SYNC', payload: updated });
  };

  // Start the quiz
  const handleStartGame = async () => {
  if (!currentRoom) return;

  const firstQ = currentRoom.quizPack.questions[0];

  const updated: GameRoom = {
    ...currentRoom,
    stage: 'answering',
    currentQuestionIndex: 0,
    timeLeft: firstQ.timeLimit || 15,
    totalTime: firstQ.timeLimit || 15,
  };

  try {
    await updateRoom(currentRoom.code, {
      stage: updated.stage,
      currentQuestionIndex: updated.currentQuestionIndex,
      timeLeft: updated.timeLeft,
      totalTime: updated.totalTime,
    });

    setCurrentRoom(updated);
    channelRef.current?.postMessage({
      type: 'ROOM_SYNC',
      payload: updated,
    });

    // Order bots to pick their target zones
    triggerBotDecisions(updated, firstQ);
  } catch (error) {
    console.error('Gagal memulai permainan:', error);
    alert('Gagal memulai permainan. Periksa koneksi Firestore.');
  }
};

  // Bot AI decision trigger
  const triggerBotDecisions = (room: GameRoom, question: any) => {
    const updatedPlayers = room.players.map((p) => {
      if (!p.isBot) return p;

      // Assign target zone based on intelligence
      const intelligence = 0.65 + (p.id.charCodeAt(0) % 3) * 0.1;
      const targetZone = getBotTargetZone(question, intelligence);
      const coords = getZoneCenterCoordinates(targetZone, question.type);

      // Random jitter inside the zone
      const jitterX = (Math.random() - 0.5) * 0.15;
      const jitterY = (Math.random() - 0.5) * 0.15;

      return {
        ...p,
        targetX: Math.max(0.1, Math.min(0.9, coords.x + jitterX)),
        targetY: Math.max(0.15, Math.min(0.85, coords.y + jitterY)),
      };
    });

    setCurrentRoom((prev) => (prev ? { ...prev, players: updatedPlayers } : prev));
  };

  // Countdown timer effect
useEffect(() => {
  if (
    !currentRoom ||
    currentRoom.mode === 'adventure' ||
    currentRoom.stage !== 'answering'
  ) return;

    const timer = setInterval(() => {
      setCurrentRoom((prev) => {
        if (!prev || prev.stage !== 'answering') return prev;

        if (prev.timeLeft <= 1) {
          // Time is up!
          sounds.playTick(true);
          return {
            ...prev,
            timeLeft: 0,
            stage: 'times_up',
          };
        }

        // Urgent tick at <= 5 seconds
        if (prev.timeLeft <= 5) {
          sounds.playTick(true);
        } else {
          sounds.playTick(false);
        }

        return {
          ...prev,
          timeLeft: prev.timeLeft - 1,
        };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentRoom?.stage]);

  // When stage becomes 'times_up', automatically reveal after 1.2 seconds!
  useEffect(() => {
    if (currentRoom?.stage === 'times_up') {
      const timer = setTimeout(() => {
        handleRevealAnswers();
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [currentRoom?.stage]);

// Reveal correct answer and calculate scores!
const handleRevealAnswers = async () => {
  if (!currentRoom) return;

  const currentQ =
    currentRoom.quizPack.questions[currentRoom.currentQuestionIndex];

  if (!currentQ) return;

  let correctZone = '';

  if (currentQ.type === 'ox') {
    correctZone = String(currentQ.correctAnswer).toUpperCase();
  } else {
    const map = ['A', 'B', 'C', 'D'];
    correctZone = map[Number(currentQ.correctAnswer)] || 'A';
  }

  let survivorsCount = 0;
  let eliminatedCount = 0;

  const updatedPlayers = currentRoom.players.map((p) => {
    const isCorrect = isAnswerCorrect(p.currentZone, currentQ);

    const { pointsAwarded, newStreak } = calculateScore(
      isCorrect,
      currentRoom.timeLeft,
      currentRoom.totalTime,
      p.streak
    );

    if (isCorrect) {
      survivorsCount++;

      return {
        ...p,
        score: p.score + pointsAwarded,
        streak: newStreak,
        isCorrectLastRound: true,
        isEliminated: false,
        isJumping: true,
        jumpOffset: 12,
      };
    } else {
      eliminatedCount++;

      return {
        ...p,
        streak: 0,
        isCorrectLastRound: false,
        isEliminated:
          currentRoom.mode === 'survival' ? true : false,
      };
    }
  });

  // Gunakan UID pengguna yang sedang login
  const activePlayerId = user?.uid ?? playerId;

  const localPlayer = updatedPlayers.find(
    (p) => p.id === activePlayerId
  );

  if (localPlayer?.isCorrectLastRound) {
    sounds.playCorrect();
  } else {
    sounds.playWrong();
  }

  const leaderboard = [...updatedPlayers]
    .sort((a, b) => b.score - a.score)
    .map((p) => ({
      id: p.id,
      name: p.name,
      score: p.score,
      scoreDelta: p.isCorrectLastRound ? 1000 : 0,
    }));

  const roundResults = {
    correctZone,
    survivorsCount,
    eliminatedCount,
    leaderboard,
  };

  const revealedRoom: GameRoom = {
    ...currentRoom,
    stage: 'reveal',
    players: updatedPlayers,
    roundResults,
  };

  try {
    // Simpan skor dan status setiap pemain secara terpisah
    await Promise.all(
      updatedPlayers.map((p) =>
        updatePlayer(currentRoom.code, p.id, {
          score: p.score,
          streak: p.streak,
          isCorrectLastRound: p.isCorrectLastRound,
          isEliminated: p.isEliminated,
          isJumping: p.isJumping,
          jumpOffset: p.jumpOffset,
        })
      )
    );

    // Simpan hasil ronde pada dokumen room
    await updateRoom(currentRoom.code, {
      stage: 'reveal',
      roundResults,
    });

    setCurrentRoom(revealedRoom);

    channelRef.current?.postMessage({
      type: 'ROOM_SYNC',
      payload: revealedRoom,
    });
  } catch (error) {
    console.error('Gagal menyimpan hasil permainan:', error);
    alert('Gagal menyimpan hasil permainan ke Firestore.');
  }
};

// Next question or end game
const handleNextQuestion = async () => {
  if (!currentRoom) return;

  const nextIndex = currentRoom.currentQuestionIndex + 1;

  try {
    // Jika semua soal sudah selesai
    if (nextIndex >= currentRoom.quizPack.questions.length) {
      await updateRoom(currentRoom.code, {
        stage: 'podium',
      });

      const podiumRoom: GameRoom = {
        ...currentRoom,
        stage: 'podium',
      };

      setCurrentRoom(podiumRoom);

      channelRef.current?.postMessage({
        type: 'ROOM_SYNC',
        payload: podiumRoom,
      });

      return;
    }

    // Ambil soal berikutnya
    const nextQ = currentRoom.quizPack.questions[nextIndex];

    // Reset status pemain
    const resetPlayers = currentRoom.players.map((p) => ({
      ...p,
      isCorrectLastRound: undefined,
      currentZone: 'none' as const,
      targetX: 0.5 + (Math.random() - 0.5) * 0.2,
      targetY: 0.5 + (Math.random() - 0.5) * 0.2,
      isJumping: false,
      jumpOffset: 0,
    }));

    // Simpan reset setiap pemain ke dokumennya masing-masing
    await Promise.all(
      resetPlayers.map((p) =>
        updatePlayer(currentRoom.code, p.id, {
          isCorrectLastRound: p.isCorrectLastRound,
          currentZone: p.currentZone,
          targetX: p.targetX,
          targetY: p.targetY,
          isJumping: p.isJumping,
          jumpOffset: p.jumpOffset,
        })
      )
    );

    // Perbarui informasi room
    const nextRoom: GameRoom = {
      ...currentRoom,
      currentQuestionIndex: nextIndex,
      stage: 'answering',
      timeLeft: nextQ.timeLimit || 15,
      totalTime: nextQ.timeLimit || 15,
      players: resetPlayers,
      roundResults: undefined,
    };

    await updateRoom(currentRoom.code, {
      currentQuestionIndex: nextIndex,
      stage: 'answering',
      timeLeft: nextRoom.timeLeft,
      totalTime: nextRoom.totalTime,
      roundResults: undefined,
    });

    setCurrentRoom(nextRoom);

    channelRef.current?.postMessage({
      type: 'ROOM_SYNC',
      payload: nextRoom,
    });

    // Trigger bot targeting
    triggerBotDecisions(nextRoom, nextQ);

  } catch (error) {
    console.error('Gagal berpindah soal:', error);
    alert('Gagal berpindah soal. Periksa koneksi Firestore.');
  }
};

  // Restart Quiz
  const handleRestart = () => {
    if (!currentRoom) return;
    handleHostGame(currentRoom.quizPack, currentRoom.mode);
  };

  // Local player jump trigger
  const handleLocalJump = () => {
    sounds.playJump();
    setCurrentRoom((prev) => {
      if (!prev) return prev;
      const me = prev.players.find((p) => p.id === playerId);
      if (me) {
        me.isJumping = true;
      }
      return { ...prev };
    });
  };

// Local player send emote
const handleSendEmote = async (emoji: string) => {
  if (!currentRoom) return;

  sounds.playEmote();

  const activePlayerId = user?.uid ?? playerId;

  const emote = {
    id: `em_${Date.now()}`,
    emoji,
    timestamp: Date.now(),
  };

  // Update lokal
  setCurrentRoom((prev) => {
    if (!prev) return prev;

    return {
      ...prev,
      players: prev.players.map((p) =>
        p.id === activePlayerId
          ? { ...p, emote }
          : p
      ),
    };
  });

  try {
    await updatePlayer(currentRoom.code, activePlayerId, {
      emote,
    });
  } catch (error) {
    console.error('Gagal mengirim emote:', error);
  }
};

// Position update from ArenaCanvas
const handlePositionUpdate = (
  x: number,
  y: number,
  facing: 'left' | 'right' | 'up' | 'down',
  currentZone: any
) => {
  if (!currentRoom) return;

  const activePlayerId = user?.uid ?? playerId;

  // Update posisi secara lokal agar gerakan tetap responsif
  setCurrentRoom((prev) => {
    if (!prev) return prev;

    return {
      ...prev,
      players: prev.players.map((p) =>
        p.id === activePlayerId
          ? { ...p, x, y, facing, currentZone }
          : p
      ),
    };
  });

  // Batasi sinkronisasi ke Firestore maksimal setiap 300 ms
  const now = Date.now();

  if (now - lastPositionSyncRef.current >= 300) {
    lastPositionSyncRef.current = now;

    updatePlayer(currentRoom.code, activePlayerId, {
      x,
      y,
      facing,
      currentZone,
    }).catch((error) => {
      console.error('Gagal menyinkronkan posisi:', error);
    });
  }
};

  // Save new custom quiz pack
  const handleSaveCustomQuiz = (pack: QuizPack) => {
    const updated = [pack, ...quizPacks];
    setQuizPacks(updated);
    const customOnly = updated.filter((p) => p.isCustom);
    localStorage.setItem('zep_custom_quizzes', JSON.stringify(customOnly));
    setShowCreator(false);
  };

  // Sound toggle
  const handleToggleMute = () => {
    const newMuted = sounds.toggleMute();
    setIsMuted(newMuted);
  };

  // Synchronize document.body.dataset.state with game state machine
  useEffect(() => {
    if (!currentRoom) {
      document.body.dataset.state = 'title';
    } else if (currentRoom.stage === 'podium') {
      document.body.dataset.state = 'gameover';
    } else {
      document.body.dataset.state = 'playing';
    }
  }, [currentRoom, currentRoom?.stage]);

  const currentPlayer = currentRoom?.players.find((p) => p.id === playerId) || {
    id: playerId,
    name: playerName,
    isHost: false,
    avatar,
    x: 0.5,
    y: 0.5,
    facing: 'down' as const,
    isJumping: false,
    jumpOffset: 0,
    currentZone: 'none' as const,
    score: 0,
    streak: 0,
  };

  // AUTH SCREEN
if (authLoading) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-100ex items-center justify-center text-white">
      Memeriksa akun...
    </div>
  );
}

if (!user) {
  return <LoginView />;
}

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-100xt-white flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* GLOBAL NAVBAR */}
      <Navbar
        userRole={userRole}
        onOpenQuizCreator={() => setShowCreator(true)}
        onOpenAvatarCustomizer={() => setShowCustomizer(true)}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        activeRoomCode={currentRoom?.code}
        onRoleChange={(role) => setServerRole(role)}
      />

      {/* MAIN SCREEN SWITCHER */}
      {!currentRoom ? (
        // LOBBY & LANDING PAGE
        <main className="flex-1 flex flex-col justify-center">
          <LobbyView
            userRole={userRole}
            quizPacks={quizPacks}
            onHostGame={handleHostGame}
            onJoinGame={handleJoinGame}
            onQuickPlay={handleQuickPlay}
            onOpenCustomizer={() => setShowCustomizer(true)}
            onOpenCreator={() => setShowCreator(true)}
            playerName={playerName}
            avatar={avatar}
          />
        </main>
      ) : (
        // ACTIVE QUIZ ARENA VIEW
        <main
              className={`flex-1 relative flex flex-col p-2 md:p-4 max-w-7xl mx-auto w-full ${
                currentRoom.mode === 'adventure' ? 'overflow-hidden' : ''
              }`}
            >
          {/* Host Bar if current player is Host */}
          {userRole === 'teacher' &&
          currentRoom.hostId === user?.uid && (
            <div className="mb-3">
              <HostControls
                room={currentRoom}
                onStartGame={handleStartGame}
                onNextQuestion={handleNextQuestion}
                onForceReveal={handleRevealAnswers}
                onRestart={handleRestart}
                onAddBots={handleAddBots}
              />
            </div>
          )}

{/* Arena Canvas Wrapper */}
<div
  className={`relative flex-1 w-full h-[580px] min-h-[460px] ${
    currentRoom.mode === 'adventure' ? 'overflow-hidden' : ''
  }`}
>
  {currentRoom.mode === 'adventure' ? (
    <AdventureCanvas
      players={currentRoom.players}
      currentPlayerId={playerId}
      onPositionUpdate={handlePositionUpdate}
      onJump={handleLocalJump}
      onNearbyChest={setNearbyChest}
      isQuestionOpen={isQuestionOpen}
      completedChests={chestCompleted}
    />
  ) : (
    <ArenaCanvas
      room={currentRoom}
      currentPlayerId={playerId}
      onPositionUpdate={handlePositionUpdate}
      onJump={handleLocalJump}
    />
  )}

  {/* Adventure Score */}
  {currentRoom.mode === 'adventure' && (
    <div className="absolute right-4 top-4 z-40 rounded-xl border border-amber-400/40 bg-gradient-to-br from-pink-50 via-white to-rose-100 px-5 py-3 text-white shadow-xl">
      <div className="text-xs font-semibold text-amber-300">
        ADVENTURE SCORE
      </div>

      <div className="text-3xl font-extrabold">
        {Math.round(adventureTotalScore)}
        <span className="text-sm text-slate-400"> / 100</span>
      </div>

      <div className="mt-1 text-xs text-slate-300">
        Peti selesai: {chestCompleted.length} / {adventureTotalChests}
      </div>
    </div>
  )}

  {/* In-game HUD */}
  <HUD
    room={currentRoom}
    currentPlayer={currentPlayer}
    onSendEmote={handleSendEmote}
    onJump={handleLocalJump}
    onLeaveRoom={() => setCurrentRoom(null)}
    isMuted={isMuted}
    onToggleMute={handleToggleMute}
  />

  {/* Adventure Question Modal */}
  {currentRoom.mode === 'adventure' &&
    activeAdventureQuestion && (
      <AdventureQuestionModal
        question={activeAdventureQuestion}
        timeLeft={timeLeft}
        setTimeLeft={setTimeLeft}
        isOpen={isQuestionOpen}
        showAnswer={showAnswer}
        onAnswer={handleAdventureAnswer}
        onClose={() => setIsQuestionOpen(false)}
        onContinue={handleContinueAdventure}
      />
    )}
</div>
```

          {/* PODIUM MODAL WHEN COMPLETED */}
          {currentRoom.stage === 'podium' && (
            <PodiumModal
              players={currentRoom.players}
              onRestart={handleRestart}
              onHome={() => setCurrentRoom(null)}
            />
          )}
        </main>
      )}

      
      {/* MODAL: AVATAR CUSTOMIZER */}
      {showCustomizer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gradient-to-br from-pink-50 via-white to-rose-100 backdrop-blur-md">
          <AvatarCustomizer
            avatar={avatar}
            name={playerName}
            onAvatarChange={handleAvatarChange}
            onNameChange={handleNameChange}
            onSave={() => setShowCustomizer(false)}
            onClose={() => setShowCustomizer(false)}
          />
        </div>
      )}

      {/* MODAL: QUIZ CREATOR */}
      {showCreator && (
        <QuizCreatorModal
          onSaveQuiz={handleSaveCustomQuiz}
          onClose={() => setShowCreator(false)}
        />
      )}
    </div>
  );
}
