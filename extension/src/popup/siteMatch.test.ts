import { describe, expect, it } from 'vitest';
import { matchesCurrentSite } from './siteMatch';

describe('site match guard', () => {
  it('accepts matching hostnames for the same website', () => {
    expect(matchesCurrentSite('app.example.com', 'app.example.com')).toBe(true);
    expect(matchesCurrentSite('www.example.com', 'example.com')).toBe(true);
  });

  it('rejects analyses from a different website', () => {
    expect(matchesCurrentSite('login.example.net', 'example.com')).toBe(false);
    expect(matchesCurrentSite('accounts.example.com', 'safe.example.net')).toBe(false);
  });
});
