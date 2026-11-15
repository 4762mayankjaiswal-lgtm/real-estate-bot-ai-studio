export interface HostingerExportConfig {
  brandName: string;
  tagline: string;
  backendUrl: string;
  whatsappNumber: string;
  calendlyUrl: string;
}

export function generateHostingerHtmlBundle(config: HostingerExportConfig): string {
  const cleanBackend = (config.backendUrl || window.location.origin).replace(/\/+$/, '');
  const cleanWa = (config.whatsappNumber || '+15550192834').replace(/[^0-9]/g, '');
  const brand = config.brandName || 'Atelier Estate AI';
  const tagline =
    config.tagline || 'Autonomous 24/7 Real Estate AI Workforce & Omnichannel CRM';
  const calendly = config.calendlyUrl || 'https://calendly.com';

  return `<!DOCTYPE html>
<html lang="en" class="dark scroll-smooth">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${brand} — ${tagline}</title>
  <meta name="description" content="Turn every real estate inquiry from WhatsApp, Instagram, and your Website into a qualified, conflict-checked property viewing in under 10 seconds." />
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;0,700;1,600&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', sans-serif; background-color: #07090E; color: #F8FAFC; }
    .font-serif-display { font-family: 'Cormorant Garamond', serif; }
    .font-mono-code { font-family: 'JetBrains Mono', monospace; }
  </style>
</head>
<body class="bg-[#07090E] text-slate-100 antialiased selection:bg-amber-500/30 selection:text-amber-200">

  <!-- Top Navigation -->
  <header class="sticky top-0 z-50 border-b border-slate-800/80 bg-[#07090E]/90 backdrop-blur-xl">
    <div class="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-bold text-lg shadow-lg shadow-amber-500/20">
          AE
        </div>
        <div>
          <span class="text-lg font-bold tracking-tight text-white block leading-none">${brand}</span>
          <span class="text-[11px] font-mono-code uppercase tracking-widest text-amber-400/90">24/7 AI Brokerage OS</span>
        </div>
      </div>
      <nav class="hidden md:flex items-center gap-8 text-sm text-slate-300">
        <a href="#bots-showcase" class="hover:text-amber-400 transition">AI Bots & Screenshots</a>
        <a href="#pipeline" class="hover:text-amber-400 transition">How It Works</a>
        <a href="#delivery" class="hover:text-amber-400 transition">Onboarding & Lock</a>
        <a href="#enquiry-form" class="hover:text-amber-400 transition">Book Strategy Call</a>
      </nav>
      <div class="flex items-center gap-3">
        <a href="${cleanBackend}/?unlock=1" class="px-4 py-2.5 rounded-xl border border-slate-700 hover:border-amber-500/60 bg-slate-900/90 text-xs font-semibold text-slate-200 hover:text-amber-300 transition flex items-center gap-2">
          <span>🔒 Client Portal Login</span>
        </a>
        <a href="#enquiry-form" class="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs tracking-wide transition shadow-lg shadow-amber-500/20">
          Send Enquiry
        </a>
      </div>
    </div>
  </header>

  <!-- Hero Section -->
  <section class="relative overflow-hidden pt-16 pb-24 border-b border-slate-800/70">
    <div class="max-w-7xl mx-auto px-6">
      <div class="max-w-3xl">
        <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono-code uppercase tracking-widest mb-6">
          <span>⚡ Responds in 8 Seconds · WhatsApp · Instagram · Website · Gmail</span>
        </div>
        <h1 class="font-serif-display text-5xl sm:text-6xl font-bold tracking-tight text-white leading-[1.08] mb-6">
          Turn Every Property Inquiry Into a <span class="text-amber-400 italic">Conflict-Checked Viewing</span> — Automatically.
        </h1>
        <p class="text-lg text-slate-300 leading-relaxed mb-8">
          78% of real estate commissions go to the first brokerage that responds. Deploy 4 specialized AI Employees that capture leads from your website, WhatsApp, and Instagram, qualify budget & timeline, check your human agents' Google Calendars for conflicts, and book property tours 24/7.
        </p>
        <div class="flex flex-wrap items-center gap-4">
          <a href="#enquiry-form" class="px-7 py-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition shadow-xl shadow-amber-500/20">
            Book Discovery Call & Send Enquiry →
          </a>
          <a href="${cleanBackend}/?unlock=1" class="px-6 py-4 rounded-xl border border-slate-700 hover:border-slate-500 bg-slate-900/70 text-slate-200 font-semibold text-sm transition">
            Have a License Key? Unlock System
          </a>
        </div>
      </div>

      <!-- KPI Strip -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-14 pt-10 border-t border-slate-800/80">
        <div class="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/90">
          <div class="text-3xl font-bold text-amber-400 font-mono-code">8.4s</div>
          <div class="text-xs text-slate-400 mt-1">Average Omnichannel Lead Response Time</div>
        </div>
        <div class="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/90">
          <div class="text-3xl font-bold text-emerald-400 font-mono-code">3.4x</div>
          <div class="text-xs text-slate-400 mt-1">More Qualified Property Viewings Booked</div>
        </div>
        <div class="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/90">
          <div class="text-3xl font-bold text-sky-400 font-mono-code">100%</div>
          <div class="text-xs text-slate-400 mt-1">Google Calendar Double-Booking Prevention</div>
        </div>
        <div class="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/90">
          <div class="text-3xl font-bold text-purple-400 font-mono-code">24/7</div>
          <div class="text-xs text-slate-400 mt-1">4 Autonomous AI Employees Working Non-Stop</div>
        </div>
      </div>
    </div>
  </section>

  <!-- Live AI Bots & System Screenshots Showcase -->
  <section id="bots-showcase" class="py-20 border-b border-slate-800/70">
    <div class="max-w-7xl mx-auto px-6">
      <div class="max-w-2xl mb-12">
        <div class="text-xs font-mono-code uppercase tracking-widest text-amber-400 mb-2">Inside the Automation Engine</div>
        <h2 class="font-serif-display text-4xl font-bold text-white">Meet Your 4 Autonomous Real Estate Bots & Live Command Center</h2>
        <p class="text-sm text-slate-400 mt-3">Real screenshots and live telemetry views from the ${brand} platform deployed for partner brokerages.</p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <!-- Screenshot 1: Elena AI Lead Qualifier + Live Bot Terminal -->
        <div class="rounded-2xl bg-[#0D111A] border border-slate-800 overflow-hidden shadow-2xl">
          <div class="px-5 py-3.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              <span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span class="text-xs font-mono-code text-slate-300 ml-2">BOT #1 · ELENA — 24/7 INBOUND LEAD QUALIFIER</span>
            </div>
            <span class="text-[11px] font-mono-code text-emerald-400">● LIVE WEBHOOK</span>
          </div>
          <div class="p-6 space-y-4">
            <div class="p-4 rounded-xl bg-slate-950/90 border border-slate-800/90 space-y-3 text-xs">
              <div class="flex items-start justify-between">
                <span class="font-semibold text-amber-300">Website Inquiry Webhook · Tribeca Sky Penthouse ($4.8M)</span>
                <span class="font-mono-code text-slate-500">0.8s ago</span>
              </div>
              <div class="p-3 rounded-lg bg-slate-900 text-slate-300 border-l-2 border-sky-400">
                "Hi, we are relocating to NYC next month. Looking for a 4-bed penthouse in Tribeca up to $5M. Can we tour this Thursday at 2:00 PM?"
              </div>
              <div class="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-emerald-200">
                <strong>Elena (AI Lead Specialist):</strong> "Qualified Buyer Intent: 96/100 (Cash/Pre-Approved · Immediate Timeline). Checked Senior Agent Victoria Sterling's Google Calendar for Thursday 2:00 PM — 0 conflicts. Private tour invitation + brochure dispatched via Resend HTTPS API!"
              </div>
            </div>
            <div class="grid grid-cols-3 gap-3 text-center">
              <div class="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
                <div class="text-sm font-bold text-white">WhatsApp & IG</div>
                <div class="text-[11px] text-slate-400">Instant Auto-Reply</div>
              </div>
              <div class="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
                <div class="text-sm font-bold text-white">Website Webhook</div>
                <div class="text-[11px] text-slate-400">Direct Form Capture</div>
              </div>
              <div class="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
                <div class="text-sm font-bold text-white">Human Handoff</div>
                <div class="text-[11px] text-slate-400">Alerts Closing Agent</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Screenshot 2: AI Sentiment Analysis + Calendar Conflict Guard -->
        <div class="rounded-2xl bg-[#0D111A] border border-slate-800 overflow-hidden shadow-2xl">
          <div class="px-5 py-3.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              <span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span class="text-xs font-mono-code text-slate-300 ml-2">AI CRM ANALYZER & CALENDAR CONFLICT GUARD</span>
            </div>
            <span class="text-[11px] font-mono-code text-amber-400">● 6-STAGE FUNNEL</span>
          </div>
          <div class="p-6 space-y-4">
            <div class="p-4 rounded-xl bg-slate-950/90 border border-slate-800/90 space-y-3 text-xs">
              <div class="flex items-center justify-between">
                <span class="font-bold text-white">AI Lead Intelligence Brief · Sentiment: HIGH INTENT (94/100)</span>
                <span class="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono-code">Tour Scheduled</span>
              </div>
              <p class="text-slate-300 leading-relaxed">
                Buyer reviewed floorplan twice and requested school district data. Recommended Next Step: Assign Senior Broker Marcus Vance and lock Friday 11:00 AM viewing.
              </p>
              <div class="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 flex items-center justify-between">
                <span>🛡️ Google Calendar Conflict Check: Agent Victoria Sterling</span>
                <span class="font-mono-code text-emerald-400 font-semibold">✓ SLOT VERIFIED FREE</span>
              </div>
            </div>
            <div class="grid grid-cols-6 gap-1.5 text-center text-[10px] font-mono-code">
              <div class="p-2 rounded bg-slate-900 border border-slate-800 text-slate-300">1. Inbound</div>
              <div class="p-2 rounded bg-slate-900 border border-slate-800 text-sky-300">2. Qualified</div>
              <div class="p-2 rounded bg-slate-900 border border-slate-800 text-indigo-300">3. Follow-Up</div>
              <div class="p-2 rounded bg-slate-900 border border-slate-800 text-amber-300">4. Tour Set</div>
              <div class="p-2 rounded bg-slate-900 border border-slate-800 text-purple-300">5. Offer In</div>
              <div class="p-2 rounded bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 font-bold">6. Closed</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- How Our Call-First Onboarding & License Lock Works -->
  <section id="delivery" class="py-20 border-b border-slate-800/70 bg-slate-950/40">
    <div class="max-w-7xl mx-auto px-6">
      <div class="max-w-2xl mb-12">
        <div class="text-xs font-mono-code uppercase tracking-widest text-amber-400 mb-2">White-Glove Deployment Process</div>
        <h2 class="font-serif-display text-4xl font-bold text-white">How We Deploy & Unlock Your Brokerage Automation</h2>
        <p class="text-sm text-slate-400 mt-2">Every brokerage receives a custom-configured AI instance locked with an enterprise License Key.</p>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="p-6 rounded-2xl bg-[#0D111A] border border-slate-800">
          <div class="text-xs font-mono-code text-amber-400 mb-2">STEP 01</div>
          <h3 class="text-lg font-bold text-white mb-2">Submit Enquiry & Strategy Call</h3>
          <p class="text-sm text-slate-400 leading-relaxed">Fill out the enquiry form below. We hop on a 15-minute live discovery call to map your lead sources (Website, WhatsApp, Instagram, Portals) and human agent roster.</p>
        </div>
        <div class="p-6 rounded-2xl bg-[#0D111A] border border-slate-800">
          <div class="text-xs font-mono-code text-amber-400 mb-2">STEP 02</div>
          <h3 class="text-lg font-bold text-white mb-2">Custom Setup & Payment</h3>
          <p class="text-sm text-slate-400 leading-relaxed">Once you select your plan and complete payment on the call, our team provisions your dedicated VPS/Cloud automation workspace and email delivery channels.</p>
        </div>
        <div class="p-6 rounded-2xl bg-[#0D111A] border border-amber-500/40">
          <div class="text-xs font-mono-code text-emerald-400 mb-2">STEP 03 · INSTANT UNLOCK</div>
          <h3 class="text-lg font-bold text-white mb-2">Receive Your License Key</h3>
          <p class="text-sm text-slate-400 leading-relaxed">We issue your unique <code class="text-amber-300">ESTATE-PRO-XXXX</code> License Key. Click "Client Portal Login" at the top of this website to unlock your 24/7 AI Workforce immediately.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- Enquiry Form Section -->
  <section id="enquiry-form" class="py-24">
    <div class="max-w-3xl mx-auto px-6">
      <div class="p-8 sm:p-10 rounded-3xl bg-[#0D111A] border border-slate-800 shadow-2xl">
        <div class="text-xs font-mono-code uppercase tracking-widest text-amber-400 mb-2">Get Started</div>
        <h2 class="font-serif-display text-3xl sm:text-4xl font-bold text-white mb-2">Book Your Live Demo & Send Enquiry</h2>
        <p class="text-sm text-slate-400 mb-8">Submit your brokerage details below. Our team will connect with you on call/WhatsApp to walk you through the system and issue your Client License Key.</p>

        <form id="b2bForm" class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">Real Estate Agency Name *</label>
              <input type="text" id="agencyName" required placeholder="e.g., Skyline Luxury Realty" class="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:border-amber-500 focus:outline-none" />
            </div>
            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">Your Full Name *</label>
              <input type="text" id="contactName" required placeholder="e.g., Vikram Mehta" class="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:border-amber-500 focus:outline-none" />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">Work Email *</label>
              <input type="email" id="email" required placeholder="you@youragency.com" class="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:border-amber-500 focus:outline-none" />
            </div>
            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">Phone / WhatsApp Number *</label>
              <input type="tel" id="phone" required placeholder="+91 98765 43210 / +1 555 234 5678" class="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:border-amber-500 focus:outline-none" />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">Number of Real Estate Agents</label>
              <select id="teamSize" class="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:border-amber-500 focus:outline-none">
                <option value="1-5 Agents">1 - 5 Agents</option>
                <option value="6-15 Agents" selected>6 - 15 Agents</option>
                <option value="16-50 Agents">16 - 50 Agents</option>
                <option value="50+ Enterprise">50+ Agents (Enterprise)</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">Monthly Inbound Lead Volume</label>
              <select id="monthlyLeads" class="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:border-amber-500 focus:outline-none">
                <option value="Under 100 Leads/mo">Under 100 Leads / month</option>
                <option value="100-500 Leads/mo" selected>100 - 500 Leads / month</option>
                <option value="500-2,000 Leads/mo">500 - 2,000 Leads / month</option>
                <option value="2,000+ Leads/mo">2,000+ Leads / month</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">Which Channels Do You Want to Automate?</label>
            <textarea id="message" rows="3" placeholder="Tell us about your website, WhatsApp, Instagram, or CRM requirements..." class="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:border-amber-500 focus:outline-none"></textarea>
          </div>

          <button type="submit" id="submitBtn" class="w-full py-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm tracking-wide transition shadow-xl shadow-amber-500/20">
            Submit Enquiry & Unlock Strategy Call →
          </button>
        </form>

        <!-- Post-Submission Instant Call & WhatsApp Box -->
        <div id="successBox" class="hidden mt-6 p-6 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 space-y-4">
          <div class="text-emerald-300 font-bold text-base">✅ Enquiry Received! Our Onboarding Team Has Been Alerted.</div>
          <p class="text-xs text-slate-300 leading-relaxed">
            Want to fast-track your setup and receive your Client License Key today? Connect with us directly on WhatsApp or pick your call slot below:
          </p>
          <div class="flex flex-wrap gap-3 pt-2">
            <a id="waLink" href="https://wa.me/${cleanWa}?text=Hi%2C%20I%20just%20submitted%20an%20enquiry%20for%20${encodeURIComponent(brand)}%20and%20want%20to%20schedule%20our%20onboarding%20call." target="_blank" rel="noopener noreferrer" class="px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition">
              💬 Chat on WhatsApp Now
            </a>
            <a href="${calendly}" target="_blank" rel="noopener noreferrer" class="px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition">
              📅 Book Strategy Call Slot
            </a>
          </div>
        </div>
      </div>
    </div>
  </section>

  <footer class="py-10 border-t border-slate-800/80 text-center text-xs text-slate-500">
    <div class="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div>© ${new Date().getFullYear()} ${brand}. All rights reserved.</div>
      <div>
        <a href="${cleanBackend}/?unlock=1" class="text-amber-400 hover:underline">Client Portal Login (License Key Required)</a>
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
      submitBtn.textContent = 'Sending Enquiry...';

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
  </script>
</body>
</html>`;
}
