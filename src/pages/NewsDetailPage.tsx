import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { useBilnews } from '@/src/context/BilnewsContext';
import { NewsArticle } from '@/src/types';
import NewsCoverImage from '@/src/components/NewsCoverImage';
import MarkdownRenderer from '@/src/components/MarkdownRenderer';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft,
  Link2,
  Check,
  Share2,
  MessageCircle,
  Loader2,
  Newspaper,
  ChevronRight,
} from 'lucide-react';
import {
  normalizeCategory,
  formatTurkishDate,
  estimateReadingTime,
} from '@/src/lib/editorial';
import { toast } from 'sonner';

export default function NewsDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { allNews, news, newsLoading, isAuthorizedAdmin } = useBilnews();

  const cachedArticle = useMemo(
    () => allNews.find((item) => item.id === id) || null,
    [allNews, id]
  );

  const [fetchedArticle, setFetchedArticle] = useState<NewsArticle | null>(null);
  const [fetchingDirect, setFetchingDirect] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [id]);

  useEffect(() => {
    if (!id) {
      setNotFound(true);
      return;
    }
    if (cachedArticle) {
      setFetchedArticle(null);
      setNotFound(false);
      return;
    }
    if (newsLoading) return;

    let active = true;
    setFetchingDirect(true);
    setNotFound(false);

    getDoc(doc(db, 'news', id))
      .then((snap) => {
        if (!active) return;
        if (snap.exists()) {
          setFetchedArticle({ id: snap.id, ...snap.data() } as NewsArticle);
        } else {
          setNotFound(true);
        }
      })
      .catch(() => {
        if (!active) return;
        setNotFound(true);
      })
      .finally(() => {
        if (active) setFetchingDirect(false);
      });

    return () => {
      active = false;
    };
  }, [id, cachedArticle, newsLoading]);

  const rawArticle = cachedArticle || fetchedArticle;
  const isHiddenDraft = rawArticle?.status === 'draft' && !isAuthorizedAdmin;
  const article = isHiddenDraft ? null : rawArticle;

  const relatedArticles = useMemo(() => {
    if (!article) return [];
    const currentCat = normalizeCategory(article.category);
    const sameCategory = news.filter(
      (n) => n.id !== article.id && normalizeCategory(n.category) === currentCat
    );
    if (sameCategory.length >= 2) {
      return sameCategory.slice(0, 3);
    }
    const others = news.filter(
      (n) => n.id !== article.id && normalizeCategory(n.category) !== currentCat
    );
    return [...sameCategory, ...others].slice(0, 3);
  }, [news, article]);

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Haber bağlantısı panoya kopyalandı!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Bağlantı kopyalanamadı.');
    }
  };

  if (newsLoading || fetchingDirect) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 gap-3">
        <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
        <p className="text-sm">Haber yükleniyor...</p>
      </div>
    );
  }

  if (notFound || !article) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center space-y-4">
        <Newspaper className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
        <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          Haber Bulunamadı
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Aradığınız haber yayından kaldırılmış, taslak aşamasında veya bağlantı geçersiz olabilir.
        </p>
        <Link to="/">
          <Button size="sm" className="bg-blue-700 hover:bg-blue-800 text-white">
            Haberlere Dön
          </Button>
        </Link>
      </div>
    );
  }

  const normalizedCat = normalizeCategory(article.category);
  const xShareHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    article.title
  )}&url=${encodeURIComponent(shareUrl)}`;
  const whatsappShareHref = `https://wa.me/?text=${encodeURIComponent(
    `${article.title} — ${shareUrl}`
  )}`;

  return (
    <div className="max-w-3xl mx-auto space-y-10">
      <div className="flex items-center justify-between gap-4">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-blue-700 dark:hover:text-blue-400 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Haberlere Dön
        </Link>

        {article.status === 'draft' && isAuthorizedAdmin && (
          <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
            Taslak Önizlemesi (Yalnızca Yönetici Görür)
          </span>
        )}
      </div>

      <article className="rounded-xl overflow-hidden border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="aspect-video bg-stone-100 dark:bg-slate-800 overflow-hidden">
          <NewsCoverImage
            src={article.imageUrl}
            category={article.category}
            alt={article.title}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="p-5 sm:p-8 space-y-6">
          <header className="space-y-3 border-b border-stone-200 dark:border-slate-800 pb-5">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              <span className="text-blue-700 dark:text-blue-400 font-semibold">
                {normalizedCat}
              </span>
              <span aria-hidden="true">·</span>
              <span>{article.authorName}</span>
              <span aria-hidden="true">·</span>
              <span>{formatTurkishDate(article.createdAt)}</span>
              <span aria-hidden="true">·</span>
              <span>{estimateReadingTime(article.content)}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight leading-snug text-slate-900 dark:text-slate-100">
              {article.title}
            </h1>
          </header>

          <div className="max-w-2xl">
            <MarkdownRenderer content={article.content} dropCap />
          </div>

          {/* Share & Copy Actions */}
          <div className="pt-6 border-t border-stone-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Share2 className="w-4 h-4" />
              Haberi Paylaş
            </span>

            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="gap-2 border-stone-200 dark:border-slate-700"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    Kopyalandı
                  </>
                ) : (
                  <>
                    <Link2 className="w-4 h-4" />
                    Bağlantıyı Kopyala
                  </>
                )}
              </Button>

              <a
                href={xShareHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
              >
                X&apos;te Paylaş
              </a>

              <a
                href={whatsappShareHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                WhatsApp&apos;ta Paylaş
              </a>
            </div>
          </div>
        </div>
      </article>

      {/* Related News */}
      {relatedArticles.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-stone-200 dark:border-slate-800 pb-3">
            <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              İlginizi Çekebilir
            </h2>
            <Link
              to="/"
              className="text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline"
            >
              Tüm Haberler
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {relatedArticles.map((rel) => (
              <Link
                key={rel.id}
                to={`/news/${rel.id}`}
                className="group rounded-xl overflow-hidden border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-300 dark:hover:border-blue-800 transition-colors flex flex-col"
              >
                <div className="aspect-video bg-stone-100 dark:bg-slate-800 overflow-hidden">
                  <NewsCoverImage
                    src={rel.imageUrl}
                    category={rel.category}
                    alt={rel.title}
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                  />
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <span className="text-blue-700 dark:text-blue-400 font-semibold">
                        {normalizeCategory(rel.category)}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{formatTurkishDate(rel.createdAt)}</span>
                    </div>
                    <h3 className="text-sm sm:text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100 group-hover:text-blue-700 dark:group-hover:text-blue-400 line-clamp-2 leading-snug">
                      {rel.title}
                    </h3>
                  </div>
                  <span className="inline-flex items-center text-xs font-medium text-blue-700 dark:text-blue-400">
                    Oku <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
