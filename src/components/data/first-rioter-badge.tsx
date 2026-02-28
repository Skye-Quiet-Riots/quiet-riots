import Image from 'next/image';
import { Link } from '@/i18n/navigation';

interface FirstRioterBadgeProps {
  userId: string;
  userName: string | null;
  userImage: string | null;
  isPublic: boolean;
  approvedAt: string | null;
  locale: string;
  labels: {
    imageAlt: string;
    fallbackName: string;
    badge: string;
    anonymous: string;
  };
}

export function FirstRioterBadge({
  userId,
  userName,
  userImage,
  isPublic,
  approvedAt,
  locale,
  labels,
}: FirstRioterBadgeProps) {
  const formattedDate = approvedAt
    ? new Date(approvedAt).toLocaleDateString(locale, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 dark:border-green-800 dark:bg-green-950">
      <span className="text-lg">👍</span>
      <div className="flex items-center gap-2">
        {isPublic ? (
          <>
            <Link href={`/profile/${userId}`} className="flex items-center gap-2 hover:underline">
              {userImage ? (
                <Image
                  src={userImage}
                  alt={userName ?? labels.imageAlt}
                  width={24}
                  height={24}
                  className="rounded-full"
                />
              ) : (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                  {userName?.charAt(0).toUpperCase() ?? '?'}
                </span>
              )}
              <span className="text-sm font-medium text-green-800 dark:text-green-200">
                {userName ?? labels.fallbackName}
              </span>
            </Link>
            <span className="text-sm text-green-600 dark:text-green-400">{labels.badge}</span>
          </>
        ) : (
          <>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-400 text-xs text-white dark:bg-zinc-600">
              ?
            </span>
            <span className="text-sm text-green-600 dark:text-green-400">{labels.anonymous}</span>
          </>
        )}
        {formattedDate && (
          <span className="text-xs text-green-500 dark:text-green-500">· {formattedDate}</span>
        )}
      </div>
    </div>
  );
}
