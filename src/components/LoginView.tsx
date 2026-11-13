
import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import {
  GraduationCap,
  BookOpen,
  Brain,
  Trophy,
  ShieldCheck,
} from 'lucide-react';
import Swal from 'sweetalert2';

// Toast Notification
const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  background: '#ffffff',
  color: '#334155',
  customClass: {
    popup: 'rounded-xl shadow-lg',
  },
});

export const LoginView: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'teacher' | 'student'>(
    'student'
  );

  // Google Login
  const handleGoogleLogin = async () => {
    if (loading) return;

    try {
      setLoading(true);

      // Simpan pilihan role sebelum proses login Firebase
localStorage.setItem('meedu_selected_role', selectedRole);

const result = await signInWithPopup(auth, googleProvider);

      Toast.fire({
        icon: 'success',
        title: 'Login berhasil!',
        text: `Selamat datang di Meedu Quiz sebagai ${
          selectedRole === 'teacher' ? 'Guru' : 'Murid'
        }.`,
      });
    } catch (err: any) {
      console.error('Google login error:', err.code, err.message);

      if (err.code === 'auth/popup-closed-by-user') {
        Toast.fire({
          icon: 'info',
          title: 'Login dibatalkan',
        });
      } else {
        let message =
          'Terjadi kesalahan. Silakan coba beberapa saat lagi.';

        switch (err.code) {
          case 'auth/popup-blocked':
            message =
              'Popup login diblokir browser. Izinkan popup untuk melanjutkan.';
            break;

          case 'auth/network-request-failed':
            message =
              'Koneksi internet bermasalah. Periksa jaringan kamu.';
            break;

          case 'auth/unauthorized-domain':
            message =
              'Domain website belum diizinkan untuk login.';
            break;

          case 'auth/account-exists-with-different-credential':
            message =
              'Email sudah terdaftar menggunakan metode login lain.';
            break;
        }

        Toast.fire({
          icon: 'error',
          title: 'Login gagal!',
          text: message,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#fff8fb] flex items-center justify-center p-3 sm:p-6 lg:p-8">
      <div className="w-full max-w-5xl bg-white rounded-2xl sm:rounded-3xl overflow-hidden border border-pink-100 shadow-[0_12px_45px_rgba(190,24,93,0.07)] grid grid-cols-1 lg:grid-cols-2">

        {/* LEFT: BRANDING */}
        <section className="flex flex-col justify-between bg-[#e94b87] text-white p-6 sm:p-8 lg:p-10 xl:p-12 min-h-[210px] sm:min-h-[250px] lg:min-h-[650px]">
          <div>
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/15 flex items-center justify-center">
                <GraduationCap className="w-6 h-6" />
              </div>

              <div>
                <h2 className="text-lg font-extrabold tracking-wide">
                  MEEDU QUIZ
                </h2>

                <p className="text-[10px] text-pink-100 tracking-wider uppercase">
                  Learning Platform
                </p>
              </div>
            </div>

            {/* Main Branding */}
            <div className="mt-7 lg:mt-24 max-w-md">
              <p className="text-xs sm:text-sm font-medium text-pink-100 mb-2">
                Selamat datang di Meedu Quiz
              </p>

              <h1 className="text-2xl sm:text-3xl xl:text-4xl font-extrabold leading-tight tracking-tight">
                Belajar jadi lebih mudah dan menyenangkan.
              </h1>

              <p className="hidden sm:block mt-4 text-sm text-pink-50 leading-6 max-w-sm">
                Belajar, berlatih, dan uji kemampuanmu melalui
                kuis interaktif bersama teman-teman.
              </p>
            </div>

            {/* Features - Desktop */}
            <div className="hidden lg:block mt-12 space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>

                <div>
                  <p className="text-sm font-bold">
                    Belajar Interaktif
                  </p>
                  <p className="text-xs text-pink-100 mt-1">
                    Materi belajar dengan cara yang lebih menarik.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                  <Brain className="w-5 h-5" />
                </div>

                <div>
                  <p className="text-sm font-bold">
                    Latih Kemampuan
                  </p>
                  <p className="text-xs text-pink-100 mt-1">
                    Asah pengetahuan melalui berbagai tantangan.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                  <Trophy className="w-5 h-5" />
                </div>

                <div>
                  <p className="text-sm font-bold">
                    Bermain Bersama
                  </p>
                  <p className="text-xs text-pink-100 mt-1">
                    Kompetisi sehat bersama teman-temanmu.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer - Desktop */}
          <div className="hidden lg:flex pt-8 mt-12 border-t border-white/20 justify-between gap-4 text-[11px] text-pink-100">
            <span>© 2026 Meedu Quiz</span>
            <span>Learn • Play • Grow</span>
          </div>
        </section>

        {/* RIGHT: LOGIN */}
        <section className="flex flex-col justify-center px-5 py-10 sm:px-10 sm:py-12 lg:px-12 xl:px-16 min-h-[430px] sm:min-h-[500px] lg:min-h-[650px]">
          <div className="w-full max-w-sm mx-auto">

            {/* Heading */}
            <div className="mb-7">
              <p className="text-sm font-semibold text-pink-500 mb-3">
                Selamat datang kembali!
              </p>

              <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">
                Masuk ke akunmu
              </h2>

              <p className="text-sm text-slate-500 leading-6 mt-3">
                Pilih peranmu untuk melanjutkan aktivitas di Meedu Quiz.
              </p>
            </div>

            {/* Login Form */}
            <div>
              {/* Pilihan Role */}
              <p className="text-sm font-semibold text-slate-700 mb-3">
                Masuk sebagai
              </p>

              <div className="grid grid-cols-2 gap-3 mb-7">
                {/* Guru */}
                <button
                  type="button"
                  onClick={() => setSelectedRole('teacher')}
                  disabled={loading}
                  aria-pressed={selectedRole === 'teacher'}
                  className={`p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                    selectedRole === 'teacher'
                      ? 'border-pink-500 bg-pink-50 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-pink-200'
                  } disabled:opacity-60`}
                >
                  <GraduationCap
                    className={`w-7 h-7 mb-3 ${
                      selectedRole === 'teacher'
                        ? 'text-pink-500'
                        : 'text-slate-400'
                    }`}
                  />

                  <p className="text-sm font-bold text-slate-800">
                    Guru
                  </p>

                  <p className="text-[11px] text-slate-500 mt-1 leading-4">
                    Membuat dan mengelola kuis
                  </p>

                  {selectedRole === 'teacher' && (
                    <div className="mt-3 text-[10px] font-semibold text-pink-600">
                      ✓ Dipilih
                    </div>
                  )}
                </button>

                {/* Murid */}
                <button
                  type="button"
                  onClick={() => setSelectedRole('student')}
                  disabled={loading}
                  aria-pressed={selectedRole === 'student'}
                  className={`p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                    selectedRole === 'student'
                      ? 'border-pink-500 bg-pink-50 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-pink-200'
                  } disabled:opacity-60`}
                >
                  <BookOpen
                    className={`w-7 h-7 mb-3 ${
                      selectedRole === 'student'
                        ? 'text-pink-500'
                        : 'text-slate-400'
                    }`}
                  />

                  <p className="text-sm font-bold text-slate-800">
                    Murid
                  </p>

                  <p className="text-[11px] text-slate-500 mt-1 leading-4">
                    Mengikuti kuis dan belajar
                  </p>

                  {selectedRole === 'student' && (
                    <div className="mt-3 text-[10px] font-semibold text-pink-600">
                      ✓ Dipilih
                    </div>
                  )}
                </button>
              </div>

              {/* Google Login Information */}
              <p className="text-sm font-semibold text-slate-700 mb-2">
                Masuk dengan akun Google
              </p>

              <p className="text-xs text-slate-400 mb-5">
                Gunakan akun Google aktif untuk melanjutkan sebagai{' '}
                <span className="font-semibold text-pink-500">
                  {selectedRole === 'teacher' ? 'Guru' : 'Murid'}
                </span>.
              </p>

              {/* Google Login Button */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full h-12 flex items-center justify-center gap-3 rounded-md border border-slate-200 bg-white text-slate-600 hover:border-pink-300 hover:bg-pink-50/40 hover:text-slate-800 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-pink-200 focus:ring-offset-1"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />

                    <span className="text-xs font-medium">
                      Menghubungkan...
                    </span>
                  </>
                ) : (
                  <>
                    {/* Google Logo */}
                    <svg
                      viewBox="0 0 48 48"
                      className="w-[17px] h-[17px] shrink-0"
                    >
                      <path
                        fill="#EA4335"
                        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 3.07 13.22l7.98 6.19C12.95 13.72 18.02 9.5 24 9.5Z"
                      />

                      <path
                        fill="#4285F4"
                        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.76 7.18l7.73 6C44.42 37.96 46.98 31.85 46.98 24.55Z"
                      />

                      <path
                        fill="#FBBC05"
                        d="M11.05 28.59A14.4 14.4 0 0 1 10.3 24c0-1.6.27-3.14.75-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.52 3.07 10.78l7.98-6.19Z"
                      />

                      <path
                        fill="#34A853"
                        d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.15 1.45-4.9 2.3-8.18 2.3-5.98 0-11.05-4.22-12.95-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"
                      />
                    </svg>

                    <span className="text-xs font-medium">
                      Sign in with Google
                    </span>
                  </>
                )}
              </button>
            </div>

            {/* Security Information */}
            <div className="mt-7 flex items-start gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100">
              <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />

              <div>
                <p className="text-xs font-semibold text-slate-700">
                  Login aman dengan Google
                </p>

                <p className="text-[11px] text-slate-500 leading-5 mt-1">
                  Proses autentikasi ditangani oleh Firebase.
                  Meedu Quiz tidak menyimpan password akun Google kamu.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-10 pt-6 border-t border-slate-100">
              <p className="text-[11px] text-center text-slate-400 leading-5">
                Dengan masuk, kamu dapat menggunakan fitur
                pembelajaran yang tersedia di Meedu Quiz.
              </p>

              <p className="text-[11px] text-center text-slate-300 mt-4">
                © 2026 Meedu Quiz. All rights reserved.
              </p>
            </div>

          </div>
        </section>

      </div>
    </main>
  );
};
