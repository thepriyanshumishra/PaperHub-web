import React from 'react';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden bg-bg-primary text-text-primary">
      <Navbar />
      
      <main className="flex-grow max-w-3xl mx-auto px-6 py-20 w-full z-10 relative">
        <h1 className="text-4xl md:text-5xl font-display font-black mb-6 text-text-primary">Terms of Service</h1>
        <div className="text-text-secondary text-sm mb-12">Last Updated: {new Date().toLocaleDateString()}</div>
        
        <div className="space-y-8 text-text-secondary leading-relaxed text-sm">
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-text-primary">1. Acceptance of Terms</h2>
            <p>By accessing or using PaperHub, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our platform.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-text-primary">2. Platform Usage & Beta Phase</h2>
            <p>PaperHub is currently in a public beta phase. While we strive to provide 100% verified academic content and flawless AI evaluations, errors or inaccuracies may occur. Features are provided "as is" and may be modified or discontinued at any time without notice.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-text-primary">3. User Conduct</h2>
            <p>You agree not to misuse our systems, attempt to breach security, or engage in automated scraping of our proprietary PYQ solutions and AI models.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-text-primary">4. Intellectual Property</h2>
            <p>All structured solutions, UI components, custom AI rubrics, and platform mechanics are the intellectual property of PaperHub. However, the original raw university exam questions belong to the respective institutions.</p>
          </section>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
