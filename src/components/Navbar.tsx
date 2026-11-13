
import React, { useState } from 'react';
import {
  Volume2,
  VolumeX,
  PlusCircle,
  Gamepad2,
  LogOut,
  GraduationCap,
  UserRound,
  RefreshCw,
  CircleUserRound,
  ChevronDown,
  X,
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import Toast from '../utils/toast';

interface NavbarProps {
  userRole: 'teacher' | 'student';
  userEmail?: string;
  onRoleChange: (role: 'teacher' | 'student') => void;
  onOpenQuizCreator: () => void;
  onOpenAvatarCustomizer: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  activeRoomCode?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  userRole,
  userEmail,
  onRoleChange,
  onOpenQuizCreator,
  onOpenAvatarCustomizer,
  isMuted,
  onToggleMute,
  activeRoomCode,
}) => {
  const [isChangingRole, setIsChangingRole] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // GANTI ROLE
  const handleChangeRole = async () => {
    const newRole = userRole === 'teacher' ? 'student' : 'teacher';

    try {
      setIsChangingRole(true);

      const currentUser = auth.currentUser;

      if (!currentUser) {
        throw new Error('Silakan login terlebih dahulu.');
      }

      const token = await currentUser.getIdToken();

      const response = await fetch('/api/auth/role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });

      const responseText = await response.text();

      let result: any;

      try {
        result = responseText ? JSON.parse(responseText) : {};
      } catch {
        console.error('Respons server bukan JSON:', responseText);

        throw new Error(
          `Server mengirim respons tidak valid (HTTP ${response.status}).`
        );
      }

      if (!response.ok) {
        throw new Error(
          result.error || `Gagal mengganti role (HTTP ${response.status}).`
        );
      }

      onRoleChange(newRole);
      setIsProfileOpen(false);

      Toast.fire({
        icon: 'success',
        title: 'Role berhasil diubah!',
        text: `Sekarang kamu masuk sebagai ${
          newRole === 'teacher' ? 'Guru' : 'Murid'
        }.`,
      });
    } catch (error) {
      console.error('Change role error:', error);

      Toast.fire({
        icon: 'error',
        title: 'Gagal mengganti role!',
        text:
          error instanceof Error
            ? error.message
            : 'Terjadi kesalahan. Silakan coba lagi.',
      });
    } finally {
      setIsChangingRole(false);
    }
  };

  // LOGOUT
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsProfileOpen(false);

      Toast.fire({
        icon: 'success',
        title: 'Berhasil logout!',
        text: 'Sampai jumpa kembali',
      });
    } catch (error) {
      console.error('Logout error:', error);

      Toast.fire({
        icon: 'error',
        title: 'Logout gagal!',
        text: 'Terjadi kesalahan saat keluar. Silakan coba lagi.',
      });
    }
  };

  const isTeacher = userRole === 'teacher';

  return (
    <header className="sticky top-0 z-30 w-full bg-white border-b border-pink-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-6">
        <div className="flex flex-col items-stretch gap-2 py-2 sm:min-h-[68px] sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:py-0">

          {/* BRAND */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-pink-600 flex items-center justify-center text-white shrink-0">
              <GraduationCap className="w-6 h-6" />
            </div>

            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-800 leading-tight">
                Meedu <span className="text-pink-600">Quiz</span>
              </h1>

              <p className="hidden sm:block text-[10px] text-slate-400 mt-0.5">
                Learning & Multiplayer Platform
              </p>
            </div>
          </div>

          {/* ACTIONS */}
          <nav className="flex w-full items-center justify-between gap-1 sm:w-auto sm:justify-end sm:gap-2">

            {/* TEACHER ACTION */}
            {isTeacher && (
              <button
                type="button"
                onClick={onOpenQuizCreator}
                title="Buat Kuis"
                className="h-9 w-9 sm:w-auto sm:h-10 flex shrink-0 items-center justify-center gap-2 sm:px-3.5 rounded-lg bg-pink-50 hover:bg-pink-100 border border-pink-100 text-pink-700 text-xs font-semibold transition-colors"
              >
                <PlusCircle className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Buat Kuis</span>
              </button>
            )}

            {/* STUDENT ACTION */}
            {!isTeacher && (
              <button
                type="button"
                onClick={onOpenAvatarCustomizer}
                title="Kustomisasi Avatar"
                className="h-9 w-9 sm:w-auto sm:h-10 flex shrink-0 items-center justify-center gap-2 sm:px-3.5 rounded-lg bg-pink-600 hover:bg-pink-700 text-white text-xs font-semibold transition-colors"
              >
                <UserRound className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Kustom Avatar</span>
              </button>
            )}

            {/* GANTI ROLE */}
            <button
              type="button"
              onClick={handleChangeRole}
              disabled={isChangingRole}
              title={`Ganti ke ${isTeacher ? 'Murid' : 'Guru'}`}
              className="h-9 w-9 sm:w-auto sm:h-10 flex shrink-0 items-center justify-center gap-1.5 sm:px-3 rounded-lg bg-white hover:bg-pink-50 border border-pink-200 text-pink-700 text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw
                className={`w-4 h-4 shrink-0 ${
                  isChangingRole ? 'animate-spin' : ''
                }`}
              />

              <span className="hidden sm:inline">
                {isChangingRole
                  ? 'Mengubah...'
                  : isTeacher
                    ? 'Mode Murid'
                    : 'Mode Guru'}
              </span>
            </button>

            {/* ROOM PIN */}
            {activeRoomCode && (
              <div
                className="h-9 min-w-0 max-w-[104px] sm:max-w-none sm:h-10 flex shrink items-center gap-1 px-1.5 sm:gap-1.5 sm:px-3 rounded-lg bg-pink-50 border border-pink-200 text-pink-700"
                title={`PIN Room: ${activeRoomCode}`}
              >
                <Gamepad2 className="w-4 h-4 shrink-0" />

                <span className="min-w-0 truncate text-[10px] sm:text-xs font-bold whitespace-nowrap">
                  <span className="hidden sm:inline">PIN: </span>
                  {activeRoomCode}
                </span>
              </div>
            )}

            {/* AUDIO */}
            <button
              type="button"
              onClick={onToggleMute}
              title={isMuted ? 'Nyalakan Audio' : 'Matikan Audio'}
              aria-label={isMuted ? 'Nyalakan audio' : 'Matikan audio'}
              className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 flex items-center justify-center rounded-lg bg-white hover:bg-pink-50 border border-pink-100 text-pink-600 transition-colors"
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>

            {/* PROFILE MENU */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                aria-expanded={isProfileOpen}
                title="Profil Pengguna"
                className="h-9 w-9 sm:w-auto sm:h-10 shrink-0 flex items-center justify-center sm:gap-2 sm:px-3 rounded-lg bg-white hover:bg-pink-50 border border-pink-100 transition-colors"
              >
                <CircleUserRound className="w-5 h-5 text-pink-600 shrink-0" />

                <span className="hidden md:block text-xs font-semibold text-slate-700">
                  Profil
                </span>

                <ChevronDown
                  className={`hidden sm:block w-3.5 h-3.5 text-slate-500 transition-transform ${
                    isProfileOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isProfileOpen && (
                <>
                  {/* BACKDROP MOBILE */}
                  <button
                    type="button"
                    aria-label="Tutup menu profil"
                    onClick={() => setIsProfileOpen(false)}
                    className="fixed inset-0 z-40 cursor-default"
                  />

                  {/* DROPDOWN */}
                  <div className="absolute right-0 top-full mt-2 w-[min(280px,calc(100vw-24px))] bg-white border border-pink-100 rounded-xl shadow-xl p-4 z-50">

                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-bold text-slate-800">
                        Profil Pengguna
                      </p>

                      <button
                        type="button"
                        onClick={() => setIsProfileOpen(false)}
                        aria-label="Tutup profil"
                        className="p-1 rounded-md hover:bg-pink-50 text-slate-400"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* USER INFO */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-11 h-11 rounded-full bg-pink-100 flex items-center justify-center shrink-0">
                        <UserRound className="w-5 h-5 text-pink-600" />
                      </div>

                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800">
                          Akun Saya
                        </p>

                        <p className="text-xs text-slate-500 truncate">
                          {userEmail || 'Email tidak tersedia'}
                        </p>
                      </div>
                    </div>

                    {/* ACTIVE ROLE */}
                    <div className="border-t border-pink-100 pt-3">
                      <p className="text-xs text-slate-500 mb-2">
                        Role aktif
                      </p>

                      <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-pink-50 border border-pink-100">
                        <div className="flex items-center gap-2">
                          {isTeacher ? (
                            <GraduationCap className="w-4 h-4 text-pink-600" />
                          ) : (
                            <UserRound className="w-4 h-4 text-pink-600" />
                          )}

                          <span className="text-sm font-semibold text-pink-700">
                            {isTeacher ? 'Guru' : 'Murid'}
                          </span>
                        </div>

                        <span className="text-[10px] font-semibold text-pink-600 bg-white px-2 py-1 rounded-full">
                          Aktif
                        </span>
                      </div>
                    </div>

                    {/* CHANGE ROLE */}
                    <button
                      type="button"
                      onClick={handleChangeRole}
                      disabled={isChangingRole}
                      className="w-full mt-3 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-pink-200 text-pink-700 hover:bg-pink-50 text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      <RefreshCw
                        className={`w-4 h-4 ${
                          isChangingRole ? 'animate-spin' : ''
                        }`}
                      />

                      {isChangingRole
                        ? 'Mengubah role...'
                        : `Ganti ke ${isTeacher ? 'Murid' : 'Guru'}`}
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* LOGOUT */}
            <button
              type="button"
              onClick={handleLogout}
              title="Logout"
              className="h-9 w-9 sm:w-auto sm:h-10 flex shrink-0 items-center justify-center gap-1.5 sm:px-3.5 rounded-lg bg-pink-600 hover:bg-pink-700 text-white text-xs font-semibold transition-colors"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Logout</span>
            </button>

          </nav>
        </div>
      </div>
    </header>
  );
};
