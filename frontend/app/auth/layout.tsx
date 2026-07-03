import { ThemeProvider } from '@/components/theme-provider'
import { Geist } from 'next/font/google'
import '../globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })



export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${geistSans.variable} bg-background text-foreground`}>
      <body className="font-sans antialiased bg-background text-foreground min-h-screen flex items-center justify-center">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
