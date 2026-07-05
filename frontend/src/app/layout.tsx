import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { DarkModeProvider } from '@/context/DarkModeContext';

export const metadata = { title: 'EDUTrack', description: 'Your Academic Life, Simplified' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <DarkModeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </DarkModeProvider>
      </body>
    </html>
  );
}
