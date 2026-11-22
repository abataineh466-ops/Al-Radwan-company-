import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanEnvValue,
  isAllowedCorsOrigin,
  normalizeTelegramToken,
  normalizeVercelApiUrl,
} from './app.js';

test('normalizeVercelApiUrl restores flattened /api/index?__path=... routes cleanly', () => {
  assert.equal(normalizeVercelApiUrl('/api/index?__path=intake-chat'), '/api/intake-chat');
  assert.equal(
    normalizeVercelApiUrl('/api/index?__path=bookings/bk-101&status=confirmed'),
    '/api/bookings/bk-101?status=confirmed'
  );
  assert.equal(
    normalizeVercelApiUrl('/api/intake-chat?__path=intake-chat'),
    '/api/intake-chat'
  );
  assert.equal(normalizeVercelApiUrl('/api/health'), '/api/health');
});

test('isAllowedCorsOrigin permits Vercel, Cloud Run, localhost, and configured custom origins only', () => {
  assert.equal(
    isAllowedCorsOrigin('https://al-radwan-company-blsdmx5p8-patron22.vercel.app'),
    true
  );
  assert.equal(isAllowedCorsOrigin('http://localhost:3000'), true);
  assert.equal(
    isAllowedCorsOrigin('https://alradwan-law.jo', 'https://alradwan-law.jo,https://www.alradwan-law.jo'),
    true
  );
  assert.equal(isAllowedCorsOrigin('https://evil.example.com'), false);
  assert.equal(isAllowedCorsOrigin(undefined), false);
});

test('cleanEnvValue and normalizeTelegramToken strip accidental quotes, spaces, and bot prefix', () => {
  assert.equal(cleanEnvValue(' "123456789" '), '123456789');
  assert.equal(cleanEnvValue("'-1001234567890'"), '-1001234567890');
  assert.equal(
    normalizeTelegramToken('"bot123456789:ABCdefGHIjklMNOpqrsTUVwxyz123456"'),
    '123456789:ABCdefGHIjklMNOpqrsTUVwxyz123456'
  );
});
