import React, { useEffect, useState } from 'react';
import {
  KeyRound,
  ShieldCheck,
  Users,
  Download,
  Copy,
  Check,
  Plus,
  Ban,
  RefreshCw,
  Trash2,
  ExternalLink,
  Mail,
  PhoneCall,
  Globe,
  Lock,
  Sparkles,
  CheckCircle2,
  Building2,
  Settings,
} from 'lucide-react';
import { generateHostingerHtmlBundle } from '../utils/hostingerExport';

export interface B2BClientLicenseItem {
  id: string;
  agencyName: string;
  clientName: string;
  clientEmail: string;
  licenseKey: string;
  planTier: 'Starter' | 'Growth' | 'Enterprise';
  billingCycle: 'Monthly' | 'Annual' | 'Lifetime';
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
  expiresAt: string;
  lastLoginAt?: string;
  notes?: string;
}

export interface B2BEnquiryItem {
  id: string;
  agencyName: string;
  contactName: string;
  email: string;
  phone: string;
  teamSize: string;
  monthlyLeads: string;
  message: string;
  source: string;
  status: 'NEW' | 'CALL_SCHEDULED' | 'PAYMENT_PENDING' | 'PAID_UNLOCKED';
  issuedLicenseKey?: string;
  emailAlertStatus?: string;
  createdAt: string;
}

interface AdminLicenseEnquiriesViewProps {
  onOpenLandingPreview: () => void;
  onLockSystemNow: () => void;
}

export const AdminLicenseEnquiriesView: React.FC<
  AdminLicenseEnquiriesViewProps
> = ({ onOpenLandingPreview, onLockSystemNow }) => {
  const [activeSubTab, setActiveSubTab] = useState<
    'enquiries' | 'licenses' | 'hostinger'
  >('enquiries');
  const [loading, setLoading] = useState(true);

  const [masterAdminKey, setMasterAdminKey] = useState('');
  const [showMasterKey, setShowMasterKey] = useState(false);
  const [settings, setSettings] = useState({
    brandName: 'Atelier Estate AI',
    tagline: 'Autonomous 24/7 Real Estate AI Workforce & Omnichannel CRM',
    whatsappNumber: '',
    calendlyUrl: '',
    notificationEmail: 'khushi4762@gmail.com',
    backendUrl: window.location.origin,
    requireLicenseLock: true,
  });

  const [licenses, setLicenses] = useState<B2BClientLicenseItem[]>([]);
  const [enquiries, setEnquiries] = useState<B2BEnquiryItem[]>([]);

  // Generator Form State
  const [agencyName, setAgencyName] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [planTier, setPlanTier] = useState<'Starter' | 'Growth' | 'Enterprise'>(
    'Growth'
  );
  const [billingCycle, setBillingCycle] = useState<
    'Monthly' | 'Annual' | 'Lifetime'
  >('Monthly');
  const [notes, setNotes] = useState('');
  const [linkedEnquiryId, setLinkedEnquiryId] = useState<string | undefined>(
    undefined
  );
  const [sendEmailToClient, setSendEmailToClient] = useState(true);
  const [isCreatingLicense, setIsCreatingLicense] = useState(false);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const fetchPortalData = async () => {
    setLoading(true);
    try {
      const resp = await fetch('/api/admin/portal-data');
      const data = await resp.json();
      if (data.ok) {
        setMasterAdminKey(data.masterAdminKey || '');
        setSettings({
          ...settings,
          ...data.settings,
          backendUrl: data.settings?.backendUrl || window.location.origin,
        });
        setLicenses(data.licenses || []);
        setEnquiries(data.enquiries || []);
      }
    } catch (err) {
      console.error('Failed to load B2B portal data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortalData();
  }, []);

  const handleGenerateLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingLicense(true);
    setBannerMessage(null);
    try {
      const resp = await fetch('/api/admin/licenses/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agencyName,
          clientName,
          clientEmail,
          planTier,
          billingCycle,
          notes,
          enquiryId: linkedEnquiryId,
          sendEmailToClient,
        }),
      });
      const data = await resp.json();
      if (data.ok) {
        setLicenses(data.licenses || []);
        setEnquiries(data.enquiries || []);
        setBannerMessage(
          `✅ Generated License Key ${data.license.licenseKey} for ${data.license.agencyName}! ${
            data.emailDeliveryNote ? `(${data.emailDeliveryNote})` : ''
          }`
        );
        setAgencyName('');
        setClientName('');
        setClientEmail('');
        setNotes('');
        setLinkedEnquiryId(undefined);
      }
    } finally {
      setIsCreatingLicense(false);
    }
  };

  const handleToggleLicense = async (
    licenseId: string,
    action?: 'TOGGLE' | 'DELETE'
  ) => {
    const resp = await fetch('/api/admin/licenses/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licenseId, action }),
    });
    const data = await resp.json();
    if (data.ok) {
      setLicenses(data.licenses || []);
    }
  };

  const handleUpdateEnquiryStatus = async (
    enquiryId: string,
    status: B2BEnquiryItem['status']
  ) => {
    const resp = await fetch('/api/admin/enquiries/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enquiryId, status }),
    });
    const data = await resp.json();
    if (data.ok) {
      setEnquiries(data.enquiries || []);
    }
  };

  const handleConvertEnquiryToLicense = (enq: B2BEnquiryItem) => {
    setAgencyName(enq.agencyName);
    setClientName(enq.contactName);
    setClientEmail(enq.email);
    setNotes(
      `Converted from ${enq.source} enquiry (${enq.teamSize}, ${enq.monthlyLeads}). Payment collected on call.`
    );
    setLinkedEnquiryId(enq.id);
    setActiveSubTab('licenses');
  };

  const handleCopyWelcomeMessage = (lic: B2BClientLicenseItem) => {
    const portalUrl = settings.backendUrl || window.location.origin;
    const text = `🎉 Welcome to ${settings.brandName}, ${lic.clientName} (${lic.agencyName})!\n\nYour 24/7 AI Real Estate Workforce is ready to unlock:\n🔗 Portal URL: ${portalUrl}\n📧 Login Email: ${lic.clientEmail}\n🔑 License Key: ${lic.licenseKey}\n\nClick "Client Portal Login" in the top right corner and paste your License Key to access your AI Bots & CRM.`;
    navigator.clipboard.writeText(text);
    setCopiedId(lic.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleSavePortalSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setBannerMessage(null);
    try {
      const resp = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings, masterAdminKey }),
      });
      const data = await resp.json();
      if (data.ok) {
        setBannerMessage(
          '✅ Saved B2B Portal, Master Admin Key & Hostinger Export settings!'
        );
      }
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleDownloadHostingerBundle = () => {
    const html = generateHostingerHtmlBundle({
      brandName: settings.brandName,
      tagline: settings.tagline,
      backendUrl: settings.backendUrl || window.location.origin,
      whatsappNumber: settings.whatsappNumber,
      calendlyUrl: settings.calendlyUrl,
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

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-[#0D111A] border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-mono uppercase tracking-wider mb-2">
            <KeyRound className="w-3.5 h-3.5" />
            <span>B2B Sales, Client License Lock & Hostinger Website Hub</span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white">
            Manage Website Enquiries, Client License Keys & Hostinger Export
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Speak with incoming real estate leads on call, collect payment, and
            issue their unique <code className="text-amber-300">ESTATE-PRO</code>{' '}
            License Key to unlock the automation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onOpenLandingPreview}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold transition cursor-pointer"
          >
            <Globe className="w-4 h-4" />
            <span>View Public Landing Page</span>
          </button>

          <button
            onClick={handleDownloadHostingerBundle}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold transition cursor-pointer shadow-lg shadow-sky-500/20"
          >
            <Download className="w-4 h-4" />
            <span>Download Hostinger index.html</span>
          </button>

          <button
            onClick={onLockSystemNow}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold transition cursor-pointer"
            title="Test the License Key Lock Gate"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Lock & Test Gate</span>
          </button>
        </div>
      </div>

      {bannerMessage && (
        <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-200 flex items-center justify-between">
          <span>{bannerMessage}</span>
          <button
            onClick={() => setBannerMessage(null)}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Sub-navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-4">
        <button
          onClick={() => setActiveSubTab('enquiries')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
            activeSubTab === 'enquiries'
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
              : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700'
          }`}
        >
          <PhoneCall className="w-3.5 h-3.5" />
          <span>1. B2B Website Enquiries ({enquiries.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('licenses')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
            activeSubTab === 'licenses'
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
              : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700'
          }`}
        >
          <KeyRound className="w-3.5 h-3.5" />
          <span>2. Client License Key Generator ({licenses.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('hostinger')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
            activeSubTab === 'hostinger'
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
              : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>3. Hostinger + VPS Deployment Setup</span>
        </button>
      </div>

      {/* TAB 1: B2B Website Enquiries Inbox */}
      {activeSubTab === 'enquiries' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">
                Incoming Real Estate Agency Enquiries
              </h3>
              <p className="text-xs text-slate-400">
                Leads captured from your Built-In Landing Page and your
                Hostinger website. Call them, collect payment, and click
                "Generate License Key" to unlock their account.
              </p>
            </div>
            <button
              onClick={fetchPortalData}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {enquiries.map((enq) => (
              <div
                key={enq.id}
                className="p-5 rounded-2xl bg-[#0D111A] border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="space-y-2 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-base font-bold text-white">
                      {enq.agencyName}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-xs text-slate-300">
                      Contact: {enq.contactName}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-md text-[11px] font-mono font-semibold ${
                        enq.status === 'PAID_UNLOCKED'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : enq.status === 'CALL_SCHEDULED'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                      }`}
                    >
                      {enq.status.replace('_', ' ')}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      {enq.source}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
                    <span>📧 {enq.email}</span>
                    <span>📞 {enq.phone}</span>
                    <span>👥 {enq.teamSize}</span>
                    <span>📈 {enq.monthlyLeads}</span>
                  </div>

                  <p className="text-xs text-slate-400 bg-slate-950/80 p-3 rounded-xl border border-slate-800/80">
                    "{enq.message}"
                  </p>

                  {enq.issuedLicenseKey && (
                    <div className="text-xs font-mono text-emerald-400">
                      🔑 Issued License Key: <strong>{enq.issuedLicenseKey}</strong>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap lg:flex-col items-stretch gap-2 shrink-0">
                  <select
                    value={enq.status}
                    onChange={(e) =>
                      handleUpdateEnquiryStatus(
                        enq.id,
                        e.target.value as B2BEnquiryItem['status']
                      )
                    }
                    className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200"
                  >
                    <option value="NEW">Status: New Enquiry</option>
                    <option value="CALL_SCHEDULED">
                      Status: On Discovery Call
                    </option>
                    <option value="PAYMENT_PENDING">
                      Status: Payment Link Sent
                    </option>
                    <option value="PAID_UNLOCKED">
                      Status: Paid & License Issued
                    </option>
                  </select>

                  <a
                    href={`https://wa.me/${enq.phone.replace(
                      /[^0-9]/g,
                      ''
                    )}?text=${encodeURIComponent(
                      `Hi ${enq.contactName}, reaching out from ${settings.brandName} regarding your automation enquiry for ${enq.agencyName}!`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-semibold text-center hover:bg-emerald-500/25 transition"
                  >
                    💬 Call / WhatsApp Prospect
                  </a>

                  <button
                    onClick={() => handleConvertEnquiryToLicense(enq)}
                    className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition cursor-pointer"
                  >
                    ⚡ Payment Collected → Issue Key
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: Client License Key Generator */}
      {activeSubTab === 'licenses' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Generate New License Key Form */}
          <div className="lg:col-span-5 p-6 rounded-3xl bg-[#0D111A] border border-slate-800 space-y-5 h-fit">
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-amber-400">
                After Call & Payment
              </div>
              <h3 className="text-xl font-bold text-white mt-0.5">
                Generate Client License Key
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Creates an instant activation key (e.g.{' '}
                <code className="text-amber-300">ESTATE-PRO-XXXX</code>) and
                optionally emails it to your paying client via Resend / Brevo.
              </p>
            </div>

            <form onSubmit={handleGenerateLicense} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Client Brokerage / Agency Name *
                </label>
                <input
                  type="text"
                  required
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                  placeholder="e.g., Apex Estates Dubai"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Client Contact Name
                  </label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="e.g., Karan Oberoi"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Client Login Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="karan@apexestates.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Plan Tier
                  </label>
                  <select
                    value={planTier}
                    onChange={(e) => setPlanTier(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  >
                    <option value="Starter">Starter (2 AI Bots)</option>
                    <option value="Growth">Growth (4 AI Bots + CRM)</option>
                    <option value="Enterprise">
                      Enterprise (Unlimited + Whitelabel)
                    </option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Billing Cycle
                  </label>
                  <select
                    value={billingCycle}
                    onChange={(e) => setBillingCycle(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  >
                    <option value="Monthly">Monthly Subscription</option>
                    <option value="Annual">Annual License</option>
                    <option value="Lifetime">Lifetime Deal</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Payment & Setup Notes
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., Paid $997 via Stripe/UPI on discovery call"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendEmailToClient}
                  onChange={(e) => setSendEmailToClient(e.target.checked)}
                  className="rounded border-slate-700"
                />
                <span>
                  Auto-send License Key email to client via Resend / Brevo
                </span>
              </label>

              <button
                type="submit"
                disabled={isCreatingLicense}
                className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition cursor-pointer shadow-lg shadow-amber-500/20"
              >
                {isCreatingLicense
                  ? 'Generating License Key...'
                  : 'Generate & Activate Client License Key →'}
              </button>
            </form>
          </div>

          {/* Right: Active & Suspended Client Licenses */}
          <div className="lg:col-span-7 space-y-4">
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-xs font-mono text-amber-400">
                  YOUR MASTER ADMIN KEY (NEVER EXPIRES)
                </div>
                <div className="text-sm font-mono font-bold text-white mt-0.5">
                  {masterAdminKey}
                </div>
              </div>
              <span className="px-3 py-1 rounded-md bg-emerald-500/20 text-emerald-300 text-xs font-mono">
                OWNER ACCESS
              </span>
            </div>

            {licenses.map((lic) => (
              <div
                key={lic.id}
                className="p-5 rounded-2xl bg-[#0D111A] border border-slate-800 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-base font-bold text-white flex items-center gap-2">
                      <span>{lic.agencyName}</span>
                      <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-[11px] font-mono text-amber-300">
                        {lic.planTier} · {lic.billingCycle}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {lic.clientName} · {lic.clientEmail}
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-bold ${
                      lic.status === 'ACTIVE'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    }`}
                  >
                    {lic.status === 'ACTIVE' ? '● UNLOCKED' : '🔒 SUSPENDED'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between font-mono text-xs">
                  <span className="text-amber-300 font-bold tracking-wider">
                    {lic.licenseKey}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyWelcomeMessage(lic)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] cursor-pointer"
                    >
                      {copiedId === lic.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-300">
                            Copied Welcome Message!
                          </span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Welcome Credentials</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {lic.notes && (
                  <div className="text-xs text-slate-400">{lic.notes}</div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                  <span className="text-slate-500">
                    Issued: {new Date(lic.createdAt).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleLicense(lic.id, 'TOGGLE')}
                      className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer ${
                        lic.status === 'ACTIVE'
                          ? 'bg-rose-500/15 text-rose-300 hover:bg-rose-500/25'
                          : 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
                      }`}
                    >
                      {lic.status === 'ACTIVE'
                        ? 'Suspend / Lock Client'
                        : 'Reactivate Client Key'}
                    </button>
                    <button
                      onClick={() => handleToggleLicense(lic.id, 'DELETE')}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-300 cursor-pointer"
                      title="Delete License"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Hostinger + VPS/Render Deployment Configuration */}
      {activeSubTab === 'hostinger' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 p-6 rounded-3xl bg-[#0D111A] border border-slate-800 space-y-5">
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-sky-400">
                Hostinger Website + VPS / Render Automation Setup
              </div>
              <h3 className="text-xl font-bold text-white mt-0.5">
                Configure Your Landing Page & Hostinger HTML Export
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Customize your WhatsApp number, Calendly link, and VPS/Render
                URL before downloading your standalone{' '}
                <code className="text-sky-300">index.html</code> file for
                Hostinger.
              </p>
            </div>

            <form onSubmit={handleSavePortalSettings} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Agency / SaaS Brand Name
                  </label>
                  <input
                    type="text"
                    value={settings.brandName}
                    onChange={(e) =>
                      setSettings({ ...settings, brandName: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Master Admin Unlock Key
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowMasterKey((prev) => !prev)}
                      className="text-[10px] font-semibold text-amber-400 hover:underline cursor-pointer"
                    >
                      {showMasterKey ? 'Hide' : 'Reveal'}
                    </button>
                  </div>
                  <input
                    type={showMasterKey ? 'text' : 'password'}
                    value={masterAdminKey}
                    onChange={(e) => setMasterAdminKey(e.target.value)}
                    autoComplete="off"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-amber-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Your Sales WhatsApp Number
                  </label>
                  <input
                    type="text"
                    value={settings.whatsappNumber}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        whatsappNumber: e.target.value,
                      })
                    }
                    placeholder="+919876543210"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Discovery Call Booking Link (Calendly / Meet)
                  </label>
                  <input
                    type="url"
                    value={settings.calendlyUrl}
                    onChange={(e) =>
                      setSettings({ ...settings, calendlyUrl: e.target.value })
                    }
                    placeholder="https://calendly.com/your-link"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Your Alert Email (Receives Enquiries via Resend/Brevo)
                  </label>
                  <input
                    type="email"
                    value={settings.notificationEmail}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        notificationEmail: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Your VPS or Render Automation URL
                  </label>
                  <input
                    type="url"
                    value={settings.backendUrl}
                    onChange={(e) =>
                      setSettings({ ...settings, backendUrl: e.target.value })
                    }
                    placeholder="https://your-automation.onrender.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className="px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
                >
                  {isSavingSettings
                    ? 'Saving...'
                    : 'Save Portal & Export Settings'}
                </button>

                <button
                  type="button"
                  onClick={handleDownloadHostingerBundle}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Hostinger index.html</span>
                </button>
              </div>
            </form>
          </div>

          <div className="lg:col-span-5 p-6 rounded-3xl bg-[#0D111A] border border-slate-800 space-y-4 h-fit">
            <h4 className="text-base font-bold text-white">
              How to Host Website on Hostinger + Automation on VPS/Render
            </h4>
            <ol className="space-y-3 text-xs text-slate-300 list-decimal list-inside leading-relaxed">
              <li>
                <strong>Host Automation on Render or VPS:</strong> Deploy this
                Node.js repository to Render or your Ubuntu VPS and copy its live
                URL (e.g.,{' '}
                <code className="text-amber-300">
                  https://your-app.onrender.com
                </code>
                ) into the <strong>VPS or Render Automation URL</strong> box on
                the left.
              </li>
              <li>
                <strong>Download Hostinger HTML:</strong> Click{' '}
                <strong className="text-sky-300">
                  Download Hostinger index.html
                </strong>
                .
              </li>
              <li>
                <strong>Upload to Hostinger in 10 Seconds:</strong> Open your
                Hostinger control panel → <strong>File Manager</strong> →{' '}
                <code className="text-amber-300">public_html</code> and upload
                the downloaded <code className="text-sky-300">index.html</code>{' '}
                file.
              </li>
              <li>
                <strong>End-to-End Connected:</strong> Whenever a prospect
                submits the enquiry form on your Hostinger website, it sends the
                lead directly to your VPS/Render server, emails you via
                Resend/Brevo, and shows them your WhatsApp & Call link. When
                they pay you on the call, generate their License Key here and
                they can click <strong>Client Portal Login</strong> on your
                Hostinger site to unlock the automation!
              </li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
};
