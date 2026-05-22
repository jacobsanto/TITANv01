import type { Metadata } from 'next'
import { Nunito_Sans, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { QueryProvider } from '@/components/providers/query-provider'
import { LocaleProvider } from '@/lib/i18n/utils'
import { Toaster } from 'sonner'

const nunitoSans = Nunito_Sans({
  subsets: ['latin'],
  variable: '--font-nunito',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
  weight: ['400', '500', '700'],
})

export const metadata: Metadata = {
  title: 'TITAN — Financial OS',
  description: 'Αυτοματοποιημένη διαχείριση λογιστικών εγγράφων για Ελληνικές επιχειρήσεις',
  keywords: ['myDATA', 'ΑΑΔΕ', 'τιμολόγια', 'λογιστική', 'Greece', 'accounting'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="el" suppressHydrationWarning>
      <body className={`${nunitoSans.variable} ${jetbrainsMono.variable} font-body antialiased`}>
        <LocaleProvider defaultLocale="el">
          <QueryProvider>
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  fontFamily: 'var(--font-sans)',
                  fontSize: '14px',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border)',
                  boxShadow: 'var(--shadow-lg)',
                },
              }}
            />
          </QueryProvider>
        </LocaleProvider>
      </body>
    </html>
  )
}
