import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { useBilnews } from '@/src/context/BilnewsContext';
import { ArticleReaction, ReactionType } from '@/src/types';
import { toast } from 'sonner';

const REACTION_OPTIONS: { type: ReactionType; emoji: string; label: string }[] = [
  { type: 'like', emoji: '👍', label: 'Beğen' },
  { type: 'heart', emoji: '❤️', label: 'Harika' },
  { type: 'clap', emoji: '👏', label: 'Alkış' },
  { type: 'fire', emoji: '🔥', label: 'Gündem' },
  { type: 'thinking', emoji: '🤔', label: 'Düşündürücü' },
];

export default function ArticleReactionsBar({ articleId }: { articleId: string }) {
  const { user, loginWithGoogle } = useBilnews();
  const [reactions, setReactions] = useState<ArticleReaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingType, setPendingType] = useState<ReactionType | null>(null);

  useEffect(() => {
    if (!articleId) return;
    let active = true;
    setLoading(true);
    const reactionsRef = collection(db, 'news', articleId, 'reactions');

    const unsubscribe = onSnapshot(
      reactionsRef,
      (snap) => {
        if (!active) return;
        setReactions(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ArticleReaction)));
        setLoading(false);
      },
      (error) => {
        if (!active) return;
        setLoading(false);
        handleFirestoreError(error, OperationType.LIST, `news/${articleId}/reactions`);
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [articleId]);

  const currentUserReaction = useMemo(() => {
    if (!user) return null;
    return reactions.find((r) => r.userId === user.uid) || null;
  }, [reactions, user]);

  const counts = useMemo(() => {
    const map: Record<ReactionType, number> = {
      like: 0,
      heart: 0,
      clap: 0,
      fire: 0,
      thinking: 0,
    };
    for (const r of reactions) {
      if (r.type in map) {
        map[r.type] += 1;
      }
    }
    return map;
  }, [reactions]);

  const handleReact = async (type: ReactionType) => {
    if (!user) {
      toast.info('Tepki bırakmak için giriş yapmalısınız.');
      await loginWithGoogle();
      return;
    }

    setPendingType(type);
    const reactionRef = doc(db, 'news', articleId, 'reactions', user.uid);

    try {
      if (currentUserReaction?.type === type) {
        await deleteDoc(reactionRef);
      } else if (currentUserReaction) {
        await updateDoc(reactionRef, {
          type,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(reactionRef, {
          articleId,
          userId: user.uid,
          type,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      toast.error('Tepkiniz kaydedilemedi.');
      handleFirestoreError(
        error,
        OperationType.WRITE,
        `news/${articleId}/reactions/${user.uid}`
      );
    } finally {
      setPendingType(null);
    }
  };

  return (
    <div className="pt-6 border-t border-stone-200 dark:border-zinc-800 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Habere Tepki Ver
        </span>
        <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
          {loading ? '...' : `${reactions.length} öğrenci tepkisi`}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {REACTION_OPTIONS.map((opt) => {
          const isSelected = currentUserReaction?.type === opt.type;
          const count = counts[opt.type];
          const isBusy = pendingType === opt.type;

          return (
            <motion.button
              key={opt.type}
              type="button"
              whileTap={{ scale: 0.96 }}
              disabled={pendingType !== null}
              onClick={() => handleReact(opt.type)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                isSelected
                  ? 'border-blue-600 bg-blue-50 text-blue-800 dark:border-blue-500 dark:bg-blue-950/60 dark:text-blue-300'
                  : 'border-stone-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800/80 text-slate-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-zinc-800'
              } ${isBusy ? 'opacity-70' : ''}`}
              aria-pressed={isSelected}
            >
              <span aria-hidden="true" className="text-sm leading-none">
                {opt.emoji}
              </span>
              <span>{opt.label}</span>
              <span className="tabular-nums font-semibold opacity-80">
                {count}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
