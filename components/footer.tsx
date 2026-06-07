import React from 'react';
import Link from 'next/link';
import { PaperHubLogo } from './logo';

export function Footer() {
  return (
    <footer className="border-t border-border-primary/50 bg-bg-secondary/20 pt-16 pb-8 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[1px] bg-gradient-to-r from-transparent via-accent/50 to-transparent" />
      
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8 mb-12">
          
          {/* Brand Column */}
          <div className="col-span-1 md:col-span-2 space-y-4">
            <Link href="/" className="flex items-center space-x-3 group w-max">
              <PaperHubLogo />
              <span className="font-display font-bold text-xl tracking-tight text-text-primary group-hover:text-accent transition-colors duration-200">
                PaperHub
              </span>
            </Link>
            <p className="text-sm text-text-secondary leading-relaxed max-w-sm">
              Transforming scattered university exam PDFs, WhatsApp PYQs, and random drives into topic-wise practice and syllabus-aware AI answers.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-text-primary uppercase tracking-wider">Product</h4>
            <ul className="space-y-2.5 text-sm text-text-secondary">
              <li><Link href="/#features" className="hover:text-accent transition-colors">Features</Link></li>
              <li><Link href="/#pricing" className="hover:text-accent transition-colors">Pricing</Link></li>
              <li><Link href="/#faq" className="hover:text-accent transition-colors">FAQ</Link></li>
            </ul>
          </div>

          {/* Legal & Support */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-text-primary uppercase tracking-wider">Support</h4>
            <ul className="space-y-2.5 text-sm text-text-secondary">
              <li><Link href="/contact" className="hover:text-accent transition-colors">Contact Us</Link></li>
              <li><Link href="/privacy" className="hover:text-accent transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-accent transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border-primary/50 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-text-muted">
          <p>© {new Date().getFullYear()} PaperHub. All rights reserved.</p>
          <div className="flex items-center space-x-4">
            <span>Built for B.Tech & B.Sc Students</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
