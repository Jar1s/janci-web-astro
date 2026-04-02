// Simple admin auth: expect Authorization: Bearer <ADMIN_PASSWORD>
export function isAdminRequest(req) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  const authHeader = req.headers.authorization || '';
  const token = authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7)
    : authHeader;
  return token === adminPassword;
}

export function requireAdmin(req, res) {
  if (!isAdminRequest(req)) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}







