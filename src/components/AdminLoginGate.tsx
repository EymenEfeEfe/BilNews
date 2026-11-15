import React, { useState } from 'react';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  linkWithCredential,
} from '@/src/lib/firebase';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShieldCheck, Lock, Mail, Eye, EyeOff, AlertTriangle, Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

const ALLOWED_ADMIN_EMAIL = 'eymosuruk@gmail.com';
const ALLOWED_ADMIN_PASS = 'Obosbucoku.1';
const FIREBASE_PROVIDERS_URL =
  'https://console.firebase.google.com/project/gen-lang-client-0503930963/authentication/providers';

interface AdminLoginGateProps {
  onAuthenticated: () => void;
}

export default function AdminLoginGate({ onAuthenticated }: AdminLoginGateProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showGoogleFallback, setShowGoogleFallback] = useState(false);
  const [showConsoleGuide, setShowConsoleGuide] = useState(false);

  const completeUnlock = () => {
    sessionStorage.setItem('bilinfom_admin_verified', 'true');
    toast.success('Admin Paneli açıldı! Hoş geldiniz.');
    onAuthenticated();
  };

  const authenticateViaGoogleFallback = async (linkPassword: boolean) => {
    const result = await signInWithPopup(auth, googleProvider);
    if (result.user.email?.toLowerCase() !== ALLOWED_ADMIN_EMAIL) {
      setErrorMessage('Yetkisiz hesap. Bu panele yalnızca yetkili admin hesabı erişebilir.');
      return false;
    }
    if (linkPassword && password === ALLOWED_ADMIN_PASS) {
      try {
        const cred = EmailAuthProvider.credential(ALLOWED_ADMIN_EMAIL, password);
        await linkWithCredential(result.user, cred);
      } catch {
        // Provider might not be enabled yet or already linked; Google auth still grants Firestore CEO access
      }
    }
    completeUnlock();
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setShowGoogleFallback(false);
    setShowConsoleGuide(false);

    const normalizedEmail = email.trim().toLowerCase();

    if (normalizedEmail !== ALLOWED_ADMIN_EMAIL || password !== ALLOWED_ADMIN_PASS) {
      setErrorMessage('Yetkisiz giriş! E-posta veya şifre hatalı.');
      return;
    }

    setIsSubmitting(true);
    try {
      // If already signed into Firebase Auth with the CEO email, unlock immediately
      if (auth.currentUser && auth.currentUser.email?.toLowerCase() === ALLOWED_ADMIN_EMAIL) {
        const hasPasswordProvider = auth.currentUser.providerData.some(
          (p) => p.providerId === 'password'
        );
        if (!hasPasswordProvider) {
          try {
            const cred = EmailAuthProvider.credential(ALLOWED_ADMIN_EMAIL, password);
            await linkWithCredential(auth.currentUser, cred);
          } catch {
            // Safe to ignore if Email/Password provider is not enabled yet
          }
        }
        completeUnlock();
        return;
      }

      // Try Email/Password authentication in Firebase
      try {
        await signInWithEmailAndPassword(auth, ALLOWED_ADMIN_EMAIL, password);
        completeUnlock();
        return;
      } catch (signInErr: any) {
        const code = signInErr?.code || '';

        if (code === 'auth/operation-not-allowed') {
          // Automatically fall back to Google popup verification so user can enter right away
          try {
            await authenticateViaGoogleFallback(false);
            return;
          } catch (popupErr: any) {
            setShowGoogleFallback(true);
            setShowConsoleGuide(true);
            if (popupErr?.code === 'auth/popup-blocked') {
              setErrorMessage('Tarayıcı açılır pencereyi engelledi. Devam etmek için aşağıdaki butona tıklayın.');
            } else {
              setErrorMessage('Google doğrulaması tamamlanamadı. Tekrar denemek için aşağıdaki butonu kullanın.');
            }
            return;
          }
        }

        if (code === 'auth/user-not-found' || code === 'auth/invalid-credential') {
          try {
            await createUserWithEmailAndPassword(auth, ALLOWED_ADMIN_EMAIL, password);
            completeUnlock();
            return;
          } catch (createErr: any) {
            const createCode = createErr?.code || '';
            if (createCode === 'auth/email-already-in-use') {
              try {
                await authenticateViaGoogleFallback(true);
                return;
              } catch {
                setShowGoogleFallback(true);
                setErrorMessage('Hesabınızı şifreyle eşleştirmek için aşağıdaki butonla Google doğrulamasını tamamlayın.');
                return;
              }
            }
            if (createCode === 'auth/operation-not-allowed') {
              try {
                await authenticateViaGoogleFallback(false);
                return;
              } catch {
                setShowGoogleFallback(true);
                setShowConsoleGuide(true);
                setErrorMessage('Devam etmek için aşağıdaki butonla Google doğrulamasını tamamlayın.');
                return;
              }
            }
            throw createErr;
          }
        }

        throw signInErr;
      }
    } catch (err: any) {
      console.error('Admin login error:', err);
      setErrorMessage(err?.message || 'Giriş sırasında bir hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleVerifyAndLink = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await authenticateViaGoogleFallback(true);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Google doğrulaması başarısız oldu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-10">
      <Card className="border-none shadow-2xl bg-white overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-red-600" />
        <CardHeader className="text-center space-y-2 pb-4">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg">
            <ShieldCheck className="w-7 h-7 text-blue-400" />
          </div>
          <CardTitle className="text-2xl font-black tracking-tight text-slate-900">
            Admin Panel Girişi
          </CardTitle>
          <CardDescription>
            Haber eklemek ve yönetmek için yetkili admin bilgilerinizle giriş yapın.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {errorMessage && (
              <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <div className="space-y-2">
                  <p>{errorMessage}</p>
                  {showConsoleGuide && (
                    <a
                      href={FIREBASE_PROVIDERS_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline"
                    >
                      Firebase Console&apos;da Email/Password&apos;u aç <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Admin E-posta
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="email"
                  required
                  placeholder="E-posta adresinizi girin"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Admin Şifresi
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
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
              className="w-full bg-slate-900 hover:bg-slate-800 text-white h-11 font-bold"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Doğrulanıyor...
                </>
              ) : (
                'Admin Panele Giriş Yap'
              )}
            </Button>

            {showGoogleFallback && (
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={handleGoogleVerifyAndLink}
                className="w-full border-blue-200 text-blue-700 hover:bg-blue-50"
              >
                Google ile Doğrula ve Devam Et
              </Button>
            )}
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
