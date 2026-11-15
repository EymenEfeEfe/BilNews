import React, { useState, useEffect } from 'react';
import { 
  auth, 
  db, 
  handleFirestoreError, 
  OperationType,
  googleProvider,
  signInWithPopup,
  signOut
} from '@/src/lib/firebase';
import { 
  onAuthStateChanged, 
  User as FirebaseUser
} from 'firebase/auth';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  getDocs,
  doc,
  setDoc,
  getDoc
} from 'firebase/firestore';
import { 
  LayoutGrid, 
  Newspaper, 
  MessageSquare, 
  User as UserIcon, 
  LogOut, 
  Plus, 
  Send,
  Loader2,
  ChevronRight,
  Search,
  TrendingUp,
  MessageCircle,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import SaturnLogo from '@/src/components/SaturnLogo';
import AdminNewsDesk from '@/src/components/AdminNewsDesk';
import AdminLoginGate from '@/src/components/AdminLoginGate';

// Types
interface NewsArticle {
  id: string;
  title: string;
  content: string;
  authorName: string;
  category: string;
  createdAt: any;
  imageUrl?: string;
}

interface ForumPost {
  id: string;
  title: string;
  content: string;
  authorName: string;
  category: string;
  createdAt: any;
  commentCount: number;
}

interface Comment {
  id: string;
  content: string;
  authorName: string;
  createdAt: any;
}

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newsLoading, setNewsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'news' | 'forum' | 'admin'>('news');
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [newsSearch, setNewsSearch] = useState('');
  const [selectedNews, setSelectedNews] = useState<NewsArticle | null>(null);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newComment, setNewComment] = useState('');

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        syncUserProfile(u);
        const isCeoEmail = u.email?.toLowerCase() === 'eymosuruk@gmail.com';
        const hasPasswordSession = u.providerData.some((p) => p.providerId === 'password');
        const hasSessionUnlock = sessionStorage.getItem('bilinfom_admin_verified') === 'true';
        setAdminUnlocked(Boolean(isCeoEmail && (hasPasswordSession || hasSessionUnlock)));
      } else {
        setAdminUnlocked(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const syncUserProfile = async (u: FirebaseUser) => {
    const userRef = doc(db, 'users', u.uid);
    try {
      const snap = await getDoc(userRef);
      if (!snap.exists()) {
        await setDoc(userRef, {
          username: u.displayName || u.email?.split('@')[0] || 'Anonymous',
          email: u.email || '',
          role: 'user',
          avatarUrl: u.photoURL || null,
          createdAt: serverTimestamp()
        });
      }
    } catch (e) {
      console.error("Profile sync shadow error", e);
    }
  };

  // Data Fetching
  useEffect(() => {
    const newsQuery = query(collection(db, 'news'), orderBy('createdAt', 'desc'));
    const unsubscribeNews = onSnapshot(newsQuery, (snap) => {
      setNews(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as NewsArticle)));
      setNewsLoading(false);
    }, (e) => {
      setNewsLoading(false);
      handleFirestoreError(e, OperationType.LIST, 'news');
    });

    const postsQuery = query(collection(db, 'forum_posts'), orderBy('createdAt', 'desc'));
    const unsubscribePosts = onSnapshot(postsQuery, (snap) => {
      setPosts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ForumPost)));
    }, (e) => handleFirestoreError(e, OperationType.LIST, 'forum_posts'));

    return () => {
      unsubscribeNews();
      unsubscribePosts();
    };
  }, []);

  // Comments Fetching
  useEffect(() => {
    if (!selectedPost) return;
    const commentsQuery = query(collection(db, `forum_posts/${selectedPost.id}/comments`), orderBy('createdAt', 'asc'));
    const unsubscribeComments = onSnapshot(commentsQuery, (snap) => {
      setComments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment)));
    }, (e) => handleFirestoreError(e, OperationType.LIST, `forum_posts/${selectedPost.id}/comments`));
    return () => unsubscribeComments();
  }, [selectedPost]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success("Giriş başarılı!");
    } catch (e: any) {
      if (e?.code === 'auth/unauthorized-domain') {
        toast.error(`Domain yetkili değil: ${window.location.hostname}`, {
          description: "Bu adresi Firebase Console → Authentication → Settings → Authorized domains kısmına ekleyin.",
        });
      } else {
        toast.error("Giriş yapılamadı.");
      }
    }
  };

  const handleLogout = async () => {
    sessionStorage.removeItem('bilinfom_admin_verified');
    await signOut(auth);
    toast.info("Oturum kapatıldı.");
    setActiveTab('news');
    setAdminUnlocked(false);
  };

  const handleLockAdmin = async () => {
    sessionStorage.removeItem('bilinfom_admin_verified');
    await signOut(auth);
    setAdminUnlocked(false);
    setActiveTab('news');
    toast.info("Admin oturumu kilitlendi.");
  };

  const handleCreatePost = async () => {
    if (!user) return toast.error("Please login to post");
    if (!newPostTitle || !newPostContent) return toast.error("Title and content are required");

    try {
      await addDoc(collection(db, 'forum_posts'), {
        title: newPostTitle,
        content: newPostContent,
        authorId: user.uid,
        authorName: user.displayName || 'Anonymous',
        category: 'General',
        createdAt: serverTimestamp(),
        commentCount: 0
      });
      setNewPostTitle('');
      setNewPostContent('');
      toast.success("Post created!");
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'forum_posts');
    }
  };

  const handleCreateComment = async () => {
    if (!user || !selectedPost) return;
    if (!newComment.trim()) return;

    try {
      await addDoc(collection(db, `forum_posts/${selectedPost.id}/comments`), {
        postId: selectedPost.id,
        content: newComment.trim(),
        authorId: user.uid,
        authorName: user.displayName || 'Anonymous',
        createdAt: serverTimestamp()
      });
      setNewComment('');
      toast.success("Comment added!");
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `forum_posts/${selectedPost.id}/comments`);
    }
  };

  const filteredNews = news.filter((item) => {
    if (!newsSearch.trim()) return true;
    const q = newsSearch.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.content.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    );
  });

  const isAuthorizedAdminSession =
    adminUnlocked && user?.email?.toLowerCase() === 'eymosuruk@gmail.com';

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-blue-100">
      <Toaster position="top-right" />
      
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setSelectedPost(null); setSelectedNews(null); setActiveTab('news'); }}>
            <div className="text-blue-600">
              <SaturnLogo className="w-8 h-8" color="currentColor" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Bil Infom</h1>
          </div>

          <nav className="hidden md:flex items-center gap-6">
            <button 
              onClick={() => { setActiveTab('news'); setSelectedPost(null); setSelectedNews(null); }}
              className={`flex items-center gap-2 text-sm font-medium transition-colors ${activeTab === 'news' ? 'text-blue-600' : 'text-slate-600 hover:text-blue-500'}`}
            >
              <Newspaper className="w-4 h-4" />
              News
            </button>
            <button 
              onClick={() => { setActiveTab('forum'); setSelectedPost(null); setSelectedNews(null); }}
              className={`flex items-center gap-2 text-sm font-medium transition-colors ${activeTab === 'forum' ? 'text-blue-600' : 'text-slate-600 hover:text-blue-500'}`}
            >
              <MessageSquare className="w-4 h-4" />
              Forum
            </button>
            <button 
              onClick={() => { setActiveTab('admin'); setSelectedPost(null); setSelectedNews(null); }}
              className={`flex items-center gap-2 text-sm font-medium transition-colors ${activeTab === 'admin' ? 'text-red-600 font-semibold' : 'text-slate-600 hover:text-red-500'}`}
            >
              <ShieldCheck className="w-4 h-4" />
              Admin Panel
            </button>
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <Avatar className="w-8 h-8 border">
                  <AvatarImage src={user.photoURL || ''} />
                  <AvatarFallback>{user.displayName?.[0]}</AvatarFallback>
                </Avatar>
                <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button onClick={handleLogin} size="sm" className="bg-blue-600 hover:bg-blue-700">
                Login
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        <AnimatePresence mode="wait">
          {activeTab === 'admin' ? (
            <motion.div
              key="admin-view"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-6"
            >
              {isAuthorizedAdminSession ? (
                <>
                  <div className="flex items-center justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleLockAdmin}
                      className="text-red-600 border-red-200 hover:bg-red-50 gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      Admin Çıkışı Yap
                    </Button>
                  </div>
                  <AdminNewsDesk />
                </>
              ) : (
                <AdminLoginGate onAuthenticated={() => setAdminUnlocked(true)} />
              )}
            </motion.div>
          ) : selectedNews ? (
            <motion.div
              key="news-detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-4xl mx-auto"
            >
              <Button variant="ghost" onClick={() => setSelectedNews(null)} className="mb-6 gap-2">
                <ChevronRight className="w-4 h-4 rotate-180" /> Haberlere Dön
              </Button>
              <Card className="border-none shadow-lg overflow-hidden bg-white">
                <div className="aspect-video bg-slate-200 overflow-hidden relative">
                  <img
                    src={selectedNews.imageUrl || `https://picsum.photos/seed/${selectedNews.id}/1200/675`}
                    alt={selectedNews.title}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-4 left-4">
                    <Badge className="bg-blue-600 border-none">{selectedNews.category}</Badge>
                  </div>
                </div>
                <CardHeader className="space-y-2">
                  <CardDescription className="text-xs uppercase tracking-wider font-semibold text-slate-500">
                    {selectedNews.authorName} • {selectedNews.createdAt?.toDate ? selectedNews.createdAt.toDate().toLocaleDateString('tr-TR') : 'Bugün'}
                  </CardDescription>
                  <CardTitle className="text-3xl font-black tracking-tight text-slate-900">
                    {selectedNews.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-700 whitespace-pre-wrap leading-relaxed text-base">
                    {selectedNews.content}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ) : selectedPost ? (
            <motion.div
              key="post-detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Button variant="ghost" onClick={() => setSelectedPost(null)} className="mb-6 gap-2">
                <ChevronRight className="w-4 h-4 rotate-180" /> Back to Forum
              </Button>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <Card className="border-none shadow-sm">
                    <CardHeader>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary">{selectedPost.category}</Badge>
                        <span className="text-xs text-slate-500">
                          Posted by {selectedPost.authorName} • {selectedPost.createdAt?.toDate ? selectedPost.createdAt.toDate().toLocaleDateString() : 'Just now'}
                        </span>
                      </div>
                      <CardTitle className="text-3xl font-bold">{selectedPost.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{selectedPost.content}</p>
                    </CardContent>
                  </Card>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <MessageCircle className="w-5 h-5 text-blue-500" />
                      Comments ({comments.length})
                    </h3>
                    
                    <div className="space-y-3">
                      {comments.map((comment) => (
                        <Card key={comment.id} className="border-none shadow-sm bg-white/50">
                          <CardHeader className="py-3 px-4 flex-row items-center justify-between space-y-0">
                            <span className="text-sm font-medium text-slate-900">{comment.authorName}</span>
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                              {comment.createdAt?.toDate ? comment.createdAt.toDate().toLocaleDateString() : 'Just now'}
                            </span>
                          </CardHeader>
                          <CardContent className="py-2 px-4 text-slate-600">
                            {comment.content}
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {user && (
                      <div className="flex gap-2 pt-4">
                        <Input 
                          placeholder="Write a comment..." 
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleCreateComment()}
                        />
                        <Button onClick={handleCreateComment} className="bg-blue-600">
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="space-y-6">
                  <Card className="bg-blue-600 text-white border-none shadow-xl overflow-hidden">
                    <CardHeader>
                      <CardTitle>Bil Infom Community</CardTitle>
                      <CardDescription className="text-blue-100">
                        Join the conversation and stay updated with the latest in technology and world news.
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </div>
              </div>
            </motion.div>
          ) : activeTab === 'news' ? (
            <motion.div
              key="news-list"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h2 className="text-4xl font-black tracking-tight text-slate-900 uppercase italic">Latest Headlines</h2>
                  <p className="text-slate-500 mt-1">Curated news from around the globe.</p>
                </div>
                <div className="relative">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                   <Input
                     className="pl-10 w-full md:w-64 bg-white border-none shadow-sm"
                     placeholder="Haberlerde ara..."
                     value={newsSearch}
                     onChange={(e) => setNewsSearch(e.target.value)}
                   />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {newsLoading ? (
                  <div className="col-span-full py-20 text-center text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 opacity-20" />
                    <p>Haberler yükleniyor...</p>
                  </div>
                ) : filteredNews.length > 0 ? filteredNews.map((item) => (
                  <Card
                    key={item.id}
                    onClick={() => setSelectedNews(item)}
                    className="group overflow-hidden border-none shadow-sm hover:shadow-xl transition-all h-full flex flex-col cursor-pointer"
                  >
                    <div className="aspect-video bg-slate-200 overflow-hidden relative">
                      <img 
                        src={item.imageUrl || `https://picsum.photos/seed/${item.id}/800/450`} 
                        alt={item.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-4 left-4">
                        <Badge className="bg-blue-600/90 backdrop-blur-sm border-none">{item.category}</Badge>
                      </div>
                    </div>
                    <CardHeader>
                      <CardTitle className="text-xl group-hover:text-blue-600 transition-colors leading-snug">
                        {item.title}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        {item.authorName} • {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString('tr-TR') : 'Bugün'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1">
                      <p className="text-slate-600 text-sm line-clamp-3 leading-relaxed">
                        {item.content}
                      </p>
                    </CardContent>
                    <CardFooter className="pt-0">
                       <Button variant="ghost" className="p-0 text-blue-600 font-bold hover:bg-transparent">
                         DEVAMINI OKU <ChevronRight className="w-4 h-4 ml-1" />
                       </Button>
                    </CardFooter>
                  </Card>
                )) : (
                  <div className="col-span-full py-20 text-center text-slate-400 bg-white rounded-xl">
                    <Newspaper className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p className="font-medium text-slate-500">Henüz haber bulunmuyor.</p>
                    <p className="text-xs mt-1">Admin Panel üzerinden ilk haberi ekleyebilirsiniz.</p>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="forum-list"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight text-slate-900 italic">Community Forum</h2>
                  <p className="text-slate-500">Engage, discuss, and learn together.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-3 space-y-4">
                  {posts.length > 0 ? posts.map((post) => (
                    <Card 
                      key={post.id} 
                      className="border-none shadow-sm hover:ring-1 hover:ring-blue-200 transition-all cursor-pointer bg-white"
                      onClick={() => setSelectedPost(post)}
                    >
                      <CardHeader className="flex-row items-start justify-between gap-4">
                        <div className="space-y-1">
                          <CardTitle className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {post.title}
                          </CardTitle>
                          <p className="text-xs text-slate-500">
                            By {post.authorName} • {post.createdAt?.toDate ? post.createdAt.toDate().toLocaleDateString() : 'Just now'}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-[10px] uppercase font-bold shrink-0">{post.category}</Badge>
                      </CardHeader>
                      <CardContent>
                        <p className="text-slate-600 text-sm line-clamp-2 leading-relaxed">
                          {post.content}
                        </p>
                      </CardContent>
                      <CardFooter className="border-t pt-4 flex items-center justify-between">
                        <div className="flex items-center gap-4 text-slate-500 text-xs font-medium">
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-3.5 h-3.5" />
                            {post.commentCount || 0} Comments
                          </span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300" />
                      </CardFooter>
                    </Card>
                  )) : (
                    <div className="py-20 text-center text-slate-400 bg-white rounded-xl">
                      <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-10" />
                      <p>No discussion threads yet. Be the first!</p>
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  {user ? (
                    <Card className="border-none shadow-lg bg-white overflow-hidden relative">
                      <div className="absolute top-0 left-0 w-full h-1 bg-blue-600" />
                      <CardHeader>
                        <CardTitle className="text-base">Start a Discussion</CardTitle>
                        <CardDescription>Share your thoughts with others.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <Input 
                          placeholder="Post Title" 
                          value={newPostTitle}
                          onChange={(e) => setNewPostTitle(e.target.value)}
                        />
                        <textarea 
                          placeholder="What's on your mind?"
                          className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          value={newPostContent}
                          onChange={(e) => setNewPostContent(e.target.value)}
                        />
                      </CardContent>
                      <CardFooter>
                        <Button onClick={handleCreatePost} className="w-full bg-blue-600 hover:bg-blue-700">
                          <Plus className="w-4 h-4 mr-2" />
                          Publish Post
                        </Button>
                      </CardFooter>
                    </Card>
                  ) : (
                    <Card className="text-center p-8 bg-slate-100 border-dashed border-2">
                       <p className="text-sm text-slate-500 mb-4">You must be logged in to participate in the forum.</p>
                       <Button onClick={handleLogin} className="w-full bg-blue-600">Login to Join</Button>
                    </Card>
                  )}

                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2">Trending Topics</h4>
                    {['Tech', 'World', 'Health', 'Finance', 'Style'].map(cat => (
                      <Button key={cat} variant="ghost" className="w-full justify-between text-sm h-9">
                        {cat}
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{(Math.random() * 5).toFixed(1)}k</Badge>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Mobile Nav */}
      <div className="md:hidden fixed bottom-0 left-0 z-50 w-full h-16 bg-white border-t flex items-center justify-around px-2 pb-safe">
        <button 
          onClick={() => { setActiveTab('news'); setSelectedPost(null); setSelectedNews(null); }}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'news' ? 'text-blue-600' : 'text-slate-400'}`}
        >
          <Newspaper className="w-5 h-5" />
          <span className="text-[10px] font-bold">NEWS</span>
        </button>
        <button 
          onClick={() => { setActiveTab('forum'); setSelectedPost(null); setSelectedNews(null); }}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'forum' ? 'text-blue-600' : 'text-slate-400'}`}
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-[10px] font-bold">FORUM</span>
        </button>
        <button 
          onClick={() => { setActiveTab('admin'); setSelectedPost(null); setSelectedNews(null); }}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'admin' ? 'text-red-600' : 'text-slate-400'}`}
        >
          <ShieldCheck className="w-5 h-5" />
          <span className="text-[10px] font-bold">ADMIN</span>
        </button>
      </div>

      <footer className="bg-slate-900 text-slate-400 py-12 px-4 pb-24 md:pb-12">
        <div className="container mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2 space-y-4">
            <div className="flex items-center gap-2 text-white">
              <SaturnLogo className="w-8 h-8" />
              <span className="text-xl font-bold italic tracking-tighter">Bil Infom</span>
            </div>
            <p className="max-w-xs text-sm leading-relaxed opacity-70">
              Your destination for relevant news and community discussion. 
              Connecting voices across the decentralized web.
            </p>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4 text-sm uppercase tracking-widest">Platform</h4>
            <ul className="space-y-2 text-sm">
              <li><button onClick={() => { setActiveTab('news'); setSelectedNews(null); }} className="hover:text-blue-400 transition-colors">Headlines</button></li>
              <li><button onClick={() => { setActiveTab('forum'); setSelectedPost(null); }} className="hover:text-blue-400 transition-colors">Discussions</button></li>
              <li><button onClick={() => { setActiveTab('admin'); setSelectedPost(null); setSelectedNews(null); }} className="hover:text-red-400 transition-colors">Admin Panel</button></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4 text-sm uppercase tracking-widest">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-blue-400 transition-colors">Privacy</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">Terms</a></li>
            </ul>
          </div>
        </div>
        <div className="container mx-auto mt-12 pt-8 border-t border-slate-800 text-center text-[10px] font-bold uppercase tracking-widest">
          © 2026 Bil Infom. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
