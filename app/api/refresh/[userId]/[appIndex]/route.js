import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { refreshUserApp } from '@/lib/refresh';

export async function GET(request, { params }) {
  try {
    await connectDB();
    const result = await refreshUserApp(params.userId, params.appIndex);
    return NextResponse.json(result);
  } catch (err) {
    const status = err.message === 'User not found' || err.message === 'App not found' ? 404 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}
