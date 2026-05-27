import './globals.css';
import { Toaster } from 'react-hot-toast';

export const metadata = {
  title: 'Streamlit Auto-Refresher',
  description: 'Keep your free-tier Streamlit apps alive',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Toaster position="top-right" toastOptions={{ duration: 4000, style: { fontSize: 14 } }} />
        {children}
      </body>
    </html>
  );
}
