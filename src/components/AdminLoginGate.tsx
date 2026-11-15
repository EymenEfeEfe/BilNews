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
import { ShieldCheck, Lock, Mail, Eye, EyeOff, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const ALLOWED_ADMIN_EMAIL = 'eymosuruk@gmail.com';
const ALLOWED_ADMIN_PASS = 'Obosbucoku.1';

interface AdminLoginGateProps {
  onAuthenticated: () => void;
}

export default function AdminLoginGate({ onAuthenticated }: AdminLoginGateProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [needsGoogleLink, setNeedsGoogleLink] = useState(false);
  const [providerDisabled, setProviderDisabled] = useState(false);

  const completeUnlock = () => {
    sessionStorage.setItem('bilinfom_admin_verified', 'true');
    toast.success('Admin Paneli açıldı! Hoş geldiniz.');
    onAuthenticated();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setNeedsGoogleLink(false);
    setProviderDisabled(false);

    const normalizedEmail = email.trim().toLowerCase();

    if (normalizedEmail !== ALLOWED_ADMIN_EMAIL || password !== ALLOWED_ADMIN_PASS) {
      setErrorMessage('Yetkisiz giriş! Yalnızca yetkili admin e-postası ve şifresi ile giriş yapılabilir.');
      return;
    }

    setIsSubmitting(true);
    try {
      // If already signed in via Google as the exact CEO email, link password if possible and unlock
      if (auth.currentUser && auth.currentUser.email?.toLowerCase() === ALLOWED_ADMIN_EMAIL) {
        const hasPasswordProvider = auth.currentUser.providerData.some(
          (p) => p.providerId === 'password'
        );
        if (!hasPasswordProvider) {
          try {
            const cred = EmailAuthProvider.credential(ALLOWED_ADMIN_EMAIL, password);
            await linkWithCredential(auth.currentUser, cred);
          } catch {
            // Even if Email/Password provider isn't enabled in Console yet, Google session proves ownership
          }
        }
        completeUnlock();
        return;
      }

      // Sign in with Firebase Email/Password
      try {
        await signInWithEmailAndPassword(auth, ALLOWED_ADMIN_EMAIL, password);
        completeUnlock();
        return;
      } catch (signInErr: any) {
        const code = signInErr?.code || '';

        if (code === 'auth/operation-not-allowed') {
          setProviderDisabled(true);
          setErrorMessage(
            'Firebase Console üzerinde Email/Password giriş yöntemi henüz aktif edilmemiş. Aşağıdaki adımla aktif edebilir veya doğrudan Google ile doğrulayabilirsiniz.'
          );
          return;
        }

        if (code === 'auth/user-not-found' || code === 'auth/invalid-credential') {
          // Try creating the Firebase Auth user on first login
          try {
            await createUserWithEmailAndPassword(auth, ALLOWED_ADMIN_EMAIL, password);
            completeUnlock();
            return;
          } catch (createErr: any) {
            const createCode = createErr?.code || '';
            if (createCode === 'auth/email-already-in-use') {
              setNeedsGoogleLink(true);
              setErrorMessage(
                'Bu e-posta adresi daha önce Google ile oluşturulmuş. Şifreyi hesabınıza bağlamak için bir kez Google ile doğrulayın.'
              );
              return;
            }
            if (createCode === 'auth/operation-not-allowed') {
              setProviderDisabled(true);
              setErrorMessage(
                'Firebase Console üzerinde Email/Password giriş yöntemi henüz aktif edilmemiş. Aşağıdan Google ile doğrulayabilirsiniz.'
              );
              return;
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
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user.email?.toLowerCase() !== ALLOWED_ADMIN_EMAIL) {
        setErrorMessage('Yetkisiz hesap. Bu panele yalnızca yetkili admin hesabı erişebilir.');
        return;
      }
      if (password === ALLOWED_ADMIN_PASS) {
        try {
          const cred = EmailAuthProvider.credential(ALLOWED_ADMIN_EMAIL, password);
          await linkWithCredential(result.user, cred);
        } catch {
          // Ignore if already linked or provider not enabled
        }
      }
      completeUnlock();
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
              <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs leading-relaxed flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                <div className="space-y-2">
                  <p>{errorMessage}</p>
                  {providerDisabled && (
                    <p className="text-[11px] text-red-600/90">
                      Firebase Console → Authentication → Sign-in method → <strong>Email/Password</strong> seçeneğini etkinleştirin.
                    </p>
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

            {(needsGoogleLink || providerDisabled) && (
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={handleGoogleVerifyAndLink}
                className="w-full border-blue-200 text-blue-700 hover:bg-blue-50"
              >
                Google ile Doğrula
              </Button>
            )}
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
