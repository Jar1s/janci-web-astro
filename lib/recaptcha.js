const VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';
const VERIFY_TIMEOUT_MS = 8000;

export function getRecaptchaMode() {
  const mode = String(process.env.RECAPTCHA_MODE || '').trim().toLowerCase();
  return mode === 'v3' ? 'v3' : 'v2';
}

function getRecaptchaSecret() {
  return String(process.env.RECAPTCHA_SECRET_KEY || '').trim();
}

export function isRecaptchaEnabled() {
  return Boolean(getRecaptchaSecret());
}

function getMinScore() {
  const parsed = Number(process.env.RECAPTCHA_MIN_SCORE);
  if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 1) return parsed;
  return 0.5;
}

function getExpectedHostname() {
  return String(process.env.RECAPTCHA_EXPECTED_HOSTNAME || '').trim().toLowerCase();
}

export async function verifyRecaptchaToken(token, remoteIp, expectedAction) {
  const secret = getRecaptchaSecret();
  if (!secret) {
    return { ok: true, skipped: true };
  }

  const responseToken = String(token || '').trim();
  if (!responseToken) {
    return { ok: false, code: 'missing-token', message: 'Chýba overenie reCAPTCHA.' };
  }

  const params = new URLSearchParams({
    secret,
    response: responseToken
  });
  if (remoteIp) {
    params.set('remoteip', String(remoteIp));
  }

  let response;
  try {
    response = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
      signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS)
    });
  } catch (error) {
    return {
      ok: false,
      code: 'verification-unreachable',
      message: error?.name === 'TimeoutError'
        ? 'Overenie reCAPTCHA vypršalo.'
        : 'Overenie reCAPTCHA zlyhalo.'
    };
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success !== true) {
    return {
      ok: false,
      code: 'verification-failed',
      message: 'Overenie reCAPTCHA nebolo úspešné.',
      details: payload?.['error-codes'] || []
    };
  }

  const mode = getRecaptchaMode();

  if (mode === 'v2') {
    const expectedHostnameNormalized = getExpectedHostname();
    if (expectedHostnameNormalized) {
      const hostname = String(payload?.hostname || '').trim().toLowerCase();
      if (hostname !== expectedHostnameNormalized) {
        return {
          ok: false,
          code: 'unexpected-hostname',
          message: 'Neplatný hostname pre reCAPTCHA.'
        };
      }
    }
    return { ok: true, skipped: false };
  }

  if (expectedAction && payload?.action !== expectedAction) {
    return {
      ok: false,
      code: 'unexpected-action',
      message: 'Neplatná akcia reCAPTCHA.'
    };
  }

  const minScore = getMinScore();
  const score = Number(payload?.score);
  if (!Number.isFinite(score) || score < minScore) {
    return {
      ok: false,
      code: 'score-too-low',
      message: 'reCAPTCHA vyhodnotila požiadavku ako rizikovú.'
    };
  }

  const expectedHostnameNormalized = getExpectedHostname();
  if (expectedHostnameNormalized) {
    const hostname = String(payload?.hostname || '').trim().toLowerCase();
    if (hostname !== expectedHostnameNormalized) {
      return {
        ok: false,
        code: 'unexpected-hostname',
        message: 'Neplatný hostname pre reCAPTCHA.'
      };
    }
  }

  return { ok: true, skipped: false };
}
