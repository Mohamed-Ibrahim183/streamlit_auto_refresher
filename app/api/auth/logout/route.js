import { NextResponse } from 'next/server';
import { clearCookieOnResponse } from '@/lib/session';

export async function GET() {
  const response = NextResponse.json({ success: true });
  return clearCookieOnResponse(response);
}
