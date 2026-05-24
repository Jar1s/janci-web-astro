const VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';
const VERIFY_TIMEOUT_MS = 8000;

function getRecaptchaSecret() {
  return String(process.env.RECAPTCHA_SECRET_KEY || '').trim();
}

export function isRecaptchaEnabled() {
  return Boolean(getRecaptchaSecret());
}

export async function verifyRecaptchaToken(token, remoteIp) {
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

  return { ok: true, skipped: false };
}
