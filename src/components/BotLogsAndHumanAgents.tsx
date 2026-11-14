import React, { useState, useEffect } from 'react';
import {
  Terminal,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  Globe,
  Mail,
  Calendar,
  Phone,
  MessageSquare,
  Sparkles,
  UserCheck,
  UserPlus,
  Edit3,
  Send,
  PanelRightClose,
  PanelRightOpen,
  BellRing,
  Check,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import {
  BotLogEntry,
  HumanAgent,
  AIEmployee,
  ClientLead,
  PropertyListing,
  LeadAiAnalysis,
  MeetingValidationResult,
} from '../types/brokerage';

// ============================================================================
// 1. TOP-BAR DROPDOWN BOT LOGS VIEW
// ============================================================================
interface BotLogsDropdownProps {
  logs: BotLogEntry[];
  employees: AIEmployee[];
  sidePanelOpen: boolean;
  onToggleSidePanel: () => void;
  onClearLogs: () => void;
  onCloseDropdown: () => void;
}

export const BotLogsDropdownPopover: React.FC<BotLogsDropdownProps> = ({
  logs,
  employees,
  sidePanelOpen,
  onToggleSidePanel,
  onClearLogs,
  onCloseDropdown,
}) => {
  const [botFilter, setBotFilter] = useState<string>('ALL');

  const filteredLogs = logs.filter(
    (l) => botFilter === 'ALL' || l.employeeId === botFilter
  );

  return (
    <div className="absolute right-0 top-full mt-2 w-96 sm:w-[430px] bg-slate-950 text-slate-100 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-900">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-white">
            Live Bot Activity Logs ({filteredLogs.length})
          </span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              onToggleSidePanel();
              onCloseDropdown();
            }}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-amber-300 border border-slate-700 transition-colors"
            title="Toggle Side Logs Screen"
          >
            {sidePanelOpen ? (
              <>
                <PanelRightClose className="w-3 h-3" /> Hide Side Screen
              </>
            ) : (
              <>
                <PanelRightOpen className="w-3 h-3" /> Dock to Side Screen
              </>
            )}
          </button>
          <button
            onClick={onClearLogs}
            className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800"
            title="Clear Logs"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onCloseDropdown}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Filter by Bot */}
      <div className="px-3 py-2 bg-slate-900/60 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto">
        <button
          onClick={() => setBotFilter('ALL')}
          className={`px-2 py-1 rounded-md text-[10px] font-semibold shrink-0 transition-colors ${
            botFilter === 'ALL'
              ? 'bg-amber-500 text-slate-950'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          All Bots ({logs.length})
        </button>
        {employees.map((emp) => (
          <button
            key={emp.id}
            onClick={() => setBotFilter(emp.id)}
            className={`px-2 py-1 rounded-md text-[10px] font-semibold shrink-0 transition-colors ${
              botFilter === emp.id
                ? 'bg-amber-500 text-slate-950'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {emp.name.split(' ')[0]}
          </button>
        ))}
      </div>

      {/* Scrollable Log Items */}
      <div className="max-h-96 overflow-y-auto divide-y divide-slate-800/80 p-2 space-y-1.5">
        {filteredLogs.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-500">
            No bot logs recorded yet. Send a chat instruction, test a website lead, or contact a human agent to watch live bot logs.
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/90 text-xs space-y-1"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      log.status === 'SUCCESS'
                        ? 'bg-emerald-400'
                        : log.status === 'ERROR'
                        ? 'bg-rose-400'
                        : log.status === 'RUNNING'
                        ? 'bg-amber-400 animate-ping'
                        : 'bg-blue-400'
                    }`}
                  />
                  <span className="font-bold text-amber-300 truncate">
                    {log.employeeName}
                  </span>
                  {log.channelOrTool && (
                    <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] font-mono text-slate-300 border border-slate-700 shrink-0">
                      {log.channelOrTool}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-mono text-slate-400 shrink-0">
                  {log.timestamp}
                </span>
              </div>
              <div className="font-semibold text-white">{log.title}</div>
              <div className="text-[11px] text-slate-300 leading-relaxed whitespace-pre-line">
                {log.detail}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// ============================================================================
// 2. RIGHT-SIDE SMALL SCREEN BOT ACTIVITY MONITOR PANEL
// ============================================================================
interface BotLogsSidePanelProps {
  logs: BotLogEntry[];
  employees: AIEmployee[];
  onClearLogs: () => void;
  onCloseSidePanel: () => void;
  onOpenWebsiteWebhookModal: () => void;
}

export const BotLogsSidePanel: React.FC<BotLogsSidePanelProps> = ({
  logs,
  employees,
  onClearLogs,
  onCloseSidePanel,
  onOpenWebsiteWebhookModal,
}) => {
  const [selectedBot, setSelectedBot] = useState<string>('ALL');

  const visibleLogs = logs.filter(
    (l) => selectedBot === 'ALL' || l.employeeId === selectedBot
  );

  const getCategoryIcon = (cat: BotLogEntry['category']) => {
    switch (cat) {
      case 'WEBSITE_LEAD':
        return <Globe className="w-3.5 h-3.5 text-amber-400" />;
      case 'EMAIL_SENT':
        return <Mail className="w-3.5 h-3.5 text-emerald-400" />;
      case 'CALENDAR_SYNC':
        return <Calendar className="w-3.5 h-3.5 text-blue-400" />;
      case 'HUMAN_AGENT_HANDOFF':
        return <UserCheck className="w-3.5 h-3.5 text-purple-400" />;
      case 'VOICE_CALL':
        return <Phone className="w-3.5 h-3.5 text-emerald-400" />;
      case 'CHANNEL_DISPATCH':
        return <MessageSquare className="w-3.5 h-3.5 text-teal-400" />;
      case 'REMINDER_ALERT':
        return <BellRing className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-amber-400" />;
    }
  };

  return (
    <aside className="w-80 bg-slate-950 text-slate-100 border-l border-slate-800 flex flex-col shrink-0 select-none">
      {/* Side Panel Header */}
      <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
            <Terminal className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>Live Bot Logs</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              Real-time AI Employee actions & webhooks
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onClearLogs}
            title="Clear Bot Logs"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onCloseSidePanel}
            title="Collapse Side Logs Screen"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <PanelRightClose className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Dropdown inside Side Screen */}
      <div className="p-2.5 border-b border-slate-800 bg-slate-900/40 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Filter Bot View:
          </span>
          <select
            value={selectedBot}
            onChange={(e) => setSelectedBot(e.target.value)}
            className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-[11px] font-semibold text-white focus:outline-none focus:border-amber-400"
          >
            <option value="ALL">All AI Employees ({logs.length})</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name} ({emp.title})
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={onOpenWebsiteWebhookModal}
          className="w-full px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[11px] font-semibold flex items-center justify-between transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5" />
            <span>Agency Website Lead Webhook</span>
          </span>
          <span className="text-[10px] underline">Configure / Test</span>
        </button>
      </div>

      {/* Live Stream Feed */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 font-sans">
        {visibleLogs.length === 0 ? (
          <div className="py-12 px-4 text-center space-y-2">
            <Terminal className="w-6 h-6 text-slate-600 mx-auto" />
            <p className="text-xs font-semibold text-slate-400">
              Waiting for Bot Activity...
            </p>
            <p className="text-[11px] text-slate-500">
              Every AI Employee task, email sent, website lead captured, and human agent calendar sync appears here live.
            </p>
          </div>
        ) : (
          visibleLogs.map((log) => (
            <div
              key={log.id}
              className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all space-y-1.5"
            >
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  {getCategoryIcon(log.category)}
                  <span className="text-xs font-bold text-white truncate">
                    {log.employeeName}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 shrink-0">
                  {log.timestamp}
                </span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider ${
                    log.status === 'SUCCESS'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : log.status === 'ERROR'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : log.status === 'RUNNING'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-blue-500/20 text-blue-300'
                  }`}
                >
                  {log.status}
                </span>
                {log.channelOrTool && (
                  <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 text-[10px] font-mono">
                    {log.channelOrTool}
                  </span>
                )}
              </div>

              <div className="text-xs font-semibold text-amber-300">
                {log.title}
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed whitespace-pre-line break-words">
                {log.detail}
              </p>
            </div>
          ))
        )}
      </div>
    </aside>
  );
};

// ============================================================================
// 3. HUMAN REAL ESTATE AGENTS DIRECTORY, HANDOFF & DIRECT CALENDAR SYNC VIEW
// ============================================================================
interface HumanAgentsDirectoryViewProps {
  humanAgents: HumanAgent[];
  leads: ClientLead[];
  properties: PropertyListing[];
  googleAccountEmail: string | null;
  onAddOrEditAgent: (agent: HumanAgent, isEdit: boolean) => void;
  onDeleteAgent: (id: string) => void;
  onConnectAgentCalendarOAuth: (agent: HumanAgent) => Promise<void>;
  onContactHumanAgentWithBot: (params: {
    agent: HumanAgent;
    lead?: ClientLead;
    channel: 'Email' | 'SMS' | 'WhatsApp';
    subject: string;
    message: string;
  }) => Promise<void>;
  onValidateMeeting: (params: {
    agentId: string;
    attendeeEmail: string;
    startIso: string;
    durationMinutes: number;
  }) => Promise<MeetingValidationResult>;
  onScheduleMeetingOnAgentCalendar: (params: {
    agent: HumanAgent;
    leadEmail: string;
    leadName: string;
    propertyTitle: string;
    meetingTitle: string;
    startIso: string;
    durationMinutes: number;
    notes: string;
  }) => Promise<void>;
}

function formatDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso.slice(0, 16);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const HumanAgentsDirectoryView: React.FC<
  HumanAgentsDirectoryViewProps
> = ({
  humanAgents,
  leads,
  properties,
  googleAccountEmail,
  onAddOrEditAgent,
  onDeleteAgent,
  onConnectAgentCalendarOAuth,
  onContactHumanAgentWithBot,
  onValidateMeeting,
  onScheduleMeetingOnAgentCalendar,
}) => {
  const [agentModalOpen, setAgentModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<HumanAgent | null>(null);
  const [agentForm, setAgentForm] = useState({
    name: '',
    role: 'Senior Listing & Buyer Partner',
    email: '',
    phone: '',
    whatsapp: '',
    specialty: '',
    calendarId: '',
    availability: 'Mon–Sat · 9:00 AM – 7:00 PM',
    activeListingsCount: 3,
  });

  // Contact Human Agent Modal
  const [contactModalAgent, setContactModalAgent] =
    useState<HumanAgent | null>(null);
  const [contactLeadId, setContactLeadId] = useState<string>(
    leads[0]?.id || ''
  );
  const [contactChannel, setContactChannel] = useState<
    'Email' | 'SMS' | 'WhatsApp'
  >('Email');
  const [contactSubject, setContactSubject] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [isDispatchingContact, setIsDispatchingContact] = useState(false);

  // Schedule Meeting on Human Agent's Calendar Modal
  const [scheduleModalAgent, setScheduleModalAgent] =
    useState<HumanAgent | null>(null);
  const [scheduleLeadId, setScheduleLeadId] = useState<string>(
    leads[0]?.id || ''
  );
  const [scheduleProperty, setScheduleProperty] = useState<string>(
    properties[0]?.title || 'Villa Solaris Promontory'
  );
  const [scheduleTitle, setScheduleTitle] = useState('');
  const [scheduleStartIso, setScheduleStartIso] = useState(() => {
    const tom = new Date(Date.now() + 86400000);
    tom.setHours(11, 0, 0, 0);
    return formatDatetimeLocal(tom.toISOString());
  });
  const [scheduleDuration, setScheduleDuration] = useState(45);
  const [scheduleNotes, setScheduleNotes] = useState('');
  const [isBookingCalendar, setIsBookingCalendar] = useState(false);
  const [isValidatingSchedule, setIsValidatingSchedule] = useState(false);
  const [scheduleValidation, setScheduleValidation] =
    useState<MeetingValidationResult | null>(null);
  const [connectingCalAgentId, setConnectingCalAgentId] = useState<
    string | null
  >(null);
  const [statusBanner, setStatusBanner] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    if (!scheduleModalAgent) {
      setScheduleValidation(null);
      return;
    }
    let cancelled = false;
    setIsValidatingSchedule(true);
    const chosenLead = leads.find((l) => l.id === scheduleLeadId) || leads[0];
    const parsedStart = new Date(scheduleStartIso);
    const isoToCheck = !isNaN(parsedStart.getTime())
      ? parsedStart.toISOString()
      : new Date(Date.now() + 86400000).toISOString();

    onValidateMeeting({
      agentId: scheduleModalAgent.id,
      attendeeEmail: chosenLead?.email || '',
      startIso: isoToCheck,
      durationMinutes: Number(scheduleDuration) || 45,
    })
      .then((res) => {
        if (!cancelled) {
          setScheduleValidation(res);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsValidatingSchedule(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    scheduleModalAgent,
    scheduleLeadId,
    scheduleStartIso,
    scheduleDuration,
    leads,
  ]);

  const openCreateAgent = () => {
    setEditingAgent(null);
    setAgentForm({
      name: '',
      role: 'Senior Real Estate Agent',
      email: '',
      phone: '+1 (310) 555-0190',
      whatsapp: '+13105550190',
      specialty: 'Beverly Hills & Luxury Estates',
      calendarId: '',
      availability: 'Mon–Sat · 9:00 AM – 7:00 PM',
      activeListingsCount: 4,
    });
    setAgentModalOpen(true);
  };

  const openEditAgent = (ag: HumanAgent) => {
    setEditingAgent(ag);
    setAgentForm({
      name: ag.name,
      role: ag.role,
      email: ag.email,
      phone: ag.phone,
      whatsapp: ag.whatsapp,
      specialty: ag.specialty,
      calendarId: ag.calendarId || ag.email,
      availability: ag.availability,
      activeListingsCount: ag.activeListingsCount,
    });
    setAgentModalOpen(true);
  };

  const handleSaveAgentForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentForm.name.trim() || !agentForm.email.trim()) return;
    const initials = agentForm.name
      .trim()
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    const record: HumanAgent = {
      id: editingAgent ? editingAgent.id : `agent-${Date.now()}`,
      name: agentForm.name.trim(),
      role: agentForm.role.trim() || 'Real Estate Agent',
      email: agentForm.email.trim(),
      phone: agentForm.phone.trim() || '+1 (310) 555-0100',
      whatsapp:
        agentForm.whatsapp.trim() ||
        agentForm.phone.replace(/[^0-9+]/g, '') ||
        '+13105550100',
      specialty: agentForm.specialty.trim() || 'Luxury Portfolio Specialist',
      avatarInitials: initials || 'HA',
      calendarId: agentForm.calendarId.trim() || agentForm.email.trim(),
      calendarConnected: editingAgent ? editingAgent.calendarConnected : true,
      calendarSyncMode: 'calendar_invite',
      availability: agentForm.availability.trim() || 'Daily · 9 AM – 7 PM',
      activeListingsCount: Number(agentForm.activeListingsCount) || 3,
      lastContactedByAi: editingAgent?.lastContactedByAi || 'Ready for handoff',
    };

    onAddOrEditAgent(record, Boolean(editingAgent));
    setAgentModalOpen(false);
    setStatusBanner({
      type: 'success',
      text: `Saved human agent "${record.name}" (${record.email}) with direct calendar & AI handoff routing.`,
    });
  };

  const openContactModal = (ag: HumanAgent) => {
    const defaultLead = leads[0];
    setContactModalAgent(ag);
    setContactLeadId(defaultLead?.id || '');
    setContactChannel('Email');
    setContactSubject(
      defaultLead
        ? `AI Lead Handoff: ${defaultLead.name} (${defaultLead.budget}) — ${defaultLead.propertyInterest}`
        : `Brokerage Briefing for ${ag.name}`
    );
    setContactMessage(
      defaultLead
        ? `Hi ${ag.name},\n\nOur AI Lead Manager qualified ${defaultLead.name} (${defaultLead.email}, ${defaultLead.phone}) with a budget of ${defaultLead.budget} (${defaultLead.timeline}) for ${defaultLead.propertyInterest}.\n\nNotes: ${defaultLead.notes}\n\nPlease confirm when you are available to speak with the client or host their private showing.`
        : `Hi ${ag.name}, please review the latest buyer inquiry in Atelier Estate.`
    );
  };

  const openScheduleModal = (ag: HumanAgent) => {
    const defaultLead = leads[0];
    setScheduleModalAgent(ag);
    setScheduleLeadId(defaultLead?.id || '');
    setScheduleProperty(
      defaultLead?.propertyInterest ||
        properties[0]?.title ||
        'Villa Solaris Promontory'
    );
    setScheduleTitle(
      defaultLead
        ? `Private Showing: ${defaultLead.propertyInterest} (${ag.name} & ${defaultLead.name})`
        : `Property Showing with ${ag.name}`
    );
    setScheduleNotes(
      defaultLead
        ? `Human Agent: ${ag.name} (${ag.email}, ${ag.phone})\nBuyer Lead: ${defaultLead.name} (${defaultLead.email}, ${defaultLead.phone})\nBudget: ${defaultLead.budget}`
        : `Scheduled by Maya Lin (AI Showing Scheduler) onto ${ag.name}'s Google Calendar.`
    );
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 bg-white shrink-0">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Human Real Estate Agents & Calendar Sync ({humanAgents.length}{' '}
            Agents)
          </h2>
          <p className="text-xs text-slate-500">
            Add real human agents of your real estate agency so AI Employees can contact them (Email/SMS/WhatsApp) and book meetings directly onto their Google Calendar.
          </p>
        </div>

        <button
          onClick={openCreateAgent}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Add Human Real Estate Agent
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <div className="max-w-6xl mx-auto space-y-4">
          {statusBanner && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
                statusBanner.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              <div className="flex items-center gap-2">
                {statusBanner.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{statusBanner.text}</span>
              </div>
              <button
                onClick={() => setStatusBanner(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Grid of Human Agents */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {humanAgents.map((agent) => {
              const isSynced =
                agent.calendarConnected || Boolean(googleAccountEmail);
              return (
                <div
                  key={agent.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center font-bold text-sm shrink-0">
                          {agent.avatarInitials}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">
                            {agent.name}
                          </h3>
                          <p className="text-xs text-slate-500">{agent.role}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditAgent(agent)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100"
                          title="Edit Human Agent"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteAgent(agent.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          title="Delete Human Agent"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Contact Info */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5 text-xs">
                      <div className="flex items-center gap-2 text-slate-700 truncate">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-medium truncate">
                          {agent.email}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-700">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{agent.phone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{agent.availability}</span>
                      </div>
                    </div>

                    <div className="text-xs text-slate-600">
                      <span className="font-semibold text-slate-800">
                        Specialty:
                      </span>{' '}
                      {agent.specialty}
                    </div>

                    {/* Google Calendar Sync Status Box */}
                    <div
                      className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                        isSynced
                          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                          : 'bg-amber-50/60 border-amber-200 text-amber-900'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="font-bold flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            {isSynced
                              ? 'Agent Calendar Connected'
                              : 'Calendar Not Connected'}
                          </span>
                        </div>
                        <div className="text-[11px] truncate opacity-80">
                          Cal ID: {agent.calendarId || agent.email}
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={connectingCalAgentId === agent.id}
                        onClick={async () => {
                          setConnectingCalAgentId(agent.id);
                          setStatusBanner(null);
                          try {
                            await onConnectAgentCalendarOAuth(agent);
                            setStatusBanner({
                              type: 'success',
                              text: `✅ Connected Google Calendar for ${agent.name} (${agent.calendarId}). Scheduled meetings will directly update their calendar!`,
                            });
                          } catch (err: any) {
                            setStatusBanner({
                              type: 'error',
                              text:
                                err?.message ||
                                'Could not connect Google Calendar.',
                            });
                          } finally {
                            setConnectingCalAgentId(null);
                          }
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold shrink-0 transition-colors"
                      >
                        {connectingCalAgentId === agent.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : isSynced ? (
                          'Re-Sync Cal'
                        ) : (
                          'Connect Calendar'
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Action Buttons: Contact Human Agent via AI Bot & Schedule Meeting */}
                  <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => openContactModal(agent)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 text-xs font-semibold transition-colors"
                    >
                      <Send className="w-3.5 h-3.5 text-slate-700" />
                      Bot → Contact Agent
                    </button>
                    <button
                      onClick={() => openScheduleModal(agent)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors"
                    >
                      <Calendar className="w-3.5 h-3.5 text-amber-400" />
                      Book on Calendar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ====================================================================
          MODAL A: ADD / EDIT HUMAN REAL ESTATE AGENT
          ==================================================================== */}
      {agentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-amber-400" />
                {editingAgent
                  ? 'Edit Human Real Estate Agent'
                  : 'Add Human Real Estate Agent'}
              </h3>
              <button
                onClick={() => setAgentModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handleSaveAgentForm}
              className="p-5 space-y-3 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Agent Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={agentForm.name}
                    onChange={(e) =>
                      setAgentForm({ ...agentForm, name: e.target.value })
                    }
                    placeholder="e.g. Victoria Sterling"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Role / Title
                  </label>
                  <input
                    type="text"
                    value={agentForm.role}
                    onChange={(e) =>
                      setAgentForm({ ...agentForm, role: e.target.value })
                    }
                    placeholder="Managing Broker"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Email Address (For Handoffs & Calendar)
                  </label>
                  <input
                    type="email"
                    required
                    value={agentForm.email}
                    onChange={(e) =>
                      setAgentForm({
                        ...agentForm,
                        email: e.target.value,
                        calendarId: agentForm.calendarId || e.target.value,
                      })
                    }
                    placeholder="agent@agency.com"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Phone / SMS Number
                  </label>
                  <input
                    type="text"
                    value={agentForm.phone}
                    onChange={(e) =>
                      setAgentForm({ ...agentForm, phone: e.target.value })
                    }
                    placeholder="+1 (310) 555-0199"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    WhatsApp Number
                  </label>
                  <input
                    type="text"
                    value={agentForm.whatsapp}
                    onChange={(e) =>
                      setAgentForm({ ...agentForm, whatsapp: e.target.value })
                    }
                    placeholder="+13105550199"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Google Calendar ID / Email
                  </label>
                  <input
                    type="text"
                    value={agentForm.calendarId}
                    onChange={(e) =>
                      setAgentForm({ ...agentForm, calendarId: e.target.value })
                    }
                    placeholder="agent@gmail.com"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Specialty Neighborhoods / Markets
                </label>
                <input
                  type="text"
                  value={agentForm.specialty}
                  onChange={(e) =>
                    setAgentForm({ ...agentForm, specialty: e.target.value })
                  }
                  placeholder="Beverly Hills, Malibu & Trousdale Estates"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Showing Availability Window
                </label>
                <input
                  type="text"
                  value={agentForm.availability}
                  onChange={(e) =>
                    setAgentForm({ ...agentForm, availability: e.target.value })
                  }
                  placeholder="Mon–Sat · 9:00 AM – 7:00 PM"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAgentModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-slate-900 text-white font-semibold"
                >
                  Save Human Agent
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL B: AI BOT -> CONTACT HUMAN AGENT (EMAIL / SMS / WHATSAPP)
          ==================================================================== */}
      {contactModalAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Send className="w-4 h-4 text-amber-400" />
                AI Bot Handoff → Contact {contactModalAgent.name}
              </h3>
              <button
                onClick={() => setContactModalAgent(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setIsDispatchingContact(true);
                setStatusBanner(null);
                try {
                  const chosenLead = leads.find((l) => l.id === contactLeadId);
                  await onContactHumanAgentWithBot({
                    agent: contactModalAgent,
                    lead: chosenLead,
                    channel: contactChannel,
                    subject: contactSubject,
                    message: contactMessage,
                  });
                  setStatusBanner({
                    type: 'success',
                    text: `✅ Dispatched ${contactChannel} handoff briefing to human agent ${contactModalAgent.name} (${
                      contactChannel === 'Email'
                        ? contactModalAgent.email
                        : contactModalAgent.phone
                    }).`,
                  });
                  setContactModalAgent(null);
                } catch (err: any) {
                  setStatusBanner({
                    type: 'error',
                    text:
                      err?.message ||
                      'Failed to contact human agent. Check your Gmail/Telnyx/WhatsApp connection.',
                  });
                  setContactModalAgent(null);
                } finally {
                  setIsDispatchingContact(false);
                }
              }}
              className="p-5 space-y-3 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Select Client Lead to Brief {contactModalAgent.name} On
                </label>
                <select
                  value={contactLeadId}
                  onChange={(e) => {
                    setContactLeadId(e.target.value);
                    const found = leads.find((l) => l.id === e.target.value);
                    if (found) {
                      setContactSubject(
                        `AI Lead Handoff: ${found.name} (${found.budget}) — ${found.propertyInterest}`
                      );
                      setContactMessage(
                        `Hi ${contactModalAgent.name},\n\nOur AI Lead Manager qualified ${found.name} (${found.email}, ${found.phone}) with a budget of ${found.budget} (${found.timeline}) for ${found.propertyInterest}.\n\nNotes: ${found.notes}\n\nPlease confirm when you can speak with the buyer or host their showing.`
                      );
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} — {l.propertyInterest} ({l.budget})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Contact Channel
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Email', 'SMS', 'WhatsApp'] as const).map((ch) => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => setContactChannel(ch)}
                      className={`py-2 px-3 rounded-lg border font-semibold text-center transition-all ${
                        contactChannel === ch
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {ch}
                    </button>
                  ))}
                </div>
              </div>

              {contactChannel === 'Email' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Email Subject (To: {contactModalAgent.email})
                  </label>
                  <input
                    type="text"
                    value={contactSubject}
                    onChange={(e) => setContactSubject(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Briefing Message to Human Agent
                </label>
                <textarea
                  rows={4}
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setContactModalAgent(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDispatchingContact}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 text-white font-semibold"
                >
                  {isDispatchingContact ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5 text-amber-400" />
                  )}
                  Send to {contactModalAgent.name}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL C: SCHEDULE MEETING ON HUMAN AGENT'S GOOGLE CALENDAR (WITH CONFLICT VALIDATION)
          ==================================================================== */}
      {scheduleModalAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-lg overflow-hidden max-h-[92vh] flex flex-col">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white shrink-0">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-400" />
                Validate & Book Meeting on {scheduleModalAgent.name}’s Calendar
              </h3>
              <button
                onClick={() => setScheduleModalAgent(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (scheduleValidation && !scheduleValidation.valid) {
                  return;
                }
                setIsBookingCalendar(true);
                setStatusBanner(null);
                try {
                  const chosenLead =
                    leads.find((l) => l.id === scheduleLeadId) || leads[0];
                  await onScheduleMeetingOnAgentCalendar({
                    agent: scheduleModalAgent,
                    leadEmail: chosenLead?.email || 'client@email.com',
                    leadName: chosenLead?.name || 'VIP Buyer',
                    propertyTitle: scheduleProperty,
                    meetingTitle: scheduleTitle,
                    startIso: new Date(scheduleStartIso).toISOString(),
                    durationMinutes: scheduleDuration,
                    notes: scheduleNotes,
                  });
                  setStatusBanner({
                    type: 'success',
                    text: `✅ Conflict check passed! Scheduled "${scheduleTitle}" directly onto ${scheduleModalAgent.name}’s Google Calendar (${scheduleModalAgent.calendarId}) and invited ${chosenLead?.email}!`,
                  });
                  setScheduleModalAgent(null);
                } catch (err: any) {
                  setStatusBanner({
                    type: 'error',
                    text:
                      err?.message ||
                      'Could not update Google Calendar. Ensure Google Calendar OAuth is connected.',
                  });
                  setScheduleModalAgent(null);
                } finally {
                  setIsBookingCalendar(false);
                }
              }}
              className="p-5 space-y-3 text-xs overflow-y-auto flex-1"
            >
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-center justify-between">
                <div>
                  <strong>Target Agent Calendar:</strong>{' '}
                  <span className="font-mono text-slate-900">
                    {scheduleModalAgent.calendarId || scheduleModalAgent.email}
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                  Conflict Guard Active
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Client / Buyer Lead
                </label>
                <select
                  value={scheduleLeadId}
                  onChange={(e) => {
                    setScheduleLeadId(e.target.value);
                    const found = leads.find((l) => l.id === e.target.value);
                    if (found) {
                      setScheduleProperty(found.propertyInterest);
                      setScheduleTitle(
                        `Private Showing: ${found.propertyInterest} (${scheduleModalAgent.name} & ${found.name})`
                      );
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Meeting / Showing Title
                </label>
                <input
                  type="text"
                  required
                  value={scheduleTitle}
                  onChange={(e) => setScheduleTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Date & Start Time
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={scheduleStartIso}
                    onChange={(e) => setScheduleStartIso(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min={15}
                    max={240}
                    value={scheduleDuration}
                    onChange={(e) =>
                      setScheduleDuration(Number(e.target.value) || 45)
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* AUTOMATIC CONFLICT VALIDATION LAYER */}
              <div className="rounded-xl border overflow-hidden">
                <div
                  className={`px-3.5 py-2.5 flex items-center justify-between border-b ${
                    isValidatingSchedule
                      ? 'bg-slate-50 border-slate-200 text-slate-700'
                      : scheduleValidation && !scheduleValidation.valid
                      ? 'bg-rose-50 border-rose-200 text-rose-900'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold">
                    {isValidatingSchedule ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
                        <span>
                          Checking {scheduleModalAgent.name}’s Calendar & Lead
                          History...
                        </span>
                      </>
                    ) : scheduleValidation && !scheduleValidation.valid ? (
                      <>
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>
                          Time Conflict Detected (
                          {scheduleValidation.conflicts.length} Overlap
                          {scheduleValidation.conflicts.length === 1 ? '' : 's'}
                          ) — Creation Blocked
                        </span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>
                          No Conflicts Across Agent Calendar or Lead History
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {!isValidatingSchedule && scheduleValidation && (
                  <div className="p-3 bg-white space-y-2.5">
                    {scheduleValidation.valid ? (
                      <div className="text-[11px] text-slate-600 space-y-1">
                        <p>
                          ✅ Verified{' '}
                          <strong className="text-slate-900">
                            {scheduleValidation.agentName}
                          </strong>{' '}
                          and{' '}
                          <strong className="text-slate-900">
                            {scheduleValidation.leadName}
                          </strong>{' '}
                          have no overlapping events at this time.
                        </p>
                        {scheduleValidation.warnings.length > 0 && (
                          <div className="mt-1 p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 space-y-0.5">
                            {scheduleValidation.warnings.map((w, idx) => (
                              <div key={idx}>⚠️ {w}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        <div className="space-y-1.5">
                          {scheduleValidation.conflicts.map((c) => (
                            <div
                              key={c.id}
                              className="p-2.5 rounded-lg bg-rose-50/70 border border-rose-200 text-[11px] space-y-0.5"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-rose-900">
                                  {c.title}
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-semibold text-[10px]">
                                  {c.source}
                                </span>
                              </div>
                              <div className="text-rose-700 font-mono text-[10px]">
                                Conflicting Window: {c.formattedTime}
                              </div>
                              <div className="text-slate-600">{c.detail}</div>
                            </div>
                          ))}
                        </div>

                        {scheduleValidation.suggestedSlots.length > 0 && (
                          <div className="pt-1 border-t border-slate-100">
                            <div className="text-[11px] font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-emerald-600" />
                              <span>
                                Choose a Conflict-Free Slot to Unlock Booking:
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {scheduleValidation.suggestedSlots.map((slot) => (
                                <button
                                  key={slot.startIso}
                                  type="button"
                                  onClick={() =>
                                    setScheduleStartIso(
                                      formatDatetimeLocal(slot.startIso)
                                    )
                                  }
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-[11px] font-semibold transition-colors"
                                >
                                  {slot.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Meeting Agenda & Notes
                </label>
                <textarea
                  rows={2}
                  value={scheduleNotes}
                  onChange={(e) => setScheduleNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setScheduleModalAgent(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    isBookingCalendar ||
                    isValidatingSchedule ||
                    Boolean(scheduleValidation && !scheduleValidation.valid)
                  }
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isBookingCalendar ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                  {scheduleValidation && !scheduleValidation.valid
                    ? 'Resolve Conflict to Book'
                    : 'Sync & Book on Agent Calendar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 4. AI LEAD ENGAGEMENT, SENTIMENT & NEXT STEPS INTELLIGENCE MODAL
// ============================================================================
interface LeadAiAnalysisModalProps {
  lead: ClientLead | null;
  assignedAgent?: HumanAgent;
  isAnalyzing: boolean;
  error: string | null;
  onClose: () => void;
  onReAnalyze: (lead: ClientLead) => void;
  onExecuteRecommendedStep: (
    lead: ClientLead,
    step: LeadAiAnalysis['recommendedNextSteps'][number]
  ) => void;
}

export const LeadAiAnalysisModal: React.FC<LeadAiAnalysisModalProps> = ({
  lead,
  assignedAgent,
  isAnalyzing,
  error,
  onClose,
  onReAnalyze,
  onExecuteRecommendedStep,
}) => {
  if (!lead) return null;

  const analysis = lead.aiAnalysis;

  const getSentimentBadgeStyle = (sentiment?: LeadAiAnalysis['sentiment']) => {
    switch (sentiment) {
      case 'High Intent':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'Urgent':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'Positive':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'Cautious':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      default:
        return 'bg-slate-700 text-slate-200 border-slate-600';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold truncate">
                  AI Lead Intelligence: {lead.name}
                </h3>
                {analysis && (
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getSentimentBadgeStyle(
                      analysis.sentiment
                    )}`}
                  >
                    {analysis.sentiment} ({analysis.sentimentScore}/100)
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                {lead.propertyInterest} · Budget: {lead.budget} · Timeline:{' '}
                {lead.timeline}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={isAnalyzing}
              onClick={() => onReAnalyze(lead)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`}
              />
              <span>Re-Analyze</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 text-xs">
          {isAnalyzing ? (
            <div className="py-12 text-center space-y-3">
              <Loader2 className="w-7 h-7 animate-spin text-amber-500 mx-auto" />
              <div className="text-sm font-bold text-slate-900">
                Synthesizing {lead.name}’s Engagement History, Emails & Chat
                Logs...
              </div>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Aria Rostova is analyzing past Gmail threads, AI Employee chat
                histories, CRM notes, and tour activity to compute sentiment and
                recommended next steps.
              </p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>AI Lead Analysis Could Not Complete</span>
              </div>
              <p className="text-xs text-rose-800">{error}</p>
            </div>
          ) : analysis ? (
            <>
              {/* Top Metadata Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Buyer Sentiment & Score
                  </div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-base font-bold text-slate-900">
                      {analysis.sentiment}
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-700">
                      {analysis.sentimentScore}/100
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-600">
                    {analysis.sentimentRationale}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Data Sources Analyzed
                  </div>
                  <div className="mt-1 text-sm font-bold text-slate-900">
                    {analysis.analyzedChatLogCount} Chat/Bot Logs ·{' '}
                    {analysis.analyzedEmailCount} Emails
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    Engine: {analysis.providerUsed} · {analysis.generatedAt}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Assigned Human Agent
                  </div>
                  <div className="mt-1 text-sm font-bold text-slate-900 truncate">
                    {assignedAgent?.name || 'Victoria Sterling'}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500 truncate">
                    {assignedAgent?.email ||
                      'victoria.sterling@atelierestate.com'}
                  </div>
                </div>
              </div>

              {/* Engagement History Summary */}
              <div className="p-4 rounded-xl bg-slate-900 text-slate-100 space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Executive Engagement Summary</span>
                </div>
                <p className="text-xs leading-relaxed text-slate-200">
                  {analysis.engagementSummary}
                </p>
              </div>

              {/* Key Buying Signals */}
              {analysis.keySignals && analysis.keySignals.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-900">
                    Key Engagement Signals & Qualification Highlights
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {analysis.keySignals.map((sig, i) => (
                      <div
                        key={i}
                        className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2 text-slate-700"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{sig}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommended Next Steps with 1-Click AI Execution */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-900">
                    AI Recommended Next Steps
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Click any action to execute immediately with an AI Employee
                  </span>
                </div>

                <div className="space-y-2">
                  {analysis.recommendedNextSteps.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 flex flex-wrap items-center justify-between gap-3 transition-all"
                    >
                      <div className="space-y-1 flex-1 min-w-[220px]">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              item.priority === 'Immediate'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : item.priority === 'High'
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}
                          >
                            {item.priority}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[10px]">
                            {item.channel}
                          </span>
                        </div>
                        <div className="font-semibold text-slate-900 text-xs">
                          {item.step}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onExecuteRecommendedStep(lead, item)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shrink-0 transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>Execute with AI</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

