'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { FeedPost } from '@/types';
import { FeedPostCard } from '@/components/cards/feed-post-card';
import { FeedComposer } from '@/components/interactive/feed-composer';

interface FeedSectionProps {
  issueId: string;
  initialPosts: FeedPost[];
}

export function FeedSection({ issueId, initialPosts }: FeedSectionProps) {
  const t = useTranslations('Feed');
  const [posts, setPosts] = useState(initialPosts);

  function handleNewPost(post: FeedPost) {
    setPosts([post, ...posts]);
  }

  return (
    <div>
      <FeedComposer issueId={issueId} onPost={handleNewPost} />
      <div className="mt-4 space-y-3">
        {posts.map((post) => (
          <FeedPostCard key={post.id} post={post} />
        ))}
        {posts.length === 0 && (
          <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">{t('empty')}</p>
        )}
      </div>
    </div>
  );
}
