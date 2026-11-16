import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { useBilnews } from '@/src/context/BilnewsContext';
import { NewsArticle } from '@/src/types';
import NewsCoverImage from '@/src/components/NewsCoverImage';
import MarkdownRenderer from '@/src/components/MarkdownRenderer';
import SpringModal from '@/src/components/SpringModal';
import ArticleReactionsBar from '@/src/components/ArticleReactionsBar';
import ArticleCommentsSection from '@/src/components/ArticleCommentsSection';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft,
  Link2,
  Check,
  Share2,
  MessageCircle,
  Newspaper,
  ChevronRight,
  Clock,
  Maximize2,
  Bookmark,
} from 'lucide-react';
import {
  normalizeCategory,
  formatTurkishDate,
  formatRelativeTurkishDate,
  estimateReadingTime,
} from '@/src/lib/editorial';
import { toast } from 'sonner';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: 'easeOut' as const },
  },
};

export default function NewsDetailPage() {
  const { id } = useParams<{ id: string }>();
  const {
    allNews,
    news,
    newsLoading,
    isAuthorizedAdmin,
    bookmarkedIds,
    toggleBookmark,
  } = useBilnews();

  const cachedArticle = useMemo(
    () => allNews.find((item) => item.id === id) || null,
    [allNews, id]
  );

  const [fetchedArticle, setFetchedArticle] = useState<NewsArticle | null>(null);
  const [fetchingDirect, setFetchingDirect] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);

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
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="h-4 w-28 rounded bg-stone-200 dark:bg-zinc-800 animate-shimmer" />
        <div className="rounded-xl overflow-hidden border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="aspect-video bg-stone-200 dark:bg-zinc-800 animate-shimmer" />
          <div className="p-6 sm:p-8 space-y-4">
            <div className="h-3 w-48 rounded bg-stone-200 dark:bg-zinc-800 animate-shimmer" />
            <div className="h-8 w-11/12 rounded bg-stone-200 dark:bg-zinc-800 animate-shimmer" />
            <div className="h-4 w-full rounded bg-stone-200 dark:bg-zinc-800 animate-shimmer" />
            <div className="h-4 w-5/6 rounded bg-stone-200 dark:bg-zinc-800 animate-shimmer" />
            <div className="h-4 w-3/4 rounded bg-stone-200 dark:bg-zinc-800 animate-shimmer" />
          </div>
        </div>
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
  const isSaved = bookmarkedIds.has(article.id);
  const xShareHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    article.title
  )}&url=${encodeURIComponent(shareUrl)}`;
  const whatsappShareHref = `https://wa.me/?text=${encodeURIComponent(
    `${article.title} — ${shareUrl}`
  )}`;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-3xl mx-auto space-y-10"
    >
      <motion.div variants={itemVariants} className="flex items-center justify-between gap-4">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-blue-700 dark:hover:text-blue-400 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Haberlere Dön
        </Link>

        <div className="flex items-center gap-3">
          {article.status === 'draft' && isAuthorizedAdmin && (
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
              Taslak Önizlemesi
            </span>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => toggleBookmark(article)}
            className={`gap-1.5 whitespace-nowrap shrink-0 ${
              isSaved
                ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                : 'border-stone-200 dark:border-zinc-700'
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
            {isSaved ? 'Kaydedildi' : 'Kaydet'}
          </Button>
        </div>
      </motion.div>

      <article className="rounded-xl overflow-hidden border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
        {/* Staggered Cover Photo with Lightbox Trigger */}
        <motion.div
          variants={itemVariants}
          className="relative group aspect-video bg-stone-100 dark:bg-zinc-800 overflow-hidden cursor-pointer"
          onClick={() => setImageModalOpen(true)}
        >
          <NewsCoverImage
            src={article.imageUrl}
            category={article.category}
            alt={article.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-950/65 text-white text-[11px] font-medium opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs">
            <Maximize2 className="w-3 h-3" />
            Görseli Büyüt
          </span>
        </motion.div>

        <div className="p-5 sm:p-8 space-y-6">
          {/* Staggered Header */}
          <motion.header
            variants={itemVariants}
            className="space-y-3 border-b border-stone-200 dark:border-zinc-800 pb-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-blue-700 dark:text-blue-400 font-semibold">
                  {normalizedCat}
                </span>
                <span aria-hidden="true">·</span>
                <span>{article.authorName}</span>
                <span aria-hidden="true">·</span>
                <span title={formatTurkishDate(article.createdAt)}>
                  {formatRelativeTurkishDate(article.createdAt)} ({formatTurkishDate(article.createdAt)})
                </span>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                <Clock className="w-3 h-3" />
                {estimateReadingTime(article.content)}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight leading-snug text-slate-900 dark:text-slate-100">
              {article.title}
            </h1>
          </motion.header>

          {/* Staggered Body */}
          <motion.div variants={itemVariants} className="max-w-2xl">
            <MarkdownRenderer content={article.content} />
          </motion.div>

          {/* Staggered Student Emoji Reactions */}
          <motion.div variants={itemVariants}>
            <ArticleReactionsBar articleId={article.id} />
          </motion.div>

          {/* Staggered Share & Copy Actions */}
          <motion.div
            variants={itemVariants}
            className="pt-6 border-t border-stone-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
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
                className="gap-2 border-stone-200 dark:border-zinc-700"
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

              <motion.a
                whileTap={{ scale: 0.96 }}
                href={xShareHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium border border-stone-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 text-slate-800 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-zinc-700 transition-colors whitespace-nowrap shrink-0"
              >
                X&apos;te Paylaş
              </motion.a>

              <motion.a
                whileTap={{ scale: 0.96 }}
                href={whatsappShareHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium border border-stone-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 text-slate-800 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-zinc-700 transition-colors whitespace-nowrap shrink-0"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                WhatsApp&apos;ta Paylaş
              </motion.a>
            </div>
          </motion.div>
        </div>
      </article>

      {/* Staggered Student Comments */}
      <motion.div variants={itemVariants}>
        <ArticleCommentsSection articleId={article.id} />
      </motion.div>

      {/* Staggered Related News */}
      {relatedArticles.length > 0 && (
        <motion.section variants={itemVariants} className="space-y-4">
          <div className="flex items-center justify-between border-b border-stone-200 dark:border-zinc-800 pb-3">
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
                className="group rounded-xl overflow-hidden border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-blue-300 dark:hover:border-blue-800 hover:-translate-y-1 hover:shadow-xl transition-all duration-300 flex flex-col"
              >
                <div className="aspect-video bg-stone-100 dark:bg-zinc-800 overflow-hidden">
                  <NewsCoverImage
                    src={rel.imageUrl}
                    category={rel.category}
                    alt={rel.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-blue-700 dark:text-blue-400 font-semibold">
                          {normalizeCategory(rel.category)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{formatRelativeTurkishDate(rel.createdAt)}</span>
                      </div>
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-500 dark:text-slate-400 shrink-0">
                        <Clock className="w-2.5 h-2.5" />
                        {estimateReadingTime(rel.content)}
                      </span>
                    </div>
                    <h3 className="text-sm sm:text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100 group-hover:text-blue-700 dark:group-hover:text-blue-400 line-clamp-2 leading-snug">
                      {rel.title}
                    </h3>
                  </div>
                  <span className="inline-flex items-center text-xs font-medium text-blue-700 dark:text-blue-400">
                    Oku <ChevronRight className="w-3.5 h-3.5 ml-0.5 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </motion.section>
      )}

      {/* Spring-Animated Cover Lightbox Modal */}
      <SpringModal
        open={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        title={article.title}
        description={`${normalizedCat} · ${formatTurkishDate(article.createdAt)}`}
        maxWidthClass="max-w-2xl"
      >
        <div className="rounded-xl overflow-hidden bg-stone-100 dark:bg-zinc-800 aspect-video">
          <NewsCoverImage
            src={article.imageUrl}
            category={article.category}
            alt={article.title}
            className="w-full h-full object-cover"
          />
        </div>
      </SpringModal>
    </motion.div>
  );
}
