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

export type ReactionType = 'like' | 'heart' | 'clap' | 'fire' | 'thinking';

export interface ArticleReaction {
  id: string; // matches userId
  articleId: string;
  userId: string;
  type: ReactionType;
  createdAt: any;
  updatedAt?: any;
}

export interface ArticleComment {
  id: string;
  articleId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string | null;
  content: string;
  createdAt: any;
}

export interface PollOption {
  id: string;
  label: string;
}

export type PollStatus = 'active' | 'closed';

export interface StudentPoll {
  id: string;
  question: string;
  options: PollOption[];
  status: PollStatus;
  createdBy: string;
  createdAt: any;
  updatedAt?: any;
}

export interface PollVote {
  id: string; // matches userId
  pollId: string;
  userId: string;
  optionId: string;
  createdAt: any;
  updatedAt?: any;
}

export interface UserBookmark {
  id: string; // matches articleId
  articleId: string;
  userId: string;
  title: string;
  category: string;
  imageUrl?: string | null;
  createdAt: any;
}

export type NewsTipStatus = 'pending' | 'reviewed' | 'archived';

export interface NewsTip {
  id: string;
  title: string;
  details: string;
  category: string;
  authorId: string;
  authorName: string;
  isAnonymous: boolean;
  status: NewsTipStatus;
  createdAt: any;
  updatedAt?: any;
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

export interface AdminEmailEntry {
  id: string; // normalized lowercase email
  email: string;
  note?: string | null;
  addedBy: string;
  createdAt: any;
}
