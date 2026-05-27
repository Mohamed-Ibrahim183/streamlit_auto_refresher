import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { getSession } from '@/lib/session';

export async function DELETE(request, { params }) {
  try {
    const session = await getSession();
    if (!session.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const { userId, appIndex } = params;
    if (userId !== session.userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    await connectDB();
    const user = await User.findOne({ userId });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    user.apps.splice(parseInt(appIndex, 10), 1);
    await user.save();
    return NextResponse.json(user);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
