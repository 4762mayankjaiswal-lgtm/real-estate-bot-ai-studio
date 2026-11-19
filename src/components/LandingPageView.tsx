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
  PhoneCall,
  Globe,
  Users,
  Building2,
  AlertCircle,
  ExternalLink,
  Layers,
  Clock,
  Check,
  ChevronRight,
  Send,
  FileCheck2,
  X,
} from 'lucide-react';
import villaSolarisImg from '../assets/images/listing_villa_solaris_1794639287799.jpg';
import mercerPenthouseImg from '../assets/images/listing_mercer_penthouse_1794639289255.jpg';
import pacificBluffImg from '../assets/images/listing_pacific_bluff_1794639289498.jpg';
import beaconTownhouseImg from '../assets/images/listing_beacon_townhouse_1794639290786.jpg';

export interface ActiveLicenseSession {
  role: 'ADMIN' | 'CLIENT';
  agencyName: string;
  clientName: string;
  clientEmail: string;
  licenseKey: string;
  planTier: string;
  token?: string;
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
  onEnquirySubmitted?: (syncedLead?: any) => void;
}

export const LandingPageView: React.FC<LandingPageViewProps> = ({
  onUnlockSuccess,
  portalSettings,
  onEnquirySubmitted,
}) => {
  const [activeShowcaseTab, setActiveShowcaseTab] = useState<
    'workforce' | 'agent_dispatch' | 'sentiment' | 'funnel'
  >('workforce');
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [showKeyText, setShowKeyText] = useState(false);

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
    enquiryId?: string;
    whatsappNumber: string;
    calendlyUrl: string;
    notificationEmail?: string;
    emailAlertStatus?: string;
  } | null>(null);
  const [enquiryError, setEnquiryError] = useState<string | null>(null);

  // Built-in Strategy Call Slot Booking State (Real Backend Booking)
  const tomorrowIsoDate = new Date(Date.now() + 86400000)
    .toISOString()
    .slice(0, 10);
  const [callDateStr, setCallDateStr] = useState(tomorrowIsoDate);
  const [callTimeSlot, setCallTimeSlot] = useState('11:00 AM');
  const [isBookingCall, setIsBookingCall] = useState(false);
  const [bookedCallConfirmed, setBookedCallConfirmed] = useState<string | null>(
    null
  );

  const brandName = portalSettings?.brandName || 'Atelier Estate AI';
  const whatsappNumber = portalSettings?.whatsappNumber || '';
  const calendlyUrl = portalSettings?.calendlyUrl || '';

  const handleVerifyLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsVerifyingLicense(true);
    try {
      const resp = await fetch('/api/auth/verify-license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail.trim(),
          licenseKey: licenseKeyInput.trim(),
        }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.ok) {
        setLoginError(
          data.error ||
            'Invalid or inactive License Key. Please schedule an onboarding call to receive your brokerage license.'
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
          enquiryId: data.enquiry?.id,
          whatsappNumber: data.whatsappNumber || whatsappNumber || '',
          calendlyUrl: data.calendlyUrl || calendlyUrl || '',
          notificationEmail: data.notificationEmail || 'khushi4762@gmail.com',
          emailAlertStatus: data.emailAlertStatus,
        });
        if (onEnquirySubmitted) onEnquirySubmitted(data.lead);
      }
    } catch (err: any) {
      setEnquiryError(err?.message || 'Network error submitting enquiry.');
    } finally {
      setIsSubmittingEnquiry(false);
    }
  };

  const handleBookStrategyCallSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!callDateStr || !callTimeSlot) return;
    setIsBookingCall(true);
    try {
      const resp = await fetch('/api/public/book-strategy-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enquiryId: enquirySuccess?.enquiryId,
          agencyName,
          contactName,
          email,
          phone,
          dateStr: callDateStr,
          timeSlot: callTimeSlot,
        }),
      });
      const data = await resp.json();
      if (resp.ok && data.ok) {
        setBookedCallConfirmed(data.slotLabel);
      }
    } finally {
      setIsBookingCall(false);
    }
  };

  const cleanWaDigits = (
    enquirySuccess?.whatsappNumber || whatsappNumber || ''
  ).replace(/[^0-9]/g, '');
  const hasRealCalendlyUrl =
    Boolean(enquirySuccess?.calendlyUrl || calendlyUrl) &&
    (enquirySuccess?.calendlyUrl || calendlyUrl) !== 'https://calendly.com';

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-slate-900 antialiased selection:bg-slate-900 selection:text-white">
      {/* Sticky Architectural Navigation Header */}
      <header className="sticky top-0 z-40 bg-[#FAF9F6]/90 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-serif font-bold text-lg tracking-tight shadow-sm">
              AE
            </div>
            <div>
              <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900 block leading-none">
                {brandName}
              </span>
              <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500 mt-1 block">
                Brokerage AI Operating System
              </span>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a
              href="#platform-tour"
              className="hover:text-slate-900 transition-colors"
            >
              Platform & AI Workforce
            </a>
            <a
              href="#owner-workflow"
              className="hover:text-slate-900 transition-colors"
            >
              Owner-Driven Agent Dispatch
            </a>
            <a
              href="#portfolio-bento"
              className="hover:text-slate-900 transition-colors"
            >
              Architecture & CRM
            </a>
            <a
              href="#send-enquiry"
              className="hover:text-slate-900 transition-colors"
            >
              Book Strategy Call
            </a>
          </nav>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                setLoginError(null);
                setShowLicenseModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 hover:border-slate-900 bg-white text-xs font-semibold text-slate-900 transition shadow-2xs cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5 text-slate-700" />
              <span>Client Sign In</span>
            </button>

            <a
              href="#send-enquiry"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition shadow-sm"
            >
              <span>Book Onboarding Call</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section — 60/40 Asymmetric Split with Real Architectural Photography & Live White SaaS UI Card */}
      <section className="relative pt-12 pb-20 lg:pt-20 lg:pb-28 border-b border-slate-200/80 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-center">
            {/* Left Column (7 Cols) */}
            <div className="lg:col-span-7 space-y-8">
              <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-md bg-white border border-slate-200/90 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                <span className="text-xs font-semibold tracking-wide text-slate-700 uppercase">
                  Built for Real Estate Brokerage Owners · Zero Employee Logins Required
                </span>
              </div>

              <h1 className="font-serif text-4xl sm:text-6xl lg:text-[64px] font-semibold tracking-tight text-slate-900 leading-[1.04]">
                Convert Inbound Property Inquiries Into{' '}
                <span className="italic font-normal text-slate-700">
                  Confirmed Showings
                </span>{' '}
                in 8 Seconds.
              </h1>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
                78% of luxury real estate commissions go to the first brokerage
                that responds. Deploy 6 specialized AI Employees that qualify
                buyers across WhatsApp, Instagram, and your Website 24/7, check
                your Brokerage Master Schedule for conflicts, and automatically
                email <strong className="text-slate-900 font-semibold">RFC 5545 Calendar Invites (.ics)</strong>{' '}
                to your field agents and buyers.
              </p>

              <div className="flex flex-wrap items-center gap-3.5 pt-1">
                <a
                  href="#send-enquiry"
                  className="inline-flex items-center gap-2.5 px-7 py-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition shadow-md"
                >
                  <PhoneCall className="w-4 h-4 text-amber-300" />
                  <span>Schedule Live Demo & Send Enquiry</span>
                </a>

                <button
                  onClick={() => setShowLicenseModal(true)}
                  className="inline-flex items-center gap-2 px-6 py-4 rounded-xl border border-slate-300 hover:border-slate-900 bg-white text-slate-900 font-semibold text-sm transition shadow-2xs cursor-pointer"
                >
                  <Lock className="w-4 h-4 text-slate-600" />
                  <span>Unlock Dashboard with License Key</span>
                </button>
              </div>

              {/* Architectural Metric Hairline Grid */}
              <div className="grid grid-cols-3 gap-6 pt-8 border-t border-slate-200/90 max-w-xl">
                <div>
                  <div className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 font-mono">
                    6.8s
                  </div>
                  <div className="text-xs font-medium text-slate-500 mt-1">
                    Avg. Omnichannel Reply
                  </div>
                </div>
                <div className="border-l border-slate-200 pl-6">
                  <div className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 font-mono">
                    3.4×
                  </div>
                  <div className="text-xs font-medium text-slate-500 mt-1">
                    More Private Showings
                  </div>
                </div>
                <div className="border-l border-slate-200 pl-6">
                  <div className="text-2xl sm:text-3xl font-bold tracking-tight text-emerald-700 font-mono">
                    100%
                  </div>
                  <div className="text-xs font-medium text-slate-500 mt-1">
                    Direct .ics Agent Dispatch
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column (5 Cols): Architectural Property Card + Live AI Dispatch Overlay */}
            <div className="lg:col-span-5">
              <div className="relative rounded-2xl bg-white border border-slate-200/90 shadow-xl overflow-hidden">
                {/* Real Luxury Property Listing Header Image */}
                <div className="relative h-56 overflow-hidden">
                  <img
                    src={villaSolarisImg}
                    alt="Villa Solaris — Beverly Hills Architectural Listing"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/25 to-transparent" />
                  <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-md bg-white/95 backdrop-blur-xs text-slate-900 text-[11px] font-semibold tracking-wide shadow-xs">
                      ACTIVE INQUIRY · WHATSAPP & WEB
                    </span>
                    <span className="px-2.5 py-1 rounded-md bg-emerald-600 text-white text-[11px] font-mono font-semibold shadow-xs">
                      SCORE 96/100
                    </span>
                  </div>
                  <div className="absolute bottom-3.5 left-4 right-4 text-white">
                    <div className="text-xs uppercase tracking-widest text-amber-200 font-medium">
                      Trousdale Estates · Beverly Hills
                    </div>
                    <div className="flex items-baseline justify-between mt-0.5">
                      <h3 className="font-serif text-xl font-semibold">
                        Villa Solaris Pavilion
                      </h3>
                      <span className="font-mono text-sm font-bold text-white">
                        $6,850,000
                      </span>
                    </div>
                  </div>
                </div>

                {/* Live SaaS Workflow Steps inside Card */}
                <div className="p-5 space-y-3.5 bg-white">
                  <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2.5">
                    <span>Autonomous Execution Trace</span>
                    <span className="text-emerald-700 font-mono">
                      ● COMPLETED IN 6.4s
                    </span>
                  </div>

                  {/* Step 1 */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-slate-700" />
                        1. Elena (AI Lead Specialist) Qualified Buyer
                      </span>
                      <span className="font-mono text-[11px] text-slate-500">
                        +1.9s
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Buyer <strong>Jonathan Pierce</strong> confirmed $7M cash
                      allocation, relocating within 30 days. Requested private
                      viewing this Thursday at 2:00 PM.
                    </p>
                  </div>

                  {/* Step 2 */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                        2. Julian (Calendar Specialist) Verified Schedule
                      </span>
                      <span className="font-mono text-[11px] text-emerald-700 font-semibold">
                        0 CONFLICTS
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Cross-checked Brokerage Master Schedule for Senior Closing
                      Agent <strong>Victoria Sterling</strong>. Thursday 2:00 PM
                      is open.
                    </p>
                  </div>

                  {/* Step 3 */}
                  <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-emerald-950 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-emerald-700" />
                        3. Direct .ics Calendar Invite Emailed
                      </span>
                      <span className="font-mono text-[11px] text-emerald-800 font-semibold">
                        RESEND / BREVO
                      </span>
                    </div>
                    <p className="text-xs text-emerald-900/90 leading-relaxed">
                      Dispatched calendar file + buyer dossier to{' '}
                      <code className="font-mono text-[11px] bg-white px-1.5 py-0.5 rounded border border-emerald-200">
                        victoria@atelierestate.com
                      </code>{' '}
                      & buyer—no employee dashboard login needed.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive SaaS Platform & AI Bots Showcase */}
      <section
        id="platform-tour"
        className="py-20 lg:py-28 border-b border-slate-200/80 bg-white"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-12 gap-6">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 mb-2">
                Inside the Brokerage Command Center
              </div>
              <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-slate-900 tracking-tight">
                Inspect the 4 Pillars of Your AI Workforce
              </h2>
              <p className="text-sm sm:text-base text-slate-600 mt-2 max-w-2xl">
                Explore real interface views from the brokerage operating
                system—designed exclusively for agency owners to oversee leads,
                AI bots, and human agent showings from one unified workspace.
              </p>
            </div>

            {/* Clean Tab Bar */}
            <div className="inline-flex flex-wrap gap-1.5 p-1.5 rounded-xl bg-slate-100 border border-slate-200/80">
              {[
                {
                  id: 'workforce',
                  label: '1. 6 AI Employees',
                  icon: Bot,
                },
                {
                  id: 'agent_dispatch',
                  label: '2. Human Agent .ics Dispatch',
                  icon: Calendar,
                },
                {
                  id: 'sentiment',
                  label: '3. AI Lead Sentiment Brief',
                  icon: Sparkles,
                },
                {
                  id: 'funnel',
                  label: '4. 6-Stage Deal Funnel',
                  icon: Layers,
                },
              ].map((tab) => {
                const Icon = tab.icon;
                const active = activeShowcaseTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveShowcaseTab(tab.id as any)}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      active
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Crisp Light-Mode SaaS Application Frame */}
          <div className="rounded-2xl bg-[#FAF9F6] border border-slate-200/90 shadow-lg overflow-hidden">
            {/* Window Header Bar */}
            <div className="px-6 py-3.5 bg-white border-b border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                <span className="ml-3 px-3 py-1 rounded-md bg-slate-50 border border-slate-200 text-[11px] font-mono text-slate-600">
                  workspace.atelierestate.ai/{activeShowcaseTab}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Owner Command View · Protected by License Gate</span>
              </div>
            </div>

            {/* Tab 1: 6 Specialized AI Employees */}
            {activeShowcaseTab === 'workforce' && (
              <div className="p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-7 space-y-5">
                  <div>
                    <span className="text-xs font-mono uppercase tracking-wider text-emerald-700 font-semibold">
                      Autonomous Multi-Agent Architecture
                    </span>
                    <h3 className="font-serif text-2xl sm:text-3xl font-semibold text-slate-900 mt-1">
                      6 Specialized Real Estate AI Employees Working in Sync
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {[
                      {
                        name: 'Clara · AI Receptionist',
                        role: 'Voice & Web Concierge',
                        desc: 'Greets inbound website & phone visitors 24/7, captures contact info, and routes hot buyers.',
                      },
                      {
                        name: 'Elena · Lead Response Specialist',
                        role: 'WhatsApp & Instagram',
                        desc: 'Replies in under 8 seconds on WhatsApp & IG, qualifying budget, pre-approval, and move-in timeline.',
                      },
                      {
                        name: 'Marcus · CRM Data Analyst',
                        role: 'Lead Scoring & Comps',
                        desc: 'Scores buyer sentiment from 0–100 and matches inquiries against your active property portfolio.',
                      },
                      {
                        name: 'Julian · Calendar Specialist',
                        role: 'Conflict Guard & .ics Dispatch',
                        desc: 'Checks your Brokerage Master Schedule and emails RFC 5545 .ics calendar invites to field agents.',
                      },
                      {
                        name: 'Maya · Social Media Manager',
                        role: 'Instagram & Campaigns',
                        desc: 'Turns DM comments and story replies into structured CRM leads and sends property brochures.',
                      },
                      {
                        name: 'Aria · Follow-Up Coordinator',
                        role: 'Resend & Brevo Drip Engine',
                        desc: 'Executes multi-day email & WhatsApp follow-up sequences until the buyer books a viewing.',
                      },
                    ].map((bot) => (
                      <div
                        key={bot.name}
                        className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-900 text-sm">
                            {bot.name}
                          </span>
                          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Active
                          </span>
                        </div>
                        <div className="text-[11px] font-medium text-slate-500">
                          {bot.role}
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {bot.desc}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right Side: Live Omnichannel Conversation & Handoff Preview */}
                <div className="lg:col-span-5 rounded-xl bg-white border border-slate-200/90 shadow-sm overflow-hidden">
                  <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold">
                        Omnichannel AI Inbox · Live Qualification
                      </div>
                      <div className="text-[11px] text-slate-300">
                        Channel: WhatsApp Business API · Lead: Camilla Laurent
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono">
                      AUTO-PILOT ON
                    </span>
                  </div>

                  <div className="p-5 space-y-3.5 text-xs bg-slate-50/60">
                    <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-slate-700 shadow-2xs">
                      <div className="text-[10px] font-semibold text-slate-400 uppercase mb-1">
                        Camilla Laurent (Buyer) · 10:14 AM
                      </div>
                      "Hi, I saw The Mercer Penthouse ($8.9M) on Instagram. Is it
                      still available? We are cash buyers in NYC this week and
                      would love a private tour."
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-900 text-white shadow-xs">
                      <div className="flex items-center justify-between text-[10px] text-amber-300 font-mono uppercase mb-1">
                        <span>Elena · AI Lead Specialist</span>
                        <span>Replied in 5.2s</span>
                      </div>
                      "Good morning Camilla! Yes, The Mercer Penthouse in SoHo is
                      available. I have sent the private floorplan brochure to
                      your email. Senior Partner Victoria Sterling has Friday at
                      11:00 AM or 3:00 PM open—would either work for your
                      viewing?"
                    </div>

                    <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-slate-700 shadow-2xs">
                      <div className="text-[10px] font-semibold text-slate-400 uppercase mb-1">
                        Camilla Laurent (Buyer) · 10:15 AM
                      </div>
                      "Friday at 11:00 AM is perfect. My email is
                      camilla@laurentcapital.com."
                    </div>

                    <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>
                          <strong>Julian (AI):</strong> Booked Friday 11:00 AM &
                          emailed <code className="font-mono">.ics</code> invite
                          to Agent Victoria Sterling.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Owner-Centric Human Agent Showing Dispatcher */}
            {activeShowcaseTab === 'agent_dispatch' && (
              <div className="p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-5 space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                    Zero Employee Logins Needed
                  </div>
                  <h3 className="font-serif text-2xl sm:text-3xl font-semibold text-slate-900">
                    Built for the Brokerage Owner—Your Field Agents Never Need
                    to Log Into the Dashboard
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    You don’t need to chase your human real estate agents to
                    connect personal OAuth accounts. Simply enter each field
                    agent’s <strong>Name, Email, and Phone</strong> in your
                    Human Agents roster:
                  </p>
                  <ul className="space-y-2.5 text-xs text-slate-700">
                    <li className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>
                        <strong>Master Schedule Conflict Guard:</strong> Prevents
                        two buyers from ever booking the same human agent at the
                        same hour.
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>
                        <strong>Direct RFC 5545 (.ics) Calendar Invites:</strong>{' '}
                        Automatically emails a standard calendar invite via your
                        connected Resend, Brevo, or SMTP account directly to the
                        assigned human agent and the buyer.
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>
                        <strong>1-Click Tap to Accept on Phone:</strong> Your
                        human agent taps the email on their iPhone or Android to
                        add the showing to Google Calendar, Apple Calendar, or
                        Outlook.
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="lg:col-span-7 rounded-xl bg-white border border-slate-200 p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                      <div className="text-sm font-bold text-slate-900">
                        Human Agent Roster & Direct Calendar Dispatch
                      </div>
                      <div className="text-xs text-slate-500">
                        Managed centrally by Brokerage Owner · Instant .ics
                        email delivery
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-md bg-slate-900 text-white text-xs font-mono">
                      3 Field Agents Active
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-900 text-sm">
                            Victoria Sterling
                          </div>
                          <div className="text-xs text-slate-500">
                            Senior Luxury Partner · Penthaouses
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-semibold">
                          Available
                        </span>
                      </div>
                      <div className="text-xs font-mono text-slate-600 bg-white px-2.5 py-1.5 rounded border border-slate-200">
                        ✉ victoria@atelierestate.com
                      </div>
                      <div className="flex items-center justify-between pt-1 text-[11px] text-emerald-700 font-medium">
                        <span>✓ Direct .ics Invite Ready</span>
                        <span>4 Tours This Week</span>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-900 text-sm">
                            Devon Brooks
                          </div>
                          <div className="text-xs text-slate-500">
                            Architectural Estates Specialist
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-semibold">
                          Available
                        </span>
                      </div>
                      <div className="text-xs font-mono text-slate-600 bg-white px-2.5 py-1.5 rounded border border-slate-200">
                        ✉ devon@atelierestate.com
                      </div>
                      <div className="flex items-center justify-between pt-1 text-[11px] text-emerald-700 font-medium">
                        <span>✓ Direct .ics Invite Ready</span>
                        <span>3 Tours This Week</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="font-bold">
                        Automated Showing Dispatch Packet Sent
                      </div>
                      <div className="text-emerald-800 mt-0.5">
                        Includes RFC 5545 <code className="font-mono">.ics</code>{' '}
                        attachment, Google Calendar 1-click link, buyer phone,
                        and AI sentiment notes.
                      </div>
                    </div>
                    <span className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white font-semibold shrink-0 text-center">
                      Zero Employee OAuth
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: AI Lead Sentiment Analyzer */}
            {activeShowcaseTab === 'sentiment' && (
              <div className="p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-5 space-y-4">
                  <div className="text-xs font-mono uppercase tracking-wider text-slate-500 font-semibold">
                    1-Click Deal Intelligence
                  </div>
                  <h3 className="font-serif text-2xl sm:text-3xl font-semibold text-slate-900">
                    Instant AI Buyer Sentiment & Executive Deal Briefing
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Click <strong>"Analyze with AI"</strong> on any lead in your
                    Leads DB. The engine evaluates every WhatsApp message,
                    email reply, budget signal, and property preference to score
                    intent and give you 1-click actions.
                  </p>
                </div>

                <div className="lg:col-span-7 rounded-xl bg-white border border-slate-200 p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                    <div>
                      <div className="text-sm font-bold text-slate-900">
                        Executive AI Briefing · Lead: Alexander Wright
                      </div>
                      <div className="text-xs text-slate-500">
                        Inquired on: Pacific Bluff Glass Estate ($12,500,000)
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono font-bold">
                      HIGH INTENT · 95/100
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    "Buyer has verified liquidity and requested coastal bluff
                    geotechnical disclosures plus private helipad clearance.
                    Strong urgency ahead of Q2 relocation."
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                      <div className="font-semibold text-slate-900">
                        Recommended Action #1 (Immediate)
                      </div>
                      <p className="text-slate-600">
                        Assign Senior Agent Victoria Sterling & dispatch Saturday
                        11:00 AM private viewing invite (.ics).
                      </p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                      <div className="font-semibold text-slate-900">
                        Recommended Action #2 (Follow-Up)
                      </div>
                      <p className="text-slate-600">
                        Send Malibu coastal architectural comps packet via
                        connected Resend / Brevo email.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: 6-Stage Real Estate Conversion Funnel */}
            {activeShowcaseTab === 'funnel' && (
              <div className="p-6 sm:p-10 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-mono uppercase tracking-wider text-slate-500 font-semibold">
                      Full Pipeline Transparency
                    </div>
                    <h3 className="font-serif text-2xl sm:text-3xl font-semibold text-slate-900">
                      6-Stage Real Estate Conversion Funnel
                    </h3>
                  </div>
                  <span className="px-3.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-mono font-semibold text-slate-800 shadow-2xs">
                    Active Pipeline Volume: $48.6M
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
                  {[
                    {
                      stage: '01 · Inbound',
                      count: '54 Leads',
                      sub: 'Web, WhatsApp, IG',
                      accent: 'border-slate-200 bg-white',
                    },
                    {
                      stage: '02 · AI Qualified',
                      count: '41 Leads',
                      sub: '76% Qualification',
                      accent: 'border-slate-200 bg-white',
                    },
                    {
                      stage: '03 · Follow-Up Sent',
                      count: '35 Leads',
                      sub: 'Resend / Brevo / WA',
                      accent: 'border-slate-200 bg-white',
                    },
                    {
                      stage: '04 · Tour Booked',
                      count: '22 Showings',
                      sub: '.ics Sent to Agent',
                      accent: 'border-slate-300 bg-white',
                    },
                    {
                      stage: '05 · Offer In',
                      count: '9 Offers',
                      sub: 'Under Negotiation',
                      accent: 'border-slate-300 bg-white',
                    },
                    {
                      stage: '06 · Closed Deal',
                      count: '6 Properties',
                      sub: '$21.4M Closed',
                      accent: 'border-emerald-300 bg-emerald-50/50',
                    },
                  ].map((item) => (
                    <div
                      key={item.stage}
                      className={`p-4 rounded-xl border shadow-2xs ${item.accent}`}
                    >
                      <div className="text-[11px] font-mono uppercase text-slate-500">
                        {item.stage}
                      </div>
                      <div className="text-xl font-bold text-slate-900 mt-2">
                        {item.count}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
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

      {/* Architectural Portfolio & Omnichannel Bento Grid */}
      <section
        id="portfolio-bento"
        className="py-20 lg:py-28 border-b border-slate-200/80"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-12">
            <div className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 mb-2">
              Curated for High-Performing Brokerages
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-slate-900 tracking-tight">
              Every Listing Synchronized With Your AI Workforce
            </h2>
            <p className="text-sm sm:text-base text-slate-600 mt-2">
              Your AI employees know every bedroom count, architectural highlight,
              price point, and assigned closing agent across your entire luxury
              inventory.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                img: mercerPenthouseImg,
                title: 'The Mercer Cast-Iron Penthouse',
                loc: 'SoHo · New York',
                price: '$8,900,000',
                agent: 'Victoria Sterling',
                stats: '14 Inbound Buyers Qualified by Elena',
              },
              {
                img: pacificBluffImg,
                title: 'Pacific Bluff Glass Pavilion',
                loc: 'Malibu · California',
                price: '$12,500,000',
                agent: 'Devon Brooks',
                stats: '9 Private Viewings Dispatched via .ics',
              },
              {
                img: beaconTownhouseImg,
                title: 'Beacon Hill Historic Townhouse',
                loc: 'Boston · Massachusetts',
                price: '$5,450,000',
                agent: 'Marcus Vance',
                stats: '94/100 Avg Buyer Sentiment Score',
              },
            ].map((prop) => (
              <div
                key={prop.title}
                className="group rounded-2xl bg-white border border-slate-200/90 overflow-hidden shadow-xs hover:shadow-md transition"
              >
                <div className="relative h-56 overflow-hidden">
                  <img
                    src={prop.img}
                    alt={prop.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-white/95 text-slate-900 text-[11px] font-mono font-semibold shadow-2xs">
                    {prop.price}
                  </div>
                </div>
                <div className="p-5 space-y-2">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500">
                    {prop.loc}
                  </div>
                  <h3 className="font-serif text-xl font-semibold text-slate-900">
                    {prop.title}
                  </h3>
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                    <span>Assigned: {prop.agent}</span>
                    <span className="text-emerald-700 font-medium">
                      {prop.stats}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Owner-Driven Onboarding & License Key Delivery Flow */}
      <section
        id="owner-workflow"
        className="py-20 lg:py-24 border-b border-slate-200/80 bg-white"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-12">
            <div className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 mb-2">
              White-Glove Deployment & License Lock
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-slate-900 tracking-tight">
              How We Onboard Your Brokerage & Issue Your License Key
            </h2>
            <p className="text-sm sm:text-base text-slate-600 mt-2">
              To ensure verified email deliverability (Resend / Brevo) and
              custom WhatsApp/website webhook mapping, every workspace is
              provisioned on a guided call and locked via cryptographic License
              Key.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-[#FAF9F6] border border-slate-200/90 space-y-3">
              <div className="w-9 h-9 rounded-lg bg-slate-900 text-white font-mono text-xs font-bold flex items-center justify-center">
                01
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Submit Enquiry & Hop on a 15-Min Call
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Complete the enquiry form below. We connect with you via call or
                WhatsApp to review your lead sources, property inventory, and
                human agent roster.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#FAF9F6] border border-slate-200/90 space-y-3">
              <div className="w-9 h-9 rounded-lg bg-slate-900 text-white font-mono text-xs font-bold flex items-center justify-center">
                02
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Channel Setup & Payment Verification
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Once your package is confirmed, we configure your Resend/Brevo
                transactional domain, website lead webhook, and Master Schedule
                dispatch rules.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#FAF9F6] border border-slate-900/20 space-y-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-700 text-white font-mono text-xs font-bold flex items-center justify-center">
                03
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Instant Unlock via Client License Key
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                You receive your dedicated{' '}
                <code className="font-mono text-xs bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-900">
                  ESTATE-PRO-XXXX
                </code>{' '}
                key. Click <strong>Client Sign In</strong> at the top of this
                page to enter your live brokerage command center.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* B2B Send Enquiry & Strategy Call Section */}
      <section id="send-enquiry" className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-white border border-slate-200/90 p-8 sm:p-12 shadow-lg">
            <div className="max-w-2xl mb-8">
              <div className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-700 mb-2">
                Deploy In Your Real Estate Agency
              </div>
              <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-slate-900 tracking-tight">
                Send Enquiry & Schedule Your Onboarding Call
              </h2>
              <p className="text-sm text-slate-600 mt-2">
                Submit your agency details below. Your enquiry is logged
                directly in our Admin Command Center and triggers an instant
                WhatsApp & Strategy Call booking link.
              </p>
            </div>

            {enquiryError && (
              <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{enquiryError}</span>
              </div>
            )}

            {!enquirySuccess ? (
              <form onSubmit={handleSubmitEnquiry} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                      Real Estate Brokerage Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={agencyName}
                      onChange={(e) => setAgencyName(e.target.value)}
                      placeholder="e.g., Sotheby's International / Prestige Realty"
                      className="w-full px-4 py-3 rounded-xl bg-[#FAF9F6] border border-slate-300 text-sm text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                      Your Full Name (Owner / Partner) *
                    </label>
                    <input
                      type="text"
                      required
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="e.g., Vikram Singhania"
                      className="w-full px-4 py-3 rounded-xl bg-[#FAF9F6] border border-slate-300 text-sm text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                      Work Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="owner@yourbrokerage.com"
                      className="w-full px-4 py-3 rounded-xl bg-[#FAF9F6] border border-slate-300 text-sm text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                      Phone / WhatsApp Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210 or +1 555 019 2834"
                      className="w-full px-4 py-3 rounded-xl bg-[#FAF9F6] border border-slate-300 text-sm text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                      Number of Field Agents
                    </label>
                    <select
                      value={teamSize}
                      onChange={(e) => setTeamSize(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-[#FAF9F6] border border-slate-300 text-sm text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none transition"
                    >
                      <option value="1-5 Agents">1 – 5 Field Agents</option>
                      <option value="6-15 Agents">6 – 15 Field Agents</option>
                      <option value="16-50 Agents">16 – 50 Field Agents</option>
                      <option value="50+ Enterprise">
                        50+ Agents (Enterprise Brokerage)
                      </option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                      Monthly Inbound Buyer Leads
                    </label>
                    <select
                      value={monthlyLeads}
                      onChange={(e) => setMonthlyLeads(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-[#FAF9F6] border border-slate-300 text-sm text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none transition"
                    >
                      <option value="Under 100 Leads/mo">
                        Under 100 Leads / month
                      </option>
                      <option value="100-500 Leads/mo">
                        100 – 500 Leads / month
                      </option>
                      <option value="500-2,000 Leads/mo">
                        500 – 2,000 Leads / month
                      </option>
                      <option value="2,000+ Leads/mo">
                        2,000+ Leads / month
                      </option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Which Channels & Workflows Do You Want to Automate?
                  </label>
                  <textarea
                    rows={3}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="e.g., Website lead webhook, WhatsApp Business auto-qualification, Resend/Brevo email follow-ups, and direct .ics calendar invites for our 12 field agents..."
                    className="w-full px-4 py-3 rounded-xl bg-[#FAF9F6] border border-slate-300 text-sm text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingEnquiry}
                  className="w-full py-4 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold text-sm tracking-wide transition shadow-md cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>
                    {isSubmittingEnquiry
                      ? 'Submitting Your Brokerage Enquiry...'
                      : 'Submit Enquiry & Book Strategy Call'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <div className="p-6 sm:p-8 rounded-2xl bg-emerald-50/90 border border-emerald-200 space-y-5">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      Enquiry Logged for {agencyName || contactName}!
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-700 mt-1 leading-relaxed">
                      Your details ({email} · {phone}) have been saved to our
                      Admin Enquiries Hub
                      {enquirySuccess.emailAlertStatus
                        ? ` (${enquirySuccess.emailAlertStatus})`
                        : ''}
                      . Pick your preferred Strategy Call Date & Time below so
                      we can walk you through the platform and issue your
                      License Key:
                    </p>
                  </div>
                </div>

                {/* Built-In Strategy Call Date & Time Slot Scheduler */}
                {!bookedCallConfirmed ? (
                  <form
                    onSubmit={handleBookStrategyCallSlot}
                    className="p-4 rounded-xl bg-white border border-emerald-200 space-y-3"
                  >
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Select Your Strategy Call Date & Time Slot</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Preferred Date
                        </label>
                        <input
                          type="date"
                          required
                          min={new Date().toISOString().slice(0, 10)}
                          value={callDateStr}
                          onChange={(e) => setCallDateStr(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Preferred Time Slot
                        </label>
                        <select
                          value={callTimeSlot}
                          onChange={(e) => setCallTimeSlot(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 bg-white"
                        >
                          <option value="10:00 AM">10:00 AM</option>
                          <option value="11:00 AM">11:00 AM</option>
                          <option value="12:30 PM">12:30 PM</option>
                          <option value="02:00 PM">02:00 PM</option>
                          <option value="04:00 PM">04:00 PM</option>
                          <option value="06:00 PM">06:00 PM</option>
                        </select>
                      </div>
                      <div className="flex items-end">
                        <button
                          type="submit"
                          disabled={isBookingCall}
                          className="w-full py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition cursor-pointer"
                        >
                          {isBookingCall
                            ? 'Booking Call...'
                            : 'Confirm Strategy Call Slot'}
                        </button>
                      </div>
                    </div>
                  </form>
                ) : (
                  <div className="p-4 rounded-xl bg-white border border-emerald-300 text-xs text-emerald-950 flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      <strong>Strategy Call Confirmed:</strong>{' '}
                      {bookedCallConfirmed}. We will connect with you at{' '}
                      <strong>{phone}</strong> ({email}).
                    </span>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  {cleanWaDigits ? (
                    <a
                      href={`https://wa.me/${cleanWaDigits}?text=${encodeURIComponent(
                        `Hi! I just submitted an enquiry for ${agencyName || 'our brokerage'} (${contactName}, ${phone}) and would like to schedule our onboarding call & get our License Key.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs transition shadow-xs"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>
                        Chat on WhatsApp Now (+{cleanWaDigits})
                      </span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  ) : (
                    <a
                      href={`mailto:${
                        enquirySuccess.notificationEmail ||
                        'khushi4762@gmail.com'
                      }?subject=${encodeURIComponent(
                        `Onboarding Call & License Key Request — ${agencyName || contactName}`
                      )}&body=${encodeURIComponent(
                        `Hi,\n\nI just submitted an enquiry for ${agencyName} (${contactName}, Phone: ${phone}). Let's connect for our onboarding call.`
                      )}`}
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs transition shadow-xs"
                    >
                      <Mail className="w-4 h-4" />
                      <span>
                        Email Onboarding Desk (
                        {enquirySuccess.notificationEmail ||
                          'khushi4762@gmail.com'}
                        )
                      </span>
                    </a>
                  )}

                  {hasRealCalendlyUrl && (
                    <a
                      href={enquirySuccess.calendlyUrl || calendlyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition shadow-xs"
                    >
                      <Calendar className="w-4 h-4" />
                      <span>Open External Calendar Link</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}

                  <button
                    onClick={() => setShowLicenseModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs transition cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-slate-600" />
                    <span>Already Have a Key? Sign In</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-200/80 bg-white text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center font-serif font-bold text-xs">
              AE
            </div>
            <span className="font-medium text-slate-700">
              © {new Date().getFullYear()} {brandName}. Built for Luxury Real
              Estate Brokerages.
            </span>
          </div>
          <div className="flex items-center gap-5">
            <button
              onClick={() => {
                setLoginError(null);
                setShowLicenseModal(true);
              }}
              className="text-slate-900 font-semibold hover:underline underline-offset-4 cursor-pointer flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Client Portal Sign In</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Secure License Sign-In Modal */}
      {showLicenseModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-amber-300">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold leading-tight">
                    Brokerage Workspace Sign In
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Encrypted License Key Authentication
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowLicenseModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleVerifyLicense} className="p-6 space-y-4">
              {loginError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{loginError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Authorized Email *
                </label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="name@brokerage.com"
                  className="w-full px-4 py-3 rounded-xl bg-[#FAF9F6] border border-slate-300 text-sm text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                    License Key *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowKeyText((prev) => !prev)}
                    className="text-[11px] font-medium text-slate-500 hover:text-slate-900 cursor-pointer"
                  >
                    {showKeyText ? 'Hide Key' : 'Show Key'}
                  </button>
                </div>
                <input
                  type={showKeyText ? 'text' : 'password'}
                  required
                  value={licenseKeyInput}
                  onChange={(e) => setLicenseKeyInput(e.target.value)}
                  placeholder="••••-••••-••••"
                  autoComplete="off"
                  className="w-full px-4 py-3 rounded-xl bg-[#FAF9F6] border border-slate-300 font-mono text-sm text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isVerifyingLicense}
                className="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold text-xs uppercase tracking-wider transition shadow-md cursor-pointer"
              >
                {isVerifyingLicense
                  ? 'Verifying License...'
                  : 'Verify License & Unlock Workspace'}
              </button>

              <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 leading-relaxed flex items-center justify-between">
                <span>Need a Brokerage License Key?</span>
                <a
                  href="#send-enquiry"
                  onClick={() => setShowLicenseModal(false)}
                  className="font-semibold text-slate-900 hover:underline"
                >
                  Book Onboarding Call →
                </a>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
