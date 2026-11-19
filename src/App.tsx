import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Send,
  Plus,
  PhoneCall,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  Building2,
  Users,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Mail,
  Trash2,
  Edit3,
  Settings,
  LogOut,
  Sparkles,
  X,
  Check,
  Loader2,
  UserPlus,
  Home,
  KeyRound,
  Cpu,
  BarChart3,
  LayoutDashboard,
  Table2,
  Filter,
  Search,
  BellRing,
  Clock,
  Terminal,
  UserCheck,
  Globe,
  PanelRightClose,
  PanelRightOpen,
  ExternalLink,
  BookOpen,
} from 'lucide-react';
import {
  AIEmployee,
  EmployeeId,
  PropertyListing,
  ClientLead,
  ToolConnection,
  ToolId,
  EmployeeChatMessage,
  ProposedToolAction,
  LeadReminder,
  HumanAgent,
  BotLogEntry,
  LeadAiAnalysis,
  ScheduledMeetingRecord,
  MeetingConflictItem,
  MeetingValidationResult,
} from './types/brokerage';
import {
  INITIAL_EMPLOYEES,
  INITIAL_PROPERTIES,
  INITIAL_LEADS,
  INITIAL_TOOL_CONNECTIONS,
  INITIAL_REMINDERS,
  INITIAL_HUMAN_AGENTS,
  INITIAL_BOT_LOGS,
  INITIAL_SCHEDULED_MEETINGS,
} from './data/initialBrokerageData';
import {
  connectGoogleWorkspace,
  disconnectGoogleWorkspace,
  getStoredWorkspaceAuth,
  sendGmailMessage,
  createCalendarShowingEvent,
  fetchGmailMessagesForLead,
  checkGoogleCalendarConflicts,
} from './services/googleWorkspace';
import {
  GuidedOnboardingModal,
  LlmProviderSettings,
  LLM_PROVIDER_CATALOG,
} from './components/GuidedOnboardingModal';
import { WorkspaceConfirmModal } from './components/WorkspaceConfirmModal';
import {
  LeadsDashboardTab,
  LeadsFunnelTab,
  BrokeragePerformanceView,
} from './components/BrokerageCharts';
import {
  BotLogsDropdownPopover,
  BotLogsSidePanel,
  HumanAgentsDirectoryView,
  LeadAiAnalysisModal,
} from './components/BotLogsAndHumanAgents';
import {
  LandingPageView,
  ActiveLicenseSession,
} from './components/LandingPageView';
import { AdminLicenseEnquiriesView } from './components/AdminLicenseEnquiriesView';
import { AutomationBlueprintGuide } from './components/AutomationBlueprintGuide';

type MainTab =
  | 'chat'
  | 'properties'
  | 'leads'
  | 'human_agents'
  | 'performance'
  | 'setup_guide'
  | 'b2b_portal';


interface CallTranscriptLine {
  id: string;
  speaker: 'Caller' | 'AI Receptionist';
  text: string;
  timestamp: string;
}

const AVATAR_BADGE_COLORS: Record<string, string> = {
  clara: 'bg-emerald-600 text-white',
  elena: 'bg-blue-600 text-white',
  marcus: 'bg-amber-600 text-white',
  maya: 'bg-teal-600 text-white',
  julian: 'bg-purple-600 text-white',
  aria: 'bg-indigo-600 text-white',
};

export function App() {
  // 0. State: BYOK LLM Provider, Model, API Key & Custom Base URL
  const [llmSettings, setLlmSettings] = useState<LlmProviderSettings>(() => {
    const saved = localStorage.getItem('atelier_byok_llm_v7');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return {
      provider: 'openai',
      model: 'gpt-4o-mini',
      apiKey: '',
      baseUrl: '',
    };
  });

  // 1. State: AI Employees (Bots)
  const [employees, setEmployees] = useState<AIEmployee[]>(() => {
    const saved = localStorage.getItem('atelier_employees_v5');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_EMPLOYEES;
  });

  const [selectedEmployeeId, setSelectedEmployeeId] =
    useState<EmployeeId>('clara');
  const [activeTab, setActiveTab] = useState<MainTab>('chat');
  const [leadsSubTab, setLeadsSubTab] = useState<
    'dashboard' | 'funnel' | 'table'
  >('funnel');
  const [leadStatusFilter, setLeadStatusFilter] = useState<
    'ALL' | ClientLead['status']
  >('ALL');
  const [leadSearchQuery, setLeadSearchQuery] = useState('');

  // B2B License Lock & Public Landing Page State
  const [licenseSession, setLicenseSession] =
    useState<ActiveLicenseSession | null>(() => {
      const saved = localStorage.getItem('atelier_license_session_v1');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return null;
        }
      }
      return null;
    });
  const [showPublicLandingPage, setShowPublicLandingPage] = useState<boolean>(
    () => !Boolean(localStorage.getItem('atelier_license_session_v1'))
  );

  // 2. State: Properties Database (CRUD)
  const [properties, setProperties] = useState<PropertyListing[]>(() => {
    const saved = localStorage.getItem('atelier_properties_v5');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_PROPERTIES;
  });

  // 3. State: Leads & Clients Database (CRUD)
  const [leads, setLeads] = useState<ClientLead[]>(() => {
    const saved = localStorage.getItem('atelier_leads_v5');
    if (saved) {
      try {
        const parsed: ClientLead[] = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const existingIds = new Set(parsed.map((l) => l.id));
          const missingDefaults = INITIAL_LEADS.filter(
            (initLead) => !existingIds.has(initLead.id)
          );
          return [...parsed, ...missingDefaults];
        }
      } catch {
        // fallback
      }
    }
    return INITIAL_LEADS;
  });

  // 4. State: Connected Apps (Starts 100% Blank & Unconnected until verified live by /api/vault/status)
  const [tools, setTools] = useState<ToolConnection[]>(() => {
    try {
      localStorage.removeItem('atelier_tools_v9');
    } catch {
      // ignore storage errors
    }
    return INITIAL_TOOL_CONNECTIONS.map((t) => ({
      ...t,
      connected: false,
      accountHandle: '',
      webhookUrl: '',
      accounts: [],
      lastSync: 'Not connected',
    }));
  });

  // 4b. State: Human Real Estate Agents (With Contact Info & Direct Google Calendar Sync)
  const [humanAgents, setHumanAgents] = useState<HumanAgent[]>(() => {
    const saved = localStorage.getItem('atelier_human_agents_v9');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_HUMAN_AGENTS;
  });

  // 4c. State: Live Bot Activity Logs (Side Screen + Dropdown View)
  const [botLogs, setBotLogs] = useState<BotLogEntry[]>(() => {
    const saved = localStorage.getItem('atelier_bot_logs_v9');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_BOT_LOGS;
  });
  const [logsSidePanelOpen, setLogsSidePanelOpen] = useState<boolean>(false);
  const [logsDropdownOpen, setLogsDropdownOpen] = useState<boolean>(false);

  const appendBotLog = (entry: {
    employeeId?: EmployeeId;
    employeeName?: string;
    employeeRole?: string;
    category: BotLogEntry['category'];
    status: BotLogEntry['status'];
    title: string;
    detail: string;
    channelOrTool?: string;
  }) => {
    const emp =
      employees.find((e) => e.id === entry.employeeId) ||
      employees.find((e) => e.id === selectedEmployeeId) ||
      employees[0];
    const newEntry: BotLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      isoTime: new Date().toISOString(),
      employeeId: entry.employeeId || emp.id,
      employeeName: entry.employeeName || emp.name,
      employeeRole: entry.employeeRole || emp.role,
      category: entry.category,
      status: entry.status,
      title: entry.title,
      detail: entry.detail,
      channelOrTool: entry.channelOrTool,
    };
    setBotLogs((prev) => [newEntry, ...prev.slice(0, 79)]);
  };

  // 5. Google Account State (Requires Real OAuth Token or Verified Gmail SMTP)
  const [googleEmail, setGoogleEmail] = useState<string | null>(() => {
    const auth = getStoredWorkspaceAuth();
    return auth?.userEmail || null;
  });
  const [googleToken, setGoogleToken] = useState<string | null>(() => {
    const auth = getStoredWorkspaceAuth();
    return auth?.accessToken || null;
  });
  const [gmailSmtpVerified, setGmailSmtpVerified] = useState<boolean>(false);

  // 6. Per-Bot Chat History
  const [chatHistories, setChatHistories] = useState<
    Record<string, EmployeeChatMessage[]>
  >(() => {
    const saved = localStorage.getItem('atelier_chats_v5');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    const initial: Record<string, EmployeeChatMessage[]> = {};
    for (const emp of INITIAL_EMPLOYEES) {
      initial[emp.id] = [
        {
          id: `welcome-${emp.id}`,
          sender: 'employee',
          text: `Hi, I'm ${emp.name} (${emp.role}). You can ask me to manage leads, update properties, send emails, book showings, or answer live calls. How can I help today?`,
          timestamp: 'Just now',
        },
      ];
    }
    return initial;
  });

  const [chatInput, setChatInput] = useState('');
  const [isSendingChat, setIsSendingChat] = useState(false);

  // 7. Bottom-Left Connected Apps Dropdown & Modals
  const [appsDropdownOpen, setAppsDropdownOpen] = useState(false);
  const [onboardingModalOpen, setOnboardingModalOpen] = useState(false);
  const [onboardingChannel, setOnboardingChannel] = useState<
    ToolId | 'llm_engine' | 'webhook_health' | 'step_by_step_guide'
  >('llm_engine');
  const [guideHandle, setGuideHandle] = useState('');
  const [guideWebhookUrl, setGuideWebhookUrl] = useState('');
  const [guideSaving, setGuideSaving] = useState(false);
  const [guideFeedback, setGuideFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // 8. Custom Bot Creation & Edit Modal
  const [newBotModalOpen, setNewBotModalOpen] = useState(false);
  const [editingBotId, setEditingBotId] = useState<string | null>(null);
  const [newBotName, setNewBotName] = useState('');
  const [newBotRole, setNewBotRole] = useState('');
  const [newBotSpecialty, setNewBotSpecialty] = useState('');
  const [newBotPrompt, setNewBotPrompt] = useState('');

  // 9. Workspace Confirmation Modal (for Gmail/Calendar actions)
  const [pendingWorkspaceAction, setPendingWorkspaceAction] = useState<{
    type: 'gmail' | 'calendar';
    employeeName: string;
    recipientEmail?: string;
    subject?: string;
    body?: string;
    eventSummary?: string;
    eventDescription?: string;
    eventStartIso?: string;
    eventDurationMinutes?: number;
    attendeeEmail?: string;
    assignedAgentId?: string;
  } | null>(null);
  const [isExecutingWorkspace, setIsExecutingWorkspace] = useState(false);

  // 9b. Scheduled Meetings & Tour Conflict Registry
  const [scheduledMeetings, setScheduledMeetings] = useState<
    ScheduledMeetingRecord[]
  >(() => {
    const saved = localStorage.getItem('atelier_scheduled_meetings_v10');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_SCHEDULED_MEETINGS;
  });

  // 9c. AI Lead Engagement & Sentiment Analysis State
  const [analyzingLeadId, setAnalyzingLeadId] = useState<string | null>(null);
  const [analysisModalLeadId, setAnalysisModalLeadId] = useState<string | null>(
    null
  );
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // 10. Live Voice Call Receptionist State
  const [isCallActive, setIsCallActive] = useState(false);
  const [isListeningMic, setIsListeningMic] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [voiceInputText, setVoiceInputText] = useState('');
  const [callTranscript, setCallTranscript] = useState<CallTranscriptLine[]>(
    []
  );
  const [callerDraft, setCallerDraft] = useState<{
    leadId: string;
    callerName: string;
    callerPhone: string;
    callerEmail: string;
    budget: string;
    timeline: string;
    propertyInterest: string;
    qualificationScore: number;
  }>({
    leadId: '',
    callerName: '',
    callerPhone: '',
    callerEmail: '',
    budget: '',
    timeline: '',
    propertyInterest: '',
    qualificationScore: 80,
  });

  // 11. Properties Database Modal (Add / Edit Property)
  const [propertyModalOpen, setPropertyModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] =
    useState<PropertyListing | null>(null);
  const [propForm, setPropForm] = useState({
    title: '',
    address: '',
    neighborhood: '',
    priceFormatted: '',
    price: 0,
    beds: 3,
    baths: 3,
    sqft: '2,500',
    status: 'Active' as PropertyListing['status'],
    HighlightTag: 'Luxury Listing',
  });

  // 12. Leads Database Modal (Add / Edit Lead)
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<ClientLead | null>(null);
  const [leadForm, setLeadForm] = useState({
    name: '',
    email: '',
    phone: '',
    source: 'Manual Entry' as ClientLead['source'],
    budget: '',
    timeline: '30 Days',
    propertyInterest: '',
    status: 'AI Qualified' as ClientLead['status'],
    qualificationScore: 85,
    notes: '',
  });

  // 13. CRM Follow-Up Reminders & Scheduled Notifications State
  const [reminders, setReminders] = useState<LeadReminder[]>(() => {
    const saved = localStorage.getItem('atelier_reminders_v8');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_REMINDERS;
  });
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [reminderForm, setReminderForm] = useState<{
    leadId: string;
    leadName: string;
    leadEmail: string;
    propertyInterest: string;
    taskTitle: string;
    duePreset: '15sec' | '1hour' | 'tomorrow10am' | 'custom';
    customDueIso: string;
    channel: LeadReminder['channel'];
    assignedEmployeeId: EmployeeId;
  }>({
    leadId: '',
    leadName: '',
    leadEmail: '',
    propertyInterest: '',
    taskTitle: '',
    duePreset: '1hour',
    customDueIso: '',
    channel: 'Email',
    assignedEmployeeId: 'elena',
  });
  const [activeReminderToast, setActiveReminderToast] =
    useState<LeadReminder | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Hydrate workspace state from Backend (/api/brokerage/workspace) on mount
  const hydratedFromServerRef = useRef(false);
  useEffect(() => {
    fetch('/api/brokerage/workspace')
      .then((r) => r.json())
      .then((data) => {
        const ws = data?.workspace;
        if (ws) {
          if (Array.isArray(ws.employees) && ws.employees.length > 0) {
            setEmployees(ws.employees);
          }
          if (Array.isArray(ws.humanAgents)) {
            setHumanAgents(ws.humanAgents);
          }
          if (Array.isArray(ws.properties)) {
            setProperties(ws.properties);
          }
          if (Array.isArray(ws.leads)) {
            setLeads(ws.leads);
          }
          if (Array.isArray(ws.reminders)) {
            setReminders(ws.reminders);
          }
          if (Array.isArray(ws.scheduledMeetings)) {
            setScheduledMeetings(ws.scheduledMeetings);
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        hydratedFromServerRef.current = true;
      });
  }, []);

  // Persist changes to localStorage AND sync to Node/Express Backend (/api/brokerage/workspace)
  useEffect(() => {
    localStorage.setItem('atelier_employees_v5', JSON.stringify(employees));
    localStorage.setItem('atelier_properties_v5', JSON.stringify(properties));
    localStorage.setItem('atelier_leads_v5', JSON.stringify(leads));
    localStorage.setItem(
      'atelier_human_agents_v9',
      JSON.stringify(humanAgents)
    );
    localStorage.setItem('atelier_reminders_v8', JSON.stringify(reminders));
    localStorage.setItem(
      'atelier_scheduled_meetings_v10',
      JSON.stringify(scheduledMeetings)
    );

    if (!hydratedFromServerRef.current) return;
    fetch('/api/brokerage/workspace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employees,
        humanAgents,
        properties,
        leads,
        reminders,
        scheduledMeetings,
      }),
    }).catch(() => {});
  }, [
    employees,
    properties,
    leads,
    humanAgents,
    reminders,
    scheduledMeetings,
  ]);

  useEffect(() => {
    localStorage.setItem('atelier_tools_v10_strict', JSON.stringify(tools));
  }, [tools]);

  useEffect(() => {
    localStorage.setItem('atelier_bot_logs_v9', JSON.stringify(botLogs));
  }, [botLogs]);

  useEffect(() => {
    localStorage.setItem('atelier_chats_v5', JSON.stringify(chatHistories));
  }, [chatHistories]);

  // Background Poller: Sync Inbound Leads from Agency Website Webhook (/api/webhooks/website-leads)
  useEffect(() => {
    const syncWebsiteLeads = () => {
      fetch('/api/webhooks/website-leads')
        .then((r) => r.json())
        .then((data) => {
          if (!data.ok || !Array.isArray(data.leads) || data.leads.length === 0)
            return;
          setLeads((prevLeads) => {
            const existingIds = new Set(prevLeads.map((l) => l.id));
            const newArrivals = data.leads.filter(
              (wl: any) => !existingIds.has(wl.id)
            );
            if (newArrivals.length === 0) return prevLeads;

            for (const wl of newArrivals) {
              appendBotLog({
                employeeId: 'marcus',
                employeeName: 'Marcus Thorne',
                employeeRole: 'AI Lead Manager & Website Intake',
                category: 'WEBSITE_LEAD',
                status: 'SUCCESS',
                title: `Website Lead Captured: ${wl.name}`,
                detail: `Received direct inquiry from ${wl.websiteDomain || 'Agency Website'} for "${wl.propertyInterest}" (Budget: ${wl.budget}, Email: ${wl.email}). Auto-qualified & added to CRM.`,
                channelOrTool: 'Agency Website Leads',
              });
            }

            const mappedNew: ClientLead[] = newArrivals.map((wl: any) => ({
              id: wl.id,
              name: wl.name,
              email: wl.email,
              phone: wl.phone,
              source: wl.source || 'Agency Website',
              budget: wl.budget,
              timeline: wl.timeline || '30 Days',
              propertyInterest: wl.propertyInterest,
              qualificationScore: wl.qualificationScore || 92,
              status: 'AI Qualified',
              assignedEmployeeId: 'marcus',
              assignedHumanAgentId: humanAgents[0]?.id,
              lastContacted: 'Captured from Website just now',
              notes: wl.notes,
            }));

            return [...mappedNew, ...prevLeads];
          });
        })
        .catch(() => {});
    };

    syncWebsiteLeads();
    const interval = setInterval(syncWebsiteLeads, 4000);
    return () => clearInterval(interval);
  }, [humanAgents]);

  // Background Reminder Notification Watcher (Checks due reminders every 3 seconds)
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setReminders((prev) => {
        let triggered: LeadReminder | null = null;
        const next = prev.map((r) => {
          if (!r.completed && !r.notified) {
            const dueMs = new Date(r.dueAt).getTime();
            if (!isNaN(dueMs) && dueMs <= now) {
              triggered = { ...r, notified: true };
              return triggered;
            }
          }
          return r;
        });
        if (triggered) {
          const trig = triggered as LeadReminder;
          setActiveReminderToast(trig);
          appendBotLog({
            employeeId: trig.assignedEmployeeId || 'elena',
            category: 'REMINDER_ALERT',
            status: 'WARNING',
            title: `Follow-Up Reminder Due: ${trig.leadName}`,
            detail: `${trig.taskTitle} (${trig.channel}) for ${trig.propertyInterest}`,
            channelOrTool: trig.channel,
          });
          if (
            typeof window !== 'undefined' &&
            'Notification' in window &&
            Notification.permission === 'granted'
          ) {
            try {
              new Notification(`Follow-Up Due: ${trig.leadName}`, {
                body: `${trig.taskTitle} (${trig.channel})`,
              });
            } catch {
              // ignore browser notification error
            }
          }
          return next;
        }
        return prev;
      });
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistories, selectedEmployeeId, isSendingChat]);

  // Sync Vault status on mount — only mark channels connected if verified live
  useEffect(() => {
    fetch('/api/vault/status')
      .then((r) => r.json())
      .then((data) => {
        if (!data.entries) return;
        const serverEmailConfigured = Boolean(
          (data.entries.GMAIL_SMTP_APP_PASSWORD?.configured ||
            data.entries.RESEND_API_KEY?.configured ||
            data.entries.BREVO_API_KEY?.configured) &&
            data.configs?.gmail?.verified
        );
        if (serverEmailConfigured) {
          setGmailSmtpVerified(true);
          if (data.configs?.gmail?.accountHandle) {
            setGoogleEmail(data.configs.gmail.accountHandle);
          }
        }
        setTools((prev) =>
          prev.map((t) => {
            const cfg = data.configs?.[t.id];
            if (t.id === 'gmail') {
              const isConnected = Boolean(serverEmailConfigured || googleToken);
              return {
                ...t,
                connected: isConnected,
                accountHandle:
                  cfg?.accountHandle || googleEmail || t.accountHandle || '',
                accounts: Array.isArray(cfg?.accounts)
                  ? cfg.accounts
                  : t.accounts || [],
                lastSync: isConnected
                  ? cfg?.verifiedDetail || 'Verified'
                  : 'Not connected',
              };
            }
            if (cfg && cfg.verified) {
              return {
                ...t,
                connected: true,
                accountHandle: cfg.accountHandle || t.accountHandle || '',
                webhookUrl: cfg.webhookUrl || t.webhookUrl || '',
                accounts: Array.isArray(cfg.accounts)
                  ? cfg.accounts
                  : t.accounts || [],
                lastSync: cfg.verifiedDetail || 'Verified live',
              };
            }
            return {
              ...t,
              connected: false,
              accountHandle: '',
              webhookUrl: '',
              accounts: [],
              lastSync: 'Not configured',
            };
          })
        );
      })
      .catch(() => {});
  }, []);

  const activeEmployee =
    employees.find((e) => e.id === selectedEmployeeId) || employees[0];
  const currentMessages = chatHistories[activeEmployee.id] || [];
  const activeProviderMeta =
    LLM_PROVIDER_CATALOG.find((p) => p.id === llmSettings.provider) ||
    LLM_PROVIDER_CATALOG[0];

  // Connect Google Account via Real Google OAuth 2.0 Popup or Verified ya29... Token (Also registers in multi-account list)
  const handleConnectGoogle = async (directOAuthToken?: string) => {
    const auth = await connectGoogleWorkspace(directOAuthToken);
    setGoogleEmail(auth.userEmail);
    setGoogleToken(auth.accessToken);
    await fetch('/api/channels/accounts/manage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        toolId: 'gmail',
        action: 'register_oauth',
        oauthEmail: auth.userEmail,
        oauthDetail: 'Verified Google OAuth 2.0 (Gmail & Calendar)',
      }),
    }).catch(() => {});
    await fetch('/api/channels/accounts/manage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        toolId: 'google_calendar',
        action: 'register_oauth',
        oauthEmail: auth.userEmail,
        oauthDetail: 'Verified Google Calendar OAuth 2.0',
      }),
    }).catch(() => {});

    setTools((prev) =>
      prev.map((t) =>
        t.id === 'gmail' || t.id === 'google_calendar'
          ? {
              ...t,
              connected: true,
              accountHandle: auth.userEmail,
              lastSync: 'Verified Google OAuth 2.0',
            }
          : t
      )
    );
    appendBotLog({
      employeeId: 'elena',
      category: 'SYSTEM',
      status: 'SUCCESS',
      title: `Connected Google OAuth Account: ${auth.userEmail}`,
      detail: `Verified Gmail & Google Calendar OAuth 2.0 access token for ${auth.userEmail}.`,
      channelOrTool: 'Google OAuth 2.0',
    });
  };

  // Connect Any Gmail via Live Verified Google App Password (smtp.gmail.com:465)
  const handleConnectGmailSmtp = async (email: string, appPassword: string) => {
    const resp = await fetch('/api/email/verify-smtp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, appPassword }),
    });
    const data = await resp.json();
    if (!resp.ok || !data.ok) {
      throw new Error(
        data.error ||
          'SMTP verification failed. Check your Gmail address and 16-character App Password.'
      );
    }
    setGoogleEmail(data.email);
    setGmailSmtpVerified(true);
    setTools((prev) =>
      prev.map((t) =>
        t.id === 'gmail'
          ? {
              ...t,
              connected: true,
              accountHandle: data.email,
              accounts: Array.isArray(data.accounts)
                ? data.accounts
                : t.accounts || [],
              lastSync: 'Verified Gmail SMTP (465)',
            }
          : t
      )
    );
    appendBotLog({
      employeeId: 'elena',
      category: 'SYSTEM',
      status: 'SUCCESS',
      title: `Connected Gmail SMTP Account: ${data.email}`,
      detail: `Verified live SMTP connection (smtp.gmail.com:465) for ${data.email}.`,
      channelOrTool: 'Gmail SMTP',
    });
  };

  const handleConnectEmailProvider = async ({
    provider,
    apiKey,
    fromEmail,
    fromName,
  }: {
    provider: 'resend' | 'brevo';
    apiKey: string;
    fromEmail: string;
    fromName?: string;
  }) => {
    const resp = await fetch('/api/email/verify-provider', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider,
        apiKey,
        fromEmail,
        fromName,
        senderEmail: fromEmail,
        senderName: fromName,
      }),
    });
    const data = await resp.json();
    if (!resp.ok || !data.ok) {
      throw new Error(
        data.error ||
          `${provider === 'resend' ? 'Resend' : 'Brevo'} API verification failed. Please check your API key and sender email.`
      );
    }
    const providerLabel = provider === 'resend' ? 'Resend HTTPS API' : 'Brevo V3 HTTPS API';
    setGoogleEmail(data.email);
    setGmailSmtpVerified(true);
    setTools((prev) =>
      prev.map((t) =>
        t.id === 'gmail'
          ? {
              ...t,
              connected: true,
              accountHandle: data.email,
              accounts: Array.isArray(data.accounts)
                ? data.accounts
                : t.accounts || [],
              lastSync: `Verified ${providerLabel}`,
            }
          : t
      )
    );
    appendBotLog({
      employeeId: 'elena',
      category: 'SYSTEM',
      status: 'SUCCESS',
      title: `Connected ${provider === 'resend' ? 'Resend' : 'Brevo'} Email Account: ${data.email}`,
      detail: `Verified live ${providerLabel} over HTTPS (port 443) for ${data.email}.`,
      channelOrTool: providerLabel,
    });
  };

  const handleDisconnectGoogle = async () => {
    await disconnectGoogleWorkspace();
    await fetch('/api/vault/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keyNames: [
          'GMAIL_SMTP_USER',
          'GMAIL_SMTP_APP_PASSWORD',
          'GMAIL_SMTP_HOST',
          'RESEND_API_KEY',
          'RESEND_FROM_EMAIL',
          'RESEND_FROM_NAME',
          'BREVO_API_KEY',
          'BREVO_FROM_EMAIL',
          'BREVO_FROM_NAME',
          'EMAIL_ACTIVE_PROVIDER',
        ],
        channelId: 'gmail',
      }),
    });
    setGoogleEmail(null);
    setGoogleToken(null);
    setGmailSmtpVerified(false);
    setTools((prev) =>
      prev.map((t) =>
        t.id === 'gmail' || t.id === 'google_calendar'
          ? {
              ...t,
              connected: false,
              accountHandle: '',
              accounts: [],
              lastSync: 'Not connected',
            }
          : t
      )
    );
  };

  // Save BYOK LLM Provider, Model, API Key & Custom Base URL
  const handleUpdateLlmSettings = async (nextSettings: LlmProviderSettings) => {
    setLlmSettings(nextSettings);
    localStorage.setItem('atelier_byok_llm_v7', JSON.stringify(nextSettings));
    await fetch('/api/vault/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        llmProvider: nextSettings.provider,
        llmModel: nextSettings.model,
        llmBaseUrl: nextSettings.baseUrl || '',
        secrets: {
          CUSTOM_LLM_API_KEY: nextSettings.apiKey || '',
        },
      }),
    });
    appendBotLog({
      employeeId: activeEmployee.id,
      category: 'SYSTEM',
      status: 'SUCCESS',
      title: `Updated LLM Engine: ${nextSettings.provider.toUpperCase()}`,
      detail: `All AI Employees are now configured to use model "${nextSettings.model}".`,
      channelOrTool: nextSettings.provider.toUpperCase(),
    });
  };

  // Verify & Save Channel Credentials in GuidedOnboardingModal (Supports Multiple Accounts!)
  const handleSaveChannelConfig = async (
    toolId: ToolId,
    updates: {
      accountHandle: string;
      webhookUrl: string;
      secrets: Record<string, string>;
    }
  ) => {
    const resp = await fetch('/api/channels/verify-and-save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        toolId,
        accountHandle: updates.accountHandle,
        webhookUrl: updates.webhookUrl,
        secrets: updates.secrets,
      }),
    });
    const data = await resp.json();
    if (!resp.ok || !data.ok) {
      throw new Error(
        data.error ||
          `Failed to verify ${toolId} credentials against the live API.`
      );
    }
    setTools((prev) =>
      prev.map((t) =>
        t.id === toolId
          ? {
              ...t,
              connected: true,
              accountHandle: data.verifiedHandle || updates.accountHandle,
              webhookUrl: updates.webhookUrl,
              accounts: Array.isArray(data.accounts)
                ? data.accounts
                : t.accounts || [],
              lastSync: data.verificationMessage || 'Verified live',
            }
          : t
      )
    );
    appendBotLog({
      employeeId: 'marcus',
      category: toolId === 'website_leads' ? 'WEBSITE_LEAD' : 'SYSTEM',
      status: 'SUCCESS',
      title: `Connected ${toolId.toUpperCase()} Account: ${data.verifiedHandle || updates.accountHandle}`,
      detail: data.verificationMessage || 'Verified live against provider API.',
      channelOrTool: toolId.toUpperCase(),
    });
    return data;
  };

  const handleManageChannelAccounts = async (
    toolId: ToolId,
    action: 'set_primary' | 'remove_account',
    accountId: string
  ) => {
    const resp = await fetch('/api/channels/accounts/manage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toolId, action, accountId }),
    });
    const data = await resp.json();
    if (!resp.ok || !data.ok) {
      throw new Error(data.error || 'Could not update channel accounts.');
    }
    const cfg = data.config;
    if (toolId === 'gmail' && cfg?.accountHandle) {
      setGoogleEmail(cfg.accountHandle);
    }
    setTools((prev) =>
      prev.map((t) =>
        t.id === toolId
          ? {
              ...t,
              connected: Boolean(cfg?.verified),
              accountHandle: cfg?.accountHandle || '',
              webhookUrl: cfg?.webhookUrl || '',
              accounts: Array.isArray(cfg?.accounts) ? cfg.accounts : [],
              lastSync: cfg?.verifiedDetail || 'Updated',
            }
          : t
      )
    );
  };

  const handleDisconnectChannel = async (
    toolId: ToolId,
    secretKeys: string[]
  ) => {
    if (toolId === 'gmail' || toolId === 'google_calendar') {
      await handleDisconnectGoogle();
      return;
    }
    await fetch('/api/vault/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyNames: secretKeys, channelId: toolId }),
    });
    setTools((prev) =>
      prev.map((t) =>
        t.id === toolId
          ? {
              ...t,
              connected: false,
              accountHandle: '',
              webhookUrl: '',
              accounts: [],
              lastSync: 'Not configured',
            }
          : t
      )
    );
  };

  // Build AI Request Headers with User's BYOK Key & Provider
  const getAiRequestHeaders = () => ({
    'Content-Type': 'application/json',
    'X-LLM-Provider': llmSettings.provider,
    'X-LLM-Model': llmSettings.model,
    'X-LLM-API-Key': llmSettings.apiKey || '',
    'X-LLM-Base-Url': llmSettings.baseUrl || '',
  });

  // Send Chat Message to Active AI Employee
  const handleSendChat = async (customPrompt?: string) => {
    const textToSend = (customPrompt ?? chatInput).trim();
    if (!textToSend || isSendingChat) return;

    const userMsg: EmployeeChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    setChatHistories((prev) => ({
      ...prev,
      [activeEmployee.id]: [...(prev[activeEmployee.id] || []), userMsg],
    }));
    if (!customPrompt) setChatInput('');
    setIsSendingChat(true);

    appendBotLog({
      employeeId: activeEmployee.id,
      employeeName: activeEmployee.name,
      employeeRole: activeEmployee.role,
      category: 'AI_TASK',
      status: 'RUNNING',
      title: `Processing Instruction (${activeProviderMeta.name})`,
      detail: `Task: "${textToSend}"`,
      channelOrTool: llmSettings.model,
    });

    try {
      const brokerageContext = {
        properties: properties.map((p) => ({
          title: p.title,
          address: p.address,
          neighborhood: p.neighborhood,
          price: p.priceFormatted,
          beds: p.beds,
          baths: p.baths,
          status: p.status,
        })),
        leads: leads.map((l) => ({
          name: l.name,
          email: l.email,
          phone: l.phone,
          budget: l.budget,
          propertyInterest: l.propertyInterest,
          status: l.status,
        })),
        humanAgents: humanAgents.map((ha) => ({
          id: ha.id,
          name: ha.name,
          role: ha.role,
          email: ha.email,
          phone: ha.phone,
          whatsapp: ha.whatsapp,
          specialty: ha.specialty,
          calendarId: ha.calendarId,
          availability: ha.availability,
        })),
      };

      const response = await fetch('/api/ai/employee-task', {
        method: 'POST',
        headers: getAiRequestHeaders(),
        body: JSON.stringify({
          employeeName: activeEmployee.name,
          employeeRole: activeEmployee.role,
          systemPrompt: activeEmployee.systemPrompt,
          taskPrompt: textToSend,
          brokerageContext,
          connectedTools: tools.map((t) => ({
            id: t.id,
            name: t.name,
            connected: t.connected,
            accountHandle: t.accountHandle,
          })),
        }),
      });

      const data = await response.json();
      const action = data.proposedAction || { actionType: 'NONE' };

      // Automatically execute DB_ADD_LEAD, DB_ADD_PROPERTY, CONTACT_HUMAN_AGENT, or GMAIL_SEND when requested in chat
      let extraExecutionNote = '';
      if (action.actionType === 'DB_ADD_LEAD' && action.leadName) {
        const newLead: ClientLead = {
          id: `lead-${Date.now()}`,
          name: action.leadName,
          email: action.leadEmail || 'pending@client.com',
          phone: action.leadPhone || '+1 (555) 019-0000',
          source: 'AI Chat',
          budget: action.leadBudget || '$2.5M',
          timeline: action.leadTimeline || '30 Days',
          propertyInterest:
            action.leadPropertyInterest ||
            properties[0]?.title ||
            'Portfolio Inquiry',
          qualificationScore: 90,
          status: (action.leadStatus as ClientLead['status']) || 'AI Qualified',
          assignedEmployeeId: activeEmployee.id,
          lastContacted: 'Added by AI just now',
          notes:
            action.leadNotes ||
            `Added via chat with ${activeEmployee.name}.`,
        };
        setLeads((prev) => [newLead, ...prev]);
        extraExecutionNote = `✅ Added "${newLead.name}" to the Leads & Clients Database.`;
        appendBotLog({
          employeeId: activeEmployee.id,
          category: 'AI_TASK',
          status: 'SUCCESS',
          title: `Added New Lead to CRM: ${newLead.name}`,
          detail: `Property Interest: ${newLead.propertyInterest} · Budget: ${newLead.budget}`,
          channelOrTool: 'CRM Database',
        });
      } else if (
        action.actionType === 'DB_ADD_PROPERTY' &&
        action.propertyTitle
      ) {
        const newProp: PropertyListing = {
          id: `prop-${Date.now()}`,
          title: action.propertyTitle,
          address: action.propertyAddress || '100 Luxury Way',
          neighborhood: action.propertyNeighborhood || 'Prime District',
          price:
            Number(
              String(action.propertyPrice || '3500000').replace(/[^0-9]/g, '')
            ) || 3500000,
          priceFormatted: action.propertyPrice || '$3,500,000',
          beds: Number(action.propertyBeds) || 4,
          baths: Number(action.propertyBaths) || 4,
          sqft: action.propertySqft || '3,400',
          status:
            (action.propertyStatus as PropertyListing['status']) || 'Active',
          image: properties[0]?.image || '',
          HighlightTag: 'New AI Listing',
          showingSlots: ['Sat 2:00 PM', 'Sun 1:00 PM'],
        };
        setProperties((prev) => [newProp, ...prev]);
        extraExecutionNote = `✅ Added "${newProp.title}" (${newProp.priceFormatted}) to the Properties Database.`;
        appendBotLog({
          employeeId: activeEmployee.id,
          category: 'AI_TASK',
          status: 'SUCCESS',
          title: `Added Listing: ${newProp.title}`,
          detail: `${newProp.address} · ${newProp.priceFormatted}`,
          channelOrTool: 'Properties DB',
        });
      } else if (
        action.actionType === 'GMAIL_SEND' ||
        action.actionType === 'CONTACT_HUMAN_AGENT'
      ) {
        const matchedHumanAgent =
          humanAgents.find(
            (ha) =>
              (action.humanAgentName &&
                ha.name
                  .toLowerCase()
                  .includes(action.humanAgentName.toLowerCase())) ||
              (action.humanAgentEmail &&
                ha.email.toLowerCase() ===
                  action.humanAgentEmail.toLowerCase())
          ) ||
          (action.actionType === 'CONTACT_HUMAN_AGENT'
            ? humanAgents[0]
            : undefined);

        const recipient = (
          action.recipientEmail ||
          action.humanAgentEmail ||
          matchedHumanAgent?.email ||
          leads[0]?.email ||
          ''
        ).trim();
        const subject =
          action.emailSubject ||
          (matchedHumanAgent
            ? `AI Lead & Showing Briefing for ${matchedHumanAgent.name}`
            : 'Property Information from Atelier Estate');
        const body = action.emailBody || data.reply || '';

        // Immediately execute real email send via Google OAuth OR verified Gmail SMTP
        try {
          if (googleToken) {
            const sent = await sendGmailMessage({
              accessToken: googleToken,
              to: recipient,
              subject,
              body,
            });
            action.executed = true;
            action.executionResult = `Delivered via Gmail OAuth API (Message ID: ${sent.id})`;
            extraExecutionNote = `✅ REAL EMAIL SENT to ${recipient} from ${googleEmail}\nSubject: "${subject}"\nGmail Message ID: ${sent.id}`;
            appendBotLog({
              employeeId: activeEmployee.id,
              category: matchedHumanAgent
                ? 'HUMAN_AGENT_HANDOFF'
                : 'EMAIL_SENT',
              status: 'SUCCESS',
              title: matchedHumanAgent
                ? `Briefed Human Agent: ${matchedHumanAgent.name}`
                : `Delivered Email to ${recipient}`,
              detail: `Subject: "${subject}" · Gmail Message ID: ${sent.id}`,
              channelOrTool: 'Gmail OAuth 2.0',
            });
          } else if (gmailSmtpVerified) {
            const smtpRes = await fetch('/api/email/send-smtp', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ to: recipient, subject, body }),
            });
            const smtpData = await smtpRes.json();
            if (!smtpRes.ok || !smtpData.ok) {
              throw new Error(smtpData.error || 'SMTP send failed');
            }
            action.executed = true;
            action.executionResult = `Delivered via ${smtpData.provider || 'Email Server'} (Message ID: ${smtpData.id})`;
            extraExecutionNote = `✅ REAL EMAIL SENT to ${recipient} from ${smtpData.from}\nSubject: "${subject}"\nMessage ID: ${smtpData.id}`;
            appendBotLog({
              employeeId: activeEmployee.id,
              category: matchedHumanAgent
                ? 'HUMAN_AGENT_HANDOFF'
                : 'EMAIL_SENT',
              status: 'SUCCESS',
              title: matchedHumanAgent
                ? `Briefed Human Agent: ${matchedHumanAgent.name}`
                : `Delivered Email to ${recipient}`,
              detail: `Subject: "${subject}" · Message ID: ${smtpData.id}`,
              channelOrTool: smtpData.provider || 'Email API',
            });
          } else {
            throw new Error(
              'Email / Gmail is NOT connected. Connect Resend, Brevo, Google OAuth, or Gmail App Password first.'
            );
          }
        } catch (emailErr: any) {
          action.executed = false;
          extraExecutionNote = `❌ EMAIL WAS NOT SENT to ${
            recipient || '(recipient)'
          }.\nReason: ${
            emailErr?.message || 'Email not connected'
          }\n\n👉 Click "Connected Apps & Website" in the bottom-left corner -> "Email & Gmail" to connect Resend, Brevo, Google OAuth, or a Gmail App Password.`;
          appendBotLog({
            employeeId: activeEmployee.id,
            category: matchedHumanAgent ? 'HUMAN_AGENT_HANDOFF' : 'EMAIL_SENT',
            status: 'ERROR',
            title: `Email Dispatch Blocked (${recipient || 'recipient'})`,
            detail: emailErr?.message || 'Email not connected.',
            channelOrTool: 'Gmail / Email',
          });
        }
      } else if (action.actionType === 'WEBHOOK_OR_SMS_DISPATCH') {
        const chId = ((action.targetChannel || 'whatsapp').toLowerCase()) as ToolId;
        const toolObj = tools.find((t) => t.id === chId);
        const channelLabel = toolObj?.name || chId.toUpperCase();
        const recipient = (
          action.recipientPhoneOrHandle ||
          leads[0]?.phone ||
          ''
        ).trim();
        const messageBody = (action.smsOrPostBody || data.reply || '').trim();

        if (!toolObj?.connected) {
          action.executed = false;
          action.executionResult = `Blocked: ${channelLabel} is NOT connected yet.`;
          extraExecutionNote = `❌ MESSAGE WAS NOT SENT VIA ${channelLabel.toUpperCase()}.\nReason: ${channelLabel} is currently NOT connected.\n\n👉 Click "Step-by-Step Setup & Templates" in the top bar (or "Connected Apps & Website" -> "${channelLabel}") to either:\n1. Download our 1-Click Make.com / n8n Automation Blueprint (.json) pre-configured with your CRM URL, OR\n2. Paste your Official ${channelLabel} API Key.`;
          appendBotLog({
            employeeId: activeEmployee.id,
            category: 'AI_TASK',
            status: 'ERROR',
            title: `${channelLabel} Dispatch Blocked (Not Connected)`,
            detail: `Attempted to message ${recipient || 'recipient'} via ${channelLabel}, but ${channelLabel} is not connected.`,
            channelOrTool: channelLabel,
          });
        } else {
          try {
            const dispRes = await fetch('/api/channels/dispatch', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                channelId: chId,
                recipient,
                messageBody,
                webhookUrl: toolObj.webhookUrl || '',
              }),
            });
            const dispData = await dispRes.json();
            if (!dispRes.ok || !dispData.ok) {
              throw new Error(
                dispData.detail || `${channelLabel} dispatch failed.`
              );
            }
            action.executed = true;
            action.executionResult = dispData.detail;
            action.dispatchMode = dispData.mode;
            extraExecutionNote = dispData.detail;
            appendBotLog({
              employeeId: activeEmployee.id,
              category: 'AI_TASK',
              status: 'SUCCESS',
              title: `Dispatched via ${channelLabel}`,
              detail: dispData.detail,
              channelOrTool: channelLabel,
            });
          } catch (dispErr: any) {
            action.executed = false;
            action.executionResult =
              dispErr?.message || `${channelLabel} dispatch failed.`;
            extraExecutionNote = `❌ ${channelLabel.toUpperCase()} DISPATCH FAILED.\n${
              dispErr?.message || 'Check your connection credentials.'
            }`;
            appendBotLog({
              employeeId: activeEmployee.id,
              category: 'AI_TASK',
              status: 'ERROR',
              title: `${channelLabel} Dispatch Error`,
              detail: dispErr?.message || 'Dispatch failed',
              channelOrTool: channelLabel,
            });
          }
        }
      } else if (action.actionType === 'MAPS_SEARCH') {
        const mapsTool = tools.find((t) => t.id === 'google_maps');
        if (!mapsTool?.connected) {
          action.executed = false;
          action.executionResult =
            'Blocked: Google Maps Grounding API is NOT connected.';
          extraExecutionNote = `❌ GOOGLE MAPS SEARCH WAS NOT RUN.\nReason: Google Maps is currently NOT connected.\n\n👉 Click "Connected Apps & Website" -> "Google Maps" and paste your Google / Gemini API Key (AIza...).`;
          appendBotLog({
            employeeId: activeEmployee.id,
            category: 'AI_TASK',
            status: 'ERROR',
            title: 'Google Maps Lookup Blocked (Not Connected)',
            detail:
              'Google Maps is not connected. Paste a Google API key (AIza...) in Connected Apps -> Google Maps.',
            channelOrTool: 'Google Maps',
          });
        } else {
          try {
            const mapsResp = await fetch('/api/maps/grounding', {
              method: 'POST',
              headers: getAiRequestHeaders(),
              body: JSON.stringify({
                query: action.mapsQuery || textToSend,
                location: action.mapsLocation || mapsTool.accountHandle || '',
              }),
            });
            const mapsData = await mapsResp.json();
            if (!mapsResp.ok || !mapsData.ok) {
              throw new Error(mapsData.summary || 'Google Maps lookup failed.');
            }
            action.executed = true;
            action.executionResult = mapsData.summary;
            action.mapsPlaces = mapsData.places || [];
            extraExecutionNote = `✅ Live Google Maps Grounding Result:\n${mapsData.summary}`;
            appendBotLog({
              employeeId: activeEmployee.id,
              category: 'AI_TASK',
              status: 'SUCCESS',
              title: `Google Maps Grounding: ${action.mapsQuery || 'Lookup'}`,
              detail: (mapsData.summary || '').slice(0, 180),
              channelOrTool: 'Google Maps',
            });
          } catch (mapsErr: any) {
            action.executed = false;
            extraExecutionNote = `❌ Google Maps Error: ${
              mapsErr?.message || 'Unable to run Maps grounding.'
            }`;
            appendBotLog({
              employeeId: activeEmployee.id,
              category: 'AI_TASK',
              status: 'ERROR',
              title: 'Google Maps Grounding Failed',
              detail: mapsErr?.message || 'Error',
              channelOrTool: 'Google Maps',
            });
          }
        }
      } else if (action.actionType === 'CALENDAR_CREATE') {
        const calConnected = Boolean(
          googleToken ||
            gmailSmtpVerified ||
            tools.find((t) => t.id === 'google_calendar')?.connected ||
            tools.find((t) => t.id === 'gmail')?.connected
        );
        if (!calConnected) {
          action.executed = false;
          extraExecutionNote = `⚠️ CALENDAR / EMAIL NOT CONNECTED YET.\nI prepared the showing details below, but no calendar invite was emailed because neither Google Calendar nor Email is connected yet.\n\n👉 Connect your Email (Resend, Brevo, or Gmail) or Google Calendar in "Connected Apps & Website", then click "Approve & Run Action" below.`;
          appendBotLog({
            employeeId: activeEmployee.id,
            category: 'CALENDAR_SYNC',
            status: 'WARNING',
            title: 'Calendar Invite Pending Connection',
            detail:
              'Connect Email or Google Calendar to dispatch real .ics showing invites.',
            channelOrTool: 'Google Calendar',
          });
        } else {
          appendBotLog({
            employeeId: activeEmployee.id,
            category: 'CALENDAR_SYNC',
            status: 'SUCCESS',
            title: `Prepared Showing Invite: ${action.eventSummary || 'Property Tour'}`,
            detail: `Click "Approve & Run Action" in chat to confirm conflict check and dispatch the calendar invite.`,
            channelOrTool: 'Google Calendar',
          });
        }
      } else {
        appendBotLog({
          employeeId: activeEmployee.id,
          category: 'AI_TASK',
          status: data.error ? 'ERROR' : 'SUCCESS',
          title: data.actionSummary || `Completed AI Response`,
          detail: (data.reply || '').slice(0, 180),
          channelOrTool: activeProviderMeta.name,
        });
      }

      const botMsg: EmployeeChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'employee',
        text: extraExecutionNote
          ? `${data.reply}\n\n${extraExecutionNote}`
          : data.reply || 'Done.',
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        actionBadge: data.actionSummary,
        proposedAction:
          action.actionType !== 'NONE' &&
          action.actionType !== 'DB_ADD_LEAD' &&
          action.actionType !== 'DB_ADD_PROPERTY'
            ? (action as ProposedToolAction)
            : undefined,
      };

      setChatHistories((prev) => ({
        ...prev,
        [activeEmployee.id]: [...(prev[activeEmployee.id] || []), botMsg],
      }));
    } catch (err: any) {
      appendBotLog({
        employeeId: activeEmployee.id,
        category: 'AI_TASK',
        status: 'ERROR',
        title: 'AI Task Error',
        detail: err?.message || 'Unable to reach AI server',
        channelOrTool: activeProviderMeta.name,
      });
      const errMsg: EmployeeChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'employee',
        text: `Sorry, I ran into an error: ${err?.message || 'Unable to reach AI server'}.`,
        timestamp: 'Just now',
      };
      setChatHistories((prev) => ({
        ...prev,
        [activeEmployee.id]: [...(prev[activeEmployee.id] || []), errMsg],
      }));
    } finally {
      setIsSendingChat(false);
    }
  };

  // Execute Proposed Action Card inside Chat
  const handleExecuteProposedAction = async (
    messageId: string,
    action: ProposedToolAction
  ) => {
    if (action.actionType === 'GMAIL_SEND') {
      setPendingWorkspaceAction({
        type: 'gmail',
        employeeName: activeEmployee.name,
        recipientEmail: action.recipientEmail || leads[0]?.email || '',
        subject:
          action.emailSubject || 'Property Information from Atelier Estate',
        body: action.emailBody || '',
      });
      return;
    }

    if (action.actionType === 'CALENDAR_CREATE') {
      const matchedLead =
        leads.find(
          (l) =>
            action.attendeeEmail &&
            l.email.toLowerCase() === action.attendeeEmail.toLowerCase()
        ) || leads[0];
      const assignedAgent =
        humanAgents.find(
          (ha) => ha.id === matchedLead?.assignedHumanAgentId
        ) || humanAgents[0];

      setPendingWorkspaceAction({
        type: 'calendar',
        employeeName: activeEmployee.name,
        eventSummary: action.eventSummary || 'Private Property Showing',
        eventDescription: action.eventDescription || '',
        eventStartIso:
          action.eventStartIso ||
          new Date(Date.now() + 86400000).toISOString(),
        eventDurationMinutes: action.eventDurationMinutes || 45,
        attendeeEmail: action.attendeeEmail || leads[0]?.email || '',
        assignedAgentId: assignedAgent?.id || 'agent-1',
      });
      return;
    }

    if (action.actionType === 'MAPS_SEARCH') {
      const resp = await fetch('/api/maps/grounding', {
        method: 'POST',
        headers: getAiRequestHeaders(),
        body: JSON.stringify({
          query: action.mapsQuery || 'Luxury real estate comps and schools',
          location: action.mapsLocation || 'Manhattan, NY',
        }),
      });
      const mapsData = await resp.json();
      setChatHistories((prev) => ({
        ...prev,
        [activeEmployee.id]: (prev[activeEmployee.id] || []).map((m) =>
          m.id === messageId
            ? {
                ...m,
                proposedAction: {
                  ...m.proposedAction!,
                  executed: true,
                  executionResult: mapsData.summary,
                  mapsPlaces: mapsData.places || [],
                },
              }
            : m
        ),
      }));
      return;
    }

    if (action.actionType === 'WEBHOOK_OR_SMS_DISPATCH') {
      const chId = (action.targetChannel || 'whatsapp') as ToolId;
      const toolObj = tools.find((t) => t.id === chId);
      const resp = await fetch('/api/channels/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: chId,
          recipient: action.recipientPhoneOrHandle || leads[0]?.phone || '',
          messageBody: action.smsOrPostBody || '',
          webhookUrl: toolObj?.webhookUrl || '',
        }),
      });
      const dispatchData = await resp.json();
      setChatHistories((prev) => ({
        ...prev,
        [activeEmployee.id]: (prev[activeEmployee.id] || []).map((m) =>
          m.id === messageId
            ? {
                ...m,
                proposedAction: {
                  ...m.proposedAction!,
                  executed: true,
                  executionResult: dispatchData.detail,
                  directLaunchUrl:
                    dispatchData.directLaunchUrl ||
                    m.proposedAction?.directLaunchUrl,
                  dispatchMode: dispatchData.mode,
                },
              }
            : m
        ),
      }));
    }
  };

  // Confirm & Execute Real Gmail / Google Calendar API Call (With Conflict Validation Guard)
  const handleConfirmWorkspaceAction = async (editedPayload: any) => {
    if (!pendingWorkspaceAction) return;
    setIsExecutingWorkspace(true);
    try {
      if (pendingWorkspaceAction.type === 'gmail') {
        let messageId = '';
        if (googleToken) {
          const res = await sendGmailMessage({
            accessToken: googleToken,
            to: editedPayload.recipientEmail,
            subject: editedPayload.subject,
            body: editedPayload.body,
          });
          messageId = res.id;
        } else if (gmailSmtpVerified) {
          const smtpRes = await fetch('/api/email/send-smtp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: editedPayload.recipientEmail,
              subject: editedPayload.subject,
              body: editedPayload.body,
            }),
          });
          const smtpData = await smtpRes.json();
          if (!smtpRes.ok || !smtpData.ok) {
            throw new Error(smtpData.error || 'Failed to send email via SMTP');
          }
          messageId = smtpData.id;
        } else {
          const auth = await connectGoogleWorkspace();
          setGoogleEmail(auth.userEmail);
          setGoogleToken(auth.accessToken);
          const res = await sendGmailMessage({
            accessToken: auth.accessToken,
            to: editedPayload.recipientEmail,
            subject: editedPayload.subject,
            body: editedPayload.body,
          });
          messageId = res.id;
        }

        const confirmMsg: EmployeeChatMessage = {
          id: `ws-${Date.now()}`,
          sender: 'employee',
          text: `✅ REAL EMAIL SENT to ${editedPayload.recipientEmail} ("${editedPayload.subject}") from ${googleEmail || 'connected Gmail'}. Message ID: ${messageId}`,
          timestamp: 'Just now',
          actionBadge: 'Gmail Dispatched',
        };
        setChatHistories((prev) => ({
          ...prev,
          [activeEmployee.id]: [...(prev[activeEmployee.id] || []), confirmMsg],
        }));
      } else {
        const chosenAgent =
          humanAgents.find((a) => a.id === editedPayload.assignedAgentId) ||
          humanAgents[0];
        const startIso =
          editedPayload.eventStartIso ||
          new Date(Date.now() + 86400000).toISOString();
        const durationMinutes = Number(editedPayload.eventDurationMinutes) || 45;
        const endIso = new Date(
          new Date(startIso).getTime() + durationMinutes * 60000
        ).toISOString();

        // Final conflict validation guard before creating the event
        const validation = await handleValidateMeetingSchedule({
          agentId: chosenAgent?.id || 'agent-1',
          attendeeEmail: editedPayload.attendeeEmail || '',
          startIso,
          durationMinutes,
        });
        if (!validation.valid) {
          throw new Error(
            `Schedule Conflict Blocked: ${validation.conflicts
              .map((c) => `${c.title} (${c.formattedTime})`)
              .join('; ')}`
          );
        }

        const matchedLead = leads.find(
          (l) =>
            editedPayload.attendeeEmail &&
            l.email.toLowerCase() ===
              editedPayload.attendeeEmail.toLowerCase()
        );

        // Dispatch Owner-Driven .ics Calendar Invite via Backend (Resend / Brevo / SMTP — No Employee Login Required!)
        const serverBookResp = await fetch('/api/calendar/book-agent-meeting', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: editedPayload.eventSummary || 'Property Showing',
            description: editedPayload.eventDescription || '',
            propertyTitle:
              matchedLead?.propertyInterest ||
              properties[0]?.title ||
              'Luxury Listing',
            startIso,
            endIso,
            durationMinutes,
            agentId: chosenAgent?.id || 'agent-1',
            agentName: chosenAgent?.name || 'Victoria Sterling',
            agentEmail: chosenAgent?.email || '',
            agentPhone: chosenAgent?.phone || '',
            leadId: matchedLead?.id,
            leadName:
              matchedLead?.name || editedPayload.attendeeEmail || 'Buyer',
            leadEmail: editedPayload.attendeeEmail || '',
          }),
        });
        const serverBookData = await serverBookResp.json();
        if (!serverBookResp.ok || !serverBookData.ok) {
          throw new Error(
            serverBookData.error || 'Failed to schedule showing on master calendar.'
          );
        }

        // If the brokerage owner also connected their own Google OAuth token, sync to their master calendar too
        let finalLink = serverBookData.htmlLink;
        if (googleToken) {
          try {
            const gRes = await createCalendarShowingEvent({
              accessToken: googleToken,
              summary: editedPayload.eventSummary,
              description: editedPayload.eventDescription,
              startIso,
              endIso,
              attendeeEmails: [
                ...(chosenAgent?.email ? [chosenAgent.email] : []),
                ...(editedPayload.attendeeEmail
                  ? [editedPayload.attendeeEmail]
                  : []),
              ],
              calendarId: 'primary',
            });
            if (gRes.htmlLink) finalLink = gRes.htmlLink;
          } catch {
            // Keep server .ics invite link
          }
        }

        const newMeetingRecord: ScheduledMeetingRecord = {
          id: serverBookData.meeting?.id || `mtg-${Date.now()}`,
          title: editedPayload.eventSummary || 'Property Showing',
          startIso,
          endIso,
          durationMinutes,
          agentId: chosenAgent?.id || 'agent-1',
          agentName: chosenAgent?.name || 'Victoria Sterling',
          agentEmail: chosenAgent?.email || '',
          calendarId: chosenAgent?.email || 'brokerage-master',
          leadId: matchedLead?.id,
          leadName: matchedLead?.name || editedPayload.attendeeEmail || 'Buyer',
          leadEmail: editedPayload.attendeeEmail || '',
          propertyTitle:
            matchedLead?.propertyInterest ||
            properties[0]?.title ||
            'Luxury Listing',
          source: serverBookData.meeting?.source || 'Master Schedule (.ics Invite)',
          htmlLink: finalLink,
        };
        setScheduledMeetings((prev) => [newMeetingRecord, ...prev]);

        if (matchedLead) {
          setLeads((prev) =>
            prev.map((l) =>
              l.id === matchedLead.id
                ? {
                    ...l,
                    status: 'Tour Scheduled',
                    lastContacted: 'Tour Scheduled just now',
                  }
                : l
            )
          );
        }

        appendBotLog({
          employeeId: 'maya',
          category: 'CALENDAR_SYNC',
          status: 'SUCCESS',
          title: `Showing Assigned to ${chosenAgent?.name}: ${editedPayload.eventSummary}`,
          detail: `${serverBookData.dispatchedSummary}. Invite Link: ${finalLink}`,
          channelOrTool: 'Calendar Invite (.ics)',
        });

        const confirmMsg: EmployeeChatMessage = {
          id: `ws-${Date.now()}`,
          sender: 'employee',
          text: `✅ Conflict check passed! Assigned showing "${editedPayload.eventSummary}" to human agent ${chosenAgent?.name || 'Agent'} (${chosenAgent?.email || ''}) and buyer ${editedPayload.attendeeEmail || ''}. ${serverBookData.dispatchedSummary}.`,
          timestamp: 'Just now',
          actionBadge: 'Calendar Invite Dispatched',
        };
        setChatHistories((prev) => ({
          ...prev,
          [activeEmployee.id]: [...(prev[activeEmployee.id] || []), confirmMsg],
        }));
      }
      setPendingWorkspaceAction(null);
    } catch (err: any) {
      const failMsg: EmployeeChatMessage = {
        id: `ws-err-${Date.now()}`,
        sender: 'employee',
        text: `❌ Action Failed: ${err?.message || 'Could not complete API call. Connect your Google Account via OAuth or Gmail App Password first.'}`,
        timestamp: 'Just now',
      };
      setChatHistories((prev) => ({
        ...prev,
        [activeEmployee.id]: [...(prev[activeEmployee.id] || []), failMsg],
      }));
      setPendingWorkspaceAction(null);
    } finally {
      setIsExecutingWorkspace(false);
    }
  };

  // ============================================================================
  // LIVE VOICE CALL RECEPTIONIST (Attend Calls + Speech Recognition + Auto-CRM)
  // ============================================================================
  const speakTextAloud = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.02;
    utterance.pitch = 1.0;
    utterance.onstart = () => setIsAiSpeaking(true);
    utterance.onend = () => setIsAiSpeaking(false);
    utterance.onerror = () => setIsAiSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const startLiveVoiceCall = () => {
    setSelectedEmployeeId('clara');
    setActiveTab('chat');
    setIsCallActive(true);
    const newLeadId = `call-lead-${Date.now()}`;
    setCallerDraft({
      leadId: newLeadId,
      callerName: '',
      callerPhone: '',
      callerEmail: '',
      budget: '',
      timeline: '',
      propertyInterest: '',
      qualificationScore: 80,
    });
    const greeting =
      'Hello! Thank you for calling Atelier Estate. This is Clara, the AI Receptionist. Are you calling about one of our properties or looking to schedule a showing?';
    setCallTranscript([
      {
        id: `line-${Date.now()}`,
        speaker: 'AI Receptionist',
        text: greeting,
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      },
    ]);
    speakTextAloud(greeting);
  };

  const endLiveVoiceCall = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsListeningMic(false);
    setIsAiSpeaking(false);
    setIsCallActive(false);
  };

  const handleSendVoiceUtterance = async (utteranceText: string) => {
    const cleanText = utteranceText.trim();
    if (!cleanText) return;

    const callerLine: CallTranscriptLine = {
      id: `caller-${Date.now()}`,
      speaker: 'Caller',
      text: cleanText,
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    const updatedTranscript = [...callTranscript, callerLine];
    setCallTranscript(updatedTranscript);
    setVoiceInputText('');

    try {
      const resp = await fetch('/api/ai/voice-call', {
        method: 'POST',
        headers: getAiRequestHeaders(),
        body: JSON.stringify({
          employeeName: activeEmployee.name,
          employeeRole: activeEmployee.role,
          callerUtterance: cleanText,
          callTranscript: updatedTranscript,
          propertiesContext: properties.map((p) => ({
            title: p.title,
            address: p.address,
            neighborhood: p.neighborhood,
            price: p.priceFormatted,
            beds: p.beds,
            baths: p.baths,
            status: p.status,
          })),
          currentCallerDraft: callerDraft,
        }),
      });

      const aiCall = await resp.json();
      const aiLine: CallTranscriptLine = {
        id: `ai-${Date.now()}`,
        speaker: 'AI Receptionist',
        text: aiCall.spokenReply || 'I have noted that down for you.',
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };

      setCallTranscript((prev) => [...prev, aiLine]);
      speakTextAloud(aiLine.text);

      // Merge extracted caller info & auto-upsert into Leads & Clients Database!
      const mergedDraft = {
        leadId: callerDraft.leadId || `call-lead-${Date.now()}`,
        callerName:
          aiCall.callerName || callerDraft.callerName || 'Live Phone Caller',
        callerPhone:
          aiCall.callerPhone ||
          callerDraft.callerPhone ||
          '+1 (Incoming Call)',
        callerEmail:
          aiCall.callerEmail ||
          callerDraft.callerEmail ||
          'caller@phone-lead.com',
        budget: aiCall.budget || callerDraft.budget || 'TBD',
        timeline: aiCall.timeline || callerDraft.timeline || 'Immediate',
        propertyInterest:
          aiCall.propertyInterest ||
          callerDraft.propertyInterest ||
          properties[0]?.title ||
          'General Inquiry',
        qualificationScore:
          aiCall.qualificationScore || callerDraft.qualificationScore || 85,
      };
      setCallerDraft(mergedDraft);

      // Upsert into Leads Database automatically
      setLeads((prev) => {
        const exists = prev.some((l) => l.id === mergedDraft.leadId);
        const upsertedLead: ClientLead = {
          id: mergedDraft.leadId,
          name: mergedDraft.callerName,
          email: mergedDraft.callerEmail,
          phone: mergedDraft.callerPhone,
          source: 'Live Voice Call',
          budget: mergedDraft.budget,
          timeline: mergedDraft.timeline,
          propertyInterest: mergedDraft.propertyInterest,
          qualificationScore: mergedDraft.qualificationScore,
          status: aiCall.tourRequested ? 'Tour Scheduled' : 'AI Qualified',
          assignedEmployeeId: activeEmployee.id,
          lastContacted: 'Live Call (Active)',
          notes:
            aiCall.callSummaryNote ||
            `Captured automatically during live voice call with ${activeEmployee.name}.`,
        };
        if (exists) {
          return prev.map((l) =>
            l.id === mergedDraft.leadId ? upsertedLead : l
          );
        }
        return [upsertedLead, ...prev];
      });
    } catch {
      // fallback
    }
  };

  const toggleMicrophoneRecognition = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      return;
    }

    if (isListeningMic && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListeningMic(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListeningMic(true);
    recognition.onend = () => setIsListeningMic(false);
    recognition.onerror = () => setIsListeningMic(false);
    recognition.onresult = (event: any) => {
      const spoken = event.results?.[0]?.[0]?.transcript;
      if (spoken) {
        handleSendVoiceUtterance(spoken);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  // ============================================================================
  // CREATE, EDIT & DELETE AI EMPLOYEES (BOTS)
  // ============================================================================
  const openCreateBotModal = () => {
    setEditingBotId(null);
    setNewBotName('');
    setNewBotRole('');
    setNewBotSpecialty('');
    setNewBotPrompt('');
    setNewBotModalOpen(true);
  };

  const openEditBotModal = (emp: AIEmployee) => {
    setEditingBotId(emp.id);
    setNewBotName(emp.name);
    setNewBotRole(emp.role);
    setNewBotSpecialty(emp.specialty);
    setNewBotPrompt(emp.systemPrompt || '');
    setNewBotModalOpen(true);
  };

  const handleDeleteBot = (botId: string) => {
    if (employees.length <= 1) {
      return;
    }
    const target = employees.find((e) => e.id === botId);
    const remaining = employees.filter((e) => e.id !== botId);
    setEmployees(remaining);
    if (selectedEmployeeId === botId && remaining[0]) {
      setSelectedEmployeeId(remaining[0].id);
    }
    if (target) {
      appendBotLog({
        employeeId: remaining[0]?.id || 'clara',
        category: 'SYSTEM',
        status: 'WARNING',
        title: `Removed AI Employee: ${target.name}`,
        detail: `Deleted AI Employee "${target.name}" (${target.role}) from workspace roster.`,
        channelOrTool: 'AI Workforce Roster',
      });
    }
  };

  const handleCreateBot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBotName.trim() || !newBotRole.trim()) return;
    const initials = newBotName
      .trim()
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    if (editingBotId) {
      setEmployees((prev) =>
        prev.map((emp) =>
          emp.id === editingBotId
            ? {
                ...emp,
                name: newBotName.trim(),
                role: newBotRole.trim(),
                title: newBotRole.trim(),
                avatarInitials: initials || emp.avatarInitials,
                specialty:
                  newBotSpecialty.trim() ||
                  'Real Estate Operations & Client Support',
                systemPrompt:
                  newBotPrompt.trim() ||
                  `You are ${newBotName.trim()}, ${newBotRole.trim()} at Atelier Estate. Help manage leads, properties, emails, and calls.`,
              }
            : emp
        )
      );
      appendBotLog({
        employeeId: editingBotId,
        employeeName: newBotName.trim(),
        employeeRole: newBotRole.trim(),
        category: 'SYSTEM',
        status: 'SUCCESS',
        title: `Updated AI Employee: ${newBotName.trim()}`,
        detail: `Role: ${newBotRole.trim()} · Specialty: ${newBotSpecialty.trim()}`,
        channelOrTool: 'AI Workforce Roster',
      });
    } else {
      const id = `bot_${Date.now()}`;
      const newEmp: AIEmployee = {
        id,
        name: newBotName.trim(),
        role: newBotRole.trim(),
        title: newBotRole.trim(),
        specialty:
          newBotSpecialty.trim() || 'Real Estate Operations & Client Support',
        avatarInitials: initials || 'AI',
        accentColor: '#0F172A',
        status: 'active',
        currentAction: 'Ready for instructions',
        metrics: { actionsToday: 0, responseTime: '0.8s' },
        connectedTools: ['gmail', 'google_calendar', 'google_maps', 'whatsapp'],
        samplePrompts: [
          `Add a new lead to our CRM database`,
          `Draft a follow-up email for our top buyer lead`,
          `Search nearby comps and schools on Google Maps`,
        ],
        systemPrompt:
          newBotPrompt.trim() ||
          `You are ${newBotName.trim()}, ${newBotRole.trim()} at Atelier Estate. Help manage leads, properties, emails, and calls.`,
      };
      setEmployees((prev) => [...prev, newEmp]);
      setChatHistories((prev) => ({
        ...prev,
        [id]: [
          {
            id: `welcome-${id}`,
            sender: 'employee',
            text: `Hello! I'm ${newEmp.name}, your new ${newEmp.role}. How can I help your brokerage today?`,
            timestamp: 'Just now',
          },
        ],
      }));
      setSelectedEmployeeId(id);
    }

    setEditingBotId(null);
    setNewBotName('');
    setNewBotRole('');
    setNewBotSpecialty('');
    setNewBotPrompt('');
    setNewBotModalOpen(false);
  };

  // ============================================================================
  // PROPERTIES DATABASE CRUD HANDLERS
  // ============================================================================
  const openAddPropertyModal = () => {
    setEditingProperty(null);
    setPropForm({
      title: '',
      address: '',
      neighborhood: '',
      priceFormatted: '$3,500,000',
      price: 3500000,
      beds: 4,
      baths: 4,
      sqft: '3,200',
      status: 'Active',
      HighlightTag: 'Exclusive Listing',
    });
    setPropertyModalOpen(true);
  };

  const openEditPropertyModal = (prop: PropertyListing) => {
    setEditingProperty(prop);
    setPropForm({
      title: prop.title,
      address: prop.address,
      neighborhood: prop.neighborhood,
      priceFormatted: prop.priceFormatted,
      price: prop.price,
      beds: prop.beds,
      baths: prop.baths,
      sqft: prop.sqft,
      status: prop.status,
      HighlightTag: prop.HighlightTag,
    });
    setPropertyModalOpen(true);
  };

  const handleSaveProperty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!propForm.title.trim()) return;
    const numericPrice =
      Number(String(propForm.priceFormatted).replace(/[^0-9]/g, '')) || 1000000;

    if (editingProperty) {
      setProperties((prev) =>
        prev.map((p) =>
          p.id === editingProperty.id
            ? {
                ...p,
                ...propForm,
                price: numericPrice,
              }
            : p
        )
      );
    } else {
      const newListing: PropertyListing = {
        id: `prop-${Date.now()}`,
        title: propForm.title.trim(),
        address: propForm.address.trim() || '100 Park Avenue',
        neighborhood: propForm.neighborhood.trim() || 'Prime District',
        price: numericPrice,
        priceFormatted: propForm.priceFormatted.trim() || '$3,500,000',
        beds: Number(propForm.beds) || 3,
        baths: Number(propForm.baths) || 3,
        sqft: propForm.sqft || '2,500',
        status: propForm.status,
        image: properties[0]?.image || '',
        HighlightTag: propForm.HighlightTag || 'New Listing',
        showingSlots: ['Sat 1:00 PM', 'Sun 3:00 PM'],
      };
      setProperties((prev) => [newListing, ...prev]);
    }
    setPropertyModalOpen(false);
  };

  const handleDeleteProperty = (id: string) => {
    setProperties((prev) => prev.filter((p) => p.id !== id));
  };

  // ============================================================================
  // LEADS & CLIENTS DATABASE CRUD HANDLERS
  // ============================================================================
  const openAddLeadModal = () => {
    setEditingLead(null);
    setLeadForm({
      name: '',
      email: '',
      phone: '',
      source: 'Manual',
      budget: '$4.5M',
      timeline: '30 Days',
      propertyInterest: properties[0]?.title || '',
      status: 'AI Qualified',
      qualificationScore: 88,
      notes: '',
    });
    setLeadModalOpen(true);
  };

  const openEditLeadModal = (lead: ClientLead) => {
    setEditingLead(lead);
    setLeadForm({
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      source: lead.source,
      budget: lead.budget,
      timeline: lead.timeline,
      propertyInterest: lead.propertyInterest,
      status: lead.status,
      qualificationScore: lead.qualificationScore,
      notes: lead.notes,
    });
    setLeadModalOpen(true);
  };

  const handleSaveLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadForm.name.trim()) return;

    if (editingLead) {
      setLeads((prev) =>
        prev.map((l) =>
          l.id === editingLead.id
            ? {
                ...l,
                ...leadForm,
                lastContacted: 'Updated just now',
              }
            : l
        )
      );
    } else {
      const created: ClientLead = {
        id: `lead-${Date.now()}`,
        name: leadForm.name.trim(),
        email: leadForm.email.trim() || 'client@email.com',
        phone: leadForm.phone.trim() || '+1 (555) 000-0000',
        source: leadForm.source,
        budget: leadForm.budget.trim() || '$3.0M',
        timeline: leadForm.timeline.trim() || '30 Days',
        propertyInterest:
          leadForm.propertyInterest.trim() ||
          properties[0]?.title ||
          'General Portfolio',
        qualificationScore: Number(leadForm.qualificationScore) || 85,
        status: leadForm.status,
        assignedEmployeeId: activeEmployee.id,
        lastContacted: 'Added just now',
        notes: leadForm.notes.trim() || 'Added to CRM.',
      };
      setLeads((prev) => [created, ...prev]);
    }
    setLeadModalOpen(false);
  };

  const handleDeleteLead = (id: string) => {
    setLeads((prev) => prev.filter((l) => l.id !== id));
  };

  // ============================================================================
  // REMINDERS & SCHEDULED FOLLOW-UP HANDLERS
  // ============================================================================
  const openScheduleReminderModal = (lead?: ClientLead) => {
    const targetLead = lead || leads[0];
    setReminderForm({
      leadId: targetLead?.id || `lead-${Date.now()}`,
      leadName: targetLead?.name || '',
      leadEmail: targetLead?.email || '',
      propertyInterest:
        targetLead?.propertyInterest ||
        properties[0]?.title ||
        'Portfolio Inquiry',
      taskTitle: targetLead
        ? `Follow up with ${targetLead.name} regarding ${targetLead.propertyInterest}`
        : 'Client follow-up call & brochure dispatch',
      duePreset: '1hour',
      customDueIso: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
      channel: 'Email',
      assignedEmployeeId: targetLead?.assignedEmployeeId || 'elena',
    });
    setReminderModalOpen(true);
  };

  const handleSaveReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reminderForm.taskTitle.trim() || !reminderForm.leadName.trim()) return;

    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'default'
    ) {
      Notification.requestPermission().catch(() => {});
    }

    let dueDate = new Date(Date.now() + 3600000);
    let dueLabel = 'In 1 Hour';

    if (reminderForm.duePreset === '15sec') {
      dueDate = new Date(Date.now() + 15000);
      dueLabel = 'Due in 15s (Live Alert)';
    } else if (reminderForm.duePreset === '1hour') {
      dueDate = new Date(Date.now() + 3600000);
      dueLabel = `Today · ${dueDate.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
    } else if (reminderForm.duePreset === 'tomorrow10am') {
      const tom = new Date(Date.now() + 86400000);
      tom.setHours(10, 0, 0, 0);
      dueDate = tom;
      dueLabel = 'Tomorrow · 10:00 AM';
    } else if (reminderForm.customDueIso) {
      const parsed = new Date(reminderForm.customDueIso);
      if (!isNaN(parsed.getTime())) {
        dueDate = parsed;
        dueLabel = parsed.toLocaleString([], {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      }
    }

    const newReminder: LeadReminder = {
      id: `rem-${Date.now()}`,
      leadId: reminderForm.leadId,
      leadName: reminderForm.leadName.trim(),
      leadEmail: reminderForm.leadEmail.trim() || 'client@email.com',
      propertyInterest:
        reminderForm.propertyInterest.trim() || 'Portfolio Inquiry',
      taskTitle: reminderForm.taskTitle.trim(),
      dueAt: dueDate.toISOString(),
      dueLabel,
      channel: reminderForm.channel,
      assignedEmployeeId: reminderForm.assignedEmployeeId,
      completed: false,
      notified: false,
      createdAt: new Date().toISOString(),
    };

    setReminders((prev) => [newReminder, ...prev]);
    setReminderModalOpen(false);
    setLeadsSubTab('dashboard');
  };

  const handleToggleReminderComplete = (id: string) => {
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, completed: !r.completed } : r))
    );
  };

  const handleDeleteReminder = (id: string) => {
    setReminders((prev) => prev.filter((r) => r.id !== id));
  };

  const handleRunReminderWithAi = (rem: LeadReminder) => {
    setSelectedEmployeeId(rem.assignedEmployeeId || 'elena');
    setActiveTab('chat');
    setReminders((prev) =>
      prev.map((r) => (r.id === rem.id ? { ...r, completed: true } : r))
    );
    handleSendChat(
      `Execute scheduled follow-up task for ${rem.leadName} (${rem.leadEmail}) via ${rem.channel}: "${rem.taskTitle}" regarding "${rem.propertyInterest}".`
    );
  };

  // ============================================================================
  // HUMAN REAL ESTATE AGENTS & DIRECT CALENDAR SYNC HANDLERS
  // ============================================================================
  const handleAddOrEditHumanAgent = (agent: HumanAgent, isEdit: boolean) => {
    setHumanAgents((prev) =>
      isEdit
        ? prev.map((a) => (a.id === agent.id ? agent : a))
        : [agent, ...prev]
    );
    appendBotLog({
      employeeId: 'aria',
      category: 'HUMAN_AGENT_HANDOFF',
      status: 'SUCCESS',
      title: `${isEdit ? 'Updated' : 'Added'} Human Agent: ${agent.name}`,
      detail: `${agent.role} (${agent.email}, ${agent.phone}) · Calendar ID: ${agent.calendarId}`,
      channelOrTool: 'Human Agents Roster',
    });
  };

  const handleDeleteHumanAgent = (id: string) => {
    setHumanAgents((prev) => prev.filter((a) => a.id !== id));
  };

  const handleConnectAgentCalendarOAuth = async (agent: HumanAgent) => {
    let connectedEmail = googleEmail;
    let token = googleToken;
    if (!token) {
      const auth = await connectGoogleWorkspace();
      setGoogleEmail(auth.userEmail);
      setGoogleToken(auth.accessToken);
      connectedEmail = auth.userEmail;
      token = auth.accessToken;
    }
    setHumanAgents((prev) =>
      prev.map((a) =>
        a.id === agent.id
          ? {
              ...a,
              calendarConnected: true,
              calendarId: a.calendarId || connectedEmail || a.email,
              calendarSyncMode: 'google_oauth',
              lastContactedByAi: 'Calendar OAuth Connected just now',
            }
          : a
      )
    );
    appendBotLog({
      employeeId: 'maya',
      category: 'CALENDAR_SYNC',
      status: 'SUCCESS',
      title: `Connected Human Agent Calendar: ${agent.name}`,
      detail: `Linked ${agent.calendarId || agent.email} with live Google Calendar OAuth (${connectedEmail}).`,
      channelOrTool: 'Google Calendar',
    });
  };

  const handleContactHumanAgentWithBot = async (params: {
    agent: HumanAgent;
    lead?: ClientLead;
    channel: 'Email' | 'SMS' | 'WhatsApp';
    subject: string;
    message: string;
  }) => {
    const { agent, channel, subject, message } = params;

    if (channel === 'Email') {
      if (googleToken) {
        const sent = await sendGmailMessage({
          accessToken: googleToken,
          to: agent.email,
          subject,
          body: message,
        });
        appendBotLog({
          employeeId: 'elena',
          category: 'HUMAN_AGENT_HANDOFF',
          status: 'SUCCESS',
          title: `Emailed Human Agent: ${agent.name}`,
          detail: `Sent "${subject}" to ${agent.email} (Gmail Message ID: ${sent.id})`,
          channelOrTool: 'Gmail OAuth 2.0',
        });
      } else if (gmailSmtpVerified) {
        const resp = await fetch('/api/email/send-smtp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: agent.email,
            subject,
            body: message,
          }),
        });
        const data = await resp.json();
        if (!resp.ok || !data.ok) {
          throw new Error(data.error || 'Failed to send SMTP email to agent');
        }
        appendBotLog({
          employeeId: 'elena',
          category: 'HUMAN_AGENT_HANDOFF',
          status: 'SUCCESS',
          title: `Emailed Human Agent: ${agent.name}`,
          detail: `Sent "${subject}" to ${agent.email} via SMTP (ID: ${data.id})`,
          channelOrTool: 'Gmail SMTP',
        });
      } else {
        throw new Error(
          'Connect your Gmail account (Google OAuth or 16-character App Password) in Connected Apps -> Gmail to email human agents.'
        );
      }
    } else {
      const chId: ToolId = channel === 'SMS' ? 'telnyx' : 'whatsapp';
      const toolObj = tools.find((t) => t.id === chId);
      const resp = await fetch('/api/channels/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: chId,
          recipient: channel === 'SMS' ? agent.phone : agent.whatsapp,
          messageBody: message,
          webhookUrl: toolObj?.webhookUrl || '',
        }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.ok) {
        appendBotLog({
          employeeId: 'clara',
          category: 'HUMAN_AGENT_HANDOFF',
          status: 'ERROR',
          title: `${channel} to ${agent.name} Blocked`,
          detail: data.detail || `${chId} not connected.`,
          channelOrTool: channel,
        });
        throw new Error(data.detail || `${channel} dispatch failed`);
      }
      appendBotLog({
        employeeId: 'clara',
        category: 'HUMAN_AGENT_HANDOFF',
        status: 'SUCCESS',
        title: `Dispatched ${channel} to Human Agent ${agent.name}`,
        detail: data.detail,
        channelOrTool: channel,
      });
    }

    setHumanAgents((prev) =>
      prev.map((a) =>
        a.id === agent.id
          ? {
              ...a,
              lastContactedByAi: `Just now via ${channel}`,
            }
          : a
      )
    );
  };

  // ============================================================================
  // MEETING SCHEDULING CONFLICT VALIDATION LAYER (Agent Google Calendar + Lead History)
  // ============================================================================
  const formatSlotRange = (startIso: string, endIso: string) => {
    const s = new Date(startIso);
    const e = new Date(endIso);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return startIso;
    const dateStr = s.toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    const startT = s.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    const endT = e.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${dateStr} · ${startT} – ${endT}`;
  };

  const handleValidateMeetingSchedule = async (params: {
    agentId: string;
    attendeeEmail: string;
    startIso: string;
    durationMinutes: number;
  }): Promise<MeetingValidationResult> => {
    const agent =
      humanAgents.find((a) => a.id === params.agentId) || humanAgents[0];
    const cleanLeadEmail = (params.attendeeEmail || '').trim().toLowerCase();
    const matchedLead = leads.find(
      (l) =>
        cleanLeadEmail && l.email.trim().toLowerCase() === cleanLeadEmail
    );

    const reqStartMs = new Date(params.startIso).getTime();
    const duration = Number(params.durationMinutes) || 45;
    const reqEndMs = reqStartMs + duration * 60000;
    const reqEndIso = new Date(reqEndMs).toISOString();

    const conflicts: MeetingConflictItem[] = [];
    const warnings: string[] = [];

    // 1. Check Live Connected Google Calendar of the Assigned Agent (when Google OAuth token is active)
    const gcalCheck = await checkGoogleCalendarConflicts({
      accessToken: googleToken,
      calendarId: agent?.calendarId || 'primary',
      startIso: params.startIso,
      endIso: reqEndIso,
    });

    for (const gEv of gcalCheck.conflicts) {
      conflicts.push({
        id: `gcal-conflict-${gEv.id}`,
        source: 'Agent Google Calendar',
        title: gEv.summary,
        startIso: gEv.startIso,
        endIso: gEv.endIso,
        formattedTime: formatSlotRange(gEv.startIso, gEv.endIso),
        detail: `Live conflict on ${agent.name}’s connected Google Calendar (${gEv.calendarId}).`,
      });
    }

    // 2. Check Assigned Agent's Scheduled Meetings & Lead's Scheduled Tour History
    for (const mtg of scheduledMeetings) {
      const mStart = new Date(mtg.startIso).getTime();
      const mEnd = new Date(mtg.endIso).getTime();
      if (isNaN(mStart) || isNaN(mEnd)) continue;

      const overlaps = mStart < reqEndMs && mEnd > reqStartMs;
      if (!overlaps) continue;

      const isSameAgent =
        mtg.agentId === agent.id ||
        (mtg.calendarId &&
          agent.calendarId &&
          mtg.calendarId.toLowerCase() === agent.calendarId.toLowerCase());
      const isSameLead =
        (cleanLeadEmail &&
          mtg.leadEmail.trim().toLowerCase() === cleanLeadEmail) ||
        (matchedLead && mtg.leadId === matchedLead.id);

      if (isSameAgent) {
        conflicts.push({
          id: `agent-mtg-${mtg.id}`,
          source: 'Assigned Agent Schedule',
          title: mtg.title,
          startIso: mtg.startIso,
          endIso: mtg.endIso,
          formattedTime: formatSlotRange(mtg.startIso, mtg.endIso),
          detail: `${agent.name} is already booked for "${mtg.propertyTitle}" with ${mtg.leadName}.`,
        });
      }

      if (isSameLead && !isSameAgent) {
        conflicts.push({
          id: `lead-mtg-${mtg.id}`,
          source: 'Lead History',
          title: mtg.title,
          startIso: mtg.startIso,
          endIso: mtg.endIso,
          formattedTime: formatSlotRange(mtg.startIso, mtg.endIso),
          detail: `Lead ${matchedLead?.name || cleanLeadEmail} already has an overlapping tour scheduled with ${mtg.agentName}.`,
        });
      }
    }

    // 3. Check Lead's Scheduled Reminders & Tour Tasks in Lead History
    for (const rem of reminders) {
      if (rem.completed) continue;
      const isThisLead =
        (matchedLead && rem.leadId === matchedLead.id) ||
        (cleanLeadEmail &&
          rem.leadEmail.trim().toLowerCase() === cleanLeadEmail);
      if (!isThisLead) continue;

      const remStartMs = new Date(rem.dueAt).getTime();
      if (isNaN(remStartMs)) continue;
      const remEndMs = remStartMs + 45 * 60000;

      if (remStartMs < reqEndMs && remEndMs > reqStartMs) {
        conflicts.push({
          id: `lead-rem-${rem.id}`,
          source: 'Lead History',
          title: `Scheduled ${rem.channel}: ${rem.taskTitle}`,
          startIso: new Date(remStartMs).toISOString(),
          endIso: new Date(remEndMs).toISOString(),
          formattedTime: formatSlotRange(
            new Date(remStartMs).toISOString(),
            new Date(remEndMs).toISOString()
          ),
          detail: `${rem.leadName}’s CRM engagement history already has an active ${rem.channel} commitment at this time.`,
        });
      }
    }

    // 4. Check Lead Notes & Agent Availability Window Advisory Warnings
    const reqHour = new Date(reqStartMs).getHours();
    if (reqHour < 8 || reqHour >= 20) {
      warnings.push(
        `Selected time is outside ${agent.name}’s standard showing hours (${agent.availability}).`
      );
    }
    if (matchedLead?.notes) {
      const lowerNotes = matchedLead.notes.toLowerCase();
      if (lowerNotes.includes('morning') && reqHour >= 13) {
        warnings.push(
          `Lead history note indicates ${matchedLead.name} prefers morning showings.`
        );
      } else if (lowerNotes.includes('twilight') && reqHour < 15) {
        warnings.push(
          `Lead history note indicates ${matchedLead.name} requested a late-afternoon / twilight tour.`
        );
      }
    }

    // 5. Compute 3 Conflict-Free Suggested Time Slots if any conflict was detected
    const suggestedSlots: { label: string; startIso: string }[] = [];
    if (conflicts.length > 0) {
      const candidateOffsetsMinutes = [90, 180, 1440, 1560, 2880];
      for (const offsetMin of candidateOffsetsMinutes) {
        if (suggestedSlots.length >= 3) break;
        const candStartMs = reqStartMs + offsetMin * 60000;
        const candDate = new Date(candStartMs);
        if (candDate.getHours() < 9) {
          candDate.setHours(10, 0, 0, 0);
        } else if (candDate.getHours() >= 19) {
          candDate.setDate(candDate.getDate() + 1);
          candDate.setHours(11, 0, 0, 0);
        }
        const adjStartMs = candDate.getTime();
        const adjEndMs = adjStartMs + duration * 60000;

        const hasLocalOverlap = scheduledMeetings.some((m) => {
          const mS = new Date(m.startIso).getTime();
          const mE = new Date(m.endIso).getTime();
          const relevant =
            m.agentId === agent.id ||
            (cleanLeadEmail &&
              m.leadEmail.trim().toLowerCase() === cleanLeadEmail);
          return relevant && mS < adjEndMs && mE > adjStartMs;
        });

        const iso = candDate.toISOString();
        if (
          !hasLocalOverlap &&
          !suggestedSlots.some((s) => s.startIso === iso)
        ) {
          suggestedSlots.push({
            label: candDate.toLocaleString([], {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
            startIso: iso,
          });
        }
      }
    }

    return {
      valid: conflicts.length === 0,
      checkedGoogleCalendarLive: gcalCheck.checkedLive,
      agentName: agent.name,
      agentCalendarId: agent.calendarId || agent.email,
      leadName: matchedLead?.name || params.attendeeEmail || 'Client Lead',
      conflicts,
      warnings,
      suggestedSlots,
    };
  };

  const handleScheduleMeetingOnAgentCalendar = async (params: {
    agent: HumanAgent;
    leadEmail: string;
    leadName: string;
    propertyTitle: string;
    meetingTitle: string;
    startIso: string;
    durationMinutes: number;
    notes: string;
  }) => {
    const {
      agent,
      leadEmail,
      leadName,
      propertyTitle,
      meetingTitle,
      startIso,
      durationMinutes,
      notes,
    } = params;

    // Validate across Agent's Google Calendar & Lead's History before allowing creation
    const validation = await handleValidateMeetingSchedule({
      agentId: agent.id,
      attendeeEmail: leadEmail,
      startIso,
      durationMinutes,
    });

    if (!validation.valid) {
      appendBotLog({
        employeeId: 'maya',
        category: 'CALENDAR_SYNC',
        status: 'ERROR',
        title: `Meeting Blocked by Conflict Guard: ${meetingTitle}`,
        detail: `Detected conflict: ${validation.conflicts
          .map((c) => `${c.title} (${c.formattedTime})`)
          .join('; ')}`,
        channelOrTool: 'Conflict Validator',
      });
      throw new Error(
        `Time conflict detected: ${validation.conflicts
          .map((c) => `${c.title} (${c.formattedTime})`)
          .join('; ')}`
      );
    }

    const endIso = new Date(
      new Date(startIso).getTime() + (durationMinutes || 45) * 60000
    ).toISOString();

    const matchedLead = leads.find(
      (l) => l.email.toLowerCase() === leadEmail.toLowerCase()
    );

    // Owner-Driven .ics Calendar Invite Dispatch via Backend (No Employee OAuth Required!)
    const serverBookResp = await fetch('/api/calendar/book-agent-meeting', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: meetingTitle,
        description: notes,
        propertyTitle,
        startIso,
        endIso,
        durationMinutes: durationMinutes || 45,
        agentId: agent.id,
        agentName: agent.name,
        agentEmail: agent.email,
        agentPhone: agent.phone,
        leadId: matchedLead?.id,
        leadName,
        leadEmail,
      }),
    });
    const serverBookData = await serverBookResp.json();
    if (!serverBookResp.ok || !serverBookData.ok) {
      throw new Error(
        serverBookData.error || 'Could not book meeting on master schedule.'
      );
    }

    let finalLink = serverBookData.htmlLink;
    if (googleToken) {
      try {
        const created = await createCalendarShowingEvent({
          accessToken: googleToken,
          summary: meetingTitle,
          description: notes,
          startIso,
          endIso,
          attendeeEmails: [agent.email, leadEmail],
          calendarId: 'primary',
        });
        if (created.htmlLink) finalLink = created.htmlLink;
      } catch {
        // Keep server .ics invite link
      }
    }

    const newMeetingRecord: ScheduledMeetingRecord = {
      id: serverBookData.meeting?.id || `mtg-${Date.now()}`,
      title: meetingTitle,
      startIso,
      endIso,
      durationMinutes: durationMinutes || 45,
      agentId: agent.id,
      agentName: agent.name,
      agentEmail: agent.email,
      calendarId: agent.email,
      leadId: matchedLead?.id,
      leadName,
      leadEmail,
      propertyTitle,
      source: serverBookData.meeting?.source || 'Master Schedule (.ics Invite)',
      htmlLink: finalLink,
    };
    setScheduledMeetings((prev) => [newMeetingRecord, ...prev]);

    if (matchedLead) {
      setLeads((prev) =>
        prev.map((l) =>
          l.id === matchedLead.id
            ? {
                ...l,
                status: 'Tour Scheduled',
                lastContacted: 'Tour Scheduled just now',
              }
            : l
        )
      );
    }

    setHumanAgents((prev) =>
      prev.map((a) =>
        a.id === agent.id
          ? {
              ...a,
              calendarConnected: true,
              lastContactedByAi: `Showing assigned for ${leadName}`,
            }
          : a
      )
    );

    appendBotLog({
      employeeId: 'maya',
      category: 'CALENDAR_SYNC',
      status: 'SUCCESS',
      title: `Assigned Showing to ${agent.name}: ${meetingTitle}`,
      detail: `${serverBookData.dispatchedSummary}. Calendar Link: ${finalLink}`,
      channelOrTool: 'Calendar Invite (.ics)',
    });
  };

  // ============================================================================
  // AI LEAD ENGAGEMENT, SENTIMENT & RECOMMENDED NEXT STEPS ANALYZER
  // ============================================================================
  const handleAnalyzeLeadWithAi = async (lead: ClientLead) => {
    setAnalysisModalLeadId(lead.id);
    setAnalyzingLeadId(lead.id);
    setAnalysisError(null);

    const assignedAgent =
      humanAgents.find((a) => a.id === lead.assignedHumanAgentId) ||
      humanAgents[0];

    appendBotLog({
      employeeId: 'aria',
      employeeName: 'Aria Rostova',
      employeeRole: 'AI Chief of Staff & Lead Intelligence',
      category: 'AI_TASK',
      status: 'RUNNING',
      title: `Analyzing Lead with AI: ${lead.name}`,
      detail: `Inspecting chat logs, past emails, reminders, and CRM history for ${lead.name} (${lead.email}).`,
      channelOrTool: 'AI Lead Analyzer',
    });

    try {
      // 1. Gather relevant chat messages across all AI Employees mentioning this lead or their property
      const leadFirstName = lead.name.split(' ')[0].toLowerCase();
      const leadEmailLower = lead.email.toLowerCase();
      const leadPropLower = lead.propertyInterest.toLowerCase();

      const relevantChats: {
        employeeId: string;
        sender: string;
        text: string;
        timestamp: string;
      }[] = [];

      for (const [empId, msgs] of Object.entries(chatHistories)) {
        for (const m of msgs) {
          const lowerText = m.text.toLowerCase();
          if (
            lowerText.includes(leadFirstName) ||
            lowerText.includes(leadEmailLower) ||
            lowerText.includes(leadPropLower)
          ) {
            relevantChats.push({
              employeeId: empId,
              sender: m.sender,
              text: m.text,
              timestamp: m.timestamp,
            });
          }
        }
      }

      // 2. Gather relevant Bot Activity Logs (emails sent, website leads, calendar syncs, handoffs)
      const relevantBotLogs = botLogs.filter((b) => {
        const hay = `${b.title} ${b.detail}`.toLowerCase();
        return (
          hay.includes(leadFirstName) ||
          hay.includes(leadEmailLower) ||
          hay.includes(leadPropLower)
        );
      });

      // 3. Gather Past Emails (Live Gmail messages if OAuth token is connected + recorded email dispatches)
      const liveGmailThreads = googleToken
        ? await fetchGmailMessagesForLead(googleToken, lead.email, 5)
        : [];

      const loggedEmailEntries = relevantBotLogs
        .filter((b) => b.category === 'EMAIL_SENT')
        .map((b) => ({
          id: b.id,
          subject: b.title,
          snippet: b.detail,
          from: googleEmail || 'Atelier Estate Desk',
          date: b.timestamp,
        }));

      const combinedPastEmails = [
        ...liveGmailThreads,
        ...loggedEmailEntries,
        {
          id: `crm-initial-${lead.id}`,
          subject: `Initial ${lead.source} Inquiry: ${lead.propertyInterest}`,
          snippet: `${lead.name} (${lead.email}) inquired regarding ${lead.propertyInterest} with budget ${lead.budget} and timeline ${lead.timeline}. Notes: ${lead.notes}`,
          from: lead.email,
          date: lead.lastContacted,
        },
      ];

      // 4. Gather Scheduled Reminders for this Lead
      const leadReminders = reminders.filter(
        (r) =>
          r.leadId === lead.id ||
          r.leadEmail.toLowerCase() === leadEmailLower
      );

      const resp = await fetch('/api/ai/analyze-lead', {
        method: 'POST',
        headers: getAiRequestHeaders(),
        body: JSON.stringify({
          lead,
          assignedAgent,
          chatLogs: relevantChats,
          botLogs: relevantBotLogs,
          pastEmails: combinedPastEmails,
          reminders: leadReminders,
        }),
      });

      const data = await resp.json();
      if (!resp.ok || !data.ok || !data.analysis) {
        throw new Error(
          data.error ||
            'Could not generate AI Lead Analysis. Check your LLM API Key in BYOK Keys.'
        );
      }

      const analysis: LeadAiAnalysis = data.analysis;

      setLeads((prev) =>
        prev.map((l) =>
          l.id === lead.id
            ? {
                ...l,
                aiAnalysis: analysis,
              }
            : l
        )
      );

      appendBotLog({
        employeeId: 'aria',
        employeeName: 'Aria Rostova',
        employeeRole: 'AI Chief of Staff & Lead Intelligence',
        category: 'AI_TASK',
        status: 'SUCCESS',
        title: `AI Lead Analysis Complete: ${lead.name} (${analysis.sentiment})`,
        detail: `${analysis.engagementSummary} [Sentiment Score: ${analysis.sentimentScore}/100]`,
        channelOrTool: analysis.providerUsed,
      });
    } catch (err: any) {
      const msg =
        err?.message ||
        'AI Lead Analysis failed. Please verify your API key in BYOK Keys.';
      setAnalysisError(msg);
      appendBotLog({
        employeeId: 'aria',
        category: 'AI_TASK',
        status: 'ERROR',
        title: `AI Lead Analysis Failed: ${lead.name}`,
        detail: msg,
        channelOrTool: 'AI Lead Analyzer',
      });
    } finally {
      setAnalyzingLeadId(null);
    }
  };

  const handleExecuteRecommendedLeadStep = (
    lead: ClientLead,
    step: LeadAiAnalysis['recommendedNextSteps'][number]
  ) => {
    setAnalysisModalLeadId(null);

    if (step.channel === 'Google Calendar Tour') {
      const assignedAgent =
        humanAgents.find((a) => a.id === lead.assignedHumanAgentId) ||
        humanAgents[0];
      const tomorrow2pm = new Date(Date.now() + 86400000);
      tomorrow2pm.setHours(14, 0, 0, 0);
      setPendingWorkspaceAction({
        type: 'calendar',
        employeeName: 'Maya Lin',
        eventSummary: `Private Showing: ${lead.propertyInterest} (${assignedAgent.name} & ${lead.name})`,
        eventDescription: `AI Recommended Next Step: ${step.step}\nLead: ${lead.name} (${lead.email}, ${lead.phone})\nBudget: ${lead.budget}`,
        eventStartIso: tomorrow2pm.toISOString(),
        eventDurationMinutes: 45,
        attendeeEmail: lead.email,
        assignedAgentId: assignedAgent.id,
      });
      return;
    }

    const targetBotId: EmployeeId =
      step.channel === 'Email'
        ? 'elena'
        : step.channel === 'Human Agent Handoff'
        ? 'marcus'
        : 'clara';
    setSelectedEmployeeId(targetBotId);
    setActiveTab('chat');
    handleSendChat(
      step.suggestedActionPrompt ||
        `Execute next step for ${lead.name} (${lead.email}) via ${step.channel}: ${step.step}`
    );
  };

  const connectedCount = tools.filter((t) => t.connected).length;
  const hasCustomLlmKey = Boolean(llmSettings.apiKey?.trim());

  const handleUnlockSuccess = (session: ActiveLicenseSession) => {
    setLicenseSession(session);
    localStorage.setItem('atelier_license_session_v1', JSON.stringify(session));
    setShowPublicLandingPage(false);
    if (session.role === 'ADMIN') {
      setActiveTab('b2b_portal');
    }
  };

  const handleLockSystemNow = () => {
    setLicenseSession(null);
    localStorage.removeItem('atelier_license_session_v1');
    setShowPublicLandingPage(true);
  };

  if (showPublicLandingPage || !licenseSession) {
    return (
      <LandingPageView
        onUnlockSuccess={handleUnlockSuccess}
        onEnquirySubmitted={(syncedLead) => {
          if (syncedLead && syncedLead.id) {
            setLeads((prev) =>
              prev.some((l) => l.id === syncedLead.id)
                ? prev
                : [
                    {
                      id: syncedLead.id,
                      name: syncedLead.name,
                      email: syncedLead.email,
                      phone: syncedLead.phone,
                      source: syncedLead.source || 'Landing Page Enquiry',
                      budget: syncedLead.budget || 'B2B Agency',
                      timeline: syncedLead.timeline || 'Immediate',
                      propertyInterest:
                        syncedLead.propertyInterest || 'Agency Automation',
                      qualificationScore: syncedLead.qualificationScore || 95,
                      status: 'Unqualified',
                      assignedEmployeeId: 'elena',
                      lastContacted: 'Submitted on Landing Page just now',
                      notes: syncedLead.notes || 'Landing Page Enquiry',
                    },
                    ...prev,
                  ]
            );
          }
        }}
      />
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-100 text-slate-900 flex font-sans antialiased">
      {/* ====================================================================
          LEFT SIDEBAR: BOTS AT LEFT + CONNECTED APPS & GMAIL AT BOTTOM-LEFT
          ==================================================================== */}
      <aside className="w-72 bg-slate-950 text-slate-100 border-r border-slate-800 flex flex-col justify-between shrink-0 select-none">
        {/* Top Brand + Sign Out */}
        <div className="px-4 py-3.5 border-b border-slate-800/80 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
              AE
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-white leading-tight truncate">
                Atelier Estate
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                {licenseSession.agencyName}
              </div>
            </div>
          </div>

          <button
            onClick={handleLockSystemNow}
            title="Sign Out & Lock Dashboard"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/70 text-slate-300 hover:text-rose-300 border border-slate-800 text-[11px] font-medium transition-colors cursor-pointer shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Clean 1-Click BYOK LLM API Key Card */}
        <div className="px-3 pt-3">
          <button
            onClick={() => {
              setOnboardingChannel('llm_engine');
              setOnboardingModalOpen(true);
            }}
            className="w-full p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800/90 border border-slate-800 flex items-center justify-between text-left transition-all group cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                <KeyRound className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white truncate flex items-center gap-1.5">
                  <span>BYOK LLM API Key</span>
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      hasCustomLlmKey ? 'bg-emerald-400' : 'bg-amber-400'
                    }`}
                  />
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  {activeProviderMeta.name} · {llmSettings.model}
                </div>
              </div>
            </div>
            <span className="px-2 py-1 rounded-md bg-amber-500/15 text-amber-300 text-[10px] font-semibold shrink-0 group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors">
              {hasCustomLlmKey ? 'Change' : 'Paste Key'}
            </span>
          </button>
        </div>

        {/* AI Employees List (Middle Scrollable — Full Add, Edit & Delete!) */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          <div>
            <div className="px-2 pb-2 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                AI Employees ({employees.length})
              </span>
              <button
                onClick={openCreateBotModal}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[10px] font-semibold transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Add Bot</span>
              </button>
            </div>
            <div className="space-y-1">
              {employees.map((emp) => {
                const isSelected = selectedEmployeeId === emp.id;
                const badgeClass =
                  AVATAR_BADGE_COLORS[emp.id] || 'bg-slate-700 text-white';
                return (
                  <div
                    key={emp.id}
                    className={`group flex items-center justify-between gap-1 px-2.5 py-2 rounded-xl transition-all ${
                      isSelected
                        ? 'bg-white text-slate-950 shadow-sm'
                        : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedEmployeeId(emp.id);
                        setActiveTab('chat');
                      }}
                      className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                          isSelected
                            ? 'bg-slate-950 text-white'
                            : badgeClass
                        }`}
                      >
                        {emp.avatarInitials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold truncate flex items-center gap-1.5">
                          <span className="truncate">{emp.name}</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        </div>
                        <div
                          className={`text-[11px] truncate ${
                            isSelected
                              ? 'text-slate-600 font-medium'
                              : 'text-slate-400'
                          }`}
                        >
                          {emp.role}
                        </div>
                      </div>
                    </button>

                    {/* Edit & Delete AI Employee Buttons */}
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditBotModal(emp);
                        }}
                        title={`Edit ${emp.name} (Rename / Role / Instructions)`}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          isSelected
                            ? 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/70'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      {employees.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteBot(emp.id);
                          }}
                          title={`Delete ${emp.name}`}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            isSelected
                              ? 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
                              : 'text-slate-500 hover:text-rose-400 hover:bg-slate-800'
                          }`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Human Real Estate Agents Quick Access in Left Sidebar */}
          <div className="pt-2 border-t border-slate-800/80">
            <div className="px-2 pb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <span>Human Agents ({humanAgents.length})</span>
              <button
                onClick={() => setActiveTab('human_agents')}
                className="text-amber-400 hover:underline font-semibold cursor-pointer"
              >
                Add / Edit
              </button>
            </div>
            <div className="space-y-1">
              {humanAgents.slice(0, 4).map((ha) => (
                <div
                  key={ha.id}
                  className="flex items-center justify-between px-2.5 py-2 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800/70 transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setActiveTab('human_agents')}
                    className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center text-[11px] font-bold shrink-0">
                      {ha.avatarInitials}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-100 truncate">
                        {ha.name}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {ha.email}
                      </div>
                    </div>
                  </button>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setActiveTab('human_agents')}
                      title={`Edit ${ha.name}`}
                      className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteHumanAgent(ha.id)}
                      title={`Delete ${ha.name}`}
                      className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ====================================================================
            BOTTOM-LEFT CORNER: CONNECTED APPS DROPDOWN + GMAIL ACCOUNT
            ==================================================================== */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/70 space-y-2 relative">
          {/* Connected Apps Dropdown Trigger */}
          <div className="relative">
            <button
              onClick={() => setAppsDropdownOpen((prev) => !prev)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs font-medium text-slate-100 transition-all cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Settings className="w-3.5 h-3.5 text-amber-400" />
                <span>Connected Apps & Website</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-semibold text-slate-300 border border-slate-700">
                  {connectedCount}/{tools.length}
                </span>
              </span>
              {appsDropdownOpen ? (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {/* Dropdown Menu Popover */}
            {appsDropdownOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-2 z-30 space-y-1 max-h-96 overflow-y-auto">
                <div className="px-2.5 py-1.5 flex items-center justify-between border-b border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-300">
                    Apps & Webhook Diagnostics
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setOnboardingChannel('webhook_health');
                        setAppsDropdownOpen(false);
                        setOnboardingModalOpen(true);
                      }}
                      className="text-[11px] text-emerald-400 font-semibold hover:underline cursor-pointer"
                    >
                      Webhook Health
                    </button>
                    <button
                      onClick={() => {
                        setOnboardingChannel('llm_engine');
                        setAppsDropdownOpen(false);
                        setOnboardingModalOpen(true);
                      }}
                      className="text-[11px] text-amber-400 font-semibold hover:underline cursor-pointer"
                    >
                      + LLM Key
                    </button>
                  </div>
                </div>

                {tools.map((tool) => {
                  const acctCount = (tool.accounts || []).length;
                  return (
                    <button
                      key={tool.id}
                      onClick={() => {
                        setOnboardingChannel(tool.id);
                        setAppsDropdownOpen(false);
                        setOnboardingModalOpen(true);
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-slate-800 text-left transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-slate-100 truncate flex items-center gap-1.5">
                          <span>{tool.name}</span>
                          {acctCount > 1 && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-mono">
                              {acctCount} accts
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {tool.connected
                            ? tool.accountHandle || 'Configured'
                            : 'Blank — Click to connect / add account'}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-medium shrink-0 ${
                          tool.connected
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {tool.connected ? 'Connected' : '+ Connect'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Email / Google Account Box (Bottom-Left Corner) */}
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold shrink-0 ${
                  googleEmail
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                <Mail className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white truncate">
                  {googleEmail ? googleEmail : 'No Email Connected'}
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  {googleEmail
                    ? 'Email & .ics Dispatch Ready'
                    : 'Resend / Brevo / Gmail'}
                </div>
              </div>
            </div>

            {googleEmail ? (
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => {
                    setOnboardingChannel('gmail');
                    setOnboardingModalOpen(true);
                  }}
                  title="Switch Email Provider"
                  className="px-2 py-1 rounded text-[10px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                >
                  Switch
                </button>
                <button
                  onClick={handleDisconnectGoogle}
                  title="Disconnect Email Account"
                  className="p-1 rounded text-slate-400 hover:text-rose-400 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setOnboardingChannel('gmail');
                  setOnboardingModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-bold shrink-0 transition-colors cursor-pointer"
              >
                Connect
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* ====================================================================
          CENTER WORKSPACE: TWO-ROW NON-OVERLAPPING TOP HEADER + VIEWS
          ==================================================================== */}
      <main className="flex-1 flex flex-col min-w-0 bg-white">
        {/* Global Two-Row Top Header — Zero Overlapping Buttons */}
        <header className="border-b border-slate-200 bg-white shrink-0">
          {/* Row 1: Active AI Employee Identity (with Edit & Delete Bot) + Live Call / Bot Logs / BYOK */}
          <div className="px-6 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                  AVATAR_BADGE_COLORS[activeEmployee.id] ||
                  'bg-slate-900 text-white'
                }`}
              >
                {activeEmployee.avatarInitials}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-sm font-bold text-slate-900 truncate">
                    {activeEmployee.name}
                  </h1>
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold">
                    {activeEmployee.role}
                  </span>
                  <button
                    type="button"
                    onClick={() => openEditBotModal(activeEmployee)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-slate-200 hover:border-slate-300 bg-white text-slate-700 hover:text-slate-900 text-[11px] font-medium transition-colors cursor-pointer"
                    title="Rename or Edit this AI Employee"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Edit Bot</span>
                  </button>
                  {employees.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleDeleteBot(activeEmployee.id)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-rose-200 hover:bg-rose-50 text-rose-600 text-[11px] font-medium transition-colors cursor-pointer"
                      title="Delete this AI Employee"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-500 truncate mt-0.5">
                  {activeEmployee.specialty}
                </p>
              </div>
            </div>

            {/* Right Actions: Live Call + Bot Logs + BYOK Keys */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {!isCallActive ? (
                <button
                  onClick={startLiveVoiceCall}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>Live Call</span>
                </button>
              ) : (
                <button
                  onClick={endLiveVoiceCall}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                >
                  <PhoneOff className="w-3.5 h-3.5" />
                  <span>End Call</span>
                </button>
              )}

              {/* Bot Activity Logs Dropdown + Side Screen Switcher */}
              <div className="relative flex items-center">
                <button
                  onClick={() => setLogsDropdownOpen((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-l-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold border-r border-slate-700 transition-colors cursor-pointer"
                  title="Open Bot Activity Logs"
                >
                  <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Bot Logs</span>
                  <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono">
                    {botLogs.length}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>
                <button
                  onClick={() => setLogsSidePanelOpen((prev) => !prev)}
                  className={`inline-flex items-center px-2.5 py-1.5 rounded-r-xl text-xs font-semibold transition-colors cursor-pointer ${
                    logsSidePanelOpen
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300'
                  }`}
                  title={
                    logsSidePanelOpen
                      ? 'Hide Side Bot Logs Panel'
                      : 'Dock Bot Logs to Right Side'
                  }
                >
                  {logsSidePanelOpen ? (
                    <PanelRightClose className="w-3.5 h-3.5" />
                  ) : (
                    <PanelRightOpen className="w-3.5 h-3.5" />
                  )}
                </button>

                {logsDropdownOpen && (
                  <BotLogsDropdownPopover
                    logs={botLogs}
                    employees={employees}
                    sidePanelOpen={logsSidePanelOpen}
                    onToggleSidePanel={() =>
                      setLogsSidePanelOpen((prev) => !prev)
                    }
                    onClearLogs={() => setBotLogs([])}
                    onCloseDropdown={() => setLogsDropdownOpen(false)}
                  />
                )}
              </div>

              <button
                onClick={() => {
                  setOnboardingChannel('llm_engine');
                  setOnboardingModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                <span>BYOK Keys</span>
              </button>
            </div>
          </div>

          {/* Row 2: Workspace Navigation Bar — Clean, Wrapping, Never Overlaps */}
          <div className="px-6 py-2 bg-slate-50/80 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setActiveTab('chat')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'chat'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-white text-slate-600 border border-slate-200/80 hover:text-slate-900'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Chat & Calls</span>
              </button>
              <button
                onClick={() => setActiveTab('properties')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'properties'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-white text-slate-600 border border-slate-200/80 hover:text-slate-900'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Properties ({properties.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('leads')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'leads'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-white text-slate-600 border border-slate-200/80 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Leads & Inbounds ({leads.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('human_agents')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'human_agents'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-white text-slate-600 border border-slate-200/80 hover:text-slate-900'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Human Agents ({humanAgents.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('performance')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'performance'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-white text-slate-600 border border-slate-200/80 hover:text-slate-900'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Performance</span>
              </button>
              <button
                onClick={() => setActiveTab('setup_guide')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'setup_guide'
                    ? 'bg-indigo-950 text-white shadow-2xs border border-indigo-700'
                    : 'bg-indigo-50 text-indigo-950 border border-indigo-200 hover:bg-indigo-100'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                <span>Step-by-Step Setup & Templates (Make / n8n / API)</span>
              </button>
              {licenseSession.role === 'ADMIN' && (
                <button
                  onClick={() => setActiveTab('b2b_portal')}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === 'b2b_portal'
                      ? 'bg-amber-500 text-slate-950 shadow-2xs'
                      : 'bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100'
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Admin: License Keys & Website Enquiries</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* VIEW 1: AI EMPLOYEE CHAT & LIVE VOICE RECEPTIONIST */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50">
            {/* LIVE VOICE CALL RECEPTIONIST PANEL (Active when attending a call) */}
            {isCallActive && (
              <div className="bg-slate-900 text-white px-6 py-4 border-b border-slate-800 shrink-0">
                <div className="max-w-4xl mx-auto space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                          Live Inbound Phone Call Active · {activeEmployee.name}{' '}
                          Attending
                        </div>
                        <div className="text-xs text-slate-300">
                          Speak into your microphone or type what the caller says below. Caller details are automatically saved into Leads & Clients DB.
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={toggleMicrophoneRecognition}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          isListeningMic
                            ? 'bg-rose-500 text-white'
                            : 'bg-white/10 hover:bg-white/20 text-white'
                        }`}
                      >
                        {isListeningMic ? (
                          <>
                            <MicOff className="w-3.5 h-3.5" /> Stop Mic
                          </>
                        ) : (
                          <>
                            <Mic className="w-3.5 h-3.5" /> Speak as Caller
                          </>
                        )}
                      </button>
                      {isAiSpeaking && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs">
                          <Volume2 className="w-3.5 h-3.5 animate-pulse" /> AI
                          Speaking...
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Live Extracted Lead Card */}
                  <div className="grid grid-cols-4 gap-2 bg-white/5 rounded-xl p-2.5 text-xs border border-white/10">
                    <div>
                      <span className="text-slate-400 block text-[10px]">
                        Caller Name
                      </span>
                      <span className="font-semibold text-white">
                        {callerDraft.callerName || 'Listening...'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">
                        Phone / Email
                      </span>
                      <span className="font-semibold text-white">
                        {callerDraft.callerPhone ||
                          callerDraft.callerEmail ||
                          'Listening...'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">
                        Budget
                      </span>
                      <span className="font-semibold text-emerald-400">
                        {callerDraft.budget || 'Listening...'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">
                        Property Interest
                      </span>
                      <span className="font-semibold text-white truncate block">
                        {callerDraft.propertyInterest || 'Listening...'}
                      </span>
                    </div>
                  </div>

                  {/* Call Transcript Feed */}
                  <div className="max-h-32 overflow-y-auto space-y-1.5 pr-2">
                    {callTranscript.map((line) => (
                      <div
                        key={line.id}
                        className={`text-xs px-3 py-1.5 rounded-lg ${
                          line.speaker === 'AI Receptionist'
                            ? 'bg-emerald-950/80 text-emerald-200 border border-emerald-800/60'
                            : 'bg-white/10 text-white'
                        }`}
                      >
                        <span className="font-semibold mr-2">
                          {line.speaker}:
                        </span>
                        <span>{line.text}</span>
                      </div>
                    ))}
                  </div>

                  {/* Simulated Caller Utterance Input */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendVoiceUtterance(voiceInputText);
                    }}
                    className="flex gap-2"
                  >
                    <input
                      type="text"
                      value={voiceInputText}
                      onChange={(e) => setVoiceInputText(e.target.value)}
                      placeholder='Type what the caller says on the phone (e.g., "Hi, I am David Chen, my budget is $9.5M and I want to tour The Mercer Penthouse tomorrow")...'
                      className="flex-1 px-3.5 py-2 rounded-lg bg-white/10 border border-white/15 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-400"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs transition-colors"
                    >
                      Send Caller Audio
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* Chat Messages Area */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="max-w-3xl mx-auto space-y-4">
                {/* Quick Starter Prompts */}
                <div className="flex flex-wrap gap-2 pb-2">
                  {activeEmployee.samplePrompts.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendChat(prompt)}
                      className="text-xs px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                  <button
                    onClick={() =>
                      handleSendChat(
                        'Add a new lead named Michael Vance (michael@vancecapital.com, +1-310-555-0144) with a $9.5M budget interested in The Mercer Penthouse.'
                      )
                    }
                    className="text-xs px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-medium transition-colors"
                  >
                    + Add Lead via Chat
                  </button>
                </div>

                {currentMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${
                      msg.sender === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-2xl rounded-2xl px-4 py-3.5 text-sm leading-relaxed shadow-2xs ${
                        msg.sender === 'user'
                          ? 'bg-slate-900 text-white'
                          : 'bg-white text-slate-900 border border-slate-200'
                      }`}
                    >
                      {msg.actionBadge && (
                        <div className="mb-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold border border-slate-200">
                          <Sparkles className="w-3 h-3 text-amber-500" />
                          {msg.actionBadge}
                        </div>
                      )}

                      <div className="whitespace-pre-line">{msg.text}</div>

                      {/* Proposed Real Tool Action Card */}
                      {msg.proposedAction &&
                        msg.proposedAction.actionType !== 'NONE' && (
                          <div className="mt-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-900">
                                Ready to Execute:{' '}
                                {msg.proposedAction.actionType}
                              </span>
                              {msg.proposedAction.executed && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Executed
                                </span>
                              )}
                            </div>

                            {msg.proposedAction.recipientEmail && (
                              <div className="text-xs text-slate-600">
                                <strong>To:</strong>{' '}
                                {msg.proposedAction.recipientEmail} ·{' '}
                                <strong>Subject:</strong>{' '}
                                {msg.proposedAction.emailSubject}
                              </div>
                            )}

                            {msg.proposedAction.eventSummary && (
                              <div className="text-xs text-slate-600">
                                <strong>Event:</strong>{' '}
                                {msg.proposedAction.eventSummary} ·{' '}
                                <strong>Attendee:</strong>{' '}
                                {msg.proposedAction.attendeeEmail}
                              </div>
                            )}

                            {msg.proposedAction.mapsQuery && (
                              <div className="text-xs text-slate-600">
                                <strong>Maps Query:</strong>{' '}
                                {msg.proposedAction.mapsQuery} (
                                {msg.proposedAction.mapsLocation})
                              </div>
                            )}

                            {msg.proposedAction.smsOrPostBody && (
                              <div className="text-xs text-slate-600">
                                <strong>
                                  Channel ({msg.proposedAction.targetChannel}):
                                </strong>{' '}
                                {msg.proposedAction.smsOrPostBody}
                              </div>
                            )}

                            {msg.proposedAction.executionResult && (
                              <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-700 whitespace-pre-line">
                                {msg.proposedAction.executionResult}
                              </div>
                            )}

                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              {msg.proposedAction.directLaunchUrl && (
                                <a
                                  href={msg.proposedAction.directLaunchUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-2xs"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  <span>
                                    1-Click Open & Send in{' '}
                                    {msg.proposedAction.targetChannel
                                      ? msg.proposedAction.targetChannel.toUpperCase()
                                      : 'App'}
                                  </span>
                                </a>
                              )}

                              {!msg.proposedAction.executed && (
                                <button
                                  onClick={() =>
                                    handleExecuteProposedAction(
                                      msg.id,
                                      msg.proposedAction!
                                    )
                                  }
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  Approve & Run Action
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                      <div className="text-[10px] mt-1.5 text-slate-400">
                        {msg.timestamp}
                      </div>
                    </div>
                  </div>
                ))}

                {isSendingChat && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl px-4 py-3 bg-white border border-slate-200 text-slate-600 text-xs flex items-center gap-2 shadow-2xs">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      {activeEmployee.name} is working via{' '}
                      {activeProviderMeta.name}...
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            </div>

            {/* Bottom Chat Input Box */}
            <div className="p-4 border-t border-slate-200 bg-white">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendChat();
                }}
                className="max-w-3xl mx-auto flex items-center gap-2.5"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={`Instruct ${activeEmployee.name} (${activeEmployee.role}) — send emails, schedule tours, or update properties & leads...`}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-300 bg-slate-50/50 text-sm focus:bg-white focus:outline-none focus:border-slate-900 transition-colors"
                />
                <button
                  type="submit"
                  disabled={isSendingChat || !chatInput.trim()}
                  className="px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors disabled:opacity-40"
                >
                  <Send className="w-4 h-4" />
                  Send
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ====================================================================
            VIEW 2: PROPERTIES DATABASE (FULL ADD / EDIT / DELETE CRUD)
            ==================================================================== */}
        {activeTab === 'properties' && (
          <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Properties Database ({properties.length} Listings)
                </h2>
                <p className="text-xs text-slate-500">
                  Your AI Employees reference this live inventory when answering phone calls, WhatsApp messages, and emails.
                </p>
              </div>
              <button
                onClick={openAddPropertyModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Property Listing
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
                {properties.map((prop) => (
                  <div
                    key={prop.id}
                    className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs flex flex-col justify-between"
                  >
                    <div>
                      {prop.image && (
                        <div className="h-48 w-full bg-slate-100 relative overflow-hidden">
                          <img
                            src={prop.image}
                            alt={prop.title}
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-slate-900/85 text-white text-[11px] font-semibold">
                            {prop.status}
                          </span>
                          <span className="absolute top-3 right-3 px-2.5 py-1 rounded-md bg-white/95 text-slate-900 text-xs font-bold shadow-xs">
                            {prop.priceFormatted}
                          </span>
                        </div>
                      )}
                      <div className="p-4">
                        <h3 className="text-base font-bold text-slate-900">
                          {prop.title}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {prop.address} · {prop.neighborhood}
                        </p>

                        <div className="mt-3 flex items-center gap-4 text-xs text-slate-700">
                          <span>
                            <strong>{prop.beds}</strong> Beds
                          </span>
                          <span>
                            <strong>{prop.baths}</strong> Baths
                          </span>
                          <span>
                            <strong>{prop.sqft}</strong> Sq Ft
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                      <button
                        onClick={() => {
                          setSelectedEmployeeId('julian');
                          setActiveTab('chat');
                          handleSendChat(
                            `Write a high-converting Instagram & email campaign for our listing "${prop.title}" at ${prop.address} (${prop.priceFormatted}).`
                          );
                        }}
                        className="text-xs font-semibold text-slate-700 hover:text-slate-900"
                      >
                        Ask AI to Promote →
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditPropertyModal(prop)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/60"
                          title="Edit Property"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProperty(prop.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          title="Delete Property"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ====================================================================
            VIEW 3: LEADS & CLIENTS CRM DATABASE (DASHBOARD TAB + CRM TABLE)
            ==================================================================== */}
        {activeTab === 'leads' && (
          <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50">
            <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 bg-white shrink-0">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Leads & Clients Database ({leads.length} Clients)
                </h2>
                <p className="text-xs text-slate-500">
                  Visualize AI qualification scores & status trends over time or manage client CRM records.
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Sub-Tab Switcher inside Leads & Clients DB: Dashboard vs Funnel vs CRM Table */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    onClick={() => setLeadsSubTab('dashboard')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      leadsSubTab === 'dashboard'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    Dashboard
                  </button>
                  <button
                    onClick={() => setLeadsSubTab('funnel')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      leadsSubTab === 'funnel'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Filter className="w-3.5 h-3.5" />
                    Funnel ({leads.length})
                  </button>
                  <button
                    onClick={() => setLeadsSubTab('table')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      leadsSubTab === 'table'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Table2 className="w-3.5 h-3.5" />
                    CRM Table ({leads.length})
                  </button>
                </div>

                <button
                  onClick={openAddLeadModal}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  Add Lead / Client
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {leadsSubTab === 'dashboard' && (
                <LeadsDashboardTab
                  leads={leads}
                  reminders={reminders}
                  onToggleReminderComplete={handleToggleReminderComplete}
                  onDeleteReminder={handleDeleteReminder}
                  onRunReminderWithAi={handleRunReminderWithAi}
                  onOpenScheduleReminder={openScheduleReminderModal}
                />
              )}

              {leadsSubTab === 'funnel' && (
                <LeadsFunnelTab
                  leads={leads}
                  activeStatusFilter={leadStatusFilter}
                  onSelectStatusFilter={(status) => setLeadStatusFilter(status)}
                  onAnalyzeLeadWithAi={handleAnalyzeLeadWithAi}
                  onUpdateLeadStatus={(leadId, newStatus) => {
                    const targetLead = leads.find((l) => l.id === leadId);
                    setLeads((prev) =>
                      prev.map((l) =>
                        l.id === leadId
                          ? {
                              ...l,
                              status: newStatus,
                              lastContacted: `Moved to ${newStatus} just now`,
                            }
                          : l
                      )
                    );
                    if (targetLead) {
                      appendBotLog({
                        employeeId: 'marcus',
                        category: 'AI_TASK',
                        status: 'SUCCESS',
                        title: `Pipeline Stage Advanced: ${targetLead.name} → ${newStatus}`,
                        detail: `${targetLead.name} (${targetLead.propertyInterest}, ${targetLead.budget}) moved from "${targetLead.status}" to "${newStatus}" in the Leads Funnel.`,
                        channelOrTool: 'Leads Pipeline Funnel',
                      });
                    }
                  }}
                />
              )}

              <div className="max-w-6xl mx-auto bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                {/* Table Header & Status Filter Bar */}
                <div className="p-4 border-b border-slate-200 bg-slate-50/70 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Filter className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-xs font-bold text-slate-800">
                        Client & Lead Records
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-200/80 text-slate-700 text-[11px] font-mono font-semibold">
                        {
                          leads.filter((lead) => {
                            const matchesStatus =
                              leadStatusFilter === 'ALL' ||
                              lead.status === leadStatusFilter;
                            const q = leadSearchQuery.trim().toLowerCase();
                            const matchesQuery =
                              !q ||
                              lead.name.toLowerCase().includes(q) ||
                              lead.email.toLowerCase().includes(q) ||
                              lead.propertyInterest.toLowerCase().includes(q) ||
                              lead.source.toLowerCase().includes(q);
                            return matchesStatus && matchesQuery;
                          }).length
                        }{' '}
                        of {leads.length} shown
                      </span>
                    </div>

                    {/* Search + Status Select Dropdown */}
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          value={leadSearchQuery}
                          onChange={(e) => setLeadSearchQuery(e.target.value)}
                          placeholder="Search name, email, listing..."
                          className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 w-52"
                        />
                      </div>

                      <select
                        aria-label="Filter leads by status"
                        value={leadStatusFilter}
                        onChange={(e) =>
                          setLeadStatusFilter(
                            e.target.value as 'ALL' | ClientLead['status']
                          )
                        }
                        className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:border-slate-900"
                      >
                        <option value="ALL">
                          All Statuses ({leads.length})
                        </option>
                        <option value="Unqualified">
                          Unqualified / Inbound (
                          {
                            leads.filter((l) => l.status === 'Unqualified')
                              .length
                          }
                          )
                        </option>
                        <option value="AI Qualified">
                          AI Qualified (
                          {
                            leads.filter((l) => l.status === 'AI Qualified')
                              .length
                          }
                          )
                        </option>
                        <option value="Follow-Up Sent">
                          Follow-Up Sent (
                          {
                            leads.filter((l) => l.status === 'Follow-Up Sent')
                              .length
                          }
                          )
                        </option>
                        <option value="Tour Scheduled">
                          Tour Scheduled (
                          {
                            leads.filter((l) => l.status === 'Tour Scheduled')
                              .length
                          }
                          )
                        </option>
                        <option value="Offer Submitted">
                          Offer Submitted (
                          {
                            leads.filter((l) => l.status === 'Offer Submitted')
                              .length
                          }
                          )
                        </option>
                        <option value="Closed Property">
                          Closed Property (
                          {
                            leads.filter((l) => l.status === 'Closed Property')
                              .length
                          }
                          )
                        </option>
                      </select>

                      {(leadStatusFilter !== 'ALL' ||
                        leadSearchQuery.trim() !== '') && (
                        <button
                          onClick={() => {
                            setLeadStatusFilter('ALL');
                            setLeadSearchQuery('');
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-200/80 hover:bg-slate-300 text-slate-700 text-xs font-semibold transition-colors"
                        >
                          Clear Filters
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Quick Segment Filter Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(
                      [
                        { label: 'All Segments', value: 'ALL' },
                        { label: 'Inbound / Unqualified', value: 'Unqualified' },
                        { label: 'AI Qualified', value: 'AI Qualified' },
                        { label: 'Follow-Up Sent', value: 'Follow-Up Sent' },
                        { label: 'Tour Scheduled', value: 'Tour Scheduled' },
                        { label: 'Offer Submitted', value: 'Offer Submitted' },
                        { label: 'Closed Property', value: 'Closed Property' },
                      ] as const
                    ).map((seg) => {
                      const count =
                        seg.value === 'ALL'
                          ? leads.length
                          : leads.filter((l) => l.status === seg.value).length;
                      const isActive = leadStatusFilter === seg.value;
                      return (
                        <button
                          key={seg.value}
                          onClick={() => setLeadStatusFilter(seg.value)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            isActive
                              ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                          }`}
                        >
                          <span>{seg.label}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                              isActive
                                ? 'bg-white/20 text-white'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-4">Client / Lead</th>
                      <th className="py-3 px-4">Property Interest & Budget</th>
                      <th className="py-3 px-4">AI Score</th>
                      <th className="py-3 px-4">Source</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Notes</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs">
                    {leads
                      .filter((lead) => {
                        const matchesStatus =
                          leadStatusFilter === 'ALL' ||
                          lead.status === leadStatusFilter;
                        const q = leadSearchQuery.trim().toLowerCase();
                        const matchesQuery =
                          !q ||
                          lead.name.toLowerCase().includes(q) ||
                          lead.email.toLowerCase().includes(q) ||
                          lead.propertyInterest.toLowerCase().includes(q) ||
                          lead.source.toLowerCase().includes(q);
                        return matchesStatus && matchesQuery;
                      })
                      .map((lead) => {
                        const isAnalyzingThisLead =
                          analyzingLeadId === lead.id;
                        const assignedHuman =
                          humanAgents.find(
                            (a) => a.id === lead.assignedHumanAgentId
                          ) || humanAgents[0];

                        return (
                          <React.Fragment key={lead.id}>
                            <tr className="hover:bg-slate-50/80">
                              <td className="py-3.5 px-4">
                                <div className="font-bold text-slate-900">
                                  {lead.name}
                                </div>
                                <div className="text-slate-500">
                                  {lead.email}
                                </div>
                                <div className="text-slate-400 text-[11px]">
                                  {lead.phone}
                                </div>
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="font-semibold text-slate-800">
                                  {lead.propertyInterest}
                                </div>
                                <div className="text-emerald-700 font-semibold">
                                  Budget: {lead.budget} · {lead.timeline}
                                </div>
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="flex flex-col items-start gap-1">
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded-md font-mono font-bold text-[11px] ${
                                      lead.qualificationScore >= 90
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : lead.qualificationScore >= 80
                                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                                    }`}
                                  >
                                    {lead.qualificationScore}/100
                                  </span>
                                  {lead.aiAnalysis && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setAnalysisModalLeadId(lead.id)
                                      }
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-900 text-amber-300 text-[10px] font-semibold hover:bg-slate-800"
                                      title="View AI Sentiment & Summary"
                                    >
                                      <Sparkles className="w-2.5 h-2.5" />
                                      {lead.aiAnalysis.sentiment}
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td className="py-3.5 px-4">
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                                  {lead.source}
                                </span>
                              </td>
                              <td className="py-3.5 px-4">
                                <button
                                  onClick={() =>
                                    setLeadStatusFilter(lead.status)
                                  }
                                  title={`Filter by ${lead.status}`}
                                  className={`px-2 py-0.5 rounded-md font-semibold transition-opacity hover:opacity-80 ${
                                    lead.status === 'Closed Property'
                                      ? 'bg-slate-900 text-amber-300 border border-slate-900'
                                      : lead.status === 'Offer Submitted'
                                      ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                      : lead.status === 'Tour Scheduled'
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : lead.status === 'AI Qualified'
                                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                      : lead.status === 'Follow-Up Sent'
                                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                      : 'bg-slate-100 text-slate-700'
                                  }`}
                                >
                                  {lead.status}
                                </button>
                              </td>
                              <td className="py-3.5 px-4 max-w-xs">
                                <p className="text-slate-600 line-clamp-2">
                                  {lead.notes}
                                </p>
                              </td>
                              <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                <div className="inline-flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    disabled={isAnalyzingThisLead}
                                    onClick={() => handleAnalyzeLeadWithAi(lead)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-300 font-semibold transition-colors disabled:opacity-60"
                                    title="Analyze lead engagement history, sentiment & recommended next steps from chat logs & past emails"
                                  >
                                    {isAnalyzingThisLead ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <Sparkles className="w-3 h-3 text-amber-400" />
                                    )}
                                    <span>Analyze with AI</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedEmployeeId('elena');
                                      setActiveTab('chat');
                                      handleSendChat(
                                        `Draft and send a personalized Gmail follow-up to ${lead.name} (${lead.email}) regarding "${lead.propertyInterest}" (Budget: ${lead.budget}).`
                                      );
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                                    title="Ask AI to Email Lead"
                                  >
                                    Email
                                  </button>
                                  <button
                                    onClick={() => {
                                      const tomorrow2pm = new Date(
                                        Date.now() + 86400000
                                      );
                                      tomorrow2pm.setHours(14, 0, 0, 0);
                                      setPendingWorkspaceAction({
                                        type: 'calendar',
                                        employeeName: 'Maya Lin',
                                        eventSummary: `Private Property Tour: ${lead.propertyInterest} (${assignedHuman?.name || 'Agent'} & ${lead.name})`,
                                        eventDescription: `Property Showing for ${lead.name} (${lead.email}, ${lead.phone}) at ${lead.propertyInterest}.\nBudget: ${lead.budget} | Timeline: ${lead.timeline}\nAssigned Human Agent: ${assignedHuman?.name || 'Victoria Sterling'}`,
                                        eventStartIso: tomorrow2pm.toISOString(),
                                        eventDurationMinutes: 45,
                                        attendeeEmail: lead.email,
                                        assignedAgentId: assignedHuman?.id,
                                      });
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                                    title="Validate Calendar Conflicts & Book Showing"
                                  >
                                    Tour
                                  </button>
                                  <button
                                    onClick={() =>
                                      openScheduleReminderModal(lead)
                                    }
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-semibold transition-colors"
                                    title="Schedule Follow-Up Notification Reminder"
                                  >
                                    <BellRing className="w-3 h-3 text-amber-600" />
                                    Remind
                                  </button>
                                  <button
                                    onClick={() => openEditLeadModal(lead)}
                                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteLead(lead.id)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {/* Inline AI Lead Intelligence Summary Strip (when analyzed) */}
                            {lead.aiAnalysis && (
                              <tr className="bg-slate-900/[0.03] border-b border-slate-200">
                                <td colSpan={7} className="px-4 py-3">
                                  <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-wrap items-start justify-between gap-3">
                                    <div className="space-y-1 flex-1 min-w-[260px]">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900 text-amber-300 text-[10px] font-bold">
                                          <Sparkles className="w-3 h-3" />
                                          AI Lead Summary
                                        </span>
                                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                                          Sentiment: {lead.aiAnalysis.sentiment}{' '}
                                          ({lead.aiAnalysis.sentimentScore}/100)
                                        </span>
                                        <span className="text-[10px] text-slate-400">
                                          Based on{' '}
                                          {lead.aiAnalysis.analyzedChatLogCount}{' '}
                                          chat/bot logs &{' '}
                                          {lead.aiAnalysis.analyzedEmailCount}{' '}
                                          emails · {lead.aiAnalysis.generatedAt}
                                        </span>
                                      </div>
                                      <p className="text-xs text-slate-700 leading-relaxed">
                                        {lead.aiAnalysis.engagementSummary}
                                      </p>
                                      {lead.aiAnalysis.recommendedNextSteps?.[0] && (
                                        <div className="text-[11px] text-slate-600 pt-0.5">
                                          <strong className="text-slate-900">
                                            Recommended Next Step (
                                            {
                                              lead.aiAnalysis
                                                .recommendedNextSteps[0].priority
                                            }
                                            ):
                                          </strong>{' '}
                                          {
                                            lead.aiAnalysis
                                              .recommendedNextSteps[0].step
                                          }
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      {lead.aiAnalysis.recommendedNextSteps?.[0] && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleExecuteRecommendedLeadStep(
                                              lead,
                                              lead.aiAnalysis!
                                                .recommendedNextSteps[0]
                                            )
                                          }
                                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold"
                                        >
                                          <Sparkles className="w-3 h-3 text-amber-400" />
                                          Run Next Step
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setAnalysisModalLeadId(lead.id)
                                        }
                                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-[11px] font-semibold"
                                      >
                                        Full AI Report →
                                      </button>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    {leads.filter((lead) => {
                      const matchesStatus =
                        leadStatusFilter === 'ALL' ||
                        lead.status === leadStatusFilter;
                      const q = leadSearchQuery.trim().toLowerCase();
                      const matchesQuery =
                        !q ||
                        lead.name.toLowerCase().includes(q) ||
                        lead.email.toLowerCase().includes(q) ||
                        lead.propertyInterest.toLowerCase().includes(q) ||
                        lead.source.toLowerCase().includes(q);
                      return matchesStatus && matchesQuery;
                    }).length === 0 && (
                      <tr>
                        <td
                          colSpan={7}
                          className="py-10 px-4 text-center text-slate-500"
                        >
                          <div className="space-y-2">
                            <p className="text-xs font-semibold text-slate-700">
                              No leads match the selected status filter (
                              {leadStatusFilter}).
                            </p>
                            <button
                              onClick={() => {
                                setLeadStatusFilter('ALL');
                                setLeadSearchQuery('');
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
                            >
                              Show All Leads ({leads.length})
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ====================================================================
            VIEW 4: HUMAN REAL ESTATE AGENTS & DIRECT CALENDAR SYNC
            ==================================================================== */}
        {activeTab === 'human_agents' && (
          <HumanAgentsDirectoryView
            humanAgents={humanAgents}
            leads={leads}
            properties={properties}
            googleAccountEmail={googleEmail}
            onAddOrEditAgent={handleAddOrEditHumanAgent}
            onDeleteAgent={handleDeleteHumanAgent}
            onConnectAgentCalendarOAuth={handleConnectAgentCalendarOAuth}
            onContactHumanAgentWithBot={handleContactHumanAgentWithBot}
            onScheduleMeetingOnAgentCalendar={
              handleScheduleMeetingOnAgentCalendar
            }
            onValidateMeeting={handleValidateMeetingSchedule}
          />
        )}

        {/* ====================================================================
            VIEW 5: PERFORMANCE TAB (RECHARTS LINE CHART & BAR CHART)
            ==================================================================== */}
        {activeTab === 'performance' && (
          <BrokeragePerformanceView
            leads={leads}
            properties={properties}
            employees={employees}
          />
        )}

        {/* ====================================================================
            VIEW 5B: FULL DETAILED STEP-BY-STEP SETUP & AUTOMATION TEMPLATES PAGE
            ==================================================================== */}
        {activeTab === 'setup_guide' && (
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
            <div className="max-w-5xl mx-auto space-y-6">
              {/* MASTER 4-STAGE ARCHITECTURE HEADER */}
              <div className="p-6 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-lg space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
                      <Sparkles className="w-3.5 h-3.5" />
                      100% Automated AI Setup · Pre-Built Make.com & n8n Blueprints
                    </span>
                    <h2 className="text-xl font-bold text-white">
                      Complete Step-by-Step Connection & Automation Blueprint Center
                    </h2>
                    <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
                      Connect every channel in your brokerage step-by-step. You don’t have to build automations from scratch—download our ready-made <strong>Make.com</strong> or <strong>n8n</strong> blueprint files (<code className="bg-slate-800 px-1.5 py-0.5 rounded font-mono">.json</code>) with your live CRM URL already pre-configured inside, or follow the exact Official API walkthrough.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setOnboardingChannel('llm_engine');
                      setOnboardingModalOpen(true);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer shrink-0"
                  >
                    Open Connected Apps Vault
                  </button>
                </div>

                {/* 4-STAGE QUICK CHECKLIST */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                        Stage 1 · AI Brain
                      </span>
                      <span
                        className={`w-2 h-2 rounded-full ${
                          llmSettings.apiKey ? 'bg-emerald-400' : 'bg-amber-400'
                        }`}
                      />
                    </div>
                    <div className="text-xs font-bold text-white">
                      1. Connect Your LLM API Key
                    </div>
                    <p className="text-[11px] text-slate-300 leading-snug">
                      Paste your Groq, OpenAI, Claude, Gemini, or DeepSeek key so all 6 AI Employees think and respond live.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setOnboardingChannel('llm_engine');
                        setOnboardingModalOpen(true);
                      }}
                      className="text-[11px] font-bold text-amber-300 hover:text-amber-200 underline cursor-pointer pt-1"
                    >
                      Configure LLM Key →
                    </button>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                        Stage 2 · Email & Tours
                      </span>
                      <span
                        className={`w-2 h-2 rounded-full ${
                          tools.find((t) => t.id === 'gmail')?.connected
                            ? 'bg-emerald-400'
                            : 'bg-slate-500'
                        }`}
                      />
                    </div>
                    <div className="text-xs font-bold text-white">
                      2. Connect Email & Calendar
                    </div>
                    <p className="text-[11px] text-slate-300 leading-snug">
                      Use a free Resend/Brevo key, Gmail 16-char App Password, or Google OAuth to dispatch real emails & .ics tour invites.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setOnboardingChannel('gmail');
                        setOnboardingModalOpen(true);
                      }}
                      className="text-[11px] font-bold text-emerald-300 hover:text-emerald-200 underline cursor-pointer pt-1"
                    >
                      Configure Email & Calendar →
                    </button>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                        Stage 3 · Omnichannel
                      </span>
                      <span
                        className={`w-2 h-2 rounded-full ${
                          tools.some(
                            (t) =>
                              ['whatsapp', 'instagram', 'facebook', 'telnyx'].includes(
                                t.id
                              ) && t.connected
                          )
                            ? 'bg-emerald-400'
                            : 'bg-slate-500'
                        }`}
                      />
                    </div>
                    <div className="text-xs font-bold text-white">
                      3. Import Make / n8n Blueprints
                    </div>
                    <p className="text-[11px] text-slate-300 leading-snug">
                      Download our pre-built Make.com or n8n JSON blueprints below to automate WhatsApp, Instagram, Facebook & SMS.
                    </p>
                    <span className="text-[11px] font-bold text-indigo-300 block pt-1">
                      See Interactive Guide Below ↓
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-pink-400">
                        Stage 4 · Website & Diagnostics
                      </span>
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    </div>
                    <div className="text-xs font-bold text-white">
                      4. Website Leads & Health Logs
                    </div>
                    <p className="text-[11px] text-slate-300 leading-snug">
                      Embed our HTML snippet on your agency site and inspect real-time webhook payloads in Webhook Health.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setOnboardingChannel('webhook_health');
                        setOnboardingModalOpen(true);
                      }}
                      className="text-[11px] font-bold text-pink-300 hover:text-pink-200 underline cursor-pointer pt-1"
                    >
                      Open Webhook Health →
                    </button>
                  </div>
                </div>
              </div>

              {/* INTERACTIVE STEP-BY-STEP BLUEPRINT GENERATOR & INSTALLER */}
              <AutomationBlueprintGuide
                channelId="whatsapp"
                accountHandle={guideHandle}
                webhookUrl={guideWebhookUrl}
                onChangeAccountHandle={setGuideHandle}
                onChangeWebhookUrl={setGuideWebhookUrl}
                onSaveWebhookConnection={async (targetChannelId) => {
                  setGuideSaving(true);
                  setGuideFeedback(null);
                  try {
                    const res = await handleSaveChannelConfig(
                      targetChannelId || 'whatsapp',
                      {
                        accountHandle: guideHandle.trim(),
                        webhookUrl: guideWebhookUrl.trim(),
                        secrets: {},
                      }
                    );
                    setGuideFeedback({
                      type: 'success',
                      text:
                        res?.verificationMessage ||
                        '✅ Verified Outbound Webhook live!',
                    });
                  } catch (err: any) {
                    setGuideFeedback({
                      type: 'error',
                      text: err?.message || 'Webhook verification failed.',
                    });
                  } finally {
                    setGuideSaving(false);
                  }
                }}
                onOpenWebhookHealth={() => {
                  setOnboardingChannel('webhook_health');
                  setOnboardingModalOpen(true);
                }}
                onWebsiteLeadReceived={(wl) => {
                  setLeads((prev) => {
                    if (prev.some((l) => l.id === wl.id)) return prev;
                    const mapped: ClientLead = {
                      id: wl.id,
                      name: wl.name,
                      email: wl.email,
                      phone: wl.phone,
                      source: wl.source || 'WhatsApp Business',
                      budget: wl.budget || '$4,500,000',
                      timeline: wl.timeline || 'Immediate',
                      propertyInterest:
                        wl.propertyInterest || 'The Mercer Penthouse',
                      qualificationScore: wl.qualificationScore || 94,
                      status: 'AI Qualified',
                      assignedEmployeeId: 'marcus',
                      assignedHumanAgentId: 'agent-1',
                      lastContacted: 'Just now (Automated Webhook)',
                      notes: wl.notes || 'Inbound automated lead.',
                    };
                    return [mapped, ...prev];
                  });
                }}
                saving={guideSaving}
                feedback={guideFeedback}
                fullPageMode={true}
              />
            </div>
          </div>
        )}

        {/* ====================================================================
            VIEW 6: B2B SALES, CLIENT LICENSE LOCK & HOSTINGER WEBSITE HUB
            ==================================================================== */}
        {activeTab === 'b2b_portal' && licenseSession.role === 'ADMIN' && (
          <div className="flex-1 overflow-y-auto p-6 bg-slate-950 text-slate-100">
            <AdminLicenseEnquiriesView
              onOpenLandingPreview={() => setShowPublicLandingPage(true)}
              onLockSystemNow={handleLockSystemNow}
            />
          </div>
        )}
      </main>

      {/* ====================================================================
          RIGHT-SIDE SMALL SCREEN: LIVE BOT ACTIVITY LOGS MONITOR
          ==================================================================== */}
      {logsSidePanelOpen && (
        <BotLogsSidePanel
          logs={botLogs}
          employees={employees}
          onClearLogs={() => setBotLogs([])}
          onCloseSidePanel={() => setLogsSidePanelOpen(false)}
          onOpenWebsiteWebhookModal={() => {
            setOnboardingChannel('website_leads');
            setOnboardingModalOpen(true);
          }}
        />
      )}

      {/* ====================================================================
          MODAL 1: BYOK LLM API KEYS, MULTI-ACCOUNT APPS & WEBSITE WEBHOOK
          ==================================================================== */}
      <GuidedOnboardingModal
        isOpen={onboardingModalOpen}
        onClose={() => setOnboardingModalOpen(false)}
        initialChannel={onboardingChannel}
        tools={tools}
        googleAccountEmail={googleEmail}
        googleAccessToken={googleToken}
        llmSettings={llmSettings}
        onUpdateLlmSettings={handleUpdateLlmSettings}
        onConnectGoogleWorkspace={handleConnectGoogle}
        onConnectGmailSmtp={handleConnectGmailSmtp}
        onConnectEmailProvider={handleConnectEmailProvider}
        onSaveChannelConfig={handleSaveChannelConfig}
        onDisconnectChannel={handleDisconnectChannel}
        onManageChannelAccounts={handleManageChannelAccounts}
        onWebsiteLeadReceived={(wl) => {
          setLeads((prev) => {
            if (prev.some((l) => l.id === wl.id)) return prev;
            const mapped: ClientLead = {
              id: wl.id,
              name: wl.name,
              email: wl.email,
              phone: wl.phone,
              source: wl.source || 'Agency Website',
              budget: wl.budget,
              timeline: wl.timeline || 'Immediate',
              propertyInterest: wl.propertyInterest,
              qualificationScore: wl.qualificationScore || 93,
              status: 'AI Qualified',
              assignedEmployeeId: 'marcus',
              assignedHumanAgentId: humanAgents[0]?.id,
              lastContacted: 'Captured from Website just now',
              notes: wl.notes,
            };
            return [mapped, ...prev];
          });
          appendBotLog({
            employeeId: 'marcus',
            employeeName: 'Marcus Thorne',
            employeeRole: 'AI Lead Manager & Website Intake',
            category: 'WEBSITE_LEAD',
            status: 'SUCCESS',
            title: `Website Lead Captured: ${wl.name}`,
            detail: `Received direct inquiry from ${wl.websiteDomain || 'Agency Website'} for "${wl.propertyInterest}" (${wl.budget}). Added to CRM Database.`,
            channelOrTool: 'Agency Website Leads',
          });
        }}
      />

      {/* ====================================================================
          MODAL 2: GMAIL / CALENDAR CONFIRMATION MODAL (WITH CONFLICT VALIDATION)
          ==================================================================== */}
      {pendingWorkspaceAction && (
        <WorkspaceConfirmModal
          isOpen={true}
          type={pendingWorkspaceAction.type}
          employeeName={pendingWorkspaceAction.employeeName}
          connectedEmail={googleEmail}
          initialData={pendingWorkspaceAction}
          humanAgents={humanAgents}
          isSubmitting={isExecutingWorkspace}
          onCancel={() => setPendingWorkspaceAction(null)}
          onConfirm={handleConfirmWorkspaceAction}
          onValidateMeeting={handleValidateMeetingSchedule}
        />
      )}

      {/* ====================================================================
          MODAL 2B: AI LEAD ENGAGEMENT, SENTIMENT & NEXT STEPS MODAL
          ==================================================================== */}
      {analysisModalLeadId && (
        <LeadAiAnalysisModal
          lead={leads.find((l) => l.id === analysisModalLeadId) || null}
          assignedAgent={
            humanAgents.find(
              (a) =>
                a.id ===
                leads.find((l) => l.id === analysisModalLeadId)
                  ?.assignedHumanAgentId
            ) || humanAgents[0]
          }
          isAnalyzing={analyzingLeadId === analysisModalLeadId}
          error={analysisError}
          onClose={() => {
            setAnalysisModalLeadId(null);
            setAnalysisError(null);
          }}
          onReAnalyze={handleAnalyzeLeadWithAi}
          onExecuteRecommendedStep={handleExecuteRecommendedLeadStep}
        />
      )}

      {/* ====================================================================
          MODAL 3: ADD / EDIT PROPERTY MODAL
          ==================================================================== */}
      {propertyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Home className="w-4 h-4" />
                {editingProperty ? 'Edit Property Listing' : 'Add New Property'}
              </h3>
              <button
                onClick={() => setPropertyModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form
              onSubmit={handleSaveProperty}
              className="p-5 space-y-3 text-xs"
            >
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Property Title
                </label>
                <input
                  type="text"
                  required
                  value={propForm.title}
                  onChange={(e) =>
                    setPropForm({ ...propForm, title: e.target.value })
                  }
                  placeholder="e.g. The Sterling Penthouse"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    value={propForm.address}
                    onChange={(e) =>
                      setPropForm({ ...propForm, address: e.target.value })
                    }
                    placeholder="420 Mercer St, NY"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Neighborhood
                  </label>
                  <input
                    type="text"
                    value={propForm.neighborhood}
                    onChange={(e) =>
                      setPropForm({
                        ...propForm,
                        neighborhood: e.target.value,
                      })
                    }
                    placeholder="SoHo, Manhattan"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Price
                  </label>
                  <input
                    type="text"
                    value={propForm.priceFormatted}
                    onChange={(e) =>
                      setPropForm({
                        ...propForm,
                        priceFormatted: e.target.value,
                      })
                    }
                    placeholder="$6,500,000"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Status
                  </label>
                  <select
                    value={propForm.status}
                    onChange={(e) =>
                      setPropForm({
                        ...propForm,
                        status: e.target.value as PropertyListing['status'],
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Active">Active</option>
                    <option value="Pocket Listing">Pocket Listing</option>
                    <option value="Under Contract">Under Contract</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Beds
                  </label>
                  <input
                    type="number"
                    value={propForm.beds}
                    onChange={(e) =>
                      setPropForm({
                        ...propForm,
                        beds: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Baths
                  </label>
                  <input
                    type="number"
                    value={propForm.baths}
                    onChange={(e) =>
                      setPropForm({
                        ...propForm,
                        baths: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Sq Ft
                  </label>
                  <input
                    type="text"
                    value={propForm.sqft}
                    onChange={(e) =>
                      setPropForm({ ...propForm, sqft: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPropertyModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-slate-900 text-white font-semibold"
                >
                  Save Property
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL 4: ADD / EDIT LEAD OR CLIENT MODAL
          ==================================================================== */}
      {leadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                {editingLead ? 'Edit Lead / Client' : 'Add New Lead / Client'}
              </h3>
              <button
                onClick={() => setLeadModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveLead} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Client Full Name
                </label>
                <input
                  type="text"
                  required
                  value={leadForm.name}
                  onChange={(e) =>
                    setLeadForm({ ...leadForm, name: e.target.value })
                  }
                  placeholder="e.g. Victoria Sterling"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={leadForm.email}
                    onChange={(e) =>
                      setLeadForm({ ...leadForm, email: e.target.value })
                    }
                    placeholder="client@domain.com"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={leadForm.phone}
                    onChange={(e) =>
                      setLeadForm({ ...leadForm, phone: e.target.value })
                    }
                    placeholder="+1 (310) 555-0192"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Budget
                  </label>
                  <input
                    type="text"
                    value={leadForm.budget}
                    onChange={(e) =>
                      setLeadForm({ ...leadForm, budget: e.target.value })
                    }
                    placeholder="$5.5M"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Status
                  </label>
                  <select
                    value={leadForm.status}
                    onChange={(e) =>
                      setLeadForm({
                        ...leadForm,
                        status: e.target.value as ClientLead['status'],
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Unqualified">
                      Unqualified (Inbound Inquiry)
                    </option>
                    <option value="AI Qualified">AI Qualified</option>
                    <option value="Follow-Up Sent">Follow-Up Sent</option>
                    <option value="Tour Scheduled">Tour Scheduled</option>
                    <option value="Offer Submitted">Offer Submitted</option>
                    <option value="Closed Property">Closed Property</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Property Interest
                </label>
                <input
                  type="text"
                  value={leadForm.propertyInterest}
                  onChange={(e) =>
                    setLeadForm({
                      ...leadForm,
                      propertyInterest: e.target.value,
                    })
                  }
                  placeholder="The Mercer Penthouse"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  value={leadForm.notes}
                  onChange={(e) =>
                    setLeadForm({ ...leadForm, notes: e.target.value })
                  }
                  placeholder="Pre-approved buyer, prefers morning showings..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setLeadModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-slate-900 text-white font-semibold"
                >
                  Save Client Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL 5: CREATE OR EDIT AI EMPLOYEE (BOT)
          ==================================================================== */}
      {newBotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Bot className="w-4 h-4 text-amber-400" />
                {editingBotId
                  ? 'Edit AI Employee (Name, Role & Instructions)'
                  : 'Create Custom AI Employee'}
              </h3>
              <button
                onClick={() => {
                  setNewBotModalOpen(false);
                  setEditingBotId(null);
                }}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateBot} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  AI Agent Name *
                </label>
                <input
                  type="text"
                  required
                  value={newBotName}
                  onChange={(e) => setNewBotName(e.target.value)}
                  placeholder="e.g. Sophia Grant"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Role / Title *
                </label>
                <input
                  type="text"
                  required
                  value={newBotRole}
                  onChange={(e) => setNewBotRole(e.target.value)}
                  placeholder="e.g. Escrow & Closing Coordinator"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Specialty
                </label>
                <input
                  type="text"
                  value={newBotSpecialty}
                  onChange={(e) => setNewBotSpecialty(e.target.value)}
                  placeholder="e.g. Inspection deadlines, disclosures & buyer follow-up"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Instructions / System Prompt
                </label>
                <textarea
                  rows={3}
                  value={newBotPrompt}
                  onChange={(e) => setNewBotPrompt(e.target.value)}
                  placeholder="Describe how this AI agent should talk and what tasks it handles..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div className="pt-3 flex items-center justify-between gap-2">
                {editingBotId && employees.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      handleDeleteBot(editingBotId);
                      setNewBotModalOpen(false);
                      setEditingBotId(null);
                    }}
                    className="px-3 py-2 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold cursor-pointer"
                  >
                    Delete AI Agent
                  </button>
                ) : (
                  <div />
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNewBotModalOpen(false);
                      setEditingBotId(null);
                    }}
                    className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold cursor-pointer"
                  >
                    {editingBotId ? 'Save Changes' : 'Create AI Employee'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL 6: SCHEDULE FOLLOW-UP REMINDER MODAL
          ==================================================================== */}
      {reminderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <BellRing className="w-4 h-4 text-amber-400" />
                Schedule Follow-Up Reminder
              </h3>
              <button
                onClick={() => setReminderModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form
              onSubmit={handleSaveReminder}
              className="p-5 space-y-3.5 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Client / Lead
                </label>
                <select
                  value={reminderForm.leadId}
                  onChange={(e) => {
                    const found = leads.find((l) => l.id === e.target.value);
                    if (found) {
                      setReminderForm((prev) => ({
                        ...prev,
                        leadId: found.id,
                        leadName: found.name,
                        leadEmail: found.email,
                        propertyInterest: found.propertyInterest,
                        taskTitle: `Follow up with ${found.name} regarding ${found.propertyInterest}`,
                      }));
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium text-slate-900"
                >
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.propertyInterest})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Follow-Up Task Description
                </label>
                <input
                  type="text"
                  required
                  value={reminderForm.taskTitle}
                  onChange={(e) =>
                    setReminderForm({
                      ...reminderForm,
                      taskTitle: e.target.value,
                    })
                  }
                  placeholder="e.g. Call client to confirm twilight tour & proof of funds"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Follow-Up Channel
                  </label>
                  <select
                    value={reminderForm.channel}
                    onChange={(e) =>
                      setReminderForm({
                        ...reminderForm,
                        channel: e.target.value as LeadReminder['channel'],
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Email">Email (Gmail)</option>
                    <option value="Phone Call">Phone Call</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Property Tour">Property Tour</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Assign AI Employee
                  </label>
                  <select
                    value={reminderForm.assignedEmployeeId}
                    onChange={(e) =>
                      setReminderForm({
                        ...reminderForm,
                        assignedEmployeeId: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.title})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  When to Trigger Notification
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      {
                        id: '15sec',
                        label: 'In 15 Seconds (Test Alert)',
                      },
                      {
                        id: '1hour',
                        label: 'In 1 Hour',
                      },
                      {
                        id: 'tomorrow10am',
                        label: 'Tomorrow · 10:00 AM',
                      },
                      {
                        id: 'custom',
                        label: 'Custom Date & Time',
                      },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() =>
                        setReminderForm({ ...reminderForm, duePreset: opt.id })
                      }
                      className={`px-3 py-2 rounded-lg border text-left font-semibold transition-all flex items-center gap-1.5 ${
                        reminderForm.duePreset === opt.id
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{opt.label}</span>
                    </button>
                  ))}
                </div>

                {reminderForm.duePreset === 'custom' && (
                  <input
                    type="datetime-local"
                    value={reminderForm.customDueIso}
                    onChange={(e) =>
                      setReminderForm({
                        ...reminderForm,
                        customDueIso: e.target.value,
                      })
                    }
                    className="mt-2 w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                )}
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReminderModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold"
                >
                  <BellRing className="w-3.5 h-3.5 text-amber-400" />
                  Schedule Reminder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================
          LIVE REMINDER NOTIFICATION BANNER (FIRES WHEN REMINDER IS DUE)
          ==================================================================== */}
      {activeReminderToast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full bg-slate-900 text-white border border-slate-700 rounded-2xl shadow-2xl p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0">
                <BellRing className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  Follow-Up Reminder Due Now
                </div>
                <div className="text-sm font-bold text-white">
                  {activeReminderToast.leadName}
                </div>
              </div>
            </div>
            <button
              onClick={() => setActiveReminderToast(null)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            {activeReminderToast.taskTitle} ({activeReminderToast.channel})
          </p>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={() => {
                handleToggleReminderComplete(activeReminderToast.id);
                setActiveReminderToast(null);
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
            >
              Mark Complete
            </button>
            <button
              onClick={() => {
                const rem = activeReminderToast;
                setActiveReminderToast(null);
                handleRunReminderWithAi(rem);
              }}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold"
            >
              Run with AI Employee
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
export default App;
