/**
 * Validate admin password from request headers.
 */
export function validateAuth(request) {
  const password = request.headers.get("x-admin-password");
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    // If no password is set, deny all access for safety
    return false;
  }

  return password === adminPassword;
}
