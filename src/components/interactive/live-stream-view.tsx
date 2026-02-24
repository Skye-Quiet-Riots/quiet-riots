'use client';

import { useState, useEffect, useRef } from 'react';

interface LiveStreamViewProps {
  onEnd: () => void;
}

export function LiveStreamView({ onEnd }: LiveStreamViewProps) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const timeDisplay = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className="rounded-xl border-2 border-red-300 bg-zinc-900 p-4 dark:border-red-700">
      {/* Camera placeholder */}
      <div className="relative mb-4 flex aspect-video items-center justify-center rounded-lg bg-zinc-800">
        {/* LIVE badge */}
        <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-md bg-red-600 px-2 py-1">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-white" />
          <span className="text-xs font-bold text-white">LIVE</span>
        </div>

        {/* Timer */}
        <div className="absolute right-3 top-3 rounded-md bg-black/60 px-2 py-1">
          <span className="font-mono text-xs text-white">{timeDisplay}</span>
        </div>

        {/* Camera icon placeholder */}
        <div className="text-center text-zinc-500">
          <svg
            className="mx-auto mb-2 h-12 w-12"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9.75a2.25 2.25 0 002.25-2.25V7.5a2.25 2.25 0 00-2.25-2.25H4.5A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
            />
          </svg>
          <p className="text-xs">Camera preview</p>
        </div>
      </div>

      {/* Status */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-red-500" />
          <span className="text-sm font-semibold text-white">You are live</span>
        </div>
        <span className="font-mono text-sm text-zinc-400">{timeDisplay}</span>
      </div>

      {/* End stream button */}
      <button
        onClick={onEnd}
        className="w-full rounded-lg border border-red-500 px-4 py-2 text-sm font-bold text-red-500 hover:bg-red-500 hover:text-white transition-colors"
      >
        End Stream
      </button>
    </div>
  );
}
