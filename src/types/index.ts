export type NewsStatus = 'published' | 'draft';

export interface NewsArticle {
  id: string;
  title: string;
  content: string;
  authorId?: string;
  authorName: string;
  category: string;
  status?: NewsStatus;
  createdAt: any;
  updatedAt?: any;
  imageUrl?: string;
}

export interface NewsCategory {
  id: string;
  name: string;
  slug: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface ForumPost {
  id: string;
  title: string;
  content: string;
  authorId?: string;
  authorName: string;
  category: string;
  createdAt: any;
  commentCount: number;
}

export interface ForumComment {
  id: string;
  postId?: string;
  authorId?: string;
  content: string;
  authorName: string;
  createdAt: any;
}
