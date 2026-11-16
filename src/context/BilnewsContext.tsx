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
  where,
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { NewsArticle, NewsCategory, ForumPost, StudentPoll, UserBookmark } from '@/src/types';
import { ARTICLE_CATEGORIES, getTurkishAuthError, normalizeCategory } from '@/src/lib/editorial';
import { toast } from 'sonner';

export const SUPER_ADMIN_EMAIL = 'eymosuruk@gmail.com';
const LEGACY_ADMIN_EMAILS = ['demirsozen67@gmail.com'];
const ADMIN_SESSION_KEY = 'bilinfom_admin_verified';
const SUPER_ADMIN_SESSION_KEY = 'bilinfom_super_admin_verified';

function getTimestampMillis(ts: any): number {
  if (!ts) return 0;
  try {
    if (typeof ts.toMillis === 'function') return ts.toMillis();
    if (typeof ts.toDate === 'function') return ts.toDate().getTime();
    const d = new Date(ts);
    return Number.isNaN(d.getTime()) ? 0 : d.getTime();
  } catch {
    return 0;
  }
}

interface BilnewsContextValue {
  user: FirebaseUser | null;
  authLoading: boolean;
  isAuthorizedAdmin: boolean;
  isSuperAdmin: boolean;
  allNews: NewsArticle[];
  news: NewsArticle[];
  newsLoading: boolean;
  categories: NewsCategory[];
  categoriesLoading: boolean;
  categoryNames: string[];
  posts: ForumPost[];
  postsLoading: boolean;
  polls: StudentPoll[];
  pollsLoading: boolean;
  bookmarks: UserBookmark[];
  bookmarkedIds: Set<string>;
  bookmarksLoading: boolean;
  bookmarksDrawerOpen: boolean;
  setBookmarksDrawerOpen: (open: boolean) => void;
  tipModalOpen: boolean;
  setTipModalOpen: (open: boolean) => void;
  toggleBookmark: (article: NewsArticle) => Promise<void>;
  removeBookmark: (articleId: string) => Promise<void>;
  loginWithGoogle: () => Promise<boolean>;
  logout: () => Promise<void>;
  lockAdmin: () => Promise<void>;
  unlockAdmin: () => void;
  unlockSuperAdmin: () => void;
}

const BilnewsContext = createContext<BilnewsContextValue | undefined>(undefined);

export function BilnewsProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [superAdminUnlocked, setSuperAdminUnlocked] = useState(false);
  const [isEmailGrantedAdmin, setIsEmailGrantedAdmin] = useState(false);

  const [allNews, setAllNews] = useState<NewsArticle[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);

  const [categories, setCategories] = useState<NewsCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);

  const [polls, setPolls] = useState<StudentPoll[]>([]);
  const [pollsLoading, setPollsLoading] = useState(true);

  const [bookmarks, setBookmarks] = useState<UserBookmark[]>([]);
  const [bookmarksLoading, setBookmarksLoading] = useState(false);

  const [bookmarksDrawerOpen, setBookmarksDrawerOpen] = useState(false);
  const [tipModalOpen, setTipModalOpen] = useState(false);

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
        const emailLower = u.email?.toLowerCase() || '';
        const hasSuperSession = sessionStorage.getItem(SUPER_ADMIN_SESSION_KEY) === 'true';
        const hasAdminSession = sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true';

        if (emailLower === SUPER_ADMIN_EMAIL) {
          setSuperAdminUnlocked(hasSuperSession);
          setAdminUnlocked(hasSuperSession);
        } else if (LEGACY_ADMIN_EMAILS.includes(emailLower)) {
          const hasPasswordProvider = u.providerData.some((p) => p.providerId === 'password');
          setSuperAdminUnlocked(false);
          setAdminUnlocked(hasPasswordProvider || hasAdminSession);
        } else {
          setSuperAdminUnlocked(false);
          setAdminUnlocked(hasAdminSession);
        }
      } else {
        setAdminUnlocked(false);
        setSuperAdminUnlocked(false);
        setIsEmailGrantedAdmin(false);
      }
      setAuthLoading(false);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [syncUserProfile]);

  // Real-time check if signed-in user's email was granted adminship by Super Admin
  useEffect(() => {
    const emailLower = user?.email?.toLowerCase() || '';
    if (!emailLower || emailLower === SUPER_ADMIN_EMAIL) {
      setIsEmailGrantedAdmin(false);
      return;
    }

    let active = true;
    const adminEmailDocRef = doc(db, 'admin_emails', emailLower);

    const unsubscribe = onSnapshot(
      adminEmailDocRef,
      (snap) => {
        if (!active) return;
        setIsEmailGrantedAdmin(snap.exists());
      },
      () => {
        if (!active) return;
        setIsEmailGrantedAdmin(false);
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [user]);

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

    const pollsQuery = query(collection(db, 'polls'), orderBy('createdAt', 'desc'));
    const unsubscribePolls = onSnapshot(
      pollsQuery,
      (snap) => {
        if (!active) return;
        setPolls(snap.docs.map((d) => ({ id: d.id, ...d.data() } as StudentPoll)));
        setPollsLoading(false);
      },
      (error) => {
        if (!active) return;
        setPollsLoading(false);
        handleFirestoreError(error, OperationType.LIST, 'polls');
      }
    );

    return () => {
      active = false;
      unsubscribeNews();
      unsubscribeCategories();
      unsubscribePosts();
      unsubscribePolls();
    };
  }, []);

  // Personal saved bookmarks listener (only active when signed in)
  useEffect(() => {
    if (!user) {
      setBookmarks([]);
      setBookmarksLoading(false);
      return;
    }

    let active = true;
    setBookmarksLoading(true);
    const bookmarksRef = collection(db, 'users', user.uid, 'bookmarks');
    const bookmarksQuery = query(bookmarksRef, where('userId', '==', user.uid));

    const unsubscribe = onSnapshot(
      bookmarksQuery,
      (snap) => {
        if (!active) return;
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as UserBookmark));
        list.sort((a, b) => getTimestampMillis(b.createdAt) - getTimestampMillis(a.createdAt));
        setBookmarks(list);
        setBookmarksLoading(false);
      },
      (error) => {
        if (!active) return;
        setBookmarksLoading(false);
        handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/bookmarks`);
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [user]);

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

  const bookmarkedIds = useMemo(
    () => new Set(bookmarks.map((b) => b.articleId)),
    [bookmarks]
  );

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

  const toggleBookmark = async (article: NewsArticle) => {
    if (!user) {
      toast.info('Haberi kaydetmek için önce giriş yapmalısınız.');
      await loginWithGoogle();
      return;
    }
    const bookmarkRef = doc(db, 'users', user.uid, 'bookmarks', article.id);
    const isSaved = bookmarkedIds.has(article.id);
    try {
      if (isSaved) {
        await deleteDoc(bookmarkRef);
        toast.info('Haber kaydedilenlerden çıkarıldı.');
      } else {
        await setDoc(bookmarkRef, {
          articleId: article.id,
          userId: user.uid,
          title: article.title.slice(0, 200),
          category: normalizeCategory(article.category).slice(0, 50),
          imageUrl: article.imageUrl ? article.imageUrl.slice(0, 2000) : null,
          createdAt: serverTimestamp(),
        });
        toast.success('Haber kaydedilenlere eklendi.');
      }
    } catch (error) {
      toast.error('Favori işlemi tamamlanamadı.');
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/bookmarks/${article.id}`);
    }
  };

  const removeBookmark = async (articleId: string) => {
    if (!user) return;
    const bookmarkRef = doc(db, 'users', user.uid, 'bookmarks', articleId);
    try {
      await deleteDoc(bookmarkRef);
      toast.info('Haber kaydedilenlerden çıkarıldı.');
    } catch (error) {
      toast.error('Haber listeden çıkarılamadı.');
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/bookmarks/${articleId}`);
    }
  };

  const logout = async () => {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    sessionStorage.removeItem(SUPER_ADMIN_SESSION_KEY);
    await signOut(auth);
    setAdminUnlocked(false);
    setSuperAdminUnlocked(false);
    setIsEmailGrantedAdmin(false);
    setBookmarksDrawerOpen(false);
    toast.info('Oturumunuz kapatıldı.');
  };

  const lockAdmin = async () => {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    sessionStorage.removeItem(SUPER_ADMIN_SESSION_KEY);
    await signOut(auth);
    setAdminUnlocked(false);
    setSuperAdminUnlocked(false);
    setIsEmailGrantedAdmin(false);
    toast.info('Yönetim paneli oturumu kapatıldı.');
  };

  const unlockAdmin = () => {
    sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
    setAdminUnlocked(true);
  };

  const unlockSuperAdmin = () => {
    sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
    sessionStorage.setItem(SUPER_ADMIN_SESSION_KEY, 'true');
    setAdminUnlocked(true);
    setSuperAdminUnlocked(true);
  };

  const userEmailLower = user?.email?.toLowerCase() || '';
  const isSuperAdmin =
    userEmailLower === SUPER_ADMIN_EMAIL && superAdminUnlocked;

  const isAuthorizedAdmin = Boolean(
    user &&
      (isSuperAdmin ||
        (LEGACY_ADMIN_EMAILS.includes(userEmailLower) && adminUnlocked) ||
        isEmailGrantedAdmin)
  );

  return (
    <BilnewsContext.Provider
      value={{
        user,
        authLoading,
        isAuthorizedAdmin,
        isSuperAdmin,
        allNews,
        news,
        newsLoading,
        categories,
        categoriesLoading,
        categoryNames,
        posts,
        postsLoading,
        polls,
        pollsLoading,
        bookmarks,
        bookmarkedIds,
        bookmarksLoading,
        bookmarksDrawerOpen,
        setBookmarksDrawerOpen,
        tipModalOpen,
        setTipModalOpen,
        toggleBookmark,
        removeBookmark,
        loginWithGoogle,
        logout,
        lockAdmin,
        unlockAdmin,
        unlockSuperAdmin,
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
