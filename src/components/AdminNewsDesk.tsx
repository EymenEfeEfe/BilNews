import React, { useState, useEffect } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
} from 'lucide-react';
import { toast } from 'sonner';

interface NewsItem {
  id: string;
  title: string;
  content: string;
  category: string;
  imageUrl?: string;
  authorId: string;
  authorName: string;
  createdAt: any;
}

const CATEGORIES = ['Teknoloji', 'Dünya', 'Bilim', 'Ekonomi', 'Gündem', 'Topluluk'];

export default function AdminNewsDesk() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('Teknoloji');
  const [imageUrl, setImageUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [articles, setArticles] = useState<NewsItem[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'news'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setArticles(snap.docs.map((d) => ({ id: d.id, ...d.data() } as NewsItem)));
        setLoadingArticles(false);
      },
      (error) => {
        setLoadingArticles(false);
        handleFirestoreError(error, OperationType.LIST, 'news');
      }
    );
    return () => unsub();
  }, []);

  const resetForm = () => {
    setTitle('');
    setContent('');
    setCategory('Teknoloji');
    setImageUrl('');
    setEditingId(null);
  };

  const startEdit = (item: NewsItem) => {
    setEditingId(item.id);
    setTitle(item.title);
    setContent(item.content);
    setCategory(item.category || 'Teknoloji');
    setImageUrl(item.imageUrl || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) {
      toast.error('Oturum bulunamadı. Lütfen tekrar giriş yapın.');
      return;
    }

    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();
    const trimmedImage = imageUrl.trim();

    if (!trimmedTitle || !trimmedContent) {
      toast.error('Başlık ve haber içeriği zorunludur.');
      return;
    }
    if (trimmedTitle.length > 200) {
      toast.error('Başlık en fazla 200 karakter olabilir.');
      return;
    }
    if (trimmedContent.length > 10000) {
      toast.error('İçerik en fazla 10.000 karakter olabilir.');
      return;
    }

    setIsSubmitting(true);
    try {
      const finalImageUrl = trimmedImage || `https://picsum.photos/seed/${Date.now()}/800/450`;

      if (editingId) {
        await updateDoc(doc(db, 'news', editingId), {
          title: trimmedTitle,
          content: trimmedContent,
          category,
          imageUrl: finalImageUrl,
          updatedAt: serverTimestamp(),
        });
        toast.success('Haber başarıyla güncellendi!');
      } else {
        await addDoc(collection(db, 'news'), {
          title: trimmedTitle,
          content: trimmedContent,
          category,
          imageUrl: finalImageUrl,
          authorId: auth.currentUser.uid,
          authorName: auth.currentUser.displayName || 'Bil Infom Editörü',
          createdAt: serverTimestamp(),
        });
        toast.success('Haber başarıyla yayınlandı!');
      }

      resetForm();
    } catch (error) {
      toast.error('Haber kaydedilemedi. Yetki veya bağlantı hatası.');
      handleFirestoreError(error, editingId ? OperationType.UPDATE : OperationType.CREATE, 'news');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'news', id));
      toast.success('Haber silindi.');
      setConfirmDeleteId(null);
      if (editingId === id) resetForm();
    } catch (error) {
      toast.error('Haber silinemedi.');
      handleFirestoreError(error, OperationType.DELETE, `news/${id}`);
    }
  };

  const previewImg = imageUrl.trim() || 'https://picsum.photos/seed/bilinfom-preview/800/450';

  return (
    <div className="space-y-10 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900 flex items-center gap-2">
            <Newspaper className="w-8 h-8 text-blue-600" />
            Haber Yönetim Masası
          </h2>
          <p className="text-slate-500">
            Yetkili Admin Paneli: Ana sayfaya doğrudan haber ekleyin, düzenleyin veya kaldırın.
          </p>
        </div>
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 w-fit">
          Yetkili: {auth.currentUser?.email || 'Admin'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form */}
        <Card className="lg:col-span-2 border-none shadow-xl bg-white">
          <form onSubmit={handleSubmit}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{editingId ? 'Haberi Düzenle' : 'Yeni Haber Oluştur'}</CardTitle>
                <CardDescription>
                  {editingId
                    ? 'Seçili haber üzerinde değişiklik yapıyorsunuz.'
                    : 'Bil Infom manşetlerinde yayınlanacak yeni bir haber yazın.'}
                </CardDescription>
              </div>
              {editingId && (
                <Button type="button" variant="ghost" size="sm" onClick={resetForm}>
                  <X className="w-4 h-4 mr-1" /> Vazgeç
                </Button>
              )}
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Haber Başlığı
                  </label>
                  <span className="text-[11px] text-slate-400">{title.length}/200</span>
                </div>
                <Input
                  placeholder="Dikkat çekici bir başlık girin..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={200}
                  className="text-base font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Kategori
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Görsel URL (Opsiyonel)
                  </label>
                  <div className="relative">
                    <Input
                      placeholder="https://..."
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      maxLength={1000}
                      className="pl-9"
                    />
                    <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Haber İçeriği
                  </label>
                  <span className="text-[11px] text-slate-400">{content.length}/10000</span>
                </div>
                <textarea
                  placeholder="Haberin detaylarını buraya yazın..."
                  maxLength={10000}
                  className="flex min-h-[260px] w-full rounded-md border border-input bg-transparent px-4 py-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring leading-relaxed"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
              </div>
            </CardContent>

            <CardFooter className="border-t pt-6">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-base font-bold"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Kaydediliyor...
                  </>
                ) : editingId ? (
                  <>
                    Değişiklikleri Güncelle <Check className="ml-2 w-5 h-5" />
                  </>
                ) : (
                  <>
                    Haberi Yayınla <Send className="ml-2 w-5 h-5" />
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Live Preview & Guidelines */}
        <div className="space-y-6">
          <Card className="border-none shadow-lg bg-white overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-600" />
                Canlı Kart Önizlemesi
              </CardTitle>
            </CardHeader>
            <div className="px-6 pb-6">
              <div className="rounded-xl overflow-hidden border bg-slate-50">
                <div className="aspect-video bg-slate-200 relative overflow-hidden">
                  <img
                    src={previewImg}
                    alt="Önizleme"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-3 left-3">
                    <Badge className="bg-blue-600 border-none">{category}</Badge>
                  </div>
                </div>
                <div className="p-4 space-y-2">
                  <h4 className="font-bold text-slate-900 leading-snug line-clamp-2">
                    {title.trim() || 'Haber başlığınız burada görünecek'}
                  </h4>
                  <p className="text-xs text-slate-500 line-clamp-3">
                    {content.trim() || 'Haber metninin özeti burada önizlenecek...'}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="bg-slate-900 text-white border-none shadow-xl">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-400" />
                Editör Notları
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-3 opacity-85 leading-relaxed">
              <p>1. Buradan eklenen haberler doğrudan ana sayfadaki &ldquo;Latest Headlines&rdquo; akışında yayınlanır.</p>
              <p>2. Görsel URL boş bırakılırsa otomatik bir kapak görseli atanır.</p>
              <p>3. Yayınladığınız haberleri aşağıdaki listeden istediğiniz zaman düzenleyebilir veya silebilirsiniz.</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Published Articles Management */}
      <Card className="border-none shadow-xl bg-white">
        <CardHeader>
          <CardTitle>Yayınlanan Haberler ({articles.length})</CardTitle>
          <CardDescription>Mevcut haberleri düzenleyin veya yayından kaldırın.</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingArticles ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : articles.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              Henüz yayınlanmış bir haber yok. Yukarıdan ilk haberi ekleyebilirsiniz.
            </div>
          ) : (
            <div className="divide-y">
              {articles.map((item) => (
                <div
                  key={item.id}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4 min-w-0">
                    <img
                      src={item.imageUrl || `https://picsum.photos/seed/${item.id}/160/100`}
                      alt={item.title}
                      className="w-24 h-16 rounded-lg object-cover bg-slate-100 shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="text-[10px]">
                          {item.category}
                        </Badge>
                        <span className="text-xs text-slate-400">
                          {item.createdAt?.toDate
                            ? item.createdAt.toDate().toLocaleDateString('tr-TR')
                            : 'Yeni'}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 truncate">{item.title}</h4>
                      <p className="text-xs text-slate-500 line-clamp-1">{item.content}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEdit(item)}
                      className="gap-1.5"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Düzenle
                    </Button>

                    {confirmDeleteId === item.id ? (
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(item.id)}
                        >
                          Silmeyi Onayla
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmDeleteId(null)}
                        >
                          İptal
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmDeleteId(item.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
