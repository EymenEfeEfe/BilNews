import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

export function PrivacyPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-blue-700 dark:hover:text-blue-400"
      >
        <ChevronLeft className="w-4 h-4" />
        Ana Sayfaya Dön
      </Link>

      <article className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-10 space-y-5">
        <header className="border-b border-stone-200 dark:border-slate-800 pb-4 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400">
            Yasal Bilgilendirme
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Gizlilik Politikası
          </h1>
        </header>

        <div className="space-y-4 text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed">
          <p>
            Bilnews olarak kullanıcılarımızın kişisel verilerinin güvenliğine önem veriyoruz. Platformumuz üzerinden Google hesabıyla oturum açtığınızda yalnızca adınız, e-posta adresiniz ve profil fotoğrafı bilginiz kimlik doğrulama ve forum katkılarınızı gösterebilmek amacıyla işlenir.
          </p>
          <p>
            Tema tercihiniz (Açık / Koyu mod) yalnızca tarayıcınızın yerel depolama alanında (localStorage) tutulur ve üçüncü taraflarla paylaşılmaz.
          </p>
          <p>
            Forumda paylaştığınız gönderiler ve yorumlar diğer ziyaretçiler tarafından görüntülenebilir. Verilerinizle ilgili her türlü talep için editör ekibimizle iletişime geçebilirsiniz.
          </p>
        </div>
      </article>
    </div>
  );
}

export function TermsOfUsePage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-blue-700 dark:hover:text-blue-400"
      >
        <ChevronLeft className="w-4 h-4" />
        Ana Sayfaya Dön
      </Link>

      <article className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-10 space-y-5">
        <header className="border-b border-stone-200 dark:border-slate-800 pb-4 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400">
            Yasal Bilgilendirme
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Kullanım Koşulları
          </h1>
        </header>

        <div className="space-y-4 text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed">
          <p>
            Bilnews platformunu kullanarak yayınlanan haber içeriklerinin yalnızca bilgilendirme amaçlı olduğunu ve topluluk forumunda paylaşılan görüşlerin ilgili yazarlara ait olduğunu kabul etmiş sayılırsınız.
          </p>
          <p>
            Forum alanlarında hakaret, nefret söylemi, spam, yanıltıcı bağlantı veya telif hakkı ihlali içeren paylaşımlar editör ekibi tarafından önceden bildirim yapılmaksızın kaldırılabilir.
          </p>
          <p>
            Bilnews, platform işleyişini ve kullanım koşullarını güncel ihtiyaçlara göre yenileme hakkını saklı tutar.
          </p>
        </div>
      </article>
    </div>
  );
}
