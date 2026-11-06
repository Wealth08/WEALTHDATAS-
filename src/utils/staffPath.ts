// The secret address of the staff login page.
// Set VITE_STAFF_PATH in .env (for example /portal-a1b2c3d4e5f6). If it is missing, /staff-login is used.
const raw = (((import.meta as any).env?.VITE_STAFF_PATH as string | undefined) || '/staff-login').trim();

export const STAFF_PATH = '/' + raw.replace(/^\/+|\/+$/g, '');

export const isStaffPath = (pathname: string): boolean =>
  pathname.replace(/\/+$/, '').toLowerCase() === STAFF_PATH.toLowerCase();
