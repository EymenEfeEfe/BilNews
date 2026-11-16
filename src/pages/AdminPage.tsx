import React from 'react';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBilnews } from '@/src/context/BilnewsContext';
import AdminLoginGate from '@/src/components/AdminLoginGate';
import AdminNewsDesk from '@/src/components/AdminNewsDesk';

export default function AdminPage() {
  const { isAuthorizedAdmin, unlockAdmin, lockAdmin } = useBilnews();

  if (!isAuthorizedAdmin) {
    return <AdminLoginGate onAuthenticated={unlockAdmin} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={lockAdmin}
          className="text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/60 hover:bg-red-50 dark:hover:bg-red-950/40 gap-2"
        >
          <LogOut className="w-4 h-4" />
          Yönetici Çıkışı Yap
        </Button>
      </div>
      <AdminNewsDesk />
    </div>
  );
}
