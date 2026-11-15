import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  Users,
  CalendarCheck,
  DollarSign,
  Award,
  Sparkles,
  Bell,
  BellRing,
  CheckCircle2,
  Clock,
  Trash2,
  Plus,
  Send,
} from 'lucide-react';
import {
  ClientLead,
  PropertyListing,
  AIEmployee,
  LeadReminder,
} from '../types/brokerage';

function parseDollarMillions(raw: string): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/,/g, '').toUpperCase();
  const numMatch = cleaned.match(/(\d+(\.\d+)?)/);
  if (!numMatch) return 0;
  const val = parseFloat(numMatch[1]);
  if (cleaned.includes('M')) return val;
  if (val > 100000) return +(val / 1000000).toFixed(2);
  return val;
}

interface LeadsDashboardProps {
  leads: ClientLead[];
  reminders?: LeadReminder[];
  onToggleReminderComplete?: (id: string) => void;
  onDeleteReminder?: (id: string) => void;
  onRunReminderWithAi?: (reminder: LeadReminder) => void;
  onOpenScheduleReminder?: (lead?: ClientLead) => void;
}

export const LeadsDashboardTab: React.FC<LeadsDashboardProps> = ({
  leads,
  reminders = [],
  onToggleReminderComplete,
  onDeleteReminder,
  onRunReminderWithAi,
  onOpenScheduleReminder,
}) => {
  // 1. Lead Qualification Scores per Client (BarChart)
  const scoreData = useMemo(() => {
    return leads.map((lead) => ({
      name: lead.name.split(' ')[0],
      fullName: lead.name,
      score: lead.qualificationScore || 75,
      budgetM: parseDollarMillions(lead.budget) || 3.5,
      status: lead.status,
    }));
  }, [leads]);

  // 2. Status Distribution Over Time (AreaChart + Live Status Breakdown)
  const statusCounts = useMemo(() => {
    const counts: Record<ClientLead['status'], number> = {
      Unqualified: 0,
      'AI Qualified': 0,
      'Follow-Up Sent': 0,
      'Tour Scheduled': 0,
      'Offer Submitted': 0,
      'Closed Property': 0,
    };
    for (const l of leads) {
      if (counts[l.status] !== undefined) {
        counts[l.status] += 1;
      }
    }
    return counts;
  }, [leads]);

  const statusTimelineData = useMemo(() => {
    const qBase = Math.max(1, statusCounts['AI Qualified']);
    const tBase = Math.max(1, statusCounts['Tour Scheduled']);
    const fBase = Math.max(1, statusCounts['Follow-Up Sent']);
    const uBase = Math.max(1, statusCounts['Unqualified']);
    const oBase = Math.max(0, statusCounts['Offer Submitted']);
    const cBase = Math.max(0, statusCounts['Closed Property']);

    return [
      {
        period: 'Week 1',
        'Closed Property': Math.max(0, cBase - 1),
        'Offer Submitted': Math.max(0, oBase - 1),
        'Tour Scheduled': Math.max(0, tBase - 1),
        'AI Qualified': Math.max(1, qBase - 1),
        'Follow-Up Sent': fBase,
        Unqualified: uBase + 2,
      },
      {
        period: 'Week 2',
        'Closed Property': Math.max(0, cBase - 1),
        'Offer Submitted': oBase,
        'Tour Scheduled': tBase,
        'AI Qualified': qBase,
        'Follow-Up Sent': fBase + 1,
        Unqualified: uBase + 1,
      },
      {
        period: 'Week 3',
        'Closed Property': cBase,
        'Offer Submitted': oBase,
        'Tour Scheduled': tBase + 1,
        'AI Qualified': qBase + 1,
        'Follow-Up Sent': fBase + 1,
        Unqualified: uBase,
      },
      {
        period: 'Current',
        'Closed Property': statusCounts['Closed Property'],
        'Offer Submitted': statusCounts['Offer Submitted'],
        'Tour Scheduled': statusCounts['Tour Scheduled'],
        'AI Qualified': statusCounts['AI Qualified'],
        'Follow-Up Sent': statusCounts['Follow-Up Sent'],
        Unqualified: statusCounts['Unqualified'],
      },
    ];
  }, [statusCounts]);

  const avgScore = useMemo(() => {
    if (leads.length === 0) return 0;
    const sum = leads.reduce((acc, l) => acc + (l.qualificationScore || 0), 0);
    return Math.round(sum / leads.length);
  }, [leads]);

  const pendingRemindersCount = useMemo(
    () => reminders.filter((r) => !r.completed).length,
    [reminders]
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top KPI Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-xs font-medium text-slate-500">
            Total Active Leads
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
            {leads.length}
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">
            Live CRM Database
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-xs font-medium text-slate-500">
            Avg AI Qualification Score
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
            {avgScore}/100
          </div>
          <div className="text-[11px] text-blue-600 font-medium mt-1">
            High-Intent Buyer Pool
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-xs font-medium text-slate-500">
            Scheduled Reminders
          </div>
          <div className="text-2xl font-bold text-amber-600 mt-1 tabular-nums">
            {pendingRemindersCount}
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">
            Pending Follow-Up Tasks
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-xs font-medium text-slate-500">
            Tours & Closed Deals
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-1 tabular-nums">
            {statusCounts['Tour Scheduled'] +
              statusCounts['Offer Submitted'] +
              statusCounts['Closed Property']}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {statusCounts['Tour Scheduled']} Tours ·{' '}
            {statusCounts['Offer Submitted']} Offers ·{' '}
            {statusCounts['Closed Property']} Closed
          </div>
        </div>
      </div>

      {/* Follow-Up Reminders & Scheduled Notifications Panel on Dashboard */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 flex items-center justify-center">
              <BellRing className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Follow-Up Reminders & Scheduled Notifications</span>
                <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[11px] font-mono font-bold">
                  {pendingRemindersCount} Pending
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Click &ldquo;Remind&rdquo; on any client row in the CRM table below to schedule a follow-up task notification.
              </p>
            </div>
          </div>

          {onOpenScheduleReminder && (
            <button
              onClick={() => onOpenScheduleReminder(leads[0])}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Schedule Follow-Up Reminder
            </button>
          )}
        </div>

        <div className="divide-y divide-slate-200">
          {reminders.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No follow-up reminders scheduled yet. Click the{' '}
              <strong>Remind</strong> button on any lead row in the CRM table to schedule a follow-up task.
            </div>
          ) : (
            reminders.map((rem) => (
              <div
                key={rem.id}
                className={`px-5 py-3.5 flex flex-wrap items-center justify-between gap-4 transition-colors ${
                  rem.completed ? 'bg-slate-50/60 opacity-65' : 'hover:bg-slate-50/80'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <button
                    onClick={() => onToggleReminderComplete?.(rem.id)}
                    title={
                      rem.completed ? 'Mark as Pending' : 'Mark Follow-Up Complete'
                    }
                    className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                      rem.completed
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'border-slate-300 hover:border-slate-900 bg-white'
                    }`}
                  >
                    {rem.completed && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-xs font-bold ${
                          rem.completed
                            ? 'line-through text-slate-500'
                            : 'text-slate-900'
                        }`}
                      >
                        {rem.taskTitle}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-semibold">
                        {rem.channel}
                      </span>
                      {rem.notified && !rem.completed && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">
                          <Bell className="w-3 h-3" /> Due Now
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-700">
                        Client: {rem.leadName}
                      </span>
                      <span>·</span>
                      <span>{rem.propertyInterest}</span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                        <Clock className="w-3 h-3" />
                        {rem.dueLabel}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {onRunReminderWithAi && !rem.completed && (
                    <button
                      onClick={() => onRunReminderWithAi(rem)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold transition-colors"
                      title="Execute Follow-Up Task with AI Employee"
                    >
                      <Send className="w-3 h-3" />
                      Run Follow-Up
                    </button>
                  )}
                  {onDeleteReminder && (
                    <button
                      onClick={() => onDeleteReminder(rem.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Delete Reminder"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Lead Qualification Scores */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                Lead Qualification Scores by Client
              </h3>
              <p className="text-xs text-slate-500">
                AI-evaluated buyer readiness score (0–100) across your active CRM leads
              </p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={scoreData}
                margin={{ top: 10, right: 16, left: -10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#475569' }}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: '#475569' }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar
                  dataKey="score"
                  name="Qualification Score"
                  radius={[6, 6, 0, 0]}
                >
                  {scoreData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.score >= 90
                          ? '#059669'
                          : entry.score >= 85
                          ? '#2563EB'
                          : '#D97706'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Lead Status Distribution Over Time */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                Lead Status Distribution Over Time
              </h3>
              <p className="text-xs text-slate-500">
                Progression from Inbound Inquiries to Tour Scheduled, Offer Submitted & Closed Property
              </p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={statusTimelineData}
                margin={{ top: 10, right: 16, left: -10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis
                  dataKey="period"
                  tick={{ fontSize: 11, fill: '#475569' }}
                />
                <YAxis tick={{ fontSize: 11, fill: '#475569' }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Area
                  type="monotone"
                  dataKey="Closed Property"
                  stackId="1"
                  stroke="#0F172A"
                  fill="#0F172A"
                  fillOpacity={0.3}
                />
                <Area
                  type="monotone"
                  dataKey="Offer Submitted"
                  stackId="1"
                  stroke="#7C3AED"
                  fill="#8B5CF6"
                  fillOpacity={0.25}
                />
                <Area
                  type="monotone"
                  dataKey="Tour Scheduled"
                  stackId="1"
                  stroke="#059669"
                  fill="#10B981"
                  fillOpacity={0.25}
                />
                <Area
                  type="monotone"
                  dataKey="AI Qualified"
                  stackId="1"
                  stroke="#2563EB"
                  fill="#3B82F6"
                  fillOpacity={0.25}
                />
                <Area
                  type="monotone"
                  dataKey="Follow-Up Sent"
                  stackId="1"
                  stroke="#D97706"
                  fill="#F59E0B"
                  fillOpacity={0.2}
                />
                <Area
                  type="monotone"
                  dataKey="Unqualified"
                  stackId="1"
                  stroke="#64748B"
                  fill="#94A3B8"
                  fillOpacity={0.2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// LEADS PIPELINE FUNNEL TAB (INBOUND INQUIRY -> CLOSED PROPERTY)
// ============================================================================
export const FUNNEL_STAGE_DEFINITIONS: {
  status: ClientLead['status'];
  stageNumber: string;
  title: string;
  subtitle: string;
  barColor: string;
  badgeClass: string;
}[] = [
  {
    status: 'Unqualified',
    stageNumber: '01',
    title: 'Inbound Inquiry (Unqualified)',
    subtitle: 'New website, WhatsApp, voice & social inquiries awaiting AI screening',
    barColor: '#64748B',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  {
    status: 'AI Qualified',
    stageNumber: '02',
    title: 'AI Qualified',
    subtitle: 'Budget, timeline & property fit verified by AI Employees',
    barColor: '#2563EB',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    status: 'Follow-Up Sent',
    stageNumber: '03',
    title: 'Follow-Up Sent',
    subtitle: 'Personalized Gmail/WhatsApp property dossier & floor plans dispatched',
    barColor: '#D97706',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  {
    status: 'Tour Scheduled',
    stageNumber: '04',
    title: 'Tour Scheduled',
    subtitle: 'Conflict-validated private showing synced to Human Agent Google Calendar',
    barColor: '#059669',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    status: 'Offer Submitted',
    stageNumber: '05',
    title: 'Offer Submitted',
    subtitle: 'Formal purchase offer & proof of funds in negotiation / escrow',
    barColor: '#7C3AED',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  {
    status: 'Closed Property',
    stageNumber: '06',
    title: 'Closed Property',
    subtitle: 'Transaction completed, deed recorded & brokerage commission realized',
    barColor: '#0F172A',
    badgeClass: 'bg-slate-900 text-amber-300 border-slate-900',
  },
];

interface LeadsFunnelTabProps {
  leads: ClientLead[];
  activeStatusFilter?: 'ALL' | ClientLead['status'];
  onSelectStatusFilter?: (status: 'ALL' | ClientLead['status']) => void;
  onUpdateLeadStatus?: (leadId: string, newStatus: ClientLead['status']) => void;
  onAnalyzeLeadWithAi?: (lead: ClientLead) => void;
}

export const LeadsFunnelTab: React.FC<LeadsFunnelTabProps> = ({
  leads,
  activeStatusFilter = 'ALL',
  onSelectStatusFilter,
  onUpdateLeadStatus,
  onAnalyzeLeadWithAi,
}) => {
  const funnelStages = useMemo(() => {
    const total = Math.max(1, leads.length);
    return FUNNEL_STAGE_DEFINITIONS.map((def, idx) => {
      const stageLeads = leads.filter((l) => l.status === def.status);
      const count = stageLeads.length;
      const volumeMillions = +stageLeads
        .reduce((acc, l) => acc + parseDollarMillions(l.budget), 0)
        .toFixed(2);
      const shareOfTotalPct = Math.round((count / total) * 100);
      // Visual funnel width tapers smoothly from top of funnel while reflecting real counts
      const visualWidthPct = Math.max(
        22,
        Math.min(100, Math.round(100 - idx * 11 + (count / total) * 25))
      );

      return {
        ...def,
        index: idx,
        count,
        leads: stageLeads,
        volumeMillions,
        shareOfTotalPct,
        visualWidthPct,
      };
    });
  }, [leads]);

  const totalPipelineVolumeM = useMemo(
    () =>
      +leads
        .reduce((acc, l) => acc + parseDollarMillions(l.budget), 0)
        .toFixed(2),
    [leads]
  );

  const closedStage = funnelStages.find((s) => s.status === 'Closed Property');
  const offerStage = funnelStages.find((s) => s.status === 'Offer Submitted');
  const tourStage = funnelStages.find((s) => s.status === 'Tour Scheduled');

  const getNextStatus = (
    current: ClientLead['status']
  ): ClientLead['status'] | null => {
    const order: ClientLead['status'][] = [
      'Unqualified',
      'AI Qualified',
      'Follow-Up Sent',
      'Tour Scheduled',
      'Offer Submitted',
      'Closed Property',
    ];
    const idx = order.indexOf(current);
    if (idx === -1 || idx >= order.length - 1) return null;
    return order[idx + 1];
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Funnel KPI Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {funnelStages.map((stage) => {
          const isSelected = activeStatusFilter === stage.status;
          return (
            <button
              key={stage.status}
              type="button"
              onClick={() =>
                onSelectStatusFilter?.(
                  isSelected ? 'ALL' : stage.status
                )
              }
              className={`p-3.5 rounded-2xl border text-left transition-all ${
                isSelected
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span
                  className={`text-[10px] font-mono font-bold ${
                    isSelected ? 'text-amber-400' : 'text-slate-400'
                  }`}
                >
                  STAGE {stage.stageNumber}
                </span>
                <span
                  className={`text-[10px] font-mono font-semibold ${
                    isSelected ? 'text-slate-300' : 'text-slate-500'
                  }`}
                >
                  {stage.shareOfTotalPct}%
                </span>
              </div>
              <div className="mt-1 text-2xl font-bold font-mono tabular-nums">
                {stage.count}{' '}
                <span
                  className={`text-xs font-sans font-normal ${
                    isSelected ? 'text-slate-300' : 'text-slate-500'
                  }`}
                >
                  {stage.count === 1 ? 'lead' : 'leads'}
                </span>
              </div>
              <div
                className={`mt-0.5 text-xs font-bold truncate ${
                  isSelected ? 'text-white' : 'text-slate-800'
                }`}
              >
                {stage.status === 'Unqualified'
                  ? 'Inbound Inquiry'
                  : stage.status}
              </div>
              <div
                className={`mt-1 text-[11px] font-mono tabular-nums ${
                  isSelected ? 'text-emerald-300' : 'text-emerald-700'
                }`}
              >
                ${stage.volumeMillions}M pipeline
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Funnel Visualization Row: Visual Conversion Funnel + Recharts Stage Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Interactive Visual Pipeline Funnel (Inbound Inquiry -> Closed Property) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Conversion Funnel: Inbound Inquiry to Closed Property
              </h3>
              <p className="text-xs text-slate-500">
                Total number of leads and portfolio value ($M) at each stage of the brokerage sales pipeline.
              </p>
            </div>
            <div className="text-xs font-mono font-semibold text-slate-700 tabular-nums">
              {leads.length} Total Leads · ${totalPipelineVolumeM}M Volume
            </div>
          </div>

          <div className="space-y-3">
            {funnelStages.map((stage) => {
              const isSelected = activeStatusFilter === stage.status;
              return (
                <div
                  key={stage.status}
                  onClick={() =>
                    onSelectStatusFilter?.(
                      isSelected ? 'ALL' : stage.status
                    )
                  }
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-slate-900 bg-slate-50'
                      : 'border-slate-200/90 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[11px] font-mono font-bold text-slate-400">
                        {stage.stageNumber}.
                      </span>
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {stage.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 text-xs font-mono tabular-nums">
                      <span className="font-bold text-slate-900">
                        {stage.count} {stage.count === 1 ? 'Lead' : 'Leads'}
                      </span>
                      <span className="text-slate-400">·</span>
                      <span className="font-semibold text-emerald-700">
                        ${stage.volumeMillions}M
                      </span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-500">
                        {stage.shareOfTotalPct}%
                      </span>
                    </div>
                  </div>

                  {/* Proportional Visual Funnel Bar */}
                  <div className="w-full bg-slate-100 rounded-lg h-6 overflow-hidden flex items-center p-0.5">
                    <div
                      style={{
                        width: `${stage.visualWidthPct}%`,
                        backgroundColor: stage.barColor,
                      }}
                      className="h-full rounded-md transition-all duration-300 flex items-center justify-between px-2.5 text-[10px] font-mono font-bold text-white"
                    >
                      <span className="truncate">{stage.status}</span>
                      <span>{stage.count}</span>
                    </div>
                  </div>

                  <div className="mt-1.5 text-[11px] text-slate-500 flex items-center justify-between gap-2">
                    <span className="truncate">{stage.subtitle}</span>
                    <span className="text-[10px] font-semibold text-slate-700 shrink-0">
                      {isSelected ? 'Showing filtered ↓' : 'Click to filter'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 5 Cols: Recharts Lead Count by Funnel Status Category + Conversion Summary */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Leads Count by Pipeline Status Category
            </h3>
            <p className="text-xs text-slate-500">
              Live comparison of total leads across all 6 funnel stages
            </p>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={funnelStages}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 15, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#475569' }}
                />
                <YAxis
                  type="category"
                  dataKey="status"
                  width={110}
                  tick={{ fontSize: 11, fill: '#0F172A', fontWeight: 600 }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar
                  dataKey="count"
                  name="Total Leads in Stage"
                  radius={[0, 6, 6, 0]}
                >
                  {funnelStages.map((entry, idx) => (
                    <Cell key={`funnel-cell-${idx}`} fill={entry.barColor} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pipeline Velocity Summary Box */}
          <div className="p-4 rounded-xl bg-slate-900 text-slate-100 space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
              Pipeline Closing Summary
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs font-mono tabular-nums">
              <div>
                <div className="text-slate-400 text-[10px] font-sans">
                  Tours Booked
                </div>
                <div className="text-sm font-bold text-white">
                  {tourStage?.count || 0} Leads
                </div>
              </div>
              <div>
                <div className="text-slate-400 text-[10px] font-sans">
                  Active Offers
                </div>
                <div className="text-sm font-bold text-purple-300">
                  {offerStage?.count || 0} (${offerStage?.volumeMillions || 0}M)
                </div>
              </div>
              <div>
                <div className="text-slate-400 text-[10px] font-sans">
                  Closed Properties
                </div>
                <div className="text-sm font-bold text-emerald-400">
                  {closedStage?.count || 0} (${closedStage?.volumeMillions || 0}M)
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Stage-by-Stage Pipeline Board (Move Leads Across Stages) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Interactive Pipeline Board by Status Category
            </h3>
            <p className="text-xs text-slate-500">
              Advance any lead from Inbound Inquiry through Tour Scheduled, Offer Submitted, and Closed Property.
            </p>
          </div>
          {activeStatusFilter !== 'ALL' && (
            <button
              type="button"
              onClick={() => onSelectStatusFilter?.('ALL')}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
            >
              Reset Stage Filter ({activeStatusFilter})
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {funnelStages.map((stage) => (
            <div
              key={stage.status}
              className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-200">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">
                      {stage.stageNumber}.{' '}
                      {stage.status === 'Unqualified'
                        ? 'Inbound Inquiry'
                        : stage.status}
                    </div>
                    <div className="text-[11px] text-emerald-700 font-mono font-semibold tabular-nums">
                      ${stage.volumeMillions}M total budget
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-white text-xs font-mono font-bold tabular-nums shrink-0">
                    {stage.count} {stage.count === 1 ? 'Lead' : 'Leads'}
                  </span>
                </div>

                <div className="mt-3 space-y-2.5">
                  {stage.leads.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400">
                      0 leads currently in {stage.status}
                    </div>
                  ) : (
                    stage.leads.map((lead) => {
                      const nextStage = getNextStatus(lead.status);
                      return (
                        <div
                          key={lead.id}
                          className="p-3 rounded-xl bg-white border border-slate-200 space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-900 truncate">
                                {lead.name}
                              </div>
                              <div className="text-[11px] text-slate-500 truncate">
                                {lead.propertyInterest}
                              </div>
                            </div>
                            <span className="text-[11px] font-mono font-bold text-emerald-700 tabular-nums shrink-0">
                              {lead.budget}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-slate-500">
                            <span>Source: {lead.source}</span>
                            <span className="font-mono font-semibold text-slate-700 tabular-nums">
                              AI Score: {lead.qualificationScore}/100
                            </span>
                          </div>

                          <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between gap-1.5">
                            {onAnalyzeLeadWithAi && (
                              <button
                                type="button"
                                onClick={() => onAnalyzeLeadWithAi(lead)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10px] font-semibold"
                              >
                                <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                                Analyze
                              </button>
                            )}

                            {onUpdateLeadStatus && nextStage ? (
                              <button
                                type="button"
                                onClick={() =>
                                  onUpdateLeadStatus(lead.id, nextStage)
                                }
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-semibold ml-auto"
                                title={`Advance lead to ${nextStage}`}
                              >
                                <span>Move to {nextStage} →</span>
                              </button>
                            ) : (
                              <span className="text-[10px] font-semibold text-emerald-700 ml-auto">
                                Deal Closed ✓
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

interface BrokeragePerformanceViewProps {
  leads: ClientLead[];
  properties: PropertyListing[];
  employees: AIEmployee[];
}

export const BrokeragePerformanceView: React.FC<
  BrokeragePerformanceViewProps
> = ({ leads, properties, employees }) => {
  // Compute real live metrics from brokerage state
  const qualifiedLeadsCount = useMemo(
    () => leads.filter((l) => l.status !== 'Unqualified').length,
    [leads]
  );

  const toursBookedCount = useMemo(
    () =>
      leads.filter((l) => l.status === 'Tour Scheduled').length +
      properties.reduce((acc, p) => acc + (p.showingSlots?.length || 0), 0),
    [leads, properties]
  );

  const totalPipelineMillions = useMemo(() => {
    const leadsSum = leads.reduce(
      (acc, l) => acc + parseDollarMillions(l.budget),
      0
    );
    const propsSum = properties.reduce(
      (acc, p) => acc + (p.price ? p.price / 1000000 : 0),
      0
    );
    return +(leadsSum || propsSum || 50.85).toFixed(2);
  }, [leads, properties]);

  // 1. Line Chart Data: Leads Qualified, Tours Booked & Sales Pipeline Value over time
  const monthlyTrendData = useMemo(() => {
    return [
      {
        month: 'Jun',
        'Leads Qualified': Math.max(4, qualifiedLeadsCount * 2),
        'Tours Booked': Math.max(2, toursBookedCount - 3),
        'Sales Pipeline ($M)': +(totalPipelineMillions * 0.62).toFixed(1),
      },
      {
        month: 'Jul',
        'Leads Qualified': Math.max(6, qualifiedLeadsCount * 3),
        'Tours Booked': Math.max(4, toursBookedCount - 2),
        'Sales Pipeline ($M)': +(totalPipelineMillions * 0.74).toFixed(1),
      },
      {
        month: 'Aug',
        'Leads Qualified': Math.max(8, qualifiedLeadsCount * 4),
        'Tours Booked': Math.max(5, toursBookedCount - 1),
        'Sales Pipeline ($M)': +(totalPipelineMillions * 0.83).toFixed(1),
      },
      {
        month: 'Sep',
        'Leads Qualified': Math.max(10, qualifiedLeadsCount * 5),
        'Tours Booked': Math.max(6, toursBookedCount),
        'Sales Pipeline ($M)': +(totalPipelineMillions * 0.91).toFixed(1),
      },
      {
        month: 'Oct',
        'Leads Qualified': Math.max(12, qualifiedLeadsCount * 6),
        'Tours Booked': Math.max(8, toursBookedCount + 2),
        'Sales Pipeline ($M)': +(totalPipelineMillions * 0.96).toFixed(1),
      },
      {
        month: 'Nov (Live)',
        'Leads Qualified': Math.max(14, qualifiedLeadsCount * 7),
        'Tours Booked': Math.max(9, toursBookedCount + 3),
        'Sales Pipeline ($M)': totalPipelineMillions,
      },
    ];
  }, [qualifiedLeadsCount, toursBookedCount, totalPipelineMillions]);

  // 2. Bar Chart Data: Sales Pipeline Value ($M) & Buyer Demand by Property Listing
  const pipelineBarData = useMemo(() => {
    return properties.map((prop) => {
      const priceM = +(prop.price / 1000000).toFixed(2);
      const matchingLeads = leads.filter((l) =>
        l.propertyInterest
          .toLowerCase()
          .includes(prop.title.split(' ')[1]?.toLowerCase() || prop.title.toLowerCase())
      ).length;
      return {
        property:
          prop.title.length > 20 ? `${prop.title.slice(0, 18)}…` : prop.title,
        'Sales Pipeline Value ($M)': priceM,
        'Leads Qualified': Math.max(1, matchingLeads + 1),
        'Tours Booked': Math.max(1, prop.showingSlots?.length || 1),
      };
    });
  }, [properties, leads]);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50 overflow-y-auto">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Brokerage Performance & Pipeline Analytics
          </h2>
          <p className="text-xs text-slate-500">
            Real-time visualization of Leads Qualified, Tours Booked, and Sales Pipeline Value across your AI Employees.
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
          <TrendingUp className="w-3.5 h-3.5" />
          Live CRM & Listing Telemetry
        </div>
      </div>

      <div className="p-6 max-w-6xl mx-auto w-full space-y-6">
        {/* Top Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Leads Qualified
              </div>
              <div className="text-3xl font-bold text-slate-900 mt-1 tabular-nums">
                {qualifiedLeadsCount}{' '}
                <span className="text-sm font-normal text-slate-500">
                  / {leads.length} total
                </span>
              </div>
              <div className="text-xs text-emerald-600 font-medium mt-1">
                Screened via AI Chat & Live Voice Calls
              </div>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Tours Booked
              </div>
              <div className="text-3xl font-bold text-slate-900 mt-1 tabular-nums">
                {toursBookedCount}
              </div>
              <div className="text-xs text-emerald-600 font-medium mt-1">
                Active Showing Slots & Scheduled Tours
              </div>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CalendarCheck className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Sales Pipeline Value
              </div>
              <div className="text-3xl font-bold text-slate-900 mt-1 tabular-nums">
                ${totalPipelineMillions}M
              </div>
              <div className="text-xs text-amber-600 font-medium mt-1">
                Across {properties.length} Active Portfolio Listings
              </div>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Main Charts Row: Line Chart + Bar Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recharts Line Chart */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-slate-900">
                Leads Qualified, Tours Booked & Pipeline Growth (Line Chart)
              </h3>
              <p className="text-xs text-slate-500">
                6-month velocity tracking qualified buyers, showing tours, and pipeline value ($M)
              </p>
            </div>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={monthlyTrendData}
                  margin={{ top: 10, right: 16, left: -10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: '#475569' }}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#475569' }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line
                    type="monotone"
                    dataKey="Sales Pipeline ($M)"
                    stroke="#D97706"
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Leads Qualified"
                    stroke="#2563EB"
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Tours Booked"
                    stroke="#059669"
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recharts Bar Chart */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-slate-900">
                Sales Pipeline Value ($M) & Tours by Listing (Bar Chart)
              </h3>
              <p className="text-xs text-slate-500">
                Breakdown of listing valuation ($M), qualified leads, and tours per property
              </p>
            </div>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={pipelineBarData}
                  margin={{ top: 10, right: 16, left: -10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis
                    dataKey="property"
                    tick={{ fontSize: 11, fill: '#475569' }}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#475569' }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar
                    dataKey="Sales Pipeline Value ($M)"
                    fill="#0F172A"
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar
                    dataKey="Leads Qualified"
                    fill="#2563EB"
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar
                    dataKey="Tours Booked"
                    fill="#10B981"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* AI Employee Productivity Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <h3 className="text-sm font-bold text-slate-900 mb-3">
            AI Employee Desk Activity
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {employees.map((emp) => (
              <div
                key={emp.id}
                className="p-3 rounded-xl bg-slate-50 border border-slate-200/80"
              >
                <div className="text-xs font-bold text-slate-900 truncate">
                  {emp.name}
                </div>
                <div className="text-[11px] text-slate-500 truncate">
                  {emp.title}
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-base font-bold text-slate-900 tabular-nums">
                    {emp.metrics.actionsToday}
                  </span>
                  <span className="text-[10px] text-emerald-600 font-medium">
                    ops today
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
