import React, { useState } from 'react';
import {
  ShieldCheck,
  Sparkles,
  Lock,
  KeyRound,
  ArrowRight,
  CheckCircle2,
  MessageSquare,
  Calendar,
  Mail,
  Bot,
  TrendingUp,
  PhoneCall,
  Download,
  Globe,
  Zap,
  Users,
  Building2,
  AlertCircle,
  ExternalLink,
  Terminal,
  Layers,
} from 'lucide-react';
import { generateHostingerHtmlBundle } from '../utils/hostingerExport';

export interface ActiveLicenseSession {
  role: 'ADMIN' | 'CLIENT';
  agencyName: string;
  clientName: string;
  clientEmail: string;
  licenseKey: string;
  planTier: string;
}

interface LandingPageViewProps {
  onUnlockSuccess: (session: ActiveLicenseSession) => void;
  portalSettings?: {
    brandName: string;
    tagline: string;
    whatsappNumber: string;
    calendlyUrl: string;
    notificationEmail: string;
    backendUrl: string;
  };
  onEnquirySubmitted?: () => void;
}

export const LandingPageView: React.FC<LandingPageViewProps> = ({
  onUnlockSuccess,
  portalSettings,
  onEnquirySubmitted,
}) => {
  const [activeScreenshotTab, setActiveScreenshotTab] = useState<
    'elena' | 'analyzer' | 'calendar' | 'funnel'
  >('elena');
  const [showLicenseModal, setShowLicenseModal] = useState(false);

  // License Login State
  const [loginEmail, setLoginEmail] = useState('');
  const [licenseKeyInput, setLicenseKeyInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isVerifyingLicense, setIsVerifyingLicense] = useState(false);

  // B2B Enquiry Form State
  const [agencyName, setAgencyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [teamSize, setTeamSize] = useState('6-15 Agents');
  const [monthlyLeads, setMonthlyLeads] = useState('100-500 Leads/mo');
  const [message, setMessage] = useState('');
  const [isSubmittingEnquiry, setIsSubmittingEnquiry] = useState(false);
  const [enquirySuccess, setEnquirySuccess] = useState<{
    whatsappNumber: string;
    calendlyUrl: string;
    emailAlertStatus?: string;
  } | null>(null);
  const [enquiryError, setEnquiryError] = useState<string | null>(null);

  const brandName = portalSettings?.brandName || 'Atelier Estate AI';
  const whatsappNumber = portalSettings?.whatsappNumber || '+15550192834';
  const calendlyUrl = portalSettings?.calendlyUrl || 'https://calendly.com';

  const handleVerifyLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsVerifyingLicense(true);
    try {
      const resp = await fetch('/api/auth/verify-license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail,
          licenseKey: licenseKeyInput,
        }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.ok) {
        setLoginError(
          data.error ||
            'Invalid License Key. Book a strategy call and complete payment to receive your key.'
        );
      } else {
        onUnlockSuccess(data.session);
      }
    } catch (err: any) {
      setLoginError(err?.message || 'Unable to verify license key.');
    } finally {
      setIsVerifyingLicense(false);
    }
  };

  const handleSubmitEnquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnquiryError(null);
    setIsSubmittingEnquiry(true);
    try {
      const resp = await fetch('/api/public/b2b-enquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agencyName,
          contactName,
          email,
          phone,
          teamSize,
          monthlyLeads,
          message,
          source: 'Built-In Public Landing Page',
        }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.ok) {
        setEnquiryError(data.error || 'Could not submit enquiry.');
      } else {
        setEnquirySuccess({
          whatsappNumber: data.whatsappNumber || whatsappNumber,
          calendlyUrl: data.calendlyUrl || calendlyUrl,
          emailAlertStatus: data.emailAlertStatus,
        });
        if (onEnquirySubmitted) onEnquirySubmitted();
      }
    } catch (err: any) {
      setEnquiryError(err?.message || 'Network error submitting enquiry.');
    } finally {
      setIsSubmittingEnquiry(false);
    }
  };

  const handleDownloadHostingerFile = () => {
    const html = generateHostingerHtmlBundle({
      brandName,
      tagline:
        portalSettings?.tagline ||
        'Autonomous 24/7 Real Estate AI Workforce & Omnichannel CRM',
      backendUrl: portalSettings?.backendUrl || window.location.origin,
      whatsappNumber,
      calendlyUrl,
    });
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'index.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const cleanWaDigits = (
    enquirySuccess?.whatsappNumber || whatsappNumber
  ).replace(/[^0-9]/g, '');

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 selection:bg-amber-500/30 selection:text-amber-200">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#07090E]/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-bold text-base shadow-lg shadow-amber-500/20">
              AE
            </div>
            <div>
              <span className="text-base sm:text-lg font-bold tracking-tight text-white block leading-none">
                {brandName}
              </span>
              <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400">
                24/7 Autonomous Brokerage OS
              </span>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-7 text-xs font-medium text-slate-300">
            <a
              href="#bot-screenshots"
              className="hover:text-amber-400 transition"
            >
              AI Bots & Screenshots
            </a>
            <a
              href="#how-it-works"
              className="hover:text-amber-400 transition"
            >
              Full Automation Pipeline
            </a>
            <a
              href="#call-lock-flow"
              className="hover:text-amber-400 transition"
            >
              Call & License Unlock Flow
            </a>
            <a
              href="#send-enquiry"
              className="hover:text-amber-400 transition"
            >
              Book Strategy Call
            </a>
          </nav>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleDownloadHostingerFile}
              title="Download standalone index.html to upload to Hostinger public_html"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-700/80 hover:border-sky-500/50 bg-slate-900/80 text-xs font-medium text-slate-300 hover:text-sky-300 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-sky-400" />
              <span>Hostinger HTML</span>
            </button>

            <button
              onClick={() => setShowLicenseModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-amber-500/40 hover:border-amber-400 bg-amber-500/10 hover:bg-amber-500/20 text-xs font-semibold text-amber-300 transition cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Client Portal Login</span>
            </button>

            <a
              href="#send-enquiry"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-amber-500/20"
            >
              <span>Send Enquiry</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-14 pb-20 border-b border-slate-800/80 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-mono uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  Omnichannel AI Workforce · WhatsApp · Instagram · Website ·
                  Google Calendar
                </span>
              </div>

              <h1 className="font-serif text-4xl sm:text-6xl font-bold tracking-tight text-white leading-[1.08]">
                Turn Every Real Estate Inquiry Into a{' '}
                <span className="text-amber-400 italic">
                  Conflict-Checked Viewing
                </span>{' '}
                in 8 Seconds.
              </h1>

              <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl">
                Stop losing high-commission buyers to slow follow-ups. Our 4
                autonomous AI Employees capture inquiries from your website,
                WhatsApp, and Instagram 24/7, analyze buyer sentiment, verify
                your human agents' Google Calendars for conflicts, and book
                qualified property tours automatically.
              </p>

              <div className="flex flex-wrap items-center gap-3.5 pt-2">
                <a
                  href="#send-enquiry"
                  className="inline-flex items-center gap-2 px-7 py-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition shadow-xl shadow-amber-500/20"
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>Book Discovery Call & Send Enquiry</span>
                </a>

                <button
                  onClick={() => setShowLicenseModal(true)}
                  className="inline-flex items-center gap-2 px-6 py-4 rounded-xl border border-slate-700 hover:border-amber-500/60 bg-slate-900/90 text-slate-200 hover:text-amber-300 font-semibold text-sm transition cursor-pointer"
                >
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  <span>Unlock System with License Key</span>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-800/80">
                <div>
                  <div className="text-2xl sm:text-3xl font-bold font-mono text-amber-400">
                    8.4s
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Avg. Lead Response Time
                  </div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400">
                    3.4x
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    More Tours Scheduled
                  </div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-bold font-mono text-sky-400">
                    0%
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Calendar Double-Bookings
                  </div>
                </div>
              </div>
            </div>

            {/* Hero Right: Live Bot Preview Card */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl bg-[#0D111A] border border-slate-800 shadow-2xl overflow-hidden">
                <div className="px-4 py-3 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-[11px] font-mono text-slate-300 ml-2">
                      LIVE AI BOT ACTIVITY STREAM
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 text-[10px] font-mono">
                    ● 4 BOTS ONLINE
                  </span>
                </div>

                <div className="p-5 space-y-3.5 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/90 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sky-400 flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5" />
                        Website Lead Capture Webhook
                      </span>
                      <span className="font-mono text-[10px] text-slate-500">
                        Just now
                      </span>
                    </div>
                    <p className="text-slate-300">
                      New Buyer: <strong>Jonathan Pierce</strong> inquired on{' '}
                      <span className="text-amber-300">
                        SoHo Cast-Iron Loft ($4.85M)
                      </span>{' '}
                      — Budget: $5M Cash, Timeline: 30 Days.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-emerald-950/25 border border-emerald-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-emerald-300 flex items-center gap-1.5">
                        <Bot className="w-3.5 h-3.5" />
                        Elena · AI Lead Response Specialist
                      </span>
                      <span className="font-mono text-[10px] text-emerald-400">
                        +1.8s
                      </span>
                    </div>
                    <p className="text-slate-200">
                      AI Sentiment Score: <strong>96/100 (High Intent)</strong>.
                      Sent personalized property brochure via Resend HTTPS API &
                      WhatsApp message.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-amber-950/25 border border-amber-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-amber-300 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        Smart Google Calendar Conflict Guard
                      </span>
                      <span className="font-mono text-[10px] text-amber-400">
                        VERIFIED
                      </span>
                    </div>
                    <p className="text-slate-200">
                      Checked Senior Closing Agent{' '}
                      <strong>Victoria Sterling's</strong> Google Calendar for
                      Thursday 2:00 PM — 0 conflicts. Tour booked & synced!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Bot & System Screenshots Section */}
      <section
        id="bot-screenshots"
        className="py-20 border-b border-slate-800/80"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
            <div>
              <div className="text-xs font-mono uppercase tracking-widest text-amber-400 mb-2">
                Interactive Platform Tour & Screenshots
              </div>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white">
                See Our AI Bots & Real Estate Command Center in Action
              </h2>
              <p className="text-sm text-slate-400 mt-2 max-w-2xl">
                Click through the 4 core modules below to inspect how our bots
                capture, analyze, schedule, and close property leads for your
                brokerage.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                {
                  id: 'elena',
                  label: '1. AI Bots & Live Terminal',
                  icon: Bot,
                },
                {
                  id: 'analyzer',
                  label: '2. AI Lead Sentiment Analyzer',
                  icon: Sparkles,
                },
                {
                  id: 'calendar',
                  label: '3. Calendar Conflict Guard',
                  icon: Calendar,
                },
                {
                  id: 'funnel',
                  label: '4. 6-Stage Conversion Funnel',
                  icon: Layers,
                },
              ].map((tab) => {
                const Icon = tab.icon;
                const active = activeScreenshotTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveScreenshotTab(tab.id as any)}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                      active
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20'
                        : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Screenshot Display Frame */}
          <div className="rounded-3xl bg-[#0D111A] border border-slate-800 shadow-2xl overflow-hidden">
            {/* Mock Browser Top Bar */}
            <div className="px-6 py-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500" />
                <span className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="ml-3 px-3 py-1 rounded-md bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-400">
                  app.atelierestate.ai/command-center/{activeScreenshotTab}
                </span>
              </div>
              <span className="text-xs font-mono text-amber-400">
                Screenshot Preview · Unlocked After License Activation
              </span>
            </div>

            {activeScreenshotTab === 'elena' && (
              <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 space-y-4">
                  <div className="text-xs font-mono uppercase tracking-wider text-emerald-400">
                    4 Specialized Real Estate AI Employees
                  </div>
                  <h3 className="text-2xl font-bold text-white">
                    Elena, Marcus, Sophia & Viktor Work Together 24/7
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                      <div className="font-bold text-amber-300 text-sm">
                        Elena · Lead Response Bot
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Instantly replies to Website, WhatsApp, and Instagram
                        leads in under 10 seconds, qualifying budget, pre-approval,
                        and move-in timeline.
                      </p>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                      <div className="font-bold text-sky-300 text-sm">
                        Marcus · CRM & Portfolio Analyst
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Matches buyer criteria against your active property
                        inventory, calculates ROI/cap rates, and scores lead
                        intent from 0-100.
                      </p>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                      <div className="font-bold text-purple-300 text-sm">
                        Sophia · Listing & Social Marketer
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Generates luxury property descriptions, Instagram reels
                        scripts, and automated email drip campaigns via Resend &
                        Brevo.
                      </p>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                      <div className="font-bold text-emerald-300 text-sm">
                        Viktor · Outbound Deal Closer
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Coordinates with your human real estate agents, checks
                        their Google Calendars, and books conflict-free property
                        tours.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Simulated Live Bot Terminal Screenshot */}
                <div className="lg:col-span-5 rounded-2xl bg-slate-950 border border-slate-800 p-5 font-mono text-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <span className="text-slate-300 flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-amber-400" />
                      LIVE BOT TELEMETRY DRAWER
                    </span>
                    <span className="text-emerald-400 text-[10px]">
                      ● STREAMING
                    </span>
                  </div>
                  <div className="p-2.5 rounded bg-slate-900/90 border-l-2 border-sky-400 text-slate-300">
                    [10:42:01] <strong className="text-sky-300">WEBHOOK</strong>{' '}
                    Received lead from Agency Website: "Aarav Singhania" ($3.2M
                    Villa Inquiry)
                  </div>
                  <div className="p-2.5 rounded bg-slate-900/90 border-l-2 border-amber-400 text-slate-300">
                    [10:42:03] <strong className="text-amber-300">ELENA</strong>{' '}
                    Scored Lead 94/100 · Sent WhatsApp & Resend Email brochure
                  </div>
                  <div className="p-2.5 rounded bg-slate-900/90 border-l-2 border-emerald-400 text-slate-300">
                    [10:42:06]{' '}
                    <strong className="text-emerald-300">VIKTOR</strong> Checked
                    Agent Victoria Sterling Google Calendar → Booked Friday 4:00
                    PM Tour
                  </div>
                </div>
              </div>
            )}

            {activeScreenshotTab === 'analyzer' && (
              <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                <div className="lg:col-span-5 space-y-4">
                  <div className="text-xs font-mono uppercase tracking-wider text-amber-400">
                    1-Click AI Lead Intelligence
                  </div>
                  <h3 className="text-2xl font-bold text-white">
                    Instant Sentiment Scoring & Next-Best-Action Engine
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Inside the Leads & Clients CRM table, click{' '}
                    <span className="text-amber-300 font-semibold">
                      "Analyze with AI"
                    </span>{' '}
                    on any lead. The system reads their entire chat log, past
                    emails, and property preferences to give your agents an
                    executive briefing and 1-click execution buttons.
                  </p>
                </div>
                <div className="lg:col-span-7 rounded-2xl bg-slate-950 border border-slate-800 p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <div className="text-sm font-bold text-white">
                        AI Executive Briefing · Lead: Camilla Laurent
                      </div>
                      <div className="text-xs text-slate-400">
                        Target: Tribeca Sky Penthouse ($6.5M)
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold">
                      HIGH INTENT · 95/100
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    "Camilla has replied twice via Gmail confirming cash liquid
                    reserves and requested private elevator specs. High urgency
                    prior to international travel next Tuesday."
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                      <div className="font-semibold text-amber-300 mb-1">
                        Recommended Step #1 (Immediate)
                      </div>
                      <div className="text-slate-300">
                        Lock Saturday 11:00 AM private penthouse tour on Agent
                        Victoria Sterling's calendar.
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                      <div className="font-semibold text-sky-300 mb-1">
                        Recommended Step #2 (High)
                      </div>
                      <div className="text-slate-300">
                        Dispatch comparable Tribeca $/sqft comps sheet via
                        Resend Email.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeScreenshotTab === 'calendar' && (
              <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                <div className="lg:col-span-5 space-y-4">
                  <div className="text-xs font-mono uppercase tracking-wider text-emerald-400">
                    Zero Double-Bookings
                  </div>
                  <h3 className="text-2xl font-bold text-white">
                    Automatic Google Calendar & Lead Conflict Validation
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Before any AI bot or human coordinator schedules a property
                    viewing, our validation layer cross-checks both the{' '}
                    <strong>Assigned Human Agent's Google Calendar</strong> and
                    the <strong>Lead's existing tour history</strong>—blocking
                    overlapping slots and suggesting the next open 1-hour window.
                  </p>
                </div>
                <div className="lg:col-span-7 rounded-2xl bg-slate-950 border border-slate-800 p-6 space-y-4 text-xs">
                  <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/40 text-rose-200 space-y-1.5">
                    <div className="font-bold text-rose-300 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Conflict Detected on Thursday 2:00 PM
                    </div>
                    <p>
                      Senior Agent <strong>Victoria Sterling</strong> already
                      has "Private Showing — 432 Park Ave" from 2:00 PM to 3:00
                      PM on Google Calendar.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-emerald-200 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-emerald-300">
                        ✓ Auto-Suggested Conflict-Free Slot: Thursday 3:30 PM
                      </div>
                      <div className="text-slate-300 mt-0.5">
                        Both Agent Google Calendar & Buyer Schedule verified
                        open.
                      </div>
                    </div>
                    <span className="px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold">
                      1-Click Apply
                    </span>
                  </div>
                </div>
              </div>
            )}

            {activeScreenshotTab === 'funnel' && (
              <div className="p-6 sm:p-8 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-mono uppercase tracking-wider text-amber-400">
                      End-to-End Pipeline Visibility
                    </div>
                    <h3 className="text-2xl font-bold text-white">
                      6-Stage Real Estate Conversion Funnel
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-emerald-400">
                    Total Pipeline Value: $42.8M Across Active Buyers
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {[
                    {
                      stage: '1. Inbound Inquiry',
                      count: '48 Leads',
                      sub: 'Website, WA, IG',
                      color: 'border-slate-700 text-slate-200',
                    },
                    {
                      stage: '2. AI Qualified',
                      count: '36 Leads',
                      sub: '75% Qualification',
                      color: 'border-sky-500/40 text-sky-300',
                    },
                    {
                      stage: '3. Follow-Up Sent',
                      count: '31 Leads',
                      sub: 'Resend / Brevo / WA',
                      color: 'border-indigo-500/40 text-indigo-300',
                    },
                    {
                      stage: '4. Tour Scheduled',
                      count: '19 Tours',
                      sub: 'Calendar Verified',
                      color: 'border-amber-500/40 text-amber-300',
                    },
                    {
                      stage: '5. Offer Submitted',
                      count: '8 Offers',
                      sub: 'Agent Handoff',
                      color: 'border-purple-500/40 text-purple-300',
                    },
                    {
                      stage: '6. Closed Property',
                      count: '5 Closed',
                      sub: '$18.4M Volume',
                      color: 'border-emerald-500/50 text-emerald-300 bg-emerald-950/20',
                    },
                  ].map((item) => (
                    <div
                      key={item.stage}
                      className={`p-4 rounded-2xl bg-slate-950 border ${item.color}`}
                    >
                      <div className="text-[11px] font-mono uppercase opacity-80">
                        {item.stage}
                      </div>
                      <div className="text-xl font-bold mt-2">{item.count}</div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        {item.sub}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Call-First Sales & License Lock Process */}
      <section
        id="call-lock-flow"
        className="py-20 border-b border-slate-800/80 bg-slate-950/40"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mb-12">
            <div className="text-xs font-mono uppercase tracking-widest text-amber-400 mb-2">
              Protected Enterprise Delivery
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white">
              How Our Onboarding Call & License Key Lock Works
            </h2>
            <p className="text-sm text-slate-400 mt-2">
              To ensure every brokerage gets custom channel setup and verified
              deliverability, the automation engine is locked behind a dedicated
              Client License Key.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-[#0D111A] border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-mono font-bold text-sm">
                01
              </div>
              <h3 className="text-lg font-bold text-white">
                Submit Enquiry & Hop on a Strategy Call
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Fill out the form below. We connect with you on a live call or
                WhatsApp to review your website lead forms, WhatsApp Business,
                Instagram, and human agent calendars.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#0D111A] border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 font-mono font-bold text-sm">
                02
              </div>
              <h3 className="text-lg font-bold text-white">
                Guided Setup & Payment Verification
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Once you choose your brokerage package and complete payment on
                the call, we configure your dedicated VPS/Cloud workspace and
                Resend/Brevo email domain.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#0D111A] border border-emerald-500/40 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-mono font-bold text-sm">
                03
              </div>
              <h3 className="text-lg font-bold text-white">
                Unlock Your AI Workforce with Your License Key
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                You receive your unique{' '}
                <code className="text-amber-300 font-mono">
                  ESTATE-PRO-XXXX
                </code>{' '}
                License Key via email & WhatsApp. Click{' '}
                <strong>Client Portal Login</strong> above to unlock your
                dashboard immediately.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* B2B Send Enquiry & Discovery Call Section */}
      <section id="send-enquiry" className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="rounded-3xl bg-[#0D111A] border border-slate-800 p-8 sm:p-12 shadow-2xl">
            <div className="max-w-2xl mb-8">
              <div className="text-xs font-mono uppercase tracking-widest text-amber-400 mb-2">
                Deploy In Your Brokerage
              </div>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white">
                Send Enquiry & Book Your Onboarding Call
              </h2>
              <p className="text-sm text-slate-400 mt-2">
                Complete the form below to schedule your live walkthrough,
                connect with our team on call, and receive your Client License
                Key.
              </p>
            </div>

            {enquiryError && (
              <div className="mb-6 p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{enquiryError}</span>
              </div>
            )}

            {!enquirySuccess ? (
              <form onSubmit={handleSubmitEnquiry} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Real Estate Agency Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={agencyName}
                      onChange={(e) => setAgencyName(e.target.value)}
                      placeholder="e.g., Prestige Luxury Realty"
                      className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Your Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="e.g., Rajesh Sharma"
                      className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Work Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@youragency.com"
                      className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Phone / WhatsApp Number (For Call) *
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210 or +1 555 019 2834"
                      className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Brokerage Team Size
                    </label>
                    <select
                      value={teamSize}
                      onChange={(e) => setTeamSize(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:border-amber-500 focus:outline-none"
                    >
                      <option value="1-5 Agents">1 - 5 Agents</option>
                      <option value="6-15 Agents">6 - 15 Agents</option>
                      <option value="16-50 Agents">16 - 50 Agents</option>
                      <option value="50+ Enterprise">
                        50+ Agents (Enterprise)
                      </option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Monthly Inbound Leads
                    </label>
                    <select
                      value={monthlyLeads}
                      onChange={(e) => setMonthlyLeads(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:border-amber-500 focus:outline-none"
                    >
                      <option value="Under 100 Leads/mo">
                        Under 100 Leads / month
                      </option>
                      <option value="100-500 Leads/mo">
                        100 - 500 Leads / month
                      </option>
                      <option value="500-2,000 Leads/mo">
                        500 - 2,000 Leads / month
                      </option>
                      <option value="2,000+ Leads/mo">
                        2,000+ Leads / month
                      </option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    What Channels & Goals Would You Like to Automate?
                  </label>
                  <textarea
                    rows={3}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="e.g., Connect our website lead form, WhatsApp Business, and 10 human agents' Google Calendars..."
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingEnquiry}
                  className="w-full py-4 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-sm tracking-wide transition shadow-xl shadow-amber-500/20 cursor-pointer"
                >
                  {isSubmittingEnquiry
                    ? 'Submitting Enquiry & Alerting Onboarding Team...'
                    : 'Submit Enquiry & Connect on Strategy Call →'}
                </button>
              </form>
            ) : (
              <div className="p-6 sm:p-8 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 space-y-5">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      Enquiry Logged! Let's Connect on Call to Activate Your
                      License Key
                    </h3>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      Your details for <strong>{agencyName}</strong> have been
                      saved to the Admin Enquiries Hub (
                      {enquirySuccess.emailAlertStatus}). Connect with us
                      immediately on WhatsApp or book your call slot below to
                      complete onboarding and unlock your system:
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <a
                    href={`https://wa.me/${cleanWaDigits}?text=${encodeURIComponent(
                      `Hi! I just submitted an enquiry for ${agencyName} (${contactName}). Let's hop on a quick call so I can complete payment and get my License Key!`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-lg"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Chat on WhatsApp Now</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <a
                    href={enquirySuccess.calendlyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition shadow-lg"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Book Discovery Call Slot</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <button
                    onClick={() => setShowLicenseModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-3.5 rounded-xl border border-slate-700 hover:border-amber-400 text-xs font-semibold text-slate-200 transition cursor-pointer"
                  >
                    <KeyRound className="w-4 h-4 text-amber-400" />
                    <span>Already Received License Key? Unlock Here</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 border-t border-slate-800/80 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            © {new Date().getFullYear()} {brandName}. Built for High-Velocity
            Real Estate Brokerages.
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleDownloadHostingerFile}
              className="text-sky-400 hover:underline cursor-pointer"
            >
              Download Hostinger index.html
            </button>
            <button
              onClick={() => setShowLicenseModal(true)}
              className="text-amber-400 hover:underline cursor-pointer"
            >
              Client & Admin Portal Login
            </button>
          </div>
        </div>
      </footer>

      {/* License Key & Client Login Modal */}
      {showLicenseModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-[#0D111A] border border-slate-800 p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    Unlock Automation Portal
                  </h3>
                  <p className="text-xs text-slate-400">
                    Enter your Client License Key issued after payment
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowLicenseModal(false)}
                className="text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            {loginError && (
              <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleVerifyLicense} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Agency Work Email
                </label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="you@youragency.com"
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Client License Key or Master Admin Key *
                </label>
                <input
                  type="text"
                  required
                  value={licenseKeyInput}
                  onChange={(e) => setLicenseKeyInput(e.target.value)}
                  placeholder="ESTATE-PRO-XXXX-XXXX"
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-sm text-amber-300 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isVerifyingLicense}
                className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs uppercase tracking-wider transition cursor-pointer"
              >
                {isVerifyingLicense
                  ? 'Verifying License Key...'
                  : 'Verify Key & Unlock Automation →'}
              </button>
            </form>

            {/* Quick Owner / Demo Fill Helpers */}
            <div className="pt-4 border-t border-slate-800/80 space-y-2.5">
              <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                Quick Testing & Owner Access
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setLoginEmail('khushi4762@gmail.com');
                    setLicenseKeyInput('ADMIN-ESTATE-2026');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] text-amber-300 font-mono cursor-pointer"
                >
                  Fill Master Admin Key (ADMIN-ESTATE-2026)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoginEmail('alex@vanguardrealty.com');
                    setLicenseKeyInput('ESTATE-PRO-8842-VIP');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] text-emerald-300 font-mono cursor-pointer"
                >
                  Fill Sample Paid Client Key
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
