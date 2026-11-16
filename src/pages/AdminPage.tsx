import React from 'react';
import { LogOut, Crown, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBilnews } from '@/src/context/BilnewsContext';
import AdminLoginGate from '@/src/components/AdminLoginGate';
import AdminNewsDesk from '@/src/components/AdminNewsDesk';

export default function AdminPage() {
  const {
    user,
    isAuthorizedAdmin,
    isSuperAdmin,
    unlockAdmin,
    unlockSuperAdmin,
    lockAdmin,
  } = useBilnews();

  if (!isAuthorizedAdmin) {
    return (
      <AdminLoginGate
        onAuthenticatedAdmin={unlockAdmin}
        onAuthenticatedSuperAdmin={unlockSuperAdmin}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
          {isSuperAdmin ? (
            <span className="inline-flex items-center gap-1.5 font-semibold text-amber-700 dark:text-amber-400">
              <Crown className="w-4 h-4" />
              Süper Admin
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 font-semibold text-blue-700 dark:text-blue-400">
              <ShieldCheck className="w-4 h-4" />
              Yönetici
            </span>
          )}
          <span aria-hidden="true">·</span>
          <span className="truncate">{user?.email}</span>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={lockAdmin}
          className="text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/60 hover:bg-red-50 dark:hover:bg-red-950/40 gap-2 w-fit"
        >
          <LogOut className="w-4 h-4" />
          Yönetici Çıkışı Yap
        </Button>
      </div>
      <AdminNewsDesk />
    </div>
  );
}
