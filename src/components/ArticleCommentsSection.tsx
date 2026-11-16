import React, { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { useBilnews } from '@/src/context/BilnewsContext';
import { ArticleComment } from '@/src/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Loader2, LogIn, MessageCircle, Send, Trash2 } from 'lucide-react';
import { formatRelativeTurkishDate, formatTurkishDate } from '@/src/lib/editorial';
import { toast } from 'sonner';

export default function ArticleCommentsSection({ articleId }: { articleId: string }) {
  const { user, isAuthorizedAdmin, loginWithGoogle } = useBilnews();
  const [comments, setComments] = useState<ArticleComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!articleId) return;
    let active = true;
    setLoading(true);

    const commentsQuery = query(
      collection(db, 'news', articleId, 'comments'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(
      commentsQuery,
      (snap) => {
        if (!active) return;
        setComments(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ArticleComment)));
        setLoading(false);
      },
      (error) => {
        if (!active) return;
        setLoading(false);
        handleFirestoreError(error, OperationType.LIST, `news/${articleId}/comments`);
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [articleId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Yorum yazmak için giriş yapmalısınız.');
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
      await addDoc(collection(db, 'news', articleId, 'comments'), {
        articleId,
        authorId: user.uid,
        authorName: (user.displayName || user.email?.split('@')[0] || 'Öğrenci').slice(0, 100),
        authorAvatar: user.photoURL ? user.photoURL.slice(0, 1000) : null,
        content: text,
        createdAt: serverTimestamp(),
      });
      setNewComment('');
      toast.success('Yorumunuz paylaşıldı.');
    } catch (error) {
      toast.error('Yorum gönderilemedi.');
      handleFirestoreError(error, OperationType.CREATE, `news/${articleId}/comments`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    setDeletingId(commentId);
    try {
      await deleteDoc(doc(db, 'news', articleId, 'comments', commentId));
      toast.info('Yorum kaldırıldı.');
    } catch (error) {
      toast.error('Yorum silinemedi.');
      handleFirestoreError(
        error,
        OperationType.DELETE,
        `news/${articleId}/comments/${commentId}`
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between border-b border-stone-200 dark:border-zinc-800 pb-3">
        <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2 text-slate-900 dark:text-slate-100 tabular-nums">
          <MessageCircle className="w-5 h-5 text-blue-700 dark:text-blue-400" />
          Öğrenci Yorumları ({comments.length})
        </h2>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((n) => (
            <div
              key={n}
              className="rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-2"
            >
              <div className="h-3 w-32 rounded bg-stone-200 dark:bg-zinc-800 animate-shimmer" />
              <div className="h-4 w-4/5 rounded bg-stone-200 dark:bg-zinc-800 animate-shimmer" />
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <div className="rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 text-center text-sm text-slate-500 dark:text-slate-400">
          Bu haber hakkında henüz yorum yapılmamış. İlk görüşü siz paylaşın.
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => {
            const canDelete = Boolean(
              user && (user.uid === comment.authorId || isAuthorizedAdmin)
            );
            return (
              <div
                key={comment.id}
                className="rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar className="w-7 h-7 border border-stone-200 dark:border-zinc-700 shrink-0">
                      <AvatarImage src={comment.authorAvatar || ''} alt={comment.authorName} />
                      <AvatarFallback className="text-[11px] bg-stone-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-200">
                        {(comment.authorName || 'Ö')[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {comment.authorName}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className="text-xs text-slate-400 dark:text-slate-500"
                      title={formatTurkishDate(comment.createdAt)}
                    >
                      {formatRelativeTurkishDate(comment.createdAt)}
                    </span>
                    {canDelete && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={deletingId === comment.id}
                        onClick={() => handleDelete(comment.id)}
                        aria-label="Yorumu sil"
                        className="h-7 w-7 text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                      >
                        {deletingId === comment.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {comment.content}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {user ? (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-3"
        >
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            Haber Hakkındaki Görüşünüz
          </label>
          <textarea
            placeholder="Düşüncelerinizi saygılı ve yapıcı bir dille paylaşın..."
            maxLength={1000}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="flex min-h-[96px] w-full rounded-md border border-stone-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800/70 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-slate-400 tabular-nums">
              {newComment.length}/1000
            </span>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !newComment.trim()}
              className="bg-blue-700 hover:bg-blue-800 text-white gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              Yorum Gönder
            </Button>
          </div>
        </form>
      ) : (
        <div className="rounded-xl border border-stone-200 dark:border-zinc-800 bg-stone-100/70 dark:bg-zinc-900 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Bu haberin altına yorum yazmak için giriş yapmalısınız.
          </p>
          <Button
            type="button"
            size="sm"
            onClick={loginWithGoogle}
            className="bg-blue-700 hover:bg-blue-800 text-white gap-2 shrink-0"
          >
            <LogIn className="w-3.5 h-3.5" />
            Google ile Giriş Yap
          </Button>
        </div>
      )}
    </section>
  );
}
