import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/session';
import { getUserById } from '@/lib/queries/users';
import { getChickenPricing } from '@/lib/queries/chicken';
import { getOrCreateWallet } from '@/lib/queries/wallet';
import { getAllIssues } from '@/lib/queries/issues';
import { translateEntities } from '@/lib/queries/translate';
import { translateCountryNames } from '@/lib/queries/translate';
import { formatCurrency } from '@/lib/format';
import { PageHeader } from '@/components/layout/page-header';
import { ChickenDeployForm } from '@/components/interactive/chicken-deploy-form';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function ChickenPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Chicken');

  // Get pricing (default to GB)
  const pricing = await getChickenPricing('GB');

  // Get user and wallet
  const userId = await getSession();
  const user = userId ? await getUserById(userId) : null;
  const wallet = user ? await getOrCreateWallet(user.id) : null;

  // Get countries for the form
  const db = getDb();
  const countryResult = await db.execute({
    sql: 'SELECT code, name FROM countries ORDER BY name',
    args: [],
  });
  const rawCountries = countryResult.rows.map((row) => ({
    code: row.code as string,
    name: row.name as string,
  }));
  const countries = translateCountryNames(rawCountries, locale);

  // Get user's joined issues for the optional link
  const rawIssues = await getAllIssues();
  const issues = await translateEntities(rawIssues, 'issue', locale);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      {/* How It Works */}
      <div className="mb-8">
        <h2 className="mb-4 text-lg font-bold">{t('howItWorks')}</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { title: t('step1Title'), desc: t('step1Desc'), icon: '🎯' },
            { title: t('step2Title'), desc: t('step2Desc'), icon: '✍️' },
            { title: t('step3Title'), desc: t('step3Desc'), icon: '🐔' },
          ].map((step, i) => (
            <div
              key={i}
              className="rounded-xl border border-zinc-200 bg-white p-4 text-center dark:border-zinc-700 dark:bg-zinc-900"
            >
              <div className="mb-2 text-3xl">{step.icon}</div>
              <h3 className="mb-1 text-sm font-bold">{step.title}</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing */}
      {pricing && (
        <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950/30">
          <h2 className="mb-2 text-lg font-bold">{t('pricing')}</h2>
          <p className="text-sm">
            {t('basePrice')}:{' '}
            <span className="font-bold text-amber-700 dark:text-amber-300">
              {formatCurrency(pricing.base_price_pence, pricing.currency)}
            </span>
          </p>
          {pricing.express_surcharge_pence > 0 && (
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
              {t('expressAvailable')} (+
              {formatCurrency(pricing.express_surcharge_pence, pricing.currency)})
            </p>
          )}
        </div>
      )}

      {/* Deploy Form or Login Prompt */}
      {user && wallet && pricing ? (
        <ChickenDeployForm
          pricingId={pricing.id}
          basePricePence={pricing.base_price_pence}
          expressSurchargePence={pricing.express_surcharge_pence}
          currency={pricing.currency}
          userBalance={wallet.balance_pence}
          issues={issues.map((i) => ({ id: i.id, name: i.name }))}
          countries={countries}
          defaultCountry="GB"
        />
      ) : (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-8 text-center dark:border-zinc-700 dark:bg-zinc-800/50">
          <p className="mb-1 text-lg font-semibold">{t('loginRequired')}</p>
          <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">{t('loginPrompt')}</p>
          <Link
            href="/profile"
            className="inline-block rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
          >
            {t('createAccount')}
          </Link>
        </div>
      )}

      {/* Link to My Deployments */}
      {user && (
        <div className="mt-6 text-center">
          <Link
            href="/chicken/deployments"
            className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            {t('viewDeployments')}
          </Link>
        </div>
      )}
    </div>
  );
}
