const supabaseUrl = (
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
).replace(/\/$/, '');
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.SUPABASE_ANON_KEY;
const apiKey = serviceRoleKey || anonKey;

export function hasSupabase() {
  return Boolean(supabaseUrl && apiKey);
}

export function hasServiceRole() {
  return Boolean(serviceRoleKey);
}

export function envSummary() {
  return {
    url: supabaseUrl ? 'set' : 'missing',
    serviceRoleKey: serviceRoleKey ? 'set' : 'missing',
    anonKey: anonKey ? 'set' : 'missing'
  };
}

const FETCH_TIMEOUT_MS = 8000;

function authHeaders(extra = {}) {
  return {
    apikey: apiKey,
    Authorization: `Bearer ${apiKey}`,
    ...extra
  };
}

async function fetchWithTimeout(url, options = {}) {
  try {
    return await fetch(url, { ...options, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  } catch (err) {
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
      throw Object.assign(new Error('Supabase request timeout'), { code: 'timeout' });
    }
    throw err;
  }
}

async function parseJson(res) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function toError(res, body) {
  return {
    message: body?.message || body?.error || `HTTP ${res.status}`,
    code: body?.code
  };
}

function buildQuery(params) {
  const q = new URLSearchParams();
  if (params.select) q.set('select', params.select);
  for (const [col, val] of Object.entries(params.eq || {})) {
    q.set(col, `eq.${val}`);
  }
  if (params.eqBool) {
    for (const [col, val] of Object.entries(params.eqBool)) {
      q.set(col, `eq.${val}`);
    }
  }
  for (const o of params.order || []) {
    q.append('order', `${o.column}.${o.ascending ? 'asc' : 'desc'}`);
  }
  if (params.limit != null) q.set('limit', String(params.limit));
  return q.toString();
}

export async function restSelect(table, params = {}) {
  if (!hasSupabase()) return { data: null, error: { message: 'Supabase not configured' } };
  const qs = buildQuery({ select: params.select || '*', eq: params.eq, eqBool: params.eqBool, order: params.order, limit: params.limit });
  const res = await fetchWithTimeout(`${supabaseUrl}/rest/v1/${table}?${qs}`, { headers: authHeaders() });
  const body = await parseJson(res);
  if (!res.ok) return { data: null, error: toError(res, body) };
  return { data: body, error: null };
}

export async function restSelectOne(table, params = {}) {
  const { data, error } = await restSelect(table, { ...params, limit: 1 });
  if (error) return { data: null, error };
  return { data: Array.isArray(data) && data.length ? data[0] : null, error: null };
}

export async function restInsert(table, row) {
  if (!hasSupabase()) return { error: { message: 'Supabase not configured' } };
  const res = await fetchWithTimeout(`${supabaseUrl}/rest/v1/${table}`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
    body: JSON.stringify(row)
  });
  if (!res.ok) return { error: toError(res, await parseJson(res)) };
  return { error: null };
}

export async function restUpdate(table, row, eq) {
  if (!hasSupabase()) return { error: { message: 'Supabase not configured' } };
  const qs = buildQuery({ eq });
  const res = await fetchWithTimeout(`${supabaseUrl}/rest/v1/${table}?${qs}`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
    body: JSON.stringify(row)
  });
  if (!res.ok) return { error: toError(res, await parseJson(res)) };
  return { error: null };
}

export async function restDelete(table, eq) {
  if (!hasSupabase()) return { error: { message: 'Supabase not configured' } };
  const qs = buildQuery({ eq });
  const res = await fetchWithTimeout(`${supabaseUrl}/rest/v1/${table}?${qs}`, {
    method: 'DELETE',
    headers: authHeaders({ Prefer: 'return=minimal' })
  });
  if (!res.ok) return { error: toError(res, await parseJson(res)) };
  return { error: null };
}

export async function restUpsert(table, row, onConflict = 'id') {
  if (!hasSupabase()) return { error: { message: 'Supabase not configured' } };
  const res = await fetchWithTimeout(`${supabaseUrl}/rest/v1/${table}`, {
    method: 'POST',
    headers: authHeaders({
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
      'On-Conflict': onConflict
    }),
    body: JSON.stringify(row)
  });
  if (!res.ok) return { error: toError(res, await parseJson(res)) };
  return { error: null };
}

export async function storageEnsureBucket(bucket, { public: isPublic = true } = {}) {
  if (!hasSupabase()) return { error: { message: 'Supabase not configured' } };
  const getRes = await fetchWithTimeout(`${supabaseUrl}/storage/v1/bucket/${bucket}`, { headers: authHeaders() });
  if (getRes.ok) return { error: null };
  const res = await fetchWithTimeout(`${supabaseUrl}/storage/v1/bucket`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ id: bucket, name: bucket, public: isPublic })
  });
  if (!res.ok && res.status !== 409) {
    return { error: toError(res, await parseJson(res)) };
  }
  return { error: null };
}

export async function storageUpload(bucket, path, buffer, contentType) {
  if (!hasSupabase()) return { error: { message: 'Supabase not configured' }, publicUrl: null };
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  const res = await fetchWithTimeout(`${supabaseUrl}/storage/v1/object/${bucket}/${encodedPath}`, {
    method: 'POST',
    headers: authHeaders({
      'Content-Type': contentType || 'application/octet-stream',
      'x-upsert': 'true'
    }),
    body: buffer
  });
  if (!res.ok) return { error: toError(res, await parseJson(res)), publicUrl: null };
  const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${encodedPath}`;
  return { error: null, publicUrl };
}
