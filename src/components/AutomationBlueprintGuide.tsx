import React, { useState } from 'react';
import {
  Download,
  Copy,
  Check,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Send,
  BookOpen,
  MessageSquare,
  Instagram,
  Share2,
  Phone,
  KeyRound,
  Activity,
  ArrowRight,
  UserCheck,
  Link2,
} from 'lucide-react';
import { ToolId } from '../types/brokerage';

interface AutomationBlueprintGuideProps {
  channelId: ToolId;
  accountHandle: string;
  webhookUrl: string;
  onChangeAccountHandle: (val: string) => void;
  onChangeWebhookUrl: (val: string) => void;
  onSaveWebhookConnection: (targetChannelId?: ToolId) => Promise<void>;
  onOpenWebhookHealth?: () => void;
  onWebsiteLeadReceived?: (lead: any) => void;
  saving?: boolean;
  feedback?: { type: 'success' | 'error'; text: string } | null;
  fullPageMode?: boolean;
}

type AutomationPlatform = 'make' | 'n8n' | 'zapier' | 'official_steps';

interface ChannelGuideMeta {
  name: string;
  shortName: string;
  handleLabel: string;
  handlePlaceholder: string;
  makeConnectionType: string;
  makeConnectionLabel: string;
  makeInboundModule: string;
  makeInboundTitle: string;
  makeOutboundModule: string;
  makeOutboundTitle: string;
  loginInstructionMake: string;
  inboundTriggerMake: string;
  outboundActionMake: string;
  inboundTriggerN8n: string;
  outboundActionN8n: string;
  officialPortalName: string;
  officialPortalUrl: string;
  officialSteps: { title: string; detail: string }[];
}

const CHANNEL_GUIDE_META: Record<string, ChannelGuideMeta> = {
  whatsapp: {
    name: 'WhatsApp Business',
    shortName: 'WhatsApp',
    handleLabel: 'Your Real WhatsApp Business Phone Number (Required)',
    handlePlaceholder: '+1 (310) 555-0199',
    makeConnectionType: 'whatsapp-business-cloud',
    makeConnectionLabel: 'WhatsApp Business Cloud Account Login',
    makeInboundModule: 'whatsapp-business-cloud:WatchEvents',
    makeInboundTitle: 'WhatsApp Business Cloud — Watch Events (Incoming Message)',
    makeOutboundModule: 'whatsapp-business-cloud:sendAMessage',
    makeOutboundTitle: 'WhatsApp Business Cloud — Send a Message',
    loginInstructionMake:
      'Click the green "WhatsApp Business Cloud" circle inside Make.com -> click "Create a connection" -> click "Sign in with Facebook / Meta" to log into your WhatsApp Business account.',
    inboundTriggerMake: 'WhatsApp Business Cloud -> Watch Events (Incoming Message)',
    outboundActionMake: 'WhatsApp Business Cloud -> Send a Message',
    inboundTriggerN8n: 'WhatsApp Trigger (On Message Received)',
    outboundActionN8n: 'WhatsApp Business Cloud (Send Text Message)',
    officialPortalName: 'Meta for Developers (WhatsApp Cloud API)',
    officialPortalUrl: 'https://developers.facebook.com/apps/',
    officialSteps: [
      {
        title: 'Step 1: Create a Business App in Meta for Developers',
        detail:
          'Go to developers.facebook.com/apps -> click "Create App" -> select "Other" -> select "Business" -> enter your brokerage name (e.g. "Atelier Estate CRM") and create the app.',
      },
      {
        title: 'Step 2: Add the WhatsApp Product to Your Meta App',
        detail:
          'Inside your Meta App Dashboard, scroll down to "WhatsApp" and click "Set up". Meta will automatically create a WhatsApp Business Account sandbox and show the "API Setup" screen.',
      },
      {
        title: 'Step 3: Copy Your Phone Number ID',
        detail:
          'On the "WhatsApp -> API Setup" page in the left sidebar, look under "From" phone number. Copy the 15-digit "Phone number ID" (e.g. 109482716453821) and paste it into the "WhatsApp Phone Number ID" box in Tab 1.',
      },
      {
        title: 'Step 4: Generate a Permanent System User Access Token',
        detail:
          'For testing, you can copy the "Temporary access token" (starts with EAAG...) on the API Setup page. For 24/7 production, open business.facebook.com/settings -> Users -> System Users -> Add System User (Admin) -> Assign your WhatsApp App -> click "Generate New Token" with whatsapp_business_messaging and whatsapp_business_management permissions.',
      },
      {
        title: 'Step 5: Paste Token & Configure Inbound Webhook in Meta',
        detail:
          'Paste your Access Token and Phone Number ID into Tab 1 (Official API Method) and click "Verify Official API & Connect". To receive incoming WhatsApp replies automatically, go to Meta Dashboard -> WhatsApp -> Configuration -> Edit Webhook -> paste your CRM Inbound URL (/api/webhooks/inbound/whatsapp).',
      },
    ],
  },
  instagram: {
    name: 'Instagram Business DMs',
    shortName: 'Instagram',
    handleLabel: 'Your Real Instagram @Handle (Required)',
    handlePlaceholder: '@your_instagram_handle',
    makeConnectionType: 'instagram-business',
    makeConnectionLabel: 'Instagram for Business Account Login (OAuth)',
    makeInboundModule: 'instagram-business:WatchEvents',
    makeInboundTitle: 'Instagram for Business — Watch Direct Messages & Events',
    makeOutboundModule: 'instagram-business:ActionSendTextMessage',
    makeOutboundTitle: 'Instagram for Business — Send a Direct Text Message',
    loginInstructionMake:
      'Click the pink "Instagram for Business" circle inside Make.com -> click "Add / Create a connection" -> a popup window will open asking you to Log in to your Instagram / Facebook Business account and approve permissions.',
    inboundTriggerMake: 'Instagram for Business -> Watch Events / Messages',
    outboundActionMake: 'Instagram for Business -> Send a Text Message',
    inboundTriggerN8n: 'Instagram Business Webhook Trigger (n8n-nodes-base.facebookTrigger)',
    outboundActionN8n: 'Instagram Graph API Node (Send Direct Message)',
    officialPortalName: 'Meta for Developers (Instagram Graph API)',
    officialPortalUrl: 'https://developers.facebook.com/apps/',
    officialSteps: [
      {
        title: 'Step 1: Switch Instagram to a Professional Business Account',
        detail:
          'In your Instagram mobile app, go to Settings -> Account type and tools -> Switch to Professional Account (Business) and link it to your brokerage Facebook Page.',
      },
      {
        title: 'Step 2: Enable "Allow Access to Messages" in Instagram App',
        detail:
          'In Instagram Settings -> Messages and story replies -> Message controls -> turn ON "Allow access to messages" so connected CRM tools and AI bots are allowed to read and reply to DMs.',
      },
      {
        title: 'Step 3: Generate an Instagram Graph Access Token',
        detail:
          'Go to developers.facebook.com/apps -> select your Business App -> Add Product "Instagram" or open Graph API Explorer -> select your App and Page -> request permissions: instagram_basic, instagram_manage_messages, pages_manage_metadata -> click "Generate Access Token".',
      },
      {
        title: 'Step 4: Paste Token in Tab 1 & Verify Live',
        detail:
          'Paste your token (starts with EAAG... or IGQV...) into Tab 1 (Official API Method) and click "Verify Official API & Connect". Our server verifies it live against graph.facebook.com/v19.0/me.',
      },
    ],
  },
  facebook: {
    name: 'Facebook Lead Ads & Page Messenger',
    shortName: 'Facebook',
    handleLabel: 'Your Real Facebook Business Page Name (Required)',
    handlePlaceholder: 'Atelier Luxury Realty Page',
    makeConnectionType: 'facebook-lead-ads',
    makeConnectionLabel: 'Facebook Business Page Account Login (OAuth)',
    makeInboundModule: 'facebook-lead-ads:WatchLeads',
    makeInboundTitle: 'Facebook Lead Ads — Watch New Leads (Instant Trigger)',
    makeOutboundModule: 'facebook-messenger:sendAMessage',
    makeOutboundTitle: 'Facebook Messenger — Send a Page Message',
    loginInstructionMake:
      'Click the blue "Facebook Lead Ads / Facebook Messenger" circle inside Make.com -> click "Add / Create a connection" -> click "Continue with Facebook" to log into your Facebook account and select your Page.',
    inboundTriggerMake: 'Facebook Lead Ads -> New Lead (Instant Trigger)',
    outboundActionMake: 'Facebook Messenger -> Send a Message',
    inboundTriggerN8n: 'Facebook Lead Ads Trigger (On New Lead)',
    outboundActionN8n: 'Facebook Graph API (Page Message / Post)',
    officialPortalName: 'Meta for Developers (Facebook Page Graph API)',
    officialPortalUrl: 'https://developers.facebook.com/tools/explorer/',
    officialSteps: [
      {
        title: 'Step 1: Open Meta Graph API Explorer',
        detail:
          'Go to developers.facebook.com/tools/explorer and select your Meta Business App from the top-right dropdown.',
      },
      {
        title: 'Step 2: Select "Get Page Access Token"',
        detail:
          'Under "User or Page", select "Get Page Access Token" and choose your Real Estate Brokerage Facebook Page.',
      },
      {
        title: 'Step 3: Add Lead & Messaging Permissions',
        detail:
          'Add permissions: pages_show_list, pages_read_engagement, pages_manage_ads, leads_retrieval, and pages_messaging -> click "Generate Access Token".',
      },
      {
        title: 'Step 4: Paste Page Access Token in Tab 1 & Verify Live',
        detail:
          'Copy the generated Page Access Token (starts with EAAG...), paste it into Tab 1 (Official API Method), and click "Verify Official API & Connect".',
      },
    ],
  },
  telnyx: {
    name: 'Telnyx Voice & SMS Telephony',
    shortName: 'Telnyx',
    handleLabel: 'Your Real Telnyx Phone Number (Required)',
    handlePlaceholder: '+1 (310) 555-0199',
    makeConnectionType: 'telnyx',
    makeConnectionLabel: 'Telnyx Account API Connection',
    makeInboundModule: 'telnyx:WatchSMS',
    makeInboundTitle: 'Telnyx — Watch Inbound SMS Messages',
    makeOutboundModule: 'telnyx:SendSMS',
    makeOutboundTitle: 'Telnyx — Send an SMS Message',
    loginInstructionMake:
      'Click the "Telnyx" circle inside Make.com -> click "Add / Create a connection" -> enter your Telnyx account API Key to link your Telnyx phone number.',
    inboundTriggerMake: 'Telnyx -> Watch Inbound SMS',
    outboundActionMake: 'Telnyx -> Send an SMS',
    inboundTriggerN8n: 'Telnyx Trigger (Inbound SMS)',
    outboundActionN8n: 'Telnyx Node (Send SMS)',
    officialPortalName: 'Telnyx Mission Control Portal',
    officialPortalUrl: 'https://portal.telnyx.com/',
    officialSteps: [
      {
        title: 'Step 1: Log In to Telnyx Mission Control Portal',
        detail:
          'Go to portal.telnyx.com and sign in to your brokerage Telnyx account.',
      },
      {
        title: 'Step 2: Buy or Select an SMS/Voice Phone Number',
        detail:
          'Open Numbers -> My Numbers (or Search & Buy Numbers), copy your E.164 phone number (e.g. +13105550199), and assign it to a Messaging Profile.',
      },
      {
        title: 'Step 3: Copy Your Telnyx V2 API Key',
        detail:
          'In the bottom-left menu, click "Auth" -> "API Keys" -> click "Create API Key". Copy the V2 key (starts with KEY018...).',
      },
      {
        title: 'Step 4: Paste API Key & From Number in Tab 1',
        detail:
          'Paste your Telnyx phone number and V2 API Key into Tab 1 (Official API Method) and click "Verify Official API & Connect". Our server verifies your live account balance against api.telnyx.com/v2/balance.',
      },
    ],
  },
};

export const AutomationBlueprintGuide: React.FC<
  AutomationBlueprintGuideProps
> = ({
  channelId,
  accountHandle,
  webhookUrl,
  onChangeAccountHandle,
  onChangeWebhookUrl,
  onSaveWebhookConnection,
  onOpenWebhookHealth,
  onWebsiteLeadReceived,
  saving = false,
  feedback = null,
  fullPageMode = false,
}) => {
  const [selectedChannel, setSelectedChannel] = useState<ToolId>(
    ['whatsapp', 'instagram', 'facebook', 'telnyx'].includes(channelId)
      ? channelId
      : 'whatsapp'
  );
  const [platform, setPlatform] = useState<AutomationPlatform>('make');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [testingInbound, setTestingInbound] = useState(false);
  const [inboundTestResult, setInboundTestResult] = useState<string | null>(
    null
  );
  const [localError, setLocalError] = useState<string | null>(null);

  const activeChannelId = fullPageMode ? selectedChannel : channelId;
  const meta =
    CHANNEL_GUIDE_META[activeChannelId] || CHANNEL_GUIDE_META.whatsapp;

  const origin =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://your-crm-domain.com';
  const inboundEndpoint = `${origin}/api/webhooks/inbound/${activeChannelId}`;

  const copyText = (key: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2200);
  };

  // =========================================================================
  // 1. REAL MAKE.COM INBOUND BLUEPRINT (WITH ACTUAL APP LOGIN MODULE #1)
  // =========================================================================
  const generateMakeInboundBlueprint = () => {
    const inboundDataMapping =
      activeChannelId === 'instagram'
        ? {
            name: '{{1.sender.username}}',
            email: '',
            phone: '{{1.sender.id}}',
            budget: 'Instagram DM Inquiry',
            propertyInterest: 'Luxury Portfolio Inquiry',
            notes: '{{1.message.text}}',
            source: 'Instagram Business DMs',
          }
        : activeChannelId === 'whatsapp'
        ? {
            name: '{{1.contacts[].profile.name}}',
            email: '',
            phone: '{{1.messages[].from}}',
            budget: 'WhatsApp Inquiry',
            propertyInterest: 'Luxury Portfolio Inquiry',
            notes: '{{1.messages[].text.body}}',
            source: 'WhatsApp Business',
          }
        : activeChannelId === 'facebook'
        ? {
            name: '{{1.full_name}}',
            email: '{{1.email}}',
            phone: '{{1.phone_number}}',
            budget: '{{1.budget}}',
            propertyInterest: '{{1.campaign_name}}',
            notes: 'Captured via Facebook Lead Ads Instant Form',
            source: 'Facebook Lead Ads',
          }
        : {
            name: 'Telnyx SMS Client ({{1.from.phone_number}})',
            email: '',
            phone: '{{1.from.phone_number}}',
            budget: 'SMS Inquiry',
            propertyInterest: 'Portfolio Inquiry',
            notes: '{{1.text}}',
            source: 'Telnyx SMS',
          };

    return JSON.stringify(
      {
        name: `Atelier Estate CRM — Inbound ${meta.name} Lead Sync (Log In to ${meta.shortName} in Module 1)`,
        flow: [
          {
            id: 1,
            module: meta.makeInboundModule,
            version: 1,
            parameters: {
              __IMTCONN__: null,
            },
            mapper: {},
            metadata: {
              designer: { x: 0, y: 0 },
              restore: {
                parameters: {
                  __IMTCONN__: {
                    label: `Click "Add" to Log In to Your ${meta.name} Account`,
                    data: {
                      scoped: 'true',
                      connection: meta.makeConnectionType,
                    },
                  },
                },
              },
              parameters: [
                {
                  name: '__IMTCONN__',
                  type: `account:${meta.makeConnectionType}`,
                  label: `${meta.shortName} Account Connection (Click Add to Log In)`,
                  required: true,
                },
              ],
              notes: `MODULE 1 (LOG IN HERE): Click this ${meta.shortName} module -> Click "Add" next to Connection -> Log in to your ${meta.name} account!`,
            },
          },
          {
            id: 2,
            module: 'http:ActionSendData',
            version: 3,
            parameters: {
              handleErrors: false,
              useNewZLibDeCompress: true,
            },
            mapper: {
              url: inboundEndpoint,
              serializeUrl: false,
              method: 'post',
              headers: [
                {
                  name: 'Content-Type',
                  value: 'application/json',
                },
              ],
              qs: [],
              bodyType: 'raw',
              parseResponse: true,
              contentType: 'application/json',
              data: JSON.stringify(inboundDataMapping, null, 2),
            },
            metadata: {
              designer: { x: 340, y: 0 },
              notes: `MODULE 2 (PRE-CONFIGURED): Already contains your live Atelier CRM Inbound Webhook URL (${inboundEndpoint}) and maps your ${meta.shortName} lead fields automatically.`,
            },
          },
        ],
        metadata: {
          instant: true,
          version: 1,
          scenario: {
            roundtrips: 1,
            maxErrors: 3,
            autoCommit: true,
            autoCommitTriggerLast: true,
            sequential: false,
          },
          designer: {
            orphans: [],
          },
        },
      },
      null,
      2
    );
  };

  // =========================================================================
  // 2. REAL MAKE.COM OUTBOUND BLUEPRINT (WEBHOOK #1 -> REAL APP LOGIN MODULE #2)
  // =========================================================================
  const generateMakeOutboundBlueprint = () => {
    const outboundMapper =
      activeChannelId === 'instagram'
        ? {
            recipientId: '{{1.recipient}}',
            messageType: 'text',
            message: '{{1.messageBody}}',
          }
        : activeChannelId === 'whatsapp'
        ? {
            to: '{{1.recipient}}',
            type: 'text',
            text: {
              body: '{{1.messageBody}}',
              preview_url: false,
            },
          }
        : activeChannelId === 'facebook'
        ? {
            messaging_type: 'RESPONSE',
            recipient: {
              id: '{{1.recipient}}',
            },
            message: {
              text: '{{1.messageBody}}',
            },
          }
        : {
            to: '{{1.recipient}}',
            text: '{{1.messageBody}}',
          };

    const outboundConnType =
      activeChannelId === 'facebook'
        ? 'facebook-messenger'
        : meta.makeConnectionType;

    return JSON.stringify(
      {
        name: `Atelier Estate CRM — Outbound AI Bot ${meta.name} Sender (Copy Hook in Module 1 + Log In to ${meta.shortName} in Module 2)`,
        flow: [
          {
            id: 1,
            module: 'gateway:CustomWebHook',
            version: 1,
            parameters: {
              hook: null,
              maxResults: 1,
            },
            mapper: {},
            metadata: {
              designer: { x: 0, y: 0 },
              restore: {
                parameters: {
                  hook: {
                    label:
                      'Click "Add" to Generate Your Make.com Webhook URL, then Copy & Paste it into Atelier CRM Step 4',
                  },
                },
              },
              parameters: [
                {
                  name: 'hook',
                  type: 'hook:gateway-webhook',
                  label: 'Webhook (Click Add -> Copy Address to Clipboard)',
                  required: true,
                },
                {
                  name: 'maxResults',
                  type: 'number',
                  label: 'Maximum number of results',
                },
              ],
              notes:
                'MODULE 1 (GET WEBHOOK URL HERE): Click this Custom Webhook circle -> Click "Add" -> Click "Save" -> Click "Copy address to clipboard" (https://hook...make.com/...) and paste it into Atelier CRM Step 4!',
            },
          },
          {
            id: 2,
            module: meta.makeOutboundModule,
            version: 1,
            parameters: {
              __IMTCONN__: null,
            },
            mapper: outboundMapper,
            metadata: {
              designer: { x: 340, y: 0 },
              restore: {
                parameters: {
                  __IMTCONN__: {
                    label: `Click "Add" to Log In to Your ${meta.name} Account`,
                    data: {
                      scoped: 'true',
                      connection: outboundConnType,
                    },
                  },
                },
              },
              parameters: [
                {
                  name: '__IMTCONN__',
                  type: `account:${outboundConnType}`,
                  label: `${meta.shortName} Account Connection (Click Add to Log In)`,
                  required: true,
                },
              ],
              notes: `MODULE 2 (LOG IN TO ${meta.shortName.toUpperCase()} HERE): Click this ${meta.shortName} circle -> Click "Add" next to Connection -> Log in to your ${meta.name} account! Recipient ({{1.recipient}}) and AI message text ({{1.messageBody}}) are already mapped for you.`,
            },
          },
        ],
        metadata: {
          instant: true,
          version: 1,
          scenario: {
            roundtrips: 1,
            maxErrors: 3,
            autoCommit: true,
            autoCommitTriggerLast: true,
            sequential: false,
          },
          designer: {
            orphans: [],
          },
        },
      },
      null,
      2
    );
  };

  // =========================================================================
  // 3. REAL N8N WORKFLOW BLUEPRINT (WITH WIRED APP LOGIN NODES & CONNECTIONS)
  // =========================================================================
  const generateN8nWorkflowBlueprint = () => {
    const inboundTriggerNodeType =
      activeChannelId === 'whatsapp'
        ? 'n8n-nodes-base.whatsAppTrigger'
        : activeChannelId === 'telnyx'
        ? 'n8n-nodes-base.telnyxTrigger'
        : 'n8n-nodes-base.facebookTrigger';

    const outboundActionNodeType =
      activeChannelId === 'whatsapp'
        ? 'n8n-nodes-base.whatsApp'
        : activeChannelId === 'telnyx'
        ? 'n8n-nodes-base.telnyx'
        : 'n8n-nodes-base.facebookGraphApi';

    const credentialKey =
      activeChannelId === 'whatsapp'
        ? 'whatsAppTriggerApi'
        : activeChannelId === 'telnyx'
        ? 'telnyxApi'
        : 'facebookGraphAppApi';

    const inboundNodeName = `1A. ${meta.shortName} Inbound Trigger (Double-Click to Log In to ${meta.shortName})`;
    const forwardNodeName = `1B. Forward ${meta.shortName} Lead to Atelier CRM (Pre-Filled URL)`;
    const outboundWebhookNodeName = `2A. Outbound AI Bot Webhook (Copy This URL into Atelier CRM Step 4)`;
    const outboundSendNodeName = `2B. Send ${meta.shortName} Message (Double-Click to Log In to ${meta.shortName})`;

    return JSON.stringify(
      {
        name: `Atelier Estate CRM — 2-Way ${meta.name} AI Automation (With ${meta.shortName} Account Login Nodes)`,
        nodes: [
          {
            parameters:
              activeChannelId === 'whatsapp'
                ? { updates: ['messages'] }
                : activeChannelId === 'telnyx'
                ? { events: ['message.received'] }
                : {
                    object:
                      activeChannelId === 'instagram' ? 'instagram' : 'page',
                    fields: ['messages', 'leadgen'],
                  },
            id: 'inbound-app-trigger-node',
            name: inboundNodeName,
            type: inboundTriggerNodeType,
            typeVersion: 1,
            position: [220, 140],
            credentials: {
              [credentialKey]: {
                id: `login-your-${activeChannelId}-account`,
                name: `Click Here in n8n to Log In / Connect Your ${meta.name} Account`,
              },
            },
          },
          {
            parameters: {
              method: 'POST',
              url: inboundEndpoint,
              sendBody: true,
              specifyBody: 'json',
              jsonBody: `={\n  "name": "{{ $json.name || $json.sender?.username || 'Inbound ${meta.shortName} Client' }}",\n  "email": "{{ $json.email || '' }}",\n  "phone": "{{ $json.phone || $json.from || '' }}",\n  "budget": "{{ $json.budget || 'Inbound ${meta.shortName} Inquiry' }}",\n  "propertyInterest": "{{ $json.propertyInterest || 'Luxury Portfolio' }}",\n  "notes": "{{ $json.message || $json.text?.body || 'Captured via n8n ${meta.name} workflow' }}",\n  "source": "${meta.name}"\n}`,
              options: {},
            },
            id: 'inbound-crm-forwarder',
            name: forwardNodeName,
            type: 'n8n-nodes-base.httpRequest',
            typeVersion: 4.1,
            position: [580, 140],
          },
          {
            parameters: {
              httpMethod: 'POST',
              path: `atelier-outbound-${activeChannelId}`,
              responseMode: 'onReceived',
              options: {},
            },
            id: 'outbound-webhook-trigger',
            name: outboundWebhookNodeName,
            type: 'n8n-nodes-base.webhook',
            typeVersion: 1,
            position: [220, 380],
          },
          {
            parameters:
              activeChannelId === 'whatsapp'
                ? {
                    operation: 'send',
                    recipientPhoneNumber: '={{ $json.body.recipient }}',
                    textBody: '={{ $json.body.messageBody }}',
                  }
                : activeChannelId === 'telnyx'
                ? {
                    resource: 'sms',
                    operation: 'send',
                    to: '={{ $json.body.recipient }}',
                    text: '={{ $json.body.messageBody }}',
                  }
                : {
                    httpRequestMethod: 'POST',
                    graphApiVersion: 'v19.0',
                    node: 'me',
                    edge: 'messages',
                    options: {
                      queryParameters: {
                        parameter: [
                          {
                            name: 'recipient',
                            value: '={"id":"{{ $json.body.recipient }}"}',
                          },
                          {
                            name: 'message',
                            value: '={"text":"{{ $json.body.messageBody }}"}',
                          },
                        ],
                      },
                    },
                  },
            id: 'outbound-app-sender-node',
            name: outboundSendNodeName,
            type: outboundActionNodeType,
            typeVersion: 1,
            position: [580, 380],
            credentials: {
              [credentialKey]: {
                id: `login-your-${activeChannelId}-account`,
                name: `Click Here in n8n to Log In / Connect Your ${meta.name} Account`,
              },
            },
          },
        ],
        connections: {
          [inboundNodeName]: {
            main: [
              [
                {
                  node: forwardNodeName,
                  type: 'main',
                  index: 0,
                },
              ],
            ],
          },
          [outboundWebhookNodeName]: {
            main: [
              [
                {
                  node: outboundSendNodeName,
                  type: 'main',
                  index: 0,
                },
              ],
            ],
          },
        },
        settings: {
          executionOrder: 'v1',
        },
      },
      null,
      2
    );
  };

  const downloadJsonFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleVerifyAndSaveClick = async () => {
    setLocalError(null);
    const cleanHandle = accountHandle.trim();
    const cleanUrl = webhookUrl.trim();

    if (!cleanHandle) {
      setLocalError(
        `❌ Please enter your real ${meta.shortName} account handle or phone number (e.g. "${meta.handlePlaceholder}"). We never invent fake handles.`
      );
      return;
    }

    if (!cleanUrl || !cleanUrl.startsWith('http')) {
      setLocalError(
        `❌ Please paste the Outbound Webhook URL from Module #1 in ${
          platform === 'make'
            ? 'Make.com (https://hook...make.com/...)'
            : platform === 'n8n'
            ? 'n8n (https://.../webhook/...)'
            : 'Zapier (https://hooks.zapier.com/...)'
        } before clicking Verify Live & Connect.`
      );
      return;
    }

    if (cleanUrl.includes('/api/webhooks/')) {
      setLocalError(
        `❌ You pasted your Atelier CRM Inbound URL into the Outbound box. Here in Step 4, you must paste the external Webhook URL copied from Module #1 inside ${
          platform === 'make' ? 'Make.com' : platform === 'n8n' ? 'n8n' : 'Zapier'
        } (e.g. https://hook.eu1.make.com/...).`
      );
      return;
    }

    await onSaveWebhookConnection(activeChannelId);
  };

  const handleTestInboundWebhook = async () => {
    setTestingInbound(true);
    setInboundTestResult(null);
    try {
      const resp = await fetch(`/api/webhooks/inbound/${activeChannelId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Diagnostic Webhook Test (${meta.shortName})`,
          email: 'webhook.diagnostic@example.com',
          phone: accountHandle.trim() || '+1 (310) 555-0100',
          budget: '$5,000,000',
          timeline: 'Immediate',
          propertyInterest: 'Inbound Webhook Diagnostic Check',
          source: meta.name,
          notes: `Diagnostic test payload sent to POST /api/webhooks/inbound/${activeChannelId}.`,
        }),
      });
      const data = await resp.json();
      if (resp.ok && data.ok) {
        if (onWebsiteLeadReceived && data.lead) {
          onWebsiteLeadReceived(data.lead);
        }
        setInboundTestResult(
          `✅ Inbound Receiver Endpoint (/api/webhooks/inbound/${activeChannelId}) is online and ready to receive leads from ${
            platform === 'make' ? 'Make.com' : 'n8n'
          }.`
        );
      } else {
        setInboundTestResult(
          `❌ Error: ${data.error || 'Webhook test failed.'}`
        );
      }
    } catch (err: any) {
      setInboundTestResult(`❌ Network error: ${err?.message || 'Failed'}`);
    } finally {
      setTestingInbound(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* FULL-PAGE CHANNEL SELECTOR BAR (When opened as full detailed setup page) */}
      {fullPageMode && (
        <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider">
                  Real App Login Modules Included + Live Webhook Verification
                </span>
              </div>
              <h3 className="text-base font-bold text-white mt-1">
                1. Choose Which App You Want to Connect:
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {(
              [
                {
                  id: 'whatsapp',
                  label: 'WhatsApp Business',
                  icon: <MessageSquare className="w-4 h-4 text-emerald-400" />,
                },
                {
                  id: 'instagram',
                  label: 'Instagram DMs',
                  icon: <Instagram className="w-4 h-4 text-pink-400" />,
                },
                {
                  id: 'facebook',
                  label: 'Facebook Lead Ads',
                  icon: <Share2 className="w-4 h-4 text-blue-400" />,
                },
                {
                  id: 'telnyx',
                  label: 'Telnyx SMS & Voice',
                  icon: <Phone className="w-4 h-4 text-amber-400" />,
                },
              ] as const
            ).map((ch) => (
              <button
                key={ch.id}
                type="button"
                onClick={() => {
                  setSelectedChannel(ch.id);
                  setInboundTestResult(null);
                  setLocalError(null);
                }}
                className={`flex items-center gap-2.5 px-3.5 py-3 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer ${
                  activeChannelId === ch.id
                    ? 'bg-white text-slate-950 border-white shadow-md'
                    : 'bg-slate-800/90 text-slate-200 border-slate-700 hover:bg-slate-800'
                }`}
              >
                {ch.icon}
                <span>{ch.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* PLATFORM TEMPLATE SELECTOR: MAKE.COM / N8N / ZAPIER / OFFICIAL API STEPS */}
      <div className="p-4 rounded-2xl border border-indigo-200 bg-indigo-50/50 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-xs font-bold text-indigo-950">
              Choose Your Automation Blueprint or Official API Walkthrough for{' '}
              {meta.name}:
            </div>
            <p className="text-[11px] text-indigo-800">
              Our downloadable <strong>Make.com</strong> and{' '}
              <strong>n8n</strong> blueprints include the official{' '}
              <strong>{meta.name}</strong> login module (where you click{' '}
              <strong>&ldquo;Add Connection / Log in&rdquo;</strong> to sign
              into your {meta.shortName} account) + your pre-configured CRM
              webhook module!
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => setPlatform('make')}
            className={`px-3 py-2.5 rounded-xl border text-left transition-all cursor-pointer ${
              platform === 'make'
                ? 'bg-indigo-950 text-white border-indigo-950 shadow-xs'
                : 'bg-white text-slate-800 border-indigo-200 hover:bg-indigo-100/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold">Make.com Blueprint</span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950 text-[9px] font-bold">
                With {meta.shortName} Login
              </span>
            </div>
            <div
              className={`text-[10px] mt-0.5 ${
                platform === 'make' ? 'text-indigo-200' : 'text-slate-500'
              }`}
            >
              Download .json & Log In
            </div>
          </button>

          <button
            type="button"
            onClick={() => setPlatform('n8n')}
            className={`px-3 py-2.5 rounded-xl border text-left transition-all cursor-pointer ${
              platform === 'n8n'
                ? 'bg-indigo-950 text-white border-indigo-950 shadow-xs'
                : 'bg-white text-slate-800 border-indigo-200 hover:bg-indigo-100/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold">n8n Workflow JSON</span>
              <span className="px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 text-[9px] font-bold">
                4 Connected Nodes
              </span>
            </div>
            <div
              className={`text-[10px] mt-0.5 ${
                platform === 'n8n' ? 'text-indigo-200' : 'text-slate-500'
              }`}
            >
              Import .json & Log In
            </div>
          </button>

          <button
            type="button"
            onClick={() => setPlatform('zapier')}
            className={`px-3 py-2.5 rounded-xl border text-left transition-all cursor-pointer ${
              platform === 'zapier'
                ? 'bg-indigo-950 text-white border-indigo-950 shadow-xs'
                : 'bg-white text-slate-800 border-indigo-200 hover:bg-indigo-100/50'
            }`}
          >
            <div className="text-xs font-bold">Zapier Template</div>
            <div
              className={`text-[10px] mt-0.5 ${
                platform === 'zapier' ? 'text-indigo-200' : 'text-slate-500'
              }`}
            >
              Copy-Paste Field Guide
            </div>
          </button>

          <button
            type="button"
            onClick={() => setPlatform('official_steps')}
            className={`px-3 py-2.5 rounded-xl border text-left transition-all cursor-pointer ${
              platform === 'official_steps'
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-100'
            }`}
          >
            <div className="text-xs font-bold">Official API Walkthrough</div>
            <div
              className={`text-[10px] mt-0.5 ${
                platform === 'official_steps'
                  ? 'text-slate-300'
                  : 'text-slate-500'
              }`}
            >
              Every Click to Get API Key
            </div>
          </button>
        </div>
      </div>

      {/* ======================================================================= */}
      {/* OPTION 1 & 2: MAKE.COM OR N8N READY-TO-IMPORT BLUEPRINTS + LOGIN GUIDE  */}
      {/* ======================================================================= */}
      {(platform === 'make' || platform === 'n8n') && (
        <div className="space-y-4">
          {/* VISUAL MODULE ARCHITECTURE: SHOWS EXACTLY WHERE USER LOGS IN TO INSTAGRAM / WHATSAPP / FACEBOOK */}
          <div className="p-4 rounded-2xl border-2 border-amber-300 bg-amber-50/70 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-amber-800" />
                <span className="text-xs font-bold text-amber-950">
                  Where Do You Log In to Your {meta.name} Account? (Inside{' '}
                  {platform === 'make' ? 'Make.com' : 'n8n'} After Importing the
                  Blueprint!)
                </span>
              </div>
              <span className="px-2 py-0.5 rounded bg-amber-200/80 text-amber-950 text-[10px] font-bold">
                Official {meta.shortName} OAuth Module Included in Blueprint
              </span>
            </div>

            <p className="text-xs text-amber-900 leading-relaxed">
              For security, you never type your {meta.shortName} password into
              this CRM. Instead, when you import our{' '}
              <strong>.json Blueprint</strong> into{' '}
              <strong>{platform === 'make' ? 'Make.com' : 'n8n'}</strong>, it
              creates the exact 2-module visual pipeline below containing the
              official <strong>{meta.name}</strong> module. You click that{' '}
              <strong>{meta.shortName} module</strong> inside{' '}
              {platform === 'make' ? 'Make.com' : 'n8n'} and click{' '}
              <strong>&ldquo;Add / Create a connection&rdquo;</strong> to log
              into your {meta.shortName} account via official OAuth!
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {/* Visual Diagram 1: Inbound Blueprint Modules */}
              <div className="p-3 rounded-xl bg-white border border-amber-200 space-y-2">
                <div className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider">
                  Blueprint #1 Modules (Incoming {meta.shortName} Leads → CRM):
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="flex-1 p-2.5 rounded-lg bg-emerald-50 border-2 border-emerald-500">
                    <div className="font-bold text-emerald-950">
                      Module 1: {meta.shortName} App
                    </div>
                    <div className="text-[10px] font-mono text-emerald-800 mt-0.5">
                      {meta.makeInboundModule}
                    </div>
                    <div className="mt-1 inline-block px-1.5 py-0.5 rounded bg-emerald-700 text-white text-[9px] font-bold">
                      👆 Click Here in {platform === 'make' ? 'Make' : 'n8n'} to
                      Log In to {meta.shortName}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                  <div className="flex-1 p-2.5 rounded-lg bg-slate-50 border border-slate-300">
                    <div className="font-bold text-slate-900">
                      Module 2: HTTP POST
                    </div>
                    <div className="text-[10px] font-mono text-slate-600 mt-0.5 truncate">
                      /api/webhooks/inbound/{activeChannelId}
                    </div>
                    <div className="mt-1 inline-block px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 text-[9px] font-semibold">
                      ✅ Pre-Filled with Your CRM URL
                    </div>
                  </div>
                </div>
              </div>

              {/* Visual Diagram 2: Outbound Blueprint Modules */}
              <div className="p-3 rounded-xl bg-white border border-amber-200 space-y-2">
                <div className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider">
                  Blueprint #2 Modules (AI Bot Sends {meta.shortName} Replies):
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="flex-1 p-2.5 rounded-lg bg-indigo-50 border-2 border-indigo-500">
                    <div className="font-bold text-indigo-950">
                      Module 1: Custom Webhook
                    </div>
                    <div className="text-[10px] font-mono text-indigo-800 mt-0.5">
                      gateway:CustomWebHook
                    </div>
                    <div className="mt-1 inline-block px-1.5 py-0.5 rounded bg-indigo-700 text-white text-[9px] font-bold">
                      👆 Click Add → Copy Hook URL for Step 4
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                  <div className="flex-1 p-2.5 rounded-lg bg-pink-50 border-2 border-pink-500">
                    <div className="font-bold text-pink-950">
                      Module 2: {meta.shortName} Send
                    </div>
                    <div className="text-[10px] font-mono text-pink-800 mt-0.5">
                      {meta.makeOutboundModule}
                    </div>
                    <div className="mt-1 inline-block px-1.5 py-0.5 rounded bg-pink-700 text-white text-[9px] font-bold">
                      👆 Click Here in {platform === 'make' ? 'Make' : 'n8n'} to
                      Log In to {meta.shortName}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* BOX A: 1-CLICK BLUEPRINT DOWNLOAD CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Inbound Blueprint Download */}
            <div className="p-4 rounded-2xl border-2 border-emerald-500/40 bg-emerald-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-md bg-emerald-700 text-white text-[10px] font-bold uppercase">
                  Blueprint 1 · Receive Incoming {meta.shortName} Leads
                </span>
                <span className="text-[11px] font-mono text-emerald-900 font-semibold">
                  Includes {meta.shortName} Login Module
                </span>
              </div>
              <div>
                <h4 className="text-xs font-bold text-emerald-950">
                  {platform === 'make'
                    ? `Make.com Inbound ${meta.shortName} → Atelier CRM Blueprint (.json)`
                    : `n8n Complete 2-Way ${meta.shortName} Workflow (.json)`}
                </h4>
                <p className="text-[11px] text-emerald-900 mt-1 leading-relaxed">
                  Contains <strong>Module 1 ({meta.makeInboundTitle})</strong>{' '}
                  where you log into your {meta.shortName} account +{' '}
                  <strong>Module 2 (HTTP POST)</strong> pre-filled with{' '}
                  <code className="bg-white px-1 py-0.5 rounded border border-emerald-200 font-mono text-[10px]">
                    /api/webhooks/inbound/{activeChannelId}
                  </code>
                  .
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() =>
                    downloadJsonFile(
                      platform === 'make'
                        ? `atelier-${activeChannelId}-inbound-make-blueprint.json`
                        : `atelier-${activeChannelId}-n8n-workflow.json`,
                      platform === 'make'
                        ? generateMakeInboundBlueprint()
                        : generateN8nWorkflowBlueprint()
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>
                    Download {platform === 'make' ? 'Make.com' : 'n8n'} Inbound
                    Blueprint (.json)
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    copyText(
                      'inbound_json',
                      platform === 'make'
                        ? generateMakeInboundBlueprint()
                        : generateN8nWorkflowBlueprint()
                    )
                  }
                  className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl bg-white hover:bg-emerald-100 border border-emerald-300 text-emerald-950 text-xs font-semibold cursor-pointer"
                >
                  {copiedKey === 'inbound_json' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {copiedKey === 'inbound_json' ? 'Copied JSON!' : 'Copy JSON'}
                  </span>
                </button>
              </div>
            </div>

            {/* Outbound Blueprint Download */}
            <div className="p-4 rounded-2xl border-2 border-indigo-500/40 bg-indigo-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-md bg-indigo-700 text-white text-[10px] font-bold uppercase">
                  Blueprint 2 · AI Bot Sends {meta.shortName} Messages
                </span>
                <span className="text-[11px] font-mono text-indigo-900 font-semibold">
                  Includes {meta.shortName} Send Module
                </span>
              </div>
              <div>
                <h4 className="text-xs font-bold text-indigo-950">
                  {platform === 'make'
                    ? `Make.com Outbound AI Bot → ${meta.shortName} Blueprint (.json)`
                    : `n8n Outbound AI Bot → ${meta.shortName} Blueprint (.json)`}
                </h4>
                <p className="text-[11px] text-indigo-900 mt-1 leading-relaxed">
                  Contains <strong>Module 1 (Custom Webhook)</strong> where you
                  copy your Make.com Webhook URL +{' '}
                  <strong>Module 2 ({meta.makeOutboundTitle})</strong> where you
                  log into your {meta.shortName} account to send real messages!
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() =>
                    downloadJsonFile(
                      platform === 'make'
                        ? `atelier-${activeChannelId}-outbound-make-blueprint.json`
                        : `atelier-${activeChannelId}-n8n-workflow.json`,
                      platform === 'make'
                        ? generateMakeOutboundBlueprint()
                        : generateN8nWorkflowBlueprint()
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-900 hover:bg-indigo-800 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>
                    Download {platform === 'make' ? 'Make.com' : 'n8n'} Outbound
                    Blueprint (.json)
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    copyText(
                      'outbound_json',
                      platform === 'make'
                        ? generateMakeOutboundBlueprint()
                        : generateN8nWorkflowBlueprint()
                    )
                  }
                  className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl bg-white hover:bg-indigo-100 border border-indigo-300 text-indigo-950 text-xs font-semibold cursor-pointer"
                >
                  {copiedKey === 'outbound_json' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {copiedKey === 'outbound_json'
                      ? 'Copied JSON!'
                      : 'Copy JSON'}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* BOX B: DETAILED STEP-BY-STEP VISUAL WALKTHROUGH */}
          <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <h4 className="text-sm font-bold text-slate-900">
                  Every Step to Import the Blueprint, Log In to {meta.name}, &
                  Paste Your Webhook
                </h4>
              </div>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Real Live Verification
              </span>
            </div>

            <div className="space-y-3">
              {/* STEP 1 */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <div className="space-y-1 text-xs">
                  <div className="font-bold text-slate-900">
                    {platform === 'make'
                      ? 'Import the Downloaded Blueprint (.json) into Make.com'
                      : 'Import the Downloaded Workflow (.json) into n8n'}
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    {platform === 'make' ? (
                      <>
                        Download the{' '}
                        <strong>
                          Make.com Outbound Blueprint (.json)
                        </strong>{' '}
                        (and Inbound Blueprint) above. Open{' '}
                        <span className="font-mono font-semibold text-slate-900">
                          make.com
                        </span>{' '}
                        → click <strong>Create a new scenario</strong> → click
                        the three dots <strong>(...) More</strong> in the bottom
                        toolbar → click <strong>Import Blueprint</strong> →
                        select the downloaded <code className="font-mono">.json</code> file.
                      </>
                    ) : (
                      <>
                        Download the <strong>n8n Workflow (.json)</strong>{' '}
                        above. Open your n8n canvas → click the top-right{' '}
                        <strong>(...)</strong> menu → click{' '}
                        <strong>Import from File</strong> → select the{' '}
                        <code className="font-mono">.json</code> file.
                      </>
                    )}
                  </p>
                </div>
              </div>

              {/* STEP 2: LOG IN TO INSTAGRAM / WHATSAPP / FACEBOOK INSIDE MAKE.COM */}
              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-300 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-amber-700 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <div className="space-y-1 text-xs">
                  <div className="font-bold text-amber-950">
                    Log In to Your {meta.name} Account Inside{' '}
                    {platform === 'make' ? 'Make.com' : 'n8n'}
                  </div>
                  <p className="text-amber-900 leading-relaxed">
                    {platform === 'make' ? (
                      <>
                        {meta.loginInstructionMake} Once logged in, Make.com
                        links your real <strong>{meta.shortName}</strong>{' '}
                        account directly to the module!
                      </>
                    ) : (
                      <>
                        Double-click the{' '}
                        <strong>{meta.shortName} node</strong> on your n8n
                        canvas → under{' '}
                        <strong>Credential to connect with</strong>, click{' '}
                        <strong>Create New Credential</strong> and sign in /
                        connect your {meta.name} account.
                      </>
                    )}
                  </p>
                </div>
              </div>

              {/* STEP 3: COPY MAKE.COM WEBHOOK URL */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <div className="space-y-2 text-xs flex-1">
                  <div className="font-bold text-slate-900">
                    Copy the Webhook URL from Module #1 in{' '}
                    {platform === 'make' ? 'Make.com' : 'n8n'} & Turn Your
                    Scenario ON
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    {platform === 'make' ? (
                      <>
                        In the <strong>Outbound Blueprint</strong> inside
                        Make.com, click on <strong>Module #1 (Custom Webhook)</strong>{' '}
                        → click <strong>Add</strong> → click{' '}
                        <strong>Save</strong> → click{' '}
                        <strong>Copy address to clipboard</strong> (it looks
                        like{' '}
                        <code className="bg-white px-1 rounded border border-slate-200 font-mono">
                          https://hook.eu1.make.com/abc123xyz...
                        </code>
                        ). Toggle the scenario switch at the bottom-left to{' '}
                        <strong>ON</strong>.
                      </>
                    ) : (
                      <>
                        In n8n, double-click Node{' '}
                        <strong>2A (Outbound AI Bot Webhook)</strong>, copy the{' '}
                        <strong>Production URL</strong> (
                        <code className="bg-white px-1 rounded border border-slate-200 font-mono">
                          https://your-n8n.../webhook/atelier-outbound-{activeChannelId}
                        </code>
                        ), and toggle the workflow to <strong>Active</strong>.
                      </>
                    )}
                  </p>
                </div>
              </div>

              {/* STEP 4: PASTE REAL HANDLE + REAL OUTBOUND WEBHOOK URL & VERIFY LIVE */}
              <div className="p-4 rounded-xl bg-indigo-50/80 border-2 border-indigo-400 space-y-3">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-indigo-950 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    4
                  </span>
                  <div className="space-y-1 text-xs flex-1">
                    <div className="font-bold text-indigo-950">
                      Enter Your Real {meta.shortName} Handle & Paste the{' '}
                      {platform === 'make' ? 'Make.com' : 'n8n'} Webhook URL
                      Below (Strict Live Verification)
                    </div>
                    <p className="text-indigo-900 leading-relaxed">
                      We never generate fake handles or mark {meta.shortName}{' '}
                      connected without verifying your webhook live. Enter your
                      real <strong>{meta.shortName} handle/number</strong> and
                      paste the{' '}
                      <strong>
                        {platform === 'make'
                          ? 'https://hook...make.com/...'
                          : 'https://.../webhook/...'}
                      </strong>{' '}
                      URL you copied in Step 3:
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-indigo-950 mb-1">
                      {meta.handleLabel}
                    </label>
                    <input
                      type="text"
                      value={accountHandle}
                      onChange={(e) => {
                        setLocalError(null);
                        onChangeAccountHandle(e.target.value);
                      }}
                      placeholder={meta.handlePlaceholder}
                      className="w-full px-3 py-2 text-xs bg-white border border-indigo-300 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-900"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-indigo-950 mb-1">
                      Paste Your {platform === 'make' ? 'Make.com' : 'n8n'}{' '}
                      Outbound Webhook URL (Required)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={webhookUrl}
                        onChange={(e) => {
                          setLocalError(null);
                          onChangeWebhookUrl(e.target.value);
                        }}
                        placeholder={
                          platform === 'make'
                            ? 'https://hook.eu1.make.com/... or https://hook.us1.make.com/...'
                            : 'https://your-n8n.app/webhook/atelier-outbound-...'
                        }
                        className="flex-1 px-3 py-2 text-xs bg-white border border-indigo-300 rounded-xl font-mono text-slate-900 focus:outline-none focus:border-indigo-900"
                      />
                      <button
                        type="button"
                        disabled={saving}
                        onClick={handleVerifyAndSaveClick}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-950 hover:bg-indigo-900 text-white text-xs font-bold transition-colors cursor-pointer shrink-0"
                      >
                        {saving ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        )}
                        <span>Verify Live & Connect {meta.shortName}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {localError && (
                  <div className="p-3 rounded-xl border bg-rose-50 border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{localError}</span>
                  </div>
                )}

                {feedback && !localError && (
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
              </div>

              {/* REFERENCE: PRE-CONFIGURED INBOUND CRM URL */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                <Link2 className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                <div className="space-y-2 text-xs flex-1">
                  <div className="font-bold text-slate-900">
                    Reference: Your CRM Inbound Receiver URL (Already Pre-Filled
                    in Blueprint #1 Module 2)
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-lg bg-white border border-slate-200">
                    <code className="font-mono text-[11px] text-indigo-900 truncate">
                      {inboundEndpoint}
                    </code>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          copyText('inbound_url', inboundEndpoint)
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-semibold cursor-pointer"
                      >
                        {copiedKey === 'inbound_url' ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>
                          {copiedKey === 'inbound_url'
                            ? 'Copied!'
                            : 'Copy Inbound URL'}
                        </span>
                      </button>
                      <button
                        type="button"
                        disabled={testingInbound}
                        onClick={handleTestInboundWebhook}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-900 text-white text-[11px] font-semibold cursor-pointer"
                      >
                        {testingInbound ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Send className="w-3 h-3" />
                        )}
                        <span>Test Inbound Endpoint</span>
                      </button>
                    </div>
                  </div>
                  {inboundTestResult && (
                    <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] font-medium">
                      {inboundTestResult}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* OPTION 3: ZAPIER STEP-BY-STEP COPY-PASTE TEMPLATE                       */}
      {/* ======================================================================= */}
      {platform === 'zapier' && (
        <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-4">
          <div className="border-b border-slate-200 pb-3">
            <h4 className="text-sm font-bold text-slate-900">
              Step-by-Step Zapier Setup Template for {meta.name}
            </h4>
            <p className="text-xs text-slate-600 mt-0.5">
              Follow these exact steps in Zapier.com to log into your{' '}
              {meta.shortName} account and connect incoming leads + outgoing AI
              bot messages.
            </p>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="font-bold text-slate-900">
                Zap #1 (Receive Incoming {meta.shortName} Leads into CRM)
              </div>
              <ol className="list-decimal list-inside space-y-1 text-slate-700">
                <li>
                  In Zapier, click <strong>Create Zap</strong>. For the{' '}
                  <strong>Trigger</strong>, choose <strong>{meta.name}</strong>{' '}
                  and click <strong>Sign in</strong> to log into your{' '}
                  {meta.shortName} account.
                </li>
                <li>
                  For the <strong>Action</strong>, choose{' '}
                  <strong>Webhooks by Zapier</strong> → Event:{' '}
                  <strong>POST</strong>.
                </li>
                <li>
                  In the <strong>URL</strong> field, paste:{' '}
                  <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono">
                    {inboundEndpoint}
                  </code>
                </li>
                <li>
                  Set <strong>Payload Type</strong> to{' '}
                  <code className="font-mono">json</code> and add keys:{' '}
                  <code className="bg-white px-1 rounded font-mono">name</code>,{' '}
                  <code className="bg-white px-1 rounded font-mono">email</code>
                  ,{' '}
                  <code className="bg-white px-1 rounded font-mono">phone</code>
                  ,{' '}
                  <code className="bg-white px-1 rounded font-mono">
                    budget
                  </code>
                  ,{' '}
                  <code className="bg-white px-1 rounded font-mono">
                    propertyInterest
                  </code>
                  ,{' '}
                  <code className="bg-white px-1 rounded font-mono">notes</code>
                  .
                </li>
              </ol>
            </div>

            <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-2.5">
              <div className="font-bold text-indigo-950">
                Zap #2 (Let AI Employees Send Outgoing {meta.shortName} Messages
                Automatically)
              </div>
              <ol className="list-decimal list-inside space-y-1 text-indigo-900">
                <li>
                  In Zapier, click <strong>Create Zap</strong>. For the{' '}
                  <strong>Trigger</strong>, choose{' '}
                  <strong>Webhooks by Zapier</strong> → Event:{' '}
                  <strong>Catch Hook</strong>.
                </li>
                <li>
                  For Action #2 in Zapier, choose <strong>{meta.name}</strong>,
                  click <strong>Sign in</strong> to log into your{' '}
                  {meta.shortName} account, and map{' '}
                  <code className="bg-white px-1 rounded font-mono">
                    recipient
                  </code>{' '}
                  and{' '}
                  <code className="bg-white px-1 rounded font-mono">
                    messageBody
                  </code>
                  .
                </li>
                <li>
                  Copy the <strong>Custom Webhook URL</strong> Zapier gives you
                  (
                  <code className="bg-white px-1 rounded font-mono">
                    https://hooks.zapier.com/hooks/catch/...
                  </code>
                  ), enter your real {meta.shortName} handle, and paste the
                  Zapier URL below:
                </li>
              </ol>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                <input
                  type="text"
                  value={accountHandle}
                  onChange={(e) => {
                    setLocalError(null);
                    onChangeAccountHandle(e.target.value);
                  }}
                  placeholder={meta.handlePlaceholder}
                  className="px-3 py-2 text-xs bg-white border border-indigo-300 rounded-xl text-slate-900"
                />
                <div className="sm:col-span-2 flex gap-2">
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => {
                      setLocalError(null);
                      onChangeWebhookUrl(e.target.value);
                    }}
                    placeholder="https://hooks.zapier.com/hooks/catch/..."
                    className="flex-1 px-3 py-2 text-xs bg-white border border-indigo-300 rounded-xl font-mono text-slate-900"
                  />
                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleVerifyAndSaveClick}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-950 hover:bg-indigo-900 text-white text-xs font-bold cursor-pointer shrink-0"
                  >
                    {saving ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    )}
                    <span>Verify Live Zapier Hook & Connect</span>
                  </button>
                </div>
              </div>

              {localError && (
                <div className="p-3 rounded-xl border bg-rose-50 border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{localError}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* OPTION 4: OFFICIAL DIRECT API STEP-BY-STEP WALKTHROUGH                  */}
      {/* ======================================================================= */}
      {platform === 'official_steps' && (
        <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                Official Direct API Walkthrough: How to Get Your {meta.name} API
                Credentials
              </h4>
              <p className="text-xs text-slate-600 mt-0.5">
                Follow every step below in{' '}
                <strong>{meta.officialPortalName}</strong>, then paste your key
                into <strong>Tab 1 (Official API Method)</strong>.
              </p>
            </div>
            <a
              href={meta.officialPortalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Open {meta.officialPortalName}</span>
            </a>
          </div>

          <div className="space-y-2.5">
            {meta.officialSteps.map((st, i) => (
              <div
                key={i}
                className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3"
              >
                <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <div className="space-y-1 text-xs">
                  <div className="font-bold text-slate-900">{st.title}</div>
                  <p className="text-slate-600 leading-relaxed">{st.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {onOpenWebhookHealth && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100 border border-slate-200 text-xs">
          <span className="text-slate-700">
            Want to inspect live incoming webhook payloads, timestamps, and error
            logs?
          </span>
          <button
            type="button"
            onClick={onOpenWebhookHealth}
            className="inline-flex items-center gap-1.5 font-bold text-indigo-700 hover:text-indigo-900 cursor-pointer"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Open Webhook Health Visualizer</span>
          </button>
        </div>
      )}
    </div>
  );
};
