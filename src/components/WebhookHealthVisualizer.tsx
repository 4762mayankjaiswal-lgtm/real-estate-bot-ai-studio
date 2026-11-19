import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Copy,
  Check,
  RefreshCw,
  Send,
  Trash2,
  Terminal,
  ShieldAlert,
  ArrowDownLeft,
  ArrowUpRight,
  Code2,
  HelpCircle,
} from 'lucide-react';

export interface WebhookDiagnosticLogEntry {
  id: string;
  timestampIso: string;
  direction: 'INBOUND' | 'OUTBOUND' | 'VERIFY_PING';
  channelId: string;
  endpointPath: string;
  httpStatus: number;
  status: 'SUCCESS' | 'PAYLOAD_ERROR' | 'AUTH_ERROR' | 'NETWORK_ERROR';
  summary: string;
  errorReason?: string;
  payloadPreview: string;
  receivedKeys?: string[];
  expectedKeys?: string[];
}

export interface ChannelWebhookDiagnosticItem {
  channelId: string;
  channelName: string;
  inboundPath: string;
  alternatePath: string;
  method: string;
  expectedProviders: string;
  requiredFields: string[];
  optionalFields: string[];
  samplePayload: Record<string, any>;
  connected: boolean;
  accountHandle: string;
  verifiedDetail: string;
  outboundWebhookUrl: string;
  stat: {
    channelId: string;
    lastInboundAtIso: string | null;
    lastOutboundAtIso: string | null;
    lastErrorAtIso: string | null;
    lastErrorDetail: string | null;
    inboundCount: number;
    outboundCount: number;
    errorCount: number;
  };
  syncStatus:
    | 'HEALTHY_SYNCING'
    | 'CONNECTED_NO_INBOUND_YET'
    | 'PAYLOAD_ERROR_DETECTED'
    | 'NOT_CONNECTED';
  diagnosisExplanation: string;
}

export interface WebhookHealthResponse {
  ok: boolean;
  lastReceivedAtIso: string | null;
  lastErrorAtIso: string | null;
  totalInboundReceived: number;
  totalInboundRejected: number;
  totalOutboundDispatched: number;
  totalOutboundFailed: number;
  diagnostics: ChannelWebhookDiagnosticItem[];
  recentLogs: WebhookDiagnosticLogEntry[];
}

interface WebhookHealthVisualizerProps {
  focusChannelId?: string;
  compact?: boolean;
  onOpenFullVisualizer?: () => void;
  onWebsiteLeadReceived?: (lead: any) => void;
}

function formatRelativeAndExactTime(iso: string | null): string {
  if (!iso) return 'Never received (0 requests)';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const diffSec = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  let rel = '';
  if (diffSec < 5) rel = 'just now';
  else if (diffSec < 60) rel = `${diffSec}s ago`;
  else if (diffSec < 3600) rel = `${Math.floor(diffSec / 60)}m ago`;
  else if (diffSec < 86400) rel = `${Math.floor(diffSec / 3600)}h ago`;
  else rel = `${Math.floor(diffSec / 86400)}d ago`;

  const exact = d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  return `${exact} (${rel})`;
}

export const WebhookHealthVisualizer: React.FC<
  WebhookHealthVisualizerProps
> = ({
  focusChannelId,
  compact = false,
  onOpenFullVisualizer,
  onWebsiteLeadReceived,
}) => {
  const [health, setHealth] = useState<WebhookHealthResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [simulatingKey, setSimulatingKey] = useState<string | null>(null);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [logFilter, setLogFilter] = useState<'ALL' | 'ERRORS' | 'SUCCESS'>(
    'ALL'
  );
  const [expandedSchemaChannel, setExpandedSchemaChannel] = useState<
    string | null
  >(null);

  const origin =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://your-domain.com';

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetch('/api/webhooks/health');
      const data = await resp.json();
      if (data && data.ok) {
        setHealth(data);
      }
    } catch {
      // ignore fetch error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 5000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  const handleCopyPath = (fullUrl: string, key: string) => {
    navigator.clipboard.writeText(fullUrl);
    setCopiedPath(key);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  const handleSimulateValidWebhook = async (
    diag: ChannelWebhookDiagnosticItem
  ) => {
    const key = `valid_${diag.channelId}`;
    setSimulatingKey(key);
    try {
      const resp = await fetch(diag.inboundPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(diag.samplePayload),
      });
      const data = await resp.json();
      if (data.ok && data.lead && onWebsiteLeadReceived) {
        onWebsiteLeadReceived(data.lead);
      }
      await fetchHealth();
    } finally {
      setSimulatingKey(null);
    }
  };

  const handleSimulateMalformedPayload = async (
    diag: ChannelWebhookDiagnosticItem
  ) => {
    const key = `err_${diag.channelId}`;
    setSimulatingKey(key);
    try {
      await fetch(diag.inboundPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unexpected_provider_field: 'test_123',
          lead_id_only: '99812',
          note: 'Missing name, email, and phone fields',
        }),
      });
      setLogFilter('ERRORS');
      await fetchHealth();
    } finally {
      setSimulatingKey(null);
    }
  };

  const handleClearLogs = async () => {
    await fetch('/api/webhooks/health/clear', { method: 'POST' });
    await fetchHealth();
  };

  // Compact Mini-Card Mode (rendered inside individual channel tab so user sees health right away)
  if (compact && focusChannelId) {
    const item = health?.diagnostics?.find(
      (d) => d.channelId === focusChannelId
    );
    if (!item) return null;

    const fullEndpoint = `${origin}${item.inboundPath}`;
    const isError = item.syncStatus === 'PAYLOAD_ERROR_DETECTED';
    const isConnectedNoSync = item.syncStatus === 'CONNECTED_NO_INBOUND_YET';
    const isHealthy = item.syncStatus === 'HEALTHY_SYNCING';

    return (
      <div
        className={`mt-4 p-3.5 rounded-2xl border text-xs space-y-2.5 ${
          isError
            ? 'bg-rose-50/80 border-rose-300 text-rose-950'
            : isConnectedNoSync
            ? 'bg-amber-50/80 border-amber-300 text-amber-950'
            : isHealthy
            ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
            : 'bg-slate-50 border-slate-200 text-slate-800'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Activity
              className={`w-4 h-4 shrink-0 ${
                isError
                  ? 'text-rose-600'
                  : isConnectedNoSync
                  ? 'text-amber-600'
                  : isHealthy
                  ? 'text-emerald-600'
                  : 'text-slate-500'
              }`}
            />
            <span className="font-bold">
              Webhook Health & Live Sync Status:{' '}
              {isError
                ? 'Payload Error Detected (Sync Blocked)'
                : isConnectedNoSync
                ? 'Connected (Outbound Ready) — 0 Inbound Webhooks Received Yet'
                : isHealthy
                ? `Actively Syncing (${item.stat.inboundCount} Inbound Received)`
                : 'Awaiting Connection & Webhook Traffic'}
            </span>
          </div>

          {onOpenFullVisualizer && (
            <button
              type="button"
              onClick={onOpenFullVisualizer}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold cursor-pointer transition-colors"
            >
              <Terminal className="w-3 h-3 text-emerald-400" />
              <span>Open Webhook Health & Error Logs</span>
            </button>
          )}
        </div>

        <p className="text-[11px] leading-relaxed opacity-90">
          {item.diagnosisExplanation}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
          <div className="p-2 rounded-lg bg-white/80 border border-black/10">
            <span className="text-slate-500 block text-[10px] font-semibold uppercase">
              Last Received Webhook
            </span>
            <span className="font-mono font-semibold text-slate-900">
              {formatRelativeAndExactTime(item.stat.lastInboundAtIso)}
            </span>
          </div>
          <div className="p-2 rounded-lg bg-white/80 border border-black/10">
            <span className="text-slate-500 block text-[10px] font-semibold uppercase">
              Payload Errors Logged
            </span>
            <span
              className={`font-mono font-semibold ${
                item.stat.errorCount > 0 ? 'text-rose-600' : 'text-emerald-700'
              }`}
            >
              {item.stat.errorCount} rejected{' '}
              {item.stat.lastErrorAtIso
                ? `(${formatRelativeAndExactTime(item.stat.lastErrorAtIso)})`
                : ''}
            </span>
          </div>
          <div className="p-2 rounded-lg bg-white/80 border border-black/10 flex items-center justify-between gap-1">
            <div className="min-w-0">
              <span className="text-slate-500 block text-[10px] font-semibold uppercase">
                Expected Provider Path
              </span>
              <code className="font-mono text-[10px] text-slate-900 truncate block">
                POST {item.inboundPath}
              </code>
            </div>
            <button
              type="button"
              onClick={() =>
                handleCopyPath(fullEndpoint, `compact_${item.channelId}`)
              }
              className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10px] font-semibold shrink-0 cursor-pointer"
            >
              {copiedPath === `compact_${item.channelId}` ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Full Webhook Health Visualizer Mode
  const logs = health?.recentLogs || [];
  const filteredLogs = logs.filter((l) => {
    if (logFilter === 'ERRORS') return l.status !== 'SUCCESS';
    if (logFilter === 'SUCCESS') return l.status === 'SUCCESS';
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-600" />
            <h3 className="text-lg font-bold text-slate-900">
              Webhook Health Visualizer & Payload Diagnostic Console
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Inspect the last received webhook timestamp, rejected payload error logs, and the exact endpoint paths expected by Ultramsg, Make.com, Zapier, ManyChat, Meta Lead Ads, and your Agency Website.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchHealth}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer transition-colors"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
          />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {/* Root-Cause Clarification Banner: Why "Connected" Might Not Sync Data */}
      <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/90 space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-amber-950">
          <HelpCircle className="w-4 h-4 text-amber-700 shrink-0" />
          <span>
            Why an App Can Show &ldquo;Connected&rdquo; Without Syncing Incoming Data
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-[11px] text-amber-900 leading-relaxed">
          <div className="p-2.5 rounded-xl bg-white/90 border border-amber-200">
            <strong className="block text-amber-950 mb-0.5">
              1. Outbound Auth vs. Inbound Webhook
            </strong>
            When an app shows <strong>Connected</strong>, it means your API key
            or Outbound Webhook is verified for <em>sending</em> messages. To{' '}
            <em>receive</em> incoming leads/messages, the external provider must
            POST to our Inbound Endpoint Path below.
          </div>
          <div className="p-2.5 rounded-xl bg-white/90 border border-amber-200">
            <strong className="block text-amber-950 mb-0.5">
              2. Wrong Endpoint Path in Provider
            </strong>
            External tools (Make, Zapier, ManyChat, Ultramsg, Website Forms)
            must send an <code className="font-mono">HTTP POST</code> request to{' '}
            <code className="font-mono font-semibold">
              /api/webhooks/inbound/&lt;channel&gt;
            </code>{' '}
            or{' '}
            <code className="font-mono font-semibold">
              /api/webhooks/website-leads
            </code>
            .
          </div>
          <div className="p-2.5 rounded-xl bg-white/90 border border-amber-200">
            <strong className="block text-amber-950 mb-0.5">
              3. Malformed JSON Payload Keys
            </strong>
            If the external provider sends a POST request without at least one
            contact field (<code className="font-mono">name</code>,{' '}
            <code className="font-mono">email</code>, or{' '}
            <code className="font-mono">phone</code>), it is rejected with{' '}
            <code className="font-mono text-rose-700">HTTP 400</code> and logged
            in the Payload Error Log below.
          </div>
        </div>
      </div>

      {/* Top 4 Telemetry Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
            <Clock className="w-3.5 h-3.5 text-indigo-600" />
            <span>Last Received Webhook</span>
          </div>
          <div className="text-xs font-bold font-mono text-slate-900 mt-1.5">
            {formatRelativeAndExactTime(health?.lastReceivedAtIso || null)}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
            <span>Valid Inbound Syncs</span>
          </div>
          <div className="text-base font-bold text-emerald-700 mt-1">
            {health?.totalInboundReceived ?? 0}{' '}
            <span className="text-[11px] font-normal text-slate-500">
              leads synced (200 OK)
            </span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
            <span>Payload / Auth Errors</span>
          </div>
          <div
            className={`text-base font-bold mt-1 ${
              (health?.totalInboundRejected ?? 0) > 0
                ? 'text-rose-600'
                : 'text-slate-900'
            }`}
          >
            {health?.totalInboundRejected ?? 0}{' '}
            <span className="text-[11px] font-normal text-slate-500">
              rejected (400/401)
            </span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
            <ArrowUpRight className="w-3.5 h-3.5 text-blue-600" />
            <span>Last Error Timestamp</span>
          </div>
          <div className="text-xs font-bold font-mono text-slate-900 mt-1.5">
            {health?.lastErrorAtIso
              ? formatRelativeAndExactTime(health.lastErrorAtIso)
              : 'None (0 errors)'}
          </div>
        </div>
      </div>

      {/* Per-Channel Expected Endpoint Paths & Sync Diagnosis Matrix */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Channel Sync Diagnosis & Expected External Provider Endpoints
          </h4>
          <span className="text-[11px] text-slate-400">
            Click &ldquo;Test Valid (200)&rdquo; or &ldquo;Test Broken Payload (400)&rdquo; to verify
          </span>
        </div>

        <div className="space-y-3">
          {(health?.diagnostics || []).map((diag) => {
            const fullPrimaryUrl = `${origin}${diag.inboundPath}`;
            const isSchemaOpen = expandedSchemaChannel === diag.channelId;

            return (
              <div
                key={diag.channelId}
                className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">
                      {diag.channelName}
                    </span>

                    {/* Auth Badge */}
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        diag.connected
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {diag.connected
                        ? `Auth: Connected (${diag.accountHandle || 'Verified'})`
                        : 'Auth: Not Connected'}
                    </span>

                    {/* Actual Sync Health Badge */}
                    {diag.syncStatus === 'HEALTHY_SYNCING' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-600 text-white">
                        <CheckCircle2 className="w-3 h-3" /> Syncing Data (
                        {diag.stat.inboundCount} received)
                      </span>
                    )}
                    {diag.syncStatus === 'CONNECTED_NO_INBOUND_YET' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                        <AlertTriangle className="w-3 h-3 text-amber-700" />{' '}
                        Connected, But 0 Inbound Webhooks Received
                      </span>
                    )}
                    {diag.syncStatus === 'PAYLOAD_ERROR_DETECTED' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-600 text-white">
                        <ShieldAlert className="w-3 h-3" /> Payload Error
                        Detected ({diag.stat.errorCount})
                      </span>
                    )}
                  </div>

                  {/* Live Diagnostic Test Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedSchemaChannel(
                          isSchemaOpen ? null : diag.channelId
                        )
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-[11px] font-semibold cursor-pointer"
                    >
                      <Code2 className="w-3 h-3" />
                      <span>
                        {isSchemaOpen ? 'Hide JSON Schema' : 'Expected JSON'}
                      </span>
                    </button>

                    <button
                      type="button"
                      disabled={simulatingKey === `valid_${diag.channelId}`}
                      onClick={() => handleSimulateValidWebhook(diag)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-semibold cursor-pointer disabled:opacity-50"
                      title="Send a valid POST payload to verify lead sync"
                    >
                      <Send className="w-3 h-3" />
                      <span>Test Valid (200)</span>
                    </button>

                    <button
                      type="button"
                      disabled={simulatingKey === `err_${diag.channelId}`}
                      onClick={() => handleSimulateMalformedPayload(diag)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-semibold cursor-pointer disabled:opacity-50"
                      title="Simulate a malformed payload from an external provider to inspect the error log"
                    >
                      <AlertTriangle className="w-3 h-3" />
                      <span>Simulate Bad Payload (400)</span>
                    </button>
                  </div>
                </div>

                {/* Explicit Diagnosis Explanation */}
                <div
                  className={`p-2.5 rounded-xl text-xs ${
                    diag.syncStatus === 'PAYLOAD_ERROR_DETECTED'
                      ? 'bg-rose-50 text-rose-900 border border-rose-200'
                      : diag.syncStatus === 'CONNECTED_NO_INBOUND_YET'
                      ? 'bg-amber-50/80 text-amber-900 border border-amber-200'
                      : 'bg-slate-50 text-slate-700 border border-slate-200/80'
                  }`}
                >
                  <strong>Diagnosis:</strong> {diag.diagnosisExplanation}
                </div>

                {/* Expected Endpoint Path & Timestamps Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-[11px]">
                  <div className="md:col-span-2 p-2.5 rounded-xl bg-slate-900 text-slate-100 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase tracking-wider text-amber-400 font-bold block">
                        Expected Endpoint Path for {diag.expectedProviders}
                      </span>
                      <code className="font-mono text-xs text-white truncate block mt-0.5">
                        POST {fullPrimaryUrl}
                      </code>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyPath(
                          fullPrimaryUrl,
                          `primary_${diag.channelId}`
                        )
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-[11px] font-semibold shrink-0 cursor-pointer"
                    >
                      {copiedPath === `primary_${diag.channelId}` ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy URL</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-center">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                      Last Received Timestamp
                    </span>
                    <span className="font-mono text-xs font-semibold text-slate-900 mt-0.5">
                      {formatRelativeAndExactTime(diag.stat.lastInboundAtIso)}
                    </span>
                  </div>
                </div>

                {/* Expandable Expected JSON Schema */}
                {isSchemaOpen && (
                  <div className="p-3 rounded-xl bg-slate-950 text-slate-200 text-xs space-y-2 border border-slate-800">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-emerald-400">
                        Expected JSON Payload Schema (POST {diag.inboundPath})
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Headers: Content-Type: application/json
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-300">
                      <strong>Required Contact Fields (at least one):</strong>{' '}
                      {diag.requiredFields.join(', ')}
                    </div>
                    <pre className="p-2.5 rounded-lg bg-black/60 text-emerald-300 font-mono text-[11px] overflow-x-auto">
                      {JSON.stringify(diag.samplePayload, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Payload Error Logs & Webhook Traffic Inspector */}
      <div className="space-y-3 pt-2 border-t border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-slate-800" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Webhook Payload Error Logs & Request Inspector ({filteredLogs.length})
            </h4>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setLogFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
                logFilter === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All ({logs.length})
            </button>
            <button
              type="button"
              onClick={() => setLogFilter('ERRORS')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
                logFilter === 'ERRORS'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
              }`}
            >
              Payload Errors (
              {logs.filter((l) => l.status !== 'SUCCESS').length})
            </button>
            <button
              type="button"
              onClick={() => setLogFilter('SUCCESS')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
                logFilter === 'SUCCESS'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              Synced (200 OK)
            </button>
            {logs.length > 0 && (
              <button
                type="button"
                onClick={handleClearLogs}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="p-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-center space-y-1.5">
            <div className="text-xs font-bold text-slate-700">
              No Webhook Events or Payload Errors Logged Yet
            </div>
            <p className="text-[11px] text-slate-500 max-w-md mx-auto">
              Use the <strong>Test Valid (200)</strong> or{' '}
              <strong>Simulate Bad Payload (400)</strong> buttons on any channel
              above to inspect live webhook ingestion and error diagnostics.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
            {filteredLogs.map((log) => {
              const isErr = log.status !== 'SUCCESS';
              return (
                <div
                  key={log.id}
                  className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                    isErr
                      ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                      : 'bg-emerald-50/40 border-emerald-200 text-slate-900'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                          isErr
                            ? 'bg-rose-600 text-white'
                            : 'bg-emerald-600 text-white'
                        }`}
                      >
                        HTTP {log.httpStatus} · {log.status}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-200/80 text-slate-800 font-mono text-[10px] font-semibold">
                        {log.endpointPath}
                      </span>
                      <span className="font-bold">{log.summary}</span>
                    </div>
                    <span className="font-mono text-[11px] text-slate-500">
                      {formatRelativeAndExactTime(log.timestampIso)}
                    </span>
                  </div>

                  {log.errorReason && (
                    <div className="p-2.5 rounded-lg bg-rose-100/80 border border-rose-300 text-rose-900 text-[11px] leading-relaxed">
                      <strong>Why Sync Failed:</strong> {log.errorReason}
                    </div>
                  )}

                  <details className="text-[11px]">
                    <summary className="cursor-pointer font-semibold text-slate-600 hover:text-slate-900">
                      Inspect Raw Webhook JSON Payload
                    </summary>
                    <pre className="mt-1.5 p-2.5 rounded-lg bg-slate-950 text-emerald-300 font-mono text-[10px] overflow-x-auto">
                      {log.payloadPreview}
                    </pre>
                  </details>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
