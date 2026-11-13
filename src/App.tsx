import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Trash2, X, AlertTriangle } from 'lucide-react';
import {
  AvatarConfig,
  GameMode,
  GameRoom,
  Player,
  QuizPack,
  QuizType,
} from './types/game';
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
import {
  PodiumModal,
  AdventureAnswerRecord,
} from './components/PodiumModal';
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
  generateRoomCode as generateUniqueRoomCode,
} from './services/roomService';

const DEFAULT_AVATAR: AvatarConfig = {
  skinColor: '#ffd39b',
  hairStyle: 'spiky',
  hairColor: '#2d3748',
  shirtColor: '#3b82f6',
  pantsColor: '#1e293b',
  accessory: 'headphones',
};

const BOT_NAMES = [
  'Siti Pintar',
  'Kevin Cerdas',
  'Rizky Juara',
  'Maya Genius',
  'Dani Hebat',
  'Aisyah Kreatif',
  'Bima Tangkas',
];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [serverRole, setServerRole] = useState<'teacher' | 'student'>('student');

  // Active Game Room
  const [currentRoom, setCurrentRoom] = useState<GameRoom | null>(null);

  // Sesi Tes Peta (lokal, tanpa Firestore)
  const [isMapTest, setIsMapTest] = useState(false);

  // Sesi lokal = Tes Peta atau Quick Play
  const [isLocalRoom, setIsLocalRoom] = useState(false);

  const lastPositionSyncRef = useRef(0);

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

  const activePlayerId = isLocalRoom ? playerId : user?.uid ?? playerId;

  // Adventure state
  const [nearbyChest, setNearbyChest] = useState<number | null>(null);
  const [activeChest, setActiveChest] = useState<number | null>(null);
  const [isQuestionOpen, setIsQuestionOpen] = useState(false);

  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [chestCompleted, setChestCompleted] = useState<number[]>([]);
  const [chestScores, setChestScores] = useState<Record<number, number>>({});
  const [adventureAnswerHistory, setAdventureAnswerHistory] = useState<AdventureAnswerRecord[]>([]);
  // Podium khusus Adventure
  const [showAdventurePodium, setShowAdventurePodium] = useState(false);

  const adventureTotalScore = Object.values(chestScores).reduce(
    (total, score) => total + score,
    0
  );

  const adventureTotalChests = Math.ceil(
    (currentRoom?.quizPack.questions.length ?? 0) / 4
  );

  // UI Modals
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [showCreator, setShowCreator] = useState(false);
  const [isMuted, setIsMuted] = useState<boolean>(() => sounds.getMuted());

  // BroadcastChannel
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Quiz Packs
  const [quizPacks, setQuizPacks] = useState<QuizPack[]>(() => {
    try {
      const saved = localStorage.getItem('zep_custom_quizzes');
      return saved ? JSON.parse(saved) as QuizPack[] : [];
    } catch (error) {
      console.error('Gagal membaca paket kuis tersimpan:', error);
      return [];
    }
  });

  const [pendingDeletePackId, setPendingDeletePackId] = useState<string | null>(null);
    // Memverifikasi role pengguna melalui server
  const verifyUserRole = async (firebaseUser: User) => {
    try {
      const token = await firebaseUser.getIdToken();

      const response = await fetch('/api/auth/profile', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Gagal memverifikasi role pengguna.');
      }

      const result = await response.json();

      setServerRole(result.user.role === 'teacher' ? 'teacher' : 'student');
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

  // Langganan data room dan pemain dari Firestore
  useEffect(() => {
    if (isLocalRoom || !currentRoom?.code) return;

    const roomCode = currentRoom.code;

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
  }, [currentRoom?.code, isLocalRoom]);

  // Memulai soal ketika pemain mendekati peti
  useEffect(() => {
    if (nearbyChest === null) return;

    if (chestCompleted.includes(nearbyChest)) return;

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

    if (activeChest === nearbyChest) {
      setIsQuestionOpen(true);
    }
  }, [nearbyChest, activeChest, chestCompleted, currentRoom]);

  // BroadcastChannel untuk sinkronisasi lintas tab
  useEffect(() => {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const channel = new BroadcastChannel('zep_quiz_metaverse_v1');
      channelRef.current = channel;

      channel.onmessage = (event) => {
        const { type, payload } = event.data;

        if (!type || !payload) return;

        if (type === 'ROOM_SYNC') {
          setCurrentRoom((prev) => {
            if (
              prev &&
              prev.code === payload.code &&
              prev.hostId !== playerId
            ) {
              return payload;
            }

            return prev;
          });
        } else if (type === 'PLAYER_MOVE') {
          setCurrentRoom((prev) => {
            if (!prev || prev.code !== payload.roomCode) return prev;

            const updated = prev.players.map((p) =>
              p.id === payload.playerId
                ? { ...p, ...payload.data }
                : p
            );

            return {
              ...prev,
              players: updated,
            };
          });
        }
      };

      return () => {
        channel.close();
        channelRef.current = null;
      };
    }
  }, [playerId]);

  // Data soal Adventure
  const adventureQuestions = currentRoom?.quizPack.questions ?? [];

  const activeAdventureQuestion =
    activeChest !== null
      ? adventureQuestions[activeChest * 4 + activeQuestionIndex]
      : undefined;

  // Menangani jawaban soal Adventure
  const handleAdventureAnswer = (answer: string | number) => {
    if (!activeAdventureQuestion || activeChest === null) return;

    const question = activeAdventureQuestion;

    const normalizeText = (value: string | number) =>
      String(value)
        .toLowerCase()
        .trim()
        .replace(/[^\p{L}\p{N}\s]/gu, '')
        .replace(/\s+/g, ' ');

    let isCorrect = false;

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

      const matchesAcceptedAnswer = acceptedAnswers.some(
        (accepted) => studentAnswer === accepted
      );

      const matchesKeywords =
        keywords.length > 0 &&
        keywords.every((keyword) => studentAnswer.includes(keyword));

      const matchesCorrectAnswer =
        correctAnswer.length > 0 &&
        studentAnswer === correctAnswer;

      isCorrect =
        studentAnswer.length > 0 &&
        (
          matchesAcceptedAnswer ||
          matchesKeywords ||
          matchesCorrectAnswer
        );
    }


    // Simpan riwayat jawaban pemain
    setAdventureAnswerHistory((previous) => [
      ...previous,
      {
        chestIndex: activeChest,
        questionIndex: activeQuestionIndex,
        question: question,
        playerAnswer: answer,
        correctAnswer: question.correctAnswer,
        isCorrect: isCorrect,
        explanation: question.explanation || '',
      },
    ]);

    if (isCorrect) {
      const totalChests = Math.ceil(adventureQuestions.length / 4);

      const pointsPerChest =
        totalChests > 0 ? 100 / totalChests : 0;

      const score = Math.max(
        0,
        pointsPerChest - wrongAttempts * 5
      );

      setChestScores((previous) => ({
        ...previous,
        [activeChest]: score,
      }));

      setChestCompleted((previous) =>
        previous.includes(activeChest)
          ? previous
          : [...previous, activeChest]
      );

      setShowAnswer(false);
      setIsQuestionOpen(false);
      setActiveChest(null);

      return;
    }

    const nextWrongAttempts = wrongAttempts + 1;

    setWrongAttempts(nextWrongAttempts);

    if (
      nextWrongAttempts >= 4 ||
      activeQuestionIndex >= 3
    ) {
      setChestScores((previous) => ({
        ...previous,
        [activeChest]: 0,
      }));

      setChestCompleted((previous) =>
        previous.includes(activeChest)
          ? previous
          : [...previous, activeChest]
      );

      setShowAnswer(true);

      return;
    }

    const nextIndex = activeQuestionIndex + 1;

    const nextQuestion =
      adventureQuestions[activeChest * 4 + nextIndex];

    if (!nextQuestion) {
      setChestScores((previous) => ({
        ...previous,
        [activeChest]: 0,
      }));

      setChestCompleted((previous) =>
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

  // Melanjutkan permainan setelah jawaban ditampilkan
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

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [currentRoom?.mode]);

  // Reset seluruh progres Adventure
  const resetAdventureProgress = () => {
    setNearbyChest(null);
    setActiveChest(null);
    setIsQuestionOpen(false);
    setActiveQuestionIndex(0);
    setWrongAttempts(0);
    setTimeLeft(0);
    setShowAnswer(false);
    setChestCompleted([]);
    setChestScores({});
    setShowAdventurePodium(false);
  };

  // Keluar dari room
  const handleLeaveRoom = () => {
    setCurrentRoom(null);
    setIsMapTest(false);
    setIsLocalRoom(false);
    resetAdventureProgress();
  };

  // Dipanggil Navbar setelah role berhasil diubah di server
  const handleRoleChange = (role: 'teacher' | 'student') => {
    setServerRole(role);
    handleLeaveRoom();
  };

  // Simpan perubahan nama pemain
  const handleNameChange = (name: string) => {
    setPlayerName(name);
    localStorage.setItem('zep_player_name', name);
  };

  // Simpan perubahan avatar
  const handleAvatarChange = (newAvatar: AvatarConfig) => {
    setAvatar(newAvatar);
    localStorage.setItem(
      'zep_player_avatar',
      JSON.stringify(newAvatar)
    );
  };

  // Membuat bot permainan
  const createBots = (
    count: number,
    currentQuizType: QuizType
  ): Player[] => {
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
          hairStyle: (
            ['spiky', 'curly', 'short', 'bob', 'ponytail', 'cap'] as const
          )[i % 6],
          hairColor: [
            '#2d3748',
            '#713f12',
            '#eab308',
            '#ef4444',
            '#3b82f6',
          ][i % 5],
          shirtColor: [
            '#ef4444',
            '#10b981',
            '#f59e0b',
            '#8b5cf6',
            '#ec4899',
          ][i % 5],
          pantsColor: '#1e293b',
          accessory: (
            ['none', 'glasses', 'headphones', 'flower'] as const
          )[i % 4],
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

  // Host room baru menggunakan PIN unik di Firestore
  const handleHostGame = async (
    pack: QuizPack,
    mode: GameMode
  ) => {
    if (!user || userRole !== 'teacher') {
      alert('Hanya guru yang dapat membuat room.');
      return;
    }

    if (!pack.questions.length) {
      alert('Kuis belum memiliki soal. Tambahkan soal terlebih dahulu.');
      return;
    }

    const newRoom: GameRoom = {
      code: '',
      hostId: user.uid,
      mode,
      quizPack: pack,
      currentQuestionIndex: 0,
      stage: 'waiting',
      timeLeft: pack.questions[0]?.timeLimit || 15,
      totalTime: pack.questions[0]?.timeLimit || 15,
      players: [],
    };

    try {
      let createdCode = '';

      for (let attempt = 0; attempt < 5; attempt++) {
        const code = generateUniqueRoomCode();

        try {
          await createRoom({
            ...newRoom,
            code,
          });

          createdCode = code;
          break;
        } catch (error) {
          if (
            error instanceof Error &&
            error.message.toLowerCase().includes('sudah digunakan')
          ) {
            continue;
          }

          throw error;
        }
      }

      if (!createdCode) {
        throw new Error(
          'Gagal mendapatkan PIN unik. Silakan coba lagi.'
        );
      }

      resetAdventureProgress();
      setIsMapTest(false);
      setIsLocalRoom(false);

      setCurrentRoom({
        ...newRoom,
        code: createdCode,
      });

      alert(`Room berhasil dibuat! PIN: ${createdCode}`);
    } catch (error) {
      console.error('Gagal membuat room:', error);

      alert(
        error instanceof Error
          ? error.message
          : 'Gagal membuat room. Periksa koneksi dan Firestore Rules.'
      );
    }
  };

  // Tes peta Adventure secara lokal
  const handleTestMap = (pack: QuizPack) => {
    if (!user || userRole !== 'teacher') {
      alert('Hanya guru yang dapat melakukan tes peta.');
      return;
    }

    if (!pack.questions.length) {
      alert('Paket kuis belum memiliki soal.');
      return;
    }

    const testPlayer: Player = {
      id: playerId,
      name: playerName || 'Guru',
      isHost: true,
      avatar,
      x: 215 / 1672,
      y: 470 / 941,
      facing: 'down',
      isJumping: false,
      jumpOffset: 0,
      currentZone: 'none',
      score: 0,
      streak: 0,
    };

    const testRoom: GameRoom = {
      code: `TEST-${Date.now()}`,
      hostId: playerId,
      mode: 'adventure',
      quizPack: pack,
      currentQuestionIndex: 0,
      stage: 'answering',
      timeLeft: 7 * 60,
      totalTime: 7 * 60,
      players: [testPlayer],
    };

    setIsMapTest(true);
    setIsLocalRoom(true);

    resetAdventureProgress();
    setCurrentRoom(testRoom);
  };

  // Quick Play / Solo auto-start
  const handleQuickPlay = useCallback(() => {
    const pack = quizPacks[0];

    if (!pack || !pack.questions.length) {
      alert(
        'Belum ada paket kuis. Buat atau impor paket kuis terlebih dahulu.'
      );
      return;
    }

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

    const bots = createBots(
      6,
      pack.questions[0]?.type || 'ox'
    );

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

    resetAdventureProgress();
    setIsMapTest(false);
    setIsLocalRoom(true);
    setCurrentRoom(room);
  }, [avatar, playerId, playerName, quizPacks]);

  // Support parameter ?autostart=1
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);

      if (params.get('autostart') === '1') {
        handleQuickPlay();
      }
    }
  }, [handleQuickPlay]);

  // Bergabung ke room menggunakan PIN
  const handleJoinGame = async (
    pin: string,
    name: string
  ) => {
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
      const room = await getRoom(pin);

      if (!room) {
        alert('Room tidak ditemukan. Periksa kembali PIN.');
        return;
      }

      await joinRoom(pin, me);

      const updatedRoom = await getRoom(pin);

      if (!updatedRoom) {
        alert('Gagal mengambil data room.');
        return;
      }

      resetAdventureProgress();
      setIsMapTest(false);
      setIsLocalRoom(false);
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

  // Menambahkan bot
  const handleAddBots = () => {
    if (!currentRoom) return;

    const currentQ =
      currentRoom.quizPack.questions[currentRoom.currentQuestionIndex];

    const newBots = createBots(
      5,
      currentQ?.type || 'ox'
    );

    const updated = {
      ...currentRoom,
      players: [...currentRoom.players, ...newBots],
    };

    setCurrentRoom(updated);

    channelRef.current?.postMessage({
      type: 'ROOM_SYNC',
      payload: updated,
    });
  };

  // Memulai permainan
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
      if (!isLocalRoom) {
        await updateRoom(currentRoom.code, {
          stage: updated.stage,
          currentQuestionIndex: updated.currentQuestionIndex,
          timeLeft: updated.timeLeft,
          totalTime: updated.totalTime,
        });
      }

      setCurrentRoom(updated);

      channelRef.current?.postMessage({
        type: 'ROOM_SYNC',
        payload: updated,
      });

      triggerBotDecisions(updated, firstQ);
    } catch (error) {
      console.error('Gagal memulai permainan:', error);
      alert('Gagal memulai permainan. Periksa koneksi Firestore.');
    }
  };

  // Bot AI decision trigger
  const triggerBotDecisions = (
    room: GameRoom,
    question: any
  ) => {
    const updatedPlayers = room.players.map((p) => {
      if (!p.isBot) return p;

      const intelligence =
        0.65 + (p.id.charCodeAt(0) % 3) * 0.1;

      const targetZone = getBotTargetZone(
        question,
        intelligence
      );

      const coords = getZoneCenterCoordinates(
        targetZone,
        question.type
      );

      const jitterX = (Math.random() - 0.5) * 0.15;
      const jitterY = (Math.random() - 0.5) * 0.15;

      return {
        ...p,
        targetX: Math.max(
          0.1,
          Math.min(0.9, coords.x + jitterX)
        ),
        targetY: Math.max(
          0.15,
          Math.min(0.85, coords.y + jitterY)
        ),
      };
    });

    setCurrentRoom((previous) =>
      previous
        ? {
            ...previous,
            players: updatedPlayers,
          }
        : previous
    );
  };

  // Countdown timer untuk mode selain Adventure
  useEffect(() => {
    if (
      !currentRoom ||
      currentRoom.mode === 'adventure' ||
      currentRoom.stage !== 'answering'
    ) {
      return;
    }

    const timer = setInterval(() => {
      setCurrentRoom((previous) => {
        if (!previous || previous.stage !== 'answering') {
          return previous;
        }

        if (previous.timeLeft <= 1) {
          sounds.playTick(true);

          return {
            ...previous,
            timeLeft: 0,
            stage: 'times_up',
          };
        }

        if (previous.timeLeft <= 5) {
          sounds.playTick(true);
        } else {
          sounds.playTick(false);
        }

        return {
          ...previous,
          timeLeft: previous.timeLeft - 1,
        };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentRoom?.stage]);

  // Saat times_up, jawaban dibuka otomatis setelah 1,2 detik
  useEffect(() => {
    if (currentRoom?.stage !== 'times_up') return;

    const isHost = currentRoom.hostId === user?.uid;

    if (!isLocalRoom && !isHost) return;

    const timer = setTimeout(() => {
      handleRevealAnswers();
    }, 1200);

    return () => clearTimeout(timer);
  }, [currentRoom?.stage]);
    // Reveal jawaban benar dan hitung skor permainan
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
      }

      eliminatedCount++;

      return {
        ...p,
        streak: 0,
        isCorrectLastRound: false,
        isEliminated: currentRoom.mode === 'survival',
      };
    });

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
      if (!isLocalRoom) {
        await Promise.all(
          updatedPlayers
            .filter((p) => !p.isBot)
            .map((p) =>
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

        await updateRoom(currentRoom.code, {
          stage: 'reveal',
          roundResults,
        });
      }

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

  // Pindah ke soal berikutnya atau akhiri permainan
  const handleNextQuestion = async () => {
    if (!currentRoom) return;

    const nextIndex = currentRoom.currentQuestionIndex + 1;

    try {
      if (nextIndex >= currentRoom.quizPack.questions.length) {
        if (!isLocalRoom) {
          await updateRoom(currentRoom.code, {
            stage: 'podium',
          });
        }

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

      const nextQ =
        currentRoom.quizPack.questions[nextIndex];

      const resetPlayers = currentRoom.players.map((p) => ({
        ...p,
        isCorrectLastRound: undefined,
        currentZone: 'none' as const,
        targetX: 0.5 + (Math.random() - 0.5) * 0.2,
        targetY: 0.5 + (Math.random() - 0.5) * 0.2,
        isJumping: false,
        jumpOffset: 0,
      }));

      const nextRoom: GameRoom = {
        ...currentRoom,
        currentQuestionIndex: nextIndex,
        stage: 'answering',
        timeLeft: nextQ.timeLimit || 15,
        totalTime: nextQ.timeLimit || 15,
        players: resetPlayers,
        roundResults: undefined,
      };

      if (!isLocalRoom) {
        await Promise.all(
          resetPlayers
            .filter((p) => !p.isBot)
            .map((p) =>
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

        await updateRoom(currentRoom.code, {
          currentQuestionIndex: nextIndex,
          stage: 'answering',
          timeLeft: nextRoom.timeLeft,
          totalTime: nextRoom.totalTime,
          roundResults: undefined,
        });
      }

      setCurrentRoom(nextRoom);

      channelRef.current?.postMessage({
        type: 'ROOM_SYNC',
        payload: nextRoom,
      });

      triggerBotDecisions(nextRoom, nextQ);
    } catch (error) {
      console.error('Gagal berpindah soal:', error);
      alert('Gagal berpindah soal. Periksa koneksi Firestore.');
    }
  };

  // FINISH Adventure: tampilkan podium setelah menyelesaikan semua peti
  const handleAdventureFinish = () => {
    if (!currentRoom || showAdventurePodium) return;

    const finalScore = adventureTotalScore;

    setCurrentRoom((previous) => {
      if (!previous) return previous;

      return {
        ...previous,
        players: previous.players.map((player) =>
          player.id === activePlayerId
            ? {
                ...player,
                score: finalScore,
              }
            : player
        ),
      };
    });

    setIsQuestionOpen(false);
    setShowAnswer(false);
    setActiveChest(null);
    setNearbyChest(null);
    setShowAdventurePodium(true);
  };

  // Restart permainan
  const handleRestart = () => {
    if (!currentRoom) return;

    if (isMapTest) {
      handleTestMap(currentRoom.quizPack);
      return;
    }

    if (isLocalRoom) {
      handleQuickPlay();
      return;
    }

    handleHostGame(currentRoom.quizPack, currentRoom.mode);
  };

  // Pemain melompat
  const handleLocalJump = () => {
    sounds.playJump();

    setCurrentRoom((previous) => {
      if (!previous) return previous;

      return {
        ...previous,
        players: previous.players.map((p) =>
          p.id === activePlayerId
            ? { ...p, isJumping: true }
            : p
        ),
      };
    });
  };

  // Mengirim emote
  const handleSendEmote = async (emoji: string) => {
    if (!currentRoom) return;

    sounds.playEmote();

    const emote = {
      id: `em_${Date.now()}`,
      emoji,
      timestamp: Date.now(),
    };

    setCurrentRoom((previous) => {
      if (!previous) return previous;

      return {
        ...previous,
        players: previous.players.map((p) =>
          p.id === activePlayerId
            ? { ...p, emote }
            : p
        ),
      };
    });

    if (isLocalRoom) return;

    try {
      await updatePlayer(currentRoom.code, activePlayerId, {
        emote,
      });
    } catch (error) {
      console.error('Gagal mengirim emote:', error);
    }
  };

  // Update posisi pemain dari Canvas
  const handlePositionUpdate = (
    x: number,
    y: number,
    facing: 'left' | 'right' | 'up' | 'down',
    currentZone: any
  ) => {
    if (!currentRoom) return;

    setCurrentRoom((previous) => {
      if (!previous) return previous;

      return {
        ...previous,
        players: previous.players.map((p) =>
          p.id === activePlayerId
            ? { ...p, x, y, facing, currentZone }
            : p
        ),
      };
    });

    if (isLocalRoom) return;

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

  // Simpan paket kuis baru
  const handleSaveCustomQuiz = (pack: QuizPack) => {
    setQuizPacks((previous) => {
      const updated = [pack, ...previous];

      localStorage.setItem(
        'zep_custom_quizzes',
        JSON.stringify(updated)
      );

      return updated;
    });

    setShowCreator(false);
  };

  // Buka dialog konfirmasi hapus paket
  const handleDeleteQuizPack = (packId: string) => {
    setPendingDeletePackId(packId);
  };

  // Konfirmasi hapus paket kuis
  const confirmDeleteQuizPack = () => {
    if (!pendingDeletePackId) return;

    setQuizPacks((previous) => {
      const updated = previous.filter(
        (pack) => pack.id !== pendingDeletePackId
      );

      localStorage.setItem(
        'zep_custom_quizzes',
        JSON.stringify(updated)
      );

      return updated;
    });

    setPendingDeletePackId(null);
  };

  // Sound toggle
  const handleToggleMute = () => {
    const newMuted = sounds.toggleMute();
    setIsMuted(newMuted);
  };

  // Sinkronisasi state permainan dengan body
  useEffect(() => {
    if (!currentRoom) {
      document.body.dataset.state = 'title';
    } else if (
      currentRoom.stage === 'podium' ||
      showAdventurePodium
    ) {
      document.body.dataset.state = 'gameover';
    } else {
      document.body.dataset.state = 'playing';
    }
  }, [currentRoom, currentRoom?.stage, showAdventurePodium]);

  const currentPlayer =
    currentRoom?.players.find(
      (p) => p.id === activePlayerId
    ) || {
      id: activePlayerId,
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
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-100 flex items-center justify-center text-slate-700">
        Memeriksa akun...
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">

      {/* GLOBAL NAVBAR */}
      <Navbar
        userRole={userRole}
        userEmail={user.email ?? undefined}
        onRoleChange={handleRoleChange}
        onOpenQuizCreator={() => setShowCreator(true)}
        onOpenAvatarCustomizer={() => setShowCustomizer(true)}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        activeRoomCode={currentRoom?.code}
      />

      {/* MAIN SCREEN SWITCHER */}
      {!currentRoom ? (
        <main className="flex-1 flex flex-col justify-center">
          <LobbyView
            userRole={userRole}
            quizPacks={quizPacks}
            onHostGame={handleHostGame}
            onJoinGame={handleJoinGame}
            onQuickPlay={handleQuickPlay}
            onOpenCustomizer={() => setShowCustomizer(true)}
            onOpenCreator={() => setShowCreator(true)}
            onTestMap={handleTestMap}
            onDeleteQuizPack={handleDeleteQuizPack}
            playerName={playerName}
            avatar={avatar}
          />
        </main>
      ) : (
        <main
          className={`flex-1 relative flex flex-col p-2 md:p-4 max-w-7xl mx-auto w-full ${
            currentRoom.mode === 'adventure'
              ? 'overflow-hidden'
              : ''
          }`}
        >
          {/* Host Bar */}
          {!isMapTest &&
            userRole === 'teacher' &&
            currentRoom.hostId === activePlayerId && (
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
              currentRoom.mode === 'adventure'
                ? 'overflow-hidden'
                : ''
            }`}
          >
            {currentRoom.mode === 'adventure' ? (
              <AdventureCanvas
                players={currentRoom.players}
                currentPlayerId={activePlayerId}
                onPositionUpdate={handlePositionUpdate}
                onJump={handleLocalJump}
                onNearbyChest={setNearbyChest}
                onReachFinish={handleAdventureFinish}
                isQuestionOpen={isQuestionOpen}
                completedChests={chestCompleted}
                chestCount={adventureTotalChests}
              />
            ) : (
              <ArenaCanvas
                room={currentRoom}
                currentPlayerId={activePlayerId}
                onPositionUpdate={handlePositionUpdate}
                onJump={handleLocalJump}
              />
            )}

            {/* Adventure Score */}
            {currentRoom.mode === 'adventure' && (
              <div className="absolute right-2 top-2 sm:right-4 sm:top-4 z-40 w-[clamp(104px,30%,176px)] max-w-[calc(100%-12px)] rounded-xl border border-amber-400/40 bg-gradient-to-br from-pink-50 via-white to-rose-100 px-2 py-1.5 sm:px-4 sm:py-3 text-slate-700 shadow-xl">
                <div className="text-[8px] sm:text-xs font-bold leading-tight text-amber-500 break-words">
                  ADVENTURE SCORE
                </div>

                <div className="mt-0.5 text-lg sm:text-3xl font-extrabold leading-tight tabular-nums">
                  {Math.round(adventureTotalScore)}
                  <span className="text-[9px] sm:text-sm text-slate-500">
                    {' '} / 100
                  </span>
                </div>

                <div className="mt-1 text-[8px] sm:text-xs leading-tight text-slate-500 break-words">
                  Peti: {chestCompleted.length}/{adventureTotalChests}
                </div>
              </div>
            )}

            {/* In-game HUD */}
            <HUD
              room={currentRoom}
              currentPlayer={currentPlayer}
              onLeaveRoom={handleLeaveRoom}
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

          {/* PODIUM MODAL */}
          {(currentRoom.stage === 'podium' ||
            showAdventurePodium) && (
            <PodiumModal
              players={currentRoom.players}
              onHome={handleLeaveRoom}
              adventureReview={
                currentRoom.mode === 'adventure'
                  ? adventureAnswerHistory
                  : undefined
              }
            />
          )}
        </main>
      )}

      {/* MODAL AVATAR CUSTOMIZER */}
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

      {/* MODAL KONFIRMASI HAPUS PAKET KUIS */}
      {pendingDeletePackId && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setPendingDeletePackId(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-quiz-title"
            className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl border border-rose-100 animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex items-start gap-3 p-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                <AlertTriangle className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <h2
                  id="delete-quiz-title"
                  className="text-base font-bold text-slate-800"
                >
                  Hapus paket kuis?
                </h2>

                <p className="mt-1 text-sm leading-relaxed text-slate-500">
                  Paket kuis ini akan dihapus dari daftar.
                  Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setPendingDeletePackId(null)}
                aria-label="Tutup dialog"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-4">
              <button
                type="button"
                onClick={() => setPendingDeletePackId(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={confirmDeleteQuizPack}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-rose-700 active:scale-[0.98] transition"
              >
                <Trash2 className="h-4 w-4" />
                Ya, hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL QUIZ CREATOR */}
      {showCreator && (
        <QuizCreatorModal
          onSaveQuiz={handleSaveCustomQuiz}
          onClose={() => setShowCreator(false)}
        />
      )}
    </div>
  );
}