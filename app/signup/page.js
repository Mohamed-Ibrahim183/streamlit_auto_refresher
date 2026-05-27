'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const form = new FormData(e.target);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.get('name'),
          email: form.get('email'),
          password: form.get('password'),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); setLoading(false); return; }
      toast.success('Account created');
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError('Connection error'); setLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 40 }}>
      <div style={{ background: '#fff', borderRadius: 8, padding: 32, maxWidth: 420, width: '100%', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: 4 }}>Create account</h1>
        <p style={{ color: '#888', marginBottom: 24, fontSize: 14 }}>Register to keep your Streamlit apps alive</p>
        {error && <div style={{ background: '#f8d7da', color: '#721c24', padding: '10px 14px', borderRadius: 6, marginBottom: 16, fontSize: 13 }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 14 }}>Display Name</label>
            <input name="name" required placeholder="My Name" style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14 }} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 14 }}>Email (optional, for login)</label>
            <input type="email" name="email" placeholder="email@example.com" style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14 }} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 14 }}>Password</label>
            <input type="password" name="password" required placeholder="Min 6 characters" minLength={6} style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14 }} />
          </div>
          <button type="submit" disabled={loading} style={{ width: '100%', padding: '10px 20px', background: loading ? '#f08a8a' : '#ff4b4b', color: '#fff', border: 'none', borderRadius: 6, cursor: loading ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600 }}>
            {loading ? <><span className="spinner spinner-sm" />Creating...</> : 'Create Account'}
          </button>
        </form>
        <div style={{ marginTop: 16, textAlign: 'center', fontSize: 13, color: '#888' }}>
          Already have an account? <Link href="/login" style={{ color: '#ff4b4b' }}>Sign in</Link>
        </div>
      </div>
    </div>
  );
}
