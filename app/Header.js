'use client';

import { useTheme } from './ThemeProvider';
import Link from 'next/link';

export default function Header() {
  const { theme, toggle } = useTheme();

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px' }}>
      <Link href="/" className="logo-link">
        <img src="/logo.webp" alt="Logo" width={28} height={28} />
        <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--text)' }}>StreamRefresher</span>
      </Link>
      <button
        onClick={toggle}
        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        style={{
          background: 'none',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '6px 10px',
          cursor: 'pointer',
          fontSize: 18,
          lineHeight: 1,
          color: 'var(--text)',
        }}
      >
        {theme === 'dark' ? '\u2600\uFE0F' : '\uD83C\uDF19'}
      </button>
    </div>
  );
}
