'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/sidebar';
import { Navbar } from '@/components/navbar';
import { useAuth } from '@/components/auth-provider';
import { BetaBadge } from '@/components/BetaBadge';
import { PLANS, PLAN_ORDER, FEATURE_LABELS, formatFeatureValue } from '@/lib/pricing';
import { Check, X, ShieldAlert, Sparkles, Zap, Building, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

const FAQS = [
  {
    question: "What is the PaperHub Beta period?",
    answer: "PaperHub is currently in public beta. During this phase, we are testing our sessional mock test engines, AI evaluation frameworks, and document intelligence pipelines. To appreciate our early adopters, all Pro features are 100% free."
  },
  {
    question: "Will I need to enter a credit card to use the Beta?",
    answer: "No. You do not need to enter any credit card, debit card, or payment details. Simply sign in, and you will be immediately granted Beta Pro access with no strings attached."
  },
  {
    question: "What happens when the Beta ends?",
    answer: "When we launch our public production release, we will introduce subscription plans. Your beta account will revert to the Free tier, but you will never be automatically charged. We will notify you in advance with special launch offers to upgrade."
  },
  {
    question: "Can I use PaperHub for my entire college class?",
    answer: "Yes! If you are a faculty member, representative, or running a college prep cohort, contact us for the Institution tier. We provide custom analytics, batch evaluations, and syllabus aligning."
  },
  {
    question: "How accurate is the AI evaluation system?",
    answer: "Our AI evaluation pipeline uses multi-stage validation, comparing student answers to rubrics and model solutions. It is designed to grade engineering, programming, and mathematics derivations with high academic correlation."
  }
];

export default function PricingPage() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case 'free': return <Zap className="w-5 h-5 text-text-muted" />;
      case 'pro': return <Sparkles className="w-5 h-5 text-purple-400" />;
      case 'institution': return <Building className="w-5 h-5 text-accent" />;
      default: return <Sparkles className="w-5 h-5 text-accent" />;
    }
  };

  return (
    <div className="flex min-h-screen bg-bg-primary text-text-primary overflow-hidden relative">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-grow flex flex-col min-h-screen overflow-y-auto z-10">
        <Navbar onMenuToggle={() => setSidebarOpen(true)} />

        <main className="flex-grow max-w-5xl w-full mx-auto px-6 py-10 space-y-12">
          
          {/* Header & Beta Announcement */}
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-400 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              <span>Public Beta Launch Offer</span>
            </div>
            <h1 className="font-display font-black text-3xl md:text-4xl tracking-tight bg-gradient-to-r from-text-primary via-purple-300 to-accent bg-clip-text text-transparent">
              Flexible Plans for Every Student
            </h1>
            <p className="text-sm text-text-secondary leading-relaxed">
              Unlock university sessional mock exams, AI vision evaluation, and detailed student metrics. Get started today with no credit card required.
            </p>
          </div>

          {/* Beta Mode Notice Box */}
          <div className="p-6 rounded-2xl border border-purple-500/25 bg-gradient-to-r from-purple-500/10 via-accent/5 to-purple-500/10 max-w-3xl mx-auto flex flex-col md:flex-row items-center gap-5">
            <div className="p-3 rounded-xl bg-purple-500/20 text-purple-400 shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="text-center md:text-left space-y-1">
              <h4 className="font-display font-bold text-sm text-purple-300 flex items-center justify-center md:justify-start gap-2">
                All Pro Features are Currently Free <BetaBadge size="sm" />
              </h4>
              <p className="text-xs text-text-secondary leading-relaxed">
                We are in launch-readiness mode. All users are automatically granted <strong className="text-purple-400">Beta Pro</strong> level quotas. No billing profile or subscription setup is required during beta.
              </p>
            </div>
          </div>

          {/* Pricing Cards Grid */}
          <div className="grid md:grid-cols-3 gap-6 pt-4">
            {PLAN_ORDER.map((planId) => {
              const plan = PLANS[planId];
              const isPro = planId === 'pro';
              const isInst = planId === 'institution';
              
              return (
                <div
                  key={planId}
                  className={`relative p-6 rounded-3xl border flex flex-col justify-between transition-all duration-300 group hover:-translate-y-1 ${
                    isPro 
                      ? 'border-purple-500 bg-bg-secondary/60 shadow-xl shadow-purple-500/5 ring-1 ring-purple-500/30' 
                      : 'border-border-primary bg-bg-secondary/30 hover:border-border-primary/80'
                  }`}
                >
                  {isPro && (
                    <div className="absolute -top-3.5 right-6 px-3 py-1 rounded-full bg-purple-500 text-white text-[10px] font-black uppercase tracking-wider shadow-md">
                      Highly Recommended
                    </div>
                  )}

                  <div className="space-y-6">
                    {/* Icon & Plan details */}
                    <div className="flex items-center justify-between">
                      <div className="p-2.5 rounded-xl bg-bg-primary border border-border-primary/50 group-hover:scale-105 transition-transform duration-200">
                        {getPlanIcon(planId)}
                      </div>
                      <span className="text-xs font-bold text-text-muted">
                        {plan.badge}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <h3 className="font-display font-black text-lg text-text-primary capitalize">{plan.name}</h3>
                      <p className="text-xs text-text-muted leading-relaxed min-h-[32px]">{plan.description}</p>
                    </div>

                    {/* Price */}
                    <div className="py-2">
                      {plan.price === 0 ? (
                        <div className="flex items-baseline">
                          <span className="font-display font-black text-3xl text-text-primary">₹0</span>
                          <span className="text-xs text-text-muted ml-1.5">/ forever</span>
                        </div>
                      ) : plan.price === -1 ? (
                        <div className="flex items-baseline">
                          <span className="font-display font-black text-2xl text-text-primary">Custom</span>
                          <span className="text-xs text-text-muted ml-1.5">pricing</span>
                        </div>
                      ) : (
                        <div className="flex items-baseline">
                          <span className="font-display font-black text-3xl text-text-primary">₹{plan.price}</span>
                          <span className="text-xs text-text-muted ml-1.5">/ month</span>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-border-primary/50 pt-4 space-y-3">
                      <h5 className="text-[10px] font-black uppercase tracking-wider text-text-muted">Key Features</h5>
                      <ul className="space-y-2.5">
                        {FEATURE_LABELS.slice(0, 5).map(({ key, label, format }) => {
                          const val = plan.features[key];
                          const hasFeature = typeof val === 'boolean' ? val : val !== 0;
                          return (
                            <li key={key} className="flex items-start gap-2.5 text-xs">
                              {hasFeature ? (
                                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                              ) : (
                                <X className="w-3.5 h-3.5 text-red-500/40 shrink-0 mt-0.5" />
                              )}
                              <span className={hasFeature ? 'text-text-secondary' : 'text-text-muted/60'}>
                                {label}: <strong className="text-text-primary">{formatFeatureValue(val)}</strong>
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>

                  {/* CTA button */}
                  <div className="pt-6">
                    <button
                      disabled
                      className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all text-center border ${
                        isPro
                          ? 'bg-purple-500 border-purple-500 text-white cursor-not-allowed opacity-80'
                          : isInst
                          ? 'bg-accent border-accent text-white cursor-not-allowed opacity-80'
                          : 'bg-bg-primary/50 border-border-primary text-text-secondary cursor-not-allowed'
                      }`}
                    >
                      {isInst ? 'Contact Sales' : 'Active (Beta Free)'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detailed Features Comparison Table */}
          <div className="pt-8 space-y-6">
            <div className="text-center md:text-left">
              <h3 className="font-display font-black text-lg text-text-primary">Compare Features</h3>
              <p className="text-xs text-text-muted">A granular overview of feature permissions across all plans.</p>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-border-primary bg-bg-secondary/20">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="border-b border-border-primary bg-bg-secondary/40 text-[10px] font-black uppercase tracking-wider text-text-secondary">
                    <th className="p-4">Feature</th>
                    <th className="p-4 text-center">Free</th>
                    <th className="p-4 text-center text-purple-400">Pro (Beta Free)</th>
                    <th className="p-4 text-center">Institution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-y-border-primary/30">
                  {FEATURE_LABELS.map(({ key, label }) => (
                    <tr key={key} className="hover:bg-bg-secondary/10 text-xs">
                      <td className="p-4 font-semibold text-text-secondary">{label}</td>
                      <td className="p-4 text-center text-text-muted">
                        {formatFeatureValue(PLANS.free.features[key])}
                      </td>
                      <td className="p-4 text-center font-bold text-purple-400">
                        {formatFeatureValue(PLANS.pro.features[key])}
                      </td>
                      <td className="p-4 text-center text-text-muted">
                        {formatFeatureValue(PLANS.institution.features[key])}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="pt-10 border-t border-border-primary/40 space-y-6 max-w-3xl mx-auto">
            <div className="text-center space-y-1">
              <h3 className="font-display font-black text-lg text-text-primary flex items-center justify-center gap-2">
                <HelpCircle className="w-5 h-5 text-accent" /> Frequently Asked Questions
              </h3>
              <p className="text-xs text-text-muted">Got questions about the billing structure or beta access? We have answers.</p>
            </div>

            <div className="space-y-3.5">
              {FAQS.map((faq, idx) => {
                const isOpen = expandedFaq === idx;
                return (
                  <div 
                    key={idx}
                    className="rounded-2xl border border-border-primary/70 bg-bg-secondary/20 overflow-hidden"
                  >
                    <button
                      onClick={() => toggleFaq(idx)}
                      className="w-full p-4 flex items-center justify-between text-left hover:bg-bg-secondary/40 transition-colors"
                    >
                      <span className="text-xs font-bold text-text-primary">{faq.question}</span>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-text-muted shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-text-muted shrink-0" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 text-xs text-text-secondary leading-relaxed border-t border-border-primary/30 pt-3 bg-bg-primary/20">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
