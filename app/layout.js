import './globals.css';
import ThemeProvider from './ThemeProvider';
import Header from './Header';
import { Toaster } from 'react-hot-toast';

export const metadata = {
  title: 'Streamlit Auto-Refresher',
  description: 'Keep your free-tier Streamlit apps alive',
  icons: '/logo.webp',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="dark">
      <body>
        <ThemeProvider>
          <Header />
          <Toaster position="top-right" toastOptions={{ duration: 4000, style: { fontSize: 14 } }} />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
