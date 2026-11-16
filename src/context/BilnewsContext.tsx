import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import {
  auth,
  db,
  googleProvider,
  signInWithPopup,
  signOut,
  handleFirestoreError,
  OperationType,
} from '@/src/lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { NewsArticle, NewsCategory, ForumPost } from '@/src/types';
import { ARTICLE_CATEGORIES, getTurkishAuthError } from '@/src/lib/editorial';
import { toast } from 'sonner';

const ADMIN_EMAIL = 'eymosuruk@gmail.com';
const ADMIN_SESSION_KEY = 'bilinfom_admin_verified';

interface BilnewsContextValue {
  user: FirebaseUser | null;
  authLoading: boolean;
  isAuthorizedAdmin: boolean;
  allNews: NewsArticle[];
  news: NewsArticle[];
  newsLoading: boolean;
  categories: NewsCategory[];
  categoriesLoading: boolean;
  categoryNames: string[];
  posts: ForumPost[];
  postsLoading: boolean;
  loginWithGoogle: () => Promise<boolean>;
  logout: () => Promise<void>;
  lockAdmin: () => Promise<void>;
  unlockAdmin: () => void;
}

const BilnewsContext = createContext<BilnewsContextValue | undefined>(undefined);

export function BilnewsProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [adminUnlocked, setAdminUnlocked] = useState(false);

  const [allNews, setAllNews] = useState<NewsArticle[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);

  const [categories, setCategories] = useState<NewsCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);

  const syncUserProfile = useCallback(async (u: FirebaseUser) => {
    const userRef = doc(db, 'users', u.uid);
    try {
      const snap = await getDoc(userRef);
      if (!snap.exists()) {
        await setDoc(userRef, {
          username: u.displayName || u.email?.split('@')[0] || 'Okur',
          email: u.email || '',
          role: 'user',
          avatarUrl: u.photoURL || null,
          createdAt: serverTimestamp(),
        });
      }
    } catch (e) {
      console.error('Profil eşitleme hatası:', e);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (!active) return;
      setUser(u);
      if (u) {
        syncUserProfile(u);
        const isCeoEmail = u.email?.toLowerCase() === ADMIN_EMAIL;
        const hasPasswordSession = u.providerData.some((p) => p.providerId === 'password');
        const hasSessionUnlock = sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true';
        setAdminUnlocked(Boolean(isCeoEmail && (hasPasswordSession || hasSessionUnlock)));
      } else {
        setAdminUnlocked(false);
      }
      setAuthLoading(false);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [syncUserProfile]);

  useEffect(() => {
    let active = true;

    const newsQuery = query(collection(db, 'news'), orderBy('createdAt', 'desc'));
    const unsubscribeNews = onSnapshot(
      newsQuery,
      (snap) => {
        if (!active) return;
        setAllNews(snap.docs.map((d) => ({ id: d.id, ...d.data() } as NewsArticle)));
        setNewsLoading(false);
      },
      (error) => {
        if (!active) return;
        setNewsLoading(false);
        handleFirestoreError(error, OperationType.LIST, 'news');
      }
    );

    const categoriesQuery = query(collection(db, 'categories'), orderBy('name', 'asc'));
    const unsubscribeCategories = onSnapshot(
      categoriesQuery,
      (snap) => {
        if (!active) return;
        setCategories(snap.docs.map((d) => ({ id: d.id, ...d.data() } as NewsCategory)));
        setCategoriesLoading(false);
      },
      (error) => {
        if (!active) return;
        setCategoriesLoading(false);
        handleFirestoreError(error, OperationType.LIST, 'categories');
      }
    );

    const postsQuery = query(collection(db, 'forum_posts'), orderBy('createdAt', 'desc'));
    const unsubscribePosts = onSnapshot(
      postsQuery,
      (snap) => {
        if (!active) return;
        setPosts(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ForumPost)));
        setPostsLoading(false);
      },
      (error) => {
        if (!active) return;
        setPostsLoading(false);
        handleFirestoreError(error, OperationType.LIST, 'forum_posts');
      }
    );

    return () => {
      active = false;
      unsubscribeNews();
      unsubscribeCategories();
      unsubscribePosts();
    };
  }, []);

  const news = useMemo(
    () => allNews.filter((item) => item.status !== 'draft'),
    [allNews]
  );

  const categoryNames = useMemo(() => {
    if (categories.length > 0) {
      return categories.map((c) => c.name);
    }
    return [...ARTICLE_CATEGORIES];
  }, [categories]);

  const loginWithGoogle = async (): Promise<boolean> => {
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success('Hoş geldiniz! Oturumunuz başarıyla açıldı.');
      return true;
    } catch (error: any) {
      const { title, description } = getTurkishAuthError(error);
      toast.error(title, { description });
      return false;
    }
  };

  const logout = async () => {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    await signOut(auth);
    setAdminUnlocked(false);
    toast.info('Oturumunuz kapatıldı.');
  };

  const lockAdmin = async () => {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    await signOut(auth);
    setAdminUnlocked(false);
    toast.info('Yönetim paneli oturumu kapatıldı.');
  };

  const unlockAdmin = () => {
    sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
    setAdminUnlocked(true);
  };

  const isAuthorizedAdmin =
    adminUnlocked && user?.email?.toLowerCase() === ADMIN_EMAIL;

  return (
    <BilnewsContext.Provider
      value={{
        user,
        authLoading,
        isAuthorizedAdmin,
        allNews,
        news,
        newsLoading,
        categories,
        categoriesLoading,
        categoryNames,
        posts,
        postsLoading,
        loginWithGoogle,
        logout,
        lockAdmin,
        unlockAdmin,
      }}
    >
      {children}
    </BilnewsContext.Provider>
  );
}

export function useBilnews() {
  const ctx = useContext(BilnewsContext);
  if (!ctx) throw new Error('useBilnews must be used within BilnewsProvider');
  return ctx;
}
