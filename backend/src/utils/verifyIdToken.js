const crypto = require('crypto');
const jwt = require('jsonwebtoken');

/**
 * Server-side verification of Google / Microsoft ID tokens.
 *
 * The frontend only forwards the provider's signed ID token. We check its
 * signature against the provider's public keys, plus audience (our client ID),
 * issuer and expiry, and only then trust the email/name inside it.
 */

// Same public client ID the frontend uses (see frontend/src/app/utils/msalAuth.ts).
const DEFAULT_MICROSOFT_CLIENT_ID = '7d9dfe90-bc4e-45e8-816a-9d7e28a81e95';

const GOOGLE_JWKS_URI = 'https://www.googleapis.com/oauth2/v3/certs';
const MICROSOFT_JWKS_URI = 'https://login.microsoftonline.com/common/discovery/v2.0/keys';

const KEYS_TTL_MS = 60 * 60 * 1000; // refresh signing keys hourly
const MIN_REFRESH_INTERVAL_MS = 60 * 1000; // but on unknown `kid` refetch at most once a minute
const CLOCK_TOLERANCE_SEC = 60;

const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Token is missing, malformed, forged or expired — the client's fault (401). */
class InvalidIdTokenError extends Error {
  constructor(message = 'Invalid or expired sign-in token. Please try again.') {
    super(message);
    this.name = 'InvalidIdTokenError';
    this.status = 401;
  }
}

/** Caches a provider's JWKS as Node KeyObjects, keyed by `kid`. */
function createSigningKeyStore(jwksUri) {
  let keys = new Map();
  let fetchedAt = 0;
  let inflight = null;

  const refresh = () => {
    if (!inflight) {
      inflight = (async () => {
        const res = await fetch(jwksUri, { signal: AbortSignal.timeout(5000) });
        if (!res.ok) throw new Error(`Failed to fetch signing keys from ${jwksUri} (${res.status})`);
        const { keys: jwks = [] } = await res.json();

        const next = new Map();
        for (const jwk of jwks) {
          if (jwk.kty !== 'RSA' || !jwk.kid || (jwk.use && jwk.use !== 'sig')) continue;
          try {
            next.set(jwk.kid, crypto.createPublicKey({ key: { kty: jwk.kty, n: jwk.n, e: jwk.e }, format: 'jwk' }));
          } catch {
            // Skip a malformed key rather than losing the whole key set.
          }
        }
        keys = next;
        fetchedAt = Date.now();
      })().finally(() => {
        inflight = null;
      });
    }
    return inflight;
  };

  return async (kid) => {
    const age = Date.now() - fetchedAt;
    if (age > KEYS_TTL_MS || (!keys.has(kid) && age > MIN_REFRESH_INTERVAL_MS)) {
      try {
        await refresh();
      } catch (err) {
        // Provider unreachable: keep logins working with the keys we already have.
        if (!keys.has(kid)) throw err;
      }
    }
    const key = keys.get(kid);
    if (!key) throw new InvalidIdTokenError();
    return key;
  };
}

const getGoogleKey = createSigningKeyStore(GOOGLE_JWKS_URI);
const getMicrosoftKey = createSigningKeyStore(MICROSOFT_JWKS_URI);

// jwt.decode() can throw on malformed input (e.g. a non-JSON payload); treat that as a bad token.
function decodeUnverified(token) {
  if (typeof token !== 'string' || !token) throw new InvalidIdTokenError('Sign-in token is missing.');
  try {
    const decoded = jwt.decode(token, { complete: true });
    if (decoded && decoded.header && decoded.payload && typeof decoded.payload === 'object') return decoded;
  } catch {
    // fall through
  }
  throw new InvalidIdTokenError();
}

async function verifySignedToken(token, getKey, options) {
  const decoded = decodeUnverified(token);
  if (decoded.header.alg !== 'RS256' || typeof decoded.header.kid !== 'string') throw new InvalidIdTokenError();

  const key = await getKey(decoded.header.kid);
  try {
    return jwt.verify(token, key, { algorithms: ['RS256'], clockTolerance: CLOCK_TOLERANCE_SEC, ...options });
  } catch {
    throw new InvalidIdTokenError();
  }
}

function normalizeEmail(email) {
  const normalized = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!EMAIL_RE.test(normalized)) throw new InvalidIdTokenError('Sign-in token does not contain a valid email address.');
  return normalized;
}

/** Verifies a Google Identity Services credential and returns its verified email/name. */
async function verifyGoogleIdToken(credential) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error('GOOGLE_CLIENT_ID is not configured on the server');

  const payload = await verifySignedToken(credential, getGoogleKey, {
    audience: clientId,
    issuer: ['accounts.google.com', 'https://accounts.google.com'],
  });

  if (payload.email_verified !== true && payload.email_verified !== 'true') {
    throw new InvalidIdTokenError('Your Google account email is not verified.');
  }

  return { email: normalizeEmail(payload.email), name: payload.name || 'Google User' };
}

/** Verifies a Microsoft (MSAL, v2.0 endpoint) ID token and returns its verified email/name. */
async function verifyMicrosoftIdToken(idToken) {
  const clientId = process.env.MICROSOFT_CLIENT_ID || DEFAULT_MICROSOFT_CLIENT_ID;

  // With the multi-tenant "common" authority the issuer is per tenant, so read the
  // tenant ID first; the signature check below then guarantees it wasn't tampered with.
  const { tid } = decodeUnverified(idToken).payload;
  if (typeof tid !== 'string' || !GUID_RE.test(tid)) throw new InvalidIdTokenError();

  const payload = await verifySignedToken(idToken, getMicrosoftKey, {
    audience: clientId,
    issuer: `https://login.microsoftonline.com/${tid}/v2.0`,
  });

  // Same claims MSAL uses for account.username (what the frontend used to send), so
  // existing users keep matching. The `email` claim is deliberately NOT used: Microsoft
  // doesn't verify it, so any tenant admin could put someone else's address there.
  return {
    email: normalizeEmail(payload.preferred_username || payload.upn),
    name: payload.name || 'Outlook User',
  };
}

module.exports = { verifyGoogleIdToken, verifyMicrosoftIdToken, InvalidIdTokenError };
