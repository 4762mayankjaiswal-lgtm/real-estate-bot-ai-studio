import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { GoogleGenAI, Type } from '@google/genai';

const PORT = 3000;
const VAULT_DIR = path.join(process.cwd(), '.vault');
const VAULT_FILE = path.join(VAULT_DIR, 'client-byok-vault-v8.enc.json');
const VAULT_SECRET =
  process.env.VAULT_ENCRYPTION_SECRET || 'atelier-estate-default-32byte-key!';

export type SupportedLlmProvider =
  | 'openai'
  | 'anthropic'
  | 'xai'
  | 'groq'
  | 'deepseek'
  | 'glm'
  | 'gemini'
  | 'custom';

function getCipherKey(): Buffer {
  return crypto.createHash('sha256').update(VAULT_SECRET).digest();
}

function encryptText(plainText: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getCipherKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plainText, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decryptText(cipherPayload: string): string {
  const [ivHex, tagHex, dataHex] = cipherPayload.split(':');
  if (!ivHex || !tagHex || !dataHex) return '';
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    getCipherKey(),
    Buffer.from(ivHex, 'hex')
  );
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, 'hex')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

function maskSecret(secret: string): string {
  const trimmed = secret.trim();
  if (!trimmed) return '';
  if (trimmed.length <= 8) return '••••••••';
  return `${trimmed.slice(0, 4)}••••${trimmed.slice(-4)}`;
}

export interface StoredAccountRecord {
  id: string;
  label: string;
  accountHandle: string;
  webhookUrl?: string;
  isPrimary: boolean;
  verifiedDetail: string;
  createdAt: string;
  authType?: 'oauth' | 'smtp' | 'api_key' | 'webhook';
  encryptedSecrets?: Record<string, string>;
}

interface StoredVault {
  updatedAt: string;
  llmProvider: SupportedLlmProvider;
  llmModel: string;
  llmBaseUrl: string;
  secrets: Record<string, string>;
  configs: Record<
    string,
    {
      accountHandle?: string;
      webhookUrl?: string;
      verified?: boolean;
      verifiedDetail?: string;
      updatedAt: string;
      accounts?: StoredAccountRecord[];
    }
  >;
}

interface InboundWebsiteLeadRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  budget: string;
  timeline: string;
  propertyInterest: string;
  qualificationScore: number;
  status: 'AI Qualified';
  assignedEmployeeId: string;
  notes: string;
  websiteDomain: string;
  receivedAtIso: string;
}

const inboundWebsiteLeads: InboundWebsiteLeadRecord[] = [];

interface WebhookDiagnosticLogEntry {
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

interface ChannelWebhookHealthStat {
  channelId: string;
  lastInboundAtIso: string | null;
  lastOutboundAtIso: string | null;
  lastErrorAtIso: string | null;
  lastErrorDetail: string | null;
  inboundCount: number;
  outboundCount: number;
  errorCount: number;
}

const WEBHOOK_TRACKED_CHANNELS = [
  'website_leads',
  'whatsapp',
  'instagram',
  'facebook',
  'telnyx',
] as const;

const webhookHealthState: {
  lastReceivedAtIso: string | null;
  lastErrorAtIso: string | null;
  totalInboundReceived: number;
  totalInboundRejected: number;
  totalOutboundDispatched: number;
  totalOutboundFailed: number;
  channelStats: Record<string, ChannelWebhookHealthStat>;
  recentLogs: WebhookDiagnosticLogEntry[];
} = {
  lastReceivedAtIso: null,
  lastErrorAtIso: null,
  totalInboundReceived: 0,
  totalInboundRejected: 0,
  totalOutboundDispatched: 0,
  totalOutboundFailed: 0,
  channelStats: WEBHOOK_TRACKED_CHANNELS.reduce((acc, ch) => {
    acc[ch] = {
      channelId: ch,
      lastInboundAtIso: null,
      lastOutboundAtIso: null,
      lastErrorAtIso: null,
      lastErrorDetail: null,
      inboundCount: 0,
      outboundCount: 0,
      errorCount: 0,
    };
    return acc;
  }, {} as Record<string, ChannelWebhookHealthStat>),
  recentLogs: [],
};

function recordWebhookDiagnosticEvent(params: {
  direction: 'INBOUND' | 'OUTBOUND' | 'VERIFY_PING';
  channelId: string;
  endpointPath: string;
  httpStatus: number;
  status: 'SUCCESS' | 'PAYLOAD_ERROR' | 'AUTH_ERROR' | 'NETWORK_ERROR';
  summary: string;
  errorReason?: string;
  rawPayload?: any;
  receivedKeys?: string[];
  expectedKeys?: string[];
}) {
  const nowIso = new Date().toISOString();
  const chKey = WEBHOOK_TRACKED_CHANNELS.includes(params.channelId as any)
    ? params.channelId
    : 'website_leads';

  if (!webhookHealthState.channelStats[chKey]) {
    webhookHealthState.channelStats[chKey] = {
      channelId: chKey,
      lastInboundAtIso: null,
      lastOutboundAtIso: null,
      lastErrorAtIso: null,
      lastErrorDetail: null,
      inboundCount: 0,
      outboundCount: 0,
      errorCount: 0,
    };
  }

  const chStat = webhookHealthState.channelStats[chKey];

  if (params.direction === 'INBOUND') {
    if (params.status === 'SUCCESS') {
      webhookHealthState.lastReceivedAtIso = nowIso;
      webhookHealthState.totalInboundReceived += 1;
      chStat.lastInboundAtIso = nowIso;
      chStat.inboundCount += 1;
    } else {
      webhookHealthState.lastErrorAtIso = nowIso;
      webhookHealthState.totalInboundRejected += 1;
      chStat.lastErrorAtIso = nowIso;
      chStat.lastErrorDetail = params.errorReason || params.summary;
      chStat.errorCount += 1;
    }
  } else {
    if (params.status === 'SUCCESS') {
      webhookHealthState.totalOutboundDispatched += 1;
      chStat.lastOutboundAtIso = nowIso;
      chStat.outboundCount += 1;
    } else {
      webhookHealthState.lastErrorAtIso = nowIso;
      webhookHealthState.totalOutboundFailed += 1;
      chStat.lastErrorAtIso = nowIso;
      chStat.lastErrorDetail = params.errorReason || params.summary;
      chStat.errorCount += 1;
    }
  }

  let preview = '{}';
  try {
    preview = JSON.stringify(params.rawPayload ?? {}, null, 2).slice(0, 900);
  } catch {
    preview = String(params.rawPayload || '');
  }

  const entry: WebhookDiagnosticLogEntry = {
    id: `whlog_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestampIso: nowIso,
    direction: params.direction,
    channelId: chKey,
    endpointPath: params.endpointPath,
    httpStatus: params.httpStatus,
    status: params.status,
    summary: params.summary,
    errorReason: params.errorReason,
    payloadPreview: preview,
    receivedKeys: params.receivedKeys,
    expectedKeys: params.expectedKeys,
  };

  webhookHealthState.recentLogs.unshift(entry);
  if (webhookHealthState.recentLogs.length > 45) {
    webhookHealthState.recentLogs.pop();
  }
}


function loadVault(): StoredVault {
  try {
    if (!fs.existsSync(VAULT_DIR)) {
      fs.mkdirSync(VAULT_DIR, { recursive: true });
    }
    if (fs.existsSync(VAULT_FILE)) {
      const raw = fs.readFileSync(VAULT_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      const secrets = parsed.secrets || {};
      delete secrets['EASY_BRIDGE_MODE'];

      const rawConfigs = parsed.configs || {};
      const cleanedConfigs: StoredVault['configs'] = {};
      let purgedFake = false;

      for (const [chId, cfg] of Object.entries<any>(rawConfigs)) {
        if (!cfg) continue;
        const detail = String(cfg.verifiedDetail || '');
        const isFakeEasyBridge =
          detail.includes('Easy Bridge Active') ||
          detail.includes('Built-In AI Market');
        const validAccounts = Array.isArray(cfg.accounts)
          ? cfg.accounts.filter(
              (a: any) =>
                !String(a?.verifiedDetail || '').includes('Easy Bridge Active') &&
                !String(a?.verifiedDetail || '').includes('Built-In AI Market')
            )
          : [];

        if (isFakeEasyBridge && validAccounts.length === 0) {
          purgedFake = true;
          continue;
        }
        cleanedConfigs[chId] = {
          ...cfg,
          accounts: validAccounts,
        };
      }

      const resultVault: StoredVault = {
        updatedAt: parsed.updatedAt || new Date().toISOString(),
        llmProvider: parsed.llmProvider || 'openai',
        llmModel: parsed.llmModel || 'gpt-4o-mini',
        llmBaseUrl: parsed.llmBaseUrl || '',
        secrets,
        configs: cleanedConfigs,
      };
      if (purgedFake) {
        saveVault(resultVault);
      }
      return resultVault;
    }
  } catch {
    // ignore read error
  }
  return {
    updatedAt: new Date().toISOString(),
    llmProvider: 'openai',
    llmModel: 'gpt-4o-mini',
    llmBaseUrl: '',
    secrets: {},
    configs: {},
  };
}

function saveVault(vault: StoredVault) {
  try {
    if (!fs.existsSync(VAULT_DIR)) {
      fs.mkdirSync(VAULT_DIR, { recursive: true });
    }
    fs.writeFileSync(VAULT_FILE, JSON.stringify(vault, null, 2), 'utf8');
  } catch {
    // ignore save error
  }
}

function getSecretPlain(keyName: string): string {
  const vault = loadVault();
  const enc = vault.secrets[keyName];
  if (!enc) return '';
  try {
    return decryptText(enc);
  } catch {
    return '';
  }
}

const PROVIDER_DEFAULT_ENDPOINTS: Record<string, string> = {
  openai: 'https://api.openai.com/v1/chat/completions',
  xai: 'https://api.x.ai/v1/chat/completions',
  groq: 'https://api.groq.com/openai/v1/chat/completions',
  deepseek: 'https://api.deepseek.com/chat/completions',
  glm: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
};

const PROVIDER_FALLBACK_MODELS: Record<SupportedLlmProvider, string[]> = {
  openai: ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'],
  anthropic: [
    'claude-3-7-sonnet-latest',
    'claude-3-5-sonnet-latest',
    'claude-3-5-haiku-latest',
    'claude-3-haiku-20240307',
  ],
  xai: ['grok-2-latest', 'grok-beta', 'grok-3-mini'],
  groq: [
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
    'gemma2-9b-it',
    'mixtral-8x7b-32768',
  ],
  deepseek: ['deepseek-chat', 'deepseek-reasoner'],
  glm: ['glm-4-flash', 'glm-4-plus', 'glm-4'],
  gemini: ['gemini-2.5-flash', 'gemini-3-flash-preview'],
  custom: ['openai/gpt-4o-mini', 'anthropic/claude-3.5-sonnet'],
};

function resolveProviderAndModels(
  requestedProvider: SupportedLlmProvider,
  requestedModel: string,
  apiKey: string,
  customBaseUrl?: string
): {
  provider: SupportedLlmProvider;
  modelsToTry: string[];
  resolvedBaseUrl?: string;
} {
  let provider = requestedProvider;
  let resolvedBaseUrl = customBaseUrl;
  const trimmedKey = (apiKey || '').trim();

  if (trimmedKey.startsWith('gsk_')) {
    provider = 'groq';
  } else if (trimmedKey.startsWith('sk-ant-')) {
    provider = 'anthropic';
  } else if (trimmedKey.startsWith('xai-')) {
    provider = 'xai';
  } else if (trimmedKey.startsWith('AIza')) {
    provider = 'gemini';
  } else if (trimmedKey.startsWith('sk-or-')) {
    provider = 'custom';
    if (!resolvedBaseUrl) {
      resolvedBaseUrl = 'https://openrouter.ai/api/v1';
    }
  } else if (
    (trimmedKey.startsWith('sk-proj-') || trimmedKey.startsWith('sk-')) &&
    provider === 'groq'
  ) {
    provider = 'openai';
  }

  const fallbacks = PROVIDER_FALLBACK_MODELS[provider] || ['gpt-4o-mini'];
  const cleanModel = (requestedModel || '').trim();

  const isLlamaOrMixtral =
    cleanModel.startsWith('llama') ||
    cleanModel.startsWith('mixtral') ||
    cleanModel.startsWith('gemma');
  const isGpt =
    cleanModel.startsWith('gpt-') ||
    cleanModel.startsWith('o1') ||
    cleanModel.startsWith('o3');
  const isClaude = cleanModel.startsWith('claude-');
  const isGrok = cleanModel.startsWith('grok-');
  const isGemini = cleanModel.startsWith('gemini-');
  const isDeepseek = cleanModel.startsWith('deepseek-');
  const isGlm = cleanModel.startsWith('glm-');

  let primaryModel = cleanModel;
  if (provider === 'openai' && !isGpt) primaryModel = 'gpt-4o-mini';
  if (provider === 'groq' && (isGpt || isClaude || isGemini || isGrok))
    primaryModel = 'llama-3.3-70b-versatile';
  if (provider === 'anthropic' && !isClaude)
    primaryModel = 'claude-3-5-sonnet-latest';
  if (provider === 'xai' && !isGrok) primaryModel = 'grok-2-latest';
  if (provider === 'gemini' && !isGemini) primaryModel = 'gemini-2.5-flash';
  if (provider === 'deepseek' && !isDeepseek) primaryModel = 'deepseek-chat';
  if (provider === 'glm' && !isGlm) primaryModel = 'glm-4-flash';
  if (provider === 'openai' && isLlamaOrMixtral) primaryModel = 'gpt-4o-mini';

  const modelsToTry = Array.from(
    new Set([primaryModel, ...fallbacks].filter(Boolean))
  );

  return { provider, modelsToTry, resolvedBaseUrl };
}

function extractJsonObject(rawText: string): any {
  const cleaned = rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
    }
    throw new Error('Provider response was not valid JSON');
  }
}

async function callGeminiWithUserKey(
  apiKey: string,
  model: string,
  systemInstruction: string,
  userPrompt: string,
  geminiSchema?: any
): Promise<any> {
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
  const response = await ai.models.generateContent({
    model: model.startsWith('gemini-') ? model : 'gemini-4-hydrogen',
    contents: `${systemInstruction}\n\n${userPrompt}`,
    config: geminiSchema
      ? {
          responseMimeType: 'application/json',
          responseSchema: geminiSchema,
        }
      : {
          responseMimeType: 'application/json',
        },
  });
  return extractJsonObject(response.text || '{}');
}

/**
 * Calls the user's configured BYOK API Key, or falls back to process.env.GEMINI_API_KEY ('gemini-4-hydrogen') if available.
 */
async function callUniversalLlmJson(params: {
  provider: SupportedLlmProvider;
  model: string;
  apiKey: string;
  customBaseUrl?: string;
  systemInstruction: string;
  userPrompt: string;
  geminiSchema?: any;
}): Promise<{ data: any; usedProvider: string; usedModel: string }> {
  const {
    provider: requestedProvider,
    model: requestedModel,
    apiKey,
    customBaseUrl,
    systemInstruction,
    userPrompt,
    geminiSchema,
  } = params;

  const trimmedKey = (apiKey || '').trim();

  if (!trimmedKey) {
    const envGeminiKey = (process.env.GEMINI_API_KEY || '').trim();
    if (envGeminiKey) {
      const data = await callGeminiWithUserKey(
        envGeminiKey,
        'gemini-4-hydrogen',
        systemInstruction,
        userPrompt,
        geminiSchema
      );
      return {
        data,
        usedProvider: 'GEMINI',
        usedModel: 'gemini-4-hydrogen',
      };
    }
    throw new Error(
      'No LLM API key is configured. Click "BYOK Keys" in the top-right bar to paste your own API key (Groq, OpenAI, Claude, Grok, DeepSeek, Gemini, or GLM).'
    );
  }

  const { provider, modelsToTry, resolvedBaseUrl } = resolveProviderAndModels(
    requestedProvider,
    requestedModel,
    trimmedKey,
    customBaseUrl
  );

  // 1. Google Gemini (using user's pasted AIza... key)
  if (provider === 'gemini') {
    let lastErr: any = null;
    for (const candidateModel of modelsToTry) {
      try {
        const data = await callGeminiWithUserKey(
          trimmedKey,
          candidateModel,
          systemInstruction,
          userPrompt,
          geminiSchema
        );
        return { data, usedProvider: 'GEMINI', usedModel: candidateModel };
      } catch (err: any) {
        lastErr = err;
      }
    }
    throw lastErr || new Error('Gemini API request failed. Check your API key.');
  }

  // 2. Anthropic Claude
  if (provider === 'anthropic') {
    let lastErr: any = null;
    for (const candidateModel of modelsToTry) {
      try {
        const resp = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': trimmedKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: candidateModel,
            max_tokens: 1500,
            system: `${systemInstruction}\nCRITICAL: Respond ONLY with a valid JSON object. Do not wrap in markdown.`,
            messages: [{ role: 'user', content: userPrompt }],
          }),
        });
        const json = await resp.json().catch(() => ({}));
        if (!resp.ok) {
          throw new Error(
            json?.error?.message || `Claude error (${resp.status})`
          );
        }
        const textContent = json?.content?.[0]?.text || '{}';
        return {
          data: extractJsonObject(textContent),
          usedProvider: 'CLAUDE',
          usedModel: candidateModel,
        };
      } catch (err: any) {
        lastErr = err;
      }
    }
    throw lastErr || new Error('Claude API request failed. Check your key.');
  }

  // 3. OpenAI, Groq, Grok (xAI), DeepSeek, GLM, or Custom OpenAI-Compatible Endpoint
  let endpoint = PROVIDER_DEFAULT_ENDPOINTS[provider] || '';
  if (provider === 'custom') {
    const cleanBase = (resolvedBaseUrl || 'https://openrouter.ai/api/v1')
      .trim()
      .replace(/\/+$/, '');
    endpoint = cleanBase.endsWith('/chat/completions')
      ? cleanBase
      : `${cleanBase}/chat/completions`;
  }

  let lastError: any = null;
  for (const candidateModel of modelsToTry) {
    try {
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${trimmedKey}`,
        },
        body: JSON.stringify({
          model: candidateModel,
          messages: [
            {
              role: 'system',
              content: `${systemInstruction}\nCRITICAL: Respond ONLY with a valid JSON object. Do not include markdown fences.`,
            },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.3,
        }),
      });

      const json = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        const msg =
          json?.error?.message ||
          `${provider.toUpperCase()} error (${resp.status})`;
        lastError = new Error(msg);
        if (
          msg.toLowerCase().includes('model') ||
          msg.toLowerCase().includes('exist') ||
          msg.toLowerCase().includes('access') ||
          msg.toLowerCase().includes('decommissioned') ||
          resp.status === 404
        ) {
          continue;
        }
        throw lastError;
      }

      const content = json?.choices?.[0]?.message?.content || '{}';
      return {
        data: extractJsonObject(content),
        usedProvider: provider.toUpperCase(),
        usedModel: candidateModel,
      };
    } catch (err: any) {
      lastError = err;
    }
  }

  throw lastError || new Error(`${provider.toUpperCase()} API request failed`);
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));

  // 1. Get Vault & BYOK Status
  app.get('/api/vault/status', (_req, res) => {
    const vault = loadVault();
    const entries: Record<string, { configured: boolean; masked: string }> = {};
    for (const [k, encVal] of Object.entries(vault.secrets)) {
      try {
        const plain = decryptText(encVal);
        entries[k] = {
          configured: Boolean(plain.trim()),
          masked: maskSecret(plain),
        };
      } catch {
        entries[k] = { configured: false, masked: '' };
      }
    }
    res.json({
      updatedAt: vault.updatedAt,
      llmProvider: vault.llmProvider,
      llmModel: vault.llmModel,
      llmBaseUrl: vault.llmBaseUrl,
      entries,
      configs: vault.configs || {},
    });
  });

  // 2. Save BYOK LLM Key & Channel API Keys to Encrypted Vault
  app.post('/api/vault/save', (req, res) => {
    const { llmProvider, llmModel, llmBaseUrl, secrets, configs } = req.body as {
      llmProvider?: SupportedLlmProvider;
      llmModel?: string;
      llmBaseUrl?: string;
      secrets?: Record<string, string>;
      configs?: Record<
        string,
        {
          accountHandle?: string;
          webhookUrl?: string;
          verified?: boolean;
          verifiedDetail?: string;
        }
      >;
    };
    const vault = loadVault();

    if (llmProvider) vault.llmProvider = llmProvider;
    if (typeof llmModel === 'string' && llmModel.trim()) {
      vault.llmModel = llmModel.trim();
    }
    if (typeof llmBaseUrl === 'string') {
      vault.llmBaseUrl = llmBaseUrl.trim();
    }

    if (secrets && typeof secrets === 'object') {
      for (const [keyName, plainValue] of Object.entries(secrets)) {
        if (typeof plainValue === 'string') {
          const trimmed = plainValue.trim();
          if (trimmed) {
            vault.secrets[keyName] = encryptText(trimmed);
          } else {
            delete vault.secrets[keyName];
          }
        }
      }
    }

    if (configs && typeof configs === 'object') {
      vault.configs = vault.configs || {};
      for (const [channelId, cfg] of Object.entries(configs)) {
        vault.configs[channelId] = {
          accountHandle:
            cfg.accountHandle ?? vault.configs[channelId]?.accountHandle ?? '',
          webhookUrl:
            cfg.webhookUrl ?? vault.configs[channelId]?.webhookUrl ?? '',
          verified:
            cfg.verified ?? vault.configs[channelId]?.verified ?? false,
          verifiedDetail:
            cfg.verifiedDetail ??
            vault.configs[channelId]?.verifiedDetail ??
            '',
          updatedAt: new Date().toISOString(),
        };
      }
    }

    vault.updatedAt = new Date().toISOString();
    saveVault(vault);

    const entries: Record<string, { configured: boolean; masked: string }> = {};
    for (const [k, encVal] of Object.entries(vault.secrets)) {
      try {
        const plain = decryptText(encVal);
        entries[k] = {
          configured: Boolean(plain.trim()),
          masked: maskSecret(plain),
        };
      } catch {
        entries[k] = { configured: false, masked: '' };
      }
    }

    res.json({
      ok: true,
      updatedAt: vault.updatedAt,
      llmProvider: vault.llmProvider,
      llmModel: vault.llmModel,
      llmBaseUrl: vault.llmBaseUrl,
      entries,
      configs: vault.configs,
    });
  });

  // 3. Clear Specific Keys or Channel
  app.post('/api/vault/clear', (req, res) => {
    const { keyNames, channelId, clearAll } = req.body as {
      keyNames?: string[];
      channelId?: string;
      clearAll?: boolean;
    };
    const vault = loadVault();
    if (clearAll) {
      vault.secrets = {};
      vault.configs = {};
    } else {
      if (Array.isArray(keyNames)) {
        for (const k of keyNames) {
          delete vault.secrets[k];
        }
      }
      if (channelId && vault.configs[channelId]) {
        delete vault.configs[channelId];
      }
    }
    vault.updatedAt = new Date().toISOString();
    saveVault(vault);
    res.json({ ok: true, updatedAt: vault.updatedAt });
  });

  // ============================================================================
  // 3a. REAL GMAIL / SMTP VERIFICATION & REAL EMAIL SENDING VIA NODEMAILER
  // ============================================================================
  app.post('/api/email/verify-smtp', async (req, res) => {
    const { email, appPassword, smtpHost, smtpPort } = req.body as {
      email?: string;
      appPassword?: string;
      smtpHost?: string;
      smtpPort?: number;
    };

    const cleanEmail = (email || getSecretPlain('GMAIL_SMTP_USER') || '').trim();
    const cleanPass = (
      appPassword ||
      getSecretPlain('GMAIL_SMTP_APP_PASSWORD') ||
      ''
    )
      .trim()
      .replace(/\s+/g, '');

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return res.status(400).json({
        ok: false,
        error: 'Enter a valid Gmail or SMTP email address.',
      });
    }
    if (!cleanPass) {
      return res.status(400).json({
        ok: false,
        error:
          'Enter your 16-character Google App Password (from myaccount.google.com/apppasswords) or SMTP password.',
      });
    }

    const host = (smtpHost || 'smtp.gmail.com').trim();
    const port = Number(smtpPort) || 465;

    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: {
          user: cleanEmail,
          pass: cleanPass,
        },
      });

      await transporter.verify();

      // Save verified SMTP credentials in the encrypted vault (supports multiple Gmail accounts!)
      const vault = loadVault();
      vault.secrets['EMAIL_ACTIVE_PROVIDER'] = encryptText('smtp');
      vault.secrets['GMAIL_SMTP_USER'] = encryptText(cleanEmail);
      vault.secrets['GMAIL_SMTP_APP_PASSWORD'] = encryptText(cleanPass);
      vault.secrets['GMAIL_SMTP_HOST'] = encryptText(host);
      vault.configs = vault.configs || {};
      const existingAccounts = Array.isArray(vault.configs['gmail']?.accounts)
        ? vault.configs['gmail']!.accounts!
        : [];
      const acctId = `acct_gmail_${cleanEmail.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      const newAcct: StoredAccountRecord = {
        id: acctId,
        label: `Gmail SMTP (${cleanEmail})`,
        accountHandle: cleanEmail,
        webhookUrl: '',
        isPrimary: true,
        verifiedDetail: `Verified live via ${host}:${port}`,
        createdAt: new Date().toISOString(),
        authType: 'smtp',
        encryptedSecrets: {
          EMAIL_ACTIVE_PROVIDER: encryptText('smtp'),
          GMAIL_SMTP_USER: encryptText(cleanEmail),
          GMAIL_SMTP_APP_PASSWORD: encryptText(cleanPass),
          GMAIL_SMTP_HOST: encryptText(host),
        },
      };
      const mergedAccounts = [
        newAcct,
        ...existingAccounts
          .filter((a) => a.accountHandle.toLowerCase() !== cleanEmail.toLowerCase())
          .map((a) => ({ ...a, isPrimary: false })),
      ];
      vault.configs['gmail'] = {
        accountHandle: cleanEmail,
        webhookUrl: '',
        verified: true,
        verifiedDetail: `Verified live via ${host}:${port}`,
        updatedAt: new Date().toISOString(),
        accounts: mergedAccounts,
      };
      saveVault(vault);

      return res.json({
        ok: true,
        email: cleanEmail,
        accounts: mergedAccounts,
        detail: `Live SMTP authentication succeeded with ${host}:${port} for ${cleanEmail}.`,
      });
    } catch (err: any) {
      return res.status(400).json({
        ok: false,
        error: `SMTP authentication failed: ${
          err?.message || 'Invalid email or Google App Password'
        }`,
      });
    }
  });

  // ============================================================================
  // 3a-2. RESEND & BREVO HTTPS EMAIL API VERIFICATION (WORKS ON RENDER FREE TIER)
  // ============================================================================
  app.post('/api/email/verify-provider', async (req, res) => {
    const { provider, apiKey, fromEmail, fromName } = req.body as {
      provider?: 'resend' | 'brevo';
      apiKey?: string;
      fromEmail?: string;
      fromName?: string;
    };

    const cleanProvider = provider === 'brevo' ? 'brevo' : 'resend';
    const cleanKey = (
      apiKey ||
      getSecretPlain(
        cleanProvider === 'resend' ? 'RESEND_API_KEY' : 'BREVO_API_KEY'
      ) ||
      ''
    ).trim();

    const defaultResendFrom = 'onboarding@resend.dev';
    const cleanFrom = (
      fromEmail ||
      getSecretPlain(
        cleanProvider === 'resend' ? 'RESEND_FROM_EMAIL' : 'BREVO_FROM_EMAIL'
      ) ||
      (cleanProvider === 'resend' ? defaultResendFrom : '')
    ).trim();

    const cleanName = (fromName || 'Atelier Estate').trim();

    if (!cleanKey) {
      return res.status(400).json({
        ok: false,
        error:
          cleanProvider === 'resend'
            ? 'Paste a valid Resend API Key (starts with re_...).'
            : 'Paste a valid Brevo V3 API Key (starts with xkeysib-...).',
      });
    }

    if (!cleanFrom || !cleanFrom.includes('@')) {
      return res.status(400).json({
        ok: false,
        error:
          cleanProvider === 'resend'
            ? 'Enter a sender email address (e.g., onboarding@resend.dev or your verified Resend domain email).'
            : 'Enter your verified Brevo sender email address.',
      });
    }

    try {
      let verifiedDetail = '';

      if (cleanProvider === 'resend') {
        // Verify Resend API key live against Resend REST API over HTTPS (port 443)
        const resendRes = await fetch('https://api.resend.com/domains', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${cleanKey}`,
          },
        });
        const resendData = await resendRes.json().catch(() => ({}));
        const errMsg = String(resendData?.message || '');

        // Note: Resend "Sending access" keys return 401 with message "This API key is restricted to only send emails"
        // which confirms the key is a valid Resend sending key! Invalid keys return "API key is invalid".
        const isSendOnlyValidKey =
          (resendRes.status === 401 || resendRes.status === 403) &&
          errMsg.toLowerCase().includes('restricted to only send');

        if (!resendRes.ok && !isSendOnlyValidKey) {
          return res.status(400).json({
            ok: false,
            error: `Resend API rejected this key (HTTP ${resendRes.status}): ${
              errMsg || 'Invalid Resend API Key.'
            }`,
          });
        }

        const domainsCount = Array.isArray(resendData?.data)
          ? resendData.data.length
          : 0;
        verifiedDetail = isSendOnlyValidKey
          ? `Verified live via Resend HTTPS API (Sending-Only Key · Sender: ${cleanFrom})`
          : `Verified live via Resend HTTPS API (${domainsCount} domain(s) · Sender: ${cleanFrom})`;
      } else {
        // Verify Brevo V3 API key live against Brevo REST API over HTTPS (port 443)
        const brevoRes = await fetch('https://api.brevo.com/v3/account', {
          method: 'GET',
          headers: {
            'api-key': cleanKey,
            Accept: 'application/json',
          },
        });
        const brevoData = await brevoRes.json().catch(() => ({}));
        if (!brevoRes.ok) {
          return res.status(400).json({
            ok: false,
            error: `Brevo API rejected this key (HTTP ${brevoRes.status}): ${
              brevoData?.message || 'Invalid Brevo V3 API Key.'
            }`,
          });
        }
        const orgName = brevoData?.companyName || brevoData?.email || 'Brevo';
        verifiedDetail = `Verified live via Brevo HTTPS API (${orgName} · Sender: ${cleanFrom})`;
      }

      const vault = loadVault();
      const encryptedSecrets: Record<string, string> = {
        EMAIL_ACTIVE_PROVIDER: encryptText(cleanProvider),
      };
      vault.secrets['EMAIL_ACTIVE_PROVIDER'] = encryptText(cleanProvider);

      if (cleanProvider === 'resend') {
        vault.secrets['RESEND_API_KEY'] = encryptText(cleanKey);
        vault.secrets['RESEND_FROM_EMAIL'] = encryptText(cleanFrom);
        vault.secrets['RESEND_FROM_NAME'] = encryptText(cleanName);
        encryptedSecrets['RESEND_API_KEY'] = encryptText(cleanKey);
        encryptedSecrets['RESEND_FROM_EMAIL'] = encryptText(cleanFrom);
        encryptedSecrets['RESEND_FROM_NAME'] = encryptText(cleanName);
      } else {
        vault.secrets['BREVO_API_KEY'] = encryptText(cleanKey);
        vault.secrets['BREVO_FROM_EMAIL'] = encryptText(cleanFrom);
        vault.secrets['BREVO_FROM_NAME'] = encryptText(cleanName);
        encryptedSecrets['BREVO_API_KEY'] = encryptText(cleanKey);
        encryptedSecrets['BREVO_FROM_EMAIL'] = encryptText(cleanFrom);
        encryptedSecrets['BREVO_FROM_NAME'] = encryptText(cleanName);
      }

      vault.configs = vault.configs || {};
      const existingAccounts = Array.isArray(vault.configs['gmail']?.accounts)
        ? vault.configs['gmail']!.accounts!
        : [];
      const providerLabel = cleanProvider === 'resend' ? 'Resend' : 'Brevo';
      const handleDisplay = `${cleanFrom} (${providerLabel})`;
      const acctId = `acct_${cleanProvider}_${cleanFrom
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')}`;

      const newAcct: StoredAccountRecord = {
        id: acctId,
        label: `${providerLabel} HTTPS API (${cleanFrom})`,
        accountHandle: handleDisplay,
        webhookUrl: '',
        isPrimary: true,
        verifiedDetail,
        createdAt: new Date().toISOString(),
        authType: 'api_key',
        encryptedSecrets,
      };

      const mergedAccounts = [
        newAcct,
        ...existingAccounts
          .filter((a) => a.id !== acctId)
          .map((a) => ({ ...a, isPrimary: false })),
      ];

      vault.configs['gmail'] = {
        accountHandle: handleDisplay,
        webhookUrl: '',
        verified: true,
        verifiedDetail,
        updatedAt: new Date().toISOString(),
        accounts: mergedAccounts,
      };
      vault.updatedAt = new Date().toISOString();
      saveVault(vault);

      return res.json({
        ok: true,
        provider: cleanProvider,
        email: handleDisplay,
        senderEmail: cleanFrom,
        accounts: mergedAccounts,
        detail: verifiedDetail,
      });
    } catch (err: any) {
      return res.status(400).json({
        ok: false,
        error: `${cleanProvider.toUpperCase()} verification failed: ${
          err?.message || 'Network error'
        }`,
      });
    }
  });

  const handleServerEmailDispatch = async (
    req: express.Request,
    res: express.Response
  ) => {
    const { to, subject, body, providerOverride } = req.body as {
      to?: string;
      subject?: string;
      body?: string;
      providerOverride?: 'resend' | 'brevo' | 'smtp';
    };

    if (!to || !to.includes('@')) {
      return res.status(400).json({
        ok: false,
        error: 'A valid recipient email address is required.',
      });
    }

    const activeProvider = (
      providerOverride ||
      getSecretPlain('EMAIL_ACTIVE_PROVIDER') ||
      (getSecretPlain('RESEND_API_KEY')
        ? 'resend'
        : getSecretPlain('BREVO_API_KEY')
        ? 'brevo'
        : 'smtp')
    ).toLowerCase();

    // 1. Send via Resend HTTPS API (https://api.resend.com/emails)
    if (activeProvider === 'resend') {
      const resendKey = getSecretPlain('RESEND_API_KEY');
      const resendFromEmail =
        getSecretPlain('RESEND_FROM_EMAIL') || 'onboarding@resend.dev';
      const resendFromName =
        getSecretPlain('RESEND_FROM_NAME') || 'Atelier Estate';

      if (!resendKey) {
        return res.status(400).json({
          ok: false,
          error:
            'Resend API Key is not configured. Connect Resend in Connected Apps -> Email.',
        });
      }

      try {
        const fromHeader = resendFromName
          ? `${resendFromName} <${resendFromEmail}>`
          : resendFromEmail;

        const resendResp = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromHeader,
            to: [to.trim()],
            subject: subject || 'Message from Atelier Estate',
            text: body || '',
          }),
        });

        const resendData = await resendResp.json().catch(() => ({}));
        if (!resendResp.ok) {
          return res.status(400).json({
            ok: false,
            error: `Resend API error (HTTP ${resendResp.status}): ${
              resendData?.message ||
              'Failed to send email via Resend. Note: With onboarding@resend.dev, Resend only sends to your own verified Resend account email unless you add a custom domain.'
            }`,
          });
        }

        return res.json({
          ok: true,
          provider: 'Resend HTTPS API',
          id: resendData.id || `resend-${Date.now()}`,
          from: resendFromEmail,
          to: to.trim(),
          accepted: [to.trim()],
        });
      } catch (err: any) {
        return res.status(400).json({
          ok: false,
          error: `Failed to send email via Resend: ${
            err?.message || 'HTTPS request failed'
          }`,
        });
      }
    }

    // 2. Send via Brevo V3 HTTPS API (https://api.brevo.com/v3/smtp/email)
    if (activeProvider === 'brevo') {
      const brevoKey = getSecretPlain('BREVO_API_KEY');
      const brevoFromEmail = getSecretPlain('BREVO_FROM_EMAIL');
      const brevoFromName =
        getSecretPlain('BREVO_FROM_NAME') || 'Atelier Estate';

      if (!brevoKey || !brevoFromEmail) {
        return res.status(400).json({
          ok: false,
          error:
            'Brevo API Key or Sender Email is not configured. Connect Brevo in Connected Apps -> Email.',
        });
      }

      try {
        const brevoResp = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'api-key': brevoKey,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            sender: {
              name: brevoFromName,
              email: brevoFromEmail,
            },
            to: [{ email: to.trim() }],
            subject: subject || 'Message from Atelier Estate',
            textContent: body || '',
          }),
        });

        const brevoData = await brevoResp.json().catch(() => ({}));
        if (!brevoResp.ok) {
          return res.status(400).json({
            ok: false,
            error: `Brevo API error (HTTP ${brevoResp.status}): ${
              brevoData?.message || 'Failed to send email via Brevo.'
            }`,
          });
        }

        return res.json({
          ok: true,
          provider: 'Brevo HTTPS API',
          id: brevoData.messageId || `brevo-${Date.now()}`,
          from: brevoFromEmail,
          to: to.trim(),
          accepted: [to.trim()],
        });
      } catch (err: any) {
        return res.status(400).json({
          ok: false,
          error: `Failed to send email via Brevo: ${
            err?.message || 'HTTPS request failed'
          }`,
        });
      }
    }

    // 3. Default / Fallback: Send via Gmail / Custom SMTP (Nodemailer)
    const smtpUser = getSecretPlain('GMAIL_SMTP_USER');
    const smtpPass = getSecretPlain('GMAIL_SMTP_APP_PASSWORD');
    const smtpHost = getSecretPlain('GMAIL_SMTP_HOST') || 'smtp.gmail.com';

    if (!smtpUser || !smtpPass) {
      return res.status(400).json({
        ok: false,
        error:
          'No email provider is connected. Connect Resend, Brevo, Google OAuth, or Gmail App Password in Connected Apps -> Gmail / Email.',
      });
    }

    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: 465,
        secure: true,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const info = await transporter.sendMail({
        from: smtpUser,
        to: to.trim(),
        subject: subject || 'Message from Atelier Estate',
        text: body || '',
      });

      return res.json({
        ok: true,
        provider: 'Gmail SMTP',
        id: info.messageId,
        from: smtpUser,
        to: to.trim(),
        accepted: info.accepted,
      });
    } catch (err: any) {
      return res.status(400).json({
        ok: false,
        error: `Failed to send email via ${smtpHost}: ${
          err?.message || 'SMTP error'
        }`,
      });
    }
  };

  app.post('/api/email/send-smtp', handleServerEmailDispatch);
  app.post('/api/email/send', handleServerEmailDispatch);

  // ============================================================================
  // 3b. REAL LIVE CHANNEL VERIFICATION ENDPOINT (Telnyx, WhatsApp, IG, FB, Maps)
  // ============================================================================
  app.post('/api/channels/verify-and-save', async (req, res) => {
    const { toolId, accountHandle, webhookUrl, secrets } = req.body as {
      toolId: string;
      accountHandle?: string;
      webhookUrl?: string;
      secrets?: Record<string, string>;
    };

    const vault = loadVault();
    const getCandidateSecret = (keyName: string) => {
      const fromInput = secrets?.[keyName]?.trim();
      if (fromInput) return fromInput;
      return getSecretPlain(keyName);
    };

    try {
      let verifiedHandle = (accountHandle || '').trim();
      let verificationMessage = '';

      const cleanWebhookUrl = (webhookUrl || '').trim();

      if (toolId === 'telnyx') {
        const apiKey = getCandidateSecret('TELNYX_API_KEY');
        const fromNum = getCandidateSecret('TELNYX_FROM_NUMBER');
        if (apiKey) {
          const telnyxRes = await fetch('https://api.telnyx.com/v2/balance', {
            headers: { Authorization: `Bearer ${apiKey}` },
          });
          const telnyxData = await telnyxRes.json().catch(() => ({}));
          if (!telnyxRes.ok) {
            return res.status(400).json({
              ok: false,
              error: `Official Telnyx API rejected this key (HTTP ${telnyxRes.status}): ${
                telnyxData?.errors?.[0]?.detail || 'Invalid Telnyx V2 API key.'
              }`,
            });
          }
          if (!fromNum && !verifiedHandle) {
            return res.status(400).json({
              ok: false,
              error:
                'Please enter your real Telnyx Phone Number (+1...) so we know which number to send SMS from.',
            });
          }
          const balance = telnyxData?.data?.balance || '0.00';
          const currency = telnyxData?.data?.currency || 'USD';
          verifiedHandle = fromNum || verifiedHandle;
          verificationMessage = `Verified live with Official Telnyx V2 API (Account Balance: ${balance} ${currency}).`;
        } else if (!cleanWebhookUrl) {
          return res.status(400).json({
            ok: false,
            error:
              'Telnyx is NOT connected. Paste either your Official Telnyx V2 API Key (Tab 1) OR a live Make.com / n8n / Zapier Outbound Webhook URL (Tab 2).',
          });
        }
      } else if (toolId === 'whatsapp') {
        const ultramsgInstance = getCandidateSecret('ULTRAMSG_INSTANCE_ID');
        const ultramsgToken = getCandidateSecret('ULTRAMSG_TOKEN');
        const waToken = getCandidateSecret('WHATSAPP_ACCESS_TOKEN');
        const phoneId = getCandidateSecret('WHATSAPP_PHONE_NUMBER_ID');

        if (waToken && phoneId) {
          const waRes = await fetch(
            `https://graph.facebook.com/v19.0/${encodeURIComponent(
              phoneId
            )}?fields=display_phone_number,verified_name,quality_rating`,
            {
              headers: { Authorization: `Bearer ${waToken}` },
            }
          );
          const waData = await waRes.json().catch(() => ({}));
          if (!waRes.ok) {
            return res.status(400).json({
              ok: false,
              error: `Official Meta WhatsApp Cloud API rejected credentials (HTTP ${waRes.status}): ${
                waData?.error?.message || 'Invalid token or Phone Number ID.'
              }`,
            });
          }
          verifiedHandle =
            waData.display_phone_number ||
            waData.verified_name ||
            verifiedHandle ||
            phoneId;
          verificationMessage = `Verified live with Official Meta WhatsApp Cloud API (${
            waData.verified_name || verifiedHandle
          }).`;
        } else if (ultramsgInstance && ultramsgToken) {
          if (!verifiedHandle) {
            return res.status(400).json({
              ok: false,
              error:
                'Please enter your real WhatsApp phone number (+1...) alongside your Ultramsg Instance ID and Token.',
            });
          }
          const cleanInst = ultramsgInstance.replace(/^instance/i, '');
          const instPath = `instance${cleanInst}`;
          const ultraRes = await fetch(
            `https://api.ultramsg.com/${encodeURIComponent(
              instPath
            )}/instance/status?token=${encodeURIComponent(ultramsgToken)}`
          );
          const ultraData = await ultraRes.json().catch(() => ({}));
          const statusVal =
            ultraData?.status?.accountStatus?.status ||
            ultraData?.status?.status ||
            '';
          if (!ultraRes.ok || ultraData?.error) {
            return res.status(400).json({
              ok: false,
              error: `Ultramsg QR WhatsApp API rejected credentials: ${
                typeof ultraData?.error === 'string'
                  ? ultraData.error
                  : JSON.stringify(
                      ultraData?.error ||
                        'Invalid Instance ID or Token from ultramsg.com'
                    )
              }`,
            });
          }
          verificationMessage = `Verified live with Ultramsg QR WhatsApp Gateway (${instPath}${
            statusVal ? ` · Status: ${statusVal}` : ''
          }).`;
        } else if (!cleanWebhookUrl) {
          return res.status(400).json({
            ok: false,
            error:
              'WhatsApp is NOT connected. Please enter your Official Meta WhatsApp Cloud API credentials (Tab 1), Ultramsg QR credentials, or a live Make.com / n8n / Zapier Outbound Webhook URL (Tab 2).',
          });
        }
      } else if (toolId === 'instagram') {
        const igToken = getCandidateSecret('INSTAGRAM_ACCESS_TOKEN');
        if (igToken) {
          const igRes = await fetch(
            `https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${encodeURIComponent(
              igToken
            )}`
          );
          const igData = await igRes.json().catch(() => ({}));
          if (!igRes.ok) {
            return res.status(400).json({
              ok: false,
              error: `Official Instagram/Meta Graph API rejected token (HTTP ${igRes.status}): ${
                igData?.error?.message || 'Invalid access token.'
              }`,
            });
          }
          verifiedHandle = igData.name || verifiedHandle;
          if (!verifiedHandle) {
            return res.status(400).json({
              ok: false,
              error: 'Please enter your Instagram @handle.',
            });
          }
          verificationMessage = `Verified live with Official Meta Instagram Graph API (${verifiedHandle}).`;
        } else if (!cleanWebhookUrl) {
          return res.status(400).json({
            ok: false,
            error:
              'Instagram is NOT connected. Paste either your Official Meta Instagram Graph Access Token (Tab 1) OR a live Make.com / n8n / Zapier Outbound Webhook URL (Tab 2).',
          });
        }
      } else if (toolId === 'facebook') {
        const fbToken = getCandidateSecret('FACEBOOK_PAGE_ACCESS_TOKEN');
        if (fbToken) {
          const fbRes = await fetch(
            `https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${encodeURIComponent(
              fbToken
            )}`
          );
          const fbData = await fbRes.json().catch(() => ({}));
          if (!fbRes.ok) {
            return res.status(400).json({
              ok: false,
              error: `Official Facebook Graph API rejected token (HTTP ${fbRes.status}): ${
                fbData?.error?.message || 'Invalid Page Access Token.'
              }`,
            });
          }
          verifiedHandle = fbData.name || verifiedHandle;
          if (!verifiedHandle) {
            return res.status(400).json({
              ok: false,
              error: 'Please enter your Facebook Page name.',
            });
          }
          verificationMessage = `Verified live with Official Facebook Graph API (Page: ${verifiedHandle}).`;
        } else if (!cleanWebhookUrl) {
          return res.status(400).json({
            ok: false,
            error:
              'Facebook is NOT connected. Paste either your Official Facebook Page Access Token (Tab 1) OR a live Make.com / n8n / Zapier Outbound Webhook URL (Tab 2).',
          });
        }
      } else if (toolId === 'google_maps') {
        const mapsKey =
          getCandidateSecret('GOOGLE_MAPS_API_KEY') ||
          (getSecretPlain('CUSTOM_LLM_API_KEY').startsWith('AIza')
            ? getSecretPlain('CUSTOM_LLM_API_KEY')
            : '');
        if (!mapsKey) {
          return res.status(400).json({
            ok: false,
            error:
              'Google Maps requires a valid Official Google / Gemini API Key (starts with AIza...). Get a key at aistudio.google.com/apikey and paste it below.',
          });
        }
        const gRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(
            mapsKey
          )}`
        );
        const gData = await gRes.json().catch(() => ({}));
        if (!gRes.ok) {
          return res.status(400).json({
            ok: false,
            error: `Official Google API rejected this key (HTTP ${gRes.status}): ${
              gData?.error?.message || 'Invalid Google API key.'
            }`,
          });
        }
        verifiedHandle =
          verifiedHandle || `Google Maps API (${maskSecret(mapsKey)})`;
        verificationMessage =
          'Verified live against Official Google APIs for Maps Grounding.';
      } else if (toolId === 'website_leads') {
        const siteDomain = (
          verifiedHandle ||
          secrets?.['WEBSITE_DOMAIN'] ||
          ''
        ).trim();
        const webhookSecret = getCandidateSecret('WEBSITE_WEBHOOK_SECRET');
        if (!siteDomain) {
          return res.status(400).json({
            ok: false,
            error:
              'Enter your real estate agency website domain or URL (e.g. https://www.youragency.com) to activate direct website lead capture.',
          });
        }
        verifiedHandle = siteDomain;
        verificationMessage = `Direct Website Lead Capture active for ${siteDomain}${
          webhookSecret ? ' (Secret Token Protected)' : ''
        }. Ready to receive leads at POST /api/webhooks/website-leads.`;
      } else if (toolId === 'google_calendar') {
        const hasVerifiedEmailDispatcher = Boolean(
          getSecretPlain('RESEND_API_KEY') ||
            getSecretPlain('BREVO_API_KEY') ||
            getSecretPlain('GMAIL_SMTP_APP_PASSWORD') ||
            vault.configs?.['gmail']?.verified
        );
        if (!hasVerifiedEmailDispatcher) {
          return res.status(400).json({
            ok: false,
            error:
              'To send .ics calendar invites without Google OAuth, first connect your Email provider (Resend, Brevo, or Gmail App Password) in the "Email & Gmail" tab.',
          });
        }
        const calEmail = (
          verifiedHandle ||
          getSecretPlain('RESEND_FROM_EMAIL') ||
          getSecretPlain('BREVO_FROM_EMAIL') ||
          getSecretPlain('GMAIL_SMTP_USER') ||
          vault.configs?.['gmail']?.accountHandle ||
          ''
        ).trim();
        if (!calEmail) {
          return res.status(400).json({
            ok: false,
            error: 'Please enter your calendar email address.',
          });
        }
        verifiedHandle = calEmail;
        verificationMessage = `Active: Brokerage Master Schedule & .ics Calendar Invite Dispatcher (${calEmail}). Emails real .ics calendar invites via your connected email provider.`;
      }

      // If an Outbound Webhook URL was provided without an Official API key, strictly validate both handle and external webhook URL
      if (!verificationMessage && cleanWebhookUrl) {
        if (!verifiedHandle) {
          return res.status(400).json({
            ok: false,
            error: `Please enter your real ${toolId.toUpperCase()} account handle or phone number (e.g. @your_instagram or +1310...) in the Account Handle box before connecting your webhook. We never generate fake handles.`,
          });
        }
        if (!cleanWebhookUrl.startsWith('http')) {
          return res.status(400).json({
            ok: false,
            error:
              'Outbound Webhook URL must start with https:// or http:// (copy the Custom Webhook URL generated inside Make.com, n8n, or Zapier).',
          });
        }
        const reqHost = (req.headers.host || '').toLowerCase();
        if (
          cleanWebhookUrl.includes('/api/webhooks/') ||
          (reqHost && cleanWebhookUrl.toLowerCase().includes(reqHost))
        ) {
          return res.status(400).json({
            ok: false,
            error:
              'You pasted your Atelier CRM Inbound URL into the Outbound Webhook box! For Outbound Webhook URL, you must paste the external webhook URL generated by Make.com (https://hook...make.com/...), n8n, or Zapier (https://hooks.zapier.com/...).',
          });
        }

        let whRes: Response;
        try {
          whRes = await fetch(cleanWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'atelier_webhook_verification_ping',
              channelId: toolId,
              accountHandle: verifiedHandle,
              recipient: '+13105550199',
              messageBody: `Atelier Estate CRM live webhook verification ping for ${verifiedHandle}`,
              timestamp: new Date().toISOString(),
            }),
          });
        } catch (err: any) {
          recordWebhookDiagnosticEvent({
            direction: 'VERIFY_PING',
            channelId: toolId,
            endpointPath: cleanWebhookUrl,
            httpStatus: 0,
            status: 'NETWORK_ERROR',
            summary: `Outbound Webhook verification failed for ${toolId}`,
            errorReason: err?.message || 'Network error',
            rawPayload: { cleanWebhookUrl, verifiedHandle },
          });
          return res.status(400).json({
            ok: false,
            error: `Could not reach Outbound Webhook URL (${cleanWebhookUrl}): ${
              err?.message || 'Network error'
            }`,
          });
        }
        if (!whRes.ok) {
          recordWebhookDiagnosticEvent({
            direction: 'VERIFY_PING',
            channelId: toolId,
            endpointPath: cleanWebhookUrl,
            httpStatus: whRes.status,
            status: 'AUTH_ERROR',
            summary: `Outbound Webhook returned HTTP ${whRes.status}`,
            errorReason: `HTTP ${whRes.status} from ${cleanWebhookUrl}. Make sure your Make.com / n8n scenario is turned ON or listening for data.`,
            rawPayload: { cleanWebhookUrl, verifiedHandle },
          });
          return res.status(400).json({
            ok: false,
            error: `Outbound Webhook endpoint returned HTTP ${whRes.status}. In Make.com, click "Run once" (or turn the scenario ON) so your Custom Webhook is actively listening, then click Verify again.`,
          });
        }
        recordWebhookDiagnosticEvent({
          direction: 'VERIFY_PING',
          channelId: toolId,
          endpointPath: cleanWebhookUrl,
          httpStatus: whRes.status,
          status: 'SUCCESS',
          summary: `Verified live Outbound Webhook (${new URL(cleanWebhookUrl).hostname}) for ${verifiedHandle}`,
          rawPayload: { cleanWebhookUrl, verifiedHandle },
        });
        verificationMessage = `Live Outbound Webhook verified (HTTP ${whRes.status} from ${new URL(cleanWebhookUrl).hostname}).`;
      }

      if (!verificationMessage) {
        return res.status(400).json({
          ok: false,
          error: `Cannot mark ${toolId.toUpperCase()} as Connected. Please provide either your Official API Key (Tab 1) or a live Make.com / n8n / Zapier Outbound Webhook URL + your real account handle (Tab 2).`,
        });
      }

      // Save only after live verification passes!
      const encryptedForAccount: Record<string, string> = {};
      if (secrets && typeof secrets === 'object') {
        for (const [k, v] of Object.entries(secrets)) {
          if (typeof v === 'string' && v.trim()) {
            const enc = encryptText(v.trim());
            vault.secrets[k] = enc;
            encryptedForAccount[k] = enc;
          }
        }
      }

      vault.configs = vault.configs || {};
      const existingAccounts = Array.isArray(vault.configs[toolId]?.accounts)
        ? vault.configs[toolId]!.accounts!
        : [];
      const acctId = `acct_${toolId}_${Date.now()}`;
      const newAcct: StoredAccountRecord = {
        id: acctId,
        label: verifiedHandle || `${toolId.toUpperCase()} Account`,
        accountHandle: verifiedHandle,
        webhookUrl: (webhookUrl || '').trim(),
        isPrimary: true,
        verifiedDetail: verificationMessage,
        createdAt: new Date().toISOString(),
        authType: toolId === 'website_leads' ? 'webhook' : 'api_key',
        encryptedSecrets: encryptedForAccount,
      };

      const mergedAccounts = [
        newAcct,
        ...existingAccounts
          .filter(
            (a) =>
              a.accountHandle.toLowerCase() !== verifiedHandle.toLowerCase()
          )
          .map((a) => ({ ...a, isPrimary: false })),
      ];

      vault.configs[toolId] = {
        accountHandle: verifiedHandle,
        webhookUrl: (webhookUrl || '').trim(),
        verified: true,
        verifiedDetail: verificationMessage,
        updatedAt: new Date().toISOString(),
        accounts: mergedAccounts,
      };
      vault.updatedAt = new Date().toISOString();
      saveVault(vault);

      const entries: Record<string, { configured: boolean; masked: string }> =
        {};
      for (const [k, encVal] of Object.entries(vault.secrets)) {
        try {
          const plain = decryptText(encVal);
          entries[k] = {
            configured: Boolean(plain.trim()),
            masked: maskSecret(plain),
          };
        } catch {
          entries[k] = { configured: false, masked: '' };
        }
      }

      return res.json({
        ok: true,
        verifiedHandle,
        verificationMessage,
        accounts: mergedAccounts,
        entries,
        configs: vault.configs,
      });
    } catch (err: any) {
      return res.status(400).json({
        ok: false,
        error: `Live verification failed: ${
          err?.message || 'Unable to reach provider API'
        }`,
      });
    }
  });

  // ============================================================================
  // 3b-2. MULTI-ACCOUNT MANAGEMENT (Switch Active Account / Add OAuth / Remove)
  // ============================================================================
  app.post('/api/channels/accounts/manage', (req, res) => {
    const {
      toolId,
      action,
      accountId,
      oauthEmail,
      oauthDetail,
    } = req.body as {
      toolId: string;
      action: 'set_primary' | 'remove_account' | 'register_oauth';
      accountId?: string;
      oauthEmail?: string;
      oauthDetail?: string;
    };

    const vault = loadVault();
    vault.configs = vault.configs || {};
    const cfg = vault.configs[toolId] || {
      accountHandle: '',
      webhookUrl: '',
      verified: false,
      verifiedDetail: '',
      updatedAt: new Date().toISOString(),
      accounts: [],
    };
    let accounts: StoredAccountRecord[] = Array.isArray(cfg.accounts)
      ? [...cfg.accounts]
      : [];

    if (action === 'register_oauth' && oauthEmail) {
      const cleanEmail = oauthEmail.trim();
      const acctId = `acct_oauth_${toolId}_${cleanEmail
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')}`;
      const newAcct: StoredAccountRecord = {
        id: acctId,
        label: `Google OAuth (${cleanEmail})`,
        accountHandle: cleanEmail,
        webhookUrl: '',
        isPrimary: true,
        verifiedDetail: oauthDetail || 'Verified Google OAuth 2.0',
        createdAt: new Date().toISOString(),
        authType: 'oauth',
      };
      accounts = [
        newAcct,
        ...accounts
          .filter(
            (a) => a.accountHandle.toLowerCase() !== cleanEmail.toLowerCase()
          )
          .map((a) => ({ ...a, isPrimary: false })),
      ];
      cfg.accountHandle = cleanEmail;
      cfg.verified = true;
      cfg.verifiedDetail = newAcct.verifiedDetail;
    } else if (action === 'set_primary' && accountId) {
      const target = accounts.find((a) => a.id === accountId);
      if (target) {
        accounts = accounts.map((a) => ({
          ...a,
          isPrimary: a.id === accountId,
        }));
        cfg.accountHandle = target.accountHandle;
        cfg.webhookUrl = target.webhookUrl || '';
        cfg.verified = true;
        cfg.verifiedDetail = target.verifiedDetail;
        // Restore this account's encrypted secrets as the active secrets
        if (target.encryptedSecrets) {
          for (const [k, encVal] of Object.entries(target.encryptedSecrets)) {
            vault.secrets[k] = encVal;
          }
        }
      }
    } else if (action === 'remove_account' && accountId) {
      accounts = accounts.filter((a) => a.id !== accountId);
      if (accounts.length > 0) {
        if (!accounts.some((a) => a.isPrimary)) {
          accounts[0].isPrimary = true;
        }
        const primary = accounts.find((a) => a.isPrimary) || accounts[0];
        cfg.accountHandle = primary.accountHandle;
        cfg.webhookUrl = primary.webhookUrl || '';
        cfg.verified = true;
        cfg.verifiedDetail = primary.verifiedDetail;
        if (primary.encryptedSecrets) {
          for (const [k, encVal] of Object.entries(primary.encryptedSecrets)) {
            vault.secrets[k] = encVal;
          }
        }
      } else {
        cfg.accountHandle = '';
        cfg.webhookUrl = '';
        cfg.verified = false;
        cfg.verifiedDetail = 'Not configured';
      }
    }

    cfg.accounts = accounts;
    cfg.updatedAt = new Date().toISOString();
    vault.configs[toolId] = cfg;
    vault.updatedAt = new Date().toISOString();
    saveVault(vault);

    return res.json({
      ok: true,
      toolId,
      config: cfg,
      configs: vault.configs,
    });
  });

  // ============================================================================
  // 3b-3. DIRECT AGENCY WEBSITE & OMNICHANNEL LEAD RECEIVER WEBHOOKS + HEALTH DIAGNOSTICS
  // ============================================================================
  const handleInboundWebhookRequest = (
    req: express.Request,
    res: express.Response,
    routeChannelId?: string
  ) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const rawBody =
      req.body && typeof req.body === 'object' ? req.body : ({} as any);
    const endpointPath = `POST ${req.path}`;
    const receivedKeys = Object.keys(rawBody);
    const expectedKeys = [
      'name (or fullName / first_name / data.pushname)',
      'email (or buyer_email)',
      'phone (or phone_number / whatsapp_phone / data.from)',
      'propertyInterest (optional)',
      'budget (optional)',
    ];

    // Determine target channel from URL param or payload source
    const rawSource = String(rawBody.source || '').toLowerCase();
    const inferredChannel =
      routeChannelId ||
      (rawSource.includes('whatsapp') || rawBody?.data?.from
        ? 'whatsapp'
        : rawSource.includes('instagram')
        ? 'instagram'
        : rawSource.includes('facebook')
        ? 'facebook'
        : rawSource.includes('telnyx') || rawSource.includes('sms')
        ? 'telnyx'
        : 'website_leads');

    const configuredSecret = getSecretPlain('WEBSITE_WEBHOOK_SECRET');
    const providedSecret =
      (req.headers['x-webhook-secret'] as string) ||
      rawBody.webhookSecret ||
      '';

    if (
      configuredSecret &&
      providedSecret &&
      configuredSecret !== String(providedSecret).trim()
    ) {
      const errReason =
        'Header X-Webhook-Secret (or body.webhookSecret) does not match the configured WEBSITE_WEBHOOK_SECRET in your vault.';
      recordWebhookDiagnosticEvent({
        direction: 'INBOUND',
        channelId: inferredChannel,
        endpointPath,
        httpStatus: 401,
        status: 'AUTH_ERROR',
        summary: 'Rejected Inbound Webhook: Invalid X-Webhook-Secret',
        errorReason: errReason,
        rawPayload: rawBody,
        receivedKeys,
        expectedKeys,
      });
      return res.status(401).json({
        ok: false,
        error: 'Invalid X-Webhook-Secret for Agency Website Lead Receiver.',
        diagnostic: errReason,
      });
    }

    // Normalize across standard JSON, Ultramsg ({ data: { from, pushname, body } }), ManyChat ({ first_name, last_name, whatsapp_phone }), and Meta/Zapier ({ full_name, phone_number })
    const nestedData =
      rawBody.data && typeof rawBody.data === 'object' ? rawBody.data : {};
    const cleanName = String(
      rawBody.name ||
        rawBody.fullName ||
        rawBody.full_name ||
        (rawBody.first_name
          ? `${rawBody.first_name} ${rawBody.last_name || ''}`.trim()
          : '') ||
        nestedData.pushname ||
        nestedData.notifyName ||
        ''
    ).trim();

    const cleanEmail = String(
      rawBody.email || rawBody.buyer_email || nestedData.email || ''
    ).trim();

    const cleanPhone = String(
      rawBody.phone ||
        rawBody.phone_number ||
        rawBody.whatsapp_phone ||
        nestedData.from ||
        nestedData.author ||
        ''
    )
      .replace(/@c\.us$/i, '')
      .trim();

    if (!cleanName && !cleanEmail && !cleanPhone) {
      const errReason =
        receivedKeys.length === 0
          ? 'Empty JSON payload ({}) received. External provider sent a POST request with an empty body or wrong Content-Type header (must be application/json).'
          : `Malformed payload: Missing required contact identifier. Expected at least one of [name, fullName, email, phone, data.from], but external provider only sent keys: [${receivedKeys.join(
              ', '
            )}].`;

      recordWebhookDiagnosticEvent({
        direction: 'INBOUND',
        channelId: inferredChannel,
        endpointPath,
        httpStatus: 400,
        status: 'PAYLOAD_ERROR',
        summary: `Payload Schema Mismatch on ${endpointPath}`,
        errorReason: errReason,
        rawPayload: rawBody,
        receivedKeys,
        expectedKeys,
      });

      return res.status(400).json({
        ok: false,
        error:
          'Webhook lead payload must include at least name, email, or phone.',
        diagnostic: errReason,
        receivedKeys,
        expectedKeys,
      });
    }

    const vault = loadVault();
    const domainLabel =
      String(rawBody.websiteDomain || '').trim() ||
      vault.configs?.[inferredChannel]?.accountHandle ||
      vault.configs?.['website_leads']?.accountHandle ||
      (inferredChannel === 'whatsapp'
        ? 'WhatsApp Business'
        : inferredChannel === 'instagram'
        ? 'Instagram DM'
        : inferredChannel === 'facebook'
        ? 'Facebook Lead Ads'
        : inferredChannel === 'telnyx'
        ? 'Telnyx Voice / SMS'
        : 'Agency Website');

    const sourceDisplay =
      String(rawBody.source || '').trim() ||
      (inferredChannel === 'website_leads'
        ? `Website (${domainLabel.replace(/^https?:\/\//, '')})`
        : domainLabel);

    const newLead: InboundWebsiteLeadRecord = {
      id: `weblead-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: cleanName || `Inbound ${sourceDisplay} Lead`,
      email: cleanEmail || 'inquiry@website-lead.com',
      phone: cleanPhone || 'Not provided',
      source: sourceDisplay,
      budget: String(rawBody.budget || '$5,000,000').trim(),
      timeline: String(rawBody.timeline || '30 Days').trim(),
      propertyInterest: String(
        rawBody.propertyInterest ||
          rawBody.listingTitle ||
          nestedData.body ||
          'Villa Solaris Promontory'
      )
        .slice(0, 120)
        .trim(),
      qualificationScore: 93,
      status: 'AI Qualified',
      assignedEmployeeId: 'marcus',
      notes:
        String(rawBody.message || rawBody.notes || nestedData.body || '').trim() ||
        `Received via ${endpointPath} (${domainLabel}). Auto-qualified by Marcus Thorne.`,
      websiteDomain: domainLabel,
      receivedAtIso: new Date().toISOString(),
    };

    inboundWebsiteLeads.unshift(newLead);
    if (inboundWebsiteLeads.length > 50) {
      inboundWebsiteLeads.pop();
    }

    recordWebhookDiagnosticEvent({
      direction: 'INBOUND',
      channelId: inferredChannel,
      endpointPath,
      httpStatus: 200,
      status: 'SUCCESS',
      summary: `Synced Lead "${newLead.name}" (${newLead.phone !== 'Not provided' ? newLead.phone : newLead.email}) into CRM`,
      rawPayload: rawBody,
      receivedKeys,
      expectedKeys,
    });

    return res.json({
      ok: true,
      lead: newLead,
      endpointPath,
      message: `Lead "${newLead.name}" captured via ${endpointPath} and routed to AI Lead Manager Marcus Thorne.`,
    });
  };

  app.options('/api/webhooks/website-leads', (_req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, X-Webhook-Secret'
    );
    res.sendStatus(204);
  });

  app.options('/api/webhooks/inbound/:channelId', (_req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, X-Webhook-Secret'
    );
    res.sendStatus(204);
  });

  app.post('/api/webhooks/website-leads', (req, res) =>
    handleInboundWebhookRequest(req, res)
  );

  app.post('/api/webhooks/inbound/:channelId', (req, res) =>
    handleInboundWebhookRequest(
      req,
      res,
      String(req.params.channelId || 'website_leads').toLowerCase()
    )
  );

  app.get('/api/webhooks/website-leads', (_req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.json({
      ok: true,
      leads: inboundWebsiteLeads,
    });
  });

  // 3b-4. WEBHOOK HEALTH & DIAGNOSTIC VISUALIZER ENDPOINTS
  app.get('/api/webhooks/health', (_req, res) => {
    const vault = loadVault();
    const endpointSpecs = [
      {
        channelId: 'website_leads',
        channelName: 'Agency Website Leads',
        inboundPath: '/api/webhooks/website-leads',
        alternatePath: '/api/webhooks/inbound/website_leads',
        method: 'POST',
        expectedProviders:
          'Elementor, Webflow, WordPress, Typeform, Make.com, Zapier',
        requiredFields: ['name (or fullName)', 'email', 'phone'],
        optionalFields: [
          'propertyInterest',
          'budget',
          'timeline',
          'notes',
          'websiteDomain',
        ],
        samplePayload: {
          name: 'Henrik Lindqvist',
          email: 'henrik@nordiccapital.se',
          phone: '+13105550199',
          budget: '$14,850,000',
          propertyInterest: 'Villa Solaris Promontory',
          source: 'Agency Website',
        },
      },
      {
        channelId: 'whatsapp',
        channelName: 'WhatsApp Business',
        inboundPath: '/api/webhooks/inbound/whatsapp',
        alternatePath: '/api/webhooks/website-leads',
        method: 'POST',
        expectedProviders:
          'Ultramsg Webhook, Wati, ManyChat, Make.com, Zapier',
        requiredFields: [
          'name (or data.pushname / first_name)',
          'phone (or data.from / whatsapp_phone)',
        ],
        optionalFields: ['propertyInterest (or data.body)', 'budget', 'email'],
        samplePayload: {
          name: 'Aarav Singhania',
          phone: '+919820144910',
          propertyInterest: 'The Mercer Penthouse',
          budget: '$9,450,000',
          source: 'WhatsApp Business',
        },
      },
      {
        channelId: 'instagram',
        channelName: 'Instagram DM Automation',
        inboundPath: '/api/webhooks/inbound/instagram',
        alternatePath: '/api/webhooks/website-leads',
        method: 'POST',
        expectedProviders: 'ManyChat Instagram Automation, Make.com, Zapier',
        requiredFields: ['name (or first_name)', 'phone (or email)'],
        optionalFields: ['propertyInterest', 'budget', 'notes'],
        samplePayload: {
          name: 'Sora Takahashi',
          email: 'sora@studio-kengo.io',
          phone: '+19174428810',
          propertyInterest: 'The Mercer Cast-Iron Penthouse',
          source: 'Instagram DM',
        },
      },
      {
        channelId: 'facebook',
        channelName: 'Facebook Lead Ads',
        inboundPath: '/api/webhooks/inbound/facebook',
        alternatePath: '/api/webhooks/website-leads',
        method: 'POST',
        expectedProviders:
          'Make.com Facebook Lead Ads Module, Zapier Lead Ads, LeadBridge',
        requiredFields: ['name (or full_name)', 'email', 'phone (or phone_number)'],
        optionalFields: ['propertyInterest', 'budget', 'timeline'],
        samplePayload: {
          full_name: 'Devon Mercer',
          email: 'dmercer@apexsovereign.vc',
          phone_number: '+14159901122',
          propertyInterest: 'Point Dume Sanctuary',
          source: 'Facebook Lead Ads',
        },
      },
      {
        channelId: 'telnyx',
        channelName: 'Telnyx Voice & SMS',
        inboundPath: '/api/webhooks/inbound/telnyx',
        alternatePath: '/api/webhooks/website-leads',
        method: 'POST',
        expectedProviders: 'Telnyx Inbound Webhook, Vapi, Bland AI, Make.com',
        requiredFields: ['phone (or data.from)', 'name (optional)'],
        optionalFields: ['notes (or data.body)', 'propertyInterest'],
        samplePayload: {
          name: 'Inbound SMS Buyer',
          phone: '+13105550144',
          notes: 'Interested in scheduling a Saturday tour at Villa Solaris',
          source: 'Telnyx SMS',
        },
      },
    ];

    const diagnostics = endpointSpecs.map((spec) => {
      const cfg = vault.configs?.[spec.channelId];
      const stat = webhookHealthState.channelStats[spec.channelId] || {
        channelId: spec.channelId,
        lastInboundAtIso: null,
        lastOutboundAtIso: null,
        lastErrorAtIso: null,
        lastErrorDetail: null,
        inboundCount: 0,
        outboundCount: 0,
        errorCount: 0,
      };
      const isConnected = Boolean(cfg?.verified);

      let syncStatus:
        | 'HEALTHY_SYNCING'
        | 'CONNECTED_NO_INBOUND_YET'
        | 'PAYLOAD_ERROR_DETECTED'
        | 'NOT_CONNECTED' = 'NOT_CONNECTED';
      let diagnosisExplanation = '';

      if (
        stat.lastErrorAtIso &&
        (!stat.lastInboundAtIso ||
          stat.lastErrorAtIso >= stat.lastInboundAtIso)
      ) {
        syncStatus = 'PAYLOAD_ERROR_DETECTED';
        diagnosisExplanation = `External provider reached ${spec.inboundPath}, but the last payload failed validation: ${stat.lastErrorDetail}`;
      } else if (isConnected && stat.inboundCount > 0) {
        syncStatus = 'HEALTHY_SYNCING';
        diagnosisExplanation = `Credentials verified AND inbound webhooks are actively syncing (${stat.inboundCount} received).`;
      } else if (isConnected && stat.inboundCount === 0) {
        syncStatus = 'CONNECTED_NO_INBOUND_YET';
        diagnosisExplanation = `Why it shows "Connected" without syncing data: Your outbound credentials (${
          cfg?.accountHandle || 'API / Webhook'
        }) are verified for sending, but the external provider (${
          spec.expectedProviders
        }) has sent 0 POST requests to ${
          spec.inboundPath
        }. Paste ${spec.inboundPath} into your provider's webhook settings.`;
      } else if (!isConnected && stat.inboundCount > 0) {
        syncStatus = 'HEALTHY_SYNCING';
        diagnosisExplanation = `Inbound webhooks ARE arriving at ${spec.inboundPath} (${stat.inboundCount} received), even though outbound credentials are not connected yet.`;
      } else {
        syncStatus = 'NOT_CONNECTED';
        diagnosisExplanation = `Channel is not connected and 0 inbound webhooks have been received at ${spec.inboundPath}.`;
      }

      return {
        ...spec,
        connected: isConnected,
        accountHandle: cfg?.accountHandle || '',
        verifiedDetail: cfg?.verifiedDetail || '',
        outboundWebhookUrl: cfg?.webhookUrl || '',
        stat,
        syncStatus,
        diagnosisExplanation,
      };
    });

    return res.json({
      ok: true,
      lastReceivedAtIso: webhookHealthState.lastReceivedAtIso,
      lastErrorAtIso: webhookHealthState.lastErrorAtIso,
      totalInboundReceived: webhookHealthState.totalInboundReceived,
      totalInboundRejected: webhookHealthState.totalInboundRejected,
      totalOutboundDispatched: webhookHealthState.totalOutboundDispatched,
      totalOutboundFailed: webhookHealthState.totalOutboundFailed,
      diagnostics,
      recentLogs: webhookHealthState.recentLogs,
    });
  });

  app.post('/api/webhooks/health/clear', (_req, res) => {
    webhookHealthState.recentLogs = [];
    webhookHealthState.lastErrorAtIso = null;
    for (const ch of Object.values(webhookHealthState.channelStats)) {
      ch.lastErrorAtIso = null;
      ch.lastErrorDetail = null;
      ch.errorCount = 0;
    }
    return res.json({ ok: true });
  });

  // 3c. Live API Key Auto-Detection & Real-Time Model Fetching Endpoint
  app.post('/api/ai/discover-models', async (req, res) => {
    const { apiKey, preferredProvider, customBaseUrl } = req.body as {
      apiKey?: string;
      preferredProvider?: SupportedLlmProvider;
      customBaseUrl?: string;
    };

    const trimmedKey =
      (apiKey || '').trim() || getSecretPlain('CUSTOM_LLM_API_KEY');
    if (!trimmedKey) {
      return res.status(400).json({
        ok: false,
        error: 'Paste an API key first to detect the provider and fetch models.',
      });
    }

    const isNonChatModel = (id: string) => {
      const lower = id.toLowerCase();
      return (
        lower.includes('embedding') ||
        lower.includes('whisper') ||
        lower.includes('tts') ||
        lower.includes('dall-e') ||
        lower.includes('moderation') ||
        lower.includes('babbage') ||
        lower.includes('davinci') ||
        lower.includes('canary') ||
        lower.includes('guard') ||
        lower.includes('audio') ||
        lower.includes('realtime') ||
        lower.includes('transcribe') ||
        lower.includes('aqa') ||
        lower.includes('imagen') ||
        lower.includes('veo')
      );
    };

    async function probeOpenAiCompatibleModels(
      providerId: SupportedLlmProvider,
      providerLabel: string,
      modelsUrl: string,
      key: string
    ): Promise<{
      provider: SupportedLlmProvider;
      providerName: string;
      models: string[];
    } | null> {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 6500);
        const resp = await fetch(modelsUrl, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${key}`,
            Accept: 'application/json',
          },
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (!resp.ok) return null;
        const data = await resp.json().catch(() => null);
        const rawList: any[] = Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data?.models)
          ? data.models
          : [];
        const modelIds = rawList
          .map((item: any) =>
            typeof item === 'string' ? item : item?.id || item?.name || ''
          )
          .filter((id: string) => Boolean(id) && !isNonChatModel(id));

        if (modelIds.length === 0) return null;
        return {
          provider: providerId,
          providerName: providerLabel,
          models: modelIds,
        };
      } catch {
        return null;
      }
    }

    async function probeAnthropicModels(key: string) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 6500);
        const resp = await fetch('https://api.anthropic.com/v1/models', {
          method: 'GET',
          headers: {
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
          },
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (!resp.ok) return null;
        const data = await resp.json().catch(() => null);
        const rawList: any[] = Array.isArray(data?.data) ? data.data : [];
        const modelIds = rawList
          .map((m: any) => m?.id || '')
          .filter(Boolean);
        if (modelIds.length === 0) return null;
        return {
          provider: 'anthropic' as SupportedLlmProvider,
          providerName: 'Claude (Anthropic)',
          models: modelIds,
        };
      } catch {
        return null;
      }
    }

    async function probeGeminiModels(key: string) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 6500);
        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(
            key
          )}`,
          {
            method: 'GET',
            signal: controller.signal,
          }
        );
        clearTimeout(timer);
        if (!resp.ok) return null;
        const data = await resp.json().catch(() => null);
        const rawModels: any[] = Array.isArray(data?.models) ? data.models : [];
        const modelIds = rawModels
          .filter(
            (m: any) =>
              Array.isArray(m?.supportedGenerationMethods) &&
              m.supportedGenerationMethods.includes('generateContent')
          )
          .map((m: any) => String(m.name || '').replace(/^models\//, ''))
          .filter((id: string) => Boolean(id) && !isNonChatModel(id));

        if (modelIds.length === 0) return null;
        return {
          provider: 'gemini' as SupportedLlmProvider,
          providerName: 'Google Gemini',
          models: modelIds,
        };
      } catch {
        return null;
      }
    }

    try {
      let result: {
        provider: SupportedLlmProvider;
        providerName: string;
        models: string[];
        resolvedBaseUrl?: string;
      } | null = null;

      if (customBaseUrl && customBaseUrl.trim().startsWith('http')) {
        const cleanBase = customBaseUrl
          .trim()
          .replace(/\/chat\/completions\/?$/, '')
          .replace(/\/+$/, '');
        const customRes = await probeOpenAiCompatibleModels(
          'custom',
          'Custom OpenAI-Compatible Provider',
          `${cleanBase}/models`,
          trimmedKey
        );
        if (customRes) {
          result = { ...customRes, resolvedBaseUrl: cleanBase };
        }
      }

      if (!result) {
        if (trimmedKey.startsWith('gsk_')) {
          result = await probeOpenAiCompatibleModels(
            'groq',
            'Groq (LPU Cloud)',
            'https://api.groq.com/openai/v1/models',
            trimmedKey
          );
        } else if (trimmedKey.startsWith('sk-ant-')) {
          result = await probeAnthropicModels(trimmedKey);
        } else if (trimmedKey.startsWith('xai-')) {
          result = await probeOpenAiCompatibleModels(
            'xai',
            'Grok (xAI)',
            'https://api.x.ai/v1/models',
            trimmedKey
          );
        } else if (trimmedKey.startsWith('AIza')) {
          result = await probeGeminiModels(trimmedKey);
        } else if (trimmedKey.startsWith('sk-or-')) {
          const orRes = await probeOpenAiCompatibleModels(
            'custom',
            'OpenRouter',
            'https://openrouter.ai/api/v1/models',
            trimmedKey
          );
          if (orRes) {
            result = {
              ...orRes,
              resolvedBaseUrl: 'https://openrouter.ai/api/v1',
            };
          }
        }
      }

      if (!result) {
        const probes = await Promise.all([
          probeOpenAiCompatibleModels(
            'openai',
            'ChatGPT (OpenAI)',
            'https://api.openai.com/v1/models',
            trimmedKey
          ),
          probeOpenAiCompatibleModels(
            'deepseek',
            'DeepSeek',
            'https://api.deepseek.com/models',
            trimmedKey
          ),
          probeOpenAiCompatibleModels(
            'groq',
            'Groq (LPU Cloud)',
            'https://api.groq.com/openai/v1/models',
            trimmedKey
          ),
          probeOpenAiCompatibleModels(
            'xai',
            'Grok (xAI)',
            'https://api.x.ai/v1/models',
            trimmedKey
          ),
          probeAnthropicModels(trimmedKey),
          probeGeminiModels(trimmedKey),
          probeOpenAiCompatibleModels(
            'glm',
            'GLM (Zhipu AI)',
            'https://open.bigmodel.cn/api/paas/v4/models',
            trimmedKey
          ),
        ]);

        const matchedPreferred = probes.find(
          (p) => p && p.provider === preferredProvider
        );
        result = matchedPreferred || probes.find((p) => p !== null) || null;
      }

      if (!result) {
        return res.status(400).json({
          ok: false,
          error:
            'Could not verify this API key or fetch models from OpenAI, Groq, Claude, Grok, DeepSeek, Gemini, or GLM. Please check that the key is valid and active.',
        });
      }

      const models = result.models;
      const priorityPatterns = [
        'gpt-4o-mini',
        'gpt-4o',
        'claude-3-7-sonnet',
        'claude-3-5-sonnet',
        'claude-3-5-haiku',
        'llama-3.3-70b-versatile',
        'llama-3.1-8b-instant',
        'deepseek-chat',
        'grok-2',
        'grok-3',
        'gemini-2.5-flash',
        'gemini-2.0-flash',
        'glm-4-flash',
        'glm-4-plus',
      ];
      let recommendedModel = models[0];
      for (const pat of priorityPatterns) {
        const found = models.find((m) => m.toLowerCase().includes(pat));
        if (found) {
          recommendedModel = found;
          break;
        }
      }

      return res.json({
        ok: true,
        detectedProvider: result.provider,
        providerName: result.providerName,
        models,
        recommendedModel,
        resolvedBaseUrl: result.resolvedBaseUrl || '',
      });
    } catch (err: any) {
      return res.status(500).json({
        ok: false,
        error: err?.message || 'Failed to fetch models for this key.',
      });
    }
  });

  // 4. AI Employee Chat & Tool Execution Endpoint
  app.post('/api/ai/employee-task', async (req, res) => {
    const {
      employeeName,
      employeeRole,
      systemPrompt,
      taskPrompt,
      brokerageContext,
      connectedTools,
    } = req.body;

    const vault = loadVault();
    const provider = ((req.headers['x-llm-provider'] as string) ||
      vault.llmProvider ||
      'openai') as SupportedLlmProvider;
    const model =
      (req.headers['x-llm-model'] as string) || vault.llmModel || 'gpt-4o-mini';
    const customBaseUrl =
      (req.headers['x-llm-base-url'] as string) || vault.llmBaseUrl || '';
    const headerApiKey = (
      (req.headers['x-llm-api-key'] as string) || ''
    ).trim();
    const vaultApiKey = getSecretPlain('CUSTOM_LLM_API_KEY');
    const effectiveApiKey = headerApiKey || vaultApiKey;

    const systemInstruction = `You are ${employeeName} (${employeeRole}) at Atelier Estate Brokerage.
Persona & Instructions: ${systemPrompt || 'Helpful, concise, action-oriented AI employee.'}

CRITICAL HONESTY & TOOL EXECUTION RULES:
1. NEVER claim in "reply" that you have already sent an email, scheduled a calendar event, or sent an SMS/WhatsApp message! You only generate the structured "proposedAction" payload so the client/server can execute the real API call.
2. When the user asks to send an email (or reply/email a client), you MUST set proposedAction.actionType = "GMAIL_SEND" and fill in "recipientEmail", "emailSubject", and "emailBody". In "reply", say: "I have prepared the email to [recipientEmail] and am dispatching it now."
3. When the user asks to book/schedule a tour or calendar event, you MUST set proposedAction.actionType = "CALENDAR_CREATE" and fill in "eventSummary", "eventDescription", "eventStartIso", "eventDurationMinutes", and "attendeeEmail".
4. When the user asks to send an SMS or WhatsApp message, you MUST set proposedAction.actionType = "WEBHOOK_OR_SMS_DISPATCH" and fill in "targetChannel" ("telnyx" or "whatsapp"), "recipientPhoneOrHandle", and "smsOrPostBody".
5. When the user asks to add a lead, set proposedAction.actionType = "DB_ADD_LEAD". When the user asks to add a property, set proposedAction.actionType = "DB_ADD_PROPERTY".
6. When the user asks to contact, brief, or schedule a meeting with one of our HUMAN REAL ESTATE AGENTS (e.g., Victoria Sterling, Alexander Vance, Camille Laurent, or any human agent in brokerageContext.humanAgents), set proposedAction.actionType = "CONTACT_HUMAN_AGENT" and fill in "humanAgentName", "humanAgentEmail", "humanAgentPhone", "emailSubject", "emailBody", and (if scheduling a meeting/showing on their calendar) "eventSummary", "eventStartIso", "eventDurationMinutes", and "attendeeEmail".

Return ONLY a JSON object with this exact structure:
{
  "reply": "Your natural response (DO NOT claim an external email/SMS was already sent before execution)",
  "actionSummary": "Short 3-5 word badge",
  "proposedAction": {
    "actionType": "NONE" | "GMAIL_SEND" | "CALENDAR_CREATE" | "MAPS_SEARCH" | "WEBHOOK_OR_SMS_DISPATCH" | "DB_ADD_LEAD" | "DB_ADD_PROPERTY" | "CONTACT_HUMAN_AGENT",
    "recipientEmail": "string",
    "emailSubject": "string",
    "emailBody": "string",
    "eventSummary": "string",
    "eventDescription": "string",
    "eventStartIso": "ISO date string",
    "eventDurationMinutes": 45,
    "attendeeEmail": "string",
    "humanAgentName": "string",
    "humanAgentEmail": "string",
    "humanAgentPhone": "string",
    "mapsQuery": "string",
    "mapsLocation": "string",
    "targetChannel": "whatsapp" | "telnyx" | "instagram" | "facebook",
    "recipientPhoneOrHandle": "string",
    "smsOrPostBody": "string",
    "leadName": "string",
    "leadEmail": "string",
    "leadPhone": "string",
    "leadBudget": "string",
    "leadTimeline": "string",
    "leadPropertyInterest": "string",
    "leadStatus": "AI Qualified",
    "leadNotes": "string",
    "propertyTitle": "string",
    "propertyAddress": "string",
    "propertyNeighborhood": "string",
    "propertyPrice": "$5,500,000",
    "propertyBeds": 4,
    "propertyBaths": 4,
    "propertySqft": "3,200",
    "propertyStatus": "Active"
  }
}`;

    const userPrompt = `Connected Apps Status:
${JSON.stringify(connectedTools || [], null, 2)}

Brokerage Database Context (Properties & Leads):
${typeof brokerageContext === 'string' ? brokerageContext : JSON.stringify(brokerageContext || {})}

User Request:
"${taskPrompt}"`;

    const geminiSchema = {
      type: Type.OBJECT,
      properties: {
        reply: { type: Type.STRING },
        actionSummary: { type: Type.STRING },
        proposedAction: {
          type: Type.OBJECT,
          properties: {
            actionType: { type: Type.STRING },
            recipientEmail: { type: Type.STRING },
            emailSubject: { type: Type.STRING },
            emailBody: { type: Type.STRING },
            eventSummary: { type: Type.STRING },
            eventDescription: { type: Type.STRING },
            eventStartIso: { type: Type.STRING },
            eventDurationMinutes: { type: Type.NUMBER },
            attendeeEmail: { type: Type.STRING },
            mapsQuery: { type: Type.STRING },
            mapsLocation: { type: Type.STRING },
            targetChannel: { type: Type.STRING },
            recipientPhoneOrHandle: { type: Type.STRING },
            smsOrPostBody: { type: Type.STRING },
            leadName: { type: Type.STRING },
            leadEmail: { type: Type.STRING },
            leadPhone: { type: Type.STRING },
            leadBudget: { type: Type.STRING },
            leadTimeline: { type: Type.STRING },
            leadPropertyInterest: { type: Type.STRING },
            leadStatus: { type: Type.STRING },
            leadNotes: { type: Type.STRING },
            propertyTitle: { type: Type.STRING },
            propertyAddress: { type: Type.STRING },
            propertyNeighborhood: { type: Type.STRING },
            propertyPrice: { type: Type.STRING },
            propertyBeds: { type: Type.NUMBER },
            propertyBaths: { type: Type.NUMBER },
            propertySqft: { type: Type.STRING },
            propertyStatus: { type: Type.STRING },
          },
          required: ['actionType'],
        },
      },
      required: ['reply', 'actionSummary', 'proposedAction'],
    };

    try {
      const { data: parsed, usedProvider, usedModel } =
        await callUniversalLlmJson({
          provider,
          model,
          apiKey: effectiveApiKey,
          customBaseUrl,
          systemInstruction,
          userPrompt,
          geminiSchema,
        });

      const proposed = parsed.proposedAction || { actionType: 'NONE' };

      // Deterministic safeguards: if user prompt explicitly asks to use an external channel, ensure the corresponding actionType is set
      const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/;
      const phoneRegex = /(\+?[0-9][0-9\s\-()]{6,18}[0-9])/;
      const emailMatch = String(taskPrompt || '').match(emailRegex);
      const phoneMatch = String(taskPrompt || '').match(phoneRegex);
      const lowerPrompt = String(taskPrompt || '').toLowerCase();

      if (proposed.actionType === 'NONE') {
        if (lowerPrompt.includes('whatsapp')) {
          proposed.actionType = 'WEBHOOK_OR_SMS_DISPATCH';
          proposed.targetChannel = 'whatsapp';
          proposed.recipientPhoneOrHandle =
            proposed.recipientPhoneOrHandle ||
            (phoneMatch ? phoneMatch[1].trim() : '');
          proposed.smsOrPostBody =
            proposed.smsOrPostBody || parsed.reply || String(taskPrompt);
        } else if (
          lowerPrompt.includes('sms') ||
          lowerPrompt.includes('telnyx') ||
          lowerPrompt.includes('text message')
        ) {
          proposed.actionType = 'WEBHOOK_OR_SMS_DISPATCH';
          proposed.targetChannel = 'telnyx';
          proposed.recipientPhoneOrHandle =
            proposed.recipientPhoneOrHandle ||
            (phoneMatch ? phoneMatch[1].trim() : '');
          proposed.smsOrPostBody =
            proposed.smsOrPostBody || parsed.reply || String(taskPrompt);
        } else if (
          lowerPrompt.includes('instagram') &&
          (lowerPrompt.includes('dm') ||
            lowerPrompt.includes('send') ||
            lowerPrompt.includes('message') ||
            lowerPrompt.includes('post') ||
            lowerPrompt.includes('publish'))
        ) {
          proposed.actionType = 'WEBHOOK_OR_SMS_DISPATCH';
          proposed.targetChannel = 'instagram';
          proposed.smsOrPostBody =
            proposed.smsOrPostBody || parsed.reply || String(taskPrompt);
        } else if (
          lowerPrompt.includes('facebook') &&
          (lowerPrompt.includes('send') ||
            lowerPrompt.includes('message') ||
            lowerPrompt.includes('post') ||
            lowerPrompt.includes('publish'))
        ) {
          proposed.actionType = 'WEBHOOK_OR_SMS_DISPATCH';
          proposed.targetChannel = 'facebook';
          proposed.smsOrPostBody =
            proposed.smsOrPostBody || parsed.reply || String(taskPrompt);
        } else if (
          (lowerPrompt.includes('send') ||
            lowerPrompt.includes('email') ||
            lowerPrompt.includes('mail')) &&
          emailMatch
        ) {
          proposed.actionType = 'GMAIL_SEND';
          proposed.recipientEmail = proposed.recipientEmail || emailMatch[1];
          proposed.emailSubject =
            proposed.emailSubject || 'Follow-Up from Atelier Estate';
          proposed.emailBody =
            proposed.emailBody || parsed.reply || String(taskPrompt);
        }
      }

      // Check real connection state from connectedTools and vault so the bot NEVER lies that it sent via an unconnected app
      const toolsArray = Array.isArray(connectedTools) ? connectedTools : [];
      const isChannelConnected = (id: string) => {
        const fromClient = toolsArray.find((t: any) => t.id === id);
        if (fromClient && typeof fromClient.connected === 'boolean') {
          return fromClient.connected;
        }
        return Boolean(vault.configs?.[id]?.verified);
      };

      let finalReply = parsed.reply || 'Task processed.';
      let finalActionSummary =
        parsed.actionSummary || `${usedProvider} · ${usedModel}`;

      if (
        proposed.actionType === 'WEBHOOK_OR_SMS_DISPATCH' &&
        proposed.targetChannel
      ) {
        const ch = String(proposed.targetChannel).toLowerCase();
        if (!isChannelConnected(ch)) {
          finalActionSummary = `${ch.toUpperCase()} Not Connected`;
          finalReply = `⚠️ I have drafted the ${ch.toUpperCase()} message below, but I **cannot send it** because **${ch.toUpperCase()} is NOT connected** yet.\n\nDraft prepared:\n"${
            proposed.smsOrPostBody || finalReply
          }"`;
        }
      } else if (
        proposed.actionType === 'GMAIL_SEND' ||
        proposed.actionType === 'CONTACT_HUMAN_AGENT'
      ) {
        if (!isChannelConnected('gmail')) {
          finalActionSummary = 'Email Not Connected';
          finalReply = `⚠️ I have drafted the email to ${
            proposed.recipientEmail ||
            proposed.humanAgentEmail ||
            'the recipient'
          } below, but I **cannot send it** because **Email / Gmail is NOT connected** yet.`;
        }
      } else if (proposed.actionType === 'MAPS_SEARCH') {
        if (!isChannelConnected('google_maps')) {
          finalActionSummary = 'Google Maps Not Connected';
          finalReply = `⚠️ I cannot run a live Google Maps Grounding lookup yet because **Google Maps is NOT connected** in Connected Apps & Website.`;
        }
      }

      res.json({
        reply: finalReply,
        actionSummary: finalActionSummary,
        proposedAction: proposed,
      });
    } catch (error: any) {
      res.status(400).json({
        error: true,
        reply: `❌ AI Task Failed: ${
          error?.message || 'Unable to reach LLM provider.'
        }`,
        actionSummary: 'API Key Required',
        proposedAction: { actionType: 'NONE' },
      });
    }
  });

  // 5. Live Voice Call Receptionist Endpoint (Requires Real BYOK API Key)
  app.post('/api/ai/voice-call', async (req, res) => {
    const {
      employeeName,
      employeeRole,
      callerUtterance,
      callTranscript,
      propertiesContext,
      currentCallerDraft,
    } = req.body;

    const vault = loadVault();
    const provider = ((req.headers['x-llm-provider'] as string) ||
      vault.llmProvider ||
      'openai') as SupportedLlmProvider;
    const model =
      (req.headers['x-llm-model'] as string) || vault.llmModel || 'gpt-4o-mini';
    const customBaseUrl =
      (req.headers['x-llm-base-url'] as string) || vault.llmBaseUrl || '';
    const headerApiKey = (
      (req.headers['x-llm-api-key'] as string) || ''
    ).trim();
    const vaultApiKey = getSecretPlain('CUSTOM_LLM_API_KEY');
    const effectiveApiKey = headerApiKey || vaultApiKey;

    const systemInstruction = `You are ${employeeName || 'Clara Sterling'}, ${
      employeeRole || 'AI Voice Receptionist'
    } answering a LIVE inbound phone call for Atelier Estate Brokerage.
Speak naturally, warmly, and concisely (1-3 sentences max). Answer property questions and politely gather the caller's Name, Phone/Email, Budget, and Property Interest.
Return ONLY a valid JSON object with keys:
{
  "spokenReply": "1-3 sentences to speak aloud to the caller",
  "callerName": "string or empty",
  "callerPhone": "string or empty",
  "callerEmail": "string or empty",
  "budget": "string or empty",
  "timeline": "string or empty",
  "propertyInterest": "string or empty",
  "callSummaryNote": "1 sentence note for CRM",
  "qualificationScore": 85,
  "tourRequested": false
}`;

    const userPrompt = `Active Portfolio Listings:
${
  typeof propertiesContext === 'string'
    ? propertiesContext
    : JSON.stringify(propertiesContext || [])
}

Current Extracted Caller Info:
${JSON.stringify(currentCallerDraft || {})}

Call Transcript So Far:
${
  Array.isArray(callTranscript)
    ? callTranscript.map((t: any) => `${t.speaker}: ${t.text}`).join('\n')
    : ''
}

Caller Just Said:
"${callerUtterance}"`;

    try {
      const { data: parsed } = await callUniversalLlmJson({
        provider,
        model,
        apiKey: effectiveApiKey,
        customBaseUrl,
        systemInstruction,
        userPrompt,
      });
      res.json(parsed);
    } catch (error: any) {
      res.status(400).json({
        error: true,
        spokenReply: `Voice call requires a valid BYOK LLM API Key: ${
          error?.message || 'Paste your API key in BYOK API Keys.'
        }`,
      });
    }
  });

  // 5b. AI Lead Engagement, Sentiment & Recommended Next Steps Analysis Endpoint
  app.post('/api/ai/analyze-lead', async (req, res) => {
    const {
      lead,
      assignedAgent,
      chatLogs,
      botLogs,
      pastEmails,
      reminders,
    } = req.body as {
      lead: any;
      assignedAgent?: any;
      chatLogs?: any[];
      botLogs?: any[];
      pastEmails?: any[];
      reminders?: any[];
    };

    if (!lead || !lead.name) {
      return res.status(400).json({
        ok: false,
        error: 'Lead data is required for AI analysis.',
      });
    }

    const vault = loadVault();
    const provider = ((req.headers['x-llm-provider'] as string) ||
      vault.llmProvider ||
      'openai') as SupportedLlmProvider;
    const model =
      (req.headers['x-llm-model'] as string) || vault.llmModel || 'gpt-4o-mini';
    const customBaseUrl =
      (req.headers['x-llm-base-url'] as string) || vault.llmBaseUrl || '';
    const headerApiKey = (
      (req.headers['x-llm-api-key'] as string) || ''
    ).trim();
    const vaultApiKey = getSecretPlain('CUSTOM_LLM_API_KEY');
    const effectiveApiKey = headerApiKey || vaultApiKey;

    const systemInstruction = `You are Aria Rostova, AI Chief of Staff & Senior Lead Intelligence Analyst at Atelier Estate Brokerage.
Analyze the provided real estate lead's complete CRM profile, chat logs, bot activity logs, scheduled reminders, and past email history.
Generate a brief, sharp, executive intelligence briefing covering:
1. "engagementSummary": A 2-3 sentence synthesis of the lead's engagement history across emails, chats, website inquiries, and tours.
2. "sentiment": Must be one of: "High Intent", "Positive", "Urgent", "Neutral", or "Cautious".
3. "sentimentScore": An integer from 0 to 100 reflecting buyer readiness and sentiment warmth.
4. "sentimentRationale": 1 concise sentence explaining why this sentiment and score were assigned based on specific evidence in their emails, notes, or chat logs.
5. "keySignals": An array of 3-4 short bullet points highlighting key buying signals, timeline urgency, financial readiness, or friction points.
6. "recommendedNextSteps": An array of 3 concrete, actionable next steps for the brokerage team. Each step must have:
   - "step": Clear action description
   - "channel": One of "Email", "Phone Call", "Google Calendar Tour", "WhatsApp", or "Human Agent Handoff"
   - "priority": One of "Immediate", "High", or "Medium"
   - "suggestedActionPrompt": A ready-to-run prompt that an AI Employee can execute immediately (e.g., "Send a Gmail follow-up to [email] with..." or "Schedule a Google Calendar tour for [name]...").

Return ONLY a valid JSON object matching this exact schema.`;

    const emailItems = Array.isArray(pastEmails) ? pastEmails : [];
    const chatItems = Array.isArray(chatLogs) ? chatLogs : [];
    const botLogItems = Array.isArray(botLogs) ? botLogs : [];
    const reminderItems = Array.isArray(reminders) ? reminders : [];

    const userPrompt = `Lead Profile:
${JSON.stringify(lead, null, 2)}

Assigned Human Real Estate Agent:
${JSON.stringify(assignedAgent || { name: 'Victoria Sterling', email: 'victoria.sterling@atelierestate.com' }, null, 2)}

Past Emails & Gmail Threads (${emailItems.length} items):
${JSON.stringify(emailItems, null, 2)}

Chat History Logs (${chatItems.length} messages):
${JSON.stringify(chatItems, null, 2)}

Bot Activity Logs Involving This Lead (${botLogItems.length} entries):
${JSON.stringify(botLogItems, null, 2)}

Scheduled Follow-Up Reminders (${reminderItems.length} items):
${JSON.stringify(reminderItems, null, 2)}`;

    const geminiSchema = {
      type: Type.OBJECT,
      properties: {
        engagementSummary: { type: Type.STRING },
        sentiment: { type: Type.STRING },
        sentimentScore: { type: Type.INTEGER },
        sentimentRationale: { type: Type.STRING },
        keySignals: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        recommendedNextSteps: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              step: { type: Type.STRING },
              channel: { type: Type.STRING },
              priority: { type: Type.STRING },
              suggestedActionPrompt: { type: Type.STRING },
            },
            required: ['step', 'channel', 'priority', 'suggestedActionPrompt'],
          },
        },
      },
      required: [
        'engagementSummary',
        'sentiment',
        'sentimentScore',
        'sentimentRationale',
        'keySignals',
        'recommendedNextSteps',
      ],
    };

    try {
      const { data: parsed, usedProvider, usedModel } =
        await callUniversalLlmJson({
          provider,
          model,
          apiKey: effectiveApiKey,
          customBaseUrl,
          systemInstruction,
          userPrompt,
          geminiSchema,
        });

      const validSentiments = [
        'High Intent',
        'Positive',
        'Urgent',
        'Neutral',
        'Cautious',
      ];
      const normalizedSentiment = validSentiments.includes(parsed.sentiment)
        ? parsed.sentiment
        : lead.qualificationScore >= 90
        ? 'High Intent'
        : 'Positive';

      return res.json({
        ok: true,
        analysis: {
          leadId: lead.id,
          generatedAt: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
          providerUsed: `${usedProvider} · ${usedModel}`,
          engagementSummary:
            parsed.engagementSummary ||
            `${lead.name} has engaged via ${lead.source} regarding ${lead.propertyInterest} (${lead.budget}, timeline: ${lead.timeline}).`,
          sentiment: normalizedSentiment,
          sentimentScore:
            Number(parsed.sentimentScore) || lead.qualificationScore || 88,
          sentimentRationale:
            parsed.sentimentRationale ||
            `Based on ${lead.source} inquiry, ${lead.timeline} timeline, and CRM engagement history.`,
          keySignals: Array.isArray(parsed.keySignals)
            ? parsed.keySignals
            : [
                `Target listing: ${lead.propertyInterest} (${lead.budget})`,
                `Timeline: ${lead.timeline} · Current status: ${lead.status}`,
              ],
          recommendedNextSteps: Array.isArray(parsed.recommendedNextSteps)
            ? parsed.recommendedNextSteps
            : [],
          analyzedEmailCount: emailItems.length,
          analyzedChatLogCount: chatItems.length + botLogItems.length,
        },
      });
    } catch (error: any) {
      return res.status(400).json({
        ok: false,
        error:
          error?.message ||
          'AI Lead Analysis requires a valid LLM API Key. Click "BYOK Keys" in the top bar to configure your key.',
      });
    }
  });

  // 6. Real Google Maps Grounding Search Endpoint (Uses User's Verified Google Key)
  app.post('/api/maps/grounding', async (req, res) => {
    const { query, location } = req.body;
    const headerApiKey = (
      (req.headers['x-llm-api-key'] as string) || ''
    ).trim();
    const vaultMapsKey = getSecretPlain('GOOGLE_MAPS_API_KEY');
    const vaultLlmKey = getSecretPlain('CUSTOM_LLM_API_KEY');
    const geminiKey = vaultMapsKey
      ? vaultMapsKey
      : headerApiKey.startsWith('AIza')
      ? headerApiKey
      : vaultLlmKey.startsWith('AIza')
      ? vaultLlmKey
      : '';

    if (geminiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey: geminiKey });
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `Provide real-world real estate neighborhood intelligence, nearby amenities, and market context for: "${query}" near "${
            location || 'New York / Los Angeles'
          }". Keep it concise and structured.`,
          config: {
            tools: [{ googleMaps: {} }],
          },
        });

        const chunks =
          response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const places = chunks
          .map((c: any) => ({
            title: c.maps?.title || c.web?.title || 'Verified Location',
            uri: c.maps?.uri || c.web?.uri || 'https://maps.google.com',
          }))
          .filter((p: any) => p.title);

        return res.json({
          ok: true,
          summary: response.text || 'Completed neighborhood lookup.',
          places,
        });
      } catch (error: any) {
        return res.status(400).json({
          ok: false,
          summary: `❌ Google Maps API error: ${
            error?.message || 'Unable to reach Maps grounding'
          }`,
          places: [],
        });
      }
    }

    // Fallback for Simple Direct Mode when user has a non-Google LLM API Key (e.g., Groq, OpenAI, Claude)
    const vault = loadVault();
    const fallbackLlmKey = headerApiKey || vaultLlmKey;
    const headerProvider = ((req.headers['x-llm-provider'] as string) || 'groq') as any;
    const headerModel = (req.headers['x-llm-model'] as string) || '';
    const headerBaseUrl = (req.headers['x-llm-base-url'] as string) || '';

    if (fallbackLlmKey && vault.configs?.['google_maps']?.verified) {
      try {
        const locStr = location || vault.configs?.['google_maps']?.accountHandle || 'Manhattan, NY';
        const { data: parsed } = await callUniversalLlmJson({
          provider: headerProvider,
          model: headerModel,
          apiKey: fallbackLlmKey,
          customBaseUrl: headerBaseUrl,
          systemInstruction:
            'You are a luxury real estate neighborhood specialist. Return JSON with "summary" (string) and "landmarks" (array of 3 landmark or neighborhood names).',
          userPrompt: `Provide real estate neighborhood intelligence, school districts, and amenities for "${query}" in "${locStr}".`,
          geminiSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              landmarks: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ['summary', 'landmarks'],
          },
        });

        const landmarks: string[] = Array.isArray(parsed?.landmarks)
          ? parsed.landmarks
          : [`${query} ${locStr}`];
        const places = landmarks.map((lm) => ({
          title: `${lm} (Open in Google Maps)`,
          uri: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            `${lm} ${locStr}`
          )}`,
        }));

        return res.json({
          ok: true,
          summary:
            parsed?.summary ||
            `Neighborhood intelligence for ${query} (${locStr}).`,
          places,
        });
      } catch (err: any) {
        return res.status(400).json({
          ok: false,
          summary: `❌ Maps lookup error: ${err?.message || 'Failed'}`,
          places: [],
        });
      }
    }

    return res.status(400).json({
      ok: false,
      summary:
        '❌ Google Maps is not connected. Open Connected Apps -> Google Maps and either paste an Official Google API Key (AIza...) or activate Simple Direct Mode.',
      places: [],
    });
  });

  // 6b. Hosted Buyer Inquiry Form for Non-Technical Users (Zero Make/Zapier Automations Required)
  app.get('/inquiry/:channelId', (req, res) => {
    const rawChannel = (req.params.channelId || 'whatsapp').toLowerCase();
    const channelMap: Record<
      string,
      { label: string; badge: string; accent: string }
    > = {
      whatsapp: {
        label: 'WhatsApp Business',
        badge: 'Official WhatsApp VIP Inquiry Desk',
        accent: '#059669',
      },
      instagram: {
        label: 'Instagram DM',
        badge: 'Instagram VIP Property Concierge',
        accent: '#e11d48',
      },
      facebook: {
        label: 'Facebook Lead Ads',
        badge: 'Facebook Page Property Inquiry',
        accent: '#2563eb',
      },
      telnyx: {
        label: 'Inbound Phone / SMS',
        badge: 'Direct SMS & Callback Priority Desk',
        accent: '#0f172a',
      },
    };
    const meta = channelMap[rawChannel] || channelMap.whatsapp;
    const vault = loadVault();
    const acctHandle =
      vault.configs?.[rawChannel]?.accountHandle || 'Atelier Estate Brokerage';

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${meta.badge} — ${acctHandle}</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
  <div class="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
    <div class="space-y-1.5">
      <span class="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
        ${meta.badge}
      </span>
      <h1 class="text-xl font-bold text-white">${acctHandle}</h1>
      <p class="text-xs text-slate-400">
        Submit your property criteria below. Your inquiry is routed directly into our brokerage CRM and assigned to a dedicated specialist immediately.
      </p>
    </div>

    <form id="leadForm" class="space-y-3.5">
      <div>
        <label class="block text-xs font-semibold text-slate-300 mb-1">Full Name *</label>
        <input required name="name" type="text" placeholder="e.g. Victoria Sterling" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-400" />
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1">WhatsApp / Phone *</label>
          <input required name="phone" type="tel" placeholder="+1 310 555 0199" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-400" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1">Email Address *</label>
          <input required name="email" type="email" placeholder="you@domain.com" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-400" />
        </div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1">Target Budget</label>
          <input name="budget" type="text" placeholder="$4,500,000" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-400" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1">Timeline</label>
          <select name="timeline" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-400">
            <option value="Immediate (Cash / Pre-Approved)">Immediate (0-30 Days)</option>
            <option value="1-3 Months">1-3 Months</option>
            <option value="3-6 Months">3-6 Months</option>
          </select>
        </div>
      </div>
      <div>
        <label class="block text-xs font-semibold text-slate-300 mb-1">Property / Neighborhood Interest</label>
        <input name="propertyInterest" type="text" placeholder="e.g. The Mercer Penthouse / Tribeca Penthouses" class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-400" />
      </div>
      <div>
        <label class="block text-xs font-semibold text-slate-300 mb-1">Message or Viewing Request</label>
        <textarea name="notes" rows="2" placeholder="I would love to schedule a private tour this week..." class="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-400"></textarea>
      </div>
      <button type="submit" id="submitBtn" class="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-colors cursor-pointer">
        Send Priority Inquiry
      </button>
      <div id="statusBox" class="hidden p-3 rounded-xl text-xs font-medium"></div>
    </form>
  </div>

  <script>
    const form = document.getElementById('leadForm');
    const statusBox = document.getElementById('statusBox');
    const submitBtn = document.getElementById('submitBtn');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting to Brokerage CRM...';
      const fd = new FormData(form);
      const payload = {
        name: fd.get('name'),
        phone: fd.get('phone'),
        email: fd.get('email'),
        budget: fd.get('budget') || '$3,500,000',
        timeline: fd.get('timeline') || 'Immediate',
        propertyInterest: fd.get('propertyInterest') || 'Private Portfolio Inquiry',
        notes: fd.get('notes') || 'Submitted via Hosted ${meta.label} Inquiry Link.',
        source: '${meta.label}',
        websiteDomain: '${acctHandle.replace(/'/g, '')}'
      };
      try {
        const res = await fetch('/api/webhooks/website-leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        statusBox.className = 'p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs font-medium block';
        statusBox.textContent = '✅ Thank you! Your inquiry has been received in our CRM and a specialist will reach out shortly.';
        form.reset();
      } catch (err) {
        statusBox.className = 'p-3.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs font-medium block';
        statusBox.textContent = 'Could not submit inquiry. Please try again.';
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Priority Inquiry';
      }
    });
  </script>
</body>
</html>`);
  });

  // 7. Outbound Channel Dispatch (Official APIs / Simple Direct 1-Click Mode / QR / Webhook)
  app.post('/api/channels/dispatch', async (req, res) => {
    const { channelId, recipient, messageBody, webhookUrl } = req.body;

    try {
      if (channelId === 'telnyx') {
        const telnyxKey = getSecretPlain('TELNYX_API_KEY');
        const fromNumber = getSecretPlain('TELNYX_FROM_NUMBER');
        if (telnyxKey && fromNumber && recipient) {
          const telnyxResp = await fetch('https://api.telnyx.com/v2/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${telnyxKey}`,
            },
            body: JSON.stringify({
              from: fromNumber,
              to: recipient,
              text: messageBody,
            }),
          });
          const data = await telnyxResp.json();
          if (telnyxResp.ok) {
            return res.json({
              ok: true,
              mode: 'LIVE_TELNYX_API',
              detail: `✅ Sent live SMS via Official Telnyx API to ${recipient} (Message ID: ${
                data?.data?.id || 'ok'
              })`,
            });
          }
          return res.status(400).json({
            ok: false,
            mode: 'TELNYX_ERROR',
            detail: `❌ Official Telnyx API error: ${
              data?.errors?.[0]?.detail ||
              'Telnyx API rejected request. Check your Telnyx API Key & From Number.'
            }`,
          });
        }
      }

      if (channelId === 'whatsapp') {
        const waToken = getSecretPlain('WHATSAPP_ACCESS_TOKEN');
        const phoneId = getSecretPlain('WHATSAPP_PHONE_NUMBER_ID');
        if (waToken && phoneId && recipient) {
          const waResp = await fetch(
            `https://graph.facebook.com/v19.0/${phoneId}/messages`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${waToken}`,
              },
              body: JSON.stringify({
                messaging_product: 'whatsapp',
                to: recipient.replace(/[^0-9]/g, ''),
                type: 'text',
                text: { body: messageBody },
              }),
            }
          );
          const data = await waResp.json();
          if (waResp.ok) {
            return res.json({
              ok: true,
              mode: 'LIVE_WHATSAPP_API',
              detail: `✅ Sent live WhatsApp message via Official Meta Cloud API to ${recipient} (ID: ${
                data?.messages?.[0]?.id || 'sent'
              })`,
            });
          }
          return res.status(400).json({
            ok: false,
            mode: 'WHATSAPP_ERROR',
            detail: `❌ Official Meta WhatsApp Cloud API error: ${
              data?.error?.message ||
              'WhatsApp Graph API rejected request. Check your token.'
            }`,
          });
        }

        const ultramsgInstance = getSecretPlain('ULTRAMSG_INSTANCE_ID');
        const ultramsgToken = getSecretPlain('ULTRAMSG_TOKEN');
        if (ultramsgInstance && ultramsgToken && recipient) {
          const cleanInst = ultramsgInstance.replace(/^instance/i, '');
          const instPath = `instance${cleanInst}`;
          const ultraResp = await fetch(
            `https://api.ultramsg.com/${encodeURIComponent(
              instPath
            )}/messages/chat`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                token: ultramsgToken,
                to: recipient.replace(/[^0-9+]/g, ''),
                body: messageBody,
              }),
            }
          );
          const ultraData = await ultraResp.json().catch(() => ({}));
          if (ultraResp.ok && (ultraData?.sent === 'true' || ultraData?.id)) {
            return res.json({
              ok: true,
              mode: 'LIVE_ULTRAMSG_QR',
              detail: `✅ Sent live WhatsApp message via Ultramsg QR Gateway to ${recipient} (ID: ${
                ultraData?.id || 'sent'
              })`,
            });
          }
          return res.status(400).json({
            ok: false,
            mode: 'ULTRAMSG_ERROR',
            detail: `❌ Ultramsg QR WhatsApp error: ${
              typeof ultraData?.error === 'string'
                ? ultraData.error
                : JSON.stringify(
                    ultraData?.error ||
                      'Check that your WhatsApp phone is online in Ultramsg.'
                  )
            }`,
          });
        }
      }

      if (webhookUrl && webhookUrl.startsWith('http')) {
        const whResp = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channelId,
            recipient,
            messageBody,
            timestamp: new Date().toISOString(),
          }),
        });
        if (!whResp.ok) {
          return res.status(400).json({
            ok: false,
            mode: 'WEBHOOK_ERROR',
            detail: `❌ Webhook returned HTTP ${whResp.status}`,
          });
        }
        return res.json({
          ok: true,
          mode: 'LIVE_WEBHOOK',
          detail: `✅ Dispatched payload to live webhook (HTTP ${whResp.status})`,
        });
      }

      return res.status(400).json({
        ok: false,
        mode: 'NOT_CONFIGURED',
        detail: `❌ ${channelId.toUpperCase()} is NOT connected. Open Connected Apps -> ${channelId} to connect via Official API Key, Make.com/n8n/Zapier Outbound Webhook, or WhatsApp QR.`,
      });
    } catch (error: any) {
      return res.status(500).json({
        ok: false,
        mode: 'NETWORK_ERROR',
        detail: `❌ Network error: ${error?.message || 'Dispatch failed'}`,
      });
    }
  });

  // ============================================================================
  // 8. B2B SaaS Portal: License Lock, Admin Key Generator & B2B Enquiries (Hostinger + VPS Ready)
  // ============================================================================

  interface B2BClientLicense {
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

  interface B2BEnquiryRecord {
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

  interface B2BPortalState {
    masterAdminKey: string;
    settings: {
      brandName: string;
      tagline: string;
      whatsappNumber: string;
      calendlyUrl: string;
      notificationEmail: string;
      backendUrl: string;
      requireLicenseLock: boolean;
    };
    licenses: B2BClientLicense[];
    enquiries: B2BEnquiryRecord[];
  }

  function loadB2BPortalState(): B2BPortalState {
    const vault = loadVault() as any;
    const connectedWa = (
      vault.configs?.['whatsapp']?.accountHandle || ''
    ).replace(/[^0-9+]/g, '');

    if (!vault.b2bPortal) {
      vault.b2bPortal = {
        masterAdminKey: 'ADMIN-ESTATE-2026',
        settings: {
          brandName: 'Atelier Estate AI',
          tagline: 'Autonomous 24/7 Real Estate AI Workforce & Omnichannel CRM',
          whatsappNumber: connectedWa || '',
          calendlyUrl: '',
          notificationEmail:
            getSecretPlain('RESEND_FROM_EMAIL') ||
            getSecretPlain('BREVO_FROM_EMAIL') ||
            getSecretPlain('GMAIL_SMTP_USER') ||
            'khushi4762@gmail.com',
          backendUrl: '',
          requireLicenseLock: true,
        },
        licenses: [],
        enquiries: [],
      };
      saveVault(vault);
    } else {
      // Purge any legacy fake placeholder data from existing vault
      let dirty = false;
      if (vault.b2bPortal.settings?.whatsappNumber === '+15550192834') {
        vault.b2bPortal.settings.whatsappNumber = connectedWa || '';
        dirty = true;
      } else if (!vault.b2bPortal.settings?.whatsappNumber && connectedWa) {
        vault.b2bPortal.settings.whatsappNumber = connectedWa;
        dirty = true;
      }
      if (vault.b2bPortal.settings?.calendlyUrl === 'https://calendly.com') {
        vault.b2bPortal.settings.calendlyUrl = '';
        dirty = true;
      }
      if (Array.isArray(vault.b2bPortal.licenses)) {
        const filteredLic = vault.b2bPortal.licenses.filter(
          (l: any) => l.id !== 'lic_demo_1'
        );
        if (filteredLic.length !== vault.b2bPortal.licenses.length) {
          vault.b2bPortal.licenses = filteredLic;
          dirty = true;
        }
      }
      if (Array.isArray(vault.b2bPortal.enquiries)) {
        const filteredEnq = vault.b2bPortal.enquiries.filter(
          (e: any) => e.id !== 'enq_sample_1'
        );
        if (filteredEnq.length !== vault.b2bPortal.enquiries.length) {
          vault.b2bPortal.enquiries = filteredEnq;
          dirty = true;
        }
      }
      if (dirty) {
        saveVault(vault);
      }
    }
    return vault.b2bPortal as B2BPortalState;
  }

  function saveB2BPortalState(state: B2BPortalState) {
    const vault = loadVault() as any;
    vault.b2bPortal = state;
    vault.updatedAt = new Date().toISOString();
    saveVault(vault);
  }

  async function dispatchInternalEmailNotification(
    to: string,
    subject: string,
    bodyText: string
  ): Promise<{ ok: boolean; detail: string }> {
    if (!to || !to.includes('@')) {
      return { ok: false, detail: 'No valid recipient email' };
    }
    const activeProvider = (
      getSecretPlain('EMAIL_ACTIVE_PROVIDER') ||
      (getSecretPlain('RESEND_API_KEY')
        ? 'resend'
        : getSecretPlain('BREVO_API_KEY')
        ? 'brevo'
        : getSecretPlain('GMAIL_SMTP_APP_PASSWORD')
        ? 'smtp'
        : '')
    ).toLowerCase();

    try {
      if (activeProvider === 'resend') {
        const resendKey = getSecretPlain('RESEND_API_KEY');
        const resendFromEmail =
          getSecretPlain('RESEND_FROM_EMAIL') || 'onboarding@resend.dev';
        const resendFromName =
          getSecretPlain('RESEND_FROM_NAME') || 'Atelier Estate AI';
        if (resendKey) {
          const resp = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${resendKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: `${resendFromName} <${resendFromEmail}>`,
              to: [to.trim()],
              subject,
              text: bodyText,
            }),
          });
          if (resp.ok) {
            return { ok: true, detail: `Sent via Resend HTTPS API to ${to}` };
          }
        }
      } else if (activeProvider === 'brevo') {
        const brevoKey = getSecretPlain('BREVO_API_KEY');
        const brevoFromEmail = getSecretPlain('BREVO_FROM_EMAIL');
        const brevoFromName =
          getSecretPlain('BREVO_FROM_NAME') || 'Atelier Estate AI';
        if (brevoKey && brevoFromEmail) {
          const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
              'api-key': brevoKey,
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            body: JSON.stringify({
              sender: { name: brevoFromName, email: brevoFromEmail },
              to: [{ email: to.trim() }],
              subject,
              textContent: bodyText,
            }),
          });
          if (resp.ok) {
            return { ok: true, detail: `Sent via Brevo V3 HTTPS API to ${to}` };
          }
        }
      }
    } catch (e: any) {
      return { ok: false, detail: e?.message || 'Email notification failed' };
    }
    return {
      ok: false,
      detail: 'Email provider not yet connected (configure Resend or Brevo in Workspace Tools)',
    };
  }

  // Enable CORS on public & auth endpoints so a Hostinger standalone website can communicate with this VPS/Render server
  app.use(['/api/public', '/api/auth', '/api/webhooks'], (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    );
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  app.get('/api/public/portal-config', (_req, res) => {
    const state = loadB2BPortalState();
    res.json({
      ok: true,
      settings: state.settings,
    });
  });

  app.post('/api/public/b2b-enquiry', async (req, res) => {
    const {
      agencyName,
      contactName,
      email,
      phone,
      teamSize,
      monthlyLeads,
      message,
      source,
    } = req.body || {};

    if (!contactName || !email || !phone) {
      return res.status(400).json({
        ok: false,
        error: 'Please provide your name, work email, and phone/WhatsApp number.',
      });
    }

    const state = loadB2BPortalState();
    const newEnquiry: B2BEnquiryRecord = {
      id: `enq_${Date.now()}`,
      agencyName: (agencyName || 'Real Estate Brokerage').trim(),
      contactName: contactName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      teamSize: (teamSize || '5-10 Agents').trim(),
      monthlyLeads: (monthlyLeads || '100-300 Leads/mo').trim(),
      message: (
        message || 'Interested in deploying the 24/7 AI Real Estate Workforce.'
      ).trim(),
      source: (source || 'Public Landing Page').trim(),
      status: 'NEW',
      createdAt: new Date().toISOString(),
    };

    const ownerEmail =
      state.settings.notificationEmail ||
      getSecretPlain('RESEND_FROM_EMAIL') ||
      getSecretPlain('BREVO_FROM_EMAIL') ||
      getSecretPlain('GMAIL_SMTP_USER') ||
      'khushi4762@gmail.com';

    let emailResultDetail = 'Saved to Admin Enquiries Hub';
    if (ownerEmail) {
      const alertResult = await dispatchInternalEmailNotification(
        ownerEmail,
        `🔥 New B2B Agency Enquiry: ${newEnquiry.agencyName} (${newEnquiry.contactName})`,
        `New Real Estate Automation Enquiry Received!\n\n` +
          `Agency Name: ${newEnquiry.agencyName}\n` +
          `Contact Name: ${newEnquiry.contactName}\n` +
          `Email: ${newEnquiry.email}\n` +
          `Phone / WhatsApp: ${newEnquiry.phone}\n` +
          `Team Size: ${newEnquiry.teamSize}\n` +
          `Monthly Lead Volume: ${newEnquiry.monthlyLeads}\n` +
          `Source: ${newEnquiry.source}\n\n` +
          `Requirements / Notes:\n${newEnquiry.message}\n\n` +
          `Next Step: Call the prospect, collect payment, and generate their Client License Key inside your Admin License & Enquiries Hub.`
      );
      emailResultDetail = alertResult.detail;
    }

    // Also send confirmation email to the prospect if Resend/Brevo is connected
    await dispatchInternalEmailNotification(
      newEnquiry.email,
      `We received your ${state.settings.brandName} Strategy Call Request`,
      `Hi ${newEnquiry.contactName},\n\n` +
        `Thank you for requesting a live strategy walkthrough of ${state.settings.brandName} for ${newEnquiry.agencyName}.\n\n` +
        `Our engineering & onboarding specialist will connect with you on call/WhatsApp (${newEnquiry.phone}) shortly to walk you through the AI Employees, connect your channels, and activate your dedicated Client License Key.\n\n` +
        `Best regards,\n${state.settings.brandName} Team`
    );

    newEnquiry.emailAlertStatus = emailResultDetail;
    state.enquiries = [newEnquiry, ...state.enquiries];
    saveB2BPortalState(state);

    // Also push into inboundWebsiteLeads so it automatically syncs into Leads DB & Live Bot Logs
    const syncedLead: InboundWebsiteLeadRecord = {
      id: `enq-lead-${newEnquiry.id}`,
      name: `${newEnquiry.contactName} (${newEnquiry.agencyName})`,
      email: newEnquiry.email,
      phone: newEnquiry.phone,
      source: newEnquiry.source || 'Landing Page Enquiry',
      budget: newEnquiry.monthlyLeads || 'B2B Agency',
      timeline: 'Immediate',
      propertyInterest: `${newEnquiry.agencyName} · ${newEnquiry.teamSize}`,
      qualificationScore: 95,
      status: 'AI Qualified',
      assignedEmployeeId: 'elena',
      notes: `Landing Page Enquiry: "${newEnquiry.message}" (${newEnquiry.teamSize}, ${newEnquiry.monthlyLeads})`,
      websiteDomain: newEnquiry.source || 'Public Landing Page',
      receivedAtIso: newEnquiry.createdAt,
    };
    inboundWebsiteLeads.unshift(syncedLead);

    res.json({
      ok: true,
      enquiry: newEnquiry,
      lead: syncedLead,
      emailAlertStatus: emailResultDetail,
      whatsappNumber: state.settings.whatsappNumber,
      calendlyUrl: state.settings.calendlyUrl,
      notificationEmail: ownerEmail,
    });
  });

  // Real Built-In Strategy Call Slot Booking (No Fake Calendly Link Needed!)
  app.post('/api/public/book-strategy-call', async (req, res) => {
    const {
      enquiryId,
      agencyName,
      contactName,
      email,
      phone,
      dateStr,
      timeSlot,
    } = req.body || {};

    if (!dateStr || !timeSlot) {
      return res.status(400).json({
        ok: false,
        error: 'Please select both a preferred date and time slot for your call.',
      });
    }

    const state = loadB2BPortalState();
    const slotLabel = `${dateStr} at ${timeSlot}`;

    // Update the enquiry status to CALL_SCHEDULED and append the booked slot
    state.enquiries = state.enquiries.map((e) =>
      e.id === enquiryId || (email && e.email.toLowerCase() === String(email).toLowerCase())
        ? {
            ...e,
            status: 'CALL_SCHEDULED',
            message: `${e.message} | 📅 Booked Strategy Call: ${slotLabel}`,
          }
        : e
    );
    saveB2BPortalState(state);

    const ownerEmail =
      state.settings.notificationEmail ||
      getSecretPlain('RESEND_FROM_EMAIL') ||
      getSecretPlain('BREVO_FROM_EMAIL') ||
      getSecretPlain('GMAIL_SMTP_USER') ||
      'khushi4762@gmail.com';

    await dispatchInternalEmailNotification(
      ownerEmail,
      `📅 Strategy Call Booked: ${agencyName || contactName} (${slotLabel})`,
      `A real estate brokerage prospect just booked a Strategy Call slot on your Landing Page!\n\n` +
        `Agency: ${agencyName || 'Brokerage'}\n` +
        `Contact: ${contactName}\n` +
        `Phone / WhatsApp: ${phone}\n` +
        `Email: ${email}\n` +
        `Booked Call Slot: ${slotLabel}\n\n` +
        `Open your Admin: License Keys & Website Enquiries tab to view their details and issue their License Key after the call.`
    );

    if (email && String(email).includes('@')) {
      await dispatchInternalEmailNotification(
        String(email),
        `Confirmed: Strategy Call for ${agencyName || contactName} (${slotLabel})`,
        `Hi ${contactName || 'there'},\n\n` +
          `Your onboarding & strategy call for ${state.settings.brandName} is confirmed for:\n` +
          `📅 Date & Time: ${slotLabel}\n` +
          `📞 Phone / WhatsApp we will reach you on: ${phone}\n\n` +
          `During this call, we will walk you through the platform, help connect your channels, and issue your Client License Key.\n\n` +
          `Best regards,\n${state.settings.brandName} Team (${ownerEmail})`
      );
    }

    res.json({
      ok: true,
      slotLabel,
      ownerEmail,
      whatsappNumber: state.settings.whatsappNumber,
    });
  });

  // Backend Workspace State Persistence (AI Employees, Human Agents, Properties, Leads, Reminders)
  app.get('/api/brokerage/workspace', (_req, res) => {
    const vault = loadVault() as any;
    res.json({
      ok: true,
      workspace: vault.brokerageWorkspace || null,
    });
  });

  app.post('/api/brokerage/workspace', (req, res) => {
    const { employees, humanAgents, properties, leads, reminders, scheduledMeetings } =
      req.body || {};
    const vault = loadVault() as any;
    vault.brokerageWorkspace = {
      ...(vault.brokerageWorkspace || {}),
      ...(Array.isArray(employees) ? { employees } : {}),
      ...(Array.isArray(humanAgents) ? { humanAgents } : {}),
      ...(Array.isArray(properties) ? { properties } : {}),
      ...(Array.isArray(leads) ? { leads } : {}),
      ...(Array.isArray(reminders) ? { reminders } : {}),
      ...(Array.isArray(scheduledMeetings) ? { scheduledMeetings } : {}),
      updatedAt: new Date().toISOString(),
    };
    saveVault(vault);
    res.json({
      ok: true,
      updatedAt: vault.brokerageWorkspace.updatedAt,
    });
  });

  function signSessionToken(payload: Record<string, any>): string {
    const dataStr = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = crypto
      .createHmac('sha256', VAULT_SECRET)
      .update(dataStr)
      .digest('base64url');
    return `${dataStr}.${sig}`;
  }

  function verifySessionToken(token: string): Record<string, any> | null {
    if (!token || !token.includes('.')) return null;
    const [dataStr, sig] = token.split('.');
    const expected = crypto
      .createHmac('sha256', VAULT_SECRET)
      .update(dataStr)
      .digest('base64url');
    if (sig !== expected) return null;
    try {
      return JSON.parse(Buffer.from(dataStr, 'base64url').toString('utf8'));
    } catch {
      return null;
    }
  }

  function buildIcsCalendarInvite(params: {
    uid: string;
    summary: string;
    description: string;
    location: string;
    startIso: string;
    endIso: string;
    organizerName: string;
    organizerEmail: string;
    agentName: string;
    agentEmail: string;
    leadName: string;
    leadEmail: string;
  }): string {
    const toIcsDate = (iso: string) =>
      new Date(iso)
        .toISOString()
        .replace(/[-:]/g, '')
        .replace(/\.\d{3}/, '');
    const nowStamp = toIcsDate(new Date().toISOString());
    const startStamp = toIcsDate(params.startIso);
    const endStamp = toIcsDate(params.endIso);
    const cleanDesc = (params.description || '')
      .replace(/\r?\n/g, '\\n')
      .replace(/,/g, '\\,');

    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Atelier Estate Brokerage OS//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:REQUEST',
      'BEGIN:VEVENT',
      `UID:${params.uid}`,
      `DTSTAMP:${nowStamp}`,
      `DTSTART:${startStamp}`,
      `DTEND:${endStamp}`,
      `SUMMARY:${params.summary}`,
      `DESCRIPTION:${cleanDesc}`,
      `LOCATION:${params.location}`,
      `ORGANIZER;CN="${params.organizerName}":mailto:${params.organizerEmail}`,
      ...(params.agentEmail
        ? [
            `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE;CN="${params.agentName}":mailto:${params.agentEmail}`,
          ]
        : []),
      ...(params.leadEmail
        ? [
            `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE;CN="${params.leadName}":mailto:${params.leadEmail}`,
          ]
        : []),
      'STATUS:CONFIRMED',
      'SEQUENCE:0',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
  }

  // Owner-Centric Human Agent Showing & Calendar Invite Dispatcher (No Employee Login Needed!)
  app.post('/api/calendar/book-agent-meeting', async (req, res) => {
    const {
      title,
      description,
      propertyTitle,
      startIso,
      endIso,
      durationMinutes,
      agentId,
      agentName,
      agentEmail,
      agentPhone,
      agentBookingUrl,
      leadId,
      leadName,
      leadEmail,
    } = req.body || {};

    if (!startIso || !agentName) {
      return res.status(400).json({
        ok: false,
        error: 'Meeting start time and assigned human agent are required.',
      });
    }

    const computedEndIso =
      endIso ||
      new Date(
        new Date(startIso).getTime() + (Number(durationMinutes) || 45) * 60000
      ).toISOString();

    const uid = `showing-${Date.now()}@atelierestate.ai`;
    const organizerEmail =
      getSecretPlain('RESEND_FROM_EMAIL') ||
      getSecretPlain('BREVO_FROM_EMAIL') ||
      getSecretPlain('GMAIL_SMTP_USER') ||
      'bookings@atelierestate.ai';

    const icsContent = buildIcsCalendarInvite({
      uid,
      summary: title || `Property Showing: ${propertyTitle || 'Luxury Listing'}`,
      description:
        description ||
        `Assigned Agent: ${agentName} (${agentEmail || ''})\nBuyer: ${
          leadName || ''
        } (${leadEmail || ''})`,
      location: propertyTitle || 'Brokerage Property Showing',
      startIso,
      endIso: computedEndIso,
      organizerName: 'Atelier Estate Booking Desk',
      organizerEmail,
      agentName: agentName || 'Assigned Agent',
      agentEmail: agentEmail || '',
      leadName: leadName || 'Valued Buyer',
      leadEmail: leadEmail || '',
    });

    const formattedSlot = new Date(startIso).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    // Generate universal 1-click "Add to Google Calendar" URL for both the Human Agent & Buyer
    const toGCalDates = (s: string, e: string) => {
      const fmt = (iso: string) =>
        new Date(iso)
          .toISOString()
          .replace(/[-:]/g, '')
          .replace(/\.\d{3}/, '');
      return `${fmt(s)}/${fmt(e)}`;
    };
    const gcalTemplateLink = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      title || `Property Showing: ${propertyTitle}`
    )}&dates=${toGCalDates(startIso, computedEndIso)}&details=${encodeURIComponent(
      `${description || ''}\nAssigned Agent: ${agentName} (${agentEmail})\nBuyer: ${leadName} (${leadEmail})`
    )}&location=${encodeURIComponent(propertyTitle || '')}`;

    const dispatchedTo: string[] = [];

    // 1. Send Calendar Assignment & .ics Invite to the Human Agent's Email (Owner doesn't need employee login!)
    if (agentEmail && agentEmail.includes('@')) {
      const agentMailRes = await dispatchInternalEmailNotification(
        agentEmail,
        `📅 New Showing Assigned to You: ${
          propertyTitle || title
        } (${formattedSlot})`,
        `Hi ${agentName},\n\n` +
          `The brokerage desk has assigned a confirmed property showing to you:\n\n` +
          `• Property: ${propertyTitle || title}\n` +
          `• Date & Time: ${formattedSlot} (${durationMinutes || 45} mins)\n` +
          `• Buyer / Client: ${leadName || 'Client'} (${leadEmail || 'N/A'})\n` +
          `• Briefing Notes: ${description || 'Qualified buyer tour.'}\n\n` +
          `👉 Click here to add this showing to your Google/Phone Calendar in 1 click:\n${gcalTemplateLink}\n\n` +
          (agentBookingUrl
            ? `Your Booking Link on file: ${agentBookingUrl}\n\n`
            : '') +
          `— Atelier Estate Brokerage Desk`
      );
      if (agentMailRes.ok) {
        dispatchedTo.push(`Agent Email (${agentEmail})`);
      }
    }

    // 2. Send Calendar Confirmation to the Buyer Lead's Email
    if (leadEmail && leadEmail.includes('@')) {
      const buyerMailRes = await dispatchInternalEmailNotification(
        leadEmail,
        `📅 Confirmed Property Viewing: ${
          propertyTitle || title
        } with ${agentName}`,
        `Hi ${leadName || 'there'},\n\n` +
          `Your private property viewing has been scheduled:\n\n` +
          `• Property: ${propertyTitle || title}\n` +
          `• Date & Time: ${formattedSlot} (${durationMinutes || 45} mins)\n` +
          `• Your Senior Agent: ${agentName} (${agentEmail || ''}${
            agentPhone ? ` · ${agentPhone}` : ''
          })\n\n` +
          `👉 Add this viewing to your Calendar:\n${gcalTemplateLink}\n\n` +
          `Best regards,\nAtelier Estate`
      );
      if (buyerMailRes.ok) {
        dispatchedTo.push(`Buyer Email (${leadEmail})`);
      }
    }

    const meetingRecord = {
      id: `mtg-${Date.now()}`,
      title: title || `Showing: ${propertyTitle}`,
      startIso,
      endIso: computedEndIso,
      durationMinutes: Number(durationMinutes) || 45,
      agentId: agentId || 'agent-1',
      agentName,
      agentEmail: agentEmail || '',
      calendarId: agentEmail || 'brokerage-master',
      leadId,
      leadName: leadName || 'Buyer',
      leadEmail: leadEmail || '',
      propertyTitle: propertyTitle || 'Luxury Listing',
      source:
        dispatchedTo.length > 0
          ? `Dispatched Invite (${dispatchedTo.join(' & ')})`
          : 'Brokerage Master Schedule',
      htmlLink: gcalTemplateLink,
      icsContent,
    };

    const vault = loadVault() as any;
    vault.scheduledMeetings = [
      meetingRecord,
      ...(Array.isArray(vault.scheduledMeetings) ? vault.scheduledMeetings : []),
    ];
    saveVault(vault);

    return res.json({
      ok: true,
      meeting: meetingRecord,
      htmlLink: gcalTemplateLink,
      dispatchedSummary:
        dispatchedTo.length > 0
          ? `Calendar invite emailed directly to ${dispatchedTo.join(' & ')}`
          : 'Logged on Brokerage Master Schedule & generated 1-click Calendar Invite link (Connect Resend or Brevo in Email settings to auto-email invites to agents)',
    });
  });

  app.post('/api/auth/verify-license', (req, res) => {
    const { licenseKey, email } = req.body || {};
    const cleanKey = String(licenseKey || '').trim();
    const cleanEmail = String(email || '')
      .trim()
      .toLowerCase();

    if (!cleanKey) {
      return res.status(400).json({
        ok: false,
        error: 'Please enter your License Key or Admin Access Key.',
      });
    }

    const state = loadB2BPortalState();

    // 1. Check Master Admin Key
    if (cleanKey === state.masterAdminKey) {
      const sessionPayload = {
        role: 'ADMIN' as const,
        agencyName: `${state.settings.brandName} (Admin)`,
        clientName: 'Brokerage Owner',
        clientEmail: cleanEmail || state.settings.notificationEmail,
        licenseKey: cleanKey,
        planTier: 'Enterprise',
        issuedAt: Date.now(),
      };
      return res.json({
        ok: true,
        role: 'ADMIN',
        token: signSessionToken(sessionPayload),
        session: sessionPayload,
      });
    }

    // 2. Check Client Licenses
    const matched = state.licenses.find(
      (lic) => lic.licenseKey.toUpperCase() === cleanKey.toUpperCase()
    );

    if (!matched) {
      return res.status(401).json({
        ok: false,
        error:
          'Invalid License Key. Book a strategy call and complete payment to receive your activation key.',
      });
    }

    if (matched.status !== 'ACTIVE') {
      return res.status(403).json({
        ok: false,
        error:
          'This License Key has been suspended by the administrator. Please contact support.',
      });
    }

    if (
      matched.expiresAt &&
      new Date(matched.expiresAt).getTime() < Date.now()
    ) {
      return res.status(403).json({
        ok: false,
        error: 'This License Key has expired. Please renew your subscription.',
      });
    }

    if (
      cleanEmail &&
      matched.clientEmail &&
      matched.clientEmail.toLowerCase() !== cleanEmail
    ) {
      return res.status(401).json({
        ok: false,
        error:
          'This License Key is bound to a different registered agency email address.',
      });
    }

    matched.lastLoginAt = new Date().toISOString();
    saveB2BPortalState(state);

    const sessionPayload = {
      role: 'CLIENT' as const,
      agencyName: matched.agencyName,
      clientName: matched.clientName,
      clientEmail: matched.clientEmail,
      licenseKey: matched.licenseKey,
      planTier: matched.planTier,
      issuedAt: Date.now(),
    };

    return res.json({
      ok: true,
      role: 'CLIENT',
      token: signSessionToken(sessionPayload),
      session: sessionPayload,
    });
  });

  app.post('/api/auth/verify-session', (req, res) => {
    const { token } = req.body || {};
    const payload = verifySessionToken(String(token || ''));
    if (!payload) {
      return res.status(401).json({ ok: false, error: 'Invalid session token' });
    }
    const state = loadB2BPortalState();
    if (payload.role === 'ADMIN') {
      if (payload.licenseKey !== state.masterAdminKey) {
        return res.status(401).json({ ok: false, error: 'Admin key changed' });
      }
      return res.json({ ok: true, session: payload });
    }
    const matched = state.licenses.find(
      (l) => l.licenseKey.toUpperCase() === String(payload.licenseKey || '').toUpperCase()
    );
    if (!matched || matched.status !== 'ACTIVE') {
      return res.status(403).json({ ok: false, error: 'License suspended or revoked' });
    }
    return res.json({ ok: true, session: payload });
  });

  app.get('/api/admin/portal-data', (_req, res) => {
    const state = loadB2BPortalState();
    res.json({
      ok: true,
      masterAdminKey: state.masterAdminKey,
      settings: state.settings,
      licenses: state.licenses,
      enquiries: state.enquiries,
    });
  });

  app.post('/api/admin/settings', (req, res) => {
    const { settings, masterAdminKey } = req.body || {};
    const state = loadB2BPortalState();
    if (settings && typeof settings === 'object') {
      state.settings = {
        ...state.settings,
        ...settings,
      };
    }
    if (masterAdminKey && String(masterAdminKey).trim().length >= 4) {
      state.masterAdminKey = String(masterAdminKey).trim();
    }
    saveB2BPortalState(state);
    res.json({
      ok: true,
      masterAdminKey: state.masterAdminKey,
      settings: state.settings,
    });
  });

  app.post('/api/admin/licenses/create', async (req, res) => {
    const {
      agencyName,
      clientName,
      clientEmail,
      planTier,
      billingCycle,
      notes,
      enquiryId,
      sendEmailToClient,
    } = req.body || {};

    if (!agencyName || !clientEmail) {
      return res.status(400).json({
        ok: false,
        error: 'Agency Name and Client Email are required to generate a license key.',
      });
    }

    const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
    const randomPart2 = Math.floor(1000 + Math.random() * 9000);
    const tierPrefix =
      planTier === 'Enterprise'
        ? 'ENT'
        : planTier === 'Starter'
        ? 'STR'
        : 'PRO';
    const generatedKey = `ESTATE-${tierPrefix}-${randomPart2}-${randomHex}`;

    const daysValid =
      billingCycle === 'Lifetime'
        ? 3650
        : billingCycle === 'Annual'
        ? 365
        : 30;

    const newLicense: B2BClientLicense = {
      id: `lic_${Date.now()}`,
      agencyName: String(agencyName).trim(),
      clientName: String(clientName || agencyName).trim(),
      clientEmail: String(clientEmail).trim(),
      licenseKey: generatedKey,
      planTier: planTier || 'Growth',
      billingCycle: billingCycle || 'Monthly',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86400000 * daysValid).toISOString(),
      notes: String(notes || 'Payment verified on call.').trim(),
    };

    const state = loadB2BPortalState();
    state.licenses = [newLicense, ...state.licenses];

    if (enquiryId) {
      state.enquiries = state.enquiries.map((enq) =>
        enq.id === enquiryId
          ? {
              ...enq,
              status: 'PAID_UNLOCKED',
              issuedLicenseKey: generatedKey,
            }
          : enq
      );
    }

    saveB2BPortalState(state);

    let emailDeliveryNote = '';
    if (sendEmailToClient !== false && newLicense.clientEmail.includes('@')) {
      const dispatchRes = await dispatchInternalEmailNotification(
        newLicense.clientEmail,
        `Your ${state.settings.brandName} License Key & Portal Access (${newLicense.agencyName})`,
        `Welcome to ${state.settings.brandName}, ${newLicense.clientName}!\n\n` +
          `Your payment and onboarding setup for ${newLicense.agencyName} (${newLicense.planTier} - ${newLicense.billingCycle}) have been verified.\n\n` +
          `=========================================\n` +
          `CLIENT EMAIL: ${newLicense.clientEmail}\n` +
          `LICENSE KEY:  ${newLicense.licenseKey}\n` +
          `=========================================\n\n` +
          `How to Sign In:\n` +
          `1. Open the portal and click "Client Sign In".\n` +
          `2. Enter your Client Email and License Key above.\n` +
          `3. Connect your email, website webhook, and add your human agents' contact details.\n\n` +
          `Welcome aboard,\n${state.settings.brandName} Team`
      );
      emailDeliveryNote = dispatchRes.detail;
    }

    res.json({
      ok: true,
      license: newLicense,
      licenses: state.licenses,
      enquiries: state.enquiries,
      emailDeliveryNote,
    });
  });

  app.post('/api/admin/licenses/toggle', (req, res) => {
    const { licenseId, action } = req.body || {};
    const state = loadB2BPortalState();

    if (action === 'DELETE') {
      state.licenses = state.licenses.filter((l) => l.id !== licenseId);
    } else {
      state.licenses = state.licenses.map((l) =>
        l.id === licenseId
          ? {
              ...l,
              status: l.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
            }
          : l
      );
    }
    saveB2BPortalState(state);
    res.json({
      ok: true,
      licenses: state.licenses,
    });
  });

  app.post('/api/admin/enquiries/status', (req, res) => {
    const { enquiryId, status } = req.body || {};
    const state = loadB2BPortalState();
    state.enquiries = state.enquiries.map((e) =>
      e.id === enquiryId ? { ...e, status } : e
    );
    saveB2BPortalState(state);
    res.json({
      ok: true,
      enquiries: state.enquiries,
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vitePromise = createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(async (req, res, next) => {
      try {
        const vite = await vitePromise;
        vite.middlewares(req, res, next);
      } catch (err) {
        next(err);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Atelier Estate server running on http://localhost:${PORT}`);
  });
}

startServer();
