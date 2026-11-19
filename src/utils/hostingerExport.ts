export interface HostingerExportConfig {
  brandName: string;
  tagline: string;
  backendUrl: string;
  whatsappNumber: string;
  calendlyUrl: string;
}

export function generateHostingerHtmlBundle(config: HostingerExportConfig): string {
  const cleanBackend = (config.backendUrl || window.location.origin).replace(/\/+$/, '');
  const cleanWa = (config.whatsappNumber || '').replace(/[^0-9]/g, '');
  const brand = config.brandName || 'Atelier Estate AI';
  const tagline =
    config.tagline || 'Autonomous Real Estate AI Workforce & Brokerage Operating System';
  const calendly = config.calendlyUrl && config.calendlyUrl !== 'https://calendly.com' ? config.calendlyUrl : '';

  return `<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${brand} — ${tagline}</title>
  <meta name="description" content="Convert inbound real estate inquiries from WhatsApp, Instagram, and your Website into conflict-checked property showings in 8 seconds. Built for Brokerage Owners." />
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;0,700;1,600&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', sans-serif; background-color: #FAF9F6; color: #0F172A; }
    .font-serif-display { font-family: 'Cormorant Garamond', serif; }
    .font-mono-code { font-family: 'JetBrains Mono', monospace; }
  </style>
</head>
<body class="bg-[#FAF9F6] text-slate-900 antialiased selection:bg-slate-900 selection:text-white">

  <!-- Sticky Architectural Header -->
  <header class="sticky top-0 z-50 border-b border-slate-200/80 bg-[#FAF9F6]/90 backdrop-blur-md">
    <div class="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
      <div class="flex items-center gap-3.5">
        <div class="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-serif-display font-bold text-lg shadow-sm">
          AE
        </div>
        <div>
          <span class="text-lg font-bold tracking-tight text-slate-900 block leading-none">${brand}</span>
          <span class="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500 mt-1 block">Brokerage AI Operating System</span>
        </div>
      </div>
      <nav class="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
        <a href="#workforce" class="hover:text-slate-900 transition">6 AI Employees</a>
        <a href="#agent-dispatch" class="hover:text-slate-900 transition">Owner-Driven .ics Dispatch</a>
        <a href="#delivery" class="hover:text-slate-900 transition">Onboarding & License</a>
        <a href="#enquiry-form" class="hover:text-slate-900 transition">Book Strategy Call</a>
      </nav>
      <div class="flex items-center gap-3">
        <a href="${cleanBackend}/?unlock=1" class="px-4 py-2.5 rounded-lg border border-slate-300 hover:border-slate-900 bg-white text-xs font-semibold text-slate-900 transition">
          Client Sign In
        </a>
        <a href="#enquiry-form" class="px-5 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs tracking-wide transition shadow-sm">
          Book Onboarding Call →
        </a>
      </div>
    </div>
  </header>

  <!-- Hero Section -->
  <section class="relative overflow-hidden pt-16 pb-24 border-b border-slate-200/80">
    <div class="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
      <div class="lg:col-span-7 space-y-6">
        <div class="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-md bg-white border border-slate-200 text-slate-700 text-xs font-semibold uppercase tracking-wide shadow-2xs">
          <span class="w-2 h-2 rounded-full bg-emerald-600"></span>
          <span>Built for Real Estate Brokerage Owners · Zero Employee Logins Required</span>
        </div>
        <h1 class="font-serif-display text-5xl sm:text-6xl font-semibold tracking-tight text-slate-900 leading-[1.05]">
          Convert Inbound Property Inquiries Into <span class="italic font-normal text-slate-700">Confirmed Showings</span> in 8 Seconds.
        </h1>
        <p class="text-lg text-slate-600 leading-relaxed max-w-2xl">
          78% of luxury real estate commissions go to the first brokerage that responds. Deploy 6 specialized AI Employees that qualify buyers across WhatsApp, Instagram, and your Website 24/7, check your Brokerage Master Schedule for conflicts, and automatically email <strong>RFC 5545 Calendar Invites (.ics)</strong> directly to your field agents and buyers.
        </p>
        <div class="flex flex-wrap items-center gap-4 pt-2">
          <a href="#enquiry-form" class="px-7 py-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition shadow-md">
            Schedule Live Demo & Send Enquiry →
          </a>
          <a href="${cleanBackend}/?unlock=1" class="px-6 py-4 rounded-xl border border-slate-300 hover:border-slate-900 bg-white text-slate-900 font-semibold text-sm transition">
            Unlock Dashboard with License Key
          </a>
        </div>
        <div class="grid grid-cols-3 gap-6 pt-8 border-t border-slate-200 max-w-xl">
          <div>
            <div class="text-3xl font-bold text-slate-900 font-mono-code">6.8s</div>
            <div class="text-xs text-slate-500 mt-1">Avg. Omnichannel Reply</div>
          </div>
          <div class="border-l border-slate-200 pl-6">
            <div class="text-3xl font-bold text-slate-900 font-mono-code">3.4×</div>
            <div class="text-xs text-slate-500 mt-1">More Private Showings</div>
          </div>
          <div class="border-l border-slate-200 pl-6">
            <div class="text-3xl font-bold text-emerald-700 font-mono-code">100%</div>
            <div class="text-xs text-slate-500 mt-1">Direct .ics Agent Dispatch</div>
          </div>
        </div>
      </div>

      <!-- Live White SaaS Preview Card -->
      <div class="lg:col-span-5">
        <div class="rounded-2xl bg-white border border-slate-200 shadow-xl p-6 space-y-4">
          <div class="flex items-center justify-between border-b border-slate-100 pb-3">
            <span class="text-xs font-semibold uppercase tracking-wider text-slate-500">Autonomous Execution Trace</span>
            <span class="text-xs font-mono-code text-emerald-700 font-semibold">● COMPLETED IN 6.4s</span>
          </div>
          <div class="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <div class="text-xs font-bold text-slate-900">1. Elena (AI Lead Specialist) Qualified Buyer</div>
            <p class="text-xs text-slate-600">Buyer Jonathan Pierce confirmed $7M cash budget for Villa Solaris Pavilion. Requested Thursday 2:00 PM tour.</p>
          </div>
          <div class="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <div class="text-xs font-bold text-slate-900">2. Julian (Calendar Specialist) Verified Schedule</div>
            <p class="text-xs text-slate-600">Checked Brokerage Master Schedule for Senior Agent Victoria Sterling — 0 conflicts found.</p>
          </div>
          <div class="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
            <div class="text-xs font-bold text-emerald-950">3. Direct .ics Calendar Invite Emailed (Resend/Brevo)</div>
            <p class="text-xs text-emerald-900">Sent RFC 5545 calendar invite + buyer dossier directly to victoria@atelierestate.com & buyer—zero employee login required.</p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- 6 AI Employees & Owner-Centric Dispatch -->
  <section id="workforce" class="py-20 border-b border-slate-200/80 bg-white">
    <div class="max-w-7xl mx-auto px-6">
      <div class="max-w-2xl mb-12">
        <div class="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 mb-2">Inside the Brokerage Command Center</div>
        <h2 class="font-serif-display text-4xl font-semibold text-slate-900">6 Specialized AI Employees Working 24/7</h2>
        <p class="text-sm text-slate-600 mt-2">Designed for real estate agency owners—manage all inbound leads, AI qualification, and human agent showings from one unified dashboard.</p>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="p-6 rounded-2xl bg-[#FAF9F6] border border-slate-200 space-y-2">
          <div class="text-sm font-bold text-slate-900">Clara & Elena · 24/7 Lead Qualification</div>
          <p class="text-xs text-slate-600 leading-relaxed">Instantly responds to Website, WhatsApp Business, and Instagram inquiries in under 8 seconds, qualifying budget, pre-approval, and timeline.</p>
        </div>
        <div class="p-6 rounded-2xl bg-[#FAF9F6] border border-slate-200 space-y-2" id="agent-dispatch">
          <div class="text-sm font-bold text-slate-900">Julian · Direct .ics Agent Calendar Dispatch</div>
          <p class="text-xs text-slate-600 leading-relaxed">Your field agents never need to log in. Simply add their email in your roster and the system emails RFC 5545 .ics calendar invites automatically.</p>
        </div>
        <div class="p-6 rounded-2xl bg-[#FAF9F6] border border-slate-200 space-y-2">
          <div class="text-sm font-bold text-slate-900">Marcus, Maya & Aria · CRM & Drip Engine</div>
          <p class="text-xs text-slate-600 leading-relaxed">Scores lead intent from 0–100, tracks your 6-stage conversion funnel, and sends automated follow-ups via Resend, Brevo, or SMTP.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- Onboarding & License Lock -->
  <section id="delivery" class="py-20 border-b border-slate-200/80">
    <div class="max-w-7xl mx-auto px-6">
      <div class="max-w-2xl mb-12">
        <div class="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 mb-2">White-Glove Deployment Process</div>
        <h2 class="font-serif-display text-4xl font-semibold text-slate-900">How We Deploy & Unlock Your Brokerage Workspace</h2>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="p-6 rounded-2xl bg-white border border-slate-200">
          <div class="text-xs font-mono-code font-bold text-slate-900 mb-2">STEP 01</div>
          <h3 class="text-lg font-bold text-slate-900 mb-2">Submit Enquiry & Strategy Call</h3>
          <p class="text-sm text-slate-600 leading-relaxed">Fill out the enquiry form below. We hop on a 15-minute live discovery call to map your website, WhatsApp, email domain, and field agent roster.</p>
        </div>
        <div class="p-6 rounded-2xl bg-white border border-slate-200">
          <div class="text-xs font-mono-code font-bold text-slate-900 mb-2">STEP 02</div>
          <h3 class="text-lg font-bold text-slate-900 mb-2">Custom Setup & Payment</h3>
          <p class="text-sm text-slate-600 leading-relaxed">Once you select your package and complete payment on the call, our team configures your dedicated VPS/Cloud workspace and Resend/Brevo delivery.</p>
        </div>
        <div class="p-6 rounded-2xl bg-white border border-emerald-300">
          <div class="text-xs font-mono-code font-bold text-emerald-700 mb-2">STEP 03 · INSTANT UNLOCK</div>
          <h3 class="text-lg font-bold text-slate-900 mb-2">Receive Your License Key</h3>
          <p class="text-sm text-slate-600 leading-relaxed">We issue your unique <code class="font-mono-code bg-slate-100 px-1.5 py-0.5 rounded">ESTATE-PRO-XXXX</code> License Key. Click "Client Sign In" at the top of this website to unlock your dashboard.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- Enquiry Form Section -->
  <section id="enquiry-form" class="py-24 bg-white">
    <div class="max-w-3xl mx-auto px-6">
      <div class="p-8 sm:p-12 rounded-2xl bg-[#FAF9F6] border border-slate-200 shadow-lg">
        <div class="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-700 mb-2">Deploy In Your Brokerage</div>
        <h2 class="font-serif-display text-3xl sm:text-4xl font-semibold text-slate-900 mb-2">Send Enquiry & Book Your Onboarding Call</h2>
        <p class="text-sm text-slate-600 mb-8">Submit your brokerage details below. Our team will connect with you on call/WhatsApp to walk you through the platform and issue your Client License Key.</p>

        <form id="b2bForm" class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">Real Estate Brokerage Name *</label>
              <input type="text" id="agencyName" required placeholder="e.g., Prestige Luxury Realty" class="w-full px-4 py-3 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 focus:border-slate-900 focus:outline-none" />
            </div>
            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">Your Full Name (Owner / Partner) *</label>
              <input type="text" id="contactName" required placeholder="e.g., Vikram Mehta" class="w-full px-4 py-3 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 focus:border-slate-900 focus:outline-none" />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">Work Email *</label>
              <input type="email" id="email" required placeholder="owner@youragency.com" class="w-full px-4 py-3 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 focus:border-slate-900 focus:outline-none" />
            </div>
            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">Phone / WhatsApp Number *</label>
              <input type="tel" id="phone" required placeholder="+91 98765 43210 / +1 555 234 5678" class="w-full px-4 py-3 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 focus:border-slate-900 focus:outline-none" />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">Number of Field Agents</label>
              <select id="teamSize" class="w-full px-4 py-3 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 focus:border-slate-900 focus:outline-none">
                <option value="1-5 Agents">1 - 5 Field Agents</option>
                <option value="6-15 Agents" selected>6 - 15 Field Agents</option>
                <option value="16-50 Agents">16 - 50 Field Agents</option>
                <option value="50+ Enterprise">50+ Agents (Enterprise)</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">Monthly Inbound Lead Volume</label>
              <select id="monthlyLeads" class="w-full px-4 py-3 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 focus:border-slate-900 focus:outline-none">
                <option value="Under 100 Leads/mo">Under 100 Leads / month</option>
                <option value="100-500 Leads/mo" selected>100 - 500 Leads / month</option>
                <option value="500-2,000 Leads/mo">500 - 2,000 Leads / month</option>
                <option value="2,000+ Leads/mo">2,000+ Leads / month</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">Which Channels Do You Want to Automate?</label>
            <textarea id="message" rows="3" placeholder="Tell us about your website, WhatsApp, Instagram, or human agent roster..." class="w-full px-4 py-3 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"></textarea>
          </div>

          <button type="submit" id="submitBtn" class="w-full py-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm tracking-wide transition shadow-md cursor-pointer">
            Submit Enquiry & Book Strategy Call →
          </button>
        </form>

        <!-- Post-Submission Instant Call & WhatsApp Box -->
        <div id="successBox" class="hidden mt-6 p-6 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-4">
          <div class="text-slate-900 font-bold text-base">✅ Enquiry Logged! Select Your Preferred Strategy Call Date & Time Slot Below:</div>
          <form id="callSlotForm" class="p-4 rounded-xl bg-white border border-emerald-200 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <label class="block text-[11px] font-semibold text-slate-600 mb-1">Preferred Date</label>
              <input type="date" id="callDateStr" required class="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900" />
            </div>
            <div>
              <label class="block text-[11px] font-semibold text-slate-600 mb-1">Preferred Time Slot</label>
              <select id="callTimeSlot" class="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 bg-white">
                <option value="10:00 AM">10:00 AM</option>
                <option value="11:00 AM" selected>11:00 AM</option>
                <option value="02:00 PM">02:00 PM</option>
                <option value="04:00 PM">04:00 PM</option>
                <option value="06:00 PM">06:00 PM</option>
              </select>
            </div>
            <button type="submit" id="bookSlotBtn" class="w-full py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition cursor-pointer">
              Confirm Strategy Call Slot
            </button>
          </form>
          <div id="slotConfirmedBox" class="hidden p-4 rounded-xl bg-white border border-emerald-300 text-xs text-emerald-950 font-semibold"></div>
          <div class="flex flex-wrap gap-3 pt-2">
            ${
              cleanWa
                ? `<a id="waLink" href="https://wa.me/${cleanWa}?text=Hi%2C%20I%20just%20submitted%20an%20enquiry%20for%20${encodeURIComponent(brand)}%20and%20want%20to%20schedule%20our%20onboarding%20call." target="_blank" rel="noopener noreferrer" class="px-5 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs transition">
              💬 Chat on WhatsApp Now (+${cleanWa})
            </a>`
                : ''
            }
            ${
              calendly
                ? `<a href="${calendly}" target="_blank" rel="noopener noreferrer" class="px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition">
              📅 Open External Calendar Link
            </a>`
                : ''
            }
          </div>
        </div>
      </div>
    </div>
  </section>

  <footer class="py-10 border-t border-slate-200 text-center text-xs text-slate-500 bg-[#FAF9F6]">
    <div class="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div>© ${new Date().getFullYear()} ${brand}. All rights reserved.</div>
      <div>
        <a href="${cleanBackend}/?unlock=1" class="text-slate-900 font-semibold hover:underline">Client Portal Sign In (License Key Required)</a>
      </div>
    </div>
  </footer>

  <script>
    const BACKEND_URL = ${JSON.stringify(cleanBackend)};
    const form = document.getElementById('b2bForm');
    const submitBtn = document.getElementById('submitBtn');
    const successBox = document.getElementById('successBox');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting Your Brokerage Enquiry...';

      const payload = {
        agencyName: document.getElementById('agencyName').value,
        contactName: document.getElementById('contactName').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        teamSize: document.getElementById('teamSize').value,
        monthlyLeads: document.getElementById('monthlyLeads').value,
        message: document.getElementById('message').value,
        source: 'Hostinger Website Form'
      };

      try {
        await fetch(BACKEND_URL + '/api/public/b2b-enquiry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (err) {
        console.warn('Saved locally or CORS fallback:', err);
      }

      form.classList.add('hidden');
      successBox.classList.remove('hidden');
    });

    const callSlotForm = document.getElementById('callSlotForm');
    if (callSlotForm) {
      callSlotForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const dateStr = document.getElementById('callDateStr').value;
        const timeSlot = document.getElementById('callTimeSlot').value;
        const bookBtn = document.getElementById('bookSlotBtn');
        bookBtn.disabled = true;
        bookBtn.textContent = 'Booking...';
        try {
          await fetch(BACKEND_URL + '/api/public/book-strategy-call', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              agencyName: document.getElementById('agencyName').value,
              contactName: document.getElementById('contactName').value,
              email: document.getElementById('email').value,
              phone: document.getElementById('phone').value,
              dateStr,
              timeSlot
            })
          });
        } catch (err) {}
        callSlotForm.classList.add('hidden');
        const confirmed = document.getElementById('slotConfirmedBox');
        confirmed.textContent = '✅ Strategy Call Confirmed for ' + dateStr + ' at ' + timeSlot + '!';
        confirmed.classList.remove('hidden');
      });
    }
  </script>
</body>
</html>`;
}
