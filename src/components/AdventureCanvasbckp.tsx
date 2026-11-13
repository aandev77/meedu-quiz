import React, { useEffect, useRef } from 'react';
import { Player } from '../types/game';
import { drawAvatar } from '../game/avatarRenderer';

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
}

const WORLD = { width: 3000, height: 2400 };

const PATH = [
  { x: 250, y: 270 },
  { x: 650, y: 270 },
  { x: 650, y: 570 },
  { x: 1100, y: 570 },
  { x: 1100, y: 900 },
  { x: 1600, y: 900 },
  { x: 1600, y: 1250 },
  { x: 2150, y: 1250 },
];

// Membuat posisi peti sesuai jumlah soal utama.
const getChestPositions = (count: number) => {
  const total = Math.max(0, Math.floor(count));
  if (total === 0) return [];

  const segments = [];
  let totalLength = 0;

  for (let i = 0; i < PATH.length - 1; i++) {
    const a = PATH[i];
    const b = PATH[i + 1];
    const length = Math.hypot(b.x - a.x, b.y - a.y);

    segments.push({
      a,
      b,
      length,
      start: totalLength,
    });

    totalLength += length;
  }

  return Array.from({ length: total }, (_, index) => {
    const distance = totalLength * ((index + 1) / (total + 1));

    const segment =
      segments.find(
        item => distance <= item.start + item.length
      ) ?? segments[segments.length - 1];

    const progress =
      (distance - segment.start) / segment.length;

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

  if (lengthSquared === 0) {
    return Math.hypot(px - ax, py - ay);
  }

  const t = Math.max(
    0,
    Math.min(
      1,
      ((px - ax) * dx + (py - ay) * dy) / lengthSquared
    )
  );

  const nearestX = ax + t * dx;
  const nearestY = ay + t * dy;

  return Math.hypot(px - nearestX, py - nearestY);
};

const isOnPath = (
  x: number,
  y: number,
  allowedDistance = 65
) => {
  for (let i = 0; i < PATH.length - 1; i++) {
    const a = PATH[i];
    const b = PATH[i + 1];

    if (
      distanceToSegment(x, y, a.x, a.y, b.x, b.y) <=
      allowedDistance
    ) {
      return true;
    }
  }

  return false;
};

export const AdventureCanvas: React.FC<AdventureCanvasProps> = ({
  players,
  currentPlayerId,
  onPositionUpdate,
  onJump,
  onNearbyChest,
  isQuestionOpen,
  completedChests,
  chestCount,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const questionOpenRef = useRef(isQuestionOpen);
  const playerRef = useRef<Player | null>(null);
  const playersRef = useRef(players);
  const keys = useRef<Record<string, boolean>>({});
  const camera = useRef({ x: 0, y: 0 });
  const walkCycle = useRef(0);

  const onPositionUpdateRef = useRef(onPositionUpdate);
  const onNearbyChestRef = useRef(onNearbyChest);
  const nearbyChestRef = useRef<number | null>(null);
  const completedChestsRef = useRef(completedChests);

  useEffect(() => {
    questionOpenRef.current = isQuestionOpen;
  }, [isQuestionOpen]);

  useEffect(() => {
    completedChestsRef.current = completedChests;
  }, [completedChests]);

  useEffect(() => {
    onNearbyChestRef.current = onNearbyChest;
  }, [onNearbyChest]);

  useEffect(() => {
    onPositionUpdateRef.current = onPositionUpdate;
  }, [onPositionUpdate]);

  useEffect(() => {
    playersRef.current = players;
    playerRef.current =
      players.find(player => player.id === currentPlayerId) ?? null;
  }, [players, currentPlayerId]);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (
        ['INPUT', 'TEXTAREA'].includes(
          (event.target as HTMLElement).tagName
        )
      ) {
        return;
      }

      const key = event.key.toLowerCase();

      const movementKeys = [
        'arrowup',
        'arrowdown',
        'arrowleft',
        'arrowright',
        'w',
        'a',
        's',
        'd',
        ' ',
      ];

      if (movementKeys.includes(key)) {
        event.preventDefault();
      }

      if (questionOpenRef.current) return;

      keys.current[key] = true;

      if (event.code === 'Space') {
        onJump();
      }
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

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;

    if (!canvas || !parent) return;

    const CHESTS = getChestPositions(chestCount);

    let frame = 0;
    let previous = performance.now();

    const resize = () => {
      const rect = parent.getBoundingClientRect();

      canvas.width = Math.max(
        1,
        rect.width * window.devicePixelRatio
      );

      canvas.height = Math.max(
        1,
        rect.height * window.devicePixelRatio
      );
    };

    resize();

    const observer = new ResizeObserver(resize);
    observer.observe(parent);

    const drawGround = (ctx: CanvasRenderingContext2D) => {
      const grass = ctx.createLinearGradient(
        0,
        0,
        WORLD.width,
        WORLD.height
      );

      grass.addColorStop(0, '#609b4d');
      grass.addColorStop(0.5, '#78ad58');
      grass.addColorStop(1, '#527f43');

      ctx.fillStyle = grass;
      ctx.fillRect(0, 0, WORLD.width, WORLD.height);

      for (let x = 20; x < WORLD.width; x += 38) {
        for (let y = 20; y < WORLD.height; y += 38) {
          const seed = Math.abs(
            Math.sin(x * 12.9898 + y * 78.233)
          );

          ctx.fillStyle =
            seed > 0.5
              ? 'rgba(174, 218, 119, 0.20)'
              : 'rgba(31, 83, 40, 0.13)';

          ctx.beginPath();
          ctx.ellipse(
            x + seed * 12,
            y + seed * 8,
            2 + seed * 2,
            1.5,
            seed,
            0,
            Math.PI * 2
          );
          ctx.fill();

          if (seed > 0.72) {
            ctx.strokeStyle = 'rgba(37, 91, 40, 0.55)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x - 3, y - 7);
            ctx.moveTo(x, y);
            ctx.lineTo(x + 4, y - 6);
            ctx.stroke();
          }
        }
      }
    };

    const drawTree = (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      size = 1,
      variant = 0
    ) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(size, size);

      ctx.fillStyle = 'rgba(20, 45, 22, 0.25)';
      ctx.beginPath();
      ctx.ellipse(5, 28, 36, 13, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#60402a';
      ctx.fillRect(-9, -2, 18, 38);

      ctx.fillStyle = '#91603a';
      ctx.fillRect(-5, 0, 5, 32);

      const colors =
        variant % 2 === 0
          ? ['#174d32', '#236b3d', '#348449']
          : ['#28543a', '#397b43', '#4b9850'];

      const layers = [
        { x: 0, y: -34, r: 32 },
        { x: -19, y: -20, r: 25 },
        { x: 19, y: -19, r: 25 },
        { x: 0, y: -7, r: 28 },
      ];

      layers.forEach((layer, index) => {
        ctx.fillStyle = colors[index % colors.length];
        ctx.beginPath();
        ctx.arc(layer.x, layer.y, layer.r, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.fillStyle = 'rgba(159, 207, 105, 0.35)';
      ctx.beginPath();
      ctx.arc(-13, -37, 10, 0, Math.PI * 2);
      ctx.arc(12, -23, 7, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    const drawDecorations = (ctx: CanvasRenderingContext2D) => {
      for (let i = 0; i < 75; i++) {
        const x = 80 + ((i * 173) % 2700);
        const y = 80 + ((i * 251) % 2100);

        if (isOnPath(x, y, 115)) continue;

        ctx.fillStyle = 'rgba(25, 45, 26, 0.2)';
        ctx.beginPath();
        ctx.ellipse(x + 3, y + 5, 13, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = i % 2 ? '#777c69' : '#92927a';
        ctx.beginPath();
        ctx.ellipse(x, y, 11, 7, 0.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.beginPath();
        ctx.ellipse(x - 3, y - 3, 5, 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      for (let i = 0; i < 100; i++) {
        const x = 70 + ((i * 137) % 2800);
        const y = 70 + ((i * 197) % 2200);

        if (isOnPath(x, y, 110)) continue;

        const color = [
          '#fff0b5',
          '#f7a6b9',
          '#e8d8ff',
        ][i % 3];

        ctx.fillStyle = '#f2d76a';
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = color;

        for (let petal = 0; petal < 4; petal++) {
          const angle = petal * Math.PI / 2;

          ctx.beginPath();
          ctx.arc(
            x + Math.cos(angle) * 4,
            y + Math.sin(angle) * 4,
            2.5,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
      }

      for (let i = 0; i < 65; i++) {
        const x = 100 + ((i * 193) % 2750);
        const y = 100 + ((i * 277) % 2150);

        if (isOnPath(x, y, 175)) continue;

        drawTree(ctx, x, y, 0.8 + (i % 4) * 0.12, i);
      }
    };

    const drawAdventurePath = (
      ctx: CanvasRenderingContext2D
    ) => {
      ctx.beginPath();

      PATH.forEach((point, index) => {
        if (index === 0) {
          ctx.moveTo(point.x, point.y + 8);
        } else {
          ctx.lineTo(point.x, point.y + 8);
        }
      });

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(35, 44, 28, 0.3)';
      ctx.lineWidth = 170;
      ctx.stroke();

      ctx.beginPath();

      PATH.forEach((point, index) => {
        if (index === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      });

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#795536';
      ctx.lineWidth = 158;
      ctx.stroke();

      ctx.strokeStyle = '#c69b66';
      ctx.lineWidth = 142;
      ctx.stroke();

      ctx.strokeStyle = '#d7b783';
      ctx.lineWidth = 120;
      ctx.stroke();

      for (let i = 0; i < 230; i++) {
        const x = 250 + ((i * 83) % 1900);
        const y = 270 + ((i * 47) % 1000);

        if (!isOnPath(x, y, 55)) continue;

        ctx.fillStyle =
          i % 2
            ? 'rgba(111, 78, 47, 0.17)'
            : 'rgba(255, 232, 187, 0.25)';

        ctx.beginPath();
        ctx.ellipse(
          x,
          y,
          5 + (i % 5),
          3 + (i % 3),
          i,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    };

    const drawFence = (ctx: CanvasRenderingContext2D) => {
      ctx.save();

      const fencePoints = [
        { x: 90, y: 390 },
        { x: 90, y: 2200 },
        { x: 2300, y: 2200 },
        { x: 2300, y: 1450 },
      ];

      ctx.strokeStyle = '#68472e';
      ctx.lineWidth = 12;

      ctx.beginPath();
      fencePoints.forEach((point, index) => {
        if (index === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      });
      ctx.stroke();

      ctx.strokeStyle = '#b98950';
      ctx.lineWidth = 5;

      for (const point of fencePoints) {
        ctx.fillStyle = '#795536';
        ctx.beginPath();
        ctx.arc(point.x, point.y, 9, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    };

    const drawTreasureChest = (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      index: number
    ) => {
      const completed =
        completedChestsRef.current.includes(index);

      ctx.save();
      ctx.translate(x, y);

      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.ellipse(0, 15, 35, 11, 0, 0, Math.PI * 2);
      ctx.fill();

      if (!completed) {
        const glow = ctx.createRadialGradient(
          0, 0, 5, 0, 0, 65
        );

        glow.addColorStop(
          0,
          'rgba(255, 208, 78, 0.25)'
        );
        glow.addColorStop(
          1,
          'rgba(255, 208, 78, 0)'
        );

        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, 65, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = completed ? '#77705b' : '#70401f';
      ctx.fillRect(-27, -12, 54, 32);

      ctx.fillStyle = completed ? '#a39b81' : '#a65e27';
      ctx.fillRect(-27, -17, 54, 12);

      ctx.fillStyle = completed ? '#686454' : '#c17b32';
      ctx.beginPath();
      ctx.roundRect(-27, -25, 54, 20, [10, 10, 2, 2]);
      ctx.fill();

      ctx.fillStyle = completed ? '#77705b' : '#f4ca55';
      ctx.fillRect(-25, -4, 50, 5);
      ctx.fillRect(-24, 10, 5, 10);
      ctx.fillRect(19, 10, 5, 10);

      ctx.fillStyle = '#ffe48a';
      ctx.fillRect(-5, -7, 10, 13);

      ctx.fillStyle = '#9c641e';
      ctx.fillRect(-2, -4, 4, 8);

      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 5;

      ctx.fillText(
        completed ? '✓ SELESAI' : `PETI ${index + 1}`,
        0,
        -39
      );

      ctx.restore();
    };

    const drawFinishGate = (
      ctx: CanvasRenderingContext2D
    ) => {
      const x = 2150;
      const y = 1230;

      ctx.save();

      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(x - 70, y - 45, 140, 155);

      ctx.fillStyle = '#68452e';
      ctx.fillRect(x - 65, y - 65, 22, 150);
      ctx.fillRect(x + 43, y - 65, 22, 150);

      ctx.fillStyle = '#c58d4c';
      ctx.fillRect(x - 70, y - 72, 32, 14);
      ctx.fillRect(x + 38, y - 72, 32, 14);

      ctx.fillStyle = '#8d4e2e';
      ctx.fillRect(x - 75, y - 90, 150, 27);

      ctx.fillStyle = '#e6bb64';
      ctx.fillRect(x - 65, y - 84, 130, 8);

      ctx.fillStyle = '#a93447';
      ctx.fillRect(x - 42, y - 55, 84, 105);

      ctx.fillStyle = '#f4d47b';
      ctx.font = 'bold 19px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('FINISH', x, y - 5);

      ctx.fillStyle = '#fff2b2';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText('ADVENTURE', x, y + 18);

      ctx.restore();
    };

    const draw = (now: number) => {
      const dt = Math.min((now - previous) / 1000, 0.05);
      previous = now;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width / window.devicePixelRatio;
      const height = canvas.height / window.devicePixelRatio;

      ctx.setTransform(
        window.devicePixelRatio,
        0,
        0,
        window.devicePixelRatio,
        0,
        0
      );

      const me = playerRef.current;

      if (me) {
        let dx = 0;
        let dy = 0;

        const worldX = me.x * WORLD.width;
        const worldY = me.y * WORLD.height;

        let nearestChest: number | null = null;
        let nearestDistance = Infinity;

        CHESTS.forEach((chest, index) => {
          if (completedChestsRef.current.includes(index)) {
            return;
          }

          const distance = Math.hypot(
            worldX - chest.x,
            worldY - chest.y
          );

          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestChest = index;
          }
        });

        const detectedChest =
          nearestDistance <= 105 ? nearestChest : null;

        if (nearbyChestRef.current !== detectedChest) {
          nearbyChestRef.current = detectedChest;
          onNearbyChestRef.current(detectedChest);
        }

        if (questionOpenRef.current) {
          keys.current = {};
          me.targetX = undefined;
          me.targetY = undefined;
        } else {
          if (keys.current.a || keys.current.arrowleft) dx--;
          if (keys.current.d || keys.current.arrowright) dx++;
          if (keys.current.w || keys.current.arrowup) dy--;
          if (keys.current.s || keys.current.arrowdown) dy++;

          if (
            dx === 0 &&
            dy === 0 &&
            me.targetX !== undefined &&
            me.targetY !== undefined
          ) {
            dx = me.targetX * WORLD.width - worldX;
            dy = me.targetY * WORLD.height - worldY;

            const distance = Math.hypot(dx, dy);

            if (distance < 8) {
              me.targetX = undefined;
              me.targetY = undefined;
              dx = 0;
              dy = 0;
            }
          }
        }

        if (dx !== 0 || dy !== 0) {
          const length = Math.hypot(dx, dy);
          const speed = 220;
          const movement = Math.min(speed * dt, length);

          const nextX =
            worldX + (dx / length) * movement;
          const nextY =
            worldY + (dy / length) * movement;

          if (isOnPath(nextX, nextY)) {
            me.x = nextX / WORLD.width;
            me.y = nextY / WORLD.height;

            if (dx < 0) me.facing = 'left';
            if (dx > 0) me.facing = 'right';
            if (dy < 0) me.facing = 'up';
            if (dy > 0) me.facing = 'down';

            walkCycle.current += dt * 12;

            onPositionUpdateRef.current(
              me.x,
              me.y,
              me.facing,
              'none'
            );
          } else if (me.targetX !== undefined) {
            me.targetX = undefined;
            me.targetY = undefined;
          }
        }

        if (!questionOpenRef.current && me.isJumping) {
          me.jumpOffset = (me.jumpOffset || 0) + 70 * dt;

          if (me.jumpOffset > 18) {
            me.isJumping = false;
          }
        } else if (me.jumpOffset > 0) {
          me.jumpOffset = Math.max(
            0,
            me.jumpOffset - 85 * dt
          );
        }

        const cameraWorldX = me.x * WORLD.width;
        const cameraWorldY = me.y * WORLD.height;

        camera.current.x = Math.max(
          0,
          Math.min(
            WORLD.width - width,
            cameraWorldX - width / 2
          )
        );

        camera.current.y = Math.max(
          0,
          Math.min(
            WORLD.height - height,
            cameraWorldY - height / 2
          )
        );
      }

      drawGround(ctx);

      ctx.save();
      ctx.translate(
        -camera.current.x,
        -camera.current.y
      );

      drawDecorations(ctx);

      // Bangunan kelas
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(95, 125, 320, 195);

      ctx.fillStyle = '#d9b77d';
      ctx.fillRect(100, 110, 300, 190);

      ctx.fillStyle = '#75442e';
      ctx.fillRect(85, 90, 330, 35);

      ctx.fillStyle = '#a75b39';
      ctx.fillRect(95, 98, 310, 15);

      ctx.fillStyle = '#70472e';
      ctx.font = 'bold 23px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('RUANG KELAS', 250, 205);

      ctx.fillStyle = '#70b6d5';
      ctx.fillRect(130, 230, 48, 38);
      ctx.fillRect(315, 230, 48, 38);

      ctx.strokeStyle = '#70472e';
      ctx.lineWidth = 5;
      ctx.strokeRect(130, 230, 48, 38);
      ctx.strokeRect(315, 230, 48, 38);

      drawAdventurePath(ctx);
      drawFence(ctx);

      // Peti dibuat berdasarkan jumlah soal utama.
      CHESTS.forEach((chest, index) => {
        drawTreasureChest(
          ctx,
          chest.x,
          chest.y,
          index
        );
      });

      drawFinishGate(ctx);

      playersRef.current.forEach(player => {
        const px = player.x * WORLD.width;
        const py = player.y * WORLD.height;

        drawAvatar(
          ctx,
          player,
          px,
          py,
          1,
          walkCycle.current
        );
      });

      ctx.restore();

      frame = requestAnimationFrame(draw);
    };

    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [chestCount]);

  const handleClick = (
    event: React.MouseEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    const me = playerRef.current;

    if (!canvas || !me) return;
    if (questionOpenRef.current) return;

    const rect = canvas.getBoundingClientRect();

    const worldX =
      event.clientX - rect.left + camera.current.x;

    const worldY =
      event.clientY - rect.top + camera.current.y;

    me.targetX = worldX / WORLD.width;
    me.targetY = worldY / WORLD.height;
  };

  return (
    <div className="relative w-full h-full overflow-hidden rounded-2xl border-4 border-amber-900 bg-green-300">
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        className="block w-full h-full cursor-crosshair"
      />

      <div className="absolute bottom-3 left-3 rounded-lg bg-black/60 px-3 py-2 text-xs text-white">
        WASD / Panah: Bergerak · Space: Lompat · Klik: Tujuan
      </div>
    </div>
  );
};