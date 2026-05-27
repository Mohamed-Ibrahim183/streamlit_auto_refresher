import Link from 'next/link';

export default function Home() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 52px)', padding: 40 }}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 8, padding: 40, maxWidth: 500, width: '100%', boxShadow: 'var(--shadow)', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: 8, color: 'var(--text)' }}>Streamlit Auto-Refresher</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 32, fontSize: 15, lineHeight: 1.5 }}>
          Keep your free-tier Streamlit apps alive by preventing 12-hour hibernation.
        </p>
        <ul style={{ textAlign: 'left', margin: '24px 0', padding: 0, listStyle: 'none' }}>
          {['Register your Streamlit app URLs', 'Refresh all your apps with one click or API call', 'Multi-user support with MongoDB', 'CLI tool for command-prompt automation'].map((text, i) => (
            <li key={i} style={{ padding: '6px 0', fontSize: 14, color: 'var(--text-secondary)' }}>
              <span style={{ color: '#ff4b4b', fontWeight: 'bold', marginRight: 8 }}>&#10003;</span>{text}
            </li>
          ))}
        </ul>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <Link href="/login" style={{ display: 'inline-block', padding: '12px 28px', background: '#ff4b4b', color: '#fff', borderRadius: 6, fontSize: 15, fontWeight: 600 }}>Sign In</Link>
          <Link href="/signup" style={{ display: 'inline-block', padding: '12px 28px', background: '#6c757d', color: '#fff', borderRadius: 6, fontSize: 15, fontWeight: 600 }}>Create Account</Link>
        </div>
      </div>
    </div>
  );
}
