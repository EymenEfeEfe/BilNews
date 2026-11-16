import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, ChevronRight, Newspaper, X, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useBilnews } from '@/src/context/BilnewsContext';
import NewsCoverImage from '@/src/components/NewsCoverImage';
import {
  normalizeCategory,
  formatTurkishDate,
  estimateReadingTime,
  stripMarkdown,
} from '@/src/lib/editorial';

export default function NewsListPage() {
  const { news, newsLoading, categoryNames, isAuthorizedAdmin } = useBilnews();
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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-stone-200 dark:border-slate-800 pb-5">
        <div className="space-y-1">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Okul Haberleri
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Okuldan duyurular, kulüp etkinlikleri ve öğrenci gündemi
          </p>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            type="search"
            className="pl-9 pr-8 bg-white dark:bg-slate-900 border-stone-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 h-9 text-sm"
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
      </div>

      {/* Category Filter Controls */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {filterCategories.map((category) => {
          const isActive = selectedCategory === category;
          return (
            <button
              key={category}
              type="button"
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                isActive
                  ? 'bg-blue-700 text-white dark:bg-blue-600'
                  : 'bg-stone-100 text-slate-700 hover:bg-stone-200 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              {category}
            </button>
          );
        })}
      </div>

      {/* Loading Skeleton */}
      {newsLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3 animate-pulse"
            >
              <div className="h-3 w-24 bg-stone-200 dark:bg-slate-800 rounded" />
              <div className="h-5 w-full bg-stone-200 dark:bg-slate-800 rounded" />
              <div className="h-4 w-4/5 bg-stone-200 dark:bg-slate-800 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Empty States */}
      {!newsLoading && news.length === 0 && (
        <div className="py-16 px-6 text-center rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
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
        <div className="py-14 px-6 text-center rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
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
        <Link
          to={`/news/${leadArticle.id}`}
          className="group grid grid-cols-1 lg:grid-cols-12 items-stretch rounded-xl overflow-hidden border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-300 dark:hover:border-blue-800 transition-colors"
        >
          <div className="lg:col-span-6 aspect-video lg:aspect-auto lg:min-h-[260px] bg-stone-100 dark:bg-slate-800 overflow-hidden">
            <NewsCoverImage
              src={leadArticle.imageUrl}
              category={leadArticle.category}
              alt={leadArticle.title}
              className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
            />
          </div>
          <div className="lg:col-span-6 p-5 sm:p-6 flex flex-col justify-between gap-4">
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                <span className="text-blue-700 dark:text-blue-400 font-semibold">
                  {normalizeCategory(leadArticle.category)}
                </span>
                <span aria-hidden="true">·</span>
                <span>{formatTurkishDate(leadArticle.createdAt)}</span>
                <span aria-hidden="true">·</span>
                <span>{estimateReadingTime(leadArticle.content)}</span>
              </div>

              <h3 className="text-xl sm:text-2xl font-semibold tracking-tight leading-snug text-slate-900 dark:text-slate-100 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
                {leadArticle.title}
              </h3>

              <p className="text-slate-600 dark:text-slate-400 text-sm line-clamp-3 leading-relaxed">
                {stripMarkdown(leadArticle.content)}
              </p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-stone-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
              <span>{leadArticle.authorName}</span>
              <span className="inline-flex items-center gap-1 font-medium text-blue-700 dark:text-blue-400">
                Haberi Oku <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </Link>
      )}

      {/* Secondary Grid */}
      {!newsLoading && gridArticles.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {gridArticles.map((item) => (
            <Link
              key={item.id}
              to={`/news/${item.id}`}
              className="group rounded-xl overflow-hidden border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-300 dark:hover:border-blue-800 transition-colors flex flex-col h-full"
            >
              <div className="aspect-video bg-stone-100 dark:bg-slate-800 overflow-hidden">
                <NewsCoverImage
                  src={item.imageUrl}
                  category={item.category}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                />
              </div>
              <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-blue-700 dark:text-blue-400">
                      {normalizeCategory(item.category)}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{formatTurkishDate(item.createdAt)}</span>
                  </div>

                  <h3 className="text-base sm:text-lg font-semibold tracking-tight leading-snug text-slate-900 dark:text-slate-100 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                    {item.title}
                  </h3>

                  <p className="text-slate-600 dark:text-slate-400 text-sm line-clamp-3 leading-relaxed">
                    {stripMarkdown(item.content)}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-stone-100 dark:border-slate-800 text-xs">
                  <span className="text-slate-500 dark:text-slate-400 truncate max-w-[150px]">
                    {item.authorName}
                  </span>
                  <span className="inline-flex items-center font-medium text-blue-700 dark:text-blue-400 whitespace-nowrap shrink-0">
                    Oku <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
