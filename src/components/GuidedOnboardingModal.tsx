import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  CheckCircle2,
  KeyRound,
  Cpu,
  Mail,
  Calendar,
  Phone,
  MessageSquare,
  Instagram,
  Share2,
  MapPin,
  Trash2,
  ShieldCheck,
  Loader2,
  Eye,
  EyeOff,
  RefreshCw,
  AlertCircle,
  Send,
  Globe,
  Copy,
  Check,
  PlusCircle,
  Layers,
} from 'lucide-react';
import {
  ToolConnection,
  ToolId,
  ConnectedAppAccount,
} from '../types/brokerage';
import { sendGmailMessage } from '../services/googleWorkspace';

export type LlmProviderId =
  | 'openai'
  | 'anthropic'
  | 'xai'
  | 'groq'
  | 'deepseek'
  | 'glm'
  | 'gemini'
  | 'custom';

export interface LlmProviderSettings {
  provider: LlmProviderId;
  model: string;
  apiKey: string;
  baseUrl?: string;
}

export const LLM_PROVIDER_CATALOG: {
  id: LlmProviderId;
  name: string;
  badge: string;
  keyPlaceholder: string;
  defaultModel: string;
  baseUrlPlaceholder?: string;
  helpText: string;
}[] = [
  {
    id: 'openai',
    name: 'ChatGPT (OpenAI)',
    badge: 'Auto-Fetched Models',
    keyPlaceholder: 'Paste OpenAI Key (sk-proj-...)',
    defaultModel: 'gpt-4o-mini',
    helpText: 'Get your API key from platform.openai.com/api-keys',
  },
  {
    id: 'anthropic',
    name: 'Claude (Anthropic)',
    badge: 'Auto-Fetched Models',
    keyPlaceholder: 'Paste Anthropic Key (sk-ant-...)',
    defaultModel: 'claude-3-7-sonnet-latest',
    helpText: 'Get your API key from console.anthropic.com/settings/keys',
  },
  {
    id: 'xai',
    name: 'Grok (xAI)',
    badge: 'Auto-Fetched Models',
    keyPlaceholder: 'Paste xAI Grok Key (xai-...)',
    defaultModel: 'grok-2-latest',
    helpText: 'Get your Grok API key from console.x.ai',
  },
  {
    id: 'groq',
    name: 'Groq (Ultra-Fast)',
    badge: 'Auto-Fetched Models',
    keyPlaceholder: 'Paste Groq Key (gsk_...)',
    defaultModel: 'llama-3.3-70b-versatile',
    helpText: 'Get your Groq API key from console.groq.com/keys',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    badge: 'Auto-Fetched Models',
    keyPlaceholder: 'Paste DeepSeek Key (sk-...)',
    defaultModel: 'deepseek-chat',
    helpText: 'Get your DeepSeek API key from platform.deepseek.com/api_keys',
  },
  {
    id: 'glm',
    name: 'GLM (Zhipu AI)',
    badge: 'Auto-Fetched Models',
    keyPlaceholder: 'Paste GLM API Key',
    defaultModel: 'glm-4-flash',
    helpText: 'Get your GLM API key from open.bigmodel.cn',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    badge: 'Auto-Fetched Models',
    keyPlaceholder: 'Paste Gemini API Key (AIzaSy...)',
    defaultModel: 'gemini-2.5-flash',
    helpText: 'Get your Gemini key from aistudio.google.com/apikey',
  },
  {
    id: 'custom',
    name: 'Other Provider (OpenRouter / Custom)',
    badge: 'Any OpenAI URL',
    keyPlaceholder: 'Paste Provider API Key (sk-or-...)',
    defaultModel: 'openai/gpt-4o-mini',
    baseUrlPlaceholder: 'https://openrouter.ai/api/v1',
    helpText:
      'Works with OpenRouter, Together AI, Fireworks, Perplexity, Mistral, or local Ollama.',
  },
];

interface GuidedOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialChannel?: ToolId | 'llm_engine';
  tools: ToolConnection[];
  googleAccountEmail: string | null;
  googleAccessToken: string | null;
  llmSettings: LlmProviderSettings;
  onUpdateLlmSettings: (settings: LlmProviderSettings) => Promise<void>;
  onConnectGoogleWorkspace: (directOAuthToken?: string) => Promise<void>;
  onConnectGmailSmtp: (email: string, appPassword: string) => Promise<void>;
  onSaveChannelConfig: (
    toolId: ToolId,
    updates: {
      accountHandle: string;
      webhookUrl: string;
      secrets: Record<string, string>;
    }
  ) => Promise<any>;
  onDisconnectChannel: (toolId: ToolId, secretKeys: string[]) => Promise<void>;
  onManageChannelAccounts?: (
    toolId: ToolId,
    action: 'set_primary' | 'remove_account',
    accountId: string
  ) => Promise<void>;
  onWebsiteLeadReceived?: (lead: any) => void;
}

interface ChannelFormDefinition {
  id: ToolId;
  name: string;
  subtitle: string;
  type: 'google_oauth' | 'api_key';
  handleLabel?: string;
  handlePlaceholder?: string;
  webhookPlaceholder?: string;
  secretFields: {
    keyName: string;
    label: string;
    placeholder: string;
  }[];
  simpleHint: string;
}

const CHANNEL_DEFS: ChannelFormDefinition[] = [
  {
    id: 'website_leads',
    name: 'Agency Website Leads (Direct Webhook & Form Capture)',
    subtitle:
      'Receive buyer & seller leads directly from your client’s real estate agency website into the CRM',
    type: 'api_key',
    handleLabel: 'Real Estate Agency Website URL / Domain',
    handlePlaceholder: 'https://www.luxuryestateagency.com',
    webhookPlaceholder:
      'Optional outbound forward webhook URL (e.g. Zapier / Make)',
    secretFields: [
      {
        keyName: 'WEBSITE_WEBHOOK_SECRET',
        label: 'Website Webhook Secret Key (Optional header X-Webhook-Secret)',
        placeholder: 'whsec_agency_2025...',
      },
    ],
    simpleHint:
      'Connect one or multiple real estate agency websites. Any contact form or property inquiry submitted on the agency website is sent to POST /api/webhooks/website-leads and immediately added to your Leads & Clients DB and Bot Activity Logs.',
  },
  {
    id: 'gmail',
    name: 'Gmail (Multi-Account OAuth 2.0 & App Password SMTP)',
    subtitle:
      'Send real emails from one or multiple Gmail accounts (e.g. brokerage inbox + individual agent inboxes)',
    type: 'google_oauth',
    secretFields: [],
    simpleHint:
      'Connect via Google OAuth 2.0 Popup OR enter any Gmail address + 16-character Google App Password (from myaccount.google.com/apppasswords). You can add multiple Gmail accounts and switch active accounts anytime!',
  },
  {
    id: 'google_calendar',
    name: 'Google Calendar (Brokerage & Human Agent Calendars)',
    subtitle:
      'Book real property tours & sync scheduled meetings directly with human agents’ Google Calendars',
    type: 'google_oauth',
    secretFields: [],
    simpleHint:
      'Sign in with Google OAuth 2.0 (or paste a ya29... OAuth token) to create real events on your primary Google Calendar and invite human agents directly.',
  },
  {
    id: 'telnyx',
    name: 'Telnyx Voice & SMS (Multi-Number Support)',
    subtitle: 'Verified Telnyx V2 SMS & telephony API',
    type: 'api_key',
    handleLabel: 'Your Telnyx Phone Number (E.164)',
    handlePlaceholder: '+13105550199',
    webhookPlaceholder: 'https://your-webhook.com/telnyx (Optional)',
    secretFields: [
      {
        keyName: 'TELNYX_API_KEY',
        label: 'Telnyx API v2 Key (Verified live against api.telnyx.com)',
        placeholder: 'KEY018...',
      },
      {
        keyName: 'TELNYX_FROM_NUMBER',
        label: 'Telnyx Outbound Caller Number',
        placeholder: '+13105550199',
      },
    ],
    simpleHint:
      'We verify your Telnyx V2 API key live against https://api.telnyx.com/v2/balance. You can add multiple Telnyx numbers/accounts and switch between them.',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Business Cloud API (Multi-Account)',
    subtitle: 'Verified Meta WhatsApp Cloud API integration',
    type: 'api_key',
    handleLabel: 'WhatsApp Business Number / Label',
    handlePlaceholder: '+13105550199 (Beverly Hills Desk)',
    webhookPlaceholder: 'https://your-webhook.com/whatsapp (Optional)',
    secretFields: [
      {
        keyName: 'WHATSAPP_ACCESS_TOKEN',
        label:
          'Meta WhatsApp Access Token (Verified against graph.facebook.com)',
        placeholder: 'EAAG...',
      },
      {
        keyName: 'WHATSAPP_PHONE_NUMBER_ID',
        label: 'WhatsApp Phone Number ID',
        placeholder: '104928192041',
      },
    ],
    simpleHint:
      'We verify your token & Phone Number ID live against https://graph.facebook.com/v19.0/{Phone-Number-ID}. Add multiple WhatsApp numbers for different offices or agents.',
  },
  {
    id: 'instagram',
    name: 'Instagram Graph API (Multi-Account)',
    subtitle: 'Verified Meta Instagram Graph API integration',
    type: 'api_key',
    handleLabel: 'Instagram Handle',
    handlePlaceholder: '@yourbrokerage',
    webhookPlaceholder: 'https://your-webhook.com/instagram (Optional)',
    secretFields: [
      {
        keyName: 'INSTAGRAM_ACCESS_TOKEN',
        label: 'Instagram Graph Access Token (Verified live)',
        placeholder: 'IGQ... or EAAG...',
      },
    ],
    simpleHint:
      'We verify your Instagram Graph token live against Meta Graph API. You can connect multiple Instagram accounts (e.g. main agency + luxury division).',
  },
  {
    id: 'facebook',
    name: 'Facebook Lead Ads (Multi-Page)',
    subtitle: 'Verified Facebook Page Graph API integration',
    type: 'api_key',
    handleLabel: 'Facebook Page Name',
    handlePlaceholder: 'Your Real Estate Page',
    webhookPlaceholder: 'https://your-webhook.com/facebook (Optional)',
    secretFields: [
      {
        keyName: 'FACEBOOK_PAGE_ACCESS_TOKEN',
        label: 'Facebook Page Access Token (Verified live)',
        placeholder: 'EAAG...',
      },
    ],
    simpleHint:
      'We verify your Facebook Page token live against https://graph.facebook.com/v19.0/me. Connect multiple Facebook Pages and switch active pages anytime.',
  },
  {
    id: 'google_maps',
    name: 'Google Maps Grounding API',
    subtitle: 'Live neighborhood comps, schools, and location intelligence',
    type: 'api_key',
    handleLabel: 'Default Brokerage Market / City',
    handlePlaceholder: 'Beverly Hills, CA',
    secretFields: [
      {
        keyName: 'GOOGLE_MAPS_API_KEY',
        label: 'Google Gemini / Maps API Key (AIza...)',
        placeholder: 'AIzaSy...',
      },
    ],
    simpleHint:
      'Paste your Google API Key (AIza...) to verify & enable live Google Maps neighborhood grounding.',
  },
];

export const GuidedOnboardingModal: React.FC<GuidedOnboardingModalProps> = ({
  isOpen,
  onClose,
  initialChannel = 'llm_engine',
  tools,
  googleAccountEmail,
  googleAccessToken,
  llmSettings,
  onUpdateLlmSettings,
  onConnectGoogleWorkspace,
  onConnectGmailSmtp,
  onSaveChannelConfig,
  onDisconnectChannel,
  onManageChannelAccounts,
  onWebsiteLeadReceived,
}) => {
  const [selectedId, setSelectedId] = useState<ToolId | 'llm_engine'>(
    initialChannel
  );

  // BYOK LLM State
  const [providerChoice, setProviderChoice] = useState<LlmProviderId>(
    llmSettings.provider
  );
  const [modelChoice, setModelChoice] = useState<string>(llmSettings.model);
  const [apiKeyInput, setApiKeyInput] = useState<string>(llmSettings.apiKey);
  const [baseUrlInput, setBaseUrlInput] = useState<string>(
    llmSettings.baseUrl || ''
  );
  const [showLlmKey, setShowLlmKey] = useState(false);

  // Live Fetched Models State
  const [fetchedModels, setFetchedModels] = useState<string[]>([]);
  const [detectingModels, setDetectingModels] = useState(false);
  const [detectionBanner, setDetectionBanner] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // Channel Form State
  const [accountHandle, setAccountHandle] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [secretInputs, setSecretInputs] = useState<Record<string, string>>({});
  const [vaultStatus, setVaultStatus] = useState<
    Record<string, { configured: boolean; masked: string }>
  >({});
  const [channelAccountsMap, setChannelAccountsMap] = useState<
    Record<string, ConnectedAppAccount[]>
  >({});

  // Real Gmail SMTP & Direct OAuth Token State
  const [smtpEmailInput, setSmtpEmailInput] = useState('');
  const [smtpAppPasswordInput, setSmtpAppPasswordInput] = useState('');
  const [directOAuthTokenInput, setDirectOAuthTokenInput] = useState('');
  const [testEmailRecipient, setTestEmailRecipient] = useState('');
  const [sendingTestEmail, setSendingTestEmail] = useState(false);

  // Website Lead Live Test State
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [testLeadName, setTestLeadName] = useState('Julianna Sterling-Vance');
  const [testLeadEmail, setTestLeadEmail] = useState(
    'j.sterling@pacificfamilyoffice.com'
  );
  const [testLeadPhone, setTestLeadPhone] = useState('+1 (310) 774-9201');
  const [testLeadBudget, setTestLeadBudget] = useState('$14,850,000');
  const [testLeadProperty, setTestLeadProperty] = useState(
    'Villa Solaris Promontory'
  );
  const [sendingWebsiteTest, setSendingWebsiteTest] = useState(false);

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen && initialChannel) {
      setSelectedId(initialChannel);
    }
  }, [isOpen, initialChannel]);

  useEffect(() => {
    setProviderChoice(llmSettings.provider);
    setModelChoice(llmSettings.model);
    setApiKeyInput(llmSettings.apiKey || '');
    setBaseUrlInput(llmSettings.baseUrl || '');
  }, [llmSettings]);

  const refreshVaultStatus = useCallback(async () => {
    try {
      const resp = await fetch('/api/vault/status');
      const data = await resp.json();
      if (data.entries) setVaultStatus(data.entries);
      if (data.configs) {
        const nextMap: Record<string, ConnectedAppAccount[]> = {};
        for (const [k, cfg] of Object.entries<any>(data.configs)) {
          if (Array.isArray(cfg?.accounts)) {
            nextMap[k] = cfg.accounts;
          }
        }
        setChannelAccountsMap(nextMap);
      }
      return data;
    } catch {
      return null;
    }
  }, []);

  const discoverModelsForKey = useCallback(
    async (
      keyToTest: string,
      prefProvider?: LlmProviderId,
      customBase?: string,
      preserveCurrentModel?: boolean
    ) => {
      const cleanKey = keyToTest.trim();
      if (cleanKey.length < 8) {
        setFetchedModels([]);
        setDetectionBanner(null);
        return;
      }

      setDetectingModels(true);
      setDetectionBanner({
        type: 'info',
        text: 'Detecting API key provider and fetching live accessible models...',
      });

      try {
        const resp = await fetch('/api/ai/discover-models', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey: cleanKey,
            preferredProvider: prefProvider || providerChoice,
            customBaseUrl: customBase ?? baseUrlInput,
          }),
        });
        const data = await resp.json();

        if (!resp.ok || !data.ok) {
          setFetchedModels([]);
          setDetectionBanner({
            type: 'error',
            text:
              data.error ||
              'Could not verify this API key or fetch models from provider.',
          });
          return;
        }

        const liveModels: string[] = Array.isArray(data.models)
          ? data.models
          : [];
        setFetchedModels(liveModels);

        if (data.detectedProvider) {
          setProviderChoice(data.detectedProvider as LlmProviderId);
        }
        if (data.resolvedBaseUrl) {
          setBaseUrlInput(data.resolvedBaseUrl);
        }

        if (liveModels.length > 0) {
          setModelChoice((prevModel) => {
            if (preserveCurrentModel && liveModels.includes(prevModel)) {
              return prevModel;
            }
            return data.recommendedModel || liveModels[0];
          });
        }

        setDetectionBanner({
          type: 'success',
          text: `Detected ${data.providerName}! Fetched ${liveModels.length} live models directly from your API key.`,
        });
      } catch (err: any) {
        setDetectionBanner({
          type: 'error',
          text: err?.message || 'Error connecting to model discovery endpoint.',
        });
      } finally {
        setDetectingModels(false);
      }
    },
    [providerChoice, baseUrlInput]
  );

  useEffect(() => {
    if (!isOpen) return;
    refreshVaultStatus().then((data) => {
      if (
        llmSettings.apiKey?.trim() ||
        data?.entries?.CUSTOM_LLM_API_KEY?.configured
      ) {
        discoverModelsForKey(
          llmSettings.apiKey || '',
          llmSettings.provider,
          llmSettings.baseUrl,
          true
        );
      }
    });
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || selectedId !== 'llm_engine') return;
    const trimmed = apiKeyInput.trim();
    if (trimmed.length < 10) {
      return;
    }
    const timer = setTimeout(() => {
      discoverModelsForKey(trimmed, providerChoice, baseUrlInput, false);
    }, 450);
    return () => clearTimeout(timer);
  }, [apiKeyInput, baseUrlInput]);

  useEffect(() => {
    if (selectedId === 'llm_engine') {
      setFeedback(null);
      return;
    }
    const tool = tools.find((t) => t.id === selectedId);
    setAccountHandle(tool?.accountHandle || '');
    setWebhookUrl(tool?.webhookUrl || '');
    setSecretInputs({});
    setFeedback(null);
  }, [selectedId, tools]);

  if (!isOpen) return null;

  const activeProviderMeta =
    LLM_PROVIDER_CATALOG.find((p) => p.id === providerChoice) ||
    LLM_PROVIDER_CATALOG[0];
  const activeDef =
    CHANNEL_DEFS.find((c) => c.id === selectedId) || CHANNEL_DEFS[0];
  const activeTool = tools.find((t) => t.id === selectedId);
  const currentChannelAccounts: ConnectedAppAccount[] =
    (selectedId !== 'llm_engine' &&
      (channelAccountsMap[selectedId] || activeTool?.accounts)) ||
    [];

  const getIcon = (id: ToolId) => {
    switch (id) {
      case 'website_leads':
        return <Globe className="w-4 h-4" />;
      case 'gmail':
        return <Mail className="w-4 h-4" />;
      case 'google_calendar':
        return <Calendar className="w-4 h-4" />;
      case 'telnyx':
        return <Phone className="w-4 h-4" />;
      case 'whatsapp':
        return <MessageSquare className="w-4 h-4" />;
      case 'instagram':
        return <Instagram className="w-4 h-4" />;
      case 'facebook':
        return <Share2 className="w-4 h-4" />;
      case 'google_maps':
        return <MapPin className="w-4 h-4" />;
    }
  };

  const handleSaveLlmKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const chosenModel =
        modelChoice.trim() ||
        fetchedModels[0] ||
        activeProviderMeta.defaultModel;
      await onUpdateLlmSettings({
        provider: providerChoice,
        model: chosenModel,
        apiKey: apiKeyInput.trim(),
        baseUrl: baseUrlInput.trim(),
      });
      await refreshVaultStatus();
      setFeedback({
        type: 'success',
        text: `Saved! All AI Employees are now running on ${activeProviderMeta.name} using live model "${chosenModel}".`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Failed to save LLM API Key.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleClearLlmKey = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      setApiKeyInput('');
      setFetchedModels([]);
      setDetectionBanner(null);
      await onUpdateLlmSettings({
        provider: providerChoice,
        model: '',
        apiKey: '',
        baseUrl: '',
      });
      await fetch('/api/vault/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyNames: ['CUSTOM_LLM_API_KEY'] }),
      });
      await refreshVaultStatus();
      setFeedback({
        type: 'success',
        text: 'Cleared custom LLM API Key.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedId === 'llm_engine') return;
    setSaving(true);
    setFeedback(null);
    try {
      const result = await onSaveChannelConfig(selectedId, {
        accountHandle: accountHandle.trim(),
        webhookUrl: webhookUrl.trim(),
        secrets: secretInputs,
      });
      await refreshVaultStatus();
      setSecretInputs({});
      setFeedback({
        type: 'success',
        text:
          result?.verificationMessage ||
          'Verified live against provider API and added account!',
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Live API verification failed.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleClearChannel = async () => {
    if (selectedId === 'llm_engine') return;
    setSaving(true);
    setFeedback(null);
    try {
      await onDisconnectChannel(
        selectedId,
        activeDef.secretFields.map((s) => s.keyName)
      );
      await refreshVaultStatus();
      setAccountHandle('');
      setWebhookUrl('');
      setSecretInputs({});
      setFeedback({
        type: 'success',
        text: 'Disconnected channel and cleared stored credentials.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSwitchOrRemoveAccount = async (
    action: 'set_primary' | 'remove_account',
    accountId: string
  ) => {
    if (selectedId === 'llm_engine') return;
    setSaving(true);
    setFeedback(null);
    try {
      if (onManageChannelAccounts) {
        await onManageChannelAccounts(selectedId, action, accountId);
      } else {
        await fetch('/api/channels/accounts/manage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ toolId: selectedId, action, accountId }),
        });
      }
      await refreshVaultStatus();
      setFeedback({
        type: 'success',
        text:
          action === 'set_primary'
            ? 'Switched active account for this integration!'
            : 'Removed account from this integration.',
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Could not update account list.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSendRealTestEmail = async () => {
    if (!testEmailRecipient.trim().includes('@')) {
      setFeedback({
        type: 'error',
        text: 'Enter a valid recipient email address to send a live test email.',
      });
      return;
    }
    setSendingTestEmail(true);
    setFeedback(null);
    try {
      if (googleAccessToken) {
        const res = await sendGmailMessage({
          accessToken: googleAccessToken,
          to: testEmailRecipient.trim(),
          subject: 'Atelier Estate — Live Gmail Verification Test',
          body: `This is a real live email sent from your connected Gmail account (${googleAccountEmail}) via Atelier Estate.`,
        });
        setFeedback({
          type: 'success',
          text: `✅ Real email delivered to ${testEmailRecipient.trim()} via Google Gmail API! (Message ID: ${res.id})`,
        });
      } else {
        const resp = await fetch('/api/email/send-smtp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: testEmailRecipient.trim(),
            subject: 'Atelier Estate — Live Gmail SMTP Verification Test',
            body: `This is a real live email sent from your connected Gmail SMTP account (${googleAccountEmail}) via Atelier Estate.`,
          }),
        });
        const data = await resp.json();
        if (!resp.ok || !data.ok) {
          throw new Error(data.error || 'Failed to send test email');
        }
        setFeedback({
          type: 'success',
          text: `✅ Real email delivered to ${testEmailRecipient.trim()} via Gmail SMTP! (Message ID: ${data.id})`,
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: `❌ Test email failed: ${err?.message || 'Not authenticated'}`,
      });
    } finally {
      setSendingTestEmail(false);
    }
  };

  const handleSendWebsiteTestLead = async () => {
    setSendingWebsiteTest(true);
    setFeedback(null);
    try {
      const resp = await fetch('/api/webhooks/website-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: testLeadName.trim() || 'Website Inquiry Client',
          email: testLeadEmail.trim() || 'client@agencywebsite.com',
          phone: testLeadPhone.trim() || '+1 (310) 555-0192',
          budget: testLeadBudget.trim() || '$12,500,000',
          timeline: 'Immediate',
          propertyInterest:
            testLeadProperty.trim() || 'Villa Solaris Promontory',
          websiteDomain:
            accountHandle.trim() || 'https://www.luxuryestateagency.com',
          message: `Submitted inquiry directly from ${
            accountHandle.trim() || 'agency website'
          } property page.`,
        }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.ok) {
        throw new Error(data.error || 'Website lead webhook test failed.');
      }
      if (onWebsiteLeadReceived && data.lead) {
        onWebsiteLeadReceived(data.lead);
      }
      setFeedback({
        type: 'success',
        text: `✅ Live Website Lead Received! "${data.lead.name}" was captured via POST /api/webhooks/website-leads, added to Leads & Clients DB, and logged in Bot Activity Logs.`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Failed to send test website lead.',
      });
    } finally {
      setSendingWebsiteTest(false);
    }
  };

  const llmKeySavedMask = vaultStatus.CUSTOM_LLM_API_KEY?.masked;
  const hasLlmKey = Boolean(
    llmSettings.apiKey?.trim() || vaultStatus.CUSTOM_LLM_API_KEY?.configured
  );
  const hasSmtpConfigured = Boolean(
    vaultStatus.GMAIL_SMTP_APP_PASSWORD?.configured
  );

  const liveWebhookEndpoint =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/webhooks/website-leads`
      : '/api/webhooks/website-leads';

  const websiteEmbedSnippet = `<!-- Paste on your Real Estate Agency Website (WordPress, Webflow, React, HTML) -->
<script>
async function sendLeadToAtelierCRM(formData) {
  await fetch("${liveWebhookEndpoint}", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      budget: formData.budget,
      propertyInterest: formData.propertyInterest,
      websiteDomain: "${accountHandle || 'https://www.youragency.com'}"
    })
  });
}
</script>`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-xs p-4">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-300 flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">
                BYOK API Keys, Multi-Account Apps & Agency Website Lead Capture
              </h2>
              <p className="text-xs text-slate-300">
                Connect multiple accounts per app, capture leads directly from your agency website, and verify every API key live.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left Navigation Sidebar */}
          <div className="w-64 border-r border-slate-200 bg-slate-50 p-3 overflow-y-auto space-y-1">
            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              1. Bring Your Own LLM Key
            </div>
            <button
              onClick={() => setSelectedId('llm_engine')}
              className={`w-full flex items-center justify-between px-3 py-3 rounded-xl text-left text-xs font-semibold transition-all ${
                selectedId === 'llm_engine'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-amber-50/80 text-slate-900 border border-amber-200/80 hover:bg-amber-100/60'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <Cpu className="w-4 h-4 text-amber-500 shrink-0" />
                <div className="truncate">
                  <div>Custom LLM API Key</div>
                  <div
                    className={`text-[10px] font-normal ${
                      selectedId === 'llm_engine'
                        ? 'text-slate-300'
                        : 'text-slate-500'
                    }`}
                  >
                    Auto-Detects Key & Models
                  </div>
                </div>
              </div>
              <span
                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  hasLlmKey ? 'bg-emerald-500' : 'bg-amber-400'
                }`}
              />
            </button>

            <div className="px-2.5 pt-4 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              2. Brokerage App Channels
            </div>
            {CHANNEL_DEFS.map((ch) => {
              const t = tools.find((item) => item.id === ch.id);
              const isConnected = Boolean(t?.connected);
              const isSelected = selectedId === ch.id;
              const acctCount = (
                channelAccountsMap[ch.id] ||
                t?.accounts ||
                []
              ).length;
              return (
                <button
                  key={ch.id}
                  onClick={() => setSelectedId(ch.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-700 hover:bg-slate-200/70'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    {getIcon(ch.id)}
                    <span className="truncate">{ch.name.split(' (')[0]}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {acctCount > 0 && (
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {acctCount}
                      </span>
                    )}
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        isConnected ? 'bg-emerald-500' : 'bg-slate-300'
                      }`}
                    />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Form Content */}
          <div className="flex-1 p-6 overflow-y-auto bg-white">
            {selectedId === 'llm_engine' ? (
              <form onSubmit={handleSaveLlmKey} className="space-y-5">
                <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-slate-900">
                        Paste Any LLM API Key (Auto-Detect & Live Models)
                      </h3>
                      {hasLlmKey ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Key Saved (
                          {llmKeySavedMask || 'Active'})
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                          Blank — Paste Key Below
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Paste your API key in Step 1 below. We probe the provider API live, detect whether it is Groq, OpenAI, Claude, Grok, DeepSeek, Gemini, GLM, or OpenRouter, and load all models your key can access.
                    </p>
                  </div>
                </div>

                {/* STEP 1: PASTE API KEY FIRST */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-900">
                      Step 1 — Paste Your API Key (Groq, OpenAI, Claude, Grok, DeepSeek, Gemini, GLM, OpenRouter)
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        discoverModelsForKey(
                          apiKeyInput,
                          providerChoice,
                          baseUrlInput,
                          false
                        )
                      }
                      disabled={detectingModels || !apiKeyInput.trim()}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold disabled:opacity-40 transition-colors"
                    >
                      <RefreshCw
                        className={`w-3 h-3 ${
                          detectingModels ? 'animate-spin' : ''
                        }`}
                      />
                      {detectingModels
                        ? 'Fetching Models...'
                        : 'Detect Key & Fetch Models'}
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      type={showLlmKey ? 'text' : 'password'}
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      placeholder={
                        llmKeySavedMask
                          ? `Saved key (${llmKeySavedMask}) — paste new key to auto-detect & fetch models`
                          : 'Paste your API key here (e.g. gsk_..., sk-proj-..., sk-ant-..., xai-..., AIza..., sk-or-...)'
                      }
                      className="w-full pl-3.5 pr-10 py-2.5 text-xs bg-white border border-slate-300 rounded-xl font-mono focus:outline-none focus:border-slate-900"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLlmKey((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                      title={showLlmKey ? 'Hide API Key' : 'Show API Key'}
                    >
                      {showLlmKey ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {detectionBanner && (
                    <div
                      className={`p-2.5 rounded-lg text-xs flex items-center gap-2 border ${
                        detectionBanner.type === 'success'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : detectionBanner.type === 'error'
                          ? 'bg-rose-50 border-rose-200 text-rose-800'
                          : 'bg-blue-50 border-blue-200 text-blue-800'
                      }`}
                    >
                      {detectionBanner.type === 'info' && (
                        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                      )}
                      {detectionBanner.type === 'success' && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      )}
                      {detectionBanner.type === 'error' && (
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      )}
                      <span>{detectionBanner.text}</span>
                    </div>
                  )}

                  {/* STEP 2: LIVE FETCHED MODELS DROPDOWN */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-900">
                        Step 2 — Select Model (Fetched Live from Your API Key)
                      </label>
                      <span className="text-[11px] font-medium text-emerald-700">
                        {fetchedModels.length > 0
                          ? `${fetchedModels.length} live models available on this key`
                          : 'Paste key above to load live models'}
                      </span>
                    </div>

                    {fetchedModels.length > 0 ? (
                      <select
                        value={modelChoice}
                        onChange={(e) => setModelChoice(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-300 rounded-xl font-mono focus:outline-none focus:border-slate-900"
                      >
                        {fetchedModels.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={modelChoice}
                        onChange={(e) => setModelChoice(e.target.value)}
                        placeholder="Paste your API key above to automatically fetch & list your models..."
                        className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-300 rounded-xl font-mono focus:outline-none focus:border-slate-900"
                      />
                    )}
                  </div>
                </div>

                {/* STEP 3: DETECTED PROVIDER */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Detected Provider (Auto-selected from your key, or click to override)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {LLM_PROVIDER_CATALOG.map((prov) => {
                      const active = providerChoice === prov.id;
                      return (
                        <button
                          key={prov.id}
                          type="button"
                          onClick={() => {
                            setProviderChoice(prov.id);
                            if (apiKeyInput.trim()) {
                              discoverModelsForKey(
                                apiKeyInput,
                                prov.id,
                                baseUrlInput,
                                false
                              );
                            }
                          }}
                          className={`p-2.5 rounded-xl border text-left transition-all ${
                            active
                              ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                              : 'border-slate-200 bg-slate-50/70 text-slate-800 hover:bg-slate-100'
                          }`}
                        >
                          <div className="text-xs font-semibold truncate">
                            {prov.name}
                          </div>
                          <div
                            className={`text-[10px] mt-0.5 truncate ${
                              active ? 'text-amber-300' : 'text-slate-500'
                            }`}
                          >
                            {active && fetchedModels.length > 0
                              ? `${fetchedModels.length} Models Loaded`
                              : prov.badge}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {providerChoice === 'custom' && (
                    <div className="mt-3">
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Custom OpenAI-Compatible Base URL
                      </label>
                      <input
                        type="url"
                        value={baseUrlInput}
                        onChange={(e) => setBaseUrlInput(e.target.value)}
                        placeholder="https://openrouter.ai/api/v1"
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg font-mono focus:outline-none focus:border-slate-900"
                      />
                    </div>
                  )}
                </div>

                {feedback && (
                  <div
                    className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                      feedback.type === 'success'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}
                  >
                    {feedback.type === 'success' ? (
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span>{feedback.text}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={handleClearLlmKey}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Clear LLM Key
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors shadow-xs"
                  >
                    {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Save Key & Selected Model
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-slate-900">
                        {activeDef.name}
                      </h3>
                      {activeTool?.connected ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Verified &
                          Connected
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600">
                          Not Connected
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {activeDef.subtitle}
                    </p>
                  </div>
                </div>

                <div className="mt-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed">
                  {activeDef.simpleHint}
                </div>

                {/* ============================================================
                    MULTI-ACCOUNT MANAGER: CONNECTED ACCOUNTS LIST FOR THIS APP
                    ============================================================ */}
                <div className="mt-4 p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                      <Layers className="w-4 h-4 text-amber-600" />
                      <span>
                        Connected Accounts for {activeDef.name.split(' (')[0]} (
                        {currentChannelAccounts.length})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAccountHandle('');
                        setWebhookUrl('');
                        setSecretInputs({});
                        setSmtpEmailInput('');
                        setSmtpAppPasswordInput('');
                        setFeedback({
                          type: 'success',
                          text: 'Ready to add another account! Enter the second account’s credentials below and click Verify & Connect.',
                        });
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold transition-colors"
                    >
                      <PlusCircle className="w-3.5 h-3.5 text-amber-400" />
                      + Add Another Account
                    </button>
                  </div>

                  {currentChannelAccounts.length === 0 ? (
                    <div className="text-[11px] text-slate-500">
                      No accounts connected yet. Connect your first account below — you can add multiple accounts (e.g. multiple Gmail inboxes, WhatsApp numbers, Telnyx lines, or Agency Websites) and switch between them anytime.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {currentChannelAccounts.map((acct) => (
                        <div
                          key={acct.id}
                          className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                            acct.isPrimary
                              ? 'bg-white border-emerald-300 shadow-2xs'
                              : 'bg-white/70 border-slate-200'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 flex items-center gap-2 truncate">
                              <span>{acct.accountHandle}</span>
                              {acct.isPrimary && (
                                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-semibold">
                                  Active / Primary
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">
                              {acct.verifiedDetail}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {!acct.isPrimary && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleSwitchOrRemoveAccount(
                                    'set_primary',
                                    acct.id
                                  )
                                }
                                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold"
                              >
                                Use This Account
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                handleSwitchOrRemoveAccount(
                                  'remove_account',
                                  acct.id
                                )
                              }
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                              title="Remove this account"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ============================================================
                    AGENCY WEBSITE LEADS WEBHOOK & LIVE FORM TESTER
                    ============================================================ */}
                {selectedId === 'website_leads' && (
                  <div className="mt-4 space-y-4">
                    <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <Globe className="w-4 h-4 text-amber-600" />
                          <span>
                            Your Live Agency Website Lead Webhook Endpoint
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(liveWebhookEndpoint);
                            setCopiedWebhook(true);
                            setTimeout(() => setCopiedWebhook(false), 2000);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[11px] font-semibold"
                        >
                          {copiedWebhook ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />{' '}
                              Copied URL
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" /> Copy Webhook URL
                            </>
                          )}
                        </button>
                      </div>

                      <div className="px-3 py-2 rounded-lg bg-slate-900 text-amber-300 font-mono text-xs select-all overflow-x-auto">
                        POST {liveWebhookEndpoint}
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-slate-700">
                            Embed Snippet for Client’s Real Estate Website:
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard?.writeText(
                                websiteEmbedSnippet
                              );
                              setCopiedSnippet(true);
                              setTimeout(() => setCopiedSnippet(false), 2000);
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 hover:text-slate-900"
                          >
                            {copiedSnippet ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />{' '}
                                Snippet Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" /> Copy Website Code
                              </>
                            )}
                          </button>
                        </div>
                        <pre className="p-3 rounded-lg bg-slate-900 text-slate-200 font-mono text-[10px] overflow-x-auto leading-relaxed">
                          {websiteEmbedSnippet}
                        </pre>
                      </div>
                    </div>

                    {/* Live Website Lead Simulator / Tester */}
                    <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-emerald-950">
                            Test Receiving a Lead from the Agency Website Now
                          </div>
                          <div className="text-[11px] text-emerald-800">
                            Fires a real HTTP POST to{' '}
                            <span className="font-mono">
                              /api/webhooks/website-leads
                            </span>{' '}
                            and streams the lead into your CRM & Bot Activity Logs.
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={sendingWebsiteTest}
                          onClick={handleSendWebsiteTestLead}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shrink-0 transition-colors"
                        >
                          {sendingWebsiteTest ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Send className="w-3.5 h-3.5" />
                          )}
                          Send Live Website Lead
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                        <input
                          type="text"
                          value={testLeadName}
                          onChange={(e) => setTestLeadName(e.target.value)}
                          placeholder="Buyer Name"
                          className="px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg"
                        />
                        <input
                          type="email"
                          value={testLeadEmail}
                          onChange={(e) => setTestLeadEmail(e.target.value)}
                          placeholder="Buyer Email"
                          className="px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg"
                        />
                        <input
                          type="text"
                          value={testLeadPhone}
                          onChange={(e) => setTestLeadPhone(e.target.value)}
                          placeholder="Buyer Phone"
                          className="px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg"
                        />
                        <input
                          type="text"
                          value={testLeadBudget}
                          onChange={(e) => setTestLeadBudget(e.target.value)}
                          placeholder="Budget ($14.8M)"
                          className="px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg"
                        />
                        <input
                          type="text"
                          value={testLeadProperty}
                          onChange={(e) => setTestLeadProperty(e.target.value)}
                          placeholder="Property Interest"
                          className="col-span-2 px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeDef.type === 'google_oauth' && (
                  <div className="mt-5 space-y-4">
                    {/* Option 1: Real Google OAuth 2.0 Popup */}
                    <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-slate-900">
                            Option 1 — Google OAuth 2.0 Sign-In (Add / Switch Google Account)
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {googleAccountEmail
                              ? `Active Account: ${googleAccountEmail} (${
                                  googleAccessToken
                                    ? 'Google OAuth Token Active'
                                    : hasSmtpConfigured
                                    ? 'Gmail SMTP Verified'
                                    : 'Active'
                                })`
                              : 'Opens Google account chooser to connect one or more Gmail & Google Calendar accounts.'}
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={saving}
                          onClick={async () => {
                            setSaving(true);
                            setFeedback(null);
                            try {
                              await onConnectGoogleWorkspace();
                              await refreshVaultStatus();
                              setFeedback({
                                type: 'success',
                                text: '✅ Verified Google OAuth 2.0 account live against Gmail & Calendar API!',
                              });
                            } catch (err: any) {
                              setFeedback({
                                type: 'error',
                                text: `Google OAuth Popup failed: ${
                                  err?.message ||
                                  'Popup blocked or account not authorized in OAuth consent screen. Use Option 2 (Gmail App Password) below to connect any Gmail account immediately!'
                                }`,
                              });
                            } finally {
                              setSaving(false);
                            }
                          }}
                          className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors shrink-0"
                        >
                          {googleAccountEmail
                            ? '+ Add / Switch Google OAuth Account'
                            : 'Sign in with Google OAuth'}
                        </button>
                      </div>
                    </div>

                    {/* Option 2: Real Gmail SMTP (Works with ANY Gmail account & supports multiple accounts) */}
                    {selectedId === 'gmail' && (
                      <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
                        <div>
                          <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
                            <span>
                              Option 2 — Add Any Gmail Account via Google App Password (Multi-Account SMTP)
                            </span>
                            {hasSmtpConfigured && (
                              <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                SMTP Verified (
                                {vaultStatus.GMAIL_SMTP_APP_PASSWORD?.masked})
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Connect as many Gmail accounts as you need! Create a 16-character App Password at{' '}
                            <span className="font-mono font-semibold text-slate-700">
                              myaccount.google.com/apppasswords
                            </span>{' '}
                            and verify it live against{' '}
                            <span className="font-mono">
                              smtp.gmail.com:465
                            </span>
                            .
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Gmail Address (Account 1, 2, 3...)
                            </label>
                            <input
                              type="email"
                              value={smtpEmailInput}
                              onChange={(e) =>
                                setSmtpEmailInput(e.target.value)
                              }
                              placeholder="agent.or.brokerage@gmail.com"
                              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              16-Character Google App Password
                            </label>
                            <input
                              type="password"
                              value={smtpAppPasswordInput}
                              onChange={(e) =>
                                setSmtpAppPasswordInput(e.target.value)
                              }
                              placeholder="xxxx xxxx xxxx xxxx"
                              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg font-mono focus:outline-none focus:border-slate-900"
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={saving}
                          onClick={async () => {
                            setSaving(true);
                            setFeedback(null);
                            try {
                              await onConnectGmailSmtp(
                                smtpEmailInput.trim(),
                                smtpAppPasswordInput.trim()
                              );
                              await refreshVaultStatus();
                              setSmtpAppPasswordInput('');
                              setFeedback({
                                type: 'success',
                                text: `✅ Verified & Added ${smtpEmailInput.trim()} via smtp.gmail.com:465!`,
                              });
                            } catch (err: any) {
                              setFeedback({
                                type: 'error',
                                text:
                                  err?.message ||
                                  'SMTP verification failed. Check your Gmail address and 16-character App Password.',
                              });
                            } finally {
                              setSaving(false);
                            }
                          }}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors"
                        >
                          {saving && (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          )}
                          Verify Live & Add Gmail Account
                        </button>
                      </div>
                    )}

                    {/* Option 3: Paste Direct Google OAuth 2.0 Access Token (ya29...) */}
                    <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2.5">
                      <label className="block text-xs font-bold text-slate-800">
                        Option 3 — Paste Google OAuth 2.0 Access Token (ya29...)
                      </label>
                      <p className="text-[11px] text-slate-500">
                        Have an OAuth 2.0 bearer token from Google OAuth Playground? Paste it here to verify and add that Google account.
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          value={directOAuthTokenInput}
                          onChange={(e) =>
                            setDirectOAuthTokenInput(e.target.value)
                          }
                          placeholder="ya29.a0AeDClZ..."
                          className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono focus:outline-none focus:border-slate-900"
                        />
                        <button
                          type="button"
                          disabled={saving || !directOAuthTokenInput.trim()}
                          onClick={async () => {
                            setSaving(true);
                            setFeedback(null);
                            try {
                              await onConnectGoogleWorkspace(
                                directOAuthTokenInput.trim()
                              );
                              await refreshVaultStatus();
                              setDirectOAuthTokenInput('');
                              setFeedback({
                                type: 'success',
                                text: '✅ Verified OAuth token live against Google API!',
                              });
                            } catch (err: any) {
                              setFeedback({
                                type: 'error',
                                text:
                                  err?.message ||
                                  'Google API rejected this OAuth token.',
                              });
                            } finally {
                              setSaving(false);
                            }
                          }}
                          className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold disabled:opacity-40 transition-colors"
                        >
                          Verify Token
                        </button>
                      </div>
                    </div>

                    {/* Live Test Email Sender (Only when Gmail is connected) */}
                    {googleAccountEmail && selectedId === 'gmail' && (
                      <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-2.5">
                        <div className="text-xs font-bold text-emerald-950">
                          Send a Live Verification Email Right Now (From{' '}
                          {googleAccountEmail})
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="email"
                            value={testEmailRecipient}
                            onChange={(e) =>
                              setTestEmailRecipient(e.target.value)
                            }
                            placeholder="Enter recipient email to test real delivery..."
                            className="flex-1 px-3 py-2 text-xs bg-white border border-emerald-300 rounded-lg focus:outline-none focus:border-emerald-700"
                          />
                          <button
                            type="button"
                            disabled={sendingTestEmail}
                            onClick={handleSendRealTestEmail}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors"
                          >
                            {sendingTestEmail ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Send className="w-3.5 h-3.5" />
                            )}
                            Send Real Test Email
                          </button>
                        </div>
                      </div>
                    )}

                    {feedback && (
                      <div
                        className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                          feedback.type === 'success'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : 'bg-rose-50 border-rose-200 text-rose-800'
                        }`}
                      >
                        {feedback.type === 'success' ? (
                          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                        <span>{feedback.text}</span>
                      </div>
                    )}

                    {googleAccountEmail && (
                      <button
                        type="button"
                        onClick={handleClearChannel}
                        className="inline-flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 font-medium"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Disconnect All Google
                        Accounts
                      </button>
                    )}
                  </div>
                )}

                {activeDef.type === 'api_key' && (
                  <form onSubmit={handleSaveChannel} className="mt-5 space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        {activeDef.handleLabel ||
                          'Account Handle / Phone Number'}
                      </label>
                      <input
                        type="text"
                        value={accountHandle}
                        onChange={(e) => setAccountHandle(e.target.value)}
                        placeholder={activeDef.handlePlaceholder || ''}
                        className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
                      />
                    </div>

                    {activeDef.secretFields.map((field) => {
                      const status = vaultStatus[field.keyName];
                      return (
                        <div key={field.keyName}>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-medium text-slate-700">
                              {field.label}
                            </label>
                            {status?.configured ? (
                              <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                Verified: {status.masked}
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400">
                                Blank (Not Set)
                              </span>
                            )}
                          </div>
                          <input
                            type="password"
                            value={secretInputs[field.keyName] || ''}
                            onChange={(e) =>
                              setSecretInputs((prev) => ({
                                ...prev,
                                [field.keyName]: e.target.value,
                              }))
                            }
                            placeholder={
                              status?.configured
                                ? `Saved (${status.masked}) — paste new key to add/switch account`
                                : field.placeholder
                            }
                            className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg font-mono focus:outline-none focus:border-slate-900"
                          />
                        </div>
                      );
                    })}

                    {activeDef.webhookPlaceholder && (
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Outbound Webhook URL (Optional — Verified via live POST ping)
                        </label>
                        <input
                          type="url"
                          value={webhookUrl}
                          onChange={(e) => setWebhookUrl(e.target.value)}
                          placeholder={activeDef.webhookPlaceholder}
                          className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
                        />
                      </div>
                    )}

                    {feedback && (
                      <div
                        className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                          feedback.type === 'success'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : 'bg-rose-50 border-rose-200 text-rose-800'
                        }`}
                      >
                        {feedback.type === 'success' ? (
                          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                        <span>{feedback.text}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2">
                      <button
                        type="button"
                        onClick={handleClearChannel}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Disconnect All
                      </button>

                      <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors"
                      >
                        {saving && (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        )}
                        {currentChannelAccounts.length > 0
                          ? 'Verify & Add / Update Account'
                          : 'Verify Live API & Connect'}
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
