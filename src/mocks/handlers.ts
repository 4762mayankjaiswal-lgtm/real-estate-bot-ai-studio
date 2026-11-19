import { http, HttpResponse, bypass } from 'msw';

export interface MswMockDatabase {
  masterAdminKey: string;
  portalSettings: {
    brandName: string;
    tagline: string;
    whatsappNumber: string;
    calendlyUrl: string;
    notificationEmail: string;
    backendUrl: string;
    requireLicenseLock: boolean;
  };
  licenses: any[];
  enquiries: any[];
  inboundWebsiteLeads: any[];
  workspace: {
    employees?: any[];
    humanAgents?: any[];
    properties?: any[];
    leads?: any[];
    reminders?: any[];
    scheduledMeetings?: any[];
    updatedAt?: string;
  };
  vaultEntries: Record<string, { configured: boolean; masked: string }>;
  vaultConfigs: Record<string, any>;
  llmSettings: {
    provider: string;
    model: string;
    hasCustomKey: boolean;
    maskedKey: string;
    baseUrl: string;
  };
}

const MSW_STORAGE_KEY = 'atelier_msw_dynamic_db_v1';

export function loadMswDb(): MswMockDatabase {
  try {
    const raw = localStorage.getItem(MSW_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // ignore storage parse errors
  }

  const initial: MswMockDatabase = {
    masterAdminKey: 'ADMIN-ESTATE-2026',
    portalSettings: {
      brandName: 'Atelier Estate AI',
      tagline: 'Autonomous 24/7 Real Estate AI Workforce & Omnichannel CRM',
      whatsappNumber: '',
      calendlyUrl: '',
      notificationEmail: 'khushi4762@gmail.com',
      backendUrl: typeof window !== 'undefined' ? window.location.origin : '',
      requireLicenseLock: true,
    },
    licenses: [],
    enquiries: [],
    inboundWebsiteLeads: [],
    workspace: {},
    vaultEntries: {},
    vaultConfigs: {},
    llmSettings: {
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      hasCustomKey: false,
      maskedKey: '',
      baseUrl: '',
    },
  };
  saveMswDb(initial);
  return initial;
}

export function saveMswDb(db: MswMockDatabase): void {
  try {
    localStorage.setItem(MSW_STORAGE_KEY, JSON.stringify(db));
  } catch {
    // ignore storage quota errors
  }
}

function maskValue(val: string): string {
  const clean = (val || '').trim();
  if (!clean) return '';
  if (clean.length <= 8) return '••••••••';
  return `${clean.slice(0, 4)}••••${clean.slice(-4)}`;
}

/**
 * Attempts to forward the request to the live Express backend first.
 * If the route is missing (404), the server is unreachable, or Force Mock Mode is active,
 * returns null so the MSW handler can dynamically process the request.
 */
async function tryLiveBackendFirst(request: Request): Promise<Response | null> {
  try {
    if (
      typeof window !== 'undefined' &&
      localStorage.getItem('atelier_force_msw_mock') === 'true'
    ) {
      return null;
    }

    const cloned = request.clone();
    const method = cloned.method.toUpperCase();
    const bodyText =
      method !== 'GET' && method !== 'HEAD' ? await cloned.text() : undefined;

    const bypassedRequest = bypass(
      new Request(cloned.url, {
        method,
        headers: cloned.headers,
        body: bodyText,
      })
    );
    const response = await fetch(bypassedRequest);

    // Fall back to MSW if the backend route is missing (404) or experiencing a gateway/server failure (502/503/504)
    if (
      response.status === 404 ||
      response.status === 502 ||
      response.status === 503 ||
      response.status === 504
    ) {
      return null;
    }

    return response;
  } catch {
    // Network error / backend server not running -> let MSW handle dynamically
    return null;
  }
}

export const handlers = [
  // 1. Public Portal Configuration
  http.get('/api/public/portal-config', async ({ request }) => {
    const live = await tryLiveBackendFirst(request);
    if (live) return live;

    const db = loadMswDb();
    return HttpResponse.json({
      ok: true,
      mockHandled: true,
      settings: db.portalSettings,
    });
  }),

  // 2. Public B2B Enquiry Submission
  http.post('/api/public/b2b-enquiry', async ({ request }) => {
    const live = await tryLiveBackendFirst(request);
    if (live) return live;

    const body = (await request.json().catch(() => ({}))) as Record<string, any>;
    const {
      agencyName,
      contactName,
      email,
      phone,
      teamSize,
      monthlyLeads,
      message,
      source,
    } = body;

    if (!contactName || !email || !phone) {
      return HttpResponse.json(
        {
          ok: false,
          error: 'Please provide your name, work email, and phone/WhatsApp number.',
        },
        { status: 400 }
      );
    }

    const db = loadMswDb();
    const newEnquiry = {
      id: `enq_${Date.now()}`,
      agencyName: String(agencyName || 'Real Estate Brokerage').trim(),
      contactName: String(contactName).trim(),
      email: String(email).trim(),
      phone: String(phone).trim(),
      teamSize: String(teamSize || '6-15 Agents').trim(),
      monthlyLeads: String(monthlyLeads || '100-500 Leads/mo').trim(),
      message: String(
        message || 'Interested in deploying the 24/7 AI Real Estate Workforce.'
      ).trim(),
      source: String(source || 'Public Landing Page').trim(),
      status: 'NEW',
      emailAlertStatus: 'Saved via MSW Fallback Store',
      createdAt: new Date().toISOString(),
    };

    db.enquiries = [newEnquiry, ...db.enquiries];

    const syncedLead = {
      id: `enq-lead-${newEnquiry.id}`,
      name: `${newEnquiry.contactName} (${newEnquiry.agencyName})`,
      email: newEnquiry.email,
      phone: newEnquiry.phone,
      source: newEnquiry.source,
      budget: newEnquiry.monthlyLeads,
      timeline: 'Immediate',
      propertyInterest: `${newEnquiry.agencyName} · ${newEnquiry.teamSize}`,
      qualificationScore: 95,
      status: 'AI Qualified',
      assignedEmployeeId: 'elena',
      notes: `Landing Page Enquiry: "${newEnquiry.message}" (${newEnquiry.teamSize}, ${newEnquiry.monthlyLeads})`,
      websiteDomain: newEnquiry.source,
      receivedAtIso: newEnquiry.createdAt,
    };

    db.inboundWebsiteLeads = [syncedLead, ...db.inboundWebsiteLeads];
    saveMswDb(db);

    return HttpResponse.json({
      ok: true,
      mockHandled: true,
      enquiry: newEnquiry,
      lead: syncedLead,
      emailAlertStatus: newEnquiry.emailAlertStatus,
      whatsappNumber: db.portalSettings.whatsappNumber,
      calendlyUrl: db.portalSettings.calendlyUrl,
      notificationEmail: db.portalSettings.notificationEmail,
    });
  }),

  // 3. Public Built-In Strategy Call Booking
  http.post('/api/public/book-strategy-call', async ({ request }) => {
    const live = await tryLiveBackendFirst(request);
    if (live) return live;

    const body = (await request.json().catch(() => ({}))) as Record<string, any>;
    const { enquiryId, email, dateStr, timeSlot } = body;

    if (!dateStr || !timeSlot) {
      return HttpResponse.json(
        {
          ok: false,
          error: 'Please select both a preferred date and time slot for your call.',
        },
        { status: 400 }
      );
    }

    const db = loadMswDb();
    const slotLabel = `${dateStr} at ${timeSlot}`;
    db.enquiries = db.enquiries.map((e) =>
      e.id === enquiryId ||
      (email && String(e.email).toLowerCase() === String(email).toLowerCase())
        ? {
            ...e,
            status: 'CALL_SCHEDULED',
            message: `${e.message} | 📅 Booked Strategy Call: ${slotLabel}`,
          }
        : e
    );
    saveMswDb(db);

    return HttpResponse.json({
      ok: true,
      mockHandled: true,
      slotLabel,
      ownerEmail: db.portalSettings.notificationEmail,
      whatsappNumber: db.portalSettings.whatsappNumber,
    });
  }),

  // 4. License & Admin Authentication
  http.post('/api/auth/verify-license', async ({ request }) => {
    const live = await tryLiveBackendFirst(request);
    if (live) return live;

    const body = (await request.json().catch(() => ({}))) as Record<string, any>;
    const cleanKey = String(body.licenseKey || '').trim();
    const cleanEmail = String(body.email || '')
      .trim()
      .toLowerCase();

    if (!cleanKey) {
      return HttpResponse.json(
        { ok: false, error: 'Please enter your License Key.' },
        { status: 400 }
      );
    }

    const db = loadMswDb();

    if (cleanKey === db.masterAdminKey) {
      const session = {
        role: 'ADMIN' as const,
        agencyName: `${db.portalSettings.brandName} (Admin)`,
        clientName: 'Brokerage Owner',
        clientEmail: cleanEmail || db.portalSettings.notificationEmail,
        licenseKey: cleanKey,
        planTier: 'Enterprise',
      };
      return HttpResponse.json({
        ok: true,
        mockHandled: true,
        role: 'ADMIN',
        token: `msw_token_${Date.now()}`,
        session,
      });
    }

    const matched = db.licenses.find(
      (lic) => String(lic.licenseKey).toUpperCase() === cleanKey.toUpperCase()
    );

    if (!matched) {
      return HttpResponse.json(
        {
          ok: false,
          error:
            'Invalid License Key. Book a strategy call and complete payment to receive your activation key.',
        },
        { status: 401 }
      );
    }

    if (matched.status !== 'ACTIVE') {
      return HttpResponse.json(
        {
          ok: false,
          error: 'This License Key has been suspended by the administrator.',
        },
        { status: 403 }
      );
    }

    const session = {
      role: 'CLIENT' as const,
      agencyName: matched.agencyName,
      clientName: matched.clientName,
      clientEmail: matched.clientEmail,
      licenseKey: matched.licenseKey,
      planTier: matched.planTier,
    };

    return HttpResponse.json({
      ok: true,
      mockHandled: true,
      role: 'CLIENT',
      token: `msw_client_${Date.now()}`,
      session,
    });
  }),

  // 5. Admin Portal Data, License Generation & Settings
  http.get('/api/admin/portal-data', async ({ request }) => {
    const live = await tryLiveBackendFirst(request);
    if (live) return live;

    const db = loadMswDb();
    return HttpResponse.json({
      ok: true,
      mockHandled: true,
      masterAdminKey: db.masterAdminKey,
      settings: db.portalSettings,
      licenses: db.licenses,
      enquiries: db.enquiries,
    });
  }),

  http.post('/api/admin/settings', async ({ request }) => {
    const live = await tryLiveBackendFirst(request);
    if (live) return live;

    const body = (await request.json().catch(() => ({}))) as Record<string, any>;
    const db = loadMswDb();
    if (body.settings) {
      db.portalSettings = { ...db.portalSettings, ...body.settings };
    }
    if (body.masterAdminKey && String(body.masterAdminKey).trim()) {
      db.masterAdminKey = String(body.masterAdminKey).trim();
    }
    saveMswDb(db);

    return HttpResponse.json({
      ok: true,
      mockHandled: true,
      settings: db.portalSettings,
      masterAdminKey: db.masterAdminKey,
    });
  }),

  http.post('/api/admin/licenses/create', async ({ request }) => {
    const live = await tryLiveBackendFirst(request);
    if (live) return live;

    const body = (await request.json().catch(() => ({}))) as Record<string, any>;
    const db = loadMswDb();
    const randBlock = () =>
      Math.random().toString(36).substring(2, 6).toUpperCase();
    const generatedKey = `ESTATE-PRO-${randBlock()}-${randBlock()}`;

    const newLicense = {
      id: `lic_${Date.now()}`,
      agencyName: String(body.agencyName || 'Client Brokerage').trim(),
      clientName: String(body.clientName || 'Agency Owner').trim(),
      clientEmail: String(body.clientEmail || 'owner@agency.com').trim(),
      licenseKey: generatedKey,
      planTier: body.planTier || 'Growth',
      billingCycle: body.billingCycle || 'Monthly',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86400000 * 365).toISOString(),
      notes: body.notes || '',
    };

    db.licenses = [newLicense, ...db.licenses];
    if (body.enquiryId) {
      db.enquiries = db.enquiries.map((e) =>
        e.id === body.enquiryId
          ? { ...e, status: 'PAID_UNLOCKED', issuedLicenseKey: generatedKey }
          : e
      );
    }
    saveMswDb(db);

    return HttpResponse.json({
      ok: true,
      mockHandled: true,
      license: newLicense,
      licenses: db.licenses,
      enquiries: db.enquiries,
      emailDeliveryNote: 'Saved in MSW Fallback Store',
    });
  }),

  http.post('/api/admin/licenses/toggle', async ({ request }) => {
    const live = await tryLiveBackendFirst(request);
    if (live) return live;

    const body = (await request.json().catch(() => ({}))) as Record<string, any>;
    const db = loadMswDb();
    if (body.action === 'DELETE') {
      db.licenses = db.licenses.filter((l) => l.id !== body.licenseId);
    } else {
      db.licenses = db.licenses.map((l) =>
        l.id === body.licenseId
          ? { ...l, status: l.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' }
          : l
      );
    }
    saveMswDb(db);

    return HttpResponse.json({
      ok: true,
      mockHandled: true,
      licenses: db.licenses,
    });
  }),

  http.post('/api/admin/enquiries/status', async ({ request }) => {
    const live = await tryLiveBackendFirst(request);
    if (live) return live;

    const body = (await request.json().catch(() => ({}))) as Record<string, any>;
    const db = loadMswDb();
    db.enquiries = db.enquiries.map((e) =>
      e.id === body.enquiryId ? { ...e, status: body.status } : e
    );
    saveMswDb(db);

    return HttpResponse.json({
      ok: true,
      mockHandled: true,
      enquiries: db.enquiries,
    });
  }),

  // 6. Brokerage Workspace State Persistence
  http.get('/api/brokerage/workspace', async ({ request }) => {
    const live = await tryLiveBackendFirst(request);
    if (live) return live;

    const db = loadMswDb();
    return HttpResponse.json({
      ok: true,
      mockHandled: true,
      workspace: db.workspace || null,
    });
  }),

  http.post('/api/brokerage/workspace', async ({ request }) => {
    const live = await tryLiveBackendFirst(request);
    if (live) return live;

    const body = (await request.json().catch(() => ({}))) as Record<string, any>;
    const db = loadMswDb();
    db.workspace = {
      ...db.workspace,
      ...body,
      updatedAt: new Date().toISOString(),
    };
    saveMswDb(db);

    return HttpResponse.json({
      ok: true,
      mockHandled: true,
      updatedAt: db.workspace.updatedAt,
    });
  }),

  // 7. Vault & Connected Apps Endpoints
  http.get('/api/vault/status', async ({ request }) => {
    const live = await tryLiveBackendFirst(request);
    if (live) return live;

    const db = loadMswDb();
    return HttpResponse.json({
      ok: true,
      mockHandled: true,
      entries: db.vaultEntries,
      configs: db.vaultConfigs,
      llm: db.llmSettings,
    });
  }),

  http.post('/api/vault/llm', async ({ request }) => {
    const live = await tryLiveBackendFirst(request);
    if (live) return live;

    const body = (await request.json().catch(() => ({}))) as Record<string, any>;
    const db = loadMswDb();
    const apiKey = String(body.apiKey || '').trim();
    db.llmSettings = {
      provider: body.provider || db.llmSettings.provider || 'gemini',
      model: body.model || db.llmSettings.model || 'gemini-2.5-flash',
      hasCustomKey: Boolean(apiKey) || db.llmSettings.hasCustomKey,
      maskedKey: apiKey ? maskValue(apiKey) : db.llmSettings.maskedKey,
      baseUrl: body.baseUrl || '',
    };
    saveMswDb(db);

    return HttpResponse.json({
      ok: true,
      mockHandled: true,
      llm: db.llmSettings,
    });
  }),

  http.post('/api/channels/verify-and-save', async ({ request }) => {
    const live = await tryLiveBackendFirst(request);
    if (live) return live;

    const body = (await request.json().catch(() => ({}))) as Record<string, any>;
    const { toolId, accountHandle, webhookUrl, secrets } = body;
    const db = loadMswDb();

    const cleanWebhook = String(webhookUrl || '').trim();
    const hasRealSecret =
      secrets &&
      typeof secrets === 'object' &&
      Object.entries(secrets).some(
        ([k, v]) =>
          k !== 'EASY_BRIDGE_MODE' &&
          typeof v === 'string' &&
          v.trim().length > 0
      );

    if (
      toolId !== 'website_leads' &&
      !hasRealSecret &&
      !cleanWebhook.startsWith('http')
    ) {
      return HttpResponse.json(
        {
          ok: false,
          error: `Cannot mark ${String(
            toolId || 'app'
          ).toUpperCase()} as Connected without a valid API Key/Token, QR Instance credential, or a live Outbound Webhook URL (https://...).`,
        },
        { status: 400 }
      );
    }

    const cleanHandle = String(accountHandle || '').trim();
    if (!cleanHandle && toolId !== 'website_leads') {
      return HttpResponse.json(
        {
          ok: false,
          error: `Please enter your real ${String(
            toolId || 'channel'
          ).toUpperCase()} account handle or phone number before connecting.`,
        },
        { status: 400 }
      );
    }
    if (cleanWebhook.includes('/api/webhooks/')) {
      return HttpResponse.json(
        {
          ok: false,
          error:
            'Please paste your external Make.com / n8n / Zapier Outbound Webhook URL (not your CRM Inbound URL).',
        },
        { status: 400 }
      );
    }

    if (secrets && typeof secrets === 'object') {
      for (const [k, v] of Object.entries(secrets)) {
        if (
          k !== 'EASY_BRIDGE_MODE' &&
          typeof v === 'string' &&
          v.trim()
        ) {
          db.vaultEntries[k] = {
            configured: true,
            masked: maskValue(v),
          };
        }
      }
    }

    const existingAccounts = Array.isArray(db.vaultConfigs[toolId]?.accounts)
      ? db.vaultConfigs[toolId].accounts
      : [];
    const newAcct = {
      id: `acct_${toolId}_${Date.now()}`,
      label: cleanHandle,
      accountHandle: cleanHandle,
      webhookUrl: cleanWebhook,
      isPrimary: true,
      verifiedDetail: `Connected via MSW Fallback Layer (${cleanHandle})`,
      createdAt: new Date().toISOString(),
    };
    const mergedAccounts = [
      newAcct,
      ...existingAccounts.map((a: any) => ({ ...a, isPrimary: false })),
    ];

    db.vaultConfigs[toolId] = {
      accountHandle: cleanHandle,
      webhookUrl: cleanWebhook,
      verified: true,
      verifiedDetail: newAcct.verifiedDetail,
      updatedAt: new Date().toISOString(),
      accounts: mergedAccounts,
    };

    if (toolId === 'whatsapp' && !db.portalSettings.whatsappNumber) {
      db.portalSettings.whatsappNumber = cleanHandle.replace(/[^0-9+]/g, '');
    }

    saveMswDb(db);

    return HttpResponse.json({
      ok: true,
      mockHandled: true,
      verifiedHandle: cleanHandle,
      verificationMessage: newAcct.verifiedDetail,
      accounts: mergedAccounts,
      entries: db.vaultEntries,
      configs: db.vaultConfigs,
    });
  }),

  http.delete('/api/vault/channel/:toolId', async ({ request, params }) => {
    const live = await tryLiveBackendFirst(request);
    if (live) return live;

    const toolId = String(params.toolId || '');
    const db = loadMswDb();
    delete db.vaultConfigs[toolId];
    saveMswDb(db);

    return HttpResponse.json({
      ok: true,
      mockHandled: true,
      entries: db.vaultEntries,
      configs: db.vaultConfigs,
    });
  }),

  // 8. Email Provider Verification & Dispatch Fallbacks
  http.post('/api/email/verify-provider', async ({ request }) => {
    const live = await tryLiveBackendFirst(request);
    if (live) return live;

    const body = (await request.json().catch(() => ({}))) as Record<string, any>;
    const provider = body.provider === 'brevo' ? 'brevo' : 'resend';
    const fromEmail = String(
      body.fromEmail || 'onboarding@resend.dev'
    ).trim();
    const apiKey = String(body.apiKey || '').trim();

    const db = loadMswDb();
    const keyName = provider === 'resend' ? 'RESEND_API_KEY' : 'BREVO_API_KEY';
    if (apiKey) {
      db.vaultEntries[keyName] = {
        configured: true,
        masked: maskValue(apiKey),
      };
    }

    const handleDisplay = `${fromEmail} (${
      provider === 'resend' ? 'Resend' : 'Brevo'
    })`;
    const newAcct = {
      id: `acct_${provider}_${Date.now()}`,
      label: handleDisplay,
      accountHandle: handleDisplay,
      webhookUrl: '',
      isPrimary: true,
      verifiedDetail: `Verified via MSW Fallback (${handleDisplay})`,
      createdAt: new Date().toISOString(),
    };

    db.vaultConfigs['gmail'] = {
      accountHandle: handleDisplay,
      webhookUrl: '',
      verified: true,
      verifiedDetail: newAcct.verifiedDetail,
      updatedAt: new Date().toISOString(),
      accounts: [newAcct],
    };
    saveMswDb(db);

    return HttpResponse.json({
      ok: true,
      mockHandled: true,
      provider,
      email: handleDisplay,
      senderEmail: fromEmail,
      accounts: [newAcct],
      detail: newAcct.verifiedDetail,
    });
  }),

  http.post('/api/email/verify-smtp', async ({ request }) => {
    const live = await tryLiveBackendFirst(request);
    if (live) return live;

    const body = (await request.json().catch(() => ({}))) as Record<string, any>;
    const cleanEmail = String(body.email || 'brokerage@gmail.com').trim();
    const db = loadMswDb();
    db.vaultEntries['GMAIL_SMTP_APP_PASSWORD'] = {
      configured: true,
      masked: '•••• •••• •••• ••••',
    };
    const newAcct = {
      id: `acct_smtp_${Date.now()}`,
      label: `Gmail SMTP (${cleanEmail})`,
      accountHandle: cleanEmail,
      webhookUrl: '',
      isPrimary: true,
      verifiedDetail: `Verified via MSW Fallback (${cleanEmail})`,
      createdAt: new Date().toISOString(),
    };
    db.vaultConfigs['gmail'] = {
      accountHandle: cleanEmail,
      webhookUrl: '',
      verified: true,
      verifiedDetail: newAcct.verifiedDetail,
      updatedAt: new Date().toISOString(),
      accounts: [newAcct],
    };
    saveMswDb(db);

    return HttpResponse.json({
      ok: true,
      mockHandled: true,
      email: cleanEmail,
      accounts: [newAcct],
      detail: newAcct.verifiedDetail,
    });
  }),

  http.post('/api/email/send-smtp', async ({ request }) => {
    const live = await tryLiveBackendFirst(request);
    if (live) return live;

    const body = (await request.json().catch(() => ({}))) as Record<string, any>;
    const db = loadMswDb();
    const fromAddr =
      db.vaultConfigs['gmail']?.accountHandle || 'noreply@atelierestate.ai';

    return HttpResponse.json({
      ok: true,
      mockHandled: true,
      id: `msw_email_${Date.now()}`,
      from: fromAddr,
      to: body.to,
      provider: 'msw-fallback',
    });
  }),

  // 9. Website Leads & Inbound Channel Webhook
  http.get('/api/webhooks/website-leads', async ({ request }) => {
    const live = await tryLiveBackendFirst(request);
    if (live) return live;

    const db = loadMswDb();
    return HttpResponse.json({
      ok: true,
      mockHandled: true,
      leads: db.inboundWebsiteLeads,
    });
  }),

  http.post('/api/webhooks/website-leads', async ({ request }) => {
    const live = await tryLiveBackendFirst(request);
    if (live) return live;

    const body = (await request.json().catch(() => ({}))) as Record<string, any>;
    const db = loadMswDb();
    const newLead = {
      id: `web-lead-${Date.now()}`,
      name: String(body.name || 'Website Visitor').trim(),
      email: String(body.email || 'visitor@example.com').trim(),
      phone: String(body.phone || '+1 (555) 019-2831').trim(),
      source: String(body.source || 'Agency Website').trim(),
      budget: String(body.budget || '$5,000,000').trim(),
      timeline: String(body.timeline || 'Immediate').trim(),
      propertyInterest: String(
        body.propertyInterest || 'Portfolio Inquiry'
      ).trim(),
      qualificationScore: 94,
      status: 'AI Qualified',
      assignedEmployeeId: 'marcus',
      notes: String(
        body.notes || 'Captured via Inbound Website Webhook (MSW Fallback).'
      ).trim(),
      websiteDomain: String(body.websiteDomain || 'Agency Website').trim(),
      receivedAtIso: new Date().toISOString(),
    };

    db.inboundWebsiteLeads = [newLead, ...db.inboundWebsiteLeads];
    saveMswDb(db);

    return HttpResponse.json({
      ok: true,
      mockHandled: true,
      lead: newLead,
    });
  }),

  http.post('/api/webhooks/inbound/:channelId', async ({ request }) => {
    const live = await tryLiveBackendFirst(request);
    if (live) return live;

    const body = (await request.json().catch(() => ({}))) as Record<string, any>;
    const cleanName = String(
      body.name || body.fullName || body.full_name || body?.data?.pushname || ''
    ).trim();
    const cleanEmail = String(body.email || '').trim();
    const cleanPhone = String(
      body.phone || body.phone_number || body?.data?.from || ''
    ).trim();

    if (!cleanName && !cleanEmail && !cleanPhone) {
      return HttpResponse.json(
        {
          ok: false,
          error:
            'Webhook lead payload must include at least name, email, or phone.',
        },
        { status: 400 }
      );
    }

    const db = loadMswDb();
    const newLead = {
      id: `web-lead-${Date.now()}`,
      name: cleanName || 'Inbound Lead',
      email: cleanEmail || 'visitor@example.com',
      phone: cleanPhone || 'Not provided',
      source: String(body.source || 'Omnichannel Webhook').trim(),
      budget: String(body.budget || '$5,000,000').trim(),
      timeline: String(body.timeline || 'Immediate').trim(),
      propertyInterest: String(
        body.propertyInterest || 'Portfolio Inquiry'
      ).trim(),
      qualificationScore: 94,
      status: 'AI Qualified',
      assignedEmployeeId: 'marcus',
      notes: String(body.notes || 'Captured via Inbound Webhook.').trim(),
      websiteDomain: String(body.websiteDomain || 'Webhook').trim(),
      receivedAtIso: new Date().toISOString(),
    };

    db.inboundWebsiteLeads = [newLead, ...db.inboundWebsiteLeads];
    saveMswDb(db);

    return HttpResponse.json({
      ok: true,
      mockHandled: true,
      lead: newLead,
    });
  }),

  http.get('/api/webhooks/health', async ({ request }) => {
    const live = await tryLiveBackendFirst(request);
    if (live) return live;

    const db = loadMswDb();
    const latestLead = db.inboundWebsiteLeads[0];
    return HttpResponse.json({
      ok: true,
      mockHandled: true,
      lastReceivedAtIso: latestLead?.receivedAtIso || null,
      lastErrorAtIso: null,
      totalInboundReceived: db.inboundWebsiteLeads.length,
      totalInboundRejected: 0,
      totalOutboundDispatched: 0,
      totalOutboundFailed: 0,
      diagnostics: [],
      recentLogs: [],
    });
  }),

  http.post('/api/webhooks/health/clear', async ({ request }) => {
    const live = await tryLiveBackendFirst(request);
    if (live) return live;
    return HttpResponse.json({ ok: true, mockHandled: true });
  }),

  // 10. Calendar Master Schedule & Agent Booking Fallback
  http.get('/api/calendar/master-schedule', async ({ request }) => {
    const live = await tryLiveBackendFirst(request);
    if (live) return live;

    const db = loadMswDb();
    return HttpResponse.json({
      ok: true,
      mockHandled: true,
      meetings: db.workspace?.scheduledMeetings || [],
    });
  }),

  http.post('/api/calendar/book-agent-meeting', async ({ request }) => {
    const live = await tryLiveBackendFirst(request);
    if (live) return live;

    const body = (await request.json().catch(() => ({}))) as Record<string, any>;
    const db = loadMswDb();
    const meeting = {
      id: `mtg_${Date.now()}`,
      title: body.title || 'Property Showing',
      startIso: body.startIso || new Date(Date.now() + 86400000).toISOString(),
      endIso:
        body.endIso || new Date(Date.now() + 86400000 + 2700000).toISOString(),
      durationMinutes: Number(body.durationMinutes) || 45,
      agentId: body.agentId || 'ha-1',
      agentName: body.agentName || 'Assigned Agent',
      agentEmail: body.agentEmail || 'agent@atelierestate.com',
      calendarId: body.agentEmail || 'agent@atelierestate.com',
      leadId: body.leadId,
      leadName: body.leadName || 'Client Lead',
      leadEmail: body.leadEmail || 'client@example.com',
      propertyTitle: body.propertyTitle || 'Luxury Residence',
      source: 'Master Schedule (.ics Invite)',
      htmlLink: `mailto:${encodeURIComponent(
        body.agentEmail || ''
      )}?subject=${encodeURIComponent(body.title || 'Showing Invite')}`,
    };

    const existing = Array.isArray(db.workspace?.scheduledMeetings)
      ? db.workspace.scheduledMeetings
      : [];
    db.workspace = {
      ...db.workspace,
      scheduledMeetings: [meeting, ...existing],
      updatedAt: new Date().toISOString(),
    };
    saveMswDb(db);

    return HttpResponse.json({
      ok: true,
      mockHandled: true,
      meeting,
      htmlLink: meeting.htmlLink,
      dispatchedSummary: `Booked on Master Schedule & prepared .ics invite for ${meeting.agentName} (${meeting.agentEmail})`,
    });
  }),

  // 11. AI Model Discovery, Chat & Lead Analysis Fallback
  http.post('/api/ai/discover-models', async ({ request }) => {
    const live = await tryLiveBackendFirst(request);
    if (live) return live;

    const body = (await request.json().catch(() => ({}))) as Record<string, any>;
    const provider = String(body.preferredProvider || 'gemini');
    const catalog: Record<string, string[]> = {
      gemini: ['gemini-2.5-flash', 'gemini-2.5-pro'],
      openai: ['gpt-4o-mini', 'gpt-4o'],
      anthropic: ['claude-3-7-sonnet-latest', 'claude-3-5-haiku-latest'],
      groq: ['llama-3.3-70b-versatile'],
      deepseek: ['deepseek-chat'],
    };

    return HttpResponse.json({
      ok: true,
      mockHandled: true,
      detectedProvider: provider,
      models: catalog[provider] || ['gemini-2.5-flash'],
    });
  }),

  http.post('/api/ai/chat', async ({ request }) => {
    const live = await tryLiveBackendFirst(request);
    if (live) return live;

    const body = (await request.json().catch(() => ({}))) as Record<string, any>;
    const empName = body.employee?.name || 'Elena Vance';
    const empRole = body.employee?.role || 'AI Specialist';
    const userMessage = String(body.message || '').trim();

    return HttpResponse.json({
      ok: true,
      mockHandled: true,
      providerUsed: 'MSW Dev Fallback Engine',
      reply: `[${empName} · ${empRole}] Processed your request ("${userMessage}"). All CRM leads, properties, and human agent schedules are synced in your active workspace.`,
      suggestedAction: {
        actionType: 'NONE',
        summary: 'Processed via MSW Fallback Layer',
      },
    });
  }),

  http.post('/api/ai/analyze-lead', async ({ request }) => {
    const live = await tryLiveBackendFirst(request);
    if (live) return live;

    const body = (await request.json().catch(() => ({}))) as Record<string, any>;
    const lead = body.lead || {};

    return HttpResponse.json({
      ok: true,
      mockHandled: true,
      analysis: {
        sentiment: 'Hot',
        sentimentScore: lead.qualificationScore || 92,
        engagementSummary: `${
          lead.name || 'This buyer'
        } shows strong acquisition intent for ${
          lead.propertyInterest || 'your active listing'
        } with a budget of ${lead.budget || '$5M+'} and timeline "${
          lead.timeline || 'Immediate'
        }".`,
        keySignals: [
          `Verified interest in ${lead.propertyInterest || 'luxury portfolio'}`,
          `Confirmed budget range (${lead.budget || 'Qualified'})`,
          `Ready for private showing coordination`,
        ],
        recommendedNextSteps: [
          {
            step: `Schedule private showing for ${
              lead.propertyInterest || 'the property'
            } and dispatch .ics invite to assigned Human Agent`,
            channel: 'Calendar',
            priority: 'Immediate',
            rationale:
              'High-intent buyer ready to tour; fast calendar confirmation maximizes conversion.',
          },
          {
            step: `Send private floorplan dossier to ${
              lead.email || 'buyer email'
            }`,
            channel: 'Email',
            priority: 'Today',
            rationale:
              'Provides architectural specs ahead of the scheduled showing.',
          },
        ],
        analyzedChatLogCount: 4,
        analyzedEmailCount: 2,
        generatedAt: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      },
    });
  }),
];
