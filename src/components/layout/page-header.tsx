import Link from 'next/link';

interface Breadcrumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: Breadcrumb[];
}

export function PageHeader({ title, subtitle, breadcrumbs }: PageHeaderProps) {
  return (
    <div className="mb-6">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="mb-2 flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-zinc-300 dark:text-zinc-600">/</span>}
              {crumb.href ? (
                <Link href={crumb.href} className="hover:text-zinc-900 dark:hover:text-white">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-zinc-900 dark:text-white">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
      {subtitle && (
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">{subtitle}</p>
      )}
    </div>
  );
}
