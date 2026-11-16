import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

export const ARTICLE_CATEGORIES = [
  'Okul Gündemi',
  'Duyurular',
  'Etkinlikler',
  'Kulüpler',
  'Spor',
  'Kültür & Sanat',
] as const;

export const NEWS_CATEGORIES = ['Tümü', ...ARTICLE_CATEGORIES] as const;

export const FORUM_CATEGORIES = [
  'Tümü',
  'Genel',
  'Okul Gündemi',
  'Dersler & Sınavlar',
  'Kulüpler',
  'Etkinlikler',
  'Öneriler',
] as const;

export const FORUM_POST_CATEGORIES = [
  'Genel',
  'Okul Gündemi',
  'Dersler & Sınavlar',
  'Kulüpler',
  'Etkinlikler',
  'Öneriler',
] as const;

const CATEGORY_MAP: Record<string, string> = {
  'okul gündemi': 'Okul Gündemi',
  gündem: 'Okul Gündemi',
  agenda: 'Okul Gündemi',
  duyuru: 'Duyurular',
  duyurular: 'Duyurular',
  etkinlik: 'Etkinlikler',
  etkinlikler: 'Etkinlikler',
  kulüp: 'Kulüpler',
  kulüpler: 'Kulüpler',
  spor: 'Spor',
  'kültür & sanat': 'Kültür & Sanat',
  'dersler & sınavlar': 'Dersler & Sınavlar',
  öneriler: 'Öneriler',
  genel: 'Genel',
  general: 'Genel',
  tech: 'Kulüpler',
  technology: 'Kulüpler',
  teknoloji: 'Kulüpler',
  world: 'Okul Gündemi',
  dünya: 'Okul Gündemi',
  science: 'Dersler & Sınavlar',
  bilim: 'Dersler & Sınavlar',
  economy: 'Duyurular',
  ekonomi: 'Duyurular',
  community: 'Okul Gündemi',
  topluluk: 'Okul Gündemi',
};

export function normalizeCategory(category?: string): string {
  if (!category) return 'Okul Gündemi';
  const key = category.trim().toLowerCase();
  return CATEGORY_MAP[key] || category.trim();
}

export function slugifyTurkish(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/i̇/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export function isValidHttpUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export const DEFAULT_NEWS_PHOTO_URL =
  'https://im.haberturk.com/l/2021/06/17/ver1623933667/3107170/jpg/960x540';

export function hasRealImageUrl(imageUrl?: string): boolean {
  if (!imageUrl) return false;
  const trimmed = imageUrl.trim();
  if (!trimmed) return false;
  if (trimmed.includes('picsum.photos') || trimmed.includes('placeholder.com')) {
    return false;
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function resolveNewsImage(imageUrl?: string): string {
  if (hasRealImageUrl(imageUrl)) {
    return imageUrl!.trim();
  }
  return DEFAULT_NEWS_PHOTO_URL;
}

export function stripMarkdown(markdown: string): string {
  return markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/#{1,6}\s+/g, '')
    .replace(/(\*\*|__|\*|_|~~|`{1,3}|>\s*)/g, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/\n+/g, ' ')
    .trim();
}

export function formatTurkishDate(timestamp: any): string {
  if (!timestamp) return 'Az önce';
  try {
    const date = typeof timestamp.toDate === 'function' ? timestamp.toDate() : new Date(timestamp);
    if (Number.isNaN(date.getTime())) return 'Az önce';
    return date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return 'Az önce';
  }
}

export function formatRelativeTurkishDate(timestamp: any): string {
  if (!timestamp) return 'Az önce';
  try {
    const date = typeof timestamp.toDate === 'function' ? timestamp.toDate() : new Date(timestamp);
    if (Number.isNaN(date.getTime())) return 'Az önce';
    const diffSeconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diffSeconds < 45) return 'Az önce';
    return formatDistanceToNow(date, { addSuffix: true, locale: tr }).replace(/^yaklaşık\s+/i, '');
  } catch {
    return 'Az önce';
  }
}

export function estimateReadingTime(content: string): string {
  const words = stripMarkdown(content).split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 180));
  return `${minutes} dk okuma`;
}

export interface AuthErrorDisplay {
  title: string;
  description: string;
}

export function getTurkishAuthError(error: any): AuthErrorDisplay {
  const code = error?.code || '';
  switch (code) {
    case 'auth/popup-closed-by-user':
      return {
        title: 'Giriş penceresi kapatıldı',
        description: 'Google hesabınızı seçmeden pencereyi kapattınız. Giriş yapmak için tekrar deneyebilirsiniz.',
      };
    case 'auth/cancelled-popup-request':
      return {
        title: 'Giriş isteği iptal edildi',
        description: 'Aynı anda birden fazla giriş penceresi açıldığı için önceki istek iptal edildi.',
      };
    case 'auth/popup-blocked':
      return {
        title: 'Açılır pencere engellendi',
        description: 'Tarayıcınız giriş penceresini engelledi. Lütfen bu site için açılır pencerelere izin verip tekrar deneyin.',
      };
    case 'auth/unauthorized-domain':
      return {
        title: `Yetkisiz alan adı: ${typeof window !== 'undefined' ? window.location.hostname : ''}`,
        description: 'Bu alan adı Firebase Console → Authentication → Settings → Authorized domains listesine eklenmelidir.',
      };
    case 'auth/network-request-failed':
      return {
        title: 'Bağlantı hatası',
        description: 'İnternet bağlantınızı kontrol edip lütfen tekrar deneyin.',
      };
    case 'auth/user-disabled':
      return {
        title: 'Hesap devre dışı',
        description: 'Bu kullanıcı hesabı yönetici tarafından devre dışı bırakılmış.',
      };
    default:
      return {
        title: 'Oturum açılamadı',
        description: error?.message || 'Kimlik doğrulama sırasında beklenmeyen bir sorun oluştu. Lütfen tekrar deneyin.',
      };
  }
}

export const SAMPLE_REALISTIC_NEWS = [
  {
    title: 'Bahar Şenliği ve Kulüp Tanıtım Günleri Takvimi Belli Oldu',
    category: 'Etkinlikler',
    imageUrl: DEFAULT_NEWS_PHOTO_URL,
    content:
      'Okul meclisi ve öğrenci kulüplerinin ortak hazırladığı **Bahar Şenliği**, bu ayın son haftasında okul bahçesinde gerçekleştirilecek.\n\n## Etkinlik Programı\n\n- Pazartesi: Kulüp stantları ve atölye kayıtları\n- Çarşamba: Öğrenci müzik grupları konseri\n- Cuma: Satranç ve masa tenisi finalleri\n\nGörev almak isteyen öğrenciler kulüp başkanlarıyla iletişime geçebilir.',
  },
  {
    title: 'Okul Kütüphanesinde Sınav Haftası Boyunca Ek Çalışma Saatleri',
    category: 'Duyurular',
    imageUrl: DEFAULT_NEWS_PHOTO_URL,
    content:
      'Yaklaşan yazılı haftası nedeniyle okul kütüphanesi önümüzdeki iki hafta boyunca **saat 18.30’a kadar** açık kalacak.\n\n> Sessiz çalışma bölümünde grup çalışması yapılmaması, ortak alanların düzenli bırakılması rica olunur.',
  },
  {
    title: 'Bilişim ve Robotik Kulübü Yeni Dönem Başvurularını Açtı',
    category: 'Kulüpler',
    imageUrl: DEFAULT_NEWS_PHOTO_URL,
    content:
      'Web geliştirme, Arduino ve algoritma çalışmalarına katılmak isteyen tüm sınıflardan öğrenciler için yeni dönem kayıtları başladı.\n\n- Haftalık toplantılar Çarşamba 15.40’ta Bilişim Laboratuvarı’nda\n- Başlangıç seviyesi için ön bilgi şartı aranmıyor',
  },
  {
    title: 'Okul Basketbol Takımımız Turnuvada Çeyrek Finale Yükseldi',
    category: 'Spor',
    imageUrl: DEFAULT_NEWS_PHOTO_URL,
    content:
      'İlçe okullar arası basketbol turnuvasında oynadığı üç maçı da kazanan okul takımımız adını **çeyrek finale** yazdırdı.\n\nBir sonraki karşılaşma Perşembe günü saat 14.00’te spor salonumuzda oynanacak. Tüm arkadaşlarımızı desteğe bekliyoruz.',
  },
];
