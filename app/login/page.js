'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const form = new FormData(e.target);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: form.get('userId'), password: form.get('password') }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); setLoading(false); return; }
      toast.success('Signed in');
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError('Connection error'); setLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 52px)', padding: 40 }}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 8, padding: 32, maxWidth: 420, width: '100%', boxShadow: 'var(--shadow)' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: 4, color: 'var(--text)' }}>Welcome back</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: 14 }}>Sign in to manage your Streamlit apps</p>
        {error && <div style={{ background: '#f8d7da', color: '#721c24', padding: '10px 14px', borderRadius: 6, marginBottom: 16, fontSize: 13 }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>User ID or Email</label>
            <input name="userId" required placeholder="myuser or email@example.com" style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 14, background: 'var(--bg)', color: 'var(--text)' }} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>Password</label>
            <input type="password" name="password" required placeholder="Enter your password" style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 14, background: 'var(--bg)', color: 'var(--text)' }} />
          </div>
          <button type="submit" disabled={loading} style={{ width: '100%', padding: '10px 20px', background: loading ? '#f08a8a' : '#ff4b4b', color: '#fff', border: 'none', borderRadius: 6, cursor: loading ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600 }}>
            {loading ? <><span className="spinner spinner-sm" />Signing in...</> : 'Sign In'}
          </button>
        </form>
        <div style={{ marginTop: 16, textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>
          Don&apos;t have an account? <Link href="/signup" style={{ color: '#ff4b4b' }}>Sign up</Link>
        </div>
      </div>
    </div>
  );
}
