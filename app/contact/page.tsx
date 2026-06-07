import React from 'react';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { Mail, MapPin, Phone } from 'lucide-react';

export default function ContactPage() {
  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden bg-bg-primary text-text-primary">
      <Navbar />
      
      <main className="flex-grow max-w-4xl mx-auto px-6 py-20 w-full z-10 relative">
        <h1 className="text-4xl md:text-5xl font-display font-black mb-6 text-text-primary">Contact Us</h1>
        <p className="text-text-secondary mb-12 text-lg">Have a question, feedback, or want to contribute? Reach out to us.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Contact Details */}
          <div className="space-y-8">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-accent/10 text-accent">
                <Mail className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-text-primary mb-1">Email</h3>
                <p className="text-sm text-text-secondary">thedarkpcm@gmail.com</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-accent/10 text-accent">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-text-primary mb-1">Office</h3>
                <p className="text-sm text-text-secondary">MMMUT Campus, Gorakhpur<br />Uttar Pradesh, India</p>
              </div>
            </div>

            <div className="p-6 rounded-2xl border border-border-primary bg-bg-secondary/30 mt-8">
              <h4 className="font-bold text-text-primary mb-2">Join the Community</h4>
              <p className="text-xs text-text-secondary mb-4 leading-relaxed">PaperHub is an open ecosystem for university students. If you want to upload new PYQs, join our student discord.</p>
              <button className="px-4 py-2 text-xs font-bold rounded-xl bg-accent hover:bg-accent-hover text-white transition-all shadow-sm">
                Join Discord
              </button>
            </div>
          </div>
          
          {/* Contact Form Placeholder */}
          <div className="p-8 rounded-3xl border border-border-primary bg-bg-secondary/40 backdrop-blur-sm">
            <h3 className="font-bold text-xl text-text-primary mb-6">Send a Message</h3>
            <form className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5">Name</label>
                <input type="text" className="w-full bg-bg-primary border border-border-primary rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent text-text-primary" placeholder="Your Name" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5">Email</label>
                <input type="email" className="w-full bg-bg-primary border border-border-primary rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent text-text-primary" placeholder="you@example.com" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5">Message</label>
                <textarea rows={4} className="w-full bg-bg-primary border border-border-primary rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent text-text-primary" placeholder="How can we help?"></textarea>
              </div>
              <button type="button" className="w-full py-3 rounded-xl bg-text-primary text-bg-primary font-bold hover:bg-text-secondary transition-all text-sm mt-2">
                Send Message
              </button>
            </form>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
