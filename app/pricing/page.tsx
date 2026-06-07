'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/navbar';
import { BetaBadge } from '@/components/BetaBadge';
import { PLANS, PLAN_ORDER, FEATURE_LABELS, formatFeatureValue } from '@/lib/pricing';
import { Check, X, ShieldAlert, Sparkles, Zap, Building, HelpCircle, ChevronDown, ChevronUp, ArrowRight, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
    answer: "When we launch our public production release, we will introduce our official subscription plans. Your beta account will revert to the Free tier, but you will never be automatically charged. We will notify you in advance with special launch offers to upgrade."
  },
  {
    question: "Why do we need paid plans eventually?",
    answer: "To ensure the highest quality experience, PaperHub runs on top-tier infrastructure. We incur costs for AI inference engines, real-time database syncing, secure cloud storage, and most importantly, our team of dedicated verifiers, subject-matter experts, and moderators who curate and verify the PYQ answers. Paid plans allow us to sustain this massive ecosystem and keep providing you with flawlessly verified content."
  },
  {
    question: "How accurate is the AI evaluation system?",
    answer: "Our AI evaluation pipeline uses multi-stage validation, comparing student answers to rubrics and model solutions. It is designed to grade engineering, programming, and mathematics derivations with high academic correlation."
  }
];

export default function PricingPage() {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case 'free': return <Zap className="w-5 h-5 text-gray-400" />;
      case 'plus': return <TrendingUp className="w-5 h-5 text-blue-400" />;
      case 'pro': return <Sparkles className="w-5 h-5 text-purple-400" />;
      case 'institution': return <Building className="w-5 h-5 text-emerald-400" />;
      default: return <Sparkles className="w-5 h-5 text-purple-400" />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden bg-[#0a0a0f] text-white font-sans selection:bg-[#8B5CF6]/30">
      {/* Background ambient glows */}
      <div className="absolute top-[-10%] left-[20%] w-[50vw] h-[50vw] bg-[#8B5CF6]/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-[20%] right-[-10%] w-[40vw] h-[40vw] bg-[#6D28D9]/10 rounded-full blur-[140px] pointer-events-none" />
      
      <Navbar />

      <main className="flex-grow max-w-7xl w-full mx-auto px-6 py-20 lg:py-28 relative z-10 space-y-24">
        
        {/* Header Section */}
        <section className="text-center space-y-6 max-w-3xl mx-auto relative">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-xs font-bold tracking-wide uppercase shadow-[0_0_15px_rgba(168,85,247,0.2)]"
          >
            <Sparkles className="w-4 h-4 animate-pulse" />
            <span>Public Beta Launch Offer</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1]"
          >
            Invest in your <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#A78BFA] to-[#8B5CF6]">academic success.</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-gray-400 leading-relaxed max-w-2xl mx-auto"
          >
            Unlock university sessional mock exams, AI vision evaluation, and detailed student metrics. Get started today with no credit card required.
          </motion.p>
        </section>

        {/* Beta Mode Notice Box */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="p-6 md:p-8 rounded-3xl border border-purple-500/30 bg-gradient-to-r from-purple-500/10 via-[#0a0a0f] to-purple-500/10 max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-6 relative overflow-hidden backdrop-blur-xl shadow-2xl"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-transparent pointer-events-none" />
          <div className="p-4 rounded-2xl bg-purple-500/20 text-purple-400 shrink-0 shadow-[0_0_30px_rgba(168,85,247,0.3)] border border-purple-500/30">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="text-center md:text-left space-y-2 relative z-10">
            <h4 className="text-xl font-bold text-white flex items-center justify-center md:justify-start gap-3">
              All Pro Features are Currently Free <BetaBadge size="sm" />
            </h4>
            <p className="text-sm text-gray-400 leading-relaxed">
              We are in launch-readiness mode. All users are automatically granted <strong className="text-purple-300">Beta Pro</strong> level quotas. No billing profile or subscription setup is required during the beta period. Enjoy unlimited preparation!
            </p>
          </div>
        </motion.div>

        {/* Billing Toggle (Visual only for now) */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex justify-center"
        >
          <div className="inline-flex items-center p-1.5 rounded-full bg-white/[0.03] border border-white/10 backdrop-blur-md">
            <button 
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all ${billingCycle === 'monthly' ? 'bg-[#8B5CF6] text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
            >
              Monthly
            </button>
            <button 
              onClick={() => setBillingCycle('yearly')}
              className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${billingCycle === 'yearly' ? 'bg-[#8B5CF6] text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
            >
              Yearly <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400">Save 20%</span>
            </button>
          </div>
        </motion.div>

        {/* Pricing Cards Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 pt-4 relative z-20">
          {PLAN_ORDER.map((planId, index) => {
            const plan = PLANS[planId];
            const isPro = planId === 'pro';
            const isInst = planId === 'institution';
            const isPlus = planId === 'plus';
            
            return (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + (index * 0.1) }}
                key={planId}
                className={`relative p-8 rounded-[2rem] flex flex-col justify-between transition-all duration-300 group hover:-translate-y-2 backdrop-blur-xl ${
                  isPro 
                    ? 'border-2 border-[#8B5CF6] bg-[#8B5CF6]/5 shadow-[0_0_40px_rgba(139,92,246,0.15)]' 
                    : isPlus
                    ? 'border border-blue-500/30 bg-blue-500/5 hover:border-blue-500/50'
                    : 'border border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
                }`}
              >
                {isPro && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#A78BFA] text-white text-[11px] font-black uppercase tracking-[0.2em] shadow-lg whitespace-nowrap">
                    Highly Recommended
                  </div>
                )}

                <div className="space-y-8">
                  {/* Icon & Plan details */}
                  <div className="flex items-center justify-between">
                    <div className={`p-3 rounded-2xl ${isPro ? 'bg-[#8B5CF6]/20' : isPlus ? 'bg-blue-500/20' : 'bg-white/5'} group-hover:scale-110 transition-transform duration-300`}>
                      {getPlanIcon(planId)}
                    </div>
                    <span className="text-sm font-bold text-gray-500">
                      {plan.badge}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-2xl font-bold text-white capitalize">{plan.name}</h3>
                    <p className="text-sm text-gray-400 leading-relaxed min-h-[40px]">{plan.description}</p>
                  </div>

                  {/* Price */}
                  <div className="py-2">
                    {plan.price === 0 ? (
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black text-white">₹0</span>
                        <span className="text-sm text-gray-500 font-medium">/ forever</span>
                      </div>
                    ) : plan.price === -1 ? (
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-white">Custom</span>
                      </div>
                    ) : (
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black text-white">
                          ₹{billingCycle === 'yearly' ? Math.floor(plan.price * 0.8) : plan.price}
                        </span>
                        <span className="text-sm text-gray-500 font-medium">/ month</span>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-white/10 pt-6 space-y-4">
                    <h5 className="text-[11px] font-bold uppercase tracking-[0.15em] text-gray-500">What's included</h5>
                    <ul className="space-y-4">
                      {FEATURE_LABELS.map(({ key, label, format }) => {
                        const val = plan.features[key];
                        const hasFeature = typeof val === 'boolean' ? val : val !== 0;
                        return (
                          <li key={key} className="flex items-start gap-3 text-sm">
                            {hasFeature ? (
                              <Check className={`w-5 h-5 shrink-0 mt-0.5 ${isPro ? 'text-[#8B5CF6]' : isPlus ? 'text-blue-400' : 'text-emerald-400'}`} />
                            ) : (
                              <X className="w-5 h-5 text-gray-700 shrink-0 mt-0.5" />
                            )}
                            <span className={hasFeature ? 'text-gray-300' : 'text-gray-600'}>
                              {label}: <strong className={hasFeature ? 'text-white' : 'text-gray-600'}>{formatFeatureValue(val)}</strong>
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>

                {/* CTA button */}
                <div className="pt-8 mt-auto">
                  <button
                    disabled
                    className={`w-full py-4 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2 group-hover:shadow-lg ${
                      isPro
                        ? 'bg-[#8B5CF6] text-white shadow-[0_0_20px_rgba(139,92,246,0.3)] cursor-not-allowed opacity-90'
                        : isInst
                        ? 'bg-white text-black cursor-not-allowed opacity-90'
                        : 'bg-white/[0.05] border border-white/10 text-white cursor-not-allowed'
                    }`}
                  >
                    {isInst ? 'Contact Sales' : 'Active (Beta Free)'}
                    <ArrowRight className="w-4 h-4 opacity-50" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Why Plans Exist Notice */}
        <section className="max-w-4xl mx-auto py-12 text-center space-y-6">
          <div className="w-16 h-1 bg-gradient-to-r from-transparent via-[#8B5CF6] to-transparent mx-auto opacity-50" />
          <h3 className="text-2xl font-bold text-white">Why are we introducing paid plans?</h3>
          <p className="text-gray-400 leading-relaxed text-sm md:text-base max-w-3xl mx-auto">
            At PaperHub, we are committed to providing flawlessly verified academic content. To achieve this, we rely on a massive infrastructure ecosystem. This includes immense computing costs for our AI vision evaluation models, fast databases, and secure document storage. <br/><br/>
            Most importantly, it supports our dedicated team of human verifiers, subject-matter experts, question uploaders, and moderators who work tirelessly behind the scenes to curate every single PYQ. Paid plans allow us to sustain these operational costs and keep the platform ad-free, fast, and academically rigorous.
          </p>
        </section>

        {/* FAQ Section */}
        <section className="pt-16 border-t border-white/10 max-w-3xl mx-auto">
          <div className="text-center space-y-4 mb-12">
            <h3 className="text-3xl font-extrabold text-white">
              Frequently Asked Questions
            </h3>
            <p className="text-gray-400">Got questions about the billing structure or beta access? We have answers.</p>
          </div>

          <div className="space-y-4">
            {FAQS.map((faq, idx) => {
              const isOpen = expandedFaq === idx;
              return (
                <div 
                  key={idx}
                  className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden transition-all duration-300 hover:bg-white/[0.04]"
                >
                  <button
                    onClick={() => toggleFaq(idx)}
                    className="w-full p-6 flex items-center justify-between text-left"
                  >
                    <span className="text-base font-bold text-white">{faq.question}</span>
                    <div className={`p-2 rounded-full transition-transform duration-300 ${isOpen ? 'bg-[#8B5CF6]/20 rotate-180' : 'bg-white/5'}`}>
                      <ChevronDown className={`w-4 h-4 ${isOpen ? 'text-[#8B5CF6]' : 'text-gray-400'}`} />
                    </div>
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-6 pb-6 text-sm text-gray-400 leading-relaxed">
                          {faq.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </section>

      </main>
    </div>
  );
}
