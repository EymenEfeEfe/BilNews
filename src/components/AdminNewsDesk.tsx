import React, { useState, useMemo, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { db, auth, storage, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useBilnews } from '@/src/context/BilnewsContext';
import { NewsArticle, NewsStatus, NewsTip } from '@/src/types';
import NewsCoverImage from '@/src/components/NewsCoverImage';
import MarkdownRenderer from '@/src/components/MarkdownRenderer';
import SpringModal from '@/src/components/SpringModal';
import AdminPollsManager from '@/src/components/AdminPollsManager';
import AdminTipsManager from '@/src/components/AdminTipsManager';
import AdminManagersPanel from '@/src/components/AdminManagersPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import {
  Newspaper,
  Send,
  Image as ImageIcon,
  AlertCircle,
  Trash2,
  Pencil,
  X,
  Check,
  Eye,
  Loader2,
  MessageSquare,
  Sparkles,
  FileText,
  Upload,
  Bold,
  Italic,
  Heading2,
  List,
  Quote,
  Link as LinkIcon,
  Search,
  ChevronLeft,
  ChevronRight,
  FolderPlus,
  Tags,
  Crown,
} from 'lucide-react';
import {
  ARTICLE_CATEGORIES,
  SAMPLE_REALISTIC_NEWS,
  formatTurkishDate,
  isValidHttpUrl,
  normalizeCategory,
  slugifyTurkish,
  stripMarkdown,
} from '@/src/lib/editorial';
import { toast } from 'sonner';

const PAGE_SIZE = 10;

export default function AdminNewsDesk() {
  const {
    allNews,
    newsLoading,
    categories,
    categoriesLoading,
    categoryNames,
    posts,
    postsLoading,
    polls,
    isSuperAdmin,
  } = useBilnews();

  const [sectionTab, setSectionTab] = useState<'news' | 'polls' | 'tips' | 'categories' | 'forum' | 'managers'>('news');

  // Article form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<string>('Okul Gündemi');
  const [imageUrl, setImageUrl] = useState('');
  const [editorMode, setEditorMode] = useState<'write' | 'preview'>('write');
  const [previewImageError, setPreviewImageError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitTargetStatus, setSubmitTargetStatus] = useState<NewsStatus>('published');
  const [isSeeding, setIsSeeding] = useState(false);

  // Storage upload state
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Edit & list filter/pagination state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    type: 'news' | 'category' | 'forum';
    id: string;
    label: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [listSearch, setListSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Category CRUD state
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState('');
  const [isSavingCategory, setIsSavingCategory] = useState(false);

  const trimmedImageUrl = imageUrl.trim();
  const isImageUrlValid = isValidHttpUrl(trimmedImageUrl);

  const availableCategories = useMemo(() => {
    const base = new Set(categoryNames);
    if (category && !base.has(category)) base.add(category);
    return Array.from(base);
  }, [categoryNames, category]);

  const filteredAdminArticles = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    return allNews.filter((item) => {
      const itemStatus: NewsStatus = item.status === 'draft' ? 'draft' : 'published';
      if (statusFilter !== 'all' && itemStatus !== statusFilter) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        stripMarkdown(item.content).toLowerCase().includes(q) ||
        normalizeCategory(item.category).toLowerCase().includes(q)
      );
    });
  }, [allNews, listSearch, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredAdminArticles.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedArticles = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredAdminArticles.slice(start, start + PAGE_SIZE);
  }, [filteredAdminArticles, safePage]);

  const resetForm = () => {
    setTitle('');
    setContent('');
    setCategory(categoryNames[0] || 'Okul Gündemi');
    setImageUrl('');
    setEditingId(null);
    setEditorMode('write');
    setPreviewImageError(false);
  };

  const startEdit = (item: NewsArticle) => {
    setSectionTab('news');
    setEditingId(item.id);
    setTitle(item.title);
    setContent(item.content);
    setCategory(normalizeCategory(item.category));
    setImageUrl(item.imageUrl && isValidHttpUrl(item.imageUrl) ? item.imageUrl : '');
    setEditorMode('write');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleConvertTipToNews = (tip: NewsTip) => {
    setSectionTab('news');
    setEditingId(null);
    setTitle(tip.title);
    const creditNote = tip.isAnonymous
      ? '> *Öğrenci ihbarından derlenmiştir (Anonim).*'
      : `> *Öğrenci ihbarı: ${tip.authorName}*`;
    setContent(`${tip.details}\n\n${creditNote}`);
    setCategory(normalizeCategory(tip.category));
    setImageUrl('');
    setEditorMode('write');
    toast.success('İhbar haber editörüne aktarıldı. Düzenleyip yayınlayabilirsiniz.');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Markdown formatting helper
  const applyMarkdown = (prefix: string, suffix = '', placeholder = 'metin') => {
    const el = textareaRef.current;
    if (!el) {
      setContent((prev) => `${prev}${prev ? '\n' : ''}${prefix}${placeholder}${suffix}`);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = content.slice(start, end) || placeholder;
    const updated =
      content.slice(0, start) + prefix + selected + suffix + content.slice(end);
    setContent(updated);
    requestAnimationFrame(() => {
      el.focus();
      const cursorStart = start + prefix.length;
      el.setSelectionRange(cursorStart, cursorStart + selected.length);
    });
  };

  // Firebase Storage image upload
  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Lütfen yalnızca görsel dosyası (JPG, PNG, WebP) seçin.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Görsel boyutu en fazla 5 MB olabilir.');
      return;
    }
    if (!auth.currentUser) {
      toast.error('Dosya yüklemek için oturum açık olmalıdır.');
      return;
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageRef = ref(storage, `news-covers/${Date.now()}_${safeName}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    setUploadProgress(0);
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        setUploadProgress(pct);
      },
      (error) => {
        console.error('Storage upload error:', error);
        setUploadProgress(null);
        toast.error('Görsel Firebase Storage\'a yüklenemedi.', {
          description:
            'Firebase Console → Storage hizmetinin aktif ve yazma kurallarının izinli olduğundan emin olun veya harici https:// görsel URL\'si girin.',
        });
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          setImageUrl(downloadUrl);
          setPreviewImageError(false);
          toast.success('Görsel başarıyla yüklendi!');
        } catch {
          toast.error('Görsel bağlantısı alınamadı.');
        } finally {
          setUploadProgress(null);
        }
      }
    );
  };

  const saveArticle = async (targetStatus: NewsStatus) => {
    if (!auth.currentUser) {
      toast.error('Oturum bulunamadı. Lütfen tekrar giriş yapın.');
      return;
    }

    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (!trimmedTitle || !trimmedContent) {
      toast.error('Başlık ve haber içeriği zorunludur.');
      return;
    }
    if (trimmedTitle.length > 200) {
      toast.error('Başlık en fazla 200 karakter olabilir.');
      return;
    }
    if (trimmedContent.length > 20000) {
      toast.error('İçerik en fazla 20.000 karakter olabilir.');
      return;
    }
    if (trimmedImageUrl && !isImageUrlValid) {
      toast.error('Görsel adresi geçerli bir http:// veya https:// bağlantısı olmalıdır.');
      return;
    }

    setSubmitTargetStatus(targetStatus);
    setIsSubmitting(true);
    try {
      const payloadImage = trimmedImageUrl || '';

      if (editingId) {
        await updateDoc(doc(db, 'news', editingId), {
          title: trimmedTitle,
          content: trimmedContent,
          category,
          imageUrl: payloadImage,
          status: targetStatus,
          updatedAt: serverTimestamp(),
        });
        toast.success(
          targetStatus === 'draft'
            ? 'Haber taslak olarak güncellendi!'
            : 'Haber yayında olarak güncellendi!'
        );
      } else {
        await addDoc(collection(db, 'news'), {
          title: trimmedTitle,
          content: trimmedContent,
          category,
          imageUrl: payloadImage,
          status: targetStatus,
          authorId: auth.currentUser.uid,
          authorName: auth.currentUser.displayName || 'Okul Editörü',
          createdAt: serverTimestamp(),
        });
        toast.success(
          targetStatus === 'draft'
            ? 'Haber taslak olarak kaydedildi!'
            : 'Haber başarıyla yayınlandı!'
        );
      }

      resetForm();
    } catch (error) {
      toast.error('Haber kaydedilemedi. Yetki veya bağlantı hatası.');
      handleFirestoreError(error, editingId ? OperationType.UPDATE : OperationType.CREATE, 'news');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (item: NewsArticle) => {
    const nextStatus: NewsStatus = item.status === 'draft' ? 'published' : 'draft';
    try {
      await updateDoc(doc(db, 'news', item.id), {
        title: item.title,
        content: item.content,
        category: item.category,
        imageUrl: item.imageUrl || '',
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
      toast.success(
        nextStatus === 'published' ? 'Haber yayına alındı.' : 'Haber taslağa çekildi.'
      );
    } catch (error) {
      toast.error('Yayın durumu değiştirilemedi.');
      handleFirestoreError(error, OperationType.UPDATE, `news/${item.id}`);
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      if (pendingDelete.type === 'news') {
        await deleteDoc(doc(db, 'news', pendingDelete.id));
        toast.success('Haber yayından kaldırıldı.');
        if (editingId === pendingDelete.id) resetForm();
      } else if (pendingDelete.type === 'category') {
        await deleteDoc(doc(db, 'categories', pendingDelete.id));
        toast.success('Kategori silindi.');
      } else {
        await deleteDoc(doc(db, 'forum_posts', pendingDelete.id));
        toast.success('Forum gönderisi silindi.');
      }
      setPendingDelete(null);
    } catch (error) {
      const col =
        pendingDelete.type === 'news'
          ? 'news'
          : pendingDelete.type === 'category'
          ? 'categories'
          : 'forum_posts';
      toast.error('Silme işlemi tamamlanamadı.');
      handleFirestoreError(error, OperationType.DELETE, `${col}/${pendingDelete.id}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSeedSampleNews = async () => {
    if (!auth.currentUser) {
      toast.error('Oturum bulunamadı.');
      return;
    }
    setIsSeeding(true);
    try {
      for (const sample of SAMPLE_REALISTIC_NEWS) {
        await addDoc(collection(db, 'news'), {
          title: sample.title,
          content: sample.content,
          category: sample.category,
          imageUrl: sample.imageUrl,
          status: 'published',
          authorId: auth.currentUser.uid,
          authorName: auth.currentUser.displayName || 'Okul Editörü',
          createdAt: serverTimestamp(),
        });
      }
      toast.success('Örnek güncel haberler yayınlandı!');
    } catch (error) {
      toast.error('Örnek haberler eklenemedi.');
      handleFirestoreError(error, OperationType.CREATE, 'news');
    } finally {
      setIsSeeding(false);
    }
  };

  // Dynamic Category CRUD Handlers
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      toast.error('Kategori adı boş olamaz.');
      return;
    }
    if (trimmed.length > 50) {
      toast.error('Kategori adı en fazla 50 karakter olabilir.');
      return;
    }
    const slug = slugifyTurkish(trimmed) || `kat-${Date.now()}`;
    if (categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase() || c.slug === slug)) {
      toast.error('Bu kategori zaten mevcut.');
      return;
    }

    setIsSavingCategory(true);
    try {
      await addDoc(collection(db, 'categories'), {
        name: trimmed,
        slug,
        createdAt: serverTimestamp(),
      });
      setNewCategoryName('');
      toast.success(`"${trimmed}" kategorisi eklendi.`);
    } catch (error) {
      toast.error('Kategori eklenemedi.');
      handleFirestoreError(error, OperationType.CREATE, 'categories');
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleUpdateCategory = async (catId: string) => {
    const trimmed = editingCatName.trim();
    if (!trimmed) {
      toast.error('Kategori adı boş olamaz.');
      return;
    }
    const slug = slugifyTurkish(trimmed) || `kat-${Date.now()}`;
    setIsSavingCategory(true);
    try {
      await updateDoc(doc(db, 'categories', catId), {
        name: trimmed,
        slug,
        updatedAt: serverTimestamp(),
      });
      setEditingCatId(null);
      setEditingCatName('');
      toast.success('Kategori güncellendi.');
    } catch (error) {
      toast.error('Kategori güncellenemedi.');
      handleFirestoreError(error, OperationType.UPDATE, `categories/${catId}`);
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleSeedDefaultCategories = async () => {
    setIsSavingCategory(true);
    try {
      for (const name of ARTICLE_CATEGORIES) {
        const slug = slugifyTurkish(name);
        if (!categories.some((c) => c.slug === slug)) {
          await addDoc(collection(db, 'categories'), {
            name,
            slug,
            createdAt: serverTimestamp(),
          });
        }
      }
      toast.success('Varsayılan kategoriler veritabanına eklendi.');
    } catch (error) {
      toast.error('Kategoriler oluşturulamadı.');
      handleFirestoreError(error, OperationType.CREATE, 'categories');
    } finally {
      setIsSavingCategory(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header & Section Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 dark:border-slate-800 pb-5">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Newspaper className="w-6 h-6 text-blue-700 dark:text-blue-400" />
            Haber Yönetim Paneli
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Okul haberlerini yayınlayın, taslakları yönetin, kategorileri düzenleyin ve forumu denetleyin.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-lg bg-stone-100 dark:bg-slate-800/80 w-fit max-w-full overflow-x-auto">
          <button
            type="button"
            onClick={() => setSectionTab('news')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              sectionTab === 'news'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Haber Yönetimi
          </button>
          <button
            type="button"
            onClick={() => setSectionTab('polls')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 tabular-nums ${
              sectionTab === 'polls'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Anketler ({polls.length})
          </button>
          <button
            type="button"
            onClick={() => setSectionTab('tips')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              sectionTab === 'tips'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Gelen İhbarlar
          </button>
          <button
            type="button"
            onClick={() => setSectionTab('categories')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 tabular-nums ${
              sectionTab === 'categories'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Kategoriler ({categories.length || ARTICLE_CATEGORIES.length})
          </button>
          <button
            type="button"
            onClick={() => setSectionTab('forum')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 tabular-nums ${
              sectionTab === 'forum'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Forum Moderasyonu ({posts.length})
          </button>
          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => setSectionTab('managers')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 ${
                sectionTab === 'managers'
                  ? 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 shadow-sm'
                  : 'text-amber-700/80 dark:text-amber-400/80 hover:text-amber-800 dark:hover:text-amber-300'
              }`}
            >
              <Crown className="w-3.5 h-3.5" />
              Yöneticiler
            </button>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {sectionTab === 'news' && (
          <motion.div
            key="tab-news"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="space-y-10"
          >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Article Composer */}
            <Card className="lg:col-span-2 border border-stone-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  saveArticle('published');
                }}
              >
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-slate-900 dark:text-slate-100">
                      {editingId ? 'Haberi Düzenle' : 'Yeni Haber Oluştur'}
                    </CardTitle>
                    <CardDescription className="text-slate-500 dark:text-slate-400">
                      {editingId
                        ? 'Seçili haber üzerinde değişiklik yapıyorsunuz.'
                        : 'Bilnews manşetleri için yeni haber yazın veya taslak olarak kaydedin.'}
                    </CardDescription>
                  </div>
                  {editingId && (
                    <Button type="button" variant="ghost" size="sm" onClick={resetForm}>
                      <X className="w-4 h-4 mr-1" /> Vazgeç
                    </Button>
                  )}
                </CardHeader>

                <CardContent className="space-y-5">
                  {/* Title */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Haber Başlığı
                      </label>
                      <span className="text-[11px] text-slate-400 tabular-nums">
                        {title.length}/200
                      </span>
                    </div>
                    <Input
                      placeholder="Örn: Bahar Şenliği Başvuruları Başladı"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      maxLength={200}
                      className="text-base font-medium bg-stone-50 dark:bg-slate-800/70 border-stone-200 dark:border-slate-700"
                    />
                  </div>

                  {/* Category + Image URL */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Kategori
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800/70 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                      >
                        {availableCategories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Görsel URL (Opsiyonel)
                      </label>
                      <div className="relative">
                        <Input
                          type="url"
                          placeholder="https://ornek.com/gorsel.jpg"
                          value={imageUrl}
                          onChange={(e) => setImageUrl(e.target.value)}
                          maxLength={2000}
                          className={`pl-9 bg-stone-50 dark:bg-slate-800/70 ${
                            !isImageUrlValid
                              ? 'border-red-500 focus-visible:ring-red-500'
                              : 'border-stone-200 dark:border-slate-700'
                          }`}
                        />
                        <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      </div>
                      {!isImageUrlValid && (
                        <p className="text-[11px] text-red-600 dark:text-red-400">
                          URL geçerli bir http:// veya https:// adresi olmalıdır.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Firebase Storage Drag & Drop Image Upload */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                    className={`rounded-lg border border-dashed p-4 text-center transition-colors ${
                      isDragging
                        ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/30'
                        : 'border-stone-300 dark:border-slate-700 bg-stone-50/60 dark:bg-slate-800/30'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file);
                        e.target.value = '';
                      }}
                    />
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 text-left">
                        <Upload className="w-5 h-5 text-blue-700 dark:text-blue-400 shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                            Cihazdan kapak görseli yükle (Sürükle &amp; Bırak)
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            PNG, JPG veya WebP · Maksimum 5 MB (Firebase Storage)
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={uploadProgress !== null}
                        onClick={() => fileInputRef.current?.click()}
                        className="shrink-0 border-stone-200 dark:border-slate-700"
                      >
                        {uploadProgress !== null ? `Yükleniyor %${uploadProgress}` : 'Dosya Seç'}
                      </Button>
                    </div>
                  </div>

                  {/* Rich Markdown Editor */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Haber İçeriği (Markdown)
                      </label>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 p-0.5 rounded-md bg-stone-100 dark:bg-slate-800">
                          <button
                            type="button"
                            onClick={() => setEditorMode('write')}
                            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                              editorMode === 'write'
                                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                                : 'text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            Yaz
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditorMode('preview')}
                            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                              editorMode === 'preview'
                                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                                : 'text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            Önizleme
                          </button>
                        </div>
                        <span className="text-[11px] text-slate-400 tabular-nums">
                          {content.length}/20000
                        </span>
                      </div>
                    </div>

                    {editorMode === 'write' ? (
                      <div className="rounded-md border border-stone-200 dark:border-slate-700 overflow-hidden bg-stone-50 dark:bg-slate-800/70">
                        {/* Formatting Toolbar */}
                        <div className="flex flex-wrap items-center gap-1 px-2 py-1.5 border-b border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                          <button
                            type="button"
                            onClick={() => applyMarkdown('**', '**', 'kalın metin')}
                            className="p-1.5 rounded hover:bg-stone-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                            title="Kalın"
                            aria-label="Kalın"
                          >
                            <Bold className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => applyMarkdown('*', '*', 'italik metin')}
                            className="p-1.5 rounded hover:bg-stone-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                            title="İtalik"
                            aria-label="İtalik"
                          >
                            <Italic className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => applyMarkdown('\n## ', '', 'Alt Başlık')}
                            className="p-1.5 rounded hover:bg-stone-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                            title="Alt Başlık"
                            aria-label="Alt Başlık"
                          >
                            <Heading2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => applyMarkdown('\n- ', '', 'Liste maddesi')}
                            className="p-1.5 rounded hover:bg-stone-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                            title="Liste"
                            aria-label="Liste"
                          >
                            <List className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => applyMarkdown('\n> ', '', 'Öne çıkan alıntı')}
                            className="p-1.5 rounded hover:bg-stone-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                            title="Alıntı"
                            aria-label="Alıntı"
                          >
                            <Quote className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => applyMarkdown('[', '](https://)', 'bağlantı metni')}
                            className="p-1.5 rounded hover:bg-stone-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                            title="Bağlantı Ekle"
                            aria-label="Bağlantı Ekle"
                          >
                            <LinkIcon className="w-4 h-4" />
                          </button>
                        </div>

                        <textarea
                          ref={textareaRef}
                          placeholder="Haberin detaylarını Markdown formatında yazın (ör. **kalın**, ## Başlık, - liste)..."
                          maxLength={20000}
                          className="flex min-h-[260px] w-full bg-transparent px-4 py-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus-visible:outline-none leading-relaxed"
                          value={content}
                          onChange={(e) => setContent(e.target.value)}
                        />
                      </div>
                    ) : (
                      <div className="min-h-[300px] rounded-md border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-950 p-5">
                        {content.trim() ? (
                          <MarkdownRenderer content={content} />
                        ) : (
                          <p className="text-sm text-slate-400 italic">
                            Önizlenecek içerik henüz yazılmadı.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>

                <CardFooter className="border-t border-stone-100 dark:border-slate-800 pt-6 flex flex-col sm:flex-row gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSubmitting}
                    onClick={() => saveArticle('draft')}
                    className="sm:flex-1 h-11 font-semibold border-stone-300 dark:border-slate-700 gap-2"
                  >
                    {isSubmitting && submitTargetStatus === 'draft' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <FileText className="w-4 h-4" />
                    )}
                    {editingId ? 'Taslak Olarak Güncelle' : 'Taslak Olarak Kaydet'}
                  </Button>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="sm:flex-1 bg-blue-700 hover:bg-blue-800 text-white h-11 font-semibold gap-2"
                  >
                    {isSubmitting && submitTargetStatus === 'published' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Kaydediliyor...
                      </>
                    ) : editingId ? (
                      <>
                        Yayında Olarak Güncelle <Check className="w-4 h-4" />
                      </>
                    ) : (
                      <>
                        Hemen Yayınla <Send className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Card>

            {/* Live Preview & Quick Actions */}
            <div className="space-y-6">
              <Card className="border border-stone-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    Canlı Kart Önizlemesi
                  </CardTitle>
                </CardHeader>
                <div className="px-5 pb-5 space-y-2">
                  <div className="rounded-xl overflow-hidden border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-950">
                    <div className="aspect-video bg-stone-200 dark:bg-slate-800 overflow-hidden">
                      <NewsCoverImage
                        src={isImageUrlValid && trimmedImageUrl ? trimmedImageUrl : undefined}
                        category={category}
                        alt="Önizleme"
                        className="w-full h-full object-cover"
                        onFallbackTriggered={(didFail) => setPreviewImageError(didFail)}
                      />
                    </div>
                    <div className="p-4 space-y-2">
                      <div className="text-[11px] font-semibold text-blue-700 dark:text-blue-400">
                        {category}
                      </div>
                      <h4 className="font-semibold text-slate-900 dark:text-slate-100 leading-snug line-clamp-2">
                        {title.trim() || 'Haber başlığınız burada görünecek'}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3">
                        {stripMarkdown(content) || 'Haber metninin özeti burada önizlenecek...'}
                      </p>
                    </div>
                  </div>
                  {previewImageError && trimmedImageUrl && (
                    <p className="text-[11px] text-amber-700 dark:text-amber-400">
                      Girilen görsel bağlantısı yüklenemediği için varsayılan kapak fotoğrafı gösteriliyor.
                    </p>
                  )}
                </div>
              </Card>

              <Card className="border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2 text-slate-900 dark:text-slate-100">
                    <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    Editör Notları
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs space-y-2.5 text-slate-600 dark:text-slate-400 leading-relaxed">
                  <p>1. &ldquo;Taslak Olarak Kaydet&rdquo; seçeneğiyle kaydedilen haberler ana sayfada görünmez.</p>
                  <p>2. Görsel URL boş bırakılırsa varsayılan kapak fotoğrafı otomatik atanır.</p>
                  <p>3. İçerik alanında kalın, alt başlık, liste ve alıntı gibi Markdown biçimlerini kullanabilirsiniz.</p>
                  <div className="pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isSeeding}
                      onClick={handleSeedSampleNews}
                      className="w-full gap-2 border-stone-200 dark:border-slate-700"
                    >
                      {isSeeding ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      )}
                      Örnek Okul Haberleri Ekle
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Published & Draft Articles List with Search, Status Filter, and Pagination */}
          <Card className="border border-stone-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
            <CardHeader className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-slate-900 dark:text-slate-100 tabular-nums">
                    Haber Arşivi ({filteredAdminArticles.length})
                  </CardTitle>
                  <CardDescription className="text-slate-500 dark:text-slate-400">
                    Yayındaki ve taslak durumundaki haberleri arayın, düzenleyin veya silin.
                  </CardDescription>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  {/* Status Filter */}
                  <div className="flex items-center gap-1 p-1 rounded-lg bg-stone-100 dark:bg-slate-800/80">
                    {[
                      { id: 'all', label: 'Tümü' },
                      { id: 'published', label: 'Yayında' },
                      { id: 'draft', label: 'Taslak' },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => {
                          setStatusFilter(tab.id as 'all' | 'published' | 'draft');
                          setCurrentPage(1);
                        }}
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

                  {/* Admin Search */}
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      type="search"
                      placeholder="Haberlerde ara..."
                      value={listSearch}
                      onChange={(e) => {
                        setListSearch(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="pl-9 pr-8 h-9 bg-stone-50 dark:bg-slate-800/70 border-stone-200 dark:border-slate-700"
                    />
                    {listSearch && (
                      <button
                        type="button"
                        onClick={() => {
                          setListSearch('');
                          setCurrentPage(1);
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                        aria-label="Aramayı temizle"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {newsLoading ? (
                <div className="py-12 flex justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : filteredAdminArticles.length === 0 ? (
                <div className="py-12 text-center text-slate-500 dark:text-slate-400 text-sm space-y-2">
                  {allNews.length === 0 ? (
                    <p>Henüz eklenmiş bir haber yok.</p>
                  ) : (
                    <>
                      <p>&ldquo;{listSearch.trim() || 'Seçili filtre'}&rdquo; ile eşleşen haber bulunamadı.</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setListSearch('');
                          setStatusFilter('all');
                          setCurrentPage(1);
                        }}
                      >
                        Filtreleri Temizle
                      </Button>
                    </>
                  )}
                </div>
              ) : (
                <>
                  <div className="divide-y divide-stone-100 dark:divide-slate-800">
                    {paginatedArticles.map((item) => {
                      const isDraft = item.status === 'draft';
                      return (
                        <div
                          key={item.id}
                          className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                        >
                          <div className="flex items-start gap-4 min-w-0">
                            <div className="w-24 h-16 rounded-lg overflow-hidden bg-stone-100 dark:bg-slate-800 shrink-0">
                              <NewsCoverImage
                                src={item.imageUrl}
                                category={item.category}
                                alt={item.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="min-w-0 space-y-1">
                              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                <span
                                  className={`font-semibold ${
                                    isDraft
                                      ? 'text-amber-700 dark:text-amber-400'
                                      : 'text-emerald-700 dark:text-emerald-400'
                                  }`}
                                >
                                  {isDraft ? 'Taslak' : 'Yayında'}
                                </span>
                                <span aria-hidden="true">·</span>
                                <span className="font-semibold text-blue-700 dark:text-blue-400">
                                  {normalizeCategory(item.category)}
                                </span>
                                <span aria-hidden="true">·</span>
                                <span>{formatTurkishDate(item.createdAt)}</span>
                              </div>
                              <h4 className="font-bold text-slate-900 dark:text-slate-100 truncate">
                                {item.title}
                              </h4>
                              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                                {stripMarkdown(item.content)}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleStatus(item)}
                              className="border-stone-200 dark:border-slate-700 text-xs"
                            >
                              {isDraft ? 'Yayınla' : 'Taslağa Al'}
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => startEdit(item)}
                              className="gap-1.5 border-stone-200 dark:border-slate-700"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              Düzenle
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setPendingDelete({
                                  type: 'news',
                                  id: item.id,
                                  label: item.title,
                                })
                              }
                              className="text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                              aria-label="Haberi sil"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="pt-4 border-t border-stone-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                      <span className="tabular-nums">
                        Sayfa {safePage} / {totalPages} · Toplam {filteredAdminArticles.length} haber
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={safePage <= 1}
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          className="gap-1 border-stone-200 dark:border-slate-700"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          Önceki
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={safePage >= totalPages}
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          className="gap-1 border-stone-200 dark:border-slate-700"
                        >
                          Sonraki
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
          </motion.div>
        )}

        {/* Dynamic Category Management Tab */}
        {sectionTab === 'categories' && (
          <motion.div
            key="tab-categories"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
          >
          <Card className="lg:col-span-5 border border-stone-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
            <form onSubmit={handleAddCategory}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                  <FolderPlus className="w-5 h-5 text-blue-700 dark:text-blue-400" />
                  Yeni Kategori Ekle
                </CardTitle>
                <CardDescription className="text-slate-500 dark:text-slate-400">
                  Eklenen kategoriler ana sayfa filtrelerinde ve haber formunda hemen aktif olur.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Kategori Adı
                  </label>
                  <Input
                    placeholder="Örn: Kültür & Sanat"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    maxLength={50}
                    className="bg-stone-50 dark:bg-slate-800/70 border-stone-200 dark:border-slate-700"
                  />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-2.5">
                <Button
                  type="submit"
                  disabled={isSavingCategory}
                  className="w-full bg-blue-700 hover:bg-blue-800 text-white"
                >
                  {isSavingCategory ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <FolderPlus className="w-4 h-4 mr-2" />
                  )}
                  Kategoriyi Ekle
                </Button>

                {categories.length === 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSavingCategory}
                    onClick={handleSeedDefaultCategories}
                    className="w-full border-stone-200 dark:border-slate-700"
                  >
                    Varsayılan 6 Kategoriyi Oluştur
                  </Button>
                )}
              </CardFooter>
            </form>
          </Card>

          <Card className="lg:col-span-7 border border-stone-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <Tags className="w-5 h-5 text-blue-700 dark:text-blue-400" />
                Kayıtlı Kategoriler
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">
                {categories.length > 0
                  ? 'Firestore üzerinde kayıtlı dinamik kategorileri düzenleyebilir veya silebilirsiniz.'
                  : 'Henüz özel kategori eklenmediği için varsayılan kategoriler kullanılıyor.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {categoriesLoading ? (
                <div className="py-10 flex justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : categories.length === 0 ? (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Aktif varsayılan kategoriler: {ARTICLE_CATEGORIES.join(' · ')}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-stone-100 dark:divide-slate-800">
                  {categories.map((cat) => (
                    <div
                      key={cat.id}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      {editingCatId === cat.id ? (
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            value={editingCatName}
                            onChange={(e) => setEditingCatName(e.target.value)}
                            maxLength={50}
                            className="h-9 bg-stone-50 dark:bg-slate-800"
                          />
                          <Button
                            size="sm"
                            disabled={isSavingCategory}
                            onClick={() => handleUpdateCategory(cat.id)}
                            className="bg-blue-700 hover:bg-blue-800 text-white"
                          >
                            Kaydet
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingCatId(null);
                              setEditingCatName('');
                            }}
                          >
                            İptal
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div>
                            <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                              {cat.name}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                              /{cat.slug}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingCatId(cat.id);
                                setEditingCatName(cat.name);
                              }}
                              className="gap-1.5 border-stone-200 dark:border-slate-700"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              Düzenle
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setPendingDelete({
                                  type: 'category',
                                  id: cat.id,
                                  label: cat.name,
                                })
                              }
                              className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                              aria-label="Kategoriyi sil"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          </motion.div>
        )}

        {/* Forum Moderation Tab */}
        {sectionTab === 'forum' && (
          <motion.div
            key="tab-forum"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
        <Card className="border border-stone-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
          <CardHeader>
            <CardTitle className="text-slate-900 dark:text-slate-100 flex items-center gap-2 tabular-nums">
              <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Forum Gönderileri ({posts.length})
            </CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400">
              Test amaçlı veya uygunsuz forum gönderilerini buradan kaldırabilirsiniz.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {postsLoading ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : posts.length === 0 ? (
              <div className="py-12 text-center text-slate-500 dark:text-slate-400 text-sm">
                Forumda henüz gönderi bulunmuyor.
              </div>
            ) : (
              <div className="divide-y divide-stone-100 dark:divide-slate-800">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-semibold text-blue-700 dark:text-blue-400">
                          {normalizeCategory(post.category)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{post.authorName}</span>
                        <span aria-hidden="true">·</span>
                        <span>{formatTurkishDate(post.createdAt)}</span>
                      </div>
                      <h4 className="font-bold text-slate-900 dark:text-slate-100 truncate">
                        {post.title}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                        {post.content}
                      </p>
                    </div>

                    <div className="shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setPendingDelete({
                            type: 'forum',
                            id: post.id,
                            label: post.title,
                          })
                        }
                        className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 gap-1.5"
                      >
                        <Trash2 className="w-4 h-4" />
                        Kaldır
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
          </motion.div>
        )}
        {/* Polls Management Tab */}
        {sectionTab === 'polls' && (
          <motion.div
            key="tab-polls"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <AdminPollsManager />
          </motion.div>
        )}

        {/* Student Tips Management Tab */}
        {sectionTab === 'tips' && (
          <motion.div
            key="tab-tips"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <AdminTipsManager onConvertToNews={handleConvertTipToNews} />
          </motion.div>
        )}

        {/* Super Admin Managers Tab */}
        {sectionTab === 'managers' && isSuperAdmin && (
          <motion.div
            key="tab-managers"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <AdminManagersPanel />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spring Delete Confirmation Modal */}
      <SpringModal
        open={Boolean(pendingDelete)}
        onClose={() => !isDeleting && setPendingDelete(null)}
        title="Silme İşlemini Onayla"
        description={
          pendingDelete?.type === 'news'
            ? 'Bu haber kalıcı olarak yayından kaldırılacak.'
            : pendingDelete?.type === 'category'
            ? 'Bu kategori listeden kaldırılacak.'
            : 'Bu forum gönderisi kalıcı olarak silinecek.'
        }
      >
        <div className="space-y-5">
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            <strong className="text-slate-900 dark:text-slate-100">
              &ldquo;{pendingDelete?.label}&rdquo;
            </strong>{' '}
            öğesini silmek istediğinizden emin misiniz?
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
