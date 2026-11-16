import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { useBilnews } from '@/src/context/BilnewsContext';
import { ForumComment, ForumPost } from '@/src/types';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft,
  MessageCircle,
  Send,
  Loader2,
  LogIn,
  MessageSquare,
} from 'lucide-react';
import {
  normalizeCategory,
  formatTurkishDate,
  formatRelativeTurkishDate,
} from '@/src/lib/editorial';
import { toast } from 'sonner';

export default function ForumDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, posts, postsLoading, loginWithGoogle } = useBilnews();

  const cachedPost = useMemo(
    () => posts.find((p) => p.id === id) || null,
    [posts, id]
  );

  const [fetchedPost, setFetchedPost] = useState<ForumPost | null>(null);
  const [fetchingPost, setFetchingPost] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const [comments, setComments] = useState<ForumComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [id]);

  // Direct deep-link fallback if post not yet in cached list
  useEffect(() => {
    if (!id) {
      setNotFound(true);
      return;
    }
    if (cachedPost) {
      setFetchedPost(null);
      setNotFound(false);
      return;
    }
    if (postsLoading) return;

    let active = true;
    setFetchingPost(true);
    setNotFound(false);

    getDoc(doc(db, 'forum_posts', id))
      .then((snap) => {
        if (!active) return;
        if (snap.exists()) {
          setFetchedPost({ id: snap.id, ...snap.data() } as ForumPost);
        } else {
          setNotFound(true);
        }
      })
      .catch(() => {
        if (active) setNotFound(true);
      })
      .finally(() => {
        if (active) setFetchingPost(false);
      });

    return () => {
      active = false;
    };
  }, [id, cachedPost, postsLoading]);

  // Real-time comments listener scoped to postId with strict cleanup
  useEffect(() => {
    if (!id) return;
    let active = true;
    setCommentsLoading(true);

    const commentsQuery = query(
      collection(db, `forum_posts/${id}/comments`),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(
      commentsQuery,
      (snap) => {
        if (!active) return;
        setComments(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ForumComment)));
        setCommentsLoading(false);
      },
      (error) => {
        if (!active) return;
        setCommentsLoading(false);
        handleFirestoreError(error, OperationType.LIST, `forum_posts/${id}/comments`);
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [id]);

  const post = cachedPost || fetchedPost;

  const handleCreateComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id) {
      toast.error('Yorum yapmak için giriş yapmalısınız.');
      return;
    }
    const text = newComment.trim();
    if (!text) {
      toast.error('Lütfen bir yorum yazın.');
      return;
    }
    if (text.length > 1000) {
      toast.error('Yorum en fazla 1.000 karakter olabilir.');
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, `forum_posts/${id}/comments`), {
        postId: id,
        content: text,
        authorId: user.uid,
        authorName: user.displayName || user.email?.split('@')[0] || 'Üye',
        createdAt: serverTimestamp(),
      });
      setNewComment('');
      toast.success('Yorumunuz eklendi!');
    } catch (error) {
      toast.error('Yorum gönderilemedi.');
      handleFirestoreError(error, OperationType.CREATE, `forum_posts/${id}/comments`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (postsLoading || fetchingPost) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="h-4 w-28 rounded bg-stone-200 dark:bg-zinc-800 animate-shimmer" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 sm:p-8 space-y-4">
            <div className="h-3 w-40 rounded bg-stone-200 dark:bg-zinc-800 animate-shimmer" />
            <div className="h-7 w-5/6 rounded bg-stone-200 dark:bg-zinc-800 animate-shimmer" />
            <div className="h-4 w-full rounded bg-stone-200 dark:bg-zinc-800 animate-shimmer" />
            <div className="h-4 w-3/4 rounded bg-stone-200 dark:bg-zinc-800 animate-shimmer" />
          </div>
          <div className="lg:col-span-4 rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-3">
            <div className="h-5 w-32 rounded bg-stone-200 dark:bg-zinc-800 animate-shimmer" />
            <div className="h-4 w-full rounded bg-stone-200 dark:bg-zinc-800 animate-shimmer" />
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center space-y-4">
        <MessageSquare className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
        <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          Tartışma Bulunamadı
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Aradığınız forum gönderisi silinmiş veya bağlantı geçersiz olabilir.
        </p>
        <Link to="/forum">
          <Button className="bg-blue-700 hover:bg-blue-800 text-white">
            Foruma Dön
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <Link
          to="/forum"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-blue-700 dark:hover:text-blue-400 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Foruma Dön
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-8">
          {/* Post Card */}
          <article className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                {normalizeCategory(post.category)}
              </span>
              <span aria-hidden="true">·</span>
              <span>{post.authorName}</span>
              <span aria-hidden="true">·</span>
              <span title={formatTurkishDate(post.createdAt)}>
                {formatRelativeTurkishDate(post.createdAt)}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 leading-snug">
              {post.title}
            </h1>

            <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed text-base">
              {post.content}
            </p>
          </article>

          {/* Comments Section */}
          <section className="space-y-5">
            <h2 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100 tabular-nums">
              <MessageCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Yorumlar ({comments.length})
            </h2>

            {commentsLoading ? (
              <div className="space-y-3">
                {[1, 2].map((n) => (
                  <div
                    key={n}
                    className="rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-2"
                  >
                    <div className="h-3 w-28 rounded bg-stone-200 dark:bg-zinc-800 animate-shimmer" />
                    <div className="h-4 w-4/5 rounded bg-stone-200 dark:bg-zinc-800 animate-shimmer" />
                  </div>
                ))}
              </div>
            ) : comments.length === 0 ? (
              <div className="rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                Henüz yorum yapılmamış. İlk yorumu siz yazın.
              </div>
            ) : (
              <div className="space-y-3">
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {comment.authorName}
                      </span>
                      <span
                        className="text-slate-400 dark:text-slate-500"
                        title={formatTurkishDate(comment.createdAt)}
                      >
                        {formatRelativeTurkishDate(comment.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                      {comment.content}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Comment Form or Login CTA */}
            {user ? (
              <form
                onSubmit={handleCreateComment}
                className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
              >
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  Yorumunuzu Yazın
                </label>
                <textarea
                  placeholder="Görüşünüzü paylaşın..."
                  maxLength={1000}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="flex min-h-[100px] w-full rounded-md border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800/70 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 tabular-nums">
                    {newComment.length}/1000
                  </span>
                  <Button
                    type="submit"
                    disabled={isSubmitting || !newComment.trim()}
                    className="bg-blue-700 hover:bg-blue-800 text-white gap-2"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Yorum Gönder
                  </Button>
                </div>
              </form>
            ) : (
              <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-stone-100/70 dark:bg-slate-900 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Yorum yapmak için giriş yapmalısınız.
                </p>
                <Button
                  type="button"
                  onClick={loginWithGoogle}
                  className="bg-blue-700 hover:bg-blue-800 text-white gap-2 shrink-0"
                >
                  <LogIn className="w-4 h-4" />
                  Giriş Yap
                </Button>
              </div>
            )}
          </section>
        </div>

        {/* Side Info */}
        <aside className="lg:col-span-4 space-y-4">
          <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-2.5">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Forum Kuralları
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Okul arkadaşlarınıza karşı saygılı bir dil kullanın, yapıcı eleştiri yapın ve konu başlığına uygun paylaşımlarda bulunun.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
