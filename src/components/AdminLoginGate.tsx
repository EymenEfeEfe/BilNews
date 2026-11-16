import React, { useState } from 'react';
import {
  auth,
  db,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  EmailAuthProvider,
  linkWithCredential,
} from '@/src/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShieldCheck, Lock, Mail, Eye, EyeOff, AlertTriangle, Loader2, ExternalLink, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

const SUPER_ADMIN_EMAIL = 'eymosuruk@gmail.com';
const SUPER_ADMIN_PASSWORD = 'Obosbucoku.1';
const LEGACY_ADMIN_PASSWORDS: Record<string, string> = {
  'demirsozen67@gmail.com': 'demirsozen1212',
};

const FIREBASE_PROVIDERS_URL =
  'https://console.firebase.google.com/project/gen-lang-client-0503930963/authentication/providers';
const FIREBASE_SETTINGS_URL =
  'https://console.firebase.google.com/project/gen-lang-client-0503930963/authentication/settings';

interface AdminLoginGateProps {
  onAuthenticatedAdmin: () => void;
  onAuthenticatedSuperAdmin: () => void;
}

export default function AdminLoginGate({
  onAuthenticatedAdmin,
  onAuthenticatedSuperAdmin,
}: AdminLoginGateProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showConsoleGuide, setShowConsoleGuide] = useState(false);
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);

  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';

  const completeUnlock = (isSuper: boolean) => {
    if (isSuper) {
      sessionStorage.setItem('bilinfom_admin_verified', 'true');
      sessionStorage.setItem('bilinfom_super_admin_verified', 'true');
      toast.success('Süper Admin girişi doğrulandı! Hoş geldiniz.');
      onAuthenticatedSuperAdmin();
    } else {
      sessionStorage.setItem('bilinfom_admin_verified', 'true');
      toast.success('Yönetim Paneli açıldı! Hoş geldiniz.');
      onAuthenticatedAdmin();
    }
  };

  const handleCopyDomain = async () => {
    if (!unauthorizedDomain) return;
    try {
      await navigator.clipboard.writeText(unauthorizedDomain);
      setCopiedDomain(true);
      toast.success('Alan adı kopyalandı!');
      setTimeout(() => setCopiedDomain(false), 2000);
    } catch {
      toast.error('Kopyalanamadı, lütfen elle seçip kopyalayın.');
    }
  };

  const handlePopupError = (err: any) => {
    const code = err?.code || '';
    if (code === 'auth/unauthorized-domain') {
      setUnauthorizedDomain(currentHostname);
      setShowConsoleGuide(true);
      setErrorMessage(
        `Bu site adresi (${currentHostname}) Firebase yetkili domain listesinde ekli değil.`
      );
      return;
    }
    setShowConsoleGuide(true);
    if (code === 'auth/popup-blocked') {
      setErrorMessage('Tarayıcı açılır pencereyi engelledi. Lütfen açılır pencerelere izin verip tekrar deneyin.');
    } else if (code === 'auth/popup-closed-by-user') {
      setErrorMessage('Google giriş penceresini seçmeden kapattınız. Tekrar deneyebilirsiniz.');
    } else {
      setErrorMessage(err?.message || 'Google doğrulaması tamamlanamadı.');
    }
  };

  const authenticateSuperOrLegacyViaGoogleFallback = async (
    targetEmail: string,
    targetPassword: string,
    linkPassword: boolean
  ) => {
    const result = await signInWithPopup(auth, googleProvider);
    const resultEmail = result.user.email?.toLowerCase() || '';
    if (!resultEmail || resultEmail !== targetEmail) {
      setErrorMessage('Yetkisiz hesap. Lütfen girdiğiniz yetkili yönetici hesabıyla doğrulayın.');
      return false;
    }
    if (linkPassword) {
      try {
        const cred = EmailAuthProvider.credential(resultEmail, targetPassword);
        await linkWithCredential(result.user, cred);
      } catch {
        // Provider might not be enabled yet or already linked
      }
    }
    completeUnlock(resultEmail === SUPER_ADMIN_EMAIL && targetPassword === SUPER_ADMIN_PASSWORD);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setShowConsoleGuide(false);
    setUnauthorizedDomain(null);

    const normalizedEmail = email.trim().toLowerCase();
    const isSuperAttempt = normalizedEmail === SUPER_ADMIN_EMAIL;
    const legacyExpected = LEGACY_ADMIN_PASSWORDS[normalizedEmail];

    if (isSuperAttempt) {
      if (password !== SUPER_ADMIN_PASSWORD) {
        setErrorMessage('Yetkisiz giriş! Süper Admin e-posta veya şifresi hatalı.');
        return;
      }
    } else if (legacyExpected) {
      if (password !== legacyExpected) {
        setErrorMessage('Yetkisiz giriş! E-posta veya şifre hatalı.');
        return;
      }
    } else {
      setErrorMessage(
        'E-posta/şifre girişi yalnızca Süper Admin ve şifre tanımlı yöneticiler içindir. Süper Admin tarafından e-posta ile yetkilendirildiyseniz aşağıdaki Google ile Yönetici Girişi butonunu kullanın.'
      );
      return;
    }

    const expectedPassword = isSuperAttempt ? SUPER_ADMIN_PASSWORD : legacyExpected;

    setIsSubmitting(true);
    try {
      if (auth.currentUser) {
        if (auth.currentUser.email?.toLowerCase() === normalizedEmail) {
          const hasPasswordProvider = auth.currentUser.providerData.some(
            (p) => p.providerId === 'password'
          );
          if (!hasPasswordProvider) {
            try {
              const cred = EmailAuthProvider.credential(normalizedEmail, expectedPassword);
              await linkWithCredential(auth.currentUser, cred);
            } catch {
              // Safe to ignore
            }
          }
          completeUnlock(isSuperAttempt);
          return;
        }
        await signOut(auth);
      }

      try {
        await signInWithEmailAndPassword(auth, normalizedEmail, expectedPassword);
        completeUnlock(isSuperAttempt);
        return;
      } catch (signInErr: any) {
        const code = signInErr?.code || '';

        if (code === 'auth/operation-not-allowed') {
          try {
            await authenticateSuperOrLegacyViaGoogleFallback(
              normalizedEmail,
              expectedPassword,
              false
            );
            return;
          } catch (popupErr: any) {
            handlePopupError(popupErr);
            return;
          }
        }

        if (code === 'auth/user-not-found' || code === 'auth/invalid-credential') {
          try {
            await createUserWithEmailAndPassword(auth, normalizedEmail, expectedPassword);
            completeUnlock(isSuperAttempt);
            return;
          } catch (createErr: any) {
            const createCode = createErr?.code || '';
            if (createCode === 'auth/email-already-in-use') {
              try {
                await authenticateSuperOrLegacyViaGoogleFallback(
                  normalizedEmail,
                  expectedPassword,
                  true
                );
                return;
              } catch (popupErr: any) {
                handlePopupError(popupErr);
                return;
              }
            }
            if (createCode === 'auth/operation-not-allowed') {
              try {
                await authenticateSuperOrLegacyViaGoogleFallback(
                  normalizedEmail,
                  expectedPassword,
                  false
                );
                return;
              } catch (popupErr: any) {
                handlePopupError(popupErr);
                return;
              }
            }
            throw createErr;
          }
        }

        throw signInErr;
      }
    } catch (err: any) {
      console.error('Admin giriş hatası:', err);
      setErrorMessage(err?.message || 'Giriş sırasında bir hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Sign-in flow for admins granted access by email by the Super Admin
  const handleGoogleAdminLogin = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setUnauthorizedDomain(null);
    setShowConsoleGuide(false);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const resultEmail = result.user.email?.toLowerCase() || '';

      if (!resultEmail) {
        setErrorMessage('Google hesabınızdan e-posta adresi alınamadı.');
        return;
      }

      if (resultEmail === SUPER_ADMIN_EMAIL) {
        setErrorMessage(
          'Süper Admin hesabı için yukarıdaki forma e-posta ve Süper Admin şifrenizi girerek giriş yapmalısınız.'
        );
        return;
      }

      if (resultEmail in LEGACY_ADMIN_PASSWORDS) {
        completeUnlock(false);
        return;
      }

      const grantSnap = await getDoc(doc(db, 'admin_emails', resultEmail));
      if (grantSnap.exists()) {
        completeUnlock(false);
      } else {
        setErrorMessage(
          `${resultEmail} adresine henüz Süper Admin tarafından yöneticilik yetkisi verilmemiş.`
        );
      }
    } catch (err: any) {
      handlePopupError(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-10">
      <Card className="border border-stone-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
        <CardHeader className="text-center space-y-2 pb-4 border-b border-stone-100 dark:border-slate-800">
          <div className="mx-auto w-12 h-12 rounded-xl bg-slate-900 dark:bg-blue-700 text-white flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <CardTitle className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Yönetim Paneli Girişi
          </CardTitle>
          <CardDescription className="text-slate-600 dark:text-slate-400">
            Süper Admin şifresiyle veya Süper Admin tarafından yetkilendirilmiş Google e-postanızla giriş yapın.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 pt-6">
            {errorMessage && (
              <div className="p-3.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs leading-relaxed flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <div className="space-y-2.5 flex-1">
                  <p className="font-medium">{errorMessage}</p>

                  {unauthorizedDomain && (
                    <div className="p-2.5 rounded bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 space-y-2">
                      <p className="text-[11px] text-slate-600 dark:text-slate-400">
                        Firebase Console → Authentication → Settings → <strong>Authorized domains</strong> listesine şu adresi ekleyin:
                      </p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 px-2 py-1 rounded bg-stone-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-[11px] truncate">
                          {unauthorizedDomain}
                        </code>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={handleCopyDomain}
                          className="h-7 px-2 text-[11px]"
                        >
                          {copiedDomain ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        </Button>
                      </div>
                      <a
                        href={FIREBASE_SETTINGS_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-blue-700 dark:text-blue-400 hover:underline text-[11px]"
                      >
                        Yetkili Domain Ayarlarını Aç <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}

                  {showConsoleGuide && (
                    <div className="pt-1">
                      <a
                        href={FIREBASE_PROVIDERS_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-blue-700 dark:text-blue-400 hover:underline text-[11px]"
                      >
                        Firebase Console&apos;da Email/Password&apos;u aç <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Yönetici E-posta
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="email"
                  required
                  placeholder="E-posta adresinizi girin"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 bg-stone-50 dark:bg-slate-800/70 border-stone-200 dark:border-slate-700"
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Yönetici Şifresi
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 pr-10 bg-stone-50 dark:bg-slate-800/70 border-stone-200 dark:border-slate-700"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  tabIndex={-1}
                  aria-label="Şifreyi göster/gizle"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 pt-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-blue-700 dark:hover:bg-blue-800 text-white h-11 font-semibold"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Doğrulanıyor...
                </>
              ) : (
                'Şifre ile Giriş Yap'
              )}
            </Button>

            <div className="relative w-full py-1">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-stone-200 dark:border-slate-800" />
              </div>
              <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
                <span className="bg-white dark:bg-slate-900 px-2 text-slate-400">
                  veya yetkili e-posta ile
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={handleGoogleAdminLogin}
              className="w-full border-stone-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-stone-50 dark:hover:bg-slate-800"
            >
              Yetkili Google Hesabıyla Giriş Yap
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
