import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { refreshUserApps } from '@/lib/refresh';

export async function GET(request, { params }) {
  try {
    await connectDB();
    const result = await refreshUserApps(params.userId);
    return NextResponse.json(result);
  } catch (err) {
    const status = err.message === 'User not found' ? 404 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}
