import { cookies } from 'next/headers';

const COOKIE_NAME = 'sid';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60,
  path: '/',
};

export async function getSession() {
  const store = cookies();
  return { userId: store.get(COOKIE_NAME)?.value || null };
}

export function setCookieOnResponse(response, userId) {
  response.cookies.set(COOKIE_NAME, userId, COOKIE_OPTIONS);
  return response;
}

export function clearCookieOnResponse(response) {
  response.cookies.delete(COOKIE_NAME);
  return response;
}
