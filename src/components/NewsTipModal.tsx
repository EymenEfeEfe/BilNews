import React, { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { useBilnews } from '@/src/context/BilnewsContext';
import { NewsTip, NewsTipStatus } from '@/src/types';
import SpringModal from '@/src/components/SpringModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, LogIn, Megaphone, Send, Trash2 } from 'lucide-react';
import { formatRelativeTurkishDate } from '@/src/lib/editorial';
import { toast } from 'sonner';

const STATUS_LABELS: Record<NewsTipStatus, { text: string; className: string }> = {
  pending: {
    text: 'İnceleniyor',
    className: 'text-amber-700 dark:text-amber-400',
  },
  reviewed: {
    text: 'Değerlendirildi',
    className: 'text-emerald-700 dark:text-emerald-400',
  },
  archived: {
    text: 'Arşivlendi',
    className: 'text-slate-500 dark:text-slate-400',
  },
};

function getTimeMillis(ts: any): number {
  if (!ts) return 0;
  try {
    if (typeof ts.toMillis === 'function') return ts.toMillis();
    if (typeof ts.toDate === 'function') return ts.toDate().getTime();
    return 0;
  } catch {
    return 0;
  }
}

export default function NewsTipModal() {
  const { user, categoryNames, tipModalOpen, setTipModalOpen, loginWithGoogle } = useBilnews();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(categoryNames[0] || 'Okul Gündemi');
  const [details, setDetails] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [myTips, setMyTips] = useState<NewsTip[]>([]);
  const [myTipsLoading, setMyTipsLoading] = useState(false);

  useEffect(() => {
    if (!tipModalOpen || !user) {
      setMyTips([]);
      return;
    }

    let active = true;
    setMyTipsLoading(true);
    const tipsQuery = query(
      collection(db, 'news_tips'),
      where('authorId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(
      tipsQuery,
      (snap) => {
        if (!active) return;
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as NewsTip));
        list.sort((a, b) => getTimeMillis(b.createdAt) - getTimeMillis(a.createdAt));
        setMyTips(list);
        setMyTipsLoading(false);
      },
      (error) => {
        if (!active) return;
        setMyTipsLoading(false);
        handleFirestoreError(error, OperationType.LIST, 'news_tips');
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [tipModalOpen, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.info('İhbar göndermek için giriş yapmalısınız.');
      await loginWithGoogle();
      return;
    }

    const cleanTitle = title.trim();
    const cleanDetails = details.trim();
    if (!cleanTitle || !cleanDetails) {
      toast.error('Konu başlığı ve olay detayı zorunludur.');
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'news_tips'), {
        title: cleanTitle.slice(0, 200),
        details: cleanDetails.slice(0, 3000),
        category: (category || 'Okul Gündemi').slice(0, 50),
        authorId: user.uid,
        authorName: (user.displayName || user.email?.split('@')[0] || 'Öğrenci').slice(0, 100),
        isAnonymous,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      setTitle('');
      setDetails('');
      setIsAnonymous(false);
      toast.success('Haber ihbarınız editör masasına iletildi!');
    } catch (error) {
      toast.error('İhbar gönderilemedi.');
      handleFirestoreError(error, OperationType.CREATE, 'news_tips');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdraw = async (tipId: string) => {
    try {
      await deleteDoc(doc(db, 'news_tips', tipId));
      toast.info('İhbarınız geri çekildi.');
    } catch (error) {
      toast.error('İhbar silinemedi.');
      handleFirestoreError(error, OperationType.DELETE, `news_tips/${tipId}`);
    }
  };

  return (
    <SpringModal
      open={tipModalOpen}
      onClose={() => setTipModalOpen(false)}
      title="Okuldan Haber İhbarı Gönder"
      description="Okulda gördüğünüz etkinlikleri, duyuruları veya gündem konularını öğrenci editörlere bildirin."
      maxWidthClass="max-w-xl"
    >
      {!user ? (
        <div className="py-6 text-center space-y-4">
          <Megaphone className="w-10 h-10 mx-auto text-blue-700 dark:text-blue-400" />
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Spam önlemek ve ihbar durumunu takip edebilmeniz için önce Google hesabınızla giriş yapmalısınız. İsterseniz formda adınızı gizli (anonim) tutabilirsiniz.
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
      ) : (
        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Konu Başlığı
                  </label>
                  <span className="text-[11px] text-slate-400 tabular-nums">
                    {title.length}/200
                  </span>
                </div>
                <Input
                  placeholder="Örn: Spor salonu yenileme çalışması başladı"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={200}
                  className="bg-stone-50 dark:bg-zinc-800/70 border-stone-200 dark:border-zinc-700"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  İlgili Kategori
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-stone-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800/70 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                >
                  {categoryNames.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Haber Detayları
                </label>
                <span className="text-[11px] text-slate-400 tabular-nums">
                  {details.length}/3000
                </span>
              </div>
              <textarea
                placeholder="Ne oldu, nerede gerçekleşti, kimler katılıyor? Editörlerin doğrulayabileceği kısa notları ekleyin..."
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                maxLength={3000}
                className="flex min-h-[120px] w-full rounded-md border border-stone-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800/70 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              />
            </div>

            <label className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="mt-0.5 rounded border-stone-300 dark:border-zinc-600 accent-blue-700"
              />
              <span>
                Haber yayınlanırsa ismim gizli kalsın (Anonim ihbar olarak işaretle)
              </span>
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setTipModalOpen(false)}
              >
                Kapat
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !title.trim() || !details.trim()}
                className="bg-blue-700 hover:bg-blue-800 text-white gap-2"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                İhbarı Gönder
              </Button>
            </div>
          </form>

          {/* Student's own submitted tips */}
          <div className="pt-4 border-t border-stone-200 dark:border-zinc-800 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Gönderdiğim İhbarlar ({myTips.length})
            </h4>

            {myTipsLoading ? (
              <div className="py-4 flex justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
              </div>
            ) : myTips.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Henüz gönderdiğiniz bir haber ihbarı bulunmuyor.
              </p>
            ) : (
              <div className="divide-y divide-stone-100 dark:divide-zinc-800">
                {myTips.map((tip) => {
                  const statusMeta = STATUS_LABELS[tip.status] || STATUS_LABELS.pending;
                  return (
                    <div
                      key={tip.id}
                      className="py-2.5 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className={`font-semibold ${statusMeta.className}`}>
                            {statusMeta.text}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="text-slate-500 dark:text-slate-400">
                            {formatRelativeTurkishDate(tip.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                          {tip.title}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleWithdraw(tip.id)}
                        title="İhbarı geri çek"
                        aria-label="İhbarı geri çek"
                        className="p-1.5 rounded-md text-slate-400 hover:text-red-600 dark:hover:text-red-400 cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </SpringModal>
  );
}
