'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState({});
  const [addName, setAddName] = useState('');
  const [addUrl, setAddUrl] = useState('');

  useEffect(() => {
    fetch('/api/user/me')
      .then(res => { if (!res.ok) throw new Error('Not authenticated'); return res.json(); })
      .then(data => { setUser(data); setLoading(false); })
      .catch(() => { router.push('/login'); });
  }, [router]);

  function markBusy(key) { setBusy(b => ({ ...b, [key]: true })); }
  function markFree(key) { setBusy(b => ({ ...b, [key]: false })); }

  async function refreshAll() {
    markBusy('all');
    try {
      const res = await fetch(`/api/refresh/${user.userId}`);
      const data = await res.json();
      if (res.ok) {
        const successes = data.apps.filter(a => a.success).length;
        const failures = data.apps.filter(a => !a.success).length;
        toast.success(`Refreshed ${data.apps.length} app(s) — ${successes} ok${failures ? `, ${failures} failed` : ''}`, { duration: 6000 });
        setUser(u => ({ ...u, apps: u.apps.map((a, i) => ({ ...a, _last: data.apps[i]?.success })) }));
      } else {
        toast.error(data.error || 'Refresh failed');
      }
    } catch { toast.error('Connection error'); }
    finally { markFree('all'); }
  }

  async function refreshOne(index) {
    const key = `refresh-${index}`;
    markBusy(key);
    try {
      const res = await fetch(`/api/refresh/${user.userId}/${index}`);
      const app = await res.json();
      if (res.ok) {
        if (app.success) toast.success(`${app.name} — OK`);
        else toast.error(`${app.name} — failed`);
      } else {
        toast.error(app.error || 'Refresh failed');
      }
    } catch { toast.error('Connection error'); }
    finally { markFree(key); }
  }

  async function addApp(e) {
    e.preventDefault();
    markBusy('add');
    try {
      const res = await fetch(`/api/users/${user.userId}/apps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: addName, url: addUrl }),
      });
      if (!res.ok) { const d = await res.json(); toast.error(d.error || 'Failed to add app'); return; }
      setAddName(''); setAddUrl('');
      const updated = await res.json();
      setUser(updated);
      toast.success('App added');
    } catch { toast.error('Connection error'); }
    finally { markFree('add'); }
  }

  async function deleteApp(index) {
    const key = `delete-${index}`;
    markBusy(key);
    try {
      const res = await fetch(`/api/users/${user.userId}/apps/${index}`, { method: 'DELETE' });
      if (!res.ok) { toast.error('Failed to remove app'); return; }
      const updated = await res.json();
      setUser(updated);
      toast.success('App removed');
    } catch { toast.error('Connection error'); }
    finally { markFree(key); }
  }

  async function logout() {
    await fetch('/api/auth/logout');
    toast.success('Signed out');
    router.push('/login');
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 10, color: '#888' }}>
      <span className="spinner spinner-dark" /><span>Loading...</span>
    </div>
  );
  if (!user) return null;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <h1 style={{ fontSize: '1.5rem' }}>{user.name}</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#888' }}>@{user.userId}</span>
          <button onClick={logout} style={{ padding: '6px 12px', background: 'transparent', color: '#6c757d', border: '1px solid #6c757d', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Logout</button>
        </div>
      </div>
      <p style={{ color: '#888', marginBottom: 24 }}>{user.apps.length} app(s)</p>

      <div style={{ background: '#e2e3f1', borderRadius: 6, padding: '12px 16px', marginBottom: 20, fontSize: 13 }}>
        <strong>Refresh all:</strong> <code style={{ background: '#fff', padding: '2px 6px', borderRadius: 3, fontSize: 13 }}>GET /{user.userId}/refresh</code><br />
        <strong>Refresh one:</strong> <code style={{ background: '#fff', padding: '2px 6px', borderRadius: 3, fontSize: 13 }}>GET /{user.userId}/refresh/0</code> (app index)<br />
        <strong>cURL:</strong> <code style={{ background: '#fff', padding: '2px 6px', borderRadius: 3, fontSize: 13 }}>curl {typeof window !== 'undefined' ? window.location.origin : ''}/{user.userId}/refresh</code>
      </div>

      <div style={{ marginBottom: 24 }}>
        <button onClick={refreshAll} disabled={busy['all']} style={{ padding: '10px 20px', background: busy['all'] ? '#f08a8a' : '#ff4b4b', color: '#fff', border: 'none', borderRadius: 6, cursor: busy['all'] ? 'not-allowed' : 'pointer', fontSize: 14 }}>
          {busy['all'] ? <><span className="spinner spinner-sm" />Refreshing...</> : 'Refresh All Apps'}
        </button>
      </div>

      <div style={{ background: '#fff', borderRadius: 8, padding: 20, marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginBottom: 12 }}>Add App</h3>
        <form onSubmit={addApp} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input value={addName} onChange={e => setAddName(e.target.value)} placeholder="App name" required style={{ flex: 1, padding: '8px 12px', border: '1px solid #ddd', borderRadius: 4, fontSize: 14, minWidth: 200 }} />
          <input value={addUrl} onChange={e => setAddUrl(e.target.value)} placeholder="https://myapp.streamlit.app" required type="url" style={{ flex: 1, padding: '8px 12px', border: '1px solid #ddd', borderRadius: 4, fontSize: 14, minWidth: 200 }} />
          <button type="submit" disabled={busy['add']} style={{ padding: '8px 16px', background: busy['add'] ? '#f08a8a' : '#ff4b4b', color: '#fff', border: 'none', borderRadius: 6, cursor: busy['add'] ? 'not-allowed' : 'pointer', fontSize: 14 }}>
            {busy['add'] ? <><span className="spinner spinner-sm" />Adding...</> : 'Add'}
          </button>
        </form>
      </div>

      {user.apps.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>No apps added yet. Add your first Streamlit app above.</div>
      ) : (
        user.apps.map((app, index) => (
          <div key={index} style={{ background: '#fff', borderRadius: 8, padding: '16px 20px', marginBottom: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{app.name}</div>
              <div style={{ fontSize: 13, color: '#888', wordBreak: 'break-all' }}>{app.url}</div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button onClick={() => refreshOne(index)} disabled={busy[`refresh-${index}`]} style={{ padding: '6px 12px', background: busy[`refresh-${index}`] ? '#6bc1d6' : '#17a2b8', color: '#fff', border: 'none', borderRadius: 6, cursor: busy[`refresh-${index}`] ? 'not-allowed' : 'pointer', fontSize: 12 }}>
                {busy[`refresh-${index}`] ? <><span className="spinner spinner-sm" />...</> : 'Refresh'}
              </button>
              <button onClick={() => deleteApp(index)} disabled={busy[`delete-${index}`]} style={{ padding: '6px 12px', background: busy[`delete-${index}`] ? '#e8737e' : '#dc3545', color: '#fff', border: 'none', borderRadius: 6, cursor: busy[`delete-${index}`] ? 'not-allowed' : 'pointer', fontSize: 12 }}>
                {busy[`delete-${index}`] ? <><span className="spinner spinner-sm" />...</> : 'Remove'}
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
