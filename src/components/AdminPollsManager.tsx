import React, { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { useBilnews } from '@/src/context/BilnewsContext';
import { PollOption, PollStatus, PollVote, StudentPoll } from '@/src/types';
import SpringModal from '@/src/components/SpringModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  BarChart3,
  Loader2,
  Lock,
  Play,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { formatTurkishDate } from '@/src/lib/editorial';
import { toast } from 'sonner';

function PollResultsPreview({ poll }: { poll: StudentPoll }) {
  const [votes, setVotes] = useState<PollVote[]>([]);

  useEffect(() => {
    let active = true;
    const unsubscribe = onSnapshot(
      collection(db, 'polls', poll.id, 'votes'),
      (snap) => {
        if (!active) return;
        setVotes(snap.docs.map((d) => ({ id: d.id, ...d.data() } as PollVote)));
      },
      (error) => {
        if (!active) return;
        handleFirestoreError(error, OperationType.LIST, `polls/${poll.id}/votes`);
      }
    );
    return () => {
      active = false;
      unsubscribe();
    };
  }, [poll.id]);

  const total = votes.length;

  return (
    <div className="space-y-1.5 pt-2">
      {poll.options.map((opt) => {
        const count = votes.filter((v) => v.optionId === opt.id).length;
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return (
          <div key={opt.id} className="space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
              <span className="truncate">{opt.label}</span>
              <span className="tabular-nums font-medium shrink-0">
                {count} oy (%{pct})
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-stone-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-700 dark:bg-blue-500 transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
      <p className="text-[11px] text-slate-400 tabular-nums pt-1">
        Toplam {total} oy
      </p>
    </div>
  );
}

export default function AdminPollsManager() {
  const { polls, pollsLoading } = useBilnews();
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [isCreating, setIsCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<StudentPoll | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleAddOption = () => {
    if (options.length >= 5) {
      toast.info('Bir ankette en fazla 5 seçenek olabilir.');
      return;
    }
    setOptions((prev) => [...prev, '']);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) {
      toast.info('Bir ankette en az 2 seçenek bulunmalıdır.');
      return;
    }
    setOptions((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleOptionChange = (index: number, value: string) => {
    setOptions((prev) => prev.map((opt, idx) => (idx === index ? value : opt)));
  };

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) {
      toast.error('Oturum bulunamadı.');
      return;
    }

    const cleanQuestion = question.trim();
    const cleanOptions: PollOption[] = options
      .map((label, idx) => ({
        id: `opt_${idx + 1}_${Date.now().toString(36)}`,
        label: label.trim().slice(0, 100),
      }))
      .filter((opt) => opt.label.length > 0);

    if (!cleanQuestion) {
      toast.error('Anket sorusu zorunludur.');
      return;
    }
    if (cleanOptions.length < 2) {
      toast.error('Lütfen en az 2 geçerli seçenek girin.');
      return;
    }

    setIsCreating(true);
    try {
      await addDoc(collection(db, 'polls'), {
        question: cleanQuestion.slice(0, 240),
        options: cleanOptions.slice(0, 5),
        status: 'active',
        createdBy: auth.currentUser.uid,
        createdAt: serverTimestamp(),
      });
      setQuestion('');
      setOptions(['', '']);
      toast.success('Yeni haftalık öğrenci anketi yayına alındı!');
    } catch (error) {
      toast.error('Anket oluşturulamadı.');
      handleFirestoreError(error, OperationType.CREATE, 'polls');
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleStatus = async (poll: StudentPoll) => {
    const nextStatus: PollStatus = poll.status === 'active' ? 'closed' : 'active';
    try {
      await updateDoc(doc(db, 'polls', poll.id), {
        question: poll.question,
        options: poll.options,
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
      toast.success(
        nextStatus === 'closed' ? 'Anket oylamaya kapatıldı.' : 'Anket yeniden oylamaya açıldı.'
      );
    } catch (error) {
      toast.error('Anket durumu güncellenemedi.');
      handleFirestoreError(error, OperationType.UPDATE, `polls/${poll.id}`);
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'polls', pendingDelete.id));
      toast.success('Anket silindi.');
      setPendingDelete(null);
    } catch (error) {
      toast.error('Anket silinemedi.');
      handleFirestoreError(error, OperationType.DELETE, `polls/${pendingDelete.id}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <Card className="lg:col-span-5 border border-stone-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
        <form onSubmit={handleCreatePoll}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <BarChart3 className="w-5 h-5 text-blue-700 dark:text-blue-400" />
              Yeni Öğrenci Anketi
            </CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400">
              Oluşturulan aktif anket ana sayfada öğrencilerin oylamasına sunulur.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Anket Sorusu
                </label>
                <span className="text-[11px] text-slate-400 tabular-nums">
                  {question.length}/240
                </span>
              </div>
              <Input
                placeholder="Örn: Bahar şenliğinde hangi turnuva düzenlensin?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                maxLength={240}
                className="bg-stone-50 dark:bg-slate-800/70 border-stone-200 dark:border-slate-700"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Seçenekler ({options.length}/5)
                </label>
                {options.length < 5 && (
                  <button
                    type="button"
                    onClick={handleAddOption}
                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Seçenek Ekle
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      placeholder={`${idx + 1}. Seçenek`}
                      value={opt}
                      onChange={(e) => handleOptionChange(idx, e.target.value)}
                      maxLength={100}
                      className="bg-stone-50 dark:bg-slate-800/70 border-stone-200 dark:border-slate-700"
                    />
                    {options.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveOption(idx)}
                        aria-label="Seçeneği kaldır"
                        className="text-slate-400 hover:text-red-600 shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>

          <CardFooter>
            <Button
              type="submit"
              disabled={isCreating}
              className="w-full bg-blue-700 hover:bg-blue-800 text-white gap-2"
            >
              {isCreating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Anketi Yayınla
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card className="lg:col-span-7 border border-stone-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
        <CardHeader>
          <CardTitle className="text-slate-900 dark:text-slate-100 tabular-nums">
            Haftalık Anketler ({polls.length})
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Canlı oy dağılımını izleyin, anketleri kapatın veya silin.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {pollsLoading ? (
            <div className="py-10 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : polls.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
              Henüz oluşturulmuş bir öğrenci anketi yok.
            </p>
          ) : (
            <div className="divide-y divide-stone-100 dark:divide-slate-800">
              {polls.map((poll) => {
                const isClosed = poll.status === 'closed';
                return (
                  <div key={poll.id} className="py-4 first:pt-0 last:pb-0 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 text-xs">
                          <span
                            className={`font-semibold ${
                              isClosed
                                ? 'text-slate-500 dark:text-slate-400'
                                : 'text-emerald-700 dark:text-emerald-400'
                            }`}
                          >
                            {isClosed ? 'Kapalı' : 'Oylama Açık'}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="text-slate-500 dark:text-slate-400">
                            {formatTurkishDate(poll.createdAt)}
                          </span>
                        </div>
                        <h4 className="font-semibold text-sm sm:text-base text-slate-900 dark:text-slate-100">
                          {poll.question}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleStatus(poll)}
                          className="gap-1.5 border-stone-200 dark:border-slate-700 text-xs"
                        >
                          {isClosed ? (
                            <>
                              <Play className="w-3.5 h-3.5" />
                              Yeniden Aç
                            </>
                          ) : (
                            <>
                              <Lock className="w-3.5 h-3.5" />
                              Kapat
                            </>
                          )}
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setPendingDelete(poll)}
                          aria-label="Anketi sil"
                          className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <PollResultsPreview poll={poll} />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <SpringModal
        open={Boolean(pendingDelete)}
        onClose={() => !isDeleting && setPendingDelete(null)}
        title="Anketi Sil"
        description="Bu anket kalıcı olarak kaldırılacak."
      >
        <div className="space-y-5">
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            <strong className="text-slate-900 dark:text-slate-100">
              &ldquo;{pendingDelete?.question}&rdquo;
            </strong>{' '}
            anketini silmek istediğinizden emin misiniz?
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
    </div>
  );
}
