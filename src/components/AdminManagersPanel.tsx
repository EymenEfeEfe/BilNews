import React, { useEffect, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { SUPER_ADMIN_EMAIL } from '@/src/context/BilnewsContext';
import { AdminEmailEntry } from '@/src/types';
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
import { Crown, Loader2, Mail, ShieldCheck, Trash2, UserPlus } from 'lucide-react';
import { formatTurkishDate } from '@/src/lib/editorial';
import { toast } from 'sonner';

const EMAIL_REGEX = /^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/;

export default function AdminManagersPanel() {
  const [adminEmails, setAdminEmails] = useState<AdminEmailEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [emailInput, setEmailInput] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [pendingRevoke, setPendingRevoke] = useState<AdminEmailEntry | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const adminsQuery = query(collection(db, 'admin_emails'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      adminsQuery,
      (snap) => {
        if (!active) return;
        setAdminEmails(snap.docs.map((d) => ({ id: d.id, ...d.data() } as AdminEmailEntry)));
        setLoading(false);
      },
      (error) => {
        if (!active) return;
        setLoading(false);
        handleFirestoreError(error, OperationType.LIST, 'admin_emails');
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const handleGrantAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = emailInput.trim().toLowerCase();
    const cleanNote = noteInput.trim().slice(0, 100);

    if (!EMAIL_REGEX.test(cleanEmail) || cleanEmail.length > 200) {
      toast.error('Lütfen geçerli bir e-posta adresi girin.');
      return;
    }
    if (cleanEmail === SUPER_ADMIN_EMAIL) {
      toast.info('Bu hesap zaten kalıcı Süper Admin yetkisine sahiptir.');
      return;
    }
    if (adminEmails.some((a) => a.email === cleanEmail)) {
      toast.info('Bu e-posta adresi zaten yönetici olarak ekli.');
      return;
    }

    setIsSaving(true);
    try {
      await setDoc(doc(db, 'admin_emails', cleanEmail), {
        email: cleanEmail,
        note: cleanNote || null,
        addedBy: SUPER_ADMIN_EMAIL,
        createdAt: serverTimestamp(),
      });
      setEmailInput('');
      setNoteInput('');
      toast.success(`${cleanEmail} adresine yöneticilik yetkisi verildi!`);
    } catch (error) {
      toast.error('Yönetici yetkisi verilemedi.');
      handleFirestoreError(error, OperationType.CREATE, `admin_emails/${cleanEmail}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmRevoke = async () => {
    if (!pendingRevoke) return;
    setIsRevoking(true);
    try {
      await deleteDoc(doc(db, 'admin_emails', pendingRevoke.id));
      toast.info(`${pendingRevoke.email} adresinin yöneticilik yetkisi kaldırıldı.`);
      setPendingRevoke(null);
    } catch (error) {
      toast.error('Yönetici yetkisi kaldırılamadı.');
      handleFirestoreError(error, OperationType.DELETE, `admin_emails/${pendingRevoke.id}`);
    } finally {
      setIsRevoking(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <Card className="lg:col-span-5 border border-stone-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
        <form onSubmit={handleGrantAdmin}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <UserPlus className="w-5 h-5 text-blue-700 dark:text-blue-400" />
              E-posta ile Adminlik Ver
            </CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400">
              Süper Admin olarak dilediğiniz kişiye e-posta adresi üzerinden yönetim paneli yetkisi tanımlayın.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Yetkilendirilecek E-posta
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="email"
                  required
                  placeholder="ornek@gmail.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  maxLength={200}
                  className="pl-9 bg-stone-50 dark:bg-slate-800/70 border-stone-200 dark:border-slate-700"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Görev / Not (Opsiyonel)
              </label>
              <Input
                placeholder="Örn: Spor Editörü, Kulüp Sorumlusu"
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                maxLength={100}
                className="bg-stone-50 dark:bg-slate-800/70 border-stone-200 dark:border-slate-700"
              />
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Yetki verdiğiniz kişi, bu e-posta adresine bağlı Google hesabıyla giriş yaptığında Yönetim Paneli&apos;ne erişebilir; ancak diğer yöneticileri değiştirme yetkisi yalnızca Süper Admin&apos;dedir.
            </p>
          </CardContent>

          <CardFooter>
            <Button
              type="submit"
              disabled={isSaving}
              className="w-full bg-blue-700 hover:bg-blue-800 text-white gap-2"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              Adminlik Yetkisi Ver
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card className="lg:col-span-7 border border-stone-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100 tabular-nums">
            <ShieldCheck className="w-5 h-5 text-blue-700 dark:text-blue-400" />
            Yetkili Yöneticiler ({adminEmails.length + 1})
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Süper Admin ve e-posta ile yetkilendirilmiş tüm yöneticiler.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-2">
          {/* Pinned Super Admin Row */}
          <div className="py-3 px-3.5 rounded-lg border border-amber-200/80 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/20 flex items-center justify-between gap-3">
            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-400">
                <Crown className="w-3.5 h-3.5" />
                Süper Admin (Kalıcı)
              </div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                {SUPER_ADMIN_EMAIL}
              </p>
            </div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 shrink-0">
              Tam Yetki
            </span>
          </div>

          {loading ? (
            <div className="py-10 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : adminEmails.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
              Henüz e-posta ile eklenmiş başka bir yönetici bulunmuyor.
            </p>
          ) : (
            <div className="divide-y divide-stone-100 dark:divide-slate-800 pt-2">
              {adminEmails.map((entry) => (
                <div
                  key={entry.id}
                  className="py-3.5 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-blue-700 dark:text-blue-400">
                        Yönetici
                      </span>
                      {entry.note && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{entry.note}</span>
                        </>
                      )}
                      <span aria-hidden="true">·</span>
                      <span>{formatTurkishDate(entry.createdAt)}</span>
                    </div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {entry.email}
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setPendingRevoke(entry)}
                    aria-label="Admin yetkisini kaldır"
                    className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 gap-1.5 shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                    Yetkiyi Al
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <SpringModal
        open={Boolean(pendingRevoke)}
        onClose={() => !isRevoking && setPendingRevoke(null)}
        title="Yönetici Yetkisini Kaldır"
        description="Bu e-posta adresinin yönetim paneli erişimi hemen sonlandırılacak."
      >
        <div className="space-y-5">
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            <strong className="text-slate-900 dark:text-slate-100">
              {pendingRevoke?.email}
            </strong>{' '}
            adresinin yöneticilik yetkisini kaldırmak istediğinizden emin misiniz?
          </p>
          <div className="flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              disabled={isRevoking}
              onClick={() => setPendingRevoke(null)}
            >
              Vazgeç
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isRevoking}
              onClick={handleConfirmRevoke}
              className="gap-2"
            >
              {isRevoking && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Yetkiyi Kaldır
            </Button>
          </div>
        </div>
      </SpringModal>
    </div>
  );
}
