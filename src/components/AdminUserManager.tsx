import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { 
  collection, 
  onSnapshot, 
  setDoc, 
  doc, 
  deleteDoc, 
  query, 
  limit, 
  getDocs,
  where 
} from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ShieldAlert, UserPlus, Trash2, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface AdminMember {
  id: string;
  email?: string;
  addedAt?: any;
}

interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string;
}

export default function AdminUserManager() {
  const [admins, setAdmins] = useState<AdminMember[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loadingAdmins, setLoadingAdmins] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'admins'), (snap) => {
      setAdmins(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoadingAdmins(false);
    }, (e) => handleFirestoreError(e, OperationType.LIST, 'admins'));
    return () => unsub();
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      // Searching by email
      const q = query(
        collection(db, 'users'), 
        where('email', '==', searchQuery.trim().toLowerCase()),
        limit(5)
      );
      const snap = await getDocs(q);
      setSearchResults(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile)));
      if (snap.empty) toast.info("No user found with that email.");
    } catch (e) {
      console.error(e);
      toast.error("Search failed.");
    } finally {
      setIsSearching(false);
    }
  };

  const promoteToAdmin = async (user: UserProfile) => {
    try {
      await setDoc(doc(db, 'admins', user.id), {
        email: user.email,
        addedAt: new Date()
      });
      toast.success(`${user.username} is now an Admin.`);
      setSearchResults([]);
      setSearchQuery('');
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'admins');
    }
  };

  const demoteFromAdmin = async (adminId: string) => {
    try {
      await deleteDoc(doc(db, 'admins', adminId));
      toast.info("Admin status removed.");
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, 'admins');
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-8 h-8 text-red-600" />
            Admin Management
          </h2>
          <p className="text-slate-500">Add or remove members from the executive team.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Admin List */}
        <Card className="border-none shadow-xl bg-white">
          <CardHeader>
            <CardTitle>Current Administrators</CardTitle>
            <CardDescription>Members currently white-listed to access the News Desk.</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingAdmins ? (
               <div className="flex justify-center py-8"><Loader2 className="animate-spin opacity-20" /></div>
            ) : (
              <div className="space-y-3">
                {admins.map((admin) => (
                  <div key={admin.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                        {admin.email?.[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{admin.email}</p>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest">UID: {admin.id.slice(0, 8)}...</p>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => demoteFromAdmin(admin.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {admins.length === 0 && (
                  <p className="text-center py-8 text-slate-400 italic">No additional admins yet.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Admin */}
        <div className="space-y-6">
          <Card className="border-none shadow-xl bg-white overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-red-600" />
            <CardHeader>
              <CardTitle>Add New Admin</CardTitle>
              <CardDescription>Search for a user by their registered email address.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    placeholder="user@example.com" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
                <Button onClick={handleSearch} disabled={isSearching}>
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
                </Button>
              </div>

              <div className="space-y-2">
                {searchResults.map((result) => (
                  <div key={result.id} className="flex items-center justify-between p-4 border rounded-xl bg-white shadow-sm hover:ring-1 hover:ring-red-200 transition-all">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={result.avatarUrl} />
                        <AvatarFallback>{result.username[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-bold">{result.username}</p>
                        <p className="text-xs text-slate-500">{result.email}</p>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => promoteToAdmin(result)} className="bg-red-600 hover:bg-red-700">
                      <UserPlus className="w-4 h-4 mr-2" /> Promote
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="p-4 rounded-lg bg-orange-50 border border-orange-100 text-xs text-orange-800 leading-relaxed">
            <strong>Warning:</strong> Admins can publish, edit, and delete news articles. Only promote trusted team members. As CEO, your access is permanent and cannot be revoked by other admins.
          </div>
        </div>
      </div>
    </div>
  );
}
