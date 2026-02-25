'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { Message } from '@/types';

const TYPE_ICONS: Record<string, string> = {
  suggestion_received: '📬',
  suggestion_approved: '👍',
  suggestion_rejected: '👎',
  suggestion_merged: '🔀',
  suggestion_more_info: '❓',
  suggestion_live: '🎉',
  suggestion_progress: '📊',
  role_assigned: '🏅',
  general: '📩',
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

interface InboxListProps {
  initialMessages: Message[];
  initialUnreadCount: number;
}

export function InboxList({ initialMessages, initialUnreadCount }: InboxListProps) {
  const t = useTranslations('Inbox');
  const [messages, setMessages] = useState(initialMessages);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState(false);

  const filteredMessages = filter === 'unread' ? messages.filter((m) => m.read === 0) : messages;

  async function handleMarkRead(messageId: string) {
    const res = await fetch(`/api/messages/${messageId}/read`, { method: 'POST' });
    if (res.ok) {
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, read: 1 as const } : m)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  }

  async function handleMarkAllRead() {
    setLoading(true);
    const res = await fetch('/api/messages/read-all', { method: 'POST' });
    if (res.ok) {
      setMessages((prev) => prev.map((m) => ({ ...m, read: 1 as const })));
      setUnreadCount(0);
    }
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'
            }`}
          >
            {t('filterAll')}
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              filter === 'unread'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'
            }`}
          >
            {t('filterUnread', { count: unreadCount })}
          </button>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={loading}
            className="text-sm font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50 dark:text-blue-400"
          >
            {loading ? t('marking') : t('markAllRead')}
          </button>
        )}
      </div>

      {/* Message list */}
      {filteredMessages.length === 0 ? (
        <div className="py-12 text-center text-gray-500 dark:text-gray-400">
          {filter === 'unread' ? t('noUnread') : t('noMessages')}
        </div>
      ) : (
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {filteredMessages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 py-4 ${
                message.read === 0 ? 'bg-blue-50/50 dark:bg-blue-950/20' : 'bg-transparent'
              }`}
            >
              {/* Type icon */}
              <div className="flex-shrink-0 pt-0.5 text-xl">{TYPE_ICONS[message.type] || '📩'}</div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p
                      className={`text-sm ${
                        message.read === 0
                          ? 'font-semibold text-gray-900 dark:text-white'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {message.subject}
                    </p>
                    {message.sender_name && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {message.sender_name}
                      </p>
                    )}
                  </div>
                  <span className="flex-shrink-0 text-xs text-gray-400">
                    {formatDate(message.created_at)}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">
                  {message.body}
                </p>
                {message.read === 0 && (
                  <button
                    onClick={() => handleMarkRead(message.id)}
                    className="mt-1 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400"
                  >
                    {t('markAsRead')}
                  </button>
                )}
              </div>

              {/* Unread indicator */}
              {message.read === 0 && (
                <div className="flex-shrink-0 pt-2">
                  <div className="h-2 w-2 rounded-full bg-blue-600" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
