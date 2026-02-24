import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import enMessages from '../../messages/en.json';
import { routing } from './routing';

const MESSAGES_DIR = path.resolve(__dirname, '../../messages');

describe('messages/en.json', () => {
  it('has all required top-level namespaces', () => {
    const expectedNamespaces = [
      'Metadata',
      'Nav',
      'Footer',
      'Home',
      'Issues',
      'IssueDetail',
      'Organisations',
      'OrgDetail',
      'Campaigns',
      'CampaignDetail',
      'Assistants',
      'AssistantDetail',
      'Wallet',
      'Profile',
      'Auth',
      'AuthGate',
      'Error',
      'GlobalError',
      'NotFound',
      'Cards',
      'Health',
      'Pivot',
      'CampaignProgress',
      'WalletBalance',
      'Transactions',
      'Activity',
      'Countries',
      'Synonyms',
      'Join',
      'Search',
      'Feed',
      'Actions',
      'Filter',
      'TimeSkill',
      'Reels',
      'TopUp',
      'Contribute',
      'Claim',
      'Evidence',
      'ProfileEdit',
      'SignupForm',
    ];

    for (const ns of expectedNamespaces) {
      expect(enMessages).toHaveProperty(ns);
    }
  });

  it('has no empty string values', () => {
    function checkValues(obj: Record<string, unknown>, path = '') {
      for (const [key, value] of Object.entries(obj)) {
        const fullPath = path ? `${path}.${key}` : key;
        if (typeof value === 'string') {
          expect(value.length, `${fullPath} should not be empty`).toBeGreaterThan(0);
        } else if (typeof value === 'object' && value !== null) {
          checkValues(value as Record<string, unknown>, fullPath);
        }
      }
    }
    checkValues(enMessages);
  });

  it('Nav namespace has all required keys', () => {
    const nav = enMessages.Nav;
    expect(nav).toHaveProperty('issues');
    expect(nav).toHaveProperty('assistants');
    expect(nav).toHaveProperty('organisations');
    expect(nav).toHaveProperty('wallet');
    expect(nav).toHaveProperty('profile');
    expect(nav).toHaveProperty('toggleMenu');
  });

  it('Auth namespace has all required keys', () => {
    const auth = enMessages.Auth;
    expect(auth).toHaveProperty('welcomeBack');
    expect(auth).toHaveProperty('continueGoogle');
    expect(auth).toHaveProperty('continueFacebook');
    expect(auth).toHaveProperty('sendMagicLink');
    expect(auth).toHaveProperty('checkEmail');
    expect(auth).toHaveProperty('signIn');
    expect(auth).toHaveProperty('signUp');
  });
});

describe('locale message files', () => {
  const nonEnLocales = routing.locales.filter((l) => l !== 'en');
  const enNamespaces = Object.keys(enMessages).sort();

  function getKeys(obj: Record<string, unknown>, prefix = ''): string[] {
    const keys: string[] = [];
    for (const [k, v] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${k}` : k;
      if (typeof v === 'object' && v !== null) {
        keys.push(...getKeys(v as Record<string, unknown>, path));
      } else {
        keys.push(path);
      }
    }
    return keys.sort();
  }

  const enKeys = getKeys(enMessages);

  it('has a JSON file for every configured locale', () => {
    for (const locale of nonEnLocales) {
      const filePath = path.join(MESSAGES_DIR, `${locale}.json`);
      expect(fs.existsSync(filePath), `Missing messages/${locale}.json`).toBe(true);
    }
  });

  it.each(nonEnLocales)('%s.json has the same namespaces as en.json', (locale) => {
    const filePath = path.join(MESSAGES_DIR, `${locale}.json`);
    const messages = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const namespaces = Object.keys(messages).sort();
    expect(namespaces).toEqual(enNamespaces);
  });

  it.each(nonEnLocales)('%s.json has the same keys as en.json', (locale) => {
    const filePath = path.join(MESSAGES_DIR, `${locale}.json`);
    const messages = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const localeKeys = getKeys(messages);
    expect(localeKeys).toEqual(enKeys);
  });
});
