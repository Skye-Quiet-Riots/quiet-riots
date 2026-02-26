'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';

interface IdentityFormData {
  legal_first_name: string;
  legal_middle_name: string;
  legal_last_name: string;
  date_of_birth: string;
  gender: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  state_province: string;
  postal_code: string;
  country_code: string;
  phone: string;
  id_document_type: string;
  id_document_country: string;
}

export function ShareIdentityForm() {
  const t = useTranslations('Share');
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState<IdentityFormData>({
    legal_first_name: '',
    legal_middle_name: '',
    legal_last_name: '',
    date_of_birth: '',
    gender: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    state_province: '',
    postal_code: '',
    country_code: '',
    phone: '',
    id_document_type: '',
    id_document_country: '',
  });

  function updateField(field: keyof IdentityFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Client-side age check
    if (form.date_of_birth) {
      const dob = new Date(form.date_of_birth);
      const now = new Date();
      const age = now.getFullYear() - dob.getFullYear();
      const monthDiff = now.getMonth() - dob.getMonth();
      if (age < 18 || (age === 18 && monthDiff < 0)) {
        setError(t('identityMustBe18'));
        setLoading(false);
        return;
      }
    }

    try {
      const res = await fetch('/api/shares/identity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Submission failed');
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push('/share'), 2000);
    } catch {
      setError(t('networkError'));
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-6 dark:border-green-900 dark:bg-green-950/30">
        <p className="text-sm font-semibold text-green-700 dark:text-green-300">
          {t('identitySuccess')}
        </p>
      </div>
    );
  }

  const inputClass =
    'w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-500';
  const labelClass = 'mb-1 block text-sm font-medium';

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Name fields */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="id-fname" className={labelClass}>
            {t('identityFirstName')} *
          </label>
          <input
            id="id-fname"
            type="text"
            required
            value={form.legal_first_name}
            onChange={(e) => updateField('legal_first_name', e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="id-mname" className={labelClass}>
            {t('identityMiddleName')}
          </label>
          <input
            id="id-mname"
            type="text"
            value={form.legal_middle_name}
            onChange={(e) => updateField('legal_middle_name', e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="id-lname" className={labelClass}>
            {t('identityLastName')} *
          </label>
          <input
            id="id-lname"
            type="text"
            required
            value={form.legal_last_name}
            onChange={(e) => updateField('legal_last_name', e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {/* DOB + Gender */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="id-dob" className={labelClass}>
            {t('identityDob')} *
          </label>
          <input
            id="id-dob"
            type="date"
            required
            value={form.date_of_birth}
            onChange={(e) => updateField('date_of_birth', e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="id-gender" className={labelClass}>
            {t('identityGender')}
          </label>
          <select
            id="id-gender"
            value={form.gender}
            onChange={(e) => updateField('gender', e.target.value)}
            className={inputClass}
          >
            <option value="">—</option>
            <option value="male">{t('identityGenderMale')}</option>
            <option value="female">{t('identityGenderFemale')}</option>
            <option value="other">{t('identityGenderOther')}</option>
            <option value="prefer_not_to_say">{t('identityGenderPreferNot')}</option>
          </select>
        </div>
      </div>

      {/* Address */}
      <div>
        <label htmlFor="id-addr1" className={labelClass}>
          {t('identityAddress1')} *
        </label>
        <input
          id="id-addr1"
          type="text"
          required
          value={form.address_line_1}
          onChange={(e) => updateField('address_line_1', e.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="id-addr2" className={labelClass}>
          {t('identityAddress2')}
        </label>
        <input
          id="id-addr2"
          type="text"
          value={form.address_line_2}
          onChange={(e) => updateField('address_line_2', e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="id-city" className={labelClass}>
            {t('identityCity')} *
          </label>
          <input
            id="id-city"
            type="text"
            required
            value={form.city}
            onChange={(e) => updateField('city', e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="id-state" className={labelClass}>
            {t('identityState')}
          </label>
          <input
            id="id-state"
            type="text"
            value={form.state_province}
            onChange={(e) => updateField('state_province', e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="id-postal" className={labelClass}>
            {t('identityPostalCode')}
          </label>
          <input
            id="id-postal"
            type="text"
            value={form.postal_code}
            onChange={(e) => updateField('postal_code', e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="id-country" className={labelClass}>
          {t('identityCountry')} *
        </label>
        <input
          id="id-country"
          type="text"
          required
          maxLength={2}
          placeholder="GB"
          value={form.country_code}
          onChange={(e) => updateField('country_code', e.target.value.toUpperCase())}
          className={inputClass}
        />
      </div>

      {/* Phone */}
      <div>
        <label htmlFor="id-phone" className={labelClass}>
          {t('identityPhone')} *
        </label>
        <input
          id="id-phone"
          type="tel"
          required
          placeholder="+44..."
          value={form.phone}
          onChange={(e) => updateField('phone', e.target.value)}
          className={inputClass}
        />
      </div>

      {/* ID document */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="id-doctype" className={labelClass}>
            {t('identityDocType')} *
          </label>
          <select
            id="id-doctype"
            required
            value={form.id_document_type}
            onChange={(e) => updateField('id_document_type', e.target.value)}
            className={inputClass}
          >
            <option value="">—</option>
            <option value="passport">{t('identityDocTypePassport')}</option>
            <option value="driving_licence">{t('identityDocTypeDrivingLicence')}</option>
            <option value="national_id">{t('identityDocTypeNationalId')}</option>
            <option value="residence_permit">{t('identityDocTypeResidencePermit')}</option>
          </select>
        </div>
        <div>
          <label htmlFor="id-doccountry" className={labelClass}>
            {t('identityDocCountry')} *
          </label>
          <input
            id="id-doccountry"
            type="text"
            required
            maxLength={2}
            placeholder="GB"
            value={form.id_document_country}
            onChange={(e) => updateField('id_document_country', e.target.value.toUpperCase())}
            className={inputClass}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50 hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {loading ? t('identitySubmitting') : t('identitySubmit')}
      </button>
    </form>
  );
}
