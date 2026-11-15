import React, { useState } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Newspaper, Send, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminNewsDesk() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('Tech');
  const [imageUrl, setImageUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return toast.error("Not authenticated");
    if (!title || !content) return toast.error("Title and content are required");

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'news'), {
        title,
        content,
        category,
        imageUrl: imageUrl || `https://picsum.photos/seed/${Date.now()}/800/400`,
        authorId: auth.currentUser.uid,
        authorName: auth.currentUser.displayName || 'Admin',
        createdAt: serverTimestamp()
      });
      
      toast.success("News article published successfully!");
      setTitle('');
      setContent('');
      setImageUrl('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'news');
      toast.error("Failed to publish news. Check permissions.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900 flex items-center gap-2">
            <Newspaper className="w-8 h-8 text-blue-600" />
            News Desk
          </h2>
          <p className="text-slate-500">Authorized personnel only: Publish official news articles.</p>
        </div>
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Whitelist Active</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-none shadow-xl bg-white">
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle>Compose Article</CardTitle>
              <CardDescription>Draft your latest headline for Bil Infom.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold uppercase tracking-wider text-slate-500">Headline</label>
                <Input 
                  placeholder="Enter a compelling title..." 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-lg font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase tracking-wider text-slate-500">Category</label>
                  <select 
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option>Tech</option>
                    <option>World</option>
                    <option>Science</option>
                    <option>Economy</option>
                    <option>Community</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase tracking-wider text-slate-500">Image URL (Optional)</label>
                  <div className="relative">
                    <Input 
                      placeholder="https://..." 
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      className="pl-9"
                    />
                    <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold uppercase tracking-wider text-slate-500">Body Content</label>
                <textarea 
                  placeholder="Tell the story..."
                  className="flex min-h-[300px] w-full rounded-md border border-input bg-transparent px-4 py-3 text-base shadow-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 leading-relaxed"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter className="border-t pt-6">
              <Button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-lg font-bold">
                {isSubmitting ? "Publishing..." : <>Publish to Headlines <Send className="ml-2 w-5 h-5" /></>}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <div className="space-y-6">
          <Card className="bg-slate-900 text-white border-none shadow-xl">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-400" />
                Admin Guidelines
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-4 opacity-80">
              <p>1. Ensure headlines are neutral and fact-checked.</p>
              <p>2. Use high-quality images (aspect ratio 16:9 preferred).</p>
              <p>3. News published here bypasses the community forum and appears directly in the Headlines section.</p>
              <p>4. Your name will be attached as the author.</p>
            </CardContent>
          </Card>

          <div className="p-6 rounded-xl bg-blue-50 border border-blue-100 italic text-sm text-blue-800">
            "With great information comes great responsibility. Keep the Bil Infom stream clean and accurate."
          </div>
        </div>
      </div>
    </div>
  );
}
