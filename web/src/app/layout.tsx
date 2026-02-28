import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ReactQueryProvider } from '@/lib/query-client'
import { ThemeProvider } from '@/components/theme-provider'
import { config } from '@/lib/config'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: config.app.name,
    template: `%s | ${config.app.name}`,
  },
  description: 'Sistema de gerenciamento de karaokê - Blue Karaoke. Gerencie músicas, assinaturas e muito mais.',
  keywords: ['karaoke', 'música', 'entretenimento', 'blue karaoke'],
  authors: [{ name: 'Blue Karaoke' }],
  creator: 'Blue Karaoke',
  publisher: 'Blue Karaoke',
  applicationName: config.app.name,
  generator: 'Next.js',
  metadataBase: new URL(config.app.url || 'https://www.bluekaraokes.com.br'),
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: config.app.url || 'https://www.bluekaraokes.com.br',
    siteName: config.app.name,
    title: config.app.name,
    description: 'Sistema de gerenciamento de karaokê - Blue Karaoke',
  },
  twitter: {
    card: 'summary_large_image',
    title: config.app.name,
    description: 'Sistema de gerenciamento de karaokê - Blue Karaoke',
  },
  icons: {
    icon: '/icon.ico',
    apple: '/icon.ico',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ReactQueryProvider>
            {children}
            <Analytics />
          </ReactQueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
