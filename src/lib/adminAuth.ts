import { supabase } from '@/integrations/supabase/client';

// Admin signs in with a username; it maps to a fixed internal email in the auth system.
const ADMIN_EMAIL_DOMAIN = 'kdd-admin.local';
export const ADMIN_AUTH_FLAG = 'admin_auth';

export const usernameToEmail = (username: string) =>
  `${username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '')}@${ADMIN_EMAIL_DOMAIN}`;

const checkAdmin = async (): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data, error } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
  return !error && data === true;
};

export const adminLogin = async (username: string, password: string): Promise<boolean> => {
  if (!username.trim() || !password) return false;
  const { error } = await supabase.auth.signInWithPassword({ email: usernameToEmail(username), password });
  if (error) return false;
  const ok = await checkAdmin();
  if (!ok) { await supabase.auth.signOut(); return false; }
  sessionStorage.setItem(ADMIN_AUTH_FLAG, 'true');
  return true;
};

export const adminLogout = async () => {
  sessionStorage.removeItem(ADMIN_AUTH_FLAG);
  await supabase.auth.signOut();
};

/** Re-validate the stored admin session with the server; clears the flag if invalid. */
export const verifyAdminSession = async (): Promise<boolean> => {
  const ok = await checkAdmin();
  if (ok) sessionStorage.setItem(ADMIN_AUTH_FLAG, 'true');
  else sessionStorage.removeItem(ADMIN_AUTH_FLAG);
  return ok;
};
