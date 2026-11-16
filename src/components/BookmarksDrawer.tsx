import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useBilnews } from '@/src/context/BilnewsContext';
import SpringModal from '@/src/components/SpringModal';
import NewsCoverImage from '@/src/components/NewsCoverImage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bookmark, LogIn, Search, Trash2, ArrowRight, Loader2 } from 'lucide-react';
import { formatRelativeTurkishDate, normalizeCategory } from '@/src/lib/editorial';

export default function BookmarksDrawer() {
  const {
    user,
    bookmarks,
    bookmarksLoading,
    bookmarksDrawerOpen,
    setBookmarksDrawerOpen,
    removeBookmark,
    loginWithGoogle,
  } = useBilnews();
  const [filterQuery, setFilterQuery] = useState('');

  const filteredBookmarks = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    if (!q) return bookmarks;
    return bookmarks.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        normalizeCategory(b.category).toLowerCase().includes(q)
    );
  }, [bookmarks, filterQuery]);

  return (
    <SpringModal
      open={bookmarksDrawerOpen}
      onClose={() => setBookmarksDrawerOpen(false)}
      title="Kaydedilen Haberler"
      description={
        user
          ? `Okuma listenizde ${bookmarks.length} haber bulunuyor.`
          : 'Favori haberlerinizi hesabınızda saklayın.'
      }
      maxWidthClass="max-w-xl"
    >
      {!user ? (
        <div className="py-8 text-center space-y-4">
          <Bookmark className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Haberleri favorilere kaydetmek ve listenize her cihazdan ulaşmak için Google hesabınızla giriş yapın.
          </p>
          <Button
            type="button"
            onClick={loginWithGoogle}
            className="bg-blue-700 hover:bg-blue-800 text-white gap-2"
          >
            <LogIn className="w-4 h-4" />
            Google ile Giriş Yap
          </Button>
        </div>
      ) : bookmarksLoading ? (
        <div className="py-10 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : bookmarks.length === 0 ? (
        <div className="py-10 text-center space-y-2">
          <Bookmark className="w-9 h-9 mx-auto text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
            Henüz kaydettiğiniz bir haber yok.
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Beğendiğiniz haberlerdeki yer imi simgesine dokunarak listenize ekleyebilirsiniz.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookmarks.length > 3 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="search"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Kaydedilenlerde ara..."
                className="pl-9 h-9 bg-stone-50 dark:bg-zinc-800/70 border-stone-200 dark:border-zinc-700 text-sm"
              />
            </div>
          )}

          <div className="max-h-[60vh] overflow-y-auto divide-y divide-stone-100 dark:divide-zinc-800 pr-1">
            {filteredBookmarks.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                Aramanızla eşleşen kayıtlı haber bulunamadı.
              </p>
            ) : (
              filteredBookmarks.map((item) => (
                <div
                  key={item.id}
                  className="py-3.5 flex items-center justify-between gap-3"
                >
                  <Link
                    to={`/news/${item.articleId}`}
                    onClick={() => setBookmarksDrawerOpen(false)}
                    className="flex items-center gap-3 min-w-0 flex-1 group"
                  >
                    <div className="w-16 h-12 rounded-lg overflow-hidden bg-stone-100 dark:bg-zinc-800 shrink-0">
                      <NewsCoverImage
                        src={item.imageUrl || undefined}
                        category={item.category}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="font-semibold text-blue-700 dark:text-blue-400">
                          {normalizeCategory(item.category)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{formatRelativeTurkishDate(item.createdAt)}</span>
                      </div>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 group-hover:text-blue-700 dark:group-hover:text-blue-400 truncate">
                        {item.title}
                      </p>
                    </div>
                  </Link>

                  <div className="flex items-center gap-1 shrink-0">
                    <Link
                      to={`/news/${item.articleId}`}
                      onClick={() => setBookmarksDrawerOpen(false)}
                      aria-label="Habere git"
                      className="p-1.5 rounded-md text-slate-400 hover:text-blue-700 dark:hover:text-blue-400"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => removeBookmark(item.articleId)}
                      aria-label="Favorilerden çıkar"
                      className="p-1.5 rounded-md text-slate-400 hover:text-red-600 dark:hover:text-red-400 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </SpringModal>
  );
}
