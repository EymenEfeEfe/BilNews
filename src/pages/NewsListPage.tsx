import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Search,
  ChevronRight,
  Newspaper,
  X,
  ArrowRight,
  Clock,
  Bookmark,
  Megaphone,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useBilnews } from '@/src/context/BilnewsContext';
import NewsCoverImage from '@/src/components/NewsCoverImage';
import WeeklyPollWidget from '@/src/components/WeeklyPollWidget';
import {
  normalizeCategory,
  formatTurkishDate,
  formatRelativeTurkishDate,
  estimateReadingTime,
  stripMarkdown,
} from '@/src/lib/editorial';

export default function NewsListPage() {
  const {
    news,
    newsLoading,
    categoryNames,
    isAuthorizedAdmin,
    bookmarkedIds,
    bookmarks,
    toggleBookmark,
    setBookmarksDrawerOpen,
    setTipModalOpen,
  } = useBilnews();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Tümü');

  const filterCategories = useMemo(
    () => ['Tümü', ...categoryNames],
    [categoryNames]
  );

  const filteredNews = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return news.filter((item) => {
      const cat = normalizeCategory(item.category);
      const matchesCategory = selectedCategory === 'Tümü' || cat === selectedCategory;
      if (!matchesCategory) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        stripMarkdown(item.content).toLowerCase().includes(q) ||
        cat.toLowerCase().includes(q) ||
        item.authorName.toLowerCase().includes(q)
      );
    });
  }, [news, searchQuery, selectedCategory]);

  const showLeadSplit =
    !newsLoading &&
    selectedCategory === 'Tümü' &&
    searchQuery.trim() === '' &&
    filteredNews.length > 0;

  const leadArticle = showLeadSplit ? filteredNews[0] : null;
  const gridArticles = showLeadSplit ? filteredNews.slice(1) : filteredNews;

  return (
    <div className="space-y-6">
      {/* Compact Masthead & Search */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-stone-200 dark:border-zinc-800 pb-5">
        <div className="space-y-1">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Okul Haberleri
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Okuldan duyurular, kulüp etkinlikleri ve öğrenci gündemi
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="search"
              className="pl-9 pr-8 bg-white dark:bg-zinc-900 border-stone-200 dark:border-zinc-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 h-9 text-sm"
              placeholder="Haberlerde ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Haberlerde ara"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1"
                aria-label="Aramayı temizle"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setTipModalOpen(true)}
            className="h-9 gap-1.5 border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 whitespace-nowrap shrink-0"
          >
            <Megaphone className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
            İhbar Gönder
          </Button>
        </div>
      </div>

      {/* Category Filter Controls */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {filterCategories.map((category) => {
          const isActive = selectedCategory === category;
          return (
            <motion.button
              key={category}
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                isActive
                  ? 'bg-blue-700 text-white dark:bg-blue-600 shadow-sm'
                  : 'bg-stone-100 text-slate-700 hover:bg-stone-200 dark:bg-zinc-800/80 dark:text-slate-300 dark:hover:bg-zinc-800'
              }`}
            >
              {category}
            </motion.button>
          );
        })}
      </div>

      {/* Asymmetric 2-Column Editorial Layout (Main Feed + Compact Engagement Sidebar) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
        {/* Main News Column */}
        <div className="lg:col-span-8 space-y-6">
          {/* Shimmer Skeleton Loaders */}
          {newsLoading && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-12 rounded-xl overflow-hidden border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                <div className="md:col-span-6 aspect-video md:min-h-[240px] bg-stone-200 dark:bg-zinc-800 animate-shimmer" />
                <div className="md:col-span-6 p-6 space-y-4">
                  <div className="h-3 w-36 rounded bg-stone-200 dark:bg-zinc-800 animate-shimmer" />
                  <div className="h-6 w-11/12 rounded bg-stone-200 dark:bg-zinc-800 animate-shimmer" />
                  <div className="h-4 w-full rounded bg-stone-200 dark:bg-zinc-800 animate-shimmer" />
                  <div className="h-4 w-3/4 rounded bg-stone-200 dark:bg-zinc-800 animate-shimmer" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {[1, 2, 3, 4].map((n) => (
                  <div
                    key={n}
                    className="rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden"
                  >
                    <div className="aspect-video bg-stone-200 dark:bg-zinc-800 animate-shimmer" />
                    <div className="p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="h-3 w-24 bg-stone-200 dark:bg-zinc-800 rounded animate-shimmer" />
                        <div className="h-4 w-16 bg-stone-200 dark:bg-zinc-800 rounded animate-shimmer" />
                      </div>
                      <div className="h-5 w-full bg-stone-200 dark:bg-zinc-800 rounded animate-shimmer" />
                      <div className="h-4 w-4/5 bg-stone-200 dark:bg-zinc-800 rounded animate-shimmer" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty States */}
          {!newsLoading && news.length === 0 && (
            <div className="py-16 px-6 text-center rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3">
              <Newspaper className="w-9 h-9 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                Henüz yayınlanmış bir okul haberi bulunmuyor.
              </p>
              {isAuthorizedAdmin ? (
                <div className="space-y-3 pt-1">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Yönetim Paneli üzerinden ilk haberi ekleyebilirsiniz.
                  </p>
                  <Link to="/admin">
                    <Button size="sm" className="bg-blue-700 hover:bg-blue-800 text-white">
                      Yönetim Paneline Git
                    </Button>
                  </Link>
                </div>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Yeni haber ve duyurular eklendikçe burada görünecektir.
                </p>
              )}
            </div>
          )}

          {!newsLoading && news.length > 0 && filteredNews.length === 0 && (
            <div className="py-14 px-6 text-center rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3">
              <Search className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
              {searchQuery.trim() !== '' ? (
                <>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    &ldquo;{searchQuery.trim()}&rdquo; ile eşleşen haber bulunamadı.
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Lütfen farklı anahtar kelimeler deneyin.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('Tümü');
                    }}
                  >
                    Aramayı Temizle
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    &ldquo;{selectedCategory}&rdquo; kategorisinde henüz haber bulunmuyor.
                  </p>
                  <Button variant="outline" size="sm" onClick={() => setSelectedCategory('Tümü')}>
                    Tüm Haberleri Göster
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Lead Story Feature */}
          {leadArticle && (
            <div className="relative group rounded-xl overflow-hidden border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-blue-300 dark:hover:border-blue-800 hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
              <motion.button
                type="button"
                whileTap={{ scale: 0.92 }}
                onClick={() => toggleBookmark(leadArticle)}
                aria-label={
                  bookmarkedIds.has(leadArticle.id)
                    ? 'Kaydedilenlerden çıkar'
                    : 'Haberi kaydet'
                }
                title={
                  bookmarkedIds.has(leadArticle.id)
                    ? 'Kaydedildi'
                    : 'Kaydedilenlere ekle'
                }
                className={`absolute top-3 right-3 z-10 p-2 rounded-lg border backdrop-blur-sm transition-colors cursor-pointer ${
                  bookmarkedIds.has(leadArticle.id)
                    ? 'bg-amber-50/95 border-amber-300 text-amber-600 dark:bg-amber-950/85 dark:border-amber-700 dark:text-amber-400'
                    : 'bg-white/85 border-stone-200/80 text-slate-600 hover:text-blue-700 dark:bg-zinc-900/85 dark:border-zinc-700 dark:text-slate-300'
                }`}
              >
                <Bookmark
                  className={`w-4 h-4 ${
                    bookmarkedIds.has(leadArticle.id) ? 'fill-current' : ''
                  }`}
                />
              </motion.button>

              <Link
                to={`/news/${leadArticle.id}`}
                className="grid grid-cols-1 md:grid-cols-12 items-stretch"
              >
                <div className="md:col-span-6 aspect-video md:aspect-auto md:min-h-[250px] bg-stone-100 dark:bg-zinc-800 overflow-hidden">
                  <NewsCoverImage
                    src={leadArticle.imageUrl}
                    category={leadArticle.category}
                    alt={leadArticle.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="md:col-span-6 p-5 sm:p-6 pr-12 md:pr-12 flex flex-col justify-between gap-4">
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-blue-700 dark:text-blue-400 font-semibold">
                          {normalizeCategory(leadArticle.category)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span title={formatTurkishDate(leadArticle.createdAt)}>
                          {formatRelativeTurkishDate(leadArticle.createdAt)}
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        <Clock className="w-3 h-3" />
                        {estimateReadingTime(leadArticle.content)}
                      </span>
                    </div>

                    <h3 className="text-xl sm:text-2xl font-semibold tracking-tight leading-snug text-slate-900 dark:text-slate-100 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
                      {leadArticle.title}
                    </h3>

                    <p className="text-slate-600 dark:text-slate-400 text-sm line-clamp-3 leading-relaxed">
                      {stripMarkdown(leadArticle.content)}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-stone-100 dark:border-zinc-800 text-xs text-slate-500 dark:text-slate-400">
                    <span>{leadArticle.authorName}</span>
                    <span className="inline-flex items-center gap-1 font-medium text-blue-700 dark:text-blue-400">
                      Haberi Oku <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </div>
              </Link>
            </div>
          )}

          {/* Secondary Grid */}
          {!newsLoading && gridArticles.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {gridArticles.map((item) => {
                const isSaved = bookmarkedIds.has(item.id);
                return (
                  <div
                    key={item.id}
                    className="relative group rounded-xl overflow-hidden border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-blue-300 dark:hover:border-blue-800 hover:-translate-y-1 hover:shadow-xl transition-all duration-300 flex flex-col h-full"
                  >
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.92 }}
                      onClick={() => toggleBookmark(item)}
                      aria-label={isSaved ? 'Kaydedilenlerden çıkar' : 'Haberi kaydet'}
                      title={isSaved ? 'Kaydedildi' : 'Kaydedilenlere ekle'}
                      className={`absolute top-2.5 right-2.5 z-10 p-1.5 rounded-lg border backdrop-blur-sm transition-colors cursor-pointer ${
                        isSaved
                          ? 'bg-amber-50/95 border-amber-300 text-amber-600 dark:bg-amber-950/85 dark:border-amber-700 dark:text-amber-400'
                          : 'bg-white/85 border-stone-200/80 text-slate-600 hover:text-blue-700 dark:bg-zinc-900/85 dark:border-zinc-700 dark:text-slate-300'
                      }`}
                    >
                      <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
                    </motion.button>

                    <Link to={`/news/${item.id}`} className="flex flex-col flex-1">
                      <div className="aspect-video bg-stone-100 dark:bg-zinc-800 overflow-hidden relative">
                        <NewsCoverImage
                          src={item.imageUrl}
                          category={item.category}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-3">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="font-semibold text-blue-700 dark:text-blue-400 truncate">
                                {normalizeCategory(item.category)}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span
                                className="truncate"
                                title={formatTurkishDate(item.createdAt)}
                              >
                                {formatRelativeTurkishDate(item.createdAt)}
                              </span>
                            </div>
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 shrink-0">
                              <Clock className="w-3 h-3" />
                              {estimateReadingTime(item.content)}
                            </span>
                          </div>

                          <h3 className="text-base sm:text-lg font-semibold tracking-tight leading-snug text-slate-900 dark:text-slate-100 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                            {item.title}
                          </h3>

                          <p className="text-slate-600 dark:text-slate-400 text-sm line-clamp-3 leading-relaxed">
                            {stripMarkdown(item.content)}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-stone-100 dark:border-zinc-800 text-xs">
                          <span className="text-slate-500 dark:text-slate-400 truncate max-w-[150px]">
                            {item.authorName}
                          </span>
                          <span className="inline-flex items-center font-medium text-blue-700 dark:text-blue-400 whitespace-nowrap shrink-0">
                            Oku <ChevronRight className="w-3.5 h-3.5 ml-0.5 group-hover:translate-x-0.5 transition-transform" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Compact Engagement Sidebar */}
        <aside className="lg:col-span-4 space-y-5 lg:sticky lg:top-20">
          {/* Weekly Student Poll */}
          <WeeklyPollWidget />

          {/* Student News Tip Callout */}
          <section className="rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400">
              <Megaphone className="w-3.5 h-3.5" />
              Öğrenci İhbar Hattı
            </div>
            <h3 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              Okulda Bir Gelişme mi Var?
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Kulüp etkinlikleri, turnuva sonuçları veya okul gündemiyle ilgili haber değerindeki olayları editörlerimize iletin.
            </p>
            <Button
              type="button"
              size="sm"
              onClick={() => setTipModalOpen(true)}
              className="w-full bg-blue-700 hover:bg-blue-800 text-white gap-2"
            >
              <Megaphone className="w-3.5 h-3.5" />
              Haber İhbarı Gönder
            </Button>
          </section>

          {/* Saved Articles Quick Card */}
          <section className="rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <Bookmark className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                Okuma Listem
              </span>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                {bookmarks.length} haber
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Daha sonra okumak istediğiniz haberleri kartlardaki yer imiyle buraya kaydedebilirsiniz.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setBookmarksDrawerOpen(true)}
              className="w-full border-stone-200 dark:border-zinc-700 gap-2"
            >
              <Bookmark className="w-3.5 h-3.5" />
              Kaydedilenleri Aç
            </Button>
          </section>
        </aside>
      </div>
    </div>
  );
}
