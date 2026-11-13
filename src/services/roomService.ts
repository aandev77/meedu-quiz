
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { db } from "../firebase";
import { GameRoom, Player } from "../types/game";

// Membuat PIN room 6 digit
export const generateRoomCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Membuat room baru
export const createRoom = async (room: GameRoom) => {
  const code = room.code.trim();

  if (!/^\d{6}$/.test(code)) {
    throw new Error("PIN room harus terdiri dari 6 angka.");
  }

  const roomRef = doc(db, "rooms", code);
  const { players, ...roomData } = room;

  await runTransaction(db, async (transaction) => {
    const roomSnapshot = await transaction.get(roomRef);

    if (roomSnapshot.exists()) {
      throw new Error("PIN room sudah digunakan. Silakan buat PIN baru.");
    }

    transaction.set(roomRef, {
      ...roomData,
      code,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    if (players?.length) {
      players.forEach((player) => {
        const playerRef = doc(
          db,
          "rooms",
          code,
          "players",
          player.id
        );

        transaction.set(playerRef, {
          ...player,
          joinedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
    }
  });

  return code;
};

// Mengambil data room
export const getRoom = async (
  roomCode: string
): Promise<GameRoom | null> => {
  const code = roomCode.trim();
  const roomRef = doc(db, "rooms", code);
  const snapshot = await getDoc(roomRef);

  if (!snapshot.exists()) return null;

  return {
    ...snapshot.data(),
    players: [],
  } as GameRoom;
};

// Siswa bergabung ke room
export const joinRoom = async (
  roomCode: string,
  player: Player
) => {
  const code = roomCode.trim();

  if (!/^\d{6}$/.test(code)) {
    throw new Error("PIN harus terdiri dari 6 angka.");
  }

  const roomRef = doc(db, "rooms", code);
  const playerRef = doc(
    db,
    "rooms",
    code,
    "players",
    player.id
  );

  await runTransaction(db, async (transaction) => {
    const roomSnapshot = await transaction.get(roomRef);

    if (!roomSnapshot.exists()) {
      throw new Error("Room tidak ditemukan. Periksa kembali PIN.");
    }

    const room = roomSnapshot.data() as GameRoom;

    if (room.stage !== "waiting") {
      throw new Error("Permainan sudah dimulai.");
    }

    const playerSnapshot = await transaction.get(playerRef);

    if (playerSnapshot.exists()) {
      throw new Error("Kamu sudah bergabung di room ini.");
    }

    transaction.set(playerRef, {
      ...player,
      joinedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
};

// Memperbarui data room
export const updateRoom = async (
  roomCode: string,
  updates: Partial<GameRoom>
) => {
  const roomRef = doc(db, "rooms", roomCode.trim());

  await updateDoc(roomRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
};

// Memperbarui data satu pemain
export const updatePlayer = async (
  roomCode: string,
  playerId: string,
  updates: Partial<Player>
) => {
  const playerRef = doc(
    db,
    "rooms",
    roomCode.trim(),
    "players",
    playerId
  );

  await updateDoc(playerRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
};

// Mendengarkan perubahan room secara realtime
export const subscribeRoom = (
  roomCode: string,
  callback: (room: GameRoom | null) => void
) => {
  const roomRef = doc(db, "rooms", roomCode.trim());

  return onSnapshot(
    roomRef,
    (snapshot) => {
      callback(
        snapshot.exists()
          ? ({
              ...snapshot.data(),
              players: [],
            } as GameRoom)
          : null
      );
    },
    (error) => {
      console.error("Room listener error:", error);
    }
  );
};

// Mendengarkan seluruh pemain secara realtime
export const subscribePlayers = (
  roomCode: string,
  callback: (players: Player[]) => void
) => {
  const playersRef = collection(
    db,
    "rooms",
    roomCode.trim(),
    "players"
  );

  return onSnapshot(
    playersRef,
    (snapshot) => {
      const players = snapshot.docs.map(
        (playerDoc) => playerDoc.data() as Player
      );

      callback(players);
    },
    (error) => {
      console.error("Players listener error:", error);
    }
  );
};
