import React from 'react';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden bg-bg-primary text-text-primary">
      <Navbar />
      
      <main className="flex-grow max-w-3xl mx-auto px-6 py-20 w-full z-10 relative">
        <h1 className="text-4xl md:text-5xl font-display font-black mb-6 text-text-primary">Privacy Policy</h1>
        <div className="text-text-secondary text-sm mb-12">Last Updated: {new Date().toLocaleDateString()}</div>
        
        <div className="space-y-8 text-text-secondary leading-relaxed text-sm">
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-text-primary">1. Information We Collect</h2>
            <p>At PaperHub, we respect your privacy. During the beta period, we allow anonymous sessions that store study preferences, branch info, and UI settings securely in your browser's local storage.</p>
            <p>For registered users, we collect basic profile details (Name, Email, College, Branch) to sync your preparation data across devices via Firebase Authentication.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-text-primary">2. How We Use Your Data</h2>
            <p>Your data is exclusively used to personalize your syllabus, curate your PYQs, and power the AI evaluation pipeline. We do not sell your personal data to advertisers or third parties.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-text-primary">3. Analytics and Anti-Cheat</h2>
            <p>During mock exams, our platform monitors tab visibility and fullscreen status purely for academic self-assessment on your result sheet. This data is not shared externally.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-text-primary">4. Data Deletion</h2>
            <p>You can clear your local data anytime by resetting your browser storage. If you have an account and wish to permanently delete your profile, please contact us.</p>
          </section>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
