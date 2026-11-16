import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { useBilnews } from '@/src/context/BilnewsContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  MessageSquare,
  Plus,
  ChevronRight,
  Search,
  X,
  Loader2,
  LogIn,
} from 'lucide-react';
import {
  FORUM_CATEGORIES,
  FORUM_POST_CATEGORIES,
  normalizeCategory,
  formatTurkishDate,
} from '@/src/lib/editorial';
import { toast } from 'sonner';

export default function ForumListPage() {
  const { user, posts, postsLoading, loginWithGoogle } = useBilnews();
  const [selectedTopic, setSelectedTopic] = useState<string>('Tümü');
  const [searchQuery, setSearchQuery] = useState('');
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostCategory, setNewPostCategory] = useState<string>('Genel');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const topicCounts = useMemo(() => {
    const counts: Record<string, number> = { Tümü: posts.length };
    for (const cat of FORUM_CATEGORIES) {
      if (cat !== 'Tümü') counts[cat] = 0;
    }
    for (const post of posts) {
      const normalized = normalizeCategory(post.category);
      counts[normalized] = (counts[normalized] || 0) + 1;
    }
    return counts;
  }, [posts]);

  const filteredPosts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return posts.filter((post) => {
      const cat = normalizeCategory(post.category);
      const matchesTopic = selectedTopic === 'Tümü' || cat === selectedTopic;
      if (!matchesTopic) return false;
      if (!q) return true;
      return (
        post.title.toLowerCase().includes(q) ||
        post.content.toLowerCase().includes(q) ||
        post.authorName.toLowerCase().includes(q) ||
        cat.toLowerCase().includes(q)
      );
    });
  }, [posts, selectedTopic, searchQuery]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Gönderi paylaşmak için giriş yapmalısınız.');
      return;
    }
    const title = newPostTitle.trim();
    const content = newPostContent.trim();
    if (!title || !content) {
      toast.error('Başlık ve içerik alanları zorunludur.');
      return;
    }
    if (title.length > 200) {
      toast.error('Başlık en fazla 200 karakter olabilir.');
      return;
    }
    if (content.length > 5000) {
      toast.error('İçerik en fazla 5.000 karakter olabilir.');
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'forum_posts'), {
        title,
        content,
        authorId: user.uid,
        authorName: user.displayName || user.email?.split('@')[0] || 'Üye',
        category: newPostCategory,
        createdAt: serverTimestamp(),
        commentCount: 0,
      });
      setNewPostTitle('');
      setNewPostContent('');
      setNewPostCategory('Genel');
      toast.success('Tartışma konusu yayınlandı!');
    } catch (error) {
      toast.error('Gönderi oluşturulamadı.');
      handleFirestoreError(error, OperationType.CREATE, 'forum_posts');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-stone-200 dark:border-slate-800 pb-5">
        <div className="space-y-1">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Öğrenci Forumu
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Okul gündemi, dersler, kulüpler ve etkinlikler hakkında fikir alışverişi yapın.
          </p>
        </div>

        <div className="relative w-full lg:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            type="search"
            placeholder="Forumda ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-9 bg-white dark:bg-slate-900 border-stone-200 dark:border-slate-800"
            aria-label="Forumda ara"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1"
              aria-label="Aramayı temizle"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Thread List */}
        <div className="lg:col-span-8 space-y-4">
          {selectedTopic !== 'Tümü' && (
            <div className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-stone-100 dark:bg-slate-800/70 text-sm">
              <span className="text-slate-700 dark:text-slate-300">
                Seçili başlık: <strong className="text-slate-900 dark:text-white">{selectedTopic}</strong>
              </span>
              <button
                type="button"
                onClick={() => setSelectedTopic('Tümü')}
                className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline"
              >
                Filtreyi Temizle
              </button>
            </div>
          )}

          {postsLoading ? (
            <div className="py-16 flex flex-col items-center justify-center rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span className="text-sm">Tartışmalar yükleniyor...</span>
            </div>
          ) : filteredPosts.length > 0 ? (
            filteredPosts.map((post) => (
              <Link
                key={post.id}
                to={`/forum/${post.id}`}
                className="group block rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-300 dark:hover:border-blue-800 transition-colors p-5 space-y-3"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                    {normalizeCategory(post.category)}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{post.authorName}</span>
                  <span aria-hidden="true">·</span>
                  <span>{formatTurkishDate(post.createdAt)}</span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors leading-snug">
                  {post.title}
                </h3>

                <p className="text-slate-600 dark:text-slate-400 text-sm line-clamp-2 leading-relaxed">
                  {post.content}
                </p>

                <div className="pt-3 border-t border-stone-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1.5 font-medium tabular-nums">
                    <MessageSquare className="w-3.5 h-3.5" />
                    Tartışmayı Gör
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                </div>
              </Link>
            ))
          ) : (
            <div className="py-16 px-6 text-center rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
              <MessageSquare className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
              {posts.length === 0 ? (
                <>
                  <p className="text-base font-medium text-slate-800 dark:text-slate-200">
                    Henüz bir tartışma konusu açılmamış.
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    İlk konuyu sağdaki formdan siz başlatabilirsiniz.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-base font-medium text-slate-800 dark:text-slate-200">
                    Seçili filtreyle eşleşen gönderi bulunamadı.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedTopic('Tümü');
                      setSearchQuery('');
                    }}
                  >
                    Tüm Konuları Göster
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="lg:col-span-4 space-y-6">
          {user ? (
            <form
              onSubmit={handleCreatePost}
              className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4"
            >
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Tartışma Başlat
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Toplulukla paylaşmak istediğiniz konuyu yazın.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Konu Başlığı
                </label>
                <Input
                  placeholder="Başlık yazın..."
                  value={newPostTitle}
                  onChange={(e) => setNewPostTitle(e.target.value)}
                  maxLength={200}
                  className="bg-stone-50 dark:bg-slate-800/70 border-stone-200 dark:border-slate-700"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Kategori
                </label>
                <select
                  value={newPostCategory}
                  onChange={(e) => setNewPostCategory(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800/70 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                >
                  {FORUM_POST_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Mesajınız
                </label>
                <textarea
                  placeholder="Düşüncelerinizi paylaşın..."
                  maxLength={5000}
                  className="flex min-h-[120px] w-full rounded-md border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800/70 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-700 hover:bg-blue-800 text-white"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Gönderiyi Yayınla
              </Button>
            </form>
          ) : (
            <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-center space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Foruma yeni bir tartışma konusu açmak için giriş yapmalısınız.
              </p>
              <Button
                type="button"
                onClick={loginWithGoogle}
                className="w-full bg-blue-700 hover:bg-blue-800 text-white gap-2"
              >
                <LogIn className="w-4 h-4" />
                Google ile Giriş Yap
              </Button>
            </div>
          )}

          {/* Clickable Trending Topics */}
          <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2">
            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2 pb-1">
              Popüler Başlıklar
            </h4>
            <div className="space-y-1">
              {FORUM_CATEGORIES.map((cat) => {
                const isActive = selectedTopic === cat;
                const count = topicCounts[cat] ?? 0;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedTopic(cat)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 font-semibold dark:bg-blue-950/60 dark:text-blue-400'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>{cat}</span>
                    <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
