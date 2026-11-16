import React from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useScroll, useSpring } from 'motion/react';
import {
  Newspaper,
  MessageSquare,
  ShieldCheck,
  LogOut,
  Loader2,
  Sun,
  Moon,
  LogIn,
  Bookmark,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Toaster } from '@/components/ui/sonner';
import { Analytics } from '@vercel/analytics/react';
import SaturnLogo from '@/src/components/SaturnLogo';
import BookmarksDrawer from '@/src/components/BookmarksDrawer';
import NewsTipModal from '@/src/components/NewsTipModal';
import { useTheme } from '@/src/context/ThemeContext';
import { useBilnews } from '@/src/context/BilnewsContext';
import NewsListPage from '@/src/pages/NewsListPage';
import NewsDetailPage from '@/src/pages/NewsDetailPage';
import ForumListPage from '@/src/pages/ForumListPage';
import ForumDetailPage from '@/src/pages/ForumDetailPage';
import AdminPage from '@/src/pages/AdminPage';
import { PrivacyPolicyPage, TermsOfUsePage } from '@/src/pages/LegalPages';

export default function App() {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const {
    user,
    authLoading,
    news,
    bookmarks,
    setBookmarksDrawerOpen,
    loginWithGoogle,
    logout,
  } = useBilnews();

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 280,
    damping: 32,
    restDelta: 0.001,
  });

  const tickerItems = news.slice(0, 8);

  const isNewsActive =
    location.pathname === '/' || location.pathname.startsWith('/news');
  const isForumActive = location.pathname.startsWith('/forum');
  const isAdminActive = location.pathname.startsWith('/admin');

  if (authLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-blue-700 dark:text-blue-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-blue-100 dark:selection:bg-blue-900">
      <Analytics />
      <Toaster position="bottom-right" offset={24} theme={theme} richColors />
      <BookmarksDrawer />
      <NewsTipModal />

      {/* Top Reading Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 z-[60] h-[3px] bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-600 origin-left pointer-events-none"
        style={{ scaleX }}
        aria-hidden="true"
      />

      {/* Breaking News Ticker */}
      <div className="w-full h-8 bg-slate-900 dark:bg-zinc-950 text-slate-200 border-b border-slate-800 dark:border-zinc-800 overflow-hidden flex items-center">
        <div className="container mx-auto max-w-5xl px-4 sm:px-6 flex items-center gap-3 overflow-hidden">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-600 text-white text-[10px] font-bold tracking-wider uppercase shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            SON DAKİKA
          </span>

          <div className="flex-1 overflow-hidden relative">
            {tickerItems.length > 0 ? (
              <div className="animate-ticker items-center gap-8 text-xs text-slate-300">
                {[...tickerItems, ...tickerItems].map((item, idx) => (
                  <Link
                    key={`${item.id}-${idx}`}
                    to={`/news/${item.id}`}
                    className="inline-flex items-center gap-2 whitespace-nowrap hover:text-white transition-colors"
                  >
                    <span className="text-blue-400 font-semibold">•</span>
                    <span>{item.title}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 truncate">
                Bilnews · Okuldan güncel haberler, duyurular ve öğrenci forumu
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Top Glassmorphism Sticky Navigation Bar */}
      <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-white/80 dark:bg-zinc-900/80 border-b border-stone-200/80 dark:border-zinc-800/80 transition-colors duration-300">
        <div className="container mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-6 max-w-5xl">
          {/* Zone 1: Brand wordmark */}
          <Link
            to="/"
            className="flex items-center gap-2 whitespace-nowrap shrink-0 text-slate-900 dark:text-slate-100"
          >
            <span className="text-blue-700 dark:text-blue-400">
              <SaturnLogo className="w-6 h-6" color="currentColor" />
            </span>
            <span className="text-lg font-semibold tracking-tight">Bilnews</span>
          </Link>

          {/* Zone 2: Concise single-line navigation links */}
          <nav className="hidden md:flex items-center gap-6" aria-label="Ana menü">
            <Link
              to="/"
              className={`py-4 text-sm font-medium whitespace-nowrap shrink-0 border-b-2 transition-colors ${
                isNewsActive
                  ? 'border-blue-700 text-blue-700 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              Haberler
            </Link>
            <Link
              to="/forum"
              className={`py-4 text-sm font-medium whitespace-nowrap shrink-0 border-b-2 transition-colors ${
                isForumActive
                  ? 'border-blue-700 text-blue-700 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              Forum
            </Link>
            <Link
              to="/admin"
              className={`py-4 text-sm font-medium whitespace-nowrap shrink-0 border-b-2 transition-colors ${
                isAdminActive
                  ? 'border-red-600 text-red-600 dark:border-red-400 dark:text-red-400'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              Yönetim Paneli
            </Link>
          </nav>

          {/* Zone 3: Bookmarks + Smooth Theme Switch + Primary Auth action */}
          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setBookmarksDrawerOpen(true)}
              title="Kaydedilen Haberler"
              aria-label="Kaydedilen Haberler"
              className="relative text-slate-600 dark:text-slate-300"
            >
              <Bookmark className="w-4 h-4" />
              {bookmarks.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-blue-700 text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                  {bookmarks.length}
                </span>
              )}
            </Button>

            <motion.button
              type="button"
              role="switch"
              aria-checked={theme === 'dark'}
              aria-label={theme === 'dark' ? 'Açık temaya geç' : 'Koyu temaya geç'}
              title={theme === 'dark' ? 'Açık Tema' : 'Koyu Tema'}
              onClick={toggleTheme}
              whileTap={{ scale: 0.94 }}
              className="relative inline-flex h-7 w-13 items-center rounded-full p-1 bg-stone-200 dark:bg-zinc-800 border border-stone-300/70 dark:border-zinc-700 transition-colors duration-300 cursor-pointer"
            >
              <span className="sr-only">Tema değiştir</span>
              <Sun className="w-3.5 h-3.5 text-amber-500 ml-0.5" />
              <Moon className="w-3.5 h-3.5 text-sky-400 ml-auto mr-0.5" />
              <motion.span
                layout
                transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                className={`absolute top-0.5 w-5.5 h-5.5 rounded-full bg-white dark:bg-zinc-950 shadow-sm flex items-center justify-center ${
                  theme === 'dark' ? 'left-[26px]' : 'left-0.5'
                }`}
              >
                {theme === 'dark' ? (
                  <Moon className="w-3 h-3 text-sky-400" />
                ) : (
                  <Sun className="w-3 h-3 text-amber-500" />
                )}
              </motion.span>
            </motion.button>

            {user ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <Avatar className="w-8 h-8 border border-stone-200 dark:border-zinc-700">
                    <AvatarImage src={user.photoURL || ''} alt={user.displayName || 'Profil'} />
                    <AvatarFallback className="text-xs bg-stone-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-200">
                      {(user.displayName || user.email || 'U')[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden lg:inline text-xs font-medium text-slate-700 dark:text-slate-300 max-w-[120px] truncate">
                    {user.displayName || 'Profil'}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={logout}
                  title="Çıkış Yap"
                  aria-label="Çıkış Yap"
                  className="text-slate-600 dark:text-slate-300"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                onClick={loginWithGoogle}
                size="sm"
                className="bg-blue-700 hover:bg-blue-800 text-white gap-1.5 whitespace-nowrap shrink-0"
              >
                <LogIn className="w-3.5 h-3.5" />
                Giriş Yap
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Route Content with Smooth Page Transitions */}
      <main className="flex-1 container mx-auto px-4 sm:px-6 py-6 max-w-5xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <Routes location={location}>
              <Route path="/" element={<NewsListPage />} />
              <Route path="/news/:id" element={<NewsDetailPage />} />
              <Route path="/forum" element={<ForumListPage />} />
              <Route path="/forum/:id" element={<ForumDetailPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/gizlilik" element={<PrivacyPolicyPage />} />
              <Route path="/kullanim-kosullari" element={<TermsOfUsePage />} />
              <Route
                path="*"
                element={
                  <div className="max-w-lg mx-auto py-20 text-center space-y-4">
                    <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                      Sayfa Bulunamadı
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Aradığınız sayfa mevcut değil veya taşınmış olabilir.
                    </p>
                    <Link to="/">
                      <Button className="bg-blue-700 hover:bg-blue-800 text-white">
                        Ana Sayfaya Dön
                      </Button>
                    </Link>
                  </div>
                }
              />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav
        aria-label="Mobil menü"
        className="md:hidden fixed bottom-0 left-0 z-50 w-full h-14 backdrop-blur-md bg-white/85 dark:bg-zinc-900/85 border-t border-stone-200 dark:border-zinc-800 flex items-center justify-around px-2"
      >
        <Link
          to="/"
          className={`flex flex-col items-center gap-0.5 text-[11px] font-medium transition-colors ${
            isNewsActive
              ? 'text-blue-700 dark:text-blue-400'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Newspaper className="w-5 h-5" />
          <span>Haberler</span>
        </Link>
        <Link
          to="/forum"
          className={`flex flex-col items-center gap-0.5 text-[11px] font-medium transition-colors ${
            isForumActive
              ? 'text-blue-700 dark:text-blue-400'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <MessageSquare className="w-5 h-5" />
          <span>Forum</span>
        </Link>
        <Link
          to="/admin"
          className={`flex flex-col items-center gap-0.5 text-[11px] font-medium transition-colors ${
            isAdminActive
              ? 'text-red-600 dark:text-red-400'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <ShieldCheck className="w-5 h-5" />
          <span>Yönetim</span>
        </Link>
      </nav>

      {/* Footer */}
      <footer className="bg-slate-900 dark:bg-zinc-950 text-slate-400 border-t border-slate-800 dark:border-zinc-800 py-8 px-4 pb-20 md:pb-8">
        <div className="container mx-auto max-w-5xl grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2 space-y-3">
            <div className="flex items-center gap-2 text-white">
              <SaturnLogo className="w-6 h-6" color="currentColor" />
              <span className="text-lg font-semibold tracking-tight">Bilnews</span>
            </div>
            <p className="max-w-sm text-xs sm:text-sm leading-relaxed text-slate-400">
              Okulumuz öğrencileri tarafından hazırlanan okul haberleri, duyurular ve öğrenci forumu.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3 text-xs uppercase tracking-wider">
              Platform
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li>
                <Link to="/" className="hover:text-white transition-colors">
                  Haberler
                </Link>
              </li>
              <li>
                <Link to="/forum" className="hover:text-white transition-colors">
                  Forum
                </Link>
              </li>
              <li>
                <Link to="/admin" className="hover:text-white transition-colors">
                  Yönetim Paneli
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3 text-xs uppercase tracking-wider">
              Yasal
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li>
                <Link to="/gizlilik" className="hover:text-white transition-colors">
                  Gizlilik Politikası
                </Link>
              </li>
              <li>
                <Link to="/kullanim-kosullari" className="hover:text-white transition-colors">
                  Kullanım Koşulları
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="container mx-auto max-w-5xl mt-8 pt-5 border-t border-slate-800 dark:border-zinc-800 text-center text-xs text-slate-500">
          © 2026 Bilnews · Öğrenci Yayını. Tüm hakları saklıdır.
        </div>
      </footer>
    </div>
  );
}
