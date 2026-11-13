import React, { useEffect, useRef } from 'react';
import { Player } from '../types/game';
import { drawAvatar } from '../game/avatarRenderer';
import adventureMapUrl from '../assets/adventure-map.jpg';

interface AdventureCanvasProps {
  players: Player[];
  currentPlayerId: string;
  onPositionUpdate: (
    x: number,
    y: number,
    facing: 'left' | 'right' | 'up' | 'down',
    currentZone: any
  ) => void;
  onJump: () => void;
  onNearbyChest: (index: number | null) => void;
  isQuestionOpen: boolean;
  completedChests: number[];
  chestCount: number;
  /** Opsional: dipanggil sekali saat semua peti selesai dan pemain sampai di bendera finis. */
  onReachFinish?: () => void;
}

/* ------------------------------------------------------------------ */
/*  Data peta (mengikuti gambar adventure-map.jpg, ukuran 1672 x 941)  */
/* ------------------------------------------------------------------ */
const WORLD = { width: 1672, height: 941 };

// Titik awal pemain (di Area Tunggu) dan bendera finis.
const START = { x: 215, y: 470 };
const FINISH = { x: 1568, y: 748 };

// Area tunggu (boleh dijelajahi) + jalur tanah (lebar jalan ±40px).
const WAIT_AREA = { x1: 64, y1: 322, x2: 358, y2: 530 };
const WALK_RADIUS = 50;

// Ukuran avatar & jarak titik pusat badan ke kaki (sesuaikan bila avatar terlihat terlalu besar/kecil).
const AVATAR_SCALE = 1.5;
const FOOT_OFFSET = 18;

const PATH: { x: number; y: number }[] = [
  { x: 330, y: 490 },
  { x: 344, y: 490 },
  { x: 358, y: 490 },
  { x: 372, y: 490 },
  { x: 386, y: 490 },
  { x: 400, y: 490 },
  { x: 414, y: 490 },
  { x: 428, y: 490 },
  { x: 442, y: 490 },
  { x: 456, y: 490 },
  { x: 470, y: 489 },
  { x: 484, y: 489 },
  { x: 498, y: 488 },
  { x: 512, y: 487 },
  { x: 526, y: 486 },
  { x: 540, y: 484 },
  { x: 554, y: 481 },
  { x: 567, y: 478 },
  { x: 580, y: 473 },
  { x: 593, y: 467 },
  { x: 605, y: 460 },
  { x: 616, y: 451 },
  { x: 626, y: 442 },
  { x: 636, y: 432 },
  { x: 646, y: 422 },
  { x: 656, y: 412 },
  { x: 667, y: 403 },
  { x: 678, y: 394 },
  { x: 690, y: 387 },
  { x: 702, y: 381 },
  { x: 715, y: 376 },
  { x: 728, y: 371 },
  { x: 742, y: 367 },
  { x: 755, y: 363 },
  { x: 769, y: 359 },
  { x: 782, y: 356 },
  { x: 796, y: 353 },
  { x: 810, y: 350 },
  { x: 823, y: 348 },
  { x: 837, y: 346 },
  { x: 851, y: 345 },
  { x: 865, y: 344 },
  { x: 879, y: 345 },
  { x: 893, y: 346 },
  { x: 907, y: 349 },
  { x: 920, y: 353 },
  { x: 933, y: 358 },
  { x: 946, y: 364 },
  { x: 958, y: 371 },
  { x: 970, y: 379 },
  { x: 981, y: 388 },
  { x: 991, y: 398 },
  { x: 999, y: 409 },
  { x: 1004, y: 422 },
  { x: 1004, y: 436 },
  { x: 1000, y: 449 },
  { x: 995, y: 462 },
  { x: 989, y: 475 },
  { x: 982, y: 487 },
  { x: 975, y: 499 },
  { x: 967, y: 510 },
  { x: 957, y: 520 },
  { x: 945, y: 528 },
  { x: 934, y: 536 },
  { x: 923, y: 545 },
  { x: 920, y: 557 },
  { x: 932, y: 565 },
  { x: 945, y: 569 },
  { x: 959, y: 573 },
  { x: 973, y: 576 },
  { x: 986, y: 578 },
  { x: 1000, y: 580 },
  { x: 1014, y: 581 },
  { x: 1028, y: 581 },
  { x: 1042, y: 580 },
  { x: 1056, y: 579 },
  { x: 1070, y: 576 },
  { x: 1083, y: 571 },
  { x: 1096, y: 566 },
  { x: 1109, y: 560 },
  { x: 1121, y: 554 },
  { x: 1133, y: 547 },
  { x: 1146, y: 540 },
  { x: 1158, y: 533 },
  { x: 1170, y: 527 },
  { x: 1183, y: 520 },
  { x: 1195, y: 514 },
  { x: 1208, y: 509 },
  { x: 1221, y: 504 },
  { x: 1235, y: 501 },
  { x: 1249, y: 500 },
  { x: 1263, y: 500 },
  { x: 1277, y: 501 },
  { x: 1291, y: 503 },
  { x: 1304, y: 506 },
  { x: 1318, y: 510 },
  { x: 1331, y: 515 },
  { x: 1344, y: 521 },
  { x: 1356, y: 527 },
  { x: 1367, y: 535 },
  { x: 1378, y: 545 },
  { x: 1384, y: 557 },
  { x: 1384, y: 571 },
  { x: 1380, y: 585 },
  { x: 1374, y: 598 },
  { x: 1369, y: 610 },
  { x: 1363, y: 623 },
  { x: 1359, y: 637 },
  { x: 1357, y: 650 },
  { x: 1361, y: 664 },
  { x: 1368, y: 676 },
  { x: 1376, y: 687 },
  { x: 1386, y: 697 },
  { x: 1397, y: 706 },
  { x: 1408, y: 715 },
  { x: 1420, y: 722 },
  { x: 1432, y: 729 },
  { x: 1444, y: 735 },
  { x: 1457, y: 741 },
  { x: 1471, y: 744 },
  { x: 1485, y: 746 },
  { x: 1499, y: 747 },
  { x: 1513, y: 748 },
  { x: 1527, y: 748 },
  { x: 1541, y: 748 },
  { x: 1555, y: 748 },
  { x: 1568, y: 748 },
];

/* ------------------------------------------------------------------ */
/*  Util                                                               */
/* ------------------------------------------------------------------ */

// Membuat posisi peti sesuai jumlah soal utama (merata sepanjang jalur).
const getChestPositions = (count: number) => {
  const total = Math.max(0, Math.floor(count));
  if (total === 0) return [];

  const segments: {
    a: { x: number; y: number };
    b: { x: number; y: number };
    length: number;
    start: number;
  }[] = [];
  let totalLength = 0;

  for (let i = 0; i < PATH.length - 1; i++) {
    const a = PATH[i];
    const b = PATH[i + 1];
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    segments.push({ a, b, length, start: totalLength });
    totalLength += length;
  }

  return Array.from({ length: total }, (_, index) => {
    const distance = totalLength * ((index + 1) / (total + 1));
    const segment =
      segments.find(item => distance <= item.start + item.length) ??
      segments[segments.length - 1];
    const progress = (distance - segment.start) / segment.length;

    return {
      x: segment.a.x + (segment.b.x - segment.a.x) * progress,
      y: segment.a.y + (segment.b.y - segment.a.y) * progress,
    };
  });
};

const distanceToSegment = (
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
) => {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) return Math.hypot(px - ax, py - ay);

  const t = Math.max(
    0,
    Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared)
  );

  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
};

const isOnPath = (x: number, y: number, allowedDistance = WALK_RADIUS) => {
  for (let i = 0; i < PATH.length - 1; i++) {
    const a = PATH[i];
    const b = PATH[i + 1];
    if (distanceToSegment(x, y, a.x, a.y, b.x, b.y) <= allowedDistance) {
      return true;
    }
  }
  return false;
};

const isWalkable = (x: number, y: number) =>
  (x > WAIT_AREA.x1 && x < WAIT_AREA.x2 && y > WAIT_AREA.y1 && y < WAIT_AREA.y2) ||
  isOnPath(x, y);

const drawStar = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outer: number,
  inner: number
) => {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
};

/* ------------------------------------------------------------------ */
/*  Air bergerak (sungai mengalir + riak di kolam)                     */
/* ------------------------------------------------------------------ */
let riverPath: Path2D | null = null;

const drawWater = (ctx: CanvasRenderingContext2D, t: number) => {
  // Garis tengah sungai pada gambar peta (koordinat dunia 1672 x 941)
  riverPath =
    riverPath ??
    new Path2D('M-40,598 C140,590 300,640 470,715 C650,795 800,890 960,990');

  // ---- Sungai: jangan menimpa jembatan ----
  ctx.save();
  const outside = new Path2D();
  outside.rect(0, 0, WORLD.width, WORLD.height);
  outside.rect(150, 538, 108, 170);
  ctx.clip(outside, 'evenodd');

  ctx.lineCap = 'round';

  const layers = [
    { dy: 0, width: 54, dash: [140, 220], speed: 26, alpha: 0.1 },
    { dy: -26, width: 3, dash: [22, 70], speed: 55, alpha: 0.55 },
    { dy: -8, width: 2, dash: [10, 52], speed: 38, alpha: 0.4 },
    { dy: 0, width: 4, dash: [28, 90], speed: 80, alpha: 0.8 },
    { dy: 24, width: 3, dash: [18, 60], speed: 65, alpha: 0.5 },
  ];

  layers.forEach(layer => {
    ctx.save();
    ctx.translate(0, layer.dy);
    ctx.setLineDash(layer.dash);
    ctx.lineDashOffset = -t * layer.speed; // bergerak searah aliran (kiri → kanan bawah)
    ctx.strokeStyle = `rgba(232, 247, 255, ${layer.alpha})`;
    ctx.lineWidth = layer.width;
    ctx.stroke(riverPath as Path2D);
    ctx.restore();
  });

  ctx.restore();

  // ---- Kolam: riak melebar + kilau ----
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(760, 226, 150, 64, 0, 0, Math.PI * 2);
  ctx.clip();

  [
    { x: 835, y: 222, offset: 0 },
    { x: 770, y: 200, offset: 0.35 },
    { x: 860, y: 250, offset: 0.7 },
  ].forEach(ring => {
    const phase = (t * 0.3 + ring.offset) % 1;
    const rx = 8 + phase * 58;

    ctx.strokeStyle = `rgba(232, 247, 255, ${(1 - phase) * 0.6})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(ring.x, ring.y, rx, rx * 0.4, 0, 0, Math.PI * 2);
    ctx.stroke();
  });

  [
    [700, 215], [735, 245], [800, 205], [850, 238], [790, 262], [880, 215],
  ].forEach(([sx, sy], i) => {
    const a = Math.max(0, Math.sin(t * 2.2 + i * 1.7));
    ctx.fillStyle = `rgba(255, 255, 255, ${a * 0.8})`;
    ctx.beginPath();
    ctx.ellipse(sx, sy, 5 * a + 1, 1.6, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.restore();
};

/* ------------------------------------------------------------------ */
/*  Peti harta karun (digambar langsung di canvas)                     */
/*  age: -1 = tertutup, >= 0 = detik sejak dibuka (Infinity = sudah    */
/*  lama terbuka / tanpa animasi)                                      */
/* ------------------------------------------------------------------ */
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

const drawChest = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  index: number,
  age: number,
  near: boolean,
  t: number
) => {
  const done = age >= 0;
  const open = done ? clamp01(age / 0.45) : 0; // 0 = tertutup, 1 = terbuka penuh
  const easeOpen = 1 - Math.pow(1 - open, 3);

  ctx.save();
  ctx.translate(x, y);
  ctx.lineJoin = 'round';

  // Alas batu
  ctx.fillStyle = '#7f8594';
  ctx.beginPath();
  ctx.ellipse(0, 38, 52, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#d3d7e0';
  ctx.strokeStyle = near && !done ? '#ffd54a' : '#9aa0af';
  ctx.lineWidth = near && !done ? 4 : 2;
  ctx.beginPath();
  ctx.ellipse(0, 32, 52, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#bfc4d0';
  ctx.beginPath();
  ctx.ellipse(0, 30, 38, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Peti: melayang pelan bila belum dibuka, memantul saat dibuka
  ctx.save();
  ctx.translate(0, done ? 0 : Math.sin(t * 3.5 + index) * 3);

  if (done && age < 0.4) {
    const squash = Math.sin(clamp01(age / 0.35) * Math.PI) * 0.12;
    ctx.translate(0, 30);
    ctx.scale(1 + squash, 1 - squash);
    ctx.translate(0, -30);
  }

  if (!done) {
    const alpha = 0.5 + 0.25 * Math.sin(t * 6 + index);
    const glow = ctx.createRadialGradient(0, -30, 2, 0, -30, 56);
    glow.addColorStop(0, `rgba(255, 226, 120, ${alpha})`);
    glow.addColorStop(1, 'rgba(255, 150, 0, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(-64, -96, 128, 128);
  } else if (age < 1.2) {
    // Kilatan cahaya saat terbuka
    const flash = (1 - clamp01(age / 1.2)) * 0.9;
    const glow = ctx.createRadialGradient(0, -34, 2, 0, -34, 100);
    glow.addColorStop(0, `rgba(255, 244, 170, ${flash})`);
    glow.addColorStop(1, 'rgba(255, 190, 40, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(-110, -140, 220, 220);
  }

  ctx.strokeStyle = '#4a2808';
  ctx.lineWidth = 3;

  // Badan
  ctx.fillStyle = '#b0651f';
  ctx.beginPath();
  ctx.rect(-30, -6, 60, 36);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#8a4c12';
  ctx.fillRect(-30, 8, 60, 4);

  ctx.fillStyle = '#f0b73a';
  ctx.lineWidth = 2;
  [-30, 21].forEach(sx => {
    ctx.beginPath();
    ctx.rect(sx, -6, 9, 36);
    ctx.fill();
    ctx.stroke();
  });

  // Isi peti + tutup terbuka (muncul bertahap)
  if (open > 0) {
    ctx.save();
    ctx.globalAlpha = easeOpen;

    ctx.fillStyle = '#ffe27a';
    ctx.beginPath();
    ctx.ellipse(0, -6, 26, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#9c5518';
    ctx.strokeStyle = '#4a2808';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-30, -8);
    ctx.lineTo(-25, -42);
    ctx.ellipse(0, -42, 25, 9, 0, Math.PI, Math.PI * 2);
    ctx.lineTo(30, -8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Bintang melambung lalu melayang
    const pop = age < 0.9 ? Math.sin(clamp01(age / 0.9) * Math.PI) * 26 : 0;
    const starScale = 0.4 + 0.6 * easeOpen;
    ctx.fillStyle = '#ffc400';
    ctx.strokeStyle = '#c78a00';
    ctx.lineWidth = 2;
    drawStar(
      ctx,
      0,
      -52 - pop + Math.sin(t * 4 + index) * 2,
      15 * starScale,
      6.5 * starScale
    );
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  // Tutup tertutup: terlempar ke atas lalu menghilang saat dibuka
  if (open < 1) {
    ctx.save();
    ctx.globalAlpha = 1 - easeOpen;
    ctx.translate(0, -easeOpen * 34);
    ctx.translate(0, -12);
    ctx.rotate(-easeOpen * 0.45);
    ctx.translate(0, 12);

    ctx.strokeStyle = '#4a2808';
    ctx.lineWidth = 3;
    ctx.fillStyle = '#c9772a';
    ctx.beginPath();
    ctx.moveTo(-30, -6);
    ctx.lineTo(-30, -18);
    ctx.ellipse(0, -18, 30, 17, 0, Math.PI, Math.PI * 2);
    ctx.lineTo(30, -6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f0b73a';
    ctx.lineWidth = 2;
    [-30, 21].forEach(sx => {
      ctx.beginPath();
      ctx.rect(sx, -20, 9, 14);
      ctx.fill();
      ctx.stroke();
    });

    ctx.lineWidth = 3;
    ctx.fillStyle = '#ffd54a';
    ctx.beginPath();
    ctx.rect(-8, -14, 16, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#4a2808';
    ctx.beginPath();
    ctx.arc(0, -8, 2.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  ctx.restore();

  // Kerlip bintang kecil mengitari peti yang belum dibuka
  if (!done) {
    for (let k = 0; k < 3; k++) {
      const a = t * 1.2 + k * 2.1 + index;
      const alpha = 0.5 + 0.5 * Math.sin(t * 4 + k * 2 + index);
      ctx.fillStyle = `rgba(255, 240, 150, ${alpha})`;
      drawStar(ctx, Math.cos(a) * 38, -26 + Math.sin(a) * 20, 4.5, 2);
      ctx.fill();
    }
  }

  // Bintang memancar + teks saat dibuka
  if (done && age < 1.3) {
    const q = clamp01(age / 0.9);
    const out = 1 - Math.pow(1 - q, 2);

    if (age < 0.9) {
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2 + 0.3;
        const dist = 22 + out * 80;
        ctx.fillStyle = `rgba(${k % 2 ? '255, 213, 74' : '255, 246, 176'}, ${1 - q})`;
        drawStar(
          ctx,
          Math.cos(a) * dist,
          -30 + Math.sin(a) * dist * 0.75,
          8 * (1 - q * 0.5),
          3.4 * (1 - q * 0.5)
        );
        ctx.fill();
      }
    }

    const q2 = clamp01(age / 1.3);
    ctx.save();
    ctx.globalAlpha = 1 - q2 * q2;
    ctx.font = '900 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#7a4a00';
    ctx.fillStyle = '#ffe27a';
    const ty = -78 - q2 * 46;
    ctx.strokeText('Terbuka!', 0, ty);
    ctx.fillText('Terbuka!', 0, ty);
    ctx.restore();
  }

  // Panah penunjuk saat pemain mendekat
  if (near && !done) {
    const by = -84 + Math.sin(t * 8) * 4;
    ctx.fillStyle = '#ffd54a';
    ctx.strokeStyle = '#7a4a00';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-9, by - 9);
    ctx.lineTo(9, by - 9);
    ctx.lineTo(0, by + 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Lencana nomor
  ctx.fillStyle = done ? '#16c172' : '#e91e78';
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(38, -18, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(done ? '✓' : String(index + 1), 38, -17);

  ctx.restore();
};

/* ------------------------------------------------------------------ */
/*  Komponen                                                           */
/* ------------------------------------------------------------------ */
export const AdventureCanvas: React.FC<AdventureCanvasProps> = ({
  players,
  currentPlayerId,
  onPositionUpdate,
  onJump,
  onNearbyChest,
  isQuestionOpen,
  completedChests,
  chestCount,
  onReachFinish,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const questionOpenRef = useRef(isQuestionOpen);
  const playerRef = useRef<Player | null>(null);
  const playersRef = useRef(players);
  const keys = useRef<Record<string, boolean>>({});
  const camera = useRef({ x: 0, y: 0 });
  const scaleRef = useRef(1);
  const walkCycle = useRef(0);

  const onPositionUpdateRef = useRef(onPositionUpdate);
  const onNearbyChestRef = useRef(onNearbyChest);
  const onReachFinishRef = useRef(onReachFinish);
  const nearbyChestRef = useRef<number | null>(null);
  const completedChestsRef = useRef(completedChests);
  const finishFiredRef = useRef(false);
  const openedAtRef = useRef<Record<number, number>>({});
  const firstChestSync = useRef(true);

  useEffect(() => {
    questionOpenRef.current = isQuestionOpen;
  }, [isQuestionOpen]);

  useEffect(() => {
    completedChestsRef.current = completedChests;
    if (completedChests.length < chestCount) finishFiredRef.current = false;

    // Catat kapan tiap peti dibuka (untuk animasi). Peti yang sudah selesai sejak awal tanpa animasi.
    const opened = openedAtRef.current;
    completedChests.forEach(index => {
      if (opened[index] === undefined) {
        opened[index] = firstChestSync.current ? -Infinity : performance.now();
      }
    });
    Object.keys(opened).forEach(key => {
      if (!completedChests.includes(Number(key))) delete opened[Number(key)];
    });
    firstChestSync.current = false;
  }, [completedChests, chestCount]);

  useEffect(() => {
    onNearbyChestRef.current = onNearbyChest;
  }, [onNearbyChest]);

  useEffect(() => {
    onPositionUpdateRef.current = onPositionUpdate;
  }, [onPositionUpdate]);

  useEffect(() => {
    onReachFinishRef.current = onReachFinish;
  }, [onReachFinish]);

  useEffect(() => {
    playersRef.current = players;
    playerRef.current =
      players.find(player => player.id === currentPlayerId) ?? null;
  }, [players, currentPlayerId]);

  // Keyboard
  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((event.target as HTMLElement).tagName)) {
        return;
      }

      const key = event.key.toLowerCase();
      const movementKeys = [
        'arrowup', 'arrowdown', 'arrowleft', 'arrowright',
        'w', 'a', 's', 'd', ' ',
      ];

      if (movementKeys.includes(key)) event.preventDefault();
      if (questionOpenRef.current) return;

      keys.current[key] = true;

      if (event.code === 'Space') onJump();
    };

    const up = (event: KeyboardEvent) => {
      keys.current[event.key.toLowerCase()] = false;
    };

    const clear = () => {
      keys.current = {};
    };

    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', clear);

    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', clear);
    };
  }, [onJump]);

  // Render & game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;

    if (!canvas || !parent) return;

    const CHESTS = getChestPositions(chestCount);

    const background = new Image();
    background.src = adventureMapUrl;

    let frame = 0;
    let previous = performance.now();

    const resize = () => {
      const rect = parent.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, rect.width * dpr);
      canvas.height = Math.max(1, rect.height * dpr);
    };

    resize();

    const observer = new ResizeObserver(resize);
    observer.observe(parent);

    const draw = (now: number) => {
      const dt = Math.min((now - previous) / 1000, 0.05);
      previous = now;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const viewWidth = canvas.width / dpr;
      const viewHeight = canvas.height / dpr;

      // Zoom sedikit agar kamera memiliki ruang mengikuti karakter pada sumbu X dan Y.
      // Map boleh terpotong; fokus utama adalah karakter tetap terlihat.
      const ZOOM = 1.3;
      const baseScale = Math.max(
        viewWidth / WORLD.width,
        viewHeight / WORLD.height
      );
      const scale = baseScale * ZOOM;
      scaleRef.current = scale;

      const visibleW = viewWidth / scale;
      const visibleH = viewHeight / scale;

      const me = playerRef.current;

      if (me) {
        // Posisi lama (dari dunia sebelumnya) / di luar jalur → pindahkan ke titik awal.
        let worldX = me.x * WORLD.width;
        let worldY = me.y * WORLD.height;

        if (!isWalkable(worldX, worldY)) {
          worldX = START.x;
          worldY = START.y;
          me.x = worldX / WORLD.width;
          me.y = worldY / WORLD.height;
          onPositionUpdateRef.current(me.x, me.y, me.facing ?? 'down', 'none');
        }

        // Deteksi peti terdekat
        let nearestChest: number | null = null;
        let nearestDistance = Infinity;

        CHESTS.forEach((chest, index) => {
          if (completedChestsRef.current.includes(index)) return;

          const distance = Math.hypot(worldX - chest.x, worldY - (chest.y + 28));

          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestChest = index;
          }
        });

        const detectedChest = nearestDistance <= 90 ? nearestChest : null;

        if (nearbyChestRef.current !== detectedChest) {
          nearbyChestRef.current = detectedChest;
          onNearbyChestRef.current(detectedChest);
        }

        // Input gerak
        let dx = 0;
        let dy = 0;
        let usingKeys = false;

        if (questionOpenRef.current) {
          keys.current = {};
          me.targetX = undefined;
          me.targetY = undefined;
        } else {
          if (keys.current.a || keys.current.arrowleft) dx--;
          if (keys.current.d || keys.current.arrowright) dx++;
          if (keys.current.w || keys.current.arrowup) dy--;
          if (keys.current.s || keys.current.arrowdown) dy++;

          usingKeys = dx !== 0 || dy !== 0;

          if (!usingKeys && me.targetX !== undefined && me.targetY !== undefined) {
            dx = me.targetX * WORLD.width - worldX;
            dy = me.targetY * WORLD.height - worldY;

            if (Math.hypot(dx, dy) < 6) {
              me.targetX = undefined;
              me.targetY = undefined;
              dx = 0;
              dy = 0;
            }
          }
        }

        if (dx !== 0 || dy !== 0) {
          const length = Math.hypot(dx, dy);
          const speed = 235;
          const movement = Math.min(speed * dt, length);
          const stepX = (dx / length) * movement;
          const stepY = (dy / length) * movement;

          let nextX = worldX;
          let nextY = worldY;
          let moved = false;

          if (isWalkable(worldX + stepX, worldY + stepY)) {
            nextX = worldX + stepX;
            nextY = worldY + stepY;
            moved = true;
          } else if (usingKeys) {
            // Menyusuri tepi jalan (geser per sumbu)
            if (stepX !== 0 && isWalkable(worldX + stepX, worldY)) {
              nextX = worldX + stepX;
              moved = true;
            } else if (stepY !== 0 && isWalkable(worldX, worldY + stepY)) {
              nextY = worldY + stepY;
              moved = true;
            }
          }

          if (moved) {
            me.x = nextX / WORLD.width;
            me.y = nextY / WORLD.height;
            worldX = nextX;
            worldY = nextY;

            if (dx < 0) me.facing = 'left';
            if (dx > 0) me.facing = 'right';
            if (Math.abs(dy) > Math.abs(dx) * 1.2) {
              me.facing = dy < 0 ? 'up' : 'down';
            }

            walkCycle.current += dt * 12;

            onPositionUpdateRef.current(me.x, me.y, me.facing, 'none');
          } else if (me.targetX !== undefined) {
            me.targetX = undefined;
            me.targetY = undefined;
          }
        }

        // Finis: semua peti selesai lalu menyentuh bendera
        if (
          !finishFiredRef.current &&
          completedChestsRef.current.length >= chestCount &&
          Math.hypot(worldX - FINISH.x, (worldY - FINISH.y) * 1.3) < 90
        ) {
          finishFiredRef.current = true;
          onReachFinishRef.current?.();
        }

        // Lompat
        if (!questionOpenRef.current && me.isJumping) {
          me.jumpOffset = (me.jumpOffset || 0) + 70 * dt;
          if (me.jumpOffset > 18) me.isJumping = false;
        } else if (me.jumpOffset > 0) {
          me.jumpOffset = Math.max(0, me.jumpOffset - 85 * dt);
        }

        // Kamera
        camera.current.x = Math.max(
          0,
          Math.min(WORLD.width - visibleW, worldX - visibleW / 2)
        );
        camera.current.y = Math.max(
          0,
          Math.min(WORLD.height - visibleH, worldY - visibleH / 2)
        );
      }

      // ---------- Gambar ----------
      ctx.setTransform(
        dpr * scale,
        0,
        0,
        dpr * scale,
        -camera.current.x * dpr * scale,
        -camera.current.y * dpr * scale
      );

      ctx.fillStyle = '#5aa83a';
      ctx.fillRect(0, 0, WORLD.width, WORLD.height);

      if (background.complete && background.naturalWidth > 0) {
        ctx.drawImage(background, 0, 0, WORLD.width, WORLD.height);
      }

      drawWater(ctx, now / 1000);

      // Peti + pemain diurutkan berdasarkan Y supaya kedalamannya benar
      const entities: { y: number; render: () => void }[] = [];
      const seconds = now / 1000;

      CHESTS.forEach((chest, index) => {
        const openedAt = openedAtRef.current[index];
        const age =
          openedAt === undefined
            ? -1
            : openedAt === -Infinity
            ? Infinity
            : (now - openedAt) / 1000;

        entities.push({
          y: chest.y + 32,
          render: () =>
            drawChest(
              ctx,
              chest.x,
              chest.y,
              index,
              age,
              nearbyChestRef.current === index,
              seconds
            ),
        });
      });

      playersRef.current.forEach((player, order) => {
        let px = player.x * WORLD.width;
        let py = player.y * WORLD.height;

        // Pemain lain yang posisinya masih di koordinat lama → tampilkan di area tunggu
        if (player.id !== currentPlayerId && !isWalkable(px, py)) {
          px = START.x + ((order % 4) - 1.5) * 44;
          py = START.y + Math.floor(order / 4) * 34 - 10;
        }

        const isCurrent = player.id === currentPlayerId;

        entities.push({
          y: py,
          render: () => {
            ctx.fillStyle = 'rgba(0,0,0,0.25)';
            ctx.beginPath();
            ctx.ellipse(px, py + 2, 17, 6, 0, 0, Math.PI * 2);
            ctx.fill();

            if (isCurrent) {
              ctx.save();
              ctx.strokeStyle = '#e91e78';
              ctx.lineWidth = 2.5;
              ctx.setLineDash([5, 4]);
              ctx.beginPath();
              ctx.ellipse(px, py + 2, 24, 9, 0, 0, Math.PI * 2);
              ctx.stroke();
              ctx.restore();
            }

            drawAvatar(
              ctx,
              player,
              px,
              py - FOOT_OFFSET * AVATAR_SCALE,
              AVATAR_SCALE,
              isCurrent ? walkCycle.current : (player.id.charCodeAt(0) % 10) + seconds * 2
            );
          },
        });
      });

      entities.sort((a, b) => a.y - b.y).forEach(entity => entity.render());

      frame = requestAnimationFrame(draw);
    };

    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [chestCount, currentPlayerId]);

  // Klik untuk berjalan ke titik tujuan
  const handleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const me = playerRef.current;

    if (!canvas || !me) return;
    if (questionOpenRef.current) return;

    const rect = canvas.getBoundingClientRect();
    const scale = scaleRef.current || 1;

    const worldX = (event.clientX - rect.left) / scale + camera.current.x;
    const worldY = (event.clientY - rect.top) / scale + camera.current.y;

    me.targetX = worldX / WORLD.width;
    me.targetY = worldY / WORLD.height;
  };

  // Tombol arah (layar sentuh / mouse)
  const press = (key: string, down: boolean) => {
    if (down && questionOpenRef.current) return;
    keys.current[key] = down;
  };

  // Semua tombol memakai warna dan ukuran yang sama.
  const dirButton = (key: string, label: string, aria: string, position: string) => (
    <button
      type="button"
      aria-label={aria}
      onPointerDown={event => {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        press(key, true);
      }}
      onPointerUp={() => press(key, false)}
      onPointerCancel={() => press(key, false)}
      onLostPointerCapture={() => press(key, false)}
      onContextMenu={event => event.preventDefault()}
      className={`
        ${position}
        flex h-full w-full aspect-square items-center justify-center
        rounded-xl sm:rounded-2xl border border-white/25
        !bg-slate-900/90 !text-white
        font-sans text-lg sm:text-2xl font-black
        shadow-lg backdrop-blur-sm
        touch-none select-none
        transition-transform active:scale-95 active:!bg-slate-700
      `}
    >
      {label}
    </button>
  );

  return (
    <div className="relative w-full h-[clamp(360px,calc(100dvh-150px),780px)] overflow-hidden rounded-2xl border-4 border-amber-900 bg-green-600">
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        className="block w-full h-full cursor-crosshair"
      />

      {/* Petunjuk kontrol responsif */}
      <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 max-w-[calc(100%-16px)] rounded-lg bg-black/60 px-2.5 py-1.5 sm:px-3 sm:py-2 text-[9px] sm:text-xs text-white text-center whitespace-nowrap">
        WASD / Panah: Bergerak · Klik: Tujuan
      </div>

      {/* D-pad: empat tombol seragam dan simetris */}
      <div className="absolute z-30 right-2 bottom-12 sm:right-5 sm:bottom-16 grid grid-cols-3 grid-rows-3 w-[clamp(108px,30vw,156px)] aspect-square gap-1 sm:gap-2">
        {dirButton('arrowup', '↑', 'Atas', 'col-start-2 row-start-1')}
        {dirButton('arrowleft', '←', 'Kiri', 'col-start-1 row-start-2')}
        {dirButton('arrowright', '→', 'Kanan', 'col-start-3 row-start-2')}
        {dirButton('arrowdown', '↓', 'Bawah', 'col-start-2 row-start-3')}
      </div>
    </div>
  );
};
