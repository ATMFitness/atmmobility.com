var __defProp = Object.defineProperty;

var __name = (target, value) => __defProp(target, "name", { value, configurable: true });



// worker.js

var SYSTEM_VERSION = "atm-leads-v19-nankind-60-day-2026-10";

var WAIVER_VERSION = "stretch-reset-waiver-v2-2026-06";

var DEFAULT_CAMPAIGN_ID = "black_owned_to_2026";

var VOUCHER_VALUE_CENTS = 2e3;

var CONSENT_TEXT = "I would like to receive my $20 Stretch Reset voucher and occasional appointment reminders from ATM Mobility & Therapy.";

var WAIVER_TEXT = `I understand that the 15-Minute Stretch Reset is a wellness and mobility service. It is not medical treatment, diagnosis, physiotherapy, chiropractic care, or emergency care. I confirm that I am voluntarily participating and that I will tell the practitioner immediately if I experience pain, dizziness, numbness, tingling, shortness of breath, or discomfort. I understand that all stretching and mobility activities involve some risk, and I release ATM Mobility & Therapy, its practitioners, representatives, and event partners from liability arising from my voluntary participation, except where prohibited by law.`;

var CONCERNS = /* @__PURE__ */ new Set([

  "Neck stiffness",

  "Shoulder tightness",

  "Upper back",

  "Lower back",

  "Hip mobility",

  "Knee/leg mobility",

  "Athletic recovery",

  "General mobility",

  "Other"

]);

var worker_default = {

  async fetch(request, env) {

    if (request.method === "OPTIONS") return withCors(request, env, new Response(null, { status: 204 }));

    const url = new URL(request.url);

    const path = url.pathname.replace(/\/+$/, "") || "/";

    try {

      if (path === "/api/health" && request.method === "GET") {

        return json(request, env, { ok: true, service: "atm-leads", version: SYSTEM_VERSION, time: nowIso() });

      }

      if ((path === "/api/leads/stretch-reset" || path === "/api/leads") && request.method === "POST") {

        return await createStretchResetLead(request, env);

      }

      if (path === "/api/leads/validate" && request.method === "POST") {

        return await validateStretchResetLead(request, env);

      }

      if (path === "/api/admin/leads" && request.method === "GET") return await adminLeads(request, env, false);

      if (path === "/api/admin/leads.csv" && request.method === "GET") return await adminLeads(request, env, true);

      if (path === "/api/admin/stats" && request.method === "GET") return await adminStats(request, env);

      if (path === "/api/admin/vouchers/redeem" && request.method === "POST") return await redeemVoucher(request, env);

      if (path === "/api/admin/emails/resend-voucher" && request.method === "POST") return await resendVoucherEmail(request, env);

      if (path === "/api/admin/emails/process-now" && request.method === "POST") return await processNow(request, env);

      if (path === "/api/admin/leads/update-email" && request.method === "POST") return await updateLeadEmail(request, env);

      if (path === "/api/admin/leads/void" && request.method === "POST") return await voidLead(request, env);

      if (path === "/api/admin/leads/validate" && request.method === "POST") return await adminValidateLead(request, env);

      return json(request, env, { ok: false, error: "Not found" }, 404);

    } catch (err) {

      console.error("Unhandled error", err);

      return json(request, env, { ok: false, error: "Unexpected server error" }, 500);

    }

  },

  async scheduled(_event, env, ctx) {

    ctx.waitUntil(processEmailQueue(env));

    ctx.waitUntil(expireOldVouchers(env));

  }

};

function nowIso() {

  return (/* @__PURE__ */ new Date()).toISOString().replace(/\.\d{3}Z$/, "Z");

}

__name(nowIso, "nowIso");

function addDays(days) {

  const d = /* @__PURE__ */ new Date();

  d.setUTCDate(d.getUTCDate() + Number(days || 0));

  return d.toISOString().replace(/\.\d{3}Z$/, "Z");

}

__name(addDays, "addDays");

function allowedOrigin(request, env) {

  const origin = request.headers.get("Origin") || "";

  const allowed = String(env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);

  if (origin && allowed.includes(origin)) return origin;

  if (!origin) return "*";

  return allowed[0] || "https\://atmmobility.com";

}

__name(allowedOrigin, "allowedOrigin");

function withCors(request, env, response) {

  response.headers.set("Access-Control-Allow-Origin", allowedOrigin(request, env));

  response.headers.set("Vary", "Origin");

  response.headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");

  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Admin-Key");

  response.headers.set("Access-Control-Max-Age", "86400");

  return response;

}

__name(withCors, "withCors");

function json(request, env, data, status = 200) {

  return withCors(request, env, new Response(JSON.stringify(data), {

    status,

    headers: {

      "content-type": "application/json; charset=utf-8",

      "cache-control": "no-store"

    }

  }));

}

__name(json, "json");

function text(request, env, content, status = 200, contentType = "text/plain; charset=utf-8") {

  return withCors(request, env, new Response(content, { status, headers: { "content-type": contentType, "cache-control": "no-store" } }));

}

__name(text, "text");

function clean(value, max = 200) {

  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, max);

}

__name(clean, "clean");

function normalizeEmail(value) {

  return clean(value, 160).toLowerCase();

}

__name(normalizeEmail, "normalizeEmail");

function normalizePhone(value) {

  return clean(value, 40);

}

__name(normalizePhone, "normalizePhone");

function phoneDigits(value) {

  return String(value ?? "").replace(/\D/g, "");

}

__name(phoneDigits, "phoneDigits");

function validEmail(email) {

  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);

}

__name(validEmail, "validEmail");

function validPhone(phone) {

  const digits = phoneDigits(phone);

  return digits.length >= 10 && digits.length <= 15;

}

__name(validPhone, "validPhone");

function uid(prefix = "") {

  const bytes = new Uint8Array(12);

  crypto.getRandomValues(bytes);

  return prefix + [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");

}

__name(uid, "uid");

async function sha256(input) {

  const data = new TextEncoder().encode(String(input));

  const hash = await crypto.subtle.digest("SHA-256", data);

  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");

}

__name(sha256, "sha256");

function voucherCode(prefix = "ATM") {

  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let out = `${prefix}-`;

  for (let i = 0; i < 6; i += 1) out += chars[Math.floor(Math.random() * chars.length)];

  return out;

}

__name(voucherCode, "voucherCode");

function truthy(value) {

  return value === true || value === "true" || value === "on" || value === 1 || value === "1";

}

__name(truthy, "truthy");

function clientIp(request) {

  return request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "";

}

__name(clientIp, "clientIp");

async function rateLimit(request, env, name, limit, windowSeconds) {

  const ip = clientIp(request) || "unknown";

  const key = `${name}:${await sha256(ip)}`;

  const existing = await env.DB.prepare("SELECT * FROM rate_limits WHERE key = ?").bind(key).first();

  const now = Date.now();

  const resetAt = existing?.reset_at ? Date.parse(existing.reset_at) : 0;

  const newReset = new Date(now + windowSeconds * 1e3).toISOString();

  if (!existing || resetAt <= now) {

    await env.DB.prepare("INSERT OR REPLACE INTO rate_limits (key, count, reset_at) VALUES (?, 1, ?)").bind(key, newReset).run();

    return { ok: true };

  }

  if (existing.count >= limit) return { ok: false, reset_at: existing.reset_at };

  await env.DB.prepare("UPDATE rate_limits SET count = count + 1 WHERE key = ?").bind(key).run();

  return { ok: true };

}

__name(rateLimit, "rateLimit");

async function getCampaign(env, id) {

  return await env.DB.prepare("SELECT * FROM campaigns WHERE id = ? AND is_active = 1").bind(id).first();

}

__name(getCampaign, "getCampaign");

async function createStretchResetLead(request, env) {

  const rl = await rateLimit(request, env, "lead_submit", 8, 60 * 60);

  if (!rl.ok) return json(request, env, { ok: false, error: "Too many submissions. Please ask the ATM team for help." }, 429);

  const body = await request.json().catch(() => null);

  if (!body) return json(request, env, { ok: false, error: "Invalid submission." }, 400);

  if (clean(body.website, 120)) return json(request, env, { ok: false, error: "Submission could not be accepted." }, 400);

  const firstName = clean(body.first_name, 80);

  const lastName = clean(body.last_name, 80);

  const email = normalizeEmail(body.email);

  const phone = normalizePhone(body.phone);

  const primaryConcern = clean(body.primary_concern, 80);

  const concernOther = clean(body.concern_other, 220);

  const notes = clean(body.notes, 400);

  const waiverAgreed = truthy(body.waiver_agreed);

  const marketingConsent = truthy(body.marketing_consent);

  const campaignId = clean(body.campaign_id || DEFAULT_CAMPAIGN_ID, 80);

  if (!firstName || !lastName) return json(request, env, { ok: false, error: "Please enter your first and last name." }, 400);

  if (!validEmail(email)) return json(request, env, { ok: false, error: "Please enter a valid email address." }, 400);

  if (!validPhone(phone)) return json(request, env, { ok: false, error: "Please enter a valid mobile phone number." }, 400);

  if (!CONCERNS.has(primaryConcern)) return json(request, env, { ok: false, error: "Please select your main concern." }, 400);

  if (primaryConcern === "Other" && !concernOther) return json(request, env, { ok: false, error: "Please tell us your concern." }, 400);

  if (!waiverAgreed) return json(request, env, { ok: false, error: "Please agree to the waiver before participating." }, 400);

  const campaign = await getCampaign(env, campaignId);

  if (!campaign) return json(request, env, { ok: false, error: "This campaign is not active." }, 400);

  const ip = clientIp(request);

  const userAgent = clean(request.headers.get("user-agent") || "", 320);

  const ipHash = ip ? await sha256(`${campaignId}:${email}:${ip}`) : null;

  const existing = await env.DB.prepare(`

    SELECT l.id AS lead_id, l.first_name, l.last_name, l.email, l.phone, l.validation_status, l.validation_token,

           v.id AS voucher_id, v.code, v.expires_at, v.status

    FROM leads l

    LEFT JOIN vouchers v ON v.lead_id = l.id AND v.status = 'issued'

    WHERE l.email = ? AND l.campaign_id = ? AND COALESCE(l.validation_status, 'pending_validation') != 'void'

    ORDER BY l.created_at DESC

    LIMIT 1

  `).bind(email, campaign.id).first();

  if (existing) {

    await env.DB.prepare(`INSERT INTO lead_events (id, lead_id, event_type, event_detail) VALUES (?, ?, 'duplicate_submission', ?)`).bind(uid("evt_"), existing.lead_id, `Re-submitted from ${phone}`).run();

    if (existing.voucher_id && existing.code) {

      return json(request, env, {

        ok: true,

        duplicate: true,

        already_validated: true,

        lead_id: existing.lead_id,

        voucher_code: existing.code,

        expires_at: existing.expires_at,

        booking_url: campaign.noterro_url || env.NOTERRO_URL,

        message: "Your waiver was already submitted and validated. Please check your email for your voucher."

      });

    }

    return json(request, env, {

      ok: true,

      duplicate: true,

      pending_validation: true,

      lead_id: existing.lead_id,

      validation_token: existing.validation_token,

      message: "Your waiver was already submitted. Please return to the ATM desk to complete check-in."

    });

  }

  const leadId = uid("lead_");

  const waiverId = uid("waiver_");

  const validationToken = uid("val_");

  const consentAt = marketingConsent ? nowIso() : null;

  await env.DB.batch([

    env.DB.prepare(`INSERT INTO leads (id, campaign_id, source, first_name, last_name, email, phone, primary_concern, concern_other, notes, marketing_consent, consent_text, consent_at, ip_hash, user_agent, validation_status, validation_token)

      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_validation', ?)`).bind(leadId, campaign.id, campaign.source, firstName, lastName, email, phone, primaryConcern, concernOther || null, notes || null, marketingConsent ? 1 : 0, marketingConsent ? CONSENT_TEXT : null, consentAt, ipHash, userAgent, validationToken),

    env.DB.prepare(`INSERT INTO waiver_signatures (id, lead_id, waiver_version, waiver_text, signature_name, agreed, ip_hash, user_agent)

      VALUES (?, ?, ?, ?, ?, 1, ?, ?)`).bind(waiverId, leadId, WAIVER_VERSION, WAIVER_TEXT, `${firstName} ${lastName}`, ipHash, userAgent),

    env.DB.prepare(`INSERT INTO lead_events (id, lead_id, event_type, event_detail) VALUES (?, ?, 'waiver_submitted_pending_validation', ?)`).bind(uid("evt_"), leadId, `Campaign: ${campaign.id}; concern: ${primaryConcern}`)

  ]);

  return json(request, env, {

    ok: true,

    pending_validation: true,

    lead_id: leadId,

    validation_token: validationToken,

    message: "Your waiver has been submitted. Please return to the ATM Mobility & Therapy desk to complete check-in and receive your voucher."

  });

}

__name(createStretchResetLead, "createStretchResetLead");

async function validateStretchResetLead(request, env) {

  const body = await request.json().catch(() => null);

  if (!body) return json(request, env, { ok: false, error: "Invalid validation request." }, 400);

  const leadId = clean(body.lead_id || "", 100);

  const validationToken = clean(body.validation_token || "", 120);

  const staffCode = clean(body.staff_code || "", 200);

  if (!leadId || !validationToken) return json(request, env, { ok: false, error: "Missing waiver validation details. Please keep the waiver confirmation page open and ask ATM staff for help." }, 400);

  if (!env.STAFF_VALIDATION_CODE || staffCode !== env.STAFF_VALIDATION_CODE) return json(request, env, { ok: false, error: "Staff validation failed. Please ask ATM staff to scan again." }, 403);

  const row = await env.DB.prepare(`

    SELECT l.*, c.name AS campaign_name, c.voucher_prefix, c.voucher_value_cents, c.voucher_expiry_days, c.noterro_url, c.is_active,

           v.id AS existing_voucher_id, v.code AS existing_code, v.expires_at AS existing_expires_at, v.status AS existing_voucher_status

    FROM leads l

    JOIN campaigns c ON c.id = l.campaign_id

    LEFT JOIN vouchers v ON v.lead_id = l.id AND v.status = 'issued'

    WHERE l.id = ? AND l.validation_token = ?

    ORDER BY v.issued_at DESC

    LIMIT 1

  `).bind(leadId, validationToken).first();

  if (!row) return json(request, env, { ok: false, error: "Waiver not found for this device. Please ask ATM staff for help." }, 404);

  if (!row.is_active) return json(request, env, { ok: false, error: "This campaign is not active." }, 400);

  if (row.validation_status === "void") return json(request, env, { ok: false, error: "This waiver record has been voided." }, 409);

  if (row.existing_voucher_id && row.existing_code) {

    return json(request, env, {

      ok: true,

      already_validated: true,

      lead_id: row.id,

      voucher_code: row.existing_code,

      expires_at: row.existing_expires_at,

      booking_url: row.noterro_url || env.NOTERRO_URL,

      message: "This waiver was already validated. Please check your email for your voucher."

    });

  }

  const voucherId = uid("voucher_");

  const expiresAt = addDays(row.voucher_expiry_days || 60);

  let code = voucherCode(row.voucher_prefix || "ATM");

  for (let tries = 0; tries < 5; tries += 1) {

    const existingCode = await env.DB.prepare("SELECT id FROM vouchers WHERE code = ?").bind(code).first();

    if (!existingCode) break;

    code = voucherCode(row.voucher_prefix || "ATM");

  }

  await env.DB.batch([

    env.DB.prepare(`INSERT INTO vouchers (id, code, lead_id, campaign_id, value_cents, expires_at)

      VALUES (?, ?, ?, ?, ?, ?)`).bind(voucherId, code, row.id, row.campaign_id, row.voucher_value_cents || VOUCHER_VALUE_CENTS, expiresAt),

    env.DB.prepare(`UPDATE leads SET validation_status='validated', validated_at=?, updated_at=? WHERE id=?`).bind(nowIso(), nowIso(), row.id),

    env.DB.prepare(`INSERT INTO lead_events (id, lead_id, event_type, event_detail) VALUES (?, ?, 'staff_validated', ?)`).bind(uid("evt_"), row.id, "Voucher issued after staff QR validation")

  ]);

  await queueLeadEmails(env, {

    leadId: row.id,

    voucherId,

    campaign: {

      id: row.campaign_id,

      name: row.campaign_name,

      voucher_prefix: row.voucher_prefix,

      voucher_value_cents: row.voucher_value_cents,

      voucher_expiry_days: row.voucher_expiry_days,

      noterro_url: row.noterro_url,

      is_active: row.is_active

    },

    firstName: row.first_name,

    email: row.email,

    code,

    expiresAt,

    marketingConsent: Boolean(row.marketing_consent)

  });

  await processEmailQueue(env, 5);

  return json(request, env, {

    ok: true,

    validated: true,

    lead_id: row.id,

    voucher_code: code,

    expires_at: expiresAt,

    booking_url: row.noterro_url || env.NOTERRO_URL,

    message: "Check-in complete. Your voucher has been emailed."

  });

}

__name(validateStretchResetLead, "validateStretchResetLead");

async function queueLeadEmails(env, data) {
  await queueVoucherEmail(env, data, "voucher");
  if (!data.marketingConsent) return;
  const bookingUrl = data.campaign.noterro_url || env.NOTERRO_URL;
  const schedule = reminderSchedule(data.campaign.voucher_expiry_days);
  const f1 = emailTemplate({
    title: "{{days_remaining}} days left on your Stretch Reset voucher",
    preview: "You have {{days_remaining}} days remaining to use your $20 credit.",
    greeting: `Hi ${escapeHtml(data.firstName)},`,
    body: `<p>When you tried the Mobility Challenge — turning your head, reaching behind your back, and touching your toes — did any movement feel tight?</p>
      <p>Your <strong>$20 Stretch Reset voucher</strong> has <strong>{{days_remaining}} days remaining</strong> and expires on <strong>{{expires_on}}</strong>.</p>`,
    bookingUrl,
    voucherCode: data.code
  });
  await insertEmail(env, data, "followup_midpoint", "{{days_remaining}} days left on your Stretch Reset voucher", f1.html, f1.text, addDays(schedule.midpointDelayDays));
  const f2 = emailTemplate({
    title: "Your Stretch Reset voucher is expiring soon",
    preview: "Your $20 Stretch Reset voucher has {{days_remaining}} days remaining.",
    greeting: `Hi ${escapeHtml(data.firstName)},`,
    body: `<p>Your Stretch Reset voucher expires soon. You have <strong>{{days_remaining}} days remaining</strong> to use your <strong>$20 credit</strong> toward your first full session.</p>
      <p>It expires on <strong>{{expires_on}}</strong>. Your voucher code is <strong>${escapeHtml(data.code)}</strong>.</p>`,
    bookingUrl,
    voucherCode: data.code
  });
  await insertEmail(env, data, "followup_7_days_remaining", "Your Stretch Reset voucher is expiring soon", f2.html, f2.text, addDays(schedule.finalDelayDays));
}

__name(queueLeadEmails, "queueLeadEmails");

async function queueVoucherResend(env, data) {

  await queueVoucherEmail(env, data, "manual_resend");

}

__name(queueVoucherResend, "queueVoucherResend");

async function queueVoucherEmail(env, data, type) {

  const bookingUrl = data.campaign.noterro_url || env.NOTERRO_URL;

  const expiry = formatDate(data.expiresAt);

  const validityDays = Math.max(1, Number(data.campaign.voucher_expiry_days || 60));

  const voucher = emailTemplate({

    title: "Your $20 Stretch Reset Voucher",

    preview: "Your ATM Mobility & Therapy voucher is ready.",

    greeting: `Hi ${escapeHtml(data.firstName)},`,

    body: `<p>Thank you for visiting <strong>ATM Mobility & Therapy</strong>.</p>

      <p>Your voucher has been activated:</p>

      <div class="code">${escapeHtml(data.code)}</div>

      <p>This voucher gives you <strong>$20 credited toward your first full session</strong>. It is valid for <strong>${validityDays} days from activation</strong> and expires on <strong>${escapeHtml(expiry)}</strong>.</p>`,

    bookingUrl,

    voucherCode: data.code

  });

  await insertEmail(env, data, type, "Your $20 Stretch Reset Voucher", voucher.html, voucher.text, nowIso());

}

__name(queueVoucherEmail, "queueVoucherEmail");

async function insertEmail(env, data, type, subject, html, bodyText, sendAfter) {

  await env.DB.prepare(`INSERT INTO email_queue (id, lead_id, voucher_id, campaign_id, email_type, to_email, subject, body_html, body_text, send_after)

    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(uid("email_"), data.leadId, data.voucherId, data.campaign.id, type, data.email, subject, html, bodyText, sendAfter).run();

}

__name(insertEmail, "insertEmail");

async function processEmailQueue(env, limit = 25) {

  const rows = await env.DB.prepare(`SELECT * FROM email_queue WHERE send_status = 'pending' AND send_after <= ? ORDER BY send_after ASC LIMIT ?`).bind(nowIso(), limit).all();

  let sent = 0;

  let failed = 0;

  for (const email of rows.results || []) {

    try {

      let bodyHtml = email.body_html;
      let bodyText = email.body_text;
      if (["followup_midpoint", "followup_7_days_remaining"].includes(email.email_type)) {
        const voucher = await env.DB.prepare("SELECT status, expires_at FROM vouchers WHERE id=?").bind(email.voucher_id).first();
        if (!voucher || voucher.status !== "issued" || Date.parse(voucher.expires_at) <= Date.now()) {
          await env.DB.prepare("UPDATE email_queue SET send_status='skipped', error_message=? WHERE id=?").bind("Voucher is no longer active", email.id).run();
          continue;
        }
        const remaining = daysRemaining(voucher.expires_at);
        const expiresOn = formatDate(voucher.expires_at);
        bodyHtml = bodyHtml.replaceAll("{{days_remaining}}", String(remaining)).replaceAll("{{expires_on}}", escapeHtml(expiresOn));
        bodyText = bodyText.replaceAll("{{days_remaining}}", String(remaining)).replaceAll("{{expires_on}}", expiresOn);
        const subject = email.subject.replaceAll("{{days_remaining}}", String(remaining));
        await sendEmail(env, email.to_email, subject, bodyHtml, bodyText);
        await env.DB.prepare("UPDATE email_queue SET send_status='sent', sent_at=? WHERE id=?").bind(nowIso(), email.id).run();
        await env.DB.prepare("INSERT INTO lead_events (id, lead_id, event_type, event_detail) VALUES (?, ?, 'email_sent', ?)").bind(uid("evt_"), email.lead_id, email.email_type).run();
        sent += 1;
        continue;
      }
      await sendEmail(env, email.to_email, email.subject, bodyHtml, bodyText);

      await env.DB.prepare(`UPDATE email_queue SET send_status='sent', sent_at=? WHERE id=?`).bind(nowIso(), email.id).run();

      await env.DB.prepare(`INSERT INTO lead_events (id, lead_id, event_type, event_detail) VALUES (?, ?, 'email_sent', ?)`).bind(uid("evt_"), email.lead_id, email.email_type).run();

      sent += 1;

    } catch (err) {

      await env.DB.prepare(`UPDATE email_queue SET send_status='failed', error_message=? WHERE id=?`).bind(String(err.message || err).slice(0, 500), email.id).run();

      failed += 1;

    }

  }

  return { sent, failed };

}

__name(processEmailQueue, "processEmailQueue");

async function sendEmail(env, to, subject, html, textBody) {

  if (!env.RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");

  if (!env.FROM_EMAIL) throw new Error("FROM_EMAIL is not configured");

  const res = await fetch("https\://api.resend.com/emails", {

    method: "POST",

    headers: {

      authorization: `Bearer ${env.RESEND_API_KEY}`,

      "content-type": "application/json"

    },

    body: JSON.stringify({ from: env.FROM_EMAIL, to: [to], subject, html, text: textBody })

  });

  if (!res.ok) {

    const detail = await res.text();

    throw new Error(`Resend failed: ${res.status} ${detail}`);

  }

}

__name(sendEmail, "sendEmail");

function emailTemplate({ title, preview, greeting, body, bookingUrl, voucherCode: voucherCode2 }) {

  const safeTitle = escapeHtml(title);

  const safePreview = escapeHtml(preview || title);

  const safeBooking = escapeHtml(bookingUrl || "https\://atmmobility.noterro.com");

  const safeVoucher = voucherCode2 ? escapeHtml(voucherCode2) : "";

  const htmlBody = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safeTitle}</title>

  <style>body{font-family:Arial,sans-serif;background:#f4f4f4;color:#111;margin:0;padding:24px}.pre{display:none!important;opacity:0;color:transparent;height:0;width:0;overflow:hidden}.card{max-width:640px;margin:auto;background:#fff;border-top:6px solid #c8102e;padding:28px;border-radius:6px}.logo{font-size:28px;font-weight:800;color:#c8102e;letter-spacing:.02em}.logo span{color:#111}.btn{display:inline-block;background:#c8102e;color:#fff!important;padding:13px 22px;text-decoration:none;font-weight:700;border-radius:3px}.code{font-size:30px;font-weight:800;letter-spacing:.08em;background:#111;color:#fff;padding:16px;text-align:center;margin:18px 0}.muted{color:#666}.foot{font-size:12px;color:#777;line-height:1.5;margin-top:24px}</style></head><body><div class="pre">${safePreview}</div><div class="card"><div class="logo">ATM <span>MOBILITY &amp; THERAPY</span></div><h1>${safeTitle}</h1><p>${greeting}</p>${body}<p><a class="btn" href="${safeBooking}">Book With ATM</a></p>${safeVoucher ? `<p class="muted">Voucher code: <strong>${safeVoucher}</strong></p>` : ""}<p class="muted">ATM Mobility &amp; Therapy<br>542 Champagne Dr., North York</p><p class="foot">You received this because you submitted a Stretch Reset waiver or requested ATM Mobility &amp; Therapy follow-up. Reply to this email if you need help booking or want to stop receiving reminders.</p></div></body></html>`;

  const text2 = `${title}



${stripHtml(greeting)}



${stripHtml(body)}



${voucherCode2 ? `Voucher: ${voucherCode2}



` : ""}Book: ${bookingUrl}



ATM Mobility & Therapy

542 Champagne Dr., North York`;

  return { html: htmlBody, text: text2 };

}

__name(emailTemplate, "emailTemplate");

function escapeHtml(input) {

  return String(input ?? "").replace(/[&<>'"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[ch]);

}

__name(escapeHtml, "escapeHtml");

function stripHtml(input) {

  return String(input ?? "").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

}

__name(stripHtml, "stripHtml");

function formatDate(iso) {

  try {

    return new Date(iso).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });

  } catch (_err) {

    return iso;

  }

}

__name(formatDate, "formatDate");

function requireAdmin(request, env) {

  const auth = request.headers.get("Authorization") || "";

  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";

  const headerKey = request.headers.get("X-Admin-Key") || "";

  const urlKey = new URL(request.url).searchParams.get("key") || "";

  const provided = bearer || headerKey || urlKey;

  return Boolean(env.ADMIN_KEY && provided && provided === env.ADMIN_KEY);

}

__name(requireAdmin, "requireAdmin");

async function adminLeads(request, env, asCsv) {

  if (!requireAdmin(request, env)) return json(request, env, { ok: false, error: "Unauthorized" }, 401);

  const url = new URL(request.url);

  const campaign = clean(url.searchParams.get("campaign") || "", 80);

  const q = clean(url.searchParams.get("q") || "", 120).toLowerCase();

  const status = clean(url.searchParams.get("status") || "", 40);

  const limit = Math.min(Number(url.searchParams.get("limit") || 500), 1e3);

  const conditions = [];

  const binds = [];

  if (campaign) {

    conditions.push("l.campaign_id = ?");

    binds.push(campaign);

  }

  if (status) {

    conditions.push("v.status = ?");

    binds.push(status);

  }

  if (q) {

    conditions.push('(lower(l.first_name || " " || l.last_name) LIKE ? OR lower(l.email) LIKE ? OR l.phone LIKE ? OR lower(v.code) LIKE ?)');

    binds.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);

  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const rows = await env.DB.prepare(`

    SELECT l.id AS lead_id, l.created_at, l.first_name, l.last_name, l.email, l.phone, l.primary_concern, l.concern_other,

           l.marketing_consent, l.campaign_id, COALESCE(l.validation_status,'validated') AS validation_status, l.validated_at, c.name AS campaign_name, v.id AS voucher_id, v.code AS voucher_code,

           COALESCE(v.status, COALESCE(l.validation_status,'pending_validation')) AS voucher_status, v.expires_at, v.redeemed_at

    FROM leads l

    LEFT JOIN campaigns c ON c.id = l.campaign_id

    LEFT JOIN vouchers v ON v.lead_id = l.id

    ${where}

    ORDER BY l.created_at DESC

    LIMIT ?

  `).bind(...binds, limit).all();

  const data = rows.results || [];

  if (asCsv) return text(request, env, toCsv(data), 200, "text/csv; charset=utf-8");

  return json(request, env, { ok: true, leads: data });

}

__name(adminLeads, "adminLeads");

async function adminStats(request, env) {

  if (!requireAdmin(request, env)) return json(request, env, { ok: false, error: "Unauthorized" }, 401);

  const campaign = clean(new URL(request.url).searchParams.get("campaign") || DEFAULT_CAMPAIGN_ID, 80);

  const overview = await env.DB.prepare(`

    SELECT

      COUNT(DISTINCT l.id) AS leads,

      COUNT(DISTINCT CASE WHEN l.marketing_consent = 1 THEN l.id END) AS consented,

      COUNT(DISTINCT CASE WHEN COALESCE(l.validation_status,'validated') = 'validated' THEN l.id END) AS validated,

      COUNT(DISTINCT v.id) AS vouchers,

      COUNT(DISTINCT CASE WHEN v.status = 'redeemed' THEN v.id END) AS redeemed,

      COUNT(DISTINCT CASE WHEN eq.email_type = 'voucher' AND eq.send_status = 'sent' THEN eq.id END) AS voucher_emails_sent,

      COUNT(DISTINCT CASE WHEN eq.send_status = 'failed' THEN eq.id END) AS failed_emails

    FROM campaigns c

    LEFT JOIN leads l ON l.campaign_id = c.id

    LEFT JOIN vouchers v ON v.lead_id = l.id

    LEFT JOIN email_queue eq ON eq.lead_id = l.id

    WHERE c.id = ?

  `).bind(campaign).first();

  const byConcern = await env.DB.prepare(`

    SELECT primary_concern, COUNT(*) AS count FROM leads WHERE campaign_id = ? GROUP BY primary_concern ORDER BY count DESC

  `).bind(campaign).all();

  return json(request, env, { ok: true, campaign, overview: overview || {}, by_concern: byConcern.results || [] });

}

__name(adminStats, "adminStats");

function toCsv(rows) {

  const headers = ["created_at", "campaign_id", "campaign_name", "first_name", "last_name", "email", "phone", "primary_concern", "concern_other", "marketing_consent", "voucher_code", "voucher_status", "expires_at", "redeemed_at"];

  const esc = /* @__PURE__ */ __name((v) => `"${String(v ?? "").replace(/"/g, '""')}"`, "esc");

  return [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");

}

__name(toCsv, "toCsv");

async function redeemVoucher(request, env) {

  if (!requireAdmin(request, env)) return json(request, env, { ok: false, error: "Unauthorized" }, 401);

  const body = await request.json().catch(() => null);

  if (!body?.code) return json(request, env, { ok: false, error: "Voucher code required" }, 400);

  const code = clean(body.code, 40).toUpperCase();

  const note = clean(body.note || "", 240);

  const existing = await env.DB.prepare("SELECT * FROM vouchers WHERE code = ?").bind(code).first();

  if (!existing) return json(request, env, { ok: false, error: "Voucher not found" }, 404);

  if (existing.status === "redeemed") return json(request, env, { ok: false, error: "Voucher already redeemed" }, 409);

  if (existing.status !== "issued") return json(request, env, { ok: false, error: `Voucher cannot be redeemed because it is ${existing.status}.` }, 409);

  await env.DB.prepare(`UPDATE vouchers SET status='redeemed', redeemed_at=?, redeemed_note=? WHERE code=?`).bind(nowIso(), note, code).run();

  await env.DB.prepare(`INSERT INTO lead_events (id, lead_id, event_type, event_detail) VALUES (?, ?, 'voucher_redeemed', ?)`).bind(uid("evt_"), existing.lead_id, code).run();

  return json(request, env, { ok: true, code, status: "redeemed" });

}

__name(redeemVoucher, "redeemVoucher");

async function resendVoucherEmail(request, env) {

  if (!requireAdmin(request, env)) return json(request, env, { ok: false, error: "Unauthorized" }, 401);

  const body = await request.json().catch(() => null);

  const code = clean(body?.code || "", 40).toUpperCase();

  if (!code) return json(request, env, { ok: false, error: "Voucher code required" }, 400);

  const row = await env.DB.prepare(`

    SELECT l.id AS lead_id, l.first_name, l.email, v.id AS voucher_id, v.code, v.expires_at, c.*

    FROM vouchers v

    JOIN leads l ON l.id = v.lead_id

    JOIN campaigns c ON c.id = v.campaign_id

    WHERE v.code = ?

  `).bind(code).first();

  if (!row) return json(request, env, { ok: false, error: "Voucher not found" }, 404);

  await queueVoucherResend(env, { leadId: row.lead_id, voucherId: row.voucher_id, campaign: row, firstName: row.first_name, email: row.email, code: row.code, expiresAt: row.expires_at });

  const result = await processEmailQueue(env, 5);

  return json(request, env, { ok: true, code, email_result: result });

}

__name(resendVoucherEmail, "resendVoucherEmail");

async function adminValidateLead(request, env) {

  if (!requireAdmin(request, env)) return json(request, env, { ok: false, error: "Unauthorized" }, 401);

  const body = await request.json().catch(() => null);

  const leadId = clean(body?.lead_id || "", 100);

  if (!leadId) return json(request, env, { ok: false, error: "Lead ID required" }, 400);

  const row = await env.DB.prepare(`

    SELECT l.*, c.name AS campaign_name, c.voucher_prefix, c.voucher_value_cents, c.voucher_expiry_days, c.noterro_url, c.is_active,

           v.id AS existing_voucher_id, v.code AS existing_code, v.expires_at AS existing_expires_at, v.status AS existing_voucher_status

    FROM leads l

    JOIN campaigns c ON c.id = l.campaign_id

    LEFT JOIN vouchers v ON v.lead_id = l.id AND v.status = 'issued'

    WHERE l.id = ?

    ORDER BY v.issued_at DESC

    LIMIT 1

  `).bind(leadId).first();

  if (!row) return json(request, env, { ok: false, error: "Lead not found." }, 404);

  if (!row.is_active) return json(request, env, { ok: false, error: "This campaign is not active." }, 400);

  if (row.validation_status === "void") return json(request, env, { ok: false, error: "This waiver record has been voided." }, 409);

  if (row.existing_voucher_id && row.existing_code) {

    await env.DB.prepare(`UPDATE leads SET validation_status='validated', validated_at=COALESCE(validated_at, ?), updated_at=? WHERE id=?`).bind(nowIso(), nowIso(), row.id).run();

    return json(request, env, {

      ok: true,

      already_validated: true,

      lead_id: row.id,

      voucher_code: row.existing_code,

      expires_at: row.existing_expires_at,

      booking_url: row.noterro_url || env.NOTERRO_URL,

      message: "This lead already has a voucher."

    });

  }

  const voucherId = uid("voucher_");

  const expiresAt = addDays(row.voucher_expiry_days || 60);

  let code = voucherCode(row.voucher_prefix || "ATM");

  for (let tries = 0; tries < 5; tries += 1) {

    const existingCode = await env.DB.prepare("SELECT id FROM vouchers WHERE code = ?").bind(code).first();

    if (!existingCode) break;

    code = voucherCode(row.voucher_prefix || "ATM");

  }

  await env.DB.batch([

    env.DB.prepare(`INSERT INTO vouchers (id, code, lead_id, campaign_id, value_cents, expires_at)

      VALUES (?, ?, ?, ?, ?, ?)`).bind(voucherId, code, row.id, row.campaign_id, row.voucher_value_cents || VOUCHER_VALUE_CENTS, expiresAt),

    env.DB.prepare(`UPDATE leads SET validation_status='validated', validated_at=?, updated_at=? WHERE id=?`).bind(nowIso(), nowIso(), row.id),

    env.DB.prepare(`INSERT INTO lead_events (id, lead_id, event_type, event_detail) VALUES (?, ?, 'staff_admin_validated', ?)`).bind(uid("evt_"), row.id, "Voucher issued from admin validation")

  ]);

  await queueLeadEmails(env, {

    leadId: row.id,

    voucherId,

    campaign: {

      id: row.campaign_id,

      name: row.campaign_name,

      voucher_prefix: row.voucher_prefix,

      voucher_value_cents: row.voucher_value_cents,

      voucher_expiry_days: row.voucher_expiry_days,

      noterro_url: row.noterro_url,

      is_active: row.is_active

    },

    firstName: row.first_name,

    email: row.email,

    code,

    expiresAt,

    marketingConsent: Boolean(row.marketing_consent)

  });

  const emailResult = await processEmailQueue(env, 5);

  return json(request, env, {

    ok: true,

    validated: true,

    lead_id: row.id,

    voucher_code: code,

    expires_at: expiresAt,

    email_result: emailResult,

    message: "Lead validated and voucher email sent."

  });

}

__name(adminValidateLead, "adminValidateLead");

async function updateLeadEmail(request, env) {

  if (!requireAdmin(request, env)) return json(request, env, { ok: false, error: "Unauthorized" }, 401);

  const body = await request.json().catch(() => null);

  const leadId = clean(body?.lead_id || "", 80);

  const email = normalizeEmail(body?.email || "");

  const shouldResend = truthy(body?.resend);

  if (!leadId) return json(request, env, { ok: false, error: "Lead ID required" }, 400);

  if (!validEmail(email)) return json(request, env, { ok: false, error: "Valid email required" }, 400);

  const row = await env.DB.prepare(`

    SELECT l.id AS lead_id, l.first_name, l.email AS old_email, v.id AS voucher_id, v.code, v.expires_at, c.*

    FROM leads l

    LEFT JOIN vouchers v ON v.lead_id = l.id AND v.status = 'issued'

    JOIN campaigns c ON c.id = l.campaign_id

    WHERE l.id = ?

    ORDER BY v.issued_at DESC

    LIMIT 1

  `).bind(leadId).first();

  if (!row) return json(request, env, { ok: false, error: "Lead not found" }, 404);

  await env.DB.batch([

    env.DB.prepare(`UPDATE leads SET email=?, updated_at=? WHERE id=?`).bind(email, nowIso(), leadId),

    env.DB.prepare(`UPDATE email_queue SET to_email=? WHERE lead_id=? AND send_status IN ('pending','failed')`).bind(email, leadId),

    env.DB.prepare(`INSERT INTO lead_events (id, lead_id, event_type, event_detail) VALUES (?, ?, 'email_updated', ?)`).bind(uid("evt_"), leadId, `Email changed from ${row.old_email} to ${email}`)

  ]);

  let emailResult = null;

  if (shouldResend && row.voucher_id) {

    await queueVoucherResend(env, { leadId: row.lead_id, voucherId: row.voucher_id, campaign: row, firstName: row.first_name, email, code: row.code, expiresAt: row.expires_at });

    emailResult = await processEmailQueue(env, 5);

  }

  return json(request, env, { ok: true, lead_id: leadId, email, email_result: emailResult });

}

__name(updateLeadEmail, "updateLeadEmail");

async function voidLead(request, env) {

  if (!requireAdmin(request, env)) return json(request, env, { ok: false, error: "Unauthorized" }, 401);

  const body = await request.json().catch(() => null);

  const leadId = clean(body?.lead_id || "", 80);

  const reason = clean(body?.reason || "Bad email / invalid lead", 240);

  if (!leadId) return json(request, env, { ok: false, error: "Lead ID required" }, 400);

  const lead = await env.DB.prepare("SELECT id FROM leads WHERE id=?").bind(leadId).first();

  if (!lead) return json(request, env, { ok: false, error: "Lead not found" }, 404);

  await env.DB.batch([

    env.DB.prepare(`UPDATE vouchers SET status='void', redeemed_note=? WHERE lead_id=? AND status='issued'`).bind(reason, leadId),

    env.DB.prepare(`UPDATE email_queue SET send_status='skipped', error_message=? WHERE lead_id=? AND send_status IN ('pending','failed')`).bind(reason, leadId),

    env.DB.prepare(`INSERT INTO lead_events (id, lead_id, event_type, event_detail) VALUES (?, ?, 'lead_voided', ?)`).bind(uid("evt_"), leadId, reason)

  ]);

  return json(request, env, { ok: true, lead_id: leadId, status: "void" });

}

__name(voidLead, "voidLead");

async function processNow(request, env) {

  if (!requireAdmin(request, env)) return json(request, env, { ok: false, error: "Unauthorized" }, 401);

  const result = await processEmailQueue(env, 50);

  await expireOldVouchers(env);

  return json(request, env, { ok: true, ...result });

}

__name(processNow, "processNow");

async function expireOldVouchers(env) {

  await env.DB.prepare(`UPDATE vouchers SET status='expired' WHERE status='issued' AND expires_at < ?`).bind(nowIso()).run();

}

__name(expireOldVouchers, "expireOldVouchers");

function daysRemaining(expiresAt, now = new Date()) {
  const remainingMs = Date.parse(expiresAt) - now.getTime();
  if (!Number.isFinite(remainingMs) || remainingMs <= 0) return 0;
  return Math.ceil(remainingMs / 86400000);
}

__name(daysRemaining, "daysRemaining");

function reminderSchedule(expiryDays) {
  const validityDays = Math.max(1, Number(expiryDays || 60));
  const midpointDaysRemaining = Math.min(30, Math.max(1, Math.ceil(validityDays / 2)));
  const finalDaysRemaining = Math.min(7, Math.max(1, validityDays - 1));
  return {
    validityDays,
    midpointDaysRemaining,
    finalDaysRemaining,
    midpointDelayDays: validityDays - midpointDaysRemaining,
    finalDelayDays: validityDays - finalDaysRemaining
  };
}

export {

  worker_default as default,
  daysRemaining,
  reminderSchedule

};


