
import React, { useEffect, useRef } from 'react';
import { AvatarConfig, Player } from '../types/game';
import {
  drawAvatar,
  HAIR_COLORS,
  PANTS_COLORS,
  SHIRT_COLORS,
  SKIN_COLORS,
} from '../game/avatarRenderer';
import { User, Wand2, X } from 'lucide-react';
import Toast from '../utils/toast';

interface AvatarCustomizerProps {
  avatar: AvatarConfig;
  name: string;
  onAvatarChange: (newAvatar: AvatarConfig) => void;
  onNameChange: (newName: string) => void;
  onSave?: () => void;
  onClose?: () => void;
}

export const AvatarCustomizer: React.FC<AvatarCustomizerProps> = ({
  avatar,
  name,
  onAvatarChange,
  onNameChange,
  onSave,
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Menutup kustomisasi avatar
  const handleCancel = () => {
    onClose?.();
  };

  // Menampilkan live preview avatar
  useEffect(() => {
    let animId: number;
    let walk = 0;
    let isActive = true;

    const render = () => {
      if (!isActive) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const previewPlayer: Player = {
        id: 'preview',
        name: name || 'Kamu',
        isHost: false,
        avatar,
        x: 0.5,
        y: 0.5,
        facing: 'right',
        isJumping: false,
        jumpOffset: 0,
        currentZone: 'none',
        score: 0,
        streak: 0,
        emote: {
          id: 'em',
          emoji: '✨',
          timestamp: Date.now(),
        },
      };

      walk += 0.05;

      drawAvatar(
        ctx,
        previewPlayer,
        canvas.width / 2,
        canvas.height / 2 + 10,
        1.8,
        walk
      );

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      isActive = false;
      cancelAnimationFrame(animId);
    };
  }, [avatar, name]);

  // Daftar model rambut
  const hairStyles: AvatarConfig['hairStyle'][] = [
    'short',
    'spiky',
    'curly',
    'ponytail',
    'bob',
    'cap',
  ];

  // Daftar aksesori
  const accessories: AvatarConfig['accessory'][] = [
    'none',
    'glasses',
    'headphones',
    'crown',
    'flower',
    'headband',
  ];

  // Mengacak tampilan avatar
  const handleRandomize = () => {
    const randomItem = <T,>(arr: T[]): T =>
      arr[Math.floor(Math.random() * arr.length)];

    onAvatarChange({
      skinColor: randomItem(SKIN_COLORS),
      hairStyle: randomItem(hairStyles),
      hairColor: randomItem(HAIR_COLORS),
      shirtColor: randomItem(SHIRT_COLORS),
      pantsColor: randomItem(PANTS_COLORS),
      accessory: randomItem(accessories),
    });
  };

  // Menyimpan avatar
  const handleSave = () => {
    onSave?.();

    Toast.fire({
      icon: 'success',
      title: 'Avatar berhasil disimpan!',
      text: 'Karakter barumu siap digunakan',
    });
  };

  // Style pilihan model
  const optionClass = (selected: boolean) =>
    `px-2.5 py-2 rounded-xl text-xs capitalize font-semibold transition-all duration-200 cursor-pointer ${
      selected
        ? 'bg-pink-500 text-white shadow-md shadow-pink-500/25 ring-2 ring-pink-400'
        : 'bg-pink-50/80 text-slate-600 hover:bg-pink-100 hover:text-pink-600 border border-pink-100'
    }`;

  // Style pilihan warna
  const colorClass = (selected: boolean) =>
    `w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 transition-all duration-200 transform hover:scale-110 active:scale-95 cursor-pointer ${
      selected
        ? 'border-pink-500 ring-2 ring-pink-300 scale-110 shadow-md'
        : 'border-white shadow-sm hover:border-pink-200'
    }`;

  return (
    <div className="relative w-full max-w-2xl mx-auto bg-white border border-pink-100 rounded-3xl p-4 sm:p-6 text-slate-800 shadow-xl shadow-pink-100/50">

      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 sm:pb-4 border-b border-pink-100 gap-2">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-pink-100 text-pink-500 flex items-center justify-center shrink-0">
            <User className="w-5 h-5" />
          </div>

          <div className="truncate">
            <h3 className="text-sm sm:text-lg font-bold text-slate-800 truncate">
              Kustomisasi Avatar
            </h3>
            <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
              Buat karakter unikmu sendiri!
            </p>
          </div>
        </div>

        {/* Tombol Acak dan Tutup */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={handleRandomize}
            className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-xl text-xs font-semibold transition-all duration-200 hover:shadow-lg hover:shadow-pink-200 active:scale-95 cursor-pointer"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Acak</span>
          </button>

          <button
            type="button"
            onClick={handleCancel}
            className="p-1.5 sm:p-2 bg-pink-50/80 hover:bg-pink-100 text-slate-500 hover:text-slate-700 rounded-xl transition-all duration-150 active:scale-95 border border-pink-200/60 cursor-pointer"
            aria-label="Tutup kustomisasi"
            title="Tutup"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600" />
          </button>
        </div>
      </div>

      {/* Grid Utama */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 mt-4 sm:mt-6 items-start">

        {/* Kolom Kiri: Preview dan Nama */}
        <div className="md:col-span-5 flex flex-col items-center">
          <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-2xl bg-gradient-to-b from-pink-100 via-pink-50 to-white border-2 border-pink-200 flex items-center justify-center shadow-inner overflow-hidden">
            <div
              className="absolute inset-0 opacity-30 pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(#f9a8d4 1px, transparent 1px)',
                backgroundSize: '14px 14px',
              }}
            />

            <canvas
              ref={canvasRef}
              width={180}
              height={180}
              className="w-full h-full relative z-10"
            />

            <div className="absolute top-2 left-2 text-[9px] tracking-wider font-bold uppercase text-pink-600 bg-white/95 px-2 py-0.5 sm:py-1 rounded-full border border-pink-200 shadow-sm z-20">
              Live Preview
            </div>
          </div>

          <div className="w-full mt-3 sm:mt-4">
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              Nama Panggilan / Nickname
            </label>

            <input
              type="text"
              value={name}
              maxLength={14}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Contoh: Budi Juara"
              className="w-full px-3.5 py-2.5 sm:py-3 rounded-xl bg-pink-50/70 border border-pink-100 text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-pink-400 transition-all"
            />

            <p className="text-[10px] text-slate-400 text-right mt-1">
              {name.length}/14 karakter
            </p>
          </div>
        </div>

        {/* Kolom Kanan: Pilihan Kustomisasi */}
        <div className="md:col-span-7 space-y-4 sm:space-y-5 max-h-[300px] sm:max-h-[380px] overflow-y-auto pr-1.5 sm:pr-2 scrollbar-thin scrollbar-thumb-pink-200 scrollbar-track-pink-50">

          {/* Model Rambut */}
          <div>
            <span className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              Model Rambut
            </span>
            <div className="grid grid-cols-3 gap-2">
              {hairStyles.map((style) => (
                <button
                  type="button"
                  key={style}
                  onClick={() =>
                    onAvatarChange({ ...avatar, hairStyle: style })
                  }
                  className={optionClass(avatar.hairStyle === style)}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          {/* Warna Rambut */}
          <div>
            <span className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              Warna Rambut
            </span>
            <div className="flex flex-wrap gap-2.5 sm:gap-3">
              {HAIR_COLORS.map((color) => (
                <button
                  type="button"
                  key={color}
                  onClick={() =>
                    onAvatarChange({ ...avatar, hairColor: color })
                  }
                  style={{ backgroundColor: color }}
                  className={colorClass(avatar.hairColor === color)}
                  aria-label={`Pilih warna rambut ${color}`}
                />
              ))}
            </div>
          </div>

          {/* Warna Kulit */}
          <div>
            <span className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              Warna Kulit
            </span>
            <div className="flex flex-wrap gap-2.5 sm:gap-3">
              {SKIN_COLORS.map((color) => (
                <button
                  type="button"
                  key={color}
                  onClick={() =>
                    onAvatarChange({ ...avatar, skinColor: color })
                  }
                  style={{ backgroundColor: color }}
                  className={colorClass(avatar.skinColor === color)}
                  aria-label={`Pilih warna kulit ${color}`}
                />
              ))}
            </div>
          </div>

          {/* Warna Baju */}
          <div>
            <span className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              Warna Baju / Kostum
            </span>
            <div className="flex flex-wrap gap-2.5 sm:gap-3">
              {SHIRT_COLORS.map((color) => (
                <button
                  type="button"
                  key={color}
                  onClick={() =>
                    onAvatarChange({ ...avatar, shirtColor: color })
                  }
                  style={{ backgroundColor: color }}
                  className={colorClass(avatar.shirtColor === color)}
                  aria-label={`Pilih warna baju ${color}`}
                />
              ))}
            </div>
          </div>

          {/* Warna Celana */}
          <div>
            <span className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              Warna Celana
            </span>
            <div className="flex flex-wrap gap-2.5 sm:gap-3">
              {PANTS_COLORS.map((color) => (
                <button
                  type="button"
                  key={color}
                  onClick={() =>
                    onAvatarChange({ ...avatar, pantsColor: color })
                  }
                  style={{ backgroundColor: color }}
                  className={colorClass(avatar.pantsColor === color)}
                  aria-label={`Pilih warna celana ${color}`}
                />
              ))}
            </div>
          </div>

          {/* Aksesori Kepala */}
          <div>
            <span className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              Aksesoris Kepala
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {accessories.map((acc) => (
                <button
                  type="button"
                  key={acc}
                  onClick={() =>
                    onAvatarChange({ ...avatar, accessory: acc })
                  }
                  className={optionClass(avatar.accessory === acc)}
                >
                  {acc === 'none' ? 'Polos' : acc}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Aksi */}
      <div className="mt-5 sm:mt-6 pt-4 border-t border-pink-100 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 sm:gap-3">
        <button
          type="button"
          onClick={handleCancel}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-pink-200 text-slate-600 hover:bg-pink-50 text-xs sm:text-sm font-semibold transition-all duration-200 active:scale-95 cursor-pointer text-center"
        >
          Batal
        </button>

        <button
          type="button"
          onClick={handleSave}
          className="w-full sm:w-auto px-6 py-2.5 sm:py-3 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-pink-200 transition-all duration-200 hover:-translate-y-0.5 active:scale-95 cursor-pointer text-center"
        >
          Simpan Karakter
        </button>
      </div>
    </div>
  );
};
