import React, { useEffect, useMemo, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { NewsTip, NewsTipStatus } from '@/src/types';
import SpringModal from '@/src/components/SpringModal';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Archive,
  CheckCircle2,
  FilePlus2,
  Loader2,
  Megaphone,
  Trash2,
} from 'lucide-react';
import { formatRelativeTurkishDate, formatTurkishDate, normalizeCategory } from '@/src/lib/editorial';
import { toast } from 'sonner';

const STATUS_META: Record<NewsTipStatus, { label: string; className: string }> = {
  pending: {
    label: 'Bekliyor',
    className: 'text-amber-700 dark:text-amber-400',
  },
  reviewed: {
    label: 'İncelendi',
    className: 'text-emerald-700 dark:text-emerald-400',
  },
  archived: {
    label: 'Arşivde',
    className: 'text-slate-500 dark:text-slate-400',
  },
};

export default function AdminTipsManager({
  onConvertToNews,
}: {
  onConvertToNews: (tip: NewsTip) => void;
}) {
  const [tips, setTips] = useState<NewsTip[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | NewsTipStatus>('all');
  const [pendingDelete, setPendingDelete] = useState<NewsTip | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const tipsQuery = query(collection(db, 'news_tips'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      tipsQuery,
      (snap) => {
        if (!active) return;
        setTips(snap.docs.map((d) => ({ id: d.id, ...d.data() } as NewsTip)));
        setLoading(false);
      },
      (error) => {
        if (!active) return;
        setLoading(false);
        handleFirestoreError(error, OperationType.LIST, 'news_tips');
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const filteredTips = useMemo(() => {
    if (statusFilter === 'all') return tips;
    return tips.filter((t) => t.status === statusFilter);
  }, [tips, statusFilter]);

  const handleUpdateStatus = async (tip: NewsTip, status: NewsTipStatus) => {
    try {
      await updateDoc(doc(db, 'news_tips', tip.id), {
        title: tip.title,
        details: tip.details,
        category: tip.category,
        authorId: tip.authorId,
        authorName: tip.authorName,
        isAnonymous: tip.isAnonymous,
        createdAt: tip.createdAt,
        status,
        updatedAt: serverTimestamp(),
      });
      toast.success('İhbar durumu güncellendi.');
    } catch (error) {
      toast.error('İhbar durumu güncellenemedi.');
      handleFirestoreError(error, OperationType.UPDATE, `news_tips/${tip.id}`);
    }
  };

  const handleConvert = async (tip: NewsTip) => {
    if (tip.status === 'pending') {
      await handleUpdateStatus(tip, 'reviewed');
    }
    onConvertToNews(tip);
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'news_tips', pendingDelete.id));
      toast.success('İhbar silindi.');
      setPendingDelete(null);
    } catch (error) {
      toast.error('İhbar silinemedi.');
      handleFirestoreError(error, OperationType.DELETE, `news_tips/${pendingDelete.id}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className="border border-stone-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
      <CardHeader className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-slate-900 dark:text-slate-100 flex items-center gap-2 tabular-nums">
              <Megaphone className="w-5 h-5 text-blue-700 dark:text-blue-400" />
              Öğrenci Haber İhbarları ({filteredTips.length})
            </CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400">
              Öğrencilerden gelen ihbarları inceleyin, arşivleyin veya tek tıkla taslak habere dönüştürün.
            </CardDescription>
          </div>

          <div className="flex items-center gap-1 p-1 rounded-lg bg-stone-100 dark:bg-slate-800/80 w-fit">
            {(
              [
                { id: 'all', label: 'Tümü' },
                { id: 'pending', label: 'Bekliyor' },
                { id: 'reviewed', label: 'İncelendi' },
                { id: 'archived', label: 'Arşiv' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  statusFilter === tab.id
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : filteredTips.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
            Bu görünümde henüz öğrenci haber ihbarı bulunmuyor.
          </div>
        ) : (
          <div className="divide-y divide-stone-100 dark:divide-slate-800">
            {filteredTips.map((tip) => {
              const meta = STATUS_META[tip.status] || STATUS_META.pending;
              return (
                <div
                  key={tip.id}
                  className="py-4 first:pt-0 last:pb-0 flex flex-col lg:flex-row lg:items-start justify-between gap-4"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className={`font-semibold ${meta.className}`}>{meta.label}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-semibold text-blue-700 dark:text-blue-400">
                        {normalizeCategory(tip.category)}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {tip.isAnonymous
                          ? `Anonim Öğrenci (Kayıtlı: ${tip.authorName})`
                          : tip.authorName}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span title={formatTurkishDate(tip.createdAt)}>
                        {formatRelativeTurkishDate(tip.createdAt)}
                      </span>
                    </div>

                    <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                      {tip.title}
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                      {tip.details}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleConvert(tip)}
                      className="bg-blue-700 hover:bg-blue-800 text-white gap-1.5"
                    >
                      <FilePlus2 className="w-3.5 h-3.5" />
                      Habere Dönüştür
                    </Button>

                    {tip.status !== 'reviewed' && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleUpdateStatus(tip, 'reviewed')}
                        className="gap-1.5 border-stone-200 dark:border-slate-700"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        İncelendi
                      </Button>
                    )}

                    {tip.status !== 'archived' && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleUpdateStatus(tip, 'archived')}
                        className="gap-1.5 border-stone-200 dark:border-slate-700"
                      >
                        <Archive className="w-3.5 h-3.5" />
                        Arşivle
                      </Button>
                    )}

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setPendingDelete(tip)}
                      aria-label="İhbarı sil"
                      className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <SpringModal
        open={Boolean(pendingDelete)}
        onClose={() => !isDeleting && setPendingDelete(null)}
        title="İhbarı Sil"
        description="Bu öğrenci haber ihbarı kalıcı olarak silinecek."
      >
        <div className="space-y-5">
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            <strong className="text-slate-900 dark:text-slate-100">
              &ldquo;{pendingDelete?.title}&rdquo;
            </strong>{' '}
            ihbarını silmek istediğinizden emin misiniz?
          </p>
          <div className="flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              disabled={isDeleting}
              onClick={() => setPendingDelete(null)}
            >
              Vazgeç
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={handleConfirmDelete}
              className="gap-2"
            >
              {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Evet, Sil
            </Button>
          </div>
        </div>
      </SpringModal>
    </Card>
  );
}
