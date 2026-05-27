import { NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { setCookieOnResponse } from '@/lib/session';

async function generateUserId() {
  for (let i = 0; i < 10; i++) {
    const id = crypto.randomBytes(6).toString('hex');
    const exists = await User.findOne({ userId: id });
    if (!exists) return id;
  }
  throw new Error('Could not generate unique user ID');
}

export async function POST(request) {
  try {
    await connectDB();
    const { name, email, password } = await request.json();
    if (email) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail) return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
    }
    const userId = await generateUserId();
    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({ userId, name, email: email || undefined, password: hashedPassword });
    const response = NextResponse.json({ success: true, userId });
    return setCookieOnResponse(response, userId);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
