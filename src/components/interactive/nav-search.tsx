'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { CategoryBadge } from '@/components/data/category-badge';
import { trackEvent } from '@/lib/analytics';
import type { Issue, Organisation, Category } from '@/types';

interface SearchResult {
  issues: Issue[];
  organisations: Organisation[];
}

/** CJK locales where a single character is a meaningful word. */
const CJK_LOCALES = new Set(['zh-CN', 'zh-TW', 'ja', 'ko']);

function getMinSearchLength(locale: string): number {
  return CJK_LOCALES.has(locale) ? 1 : 3;
}

/** Highlight matching text by splitting at match boundaries and wrapping in <mark>. */
function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query || query.length < 2) return <>{text}</>;

  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-blue-100 text-blue-900 dark:bg-blue-800/40 dark:text-blue-200">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

interface NavSearchProps {
  /** When true, render as full-screen mobile overlay. */
  mobile?: boolean;
  /** Callback when mobile overlay should close. */
  onClose?: () => void;
}

export function NavSearch({ mobile = false, onClose }: NavSearchProps) {
  const t = useTranslations('NavSearch');
  const tCat = useTranslations('Categories');
  const locale = useLocale();
  const router = useRouter();
  const minLen = getMinSearchLength(locale);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Flat list of navigable items for keyboard
  const flatItems: { type: 'issue' | 'org'; id: string; href: string }[] = [];
  if (results) {
    for (const issue of results.issues) {
      flatItems.push({ type: 'issue', id: issue.id, href: `/issues/${issue.id}` });
    }
    for (const org of results.organisations) {
      flatItems.push({ type: 'org', id: org.id, href: `/organisations/${org.id}` });
    }
  }

  // Debounced search
  useEffect(() => {
    if (query.trim().length < minLen) {
      setResults(null);
      setOpen(false);
      setError(false);
      return;
    }

    setLoading(true);
    setOpen(true);
    setActiveIndex(-1);

    const timer = setTimeout(() => {
      // Cancel any in-flight request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const params = new URLSearchParams({ q: query.trim() });
      if (locale) params.set('locale', locale);

      fetch(`/api/search?${params}`, { signal: controller.signal })
        .then((res) => {
          if (!res.ok) throw new Error('Search failed');
          return res.json();
        })
        .then((json) => {
          if (!controller.signal.aborted) {
            setResults(json.data);
            setLoading(false);
            setError(false);
            trackEvent('nav_search', { query: query.trim(), resultCount: (json.data.issues?.length ?? 0) + (json.data.organisations?.length ?? 0) });
          }
        })
        .catch((err) => {
          if (err instanceof DOMException && err.name === 'AbortError') return;
          if (!controller.signal.aborted) {
            setError(true);
            setLoading(false);
          }
        });
    }, 200);

    return () => {
      clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [query, locale, minLen]);

  // Close dropdown on outside click (desktop only)
  useEffect(() => {
    if (mobile) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobile]);

  // Mobile: lock body scroll + auto-focus
  useEffect(() => {
    if (!mobile) return;
    document.body.style.overflow = 'hidden';
    inputRef.current?.focus();
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobile]);

  // Mobile: handle back button
  useEffect(() => {
    if (!mobile || !onClose) return;
    const close = onClose;
    // Push a state so the back button closes the overlay
    window.history.pushState({ navSearch: true }, '');
    function handlePopState() {
      close();
    }
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [mobile, onClose]);

  const navigate = useCallback(
    (href: string) => {
      setOpen(false);
      setQuery('');
      if (onClose) onClose();
      router.push(href);
    },
    [router, onClose],
  );

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || flatItems.length === 0) {
      if (e.key === 'Escape' && mobile && onClose) {
        onClose();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((prev) => (prev < flatItems.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : flatItems.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < flatItems.length) {
          navigate(flatItems[activeIndex].href);
        }
        break;
      case 'Escape':
        e.preventDefault();
        if (mobile && onClose) {
          onClose();
        } else {
          setOpen(false);
          inputRef.current?.blur();
        }
        break;
    }
  }

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;
    const activeEl = listRef.current.querySelector(`[data-index="${activeIndex}"]`);
    activeEl?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const listboxId = 'nav-search-listbox';
  const activeDescendant =
    activeIndex >= 0 && flatItems[activeIndex]
      ? `nav-search-item-${flatItems[activeIndex].type}-${flatItems[activeIndex].id}`
      : undefined;

  const hasResults = results && (results.issues.length > 0 || results.organisations.length > 0);
  const showDropdown = open && query.trim().length >= minLen;

  const searchInput = (
    <div className="relative">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={showDropdown}
        aria-controls={listboxId}
        aria-activedescendant={activeDescendant}
        aria-autocomplete="list"
        aria-label={t('placeholder')}
        placeholder={t('placeholder')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => {
          if (results && query.trim().length >= minLen) setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        className={
          mobile
            ? 'w-full rounded-xl border border-zinc-200 bg-white py-3 ps-10 pe-4 text-base outline-none dark:border-zinc-700 dark:bg-zinc-900'
            : 'w-48 rounded-lg border border-zinc-200 bg-zinc-50 py-1.5 ps-9 pe-3 text-sm outline-none transition-all focus:w-64 focus:border-blue-300 focus:bg-white dark:border-zinc-700 dark:bg-zinc-800 dark:focus:border-blue-500 dark:focus:bg-zinc-900'
        }
      />
    </div>
  );

  const dropdown = showDropdown ? (
    <ul
      id={listboxId}
      ref={listRef}
      role="listbox"
      className={
        mobile
          ? 'mt-2 max-h-[calc(100vh-8rem)] overflow-y-auto'
          : 'absolute start-0 end-0 z-50 mt-1 max-h-80 overflow-y-auto rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900'
      }
    >
      {loading && (
        <li className="px-4 py-3 text-sm text-zinc-500" role="presentation">
          {t('searching')}
        </li>
      )}

      {!loading && error && (
        <li className="px-4 py-3 text-sm text-zinc-500" role="presentation">
          {t('partialResults')}
        </li>
      )}

      {!loading && !error && !hasResults && (
        <li className="px-4 py-3 text-sm text-zinc-500" role="presentation">
          {t('noResults')}
        </li>
      )}

      {!loading && hasResults && (
        <>
          {results!.issues.length > 0 && (
            <>
              <li
                className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500"
                role="presentation"
              >
                {t('issues')}
              </li>
              {results!.issues.map((issue, i) => {
                const idx = i;
                const itemId = `nav-search-item-issue-${issue.id}`;
                return (
                  <li
                    key={issue.id}
                    id={itemId}
                    role="option"
                    data-index={idx}
                    aria-selected={activeIndex === idx}
                    className={`flex cursor-pointer items-center gap-2 px-4 py-2 text-sm ${
                      activeIndex === idx
                        ? 'bg-blue-50 dark:bg-blue-900/30'
                        : 'hover:bg-zinc-50 dark:hover:bg-zinc-800'
                    }`}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onMouseDown={(e) => {
                      e.preventDefault(); // prevent blur before navigate
                      navigate(`/issues/${issue.id}`);
                    }}
                  >
                    <span className="flex-1 truncate">
                      <HighlightMatch text={issue.name} query={query} />
                    </span>
                    <CategoryBadge
                      category={issue.category}
                      label={tCat(issue.category)}
                      size="sm"
                    />
                  </li>
                );
              })}
            </>
          )}

          {results!.organisations.length > 0 && (
            <>
              <li
                className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500"
                role="presentation"
              >
                {t('organisations')}
              </li>
              {results!.organisations.map((org, i) => {
                const idx = results!.issues.length + i;
                const itemId = `nav-search-item-org-${org.id}`;
                return (
                  <li
                    key={org.id}
                    id={itemId}
                    role="option"
                    data-index={idx}
                    aria-selected={activeIndex === idx}
                    className={`flex cursor-pointer items-center gap-2 px-4 py-2 text-sm ${
                      activeIndex === idx
                        ? 'bg-blue-50 dark:bg-blue-900/30'
                        : 'hover:bg-zinc-50 dark:hover:bg-zinc-800'
                    }`}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      navigate(`/organisations/${org.id}`);
                    }}
                  >
                    <span className="me-1">{org.logo_emoji}</span>
                    <span className="flex-1 truncate">
                      <HighlightMatch text={org.name} query={query} />
                    </span>
                  </li>
                );
              })}
            </>
          )}
        </>
      )}
    </ul>
  ) : null;

  // Mobile full-screen overlay
  if (mobile) {
    return (
      <div className="fixed inset-0 z-[45] bg-white dark:bg-zinc-950">
        <div className="flex items-center gap-2 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label={t('close')}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <div className="flex-1">{searchInput}</div>
        </div>
        <div className="px-4">{dropdown}</div>
      </div>
    );
  }

  // Desktop compact search
  return (
    <div ref={containerRef} className="relative">
      {searchInput}
      {dropdown}
    </div>
  );
}
