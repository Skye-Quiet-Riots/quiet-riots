import { describe, it, expect } from 'vitest';
import enMessages from '../../messages/en.json';

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
