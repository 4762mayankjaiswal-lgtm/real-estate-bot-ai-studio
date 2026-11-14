export type ToolId =
  | 'gmail'
  | 'google_calendar'
  | 'google_maps'
  | 'whatsapp'
  | 'instagram'
  | 'facebook'
  | 'telnyx'
  | 'website_leads';

export type ToolIntegrationId = ToolId;

export type EmployeeId = string;

export interface ConnectedAppAccount {
  id: string;
  label: string;
  accountHandle: string;
  webhookUrl?: string;
  isPrimary: boolean;
  verifiedDetail: string;
  createdAt: string;
  authType?: 'oauth' | 'smtp' | 'api_key' | 'webhook';
  accessToken?: string;
}

export interface HumanAgent {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  whatsapp: string;
  specialty: string;
  avatarInitials: string;
  calendarId: string;
  calendarConnected: boolean;
  calendarSyncMode?: 'google_oauth' | 'calendar_invite';
  calendarAccessToken?: string;
  availability: string;
  activeListingsCount: number;
  lastContactedByAi?: string;
}

export interface BotLogEntry {
  id: string;
  timestamp: string;
  isoTime: string;
  employeeId: EmployeeId;
  employeeName: string;
  employeeRole: string;
  category:
    | 'AI_TASK'
    | 'EMAIL_SENT'
    | 'CALENDAR_SYNC'
    | 'WEBSITE_LEAD'
    | 'HUMAN_AGENT_HANDOFF'
    | 'VOICE_CALL'
    | 'CHANNEL_DISPATCH'
    | 'REMINDER_ALERT'
    | 'SYSTEM';
  status: 'SUCCESS' | 'RUNNING' | 'WARNING' | 'ERROR';
  title: string;
  detail: string;
  channelOrTool?: string;
}

export interface LeadAiAnalysis {
  leadId: string;
  generatedAt: string;
  providerUsed: string;
  engagementSummary: string;
  sentiment: 'High Intent' | 'Positive' | 'Urgent' | 'Neutral' | 'Cautious';
  sentimentScore: number;
  sentimentRationale: string;
  keySignals: string[];
  recommendedNextSteps: {
    step: string;
    channel:
      | 'Email'
      | 'Phone Call'
      | 'Google Calendar Tour'
      | 'WhatsApp'
      | 'Human Agent Handoff';
    priority: 'Immediate' | 'High' | 'Medium';
    suggestedActionPrompt: string;
  }[];
  analyzedEmailCount: number;
  analyzedChatLogCount: number;
}

export interface ScheduledMeetingRecord {
  id: string;
  title: string;
  startIso: string;
  endIso: string;
  durationMinutes: number;
  agentId: string;
  agentName: string;
  agentEmail: string;
  calendarId: string;
  leadId?: string;
  leadName: string;
  leadEmail: string;
  propertyTitle: string;
  source: 'Google Calendar' | 'CRM Tour Schedule' | 'Lead History';
  htmlLink?: string;
}

export interface MeetingConflictItem {
  id: string;
  source: 'Agent Google Calendar' | 'Assigned Agent Schedule' | 'Lead History';
  title: string;
  startIso: string;
  endIso: string;
  formattedTime: string;
  detail: string;
}

export interface MeetingValidationResult {
  valid: boolean;
  checkedGoogleCalendarLive: boolean;
  agentName: string;
  agentCalendarId: string;
  leadName: string;
  conflicts: MeetingConflictItem[];
  warnings: string[];
  suggestedSlots: {
    label: string;
    startIso: string;
  }[];
}

export interface ProposedToolAction {
  actionType:
    | 'NONE'
    | 'GMAIL_SEND'
    | 'CALENDAR_CREATE'
    | 'MAPS_SEARCH'
    | 'WEBHOOK_OR_SMS_DISPATCH'
    | 'DB_ADD_LEAD'
    | 'DB_ADD_PROPERTY'
    | 'CONTACT_HUMAN_AGENT';
  recipientEmail?: string;
  emailSubject?: string;
  emailBody?: string;
  eventSummary?: string;
  eventDescription?: string;
  eventStartIso?: string;
  eventDurationMinutes?: number;
  attendeeEmail?: string;
  humanAgentId?: string;
  humanAgentName?: string;
  humanAgentEmail?: string;
  humanAgentPhone?: string;
  mapsQuery?: string;
  mapsLocation?: string;
  targetChannel?: string;
  recipientPhoneOrHandle?: string;
  smsOrPostBody?: string;
  leadName?: string;
  leadEmail?: string;
  leadPhone?: string;
  leadBudget?: string;
  leadTimeline?: string;
  leadPropertyInterest?: string;
  leadStatus?: string;
  leadNotes?: string;
  propertyTitle?: string;
  propertyAddress?: string;
  propertyNeighborhood?: string;
  propertyPrice?: string;
  propertyBeds?: number;
  propertyBaths?: number;
  propertySqft?: string;
  propertyStatus?: string;
  executed?: boolean;
  executionResult?: string;
  mapsPlaces?: { title: string; uri: string }[];
}

export interface EmployeeChatMessage {
  id: string;
  sender: 'user' | 'employee';
  text: string;
  timestamp: string;
  actionBadge?: string;
  proposedAction?: ProposedToolAction;
}

export interface AIEmployee {
  id: EmployeeId;
  name: string;
  role: string;
  title: string;
  specialty: string;
  avatarInitials: string;
  accentColor: string;
  status: 'active' | 'busy' | 'idle';
  currentAction: string;
  metrics: {
    actionsToday: number;
    responseTime: string;
  };
  connectedTools: ToolId[];
  samplePrompts: string[];
  systemPrompt: string;
}

export interface PropertyListing {
  id: string;
  title: string;
  address: string;
  neighborhood: string;
  price: number;
  priceFormatted: string;
  beds: number;
  baths: number;
  sqft: string;
  status: 'Active' | 'Pocket Listing' | 'Under Contract';
  image: string;
  HighlightTag: string;
  showingSlots: string[];
}

export interface ClientLead {
  id: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  budget: string;
  timeline: string;
  propertyInterest: string;
  qualificationScore: number;
  status: 'Unqualified' | 'AI Qualified' | 'Follow-Up Sent' | 'Tour Scheduled';
  assignedEmployeeId: EmployeeId;
  assignedHumanAgentId?: string;
  lastContacted: string;
  notes: string;
  aiAnalysis?: LeadAiAnalysis;
}

export interface ToolConnection {
  id: ToolId;
  name: string;
  category:
    | 'Google Workspace & Maps'
    | 'Meta Omnichannel'
    | 'Voice & SMS Telephony'
    | 'Website & Lead Capture';
  connected: boolean;
  accountHandle: string;
  endpointSummary: string;
  assignedEmployees: string[];
  webhookUrl: string;
  lastSync: string;
  guidedSteps: string[];
  accounts?: ConnectedAppAccount[];
}

export interface LeadReminder {
  id: string;
  leadId: string;
  leadName: string;
  leadEmail: string;
  propertyInterest: string;
  taskTitle: string;
  dueAt: string; // ISO timestamp or formatted schedule
  dueLabel: string;
  channel: 'Email' | 'Phone Call' | 'WhatsApp' | 'Property Tour';
  assignedEmployeeId: EmployeeId;
  completed: boolean;
  notified: boolean;
  createdAt: string;
}

export type ToolConnectionConfig = ToolConnection;
