import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { Request, Response, NextFunction } from 'express';
import type { AuthSessionUser, FirmLawyer, LawyerRole } from '../src/types/legal.js';

export interface StoredAuthAccount {
  id: string;
  username: string;
  displayName: string;
  role: LawyerRole;
  lawyerId?: string;
  canManageRoles: boolean;
  passwordHash: string;
  active: boolean;
}

function resolveSecurityDir(): string {
  if (process.env.VERCEL === '1' || process.env.VERCEL === 'true') {
    return path.join('/tmp', 'al-radwan-law-data');
  }
  return path.resolve(process.cwd(), '.data');
}

function getOrCreateSecret(fileName: string, envName: string, byteLen = 32): Buffer {
  const fromEnv = process.env[envName]?.trim();
  if (fromEnv) {
    return crypto.createHash('sha256').update(fromEnv, 'utf8').digest().subarray(0, byteLen);
  }
  const dir = resolveSecurityDir();
  const filePath = path.join(dir, fileName);
  try {
    if (fs.existsSync(filePath)) {
      const hex = fs.readFileSync(filePath, 'utf8').trim();
      const buf = Buffer.from(hex, 'hex');
      if (buf.length >= byteLen) return buf.subarray(0, byteLen);
    }
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const fresh = crypto.randomBytes(byteLen);
    fs.writeFileSync(filePath, fresh.toString('hex'), { encoding: 'utf8', mode: 0o600 });
    return fresh;
  } catch {
    // Ephemeral fallback if disk is read-only
    return crypto.createHash('sha256').update(`rb-legal-${fileName}-${process.pid}`).digest().subarray(0, byteLen);
  }
}

let cachedSessionSecret: Buffer | null = null;
let cachedDataKey: Buffer | null = null;

function getSessionSecret(): Buffer {
  if (!cachedSessionSecret) {
    cachedSessionSecret = getOrCreateSecret('.session-secret', 'RB_SESSION_SECRET', 32);
  }
  return cachedSessionSecret;
}

function getDataEncryptionKey(): Buffer {
  if (!cachedDataKey) {
    cachedDataKey = getOrCreateSecret('.data-key', 'RB_DATA_KEY', 32);
  }
  return cachedDataKey;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const [, salt, expectedHex] = parts;
  const derived = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, 'hex');
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}

const ENC_PREFIX = 'enc:v1:';

export function encryptSensitiveText(plain: string): string {
  if (!plain || plain.startsWith(ENC_PREFIX)) return plain;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getDataEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${ENC_PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decryptSensitiveText(value: string): string {
  if (!value || !value.startsWith(ENC_PREFIX)) return value;
  try {
    const payload = value.slice(ENC_PREFIX.length);
    const [ivB64, tagB64, dataB64] = payload.split(':');
    if (!ivB64 || !tagB64 || !dataB64) return value;
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      getDataEncryptionKey(),
      Buffer.from(ivB64, 'base64')
    );
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataB64, 'base64')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  } catch {
    return value;
  }
}

export interface SessionTokenPayload {
  sub: string;
  username: string;
  displayName: string;
  role: LawyerRole;
  lawyerId?: string;
  canManageRoles: boolean;
  exp: number;
}

export function createSessionToken(
  user: Omit<SessionTokenPayload, 'exp'>,
  ttlSeconds = 60 * 60 * 12
): string {
  const payload: SessionTokenPayload = {
    ...user,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', getSessionSecret())
    .update(body)
    .digest('base64url');
  return `${body}.${sig}`;
}

export function verifySessionToken(token: string | undefined): SessionTokenPayload | null {
  if (!token || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expectedSig = crypto
    .createHmac('sha256', getSessionSecret())
    .update(body)
    .digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const decoded = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionTokenPayload;
    if (!decoded.exp || decoded.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

export function extractBearerOrCookieToken(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const match = cookieHeader.match(/(?:^|;\s*)rb_session=([^;]+)/);
    if (match) return decodeURIComponent(match[1]);
  }
  return undefined;
}

export interface AuthenticatedRequest extends Request {
  authUser?: AuthSessionUser;
}

export function buildSessionUserFromPayload(
  payload: SessionTokenPayload,
  lawyers: FirmLawyer[]
): AuthSessionUser {
  const matchedLawyer = lawyers.find(
    (l) => l.id === payload.lawyerId || l.name === payload.displayName
  );
  return {
    id: payload.sub,
    username: payload.username,
    displayName: matchedLawyer?.name ?? payload.displayName,
    role: matchedLawyer?.role ?? payload.role,
    lawyerId: matchedLawyer?.id ?? payload.lawyerId,
    canManageRoles: matchedLawyer?.canManageRoles ?? payload.canManageRoles,
    specialties: matchedLawyer?.specialties ?? ['civil'],
  };
}

export function createAuthMiddleware(getLawyers: () => FirmLawyer[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const token = extractBearerOrCookieToken(req);
    const payload = verifySessionToken(token);
    if (!payload) {
      return res.status(401).json({
        error: 'Authentication required. Access restricted to registered Al-Radwan attorneys.',
      });
    }
    req.authUser = buildSessionUserFromPayload(payload, getLawyers());
    return next();
  };
}

export function requireManageRoles(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.authUser?.canManageRoles && req.authUser?.role !== 'managing_partner') {
    return res.status(403).json({
      error: 'Insufficient permissions. Managing Director / Admin privilege required.',
    });
  }
  return next();
}

export function canUserAccessLawyerRecord(
  user: AuthSessionUser | undefined,
  assignedLawyer?: string
): boolean {
  if (!user) return false;
  if (user.canManageRoles || user.role === 'managing_partner') return true;
  if (!assignedLawyer) return true;
  return assignedLawyer.trim() === user.displayName.trim();
}

export function getDefaultAuthAccounts(): StoredAuthAccount[] {
  const radwanPass = process.env.RB_ADMIN_PASSWORD?.trim() || 'radwan2026';
  const teamPass = process.env.RB_TEAM_PASSWORD?.trim() || 'rblegal2026';
  return [
    {
      id: 'acc-radwan',
      username: 'alradwan',
      displayName: 'المحامي رضوان علي بطاينة',
      role: 'managing_partner',
      lawyerId: 'law-radwan',
      canManageRoles: true,
      passwordHash: hashPassword(radwanPass),
      active: true,
    },
    {
      id: 'acc-ahmad',
      username: 'ahmad',
      displayName: 'المحامي أحمد سليم الخولي',
      role: 'senior_lawyer',
      lawyerId: 'law-ahmad',
      canManageRoles: false,
      passwordHash: hashPassword(teamPass),
      active: true,
    },
    {
      id: 'acc-najwa',
      username: 'najwa',
      displayName: 'المحامية نجوى الشطناوي',
      role: 'senior_lawyer',
      lawyerId: 'law-najwa',
      canManageRoles: false,
      passwordHash: hashPassword(teamPass),
      active: true,
    },
    {
      id: 'acc-layali',
      username: 'layali',
      displayName: 'المحامية ليالي خريسات',
      role: 'senior_lawyer',
      lawyerId: 'law-layali',
      canManageRoles: false,
      passwordHash: hashPassword(teamPass),
      active: true,
    },
    {
      id: 'acc-ghufran',
      username: 'ghufran',
      displayName: 'المحامية غفران الخطيب',
      role: 'associate_lawyer',
      lawyerId: 'law-ghufran',
      canManageRoles: false,
      passwordHash: hashPassword(teamPass),
      active: true,
    },
  ];
}
