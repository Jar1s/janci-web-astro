/** Lazy dynamic imports — avoids Vercel/Node loading lib/ via require()+import() twice. */
let kvAuthCorsValidation;
let supabaseMod;

export function loadKvAuthCorsValidation() {
  if (!kvAuthCorsValidation) {
    kvAuthCorsValidation = Promise.all([
      import('../lib/kv.js'),
      import('../lib/auth.js'),
      import('../lib/cors.js'),
      import('../lib/validation.js')
    ]).then(([kv, auth, cors, validation]) => ({ ...kv, ...auth, ...cors, ...validation }));
  }
  return kvAuthCorsValidation;
}

export function loadSupabase() {
  if (!supabaseMod) {
    supabaseMod = import('../lib/supabase.js');
  }
  return supabaseMod;
}

export function loadAuthCors() {
  return Promise.all([import('../lib/auth.js'), import('../lib/cors.js')]).then(([auth, cors]) => ({
    ...auth,
    ...cors
  }));
}
