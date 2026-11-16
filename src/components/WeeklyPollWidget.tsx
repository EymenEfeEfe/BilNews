import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { useBilnews } from '@/src/context/BilnewsContext';
import { PollVote } from '@/src/types';
import { Button } from '@/components/ui/button';
import { BarChart3, CheckCircle2, Lock, Loader2 } from 'lucide-react';
import { formatRelativeTurkishDate } from '@/src/lib/editorial';
import { toast } from 'sonner';

export default function WeeklyPollWidget() {
  const { user, polls, pollsLoading, isAuthorizedAdmin, loginWithGoogle } = useBilnews();
  const [votes, setVotes] = useState<PollVote[]>([]);
  const [votesLoading, setVotesLoading] = useState(false);
  const [submittingOptionId, setSubmittingOptionId] = useState<string | null>(null);

  const displayPoll = useMemo(() => {
    if (polls.length === 0) return null;
    return polls.find((p) => p.status === 'active') || polls[0];
  }, [polls]);

  useEffect(() => {
    if (!displayPoll?.id) {
      setVotes([]);
      setVotesLoading(false);
      return;
    }

    let active = true;
    setVotesLoading(true);
    const votesRef = collection(db, 'polls', displayPoll.id, 'votes');

    const unsubscribe = onSnapshot(
      votesRef,
      (snap) => {
        if (!active) return;
        setVotes(snap.docs.map((d) => ({ id: d.id, ...d.data() } as PollVote)));
        setVotesLoading(false);
      },
      (error) => {
        if (!active) return;
        setVotesLoading(false);
        handleFirestoreError(error, OperationType.LIST, `polls/${displayPoll.id}/votes`);
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [displayPoll?.id]);

  const userVote = useMemo(() => {
    if (!user) return null;
    return votes.find((v) => v.userId === user.uid) || null;
  }, [votes, user]);

  const totalVotes = votes.length;

  const optionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const v of votes) {
      counts[v.optionId] = (counts[v.optionId] || 0) + 1;
    }
    return counts;
  }, [votes]);

  const handleVote = async (optionId: string) => {
    if (!displayPoll) return;
    if (displayPoll.status === 'closed') {
      toast.info('Bu anket oylamaya kapatılmıştır.');
      return;
    }
    if (!user) {
      toast.info('Oy kullanmak için Google hesabınızla giriş yapın.');
      await loginWithGoogle();
      return;
    }
    if (userVote?.optionId === optionId) {
      return;
    }

    setSubmittingOptionId(optionId);
    const voteRef = doc(db, 'polls', displayPoll.id, 'votes', user.uid);
    try {
      if (userVote) {
        await updateDoc(voteRef, {
          optionId,
          updatedAt: serverTimestamp(),
        });
        toast.success('Oyunuz güncellendi.');
      } else {
        await setDoc(voteRef, {
          pollId: displayPoll.id,
          userId: user.uid,
          optionId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        toast.success('Oyunuz kaydedildi!');
      }
    } catch (error) {
      toast.error('Oyunuz kaydedilemedi.');
      handleFirestoreError(
        error,
        userVote ? OperationType.UPDATE : OperationType.CREATE,
        `polls/${displayPoll.id}/votes/${user.uid}`
      );
    } finally {
      setSubmittingOptionId(null);
    }
  };

  if (pollsLoading) {
    return (
      <div className="rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-4">
        <div className="h-3 w-32 rounded bg-stone-200 dark:bg-zinc-800 animate-shimmer" />
        <div className="h-5 w-full rounded bg-stone-200 dark:bg-zinc-800 animate-shimmer" />
        <div className="space-y-2.5">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-10 w-full rounded-lg bg-stone-200 dark:bg-zinc-800 animate-shimmer" />
          ))}
        </div>
      </div>
    );
  }

  if (!displayPoll) {
    return (
      <section className="rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400">
            <BarChart3 className="w-3.5 h-3.5" />
            Haftalık Anket
          </span>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Bu hafta için henüz aktif bir öğrenci anketi açılmadı.
        </p>
        {isAuthorizedAdmin && (
          <Link to="/admin" className="block pt-1">
            <Button size="sm" variant="outline" className="w-full border-stone-200 dark:border-zinc-700">
              Yönetim Panelinden Anket Aç
            </Button>
          </Link>
        )}
      </section>
    );
  }

  const isClosed = displayPoll.status === 'closed';
  const showResults = Boolean(userVote) || isClosed;

  return (
    <section className="rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-4">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400">
          <BarChart3 className="w-3.5 h-3.5" />
          Haftalık Anket
        </span>
        <span
          className={`inline-flex items-center gap-1 font-medium ${
            isClosed
              ? 'text-slate-500 dark:text-slate-400'
              : 'text-emerald-700 dark:text-emerald-400'
          }`}
        >
          {isClosed ? (
            <>
              <Lock className="w-3 h-3" />
              Sonuçlandı
            </>
          ) : (
            'Oylama Açık'
          )}
        </span>
      </div>

      <h3 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100 leading-snug">
        {displayPoll.question}
      </h3>

      <div className="space-y-2.5">
        {displayPoll.options.map((opt) => {
          const count = optionCounts[opt.id] || 0;
          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          const isSelected = userVote?.optionId === opt.id;
          const isSubmittingThis = submittingOptionId === opt.id;

          return (
            <motion.button
              key={opt.id}
              type="button"
              whileTap={!isClosed ? { scale: 0.98 } : undefined}
              disabled={isClosed || submittingOptionId !== null}
              onClick={() => handleVote(opt.id)}
              className={`relative w-full overflow-hidden rounded-lg border text-left transition-colors ${
                isSelected
                  ? 'border-blue-600 dark:border-blue-500 bg-blue-50/40 dark:bg-blue-950/30'
                  : 'border-stone-200 dark:border-zinc-800 bg-stone-50/60 dark:bg-zinc-950/40 hover:border-blue-300 dark:hover:border-blue-700'
              } ${isClosed ? 'cursor-default' : 'cursor-pointer'}`}
            >
              {showResults && (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ type: 'spring', stiffness: 240, damping: 28 }}
                  className={`absolute inset-y-0 left-0 pointer-events-none ${
                    isSelected
                      ? 'bg-blue-600/15 dark:bg-blue-500/20'
                      : 'bg-stone-200/70 dark:bg-zinc-800/70'
                  }`}
                />
              )}

              <div className="relative z-10 px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs sm:text-sm">
                <span className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-200 min-w-0">
                  {isSubmittingThis ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600 shrink-0" />
                  ) : isSelected ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400 shrink-0" />
                  ) : null}
                  <span className="truncate">{opt.label}</span>
                </span>

                {showResults && (
                  <span className="font-semibold text-slate-700 dark:text-slate-300 tabular-nums shrink-0 text-xs">
                    %{pct}
                  </span>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>

      <div className="pt-2 border-t border-stone-100 dark:border-zinc-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span className="tabular-nums">
          {votesLoading ? 'Yükleniyor...' : `${totalVotes} öğrenci oy kullandı`}
        </span>
        <span title="Oluşturulma">{formatRelativeTurkishDate(displayPoll.createdAt)}</span>
      </div>

      {!user && !isClosed && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          Oy kullanmak için bir seçeneğe tıklayıp giriş yapabilirsiniz.
        </p>
      )}
    </section>
  );
}
