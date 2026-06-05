import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/components/auth-provider";
import { StatusGuard } from "@/components/status-guard";
import { BetaBanner } from "@/components/BetaBanner";
import { FeedbackButton } from "@/components/FeedbackButton";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "PaperHub — Premium University Exam Preparation",
  description: "Transform scattered university exam PDFs, WhatsApp PYQs, and random drives into topic-wise practice, structured exam-like tests, and syllabus-aware AI answers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable} scroll-smooth`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const saved = localStorage.getItem('theme');
                if (saved === 'light') {
                  document.documentElement.classList.remove('dark');
                } else {
                  document.documentElement.classList.add('dark');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="font-sans antialiased min-h-screen bg-bg-primary text-text-primary">
        <AuthProvider>
          <StatusGuard>
            <ThemeProvider>
              <BetaBanner />
              {children}
              <FeedbackButton />
            </ThemeProvider>
          </StatusGuard>
        </AuthProvider>
      </body>
    </html>
  );
}
