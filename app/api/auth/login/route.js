import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { setCookieOnResponse } from '@/lib/session';

export async function POST(request) {
  try {
    await connectDB();
    const { userId, password } = await request.json();
    const user = await User.findOne({ $or: [{ userId }, { email: userId.toLowerCase() }] });
    if (!user) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    if (!user.password) return NextResponse.json({ error: 'Account has no password set. Please sign up again.' }, { status: 401 });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    const response = NextResponse.json({ success: true });
    return setCookieOnResponse(response, user.userId);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
