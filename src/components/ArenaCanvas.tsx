import React, { useEffect, useRef } from 'react';
import { GameRoom, Player, QuizType } from '../types/game';
import { drawAvatar } from '../game/avatarRenderer';
import { getZoneFromPosition } from '../game/quizLogic';
import { sounds } from '../game/audio';

interface ArenaCanvasProps {
  room: GameRoom;
  currentPlayerId: string;
  onPositionUpdate: (x: number, y: number, facing: 'left' | 'right' | 'up' | 'down', currentZone: any) => void;
  onJump: () => void;
}

export const ArenaCanvas: React.FC<ArenaCanvasProps> = ({
  room,
  currentPlayerId,
  onPositionUpdate,
  onJump,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Position & movement refs to avoid React re-renders at 60fps
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const localPlayerRef = useRef<Player | null>(null);
  const playersRef = useRef<Player[]>(room.players);
  const roomRef = useRef<GameRoom>(room);

  // Keep refs up to date
  useEffect(() => {
    roomRef.current = room;
    playersRef.current = room.players;
    const me = room.players.find((p) => p.id === currentPlayerId);
    if (me) {
      localPlayerRef.current = me;
    }
  }, [room, currentPlayerId]);

  // Handle Keyboard Inputs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is typing in an input or textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      keysPressed.current[e.key.toLowerCase()] = true;
      keysPressed.current[e.code] = true;

      if (e.code === 'Space') {
        e.preventDefault();
        onJump();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = false;
      keysPressed.current[e.code] = false;
    };

    const handleBlur = () => {
      keysPressed.current = {};
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [onJump]);

  // Click to Move / Tap on canvas
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !localPlayerRef.current) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / rect.width;
    const clickY = (e.clientY - rect.top) / rect.height;

    localPlayerRef.current.targetX = Math.max(0.08, Math.min(0.92, clickX));
    localPlayerRef.current.targetY = Math.max(0.12, Math.min(0.88, clickY));
  };

  // Main 60 FPS Render & Physics Loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();
    let walkTicker = 0;

    const renderLoop = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;

      const canvas = canvasRef.current;
      if (!canvas) {
        animId = requestAnimationFrame(renderLoop);
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const currentRoom = roomRef.current;
      const currentQuestion = currentRoom.quizPack.questions[currentRoom.currentQuestionIndex];
      const quizType: QuizType = currentQuestion ? currentQuestion.type : 'ox';

      const width = canvas.width;
      const height = canvas.height;

      // Update Local Player Movement
      const me = localPlayerRef.current;
      if (me) {
        let dx = 0;
        let dy = 0;
        const speed = 0.45 * dt; // Movement speed in normalized units

        if (keysPressed.current['arrowleft'] || keysPressed.current['a']) dx -= 1;
        if (keysPressed.current['arrowright'] || keysPressed.current['d']) dx += 1;
        if (keysPressed.current['arrowup'] || keysPressed.current['w']) dy -= 1;
        if (keysPressed.current['arrowdown'] || keysPressed.current['s']) dy += 1;

        // If target exists from click-to-move
        if (me.targetX !== undefined && me.targetY !== undefined && dx === 0 && dy === 0) {
          const toX = me.targetX - me.x;
          const toY = me.targetY - me.y;
          const dist = Math.hypot(toX, toY);
          if (dist > 0.015) {
            dx = toX / dist;
            dy = toY / dist;
          } else {
            me.targetX = undefined;
            me.targetY = undefined;
          }
        }

        // Apply movement vector
        if (dx !== 0 || dy !== 0) {
          const len = Math.hypot(dx, dy) || 1;
          const nextX = Math.max(0.08, Math.min(0.92, me.x + (dx / len) * speed));
          const nextY = Math.max(0.12, Math.min(0.88, me.y + (dy / len) * speed));

          me.x = nextX;
          me.y = nextY;
          walkTicker += 0.25;

          if (dx < -0.1) me.facing = 'left';
          else if (dx > 0.1) me.facing = 'right';
          else if (dy < -0.1) me.facing = 'up';
          else if (dy > 0.1) me.facing = 'down';

          // Footstep sound throttled
          if (Math.floor(walkTicker) % 8 === 0) {
            sounds.playFootstep();
          }

          // Compute zone
          const newZone = getZoneFromPosition(me.x, me.y, quizType);
          me.currentZone = newZone;
          onPositionUpdate(me.x, me.y, me.facing, newZone);
        }

        // Jump physics
        if (me.isJumping) {
          me.jumpOffset = (me.jumpOffset || 0) + 70 * dt;
          if (me.jumpOffset > 18) {
            me.isJumping = false;
          }
        } else if (me.jumpOffset && me.jumpOffset > 0) {
          me.jumpOffset = Math.max(0, me.jumpOffset - 85 * dt);
        }
      }

      // Update Simulated Bot Movement
      playersRef.current.forEach((player) => {
        if (!player.isBot) return;

        // Jump physics for bot
        if (player.isJumping) {
          player.jumpOffset = (player.jumpOffset || 0) + 60 * dt;
          if (player.jumpOffset > 16) player.isJumping = false;
        } else if (player.jumpOffset && player.jumpOffset > 0) {
          player.jumpOffset = Math.max(0, player.jumpOffset - 75 * dt);
        }

        // Random jumping or emoting occasionally
        if (Math.random() < 0.003 && !player.isJumping) {
          player.isJumping = true;
        }

        // Target seeking
        if (player.targetX !== undefined && player.targetY !== undefined) {
          const bx = player.targetX - player.x;
          const by = player.targetY - player.y;
          const bdist = Math.hypot(bx, by);
          if (bdist > 0.01) {
            const bSpeed = (0.28 + (player.id.charCodeAt(0) % 5) * 0.03) * dt;
            player.x += (bx / bdist) * Math.min(bdist, bSpeed);
            player.y += (by / bdist) * Math.min(bdist, bSpeed);
            player.facing = bx < 0 ? 'left' : 'right';
            player.currentZone = getZoneFromPosition(player.x, player.y, quizType);
          }
        }
      });

      // -------------------------------------------------------------
      // DRAW ARENA ENVIRONMENT
      // -------------------------------------------------------------
      ctx.clearRect(0, 0, width, height);

      // Arena Base Floor
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, height);

      // Checkerboard tiles
      const tileSize = 32;
      for (let tx = 0; tx < width; tx += tileSize) {
        for (let ty = 0; ty < height; ty += tileSize) {
          ctx.fillStyle = (Math.floor(tx / tileSize) + Math.floor(ty / tileSize)) % 2 === 0
            ? 'rgba(30, 41, 59, 0.4)'
            : 'rgba(15, 23, 42, 0.6)';
          ctx.fillRect(tx, ty, tileSize, tileSize);
        }
      }

      const isReveal = currentRoom.stage === 'reveal' || currentRoom.stage === 'times_up' || currentRoom.stage === 'round_result';
      const correctZone = currentRoom.roundResults?.correctZone;

      if (quizType === 'ox') {
        // -------------------------------------------------------------
        // DRAW OX ARENA (Left O / Right X)
        // -------------------------------------------------------------
        const leftZoneWidth = width * 0.46;
        const rightZoneWidth = width * 0.46;
        const rightZoneX = width * 0.54;

        // O Zone (Left)
        const isOCorrect = isReveal && correctZone === 'O';
        const isOWrong = isReveal && correctZone !== 'O';
        ctx.fillStyle = isOWrong ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.18)';
        ctx.fillRect(0, 0, leftZoneWidth, height);

        // O Zone Border / Glow
        ctx.strokeStyle = isOCorrect ? '#10b981' : isOWrong ? '#ef4444' : 'rgba(16, 185, 129, 0.6)';
        ctx.lineWidth = isOCorrect ? 5 : 2;
        ctx.strokeRect(4, 4, leftZoneWidth - 8, height - 8);

        // Huge O Stamp
        ctx.save();
        ctx.strokeStyle = isOWrong ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.4)';
        ctx.lineWidth = 18;
        ctx.beginPath();
        ctx.arc(leftZoneWidth / 2, height / 2, Math.min(width, height) * 0.22, 0, Math.PI * 2);
        ctx.stroke();

        ctx.font = '900 32px system-ui, sans-serif';
        ctx.fillStyle = isOWrong ? '#ef4444' : '#10b981';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('BENAR (O)', leftZoneWidth / 2, height / 2);
        ctx.restore();

        // X Zone (Right)
        const isXCorrect = isReveal && correctZone === 'X';
        const isXWrong = isReveal && correctZone !== 'X';
        ctx.fillStyle = isXWrong ? 'rgba(239, 68, 68, 0.15)' : 'rgba(244, 63, 94, 0.18)';
        ctx.fillRect(rightZoneX, 0, rightZoneWidth, height);

        // X Zone Border / Glow
        ctx.strokeStyle = isXCorrect ? '#10b981' : isXWrong ? '#ef4444' : 'rgba(244, 63, 94, 0.6)';
        ctx.lineWidth = isXCorrect ? 5 : 2;
        ctx.strokeRect(rightZoneX + 4, 4, rightZoneWidth - 8, height - 8);

        // Huge X Stamp
        ctx.save();
        ctx.strokeStyle = isXWrong ? 'rgba(239, 68, 68, 0.3)' : 'rgba(244, 63, 94, 0.4)';
        ctx.lineWidth = 18;
        const cx = rightZoneX + rightZoneWidth / 2;
        const cy = height / 2;
        const r = Math.min(width, height) * 0.2;
        ctx.beginPath();
        ctx.moveTo(cx - r, cy - r);
        ctx.lineTo(cx + r, cy + r);
        ctx.moveTo(cx + r, cy - r);
        ctx.lineTo(cx - r, cy + r);
        ctx.stroke();

        ctx.font = '900 32px system-ui, sans-serif';
        ctx.fillStyle = isXWrong ? '#ef4444' : '#f43f5e';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('SALAH (X)', cx, cy);
        ctx.restore();

        // Center Neutral Buffer Walkway with hazard stripes
        const bufferX = width * 0.46;
        const bufferW = width * 0.08;
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(bufferX, 0, bufferW, height);

        // Hazard stripes
        ctx.save();
        ctx.beginPath();
        ctx.rect(bufferX, 0, bufferW, height);
        ctx.clip();
        ctx.strokeStyle = 'rgba(234, 179, 8, 0.35)';
        ctx.lineWidth = 6;
        for (let i = -height; i < height + bufferW; i += 24) {
          ctx.beginPath();
          ctx.moveTo(bufferX, i);
          ctx.lineTo(bufferX + bufferW, i + bufferW);
          ctx.stroke();
        }
        ctx.restore();

        // Zone Counters on Floor
        const oCount = playersRef.current.filter((p) => p.currentZone === 'O').length;
        const xCount = playersRef.current.filter((p) => p.currentZone === 'X').length;

        ctx.font = 'bold 12px system-ui, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(`👥 ${oCount} Pemain`, leftZoneWidth / 2, height - 24);
        ctx.fillText(`👥 ${xCount} Pemain`, rightZoneX + rightZoneWidth / 2, height - 24);
      } else {
        // -------------------------------------------------------------
        // DRAW 4-CHOICE ARENA (Quadrants A, B, C, D)
        // -------------------------------------------------------------
        const qw = width * 0.47;
        const qh = height * 0.47;
        const rightX = width * 0.53;
        const bottomY = height * 0.53;

        const quadrants = [
          { zone: 'A', name: 'A', x: 0, y: 0, color: '#ef4444', label: currentQuestion?.options?.[0] || 'Opsi A' },
          { zone: 'B', name: 'B', x: rightX, y: 0, color: '#3b82f6', label: currentQuestion?.options?.[1] || 'Opsi B' },
          { zone: 'C', name: 'C', x: 0, y: bottomY, color: '#eab308', label: currentQuestion?.options?.[2] || 'Opsi C' },
          { zone: 'D', name: 'D', x: rightX, y: bottomY, color: '#10b981', label: currentQuestion?.options?.[3] || 'Opsi D' },
        ];

        quadrants.forEach((q) => {
          const isQCorrect = isReveal && correctZone === q.zone;
          const isQWrong = isReveal && correctZone !== q.zone;

          ctx.fillStyle = isQWrong ? 'rgba(239, 68, 68, 0.12)' : `${q.color}22`;
          ctx.fillRect(q.x, q.y, qw, qh);

          ctx.strokeStyle = isQCorrect ? '#10b981' : isQWrong ? '#ef4444' : `${q.color}88`;
          ctx.lineWidth = isQCorrect ? 5 : 2;
          ctx.strokeRect(q.x + 4, q.y + 4, qw - 8, qh - 8);

          // Big letter emblem
          ctx.font = '900 48px system-ui, sans-serif';
          ctx.fillStyle = isQWrong ? '#ef4444' : q.color;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(q.name, q.x + qw / 2, q.y + qh / 2 - 12);

          // Option label
          ctx.font = 'bold 13px system-ui, sans-serif';
          ctx.fillStyle = '#ffffff';
          const maxTextW = qw - 30;
          ctx.fillText(q.label.slice(0, 32), q.x + qw / 2, q.y + qh / 2 + 24, maxTextW);

          // Player count
          const qCount = playersRef.current.filter((p) => p.currentZone === q.zone).length;
          ctx.font = 'bold 11px system-ui, sans-serif';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.fillText(`👥 ${qCount} Pemain`, q.x + qw / 2, q.y + qh - 16);
        });

        // Intersecting walkways
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(qw, 0, width * 0.06, height);
        ctx.fillRect(0, qh, width, height * 0.06);
      }

      // -------------------------------------------------------------
      // DRAW PLAYERS (Sorted by Y-coordinate for proper 2.5D depth!)
      // -------------------------------------------------------------
      const sortedPlayers = [...playersRef.current].sort((a, b) => a.y - b.y);

      sortedPlayers.forEach((player) => {
        const px = player.x * width;
        const py = player.y * height;
        const isCurrent = player.id === currentPlayerId;

        // Highlight ring under current player
        if (isCurrent) {
          ctx.save();
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2.5;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.ellipse(px, py + 18, 20, 10, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        drawAvatar(
          ctx,
          player,
          px,
          py,
          1.2,
          isCurrent ? walkTicker : (player.id.charCodeAt(0) % 10) + time * 0.005
        );
      });

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, [currentPlayerId, onPositionUpdate]);

  // Resize canvas when container size changes
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[460px] bg-slate-950 overflow-hidden select-none cursor-crosshair rounded-2xl border-2 border-slate-800 shadow-2xl"
    >
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className="w-full h-full block"
      />

      {/* Control Hint in safe margin */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none px-4 py-1.5 rounded-full bg-slate-900/80 border border-slate-700/60 text-slate-300 text-xs font-medium shadow-lg backdrop-blur-sm flex items-center gap-3">
        <span>🎮 <b>WASD / Panah</b> Bergerak</span>
        <span>·</span>
        <span><b>Spasi</b> Lompat</span>
        <span>·</span>
        <span><b>Klik Area</b> Lari ke Titik</span>
      </div>
    </div>
  );
};
