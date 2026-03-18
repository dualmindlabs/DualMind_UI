/**
 * DualMind · send-user-auth-email
 * Supabase Edge Function · Deno runtime
 * Arena theme · v3
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const CORS: HeadersInit = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const JSON_HDR: HeadersInit = { ...CORS, "Content-Type": "application/json" };

type EmailType = "welcome" | "login";

interface LoginInfo {
  time?: string;
  browser?: string;
  device?: string;
  location?: string;
  ip?: string;
  deviceFingerprint?: string;
}

interface ReqBody {
  type?: EmailType;
  redirectUrl?: string;
  timezone?: string;
  userAgent?: string;
  loginInfo?: LoginInfo;
}

interface IpInfoResponse {
  ipVersion?: number;
  ipAddress?: string;
  latitude?: number;
  longitude?: number;
  countryName?: string;
  countryCode?: string;
  capital?: string;
  phoneCodes?: number[];
  timeZones?: string[];
  zipCode?: string;
  cityName?: string;
  regionName?: string;
  regionCode?: string;
  continent?: string;
  continentCode?: string;
  currencies?: string[];
  languages?: string[];
  asn?: string;
  asnOrganization?: string;
  isProxy?: boolean;
  [k: string]: unknown;
}

interface LoginSecurityContext {
  occurredAtIso: string;
  ipAddress: string;
  latitude: number | null;
  longitude: number | null;
  countryCode: string;
  countryName: string;
  regionName: string;
  cityName: string;
  zipCode: string;
  continent: string;
  capital: string;
  currencies: string;
  languages: string;
  localTime: string;
  asn: string;
  asnOrganization: string;
  isProxy: boolean;
  browser: string;
  device: string;
  userAgent: string;
  locationText: string;
  deviceFingerprint: string;
  isNewCountry: boolean;
  isNewDevice: boolean;
  impossibleTravel: boolean;
  travelKm: number | null;
  travelKmh: number | null;
  riskScore: number;
  riskLevel: "low" | "medium" | "high";
  rawIpPayload: Record<string, unknown>;
}

// ─── Rate limiter ─────────────────────────────────────────────────────────────
const rl = new Map<string, number[]>();
function isRateLimited(userId: string): boolean {
  const windowMs = Number(Deno.env.get("RATE_LIMIT_WINDOW_MS") ?? 60_000);
  const maxHits  = Number(Deno.env.get("RATE_LIMIT_MAX_PER_WINDOW") ?? 5);
  const now      = Date.now();
  const hits     = (rl.get(userId) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= maxHits) return true;
  hits.push(now);
  rl.set(userId, hits);
  if (rl.size > 20_000) [...rl.keys()].slice(0, 10_000).forEach((k) => rl.delete(k));
  return false;
}

// ─── Utils ────────────────────────────────────────────────────────────────────
function x(v: string | null | undefined): string {
  return String(v ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
function trim(v: string | undefined): string { return (v ?? "").trim(); }
function getIP(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || "—";
}
function normalizeIP(ip: string | undefined): string {
  const raw = (ip ?? "").trim();
  if (!raw || raw === "—" || raw.toLowerCase() === "unknown") return "";
  return raw.startsWith("::ffff:") ? raw.slice(7) : raw;
}
function isPrivateIP(ip: string): boolean {
  if (!ip) return true;
  if (ip.includes(":")) {
    const l = ip.toLowerCase();
    return l === "::1" || l.startsWith("fc") || l.startsWith("fd") || l.startsWith("fe80:");
  }
  return ip.startsWith("10.") || ip.startsWith("127.") || ip.startsWith("192.168.")
    || /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip);
}
function buildLocation(i: IpInfoResponse): string {
  return [trim(i.cityName), trim(i.regionName) || trim(i.regionCode),
          trim(i.countryName) || trim(i.countryCode)].filter(Boolean).join(", ");
}
function toFloat(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") { const n = Number(v); if (Number.isFinite(n)) return n; }
  return null;
}
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371, rad = (d: number) => (d * Math.PI) / 180;
  const a = Math.sin(rad(lat2-lat1)/2)**2 +
    Math.cos(rad(lat1))*Math.cos(rad(lat2))*Math.sin(rad(lon2-lon1)/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
function buildFallbackFingerprint(browser: string, device: string, ua: string, tz?: string): string {
  return [browser, device, tz ?? "UTC", ua.slice(0, 120)].join("|");
}
function scoreRisk(o: { isNewCountry: boolean; isNewDevice: boolean; isProxy: boolean; impossibleTravel: boolean }) {
  let s = 0;
  if (o.isNewCountry) s += 35; if (o.isNewDevice) s += 25;
  if (o.isProxy) s += 30;      if (o.impossibleTravel) s += 40;
  if (s > 100) s = 100;
  if (s >= 70) return { riskScore: s, riskLevel: "high" as const };
  if (s >= 30) return { riskScore: s, riskLevel: "medium" as const };
  return { riskScore: s, riskLevel: "low" as const };
}
function riskColor(level: "low" | "medium" | "high"): string {
  return level === "high" ? "#BB0000" : level === "medium" ? "#D97706" : "#059669";
}
function detectBrowser(ua: string): string {
  const a = ua.toLowerCase();
  if (a.includes("edg/")) return "Microsoft Edge";
  if (a.includes("opr/") || a.includes("opera")) return "Opera";
  if (a.includes("chrome/") && !a.includes("chromium")) return "Google Chrome";
  if (a.includes("chromium")) return "Chromium";
  if (a.includes("safari/") && !a.includes("chrome/")) return "Safari";
  if (a.includes("firefox/")) return "Firefox";
  if (a.includes("samsung")) return "Samsung Internet";
  return "Unknown browser";
}
function detectDevice(ua: string): string {
  const a = ua.toLowerCase();
  if (a.includes("iphone")) return "iPhone";
  if (a.includes("ipad")) return "iPad";
  if (a.includes("android") && a.includes("mobile")) return "Android Phone";
  if (a.includes("android")) return "Android Tablet";
  if (a.includes("windows phone")) return "Windows Phone";
  if (a.includes("macintosh") || a.includes("mac os x")) return "Mac";
  if (a.includes("windows")) return "Windows PC";
  if (a.includes("linux")) return "Linux";
  if (a.includes("cros")) return "Chromebook";
  return "Unknown device";
}
function formatDate(ts: string | undefined, tz: string | undefined): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
      timeZoneName: "short", timeZone: tz ?? "UTC",
    }).format(new Date(ts ?? new Date().toISOString()));
  } catch { return new Date(ts ?? "").toUTCString(); }
}
function getLocalTime(tz: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      hour: "2-digit", minute: "2-digit", second: "2-digit",
      timeZoneName: "short", timeZone: tz,
    }).format(new Date());
  } catch { return "—"; }
}
async function fetchIpInfo(ip: string): Promise<IpInfoResponse | null> {
  const base = (Deno.env.get("IP_INFO_API_BASE_URL") ?? "https://free.freeipapi.com/api/json/").trim();
  const ms   = Number(Deno.env.get("IP_INFO_TIMEOUT_MS") ?? 3000);
  const ac   = new AbortController();
  const t    = setTimeout(() => ac.abort(), ms);
  try {
    const res = await fetch(`${base}${encodeURIComponent(ip)}`, { signal: ac.signal });
    return res.ok ? await res.json() as IpInfoResponse : null;
  } catch { return null; } finally { clearTimeout(t); }
}

// ─── User helpers ─────────────────────────────────────────────────────────────
function getName(u: Record<string, unknown>): string {
  const m = (u.user_metadata ?? {}) as Record<string, string>;
  return m.full_name || m.name || m.display_name
    || String(u.email ?? "").split("@")[0] || "there";
}
function getFirstName(u: Record<string, unknown>): string { return getName(u).split(/\s+/)[0]; }
function getProvider(u: Record<string, unknown>): string {
  const a = (u.app_metadata ?? {}) as Record<string, unknown>;
  const p = (a.provider as string) ?? ((a.providers as string[] | undefined)?.[0]) ?? "email";
  return p.charAt(0).toUpperCase() + p.slice(1);
}

// ─── Build security context ───────────────────────────────────────────────────
async function buildLoginSecurityContext(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  body: ReqBody,
  req: Request,
): Promise<LoginSecurityContext> {
  const ua            = body.userAgent ?? req.headers.get("user-agent") ?? "";
  const info          = body.loginInfo ?? {};
  const occurredAtIso = new Date(info.time ?? new Date().toISOString()).toISOString();
  const browser       = info.browser ?? detectBrowser(ua);
  const device        = info.device  ?? detectDevice(ua);
  const rawIP         = normalizeIP(info.ip ?? getIP(req));

  let ipInfo: IpInfoResponse | null = null;
  if (rawIP && !isPrivateIP(rawIP)) ipInfo = await fetchIpInfo(rawIP);

  const ipAddress       = trim(info.ip) || trim(ipInfo?.ipAddress) || rawIP || "—";
  const latitude        = toFloat(ipInfo?.latitude);
  const longitude       = toFloat(ipInfo?.longitude);
  const countryCode     = trim(ipInfo?.countryCode).toUpperCase();
  const countryName     = trim(ipInfo?.countryName);
  const regionName      = trim(ipInfo?.regionName) || trim(ipInfo?.regionCode);
  const cityName        = trim(ipInfo?.cityName);
  const zipCode         = trim(ipInfo?.zipCode);
  const continent       = trim(ipInfo?.continent);
  const capital         = trim(ipInfo?.capital);
  const currencies      = (ipInfo?.currencies ?? []).join(", ");
  const languages       = (ipInfo?.languages  ?? []).map((l) => l.toUpperCase()).join(", ");
  const asn             = trim(ipInfo?.asn);
  const asnOrganization = trim(ipInfo?.asnOrganization);
  const isProxy         = Boolean(ipInfo?.isProxy);
  const locationText    = trim(info.location) || buildLocation(ipInfo ?? {});
  const tzList          = ipInfo?.timeZones ?? [];
  const localTime       = tzList.length > 0 ? getLocalTime(tzList[0]) : "—";
  const deviceFingerprint = trim(info.deviceFingerprint)
    || buildFallbackFingerprint(browser, device, ua, body.timezone);

  // DB: new device?
  let isNewDevice = true;
  const { data: existingDev, error: devErr } = await supabase
    .from("user_devices").select("id")
    .eq("user_id", userId).eq("fingerprint", deviceFingerprint).maybeSingle();
  if (devErr && devErr.code !== "PGRST116") console.warn("[auth-email] devices lookup:", devErr.message);
  isNewDevice = !existingDev;

  // DB: previous login for travel/country check
  let isNewCountry = false, impossibleTravel = false;
  let travelKm: number | null = null, travelKmh: number | null = null;

  const { data: prevLogin, error: prevErr } = await supabase
    .from("login_events").select("occurred_at, latitude, longitude, country_code")
    .eq("user_id", userId).order("occurred_at", { ascending: false }).limit(1).maybeSingle();
  if (prevErr && prevErr.code !== "PGRST116") console.warn("[auth-email] prev login lookup:", prevErr.message);

  if (prevLogin?.country_code && countryCode && prevLogin.country_code !== countryCode) isNewCountry = true;
  const pLat = toFloat(prevLogin?.latitude), pLon = toFloat(prevLogin?.longitude);
  if (pLat !== null && pLon !== null && latitude !== null && longitude !== null) {
    travelKm = haversineKm(pLat, pLon, latitude, longitude);
    const hours = (new Date(occurredAtIso).getTime() - new Date(prevLogin.occurred_at).getTime()) / 3_600_000;
    if (hours > 0) {
      travelKmh = travelKm / hours;
      if (hours < 12 && travelKmh > 900) impossibleTravel = true;
    }
  }

  const { riskScore, riskLevel } = scoreRisk({ isNewCountry, isNewDevice, isProxy, impossibleTravel });

  return {
    occurredAtIso, ipAddress, latitude, longitude,
    countryCode, countryName, regionName, cityName, zipCode,
    continent, capital, currencies, languages, localTime,
    asn, asnOrganization, isProxy,
    browser, device, userAgent: ua,
    locationText, deviceFingerprint,
    isNewCountry, isNewDevice, impossibleTravel, travelKm, travelKmh,
    riskScore, riskLevel,
    rawIpPayload: (ipInfo ?? {}) as Record<string, unknown>,
  };
}

// ─── Persist ──────────────────────────────────────────────────────────────────
async function persistLoginSecurityData(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  ctx: LoginSecurityContext,
  emailSent: boolean,
  messageId: string | null,
): Promise<void> {
  const now = new Date().toISOString();
  const ip  = ctx.ipAddress !== "—" ? ctx.ipAddress : null;

  const { error: d } = await supabase.from("user_devices").upsert(
    { user_id: userId, fingerprint: ctx.deviceFingerprint,
      first_seen_at: now, last_seen_at: now,
      first_ip: ip, last_ip: ip,
      first_country_code: ctx.countryCode || null,
      last_country_code:  ctx.countryCode || null,
      browser: ctx.browser, device: ctx.device, updated_at: now },
    { onConflict: "user_id,fingerprint" },
  );
  if (d) console.warn("[auth-email] devices upsert:", d.message);

  const { error: e } = await supabase.from("login_events").insert({
    user_id: userId, occurred_at: ctx.occurredAtIso,
    ip_address: ip, latitude: ctx.latitude, longitude: ctx.longitude,
    country_code: ctx.countryCode || null, country_name: ctx.countryName || null,
    region_name: ctx.regionName || null, city_name: ctx.cityName || null,
    asn: ctx.asn || null, asn_organization: ctx.asnOrganization || null,
    is_proxy: ctx.isProxy, browser: ctx.browser, device: ctx.device,
    user_agent: ctx.userAgent, device_fingerprint: ctx.deviceFingerprint,
    is_new_country: ctx.isNewCountry, is_new_device: ctx.isNewDevice,
    impossible_travel: ctx.impossibleTravel,
    travel_km: ctx.travelKm, travel_kmh: ctx.travelKmh,
    risk_score: ctx.riskScore, risk_level: ctx.riskLevel,
    email_sent: emailSent, email_message_id: messageId,
    raw_ip_payload: ctx.rawIpPayload,
  });
  if (e) console.warn("[auth-email] events insert:", e.message);
}

// ─── Email shell ──────────────────────────────────────────────────────────────
function arenaShell(preview: string, content: string, year: number, site: string): string {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html><head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style type="text/css">
    #outlook a{padding:0}body{-webkit-text-size-adjust:none;margin:0;padding:0;background-color:#FAFAFA;width:100%}table td{border-collapse:collapse}
  </style>
</head>
<body leftmargin="0" marginwidth="0" topmargin="0" marginheight="0" offset="0"
  style="-webkit-text-size-adjust:none;margin:0;padding:0;background-color:#FAFAFA;width:100%">
<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#FAFAFA">${x(preview)}&nbsp;&zwnj;</div>
<center>
<table border="0" cellpadding="0" cellspacing="0" height="100%" style="margin:0;padding:0;background-color:#FAFAFA;height:100%;width:100%" width="100%">
<tbody><tr><td align="center" style="border-collapse:collapse" valign="top">
  <table border="0" cellpadding="10" cellspacing="0" style="background-color:#FAFAFA" width="600">
  <tbody><tr><td style="border-collapse:collapse" valign="top">
    <table border="0" cellpadding="10" cellspacing="0" width="100%"><tbody><tr>
      <td valign="top"><div style="color:#505050;font-family:Arial;font-size:10px;line-height:10px">${x(preview)}</div></td>
      <td valign="top" width="190"><div style="color:#505050;font-family:Arial;font-size:10px;line-height:10px">
        Not displaying correctly?<br><a href="${site}" style="color:#336699;text-decoration:underline" target="_blank">View in browser</a>.
      </div></td>
    </tr></tbody></table>
  </td></tr></tbody></table>
  <table border="0" cellpadding="0" cellspacing="0" style="border:1px solid #DDDDDD;background-color:#FFFFFF" width="600">
  <tbody>
    ${content}
    <tr><td valign="top">
      <table align="center" bgcolor="#eaeceb" border="0" cellpadding="0" cellspacing="0" width="100%"><tbody><tr>
        <td style="padding:22px 24px;font-family:Helvetica,Arial,sans-serif;font-size:10px;line-height:14px;letter-spacing:0.5px;color:#262f30">
          You received this because you have a DualMind Arena account. Do not reply to this email.<br><br>
          Support: <a href="mailto:support@dualmindlab.tech" style="color:#000">support@dualmindlab.tech</a><br><br>
          &copy; ${year} DualMind Labs. All rights reserved. &nbsp;&middot;&nbsp; <a href="${site}" style="color:#000">${site}</a>
        </td>
      </tr></tbody></table>
      <table align="center" bgcolor="#111111" border="0" cellpadding="0" cellspacing="0" width="100%"><tbody><tr>
        <td bgcolor="#111111" style="color:#fff;font-weight:bold;font-size:11px;line-height:17px;padding:7px 25px;font-family:Arial,Helvetica,sans-serif;letter-spacing:0.8px" valign="center">
          <a href="${site}" style="color:#fff;text-decoration:none">DUALMIND ARENA</a> &nbsp;|&nbsp;
          <a href="${site}/settings/security" style="color:#fff;text-decoration:none">SECURITY</a> &nbsp;|&nbsp;
          <a href="mailto:support@dualmindlab.tech" style="color:#fff;text-decoration:none">CONTACT US</a>
        </td>
      </tr></tbody></table>
    </td></tr>
  </tbody></table>
</td></tr></tbody></table>
</center></body></html>`;
}

// ─── Detail row ───────────────────────────────────────────────────────────────
function dr(label: string, value: string, last = false, mono = false): string {
  if (!value || value === "—") return "";
  const border = last ? "" : "border-bottom:1px solid #EEEEEE;";
  return `<tr>
    <td style="padding:10px 14px;background-color:#F9F9F8;width:36%;border-right:1px solid #EEEEEE;${border}vertical-align:top">
      <span style="font-family:Arial,Helvetica,sans-serif;font-size:9px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;color:#AAAAAA">${x(label)}</span>
    </td>
    <td style="padding:10px 14px;background-color:#FFFFFF;${border}vertical-align:top">
      <span style="font-family:${mono ? "'Courier New',Courier,monospace" : "Arial,Helvetica,sans-serif"};font-size:11px;color:#222222;font-weight:600">${x(value)}</span>
    </td>
  </tr>`;
}

// ─── Welcome email ────────────────────────────────────────────────────────────
function buildWelcome(u: Record<string, unknown>, body: ReqBody, siteUrl: string) {
  const firstName = getFirstName(u);
  const email     = x(String(u.email ?? ""));
  const provider  = x(getProvider(u));
  const dashUrl   = x(body.redirectUrl ?? `${siteUrl}/dashboard`);
  const site      = x(siteUrl);
  const year      = new Date().getFullYear();

  const step = (n: string, title: string, desc: string) => `
    <tr><td style="padding:0 100px 14px 100px">
      <table border="0" cellpadding="0" cellspacing="0" width="100%"><tbody><tr>
        <td style="width:26px;vertical-align:top;padding-top:2px">
          <table border="0" cellpadding="0" cellspacing="0"><tbody><tr>
            <td style="width:22px;height:22px;background-color:#111111;border-radius:50%;text-align:center;vertical-align:middle;font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:bold;color:#FFFFFF;line-height:22px">${n}</td>
          </tr></tbody></table>
        </td>
        <td style="padding-left:12px;vertical-align:top">
          <p style="margin:0 0 2px 0;font-family:Arial,Helvetica,sans-serif;font-size:11pt;font-weight:bold;color:#111111;line-height:16pt">${x(title)}</p>
          <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:10pt;color:#666666;line-height:15pt">${x(desc)}</p>
        </td>
      </tr></tbody></table>
    </td></tr>`;

  const content = `
    <tr><td style="background-color:#0D0D0D;padding:52px 60px 44px;text-align:center" valign="top">
      <p style="margin:0 0 10px;font-family:Arial,Helvetica,sans-serif;font-size:9px;font-weight:bold;letter-spacing:3.5px;text-transform:uppercase;color:#666666">DualMind Labs</p>
      <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:36pt;line-height:42pt;font-weight:normal;color:#FFFFFF">You're in.</h1>
      <p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#AAAAAA">Your <strong style="color:#CCAA55">DualMind Arena</strong> account is live and ready.</p>
    </td></tr>
    <tr><td style="background-color:#CCAA55;height:3px;font-size:0;line-height:0">&nbsp;</td></tr>
    <tr><td style="padding:44px 100px 12px;text-align:left">
      <span style="font-family:Arial,Helvetica,sans-serif;font-size:13pt;line-height:20pt;color:#333333">
        Hi <strong style="color:#111111">${x(firstName)}</strong>,<br><br>
        We're glad to have you. Your account is ready — here's how to get started.
      </span>
    </td></tr>
    <tr><td style="padding:24px 100px 0"><table border="0" cellpadding="0" cellspacing="0" width="100%"><tbody><tr><td style="height:1px;background-color:#EEEEEE;font-size:0">&nbsp;</td></tr></tbody></table></td></tr>
    <tr><td style="padding:24px 100px 16px"><p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:9px;font-weight:bold;letter-spacing:2.5px;text-transform:uppercase;color:#999999">Get started in 3 steps</p></td></tr>
    ${step("1", "Log in to your account", `Visit DualMind Arena and sign in with ${String(u.email ?? "")}.`)}
    ${step("2", "Complete your profile", "Fill in your details to personalise your Arena experience.")}
    ${step("3", "Enter the Arena", "Explore the platform and see what DualMind Arena can do for you.")}
    <tr><td style="padding:8px 100px 0"><table border="0" cellpadding="0" cellspacing="0" width="100%"><tbody><tr><td style="height:1px;background-color:#EEEEEE;font-size:0">&nbsp;</td></tr></tbody></table></td></tr>
    <tr><td style="padding:24px 100px 8px">
      <p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:9px;font-weight:bold;letter-spacing:2.5px;text-transform:uppercase;color:#999999">Your account</p>
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid #EEEEEE"><tbody>
        ${dr("Email", String(u.email ?? ""))}
        ${dr("Sign-in via", getProvider(u), true)}
      </tbody></table>
    </td></tr>
    <tr><td style="padding:24px 100px 12px;text-align:center">
      <table border="0" cellpadding="0" cellspacing="0" style="margin:0 auto"><tbody><tr>
        <td style="border-radius:3px;background-color:#111111">
          <a href="${dashUrl}" target="_blank" style="display:inline-block;padding:17px 56px;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;letter-spacing:1.4px;text-transform:uppercase;color:#FFFFFF;text-decoration:none;border-radius:3px">Go to DualMind Arena</a>
        </td>
      </tr></tbody></table>
    </td></tr>
    <tr><td style="padding:4px 100px 32px;text-align:center">
      <span style="font-family:Arial,Helvetica,sans-serif;font-size:10pt;color:#999999">Signed in as <strong style="color:#555555">${email}</strong> via <strong style="color:#555555">${provider}</strong></span>
    </td></tr>`;

  return {
    subject: `Welcome to DualMind Arena, ${x(firstName)}! Your account is ready 🎉`,
    html: arenaShell(`Your DualMind Arena account is live — welcome, ${x(firstName)}!`, content, year, site),
  };
}

// ─── Login notification email ─────────────────────────────────────────────────
function buildLogin(u: Record<string, unknown>, body: ReqBody, sec: LoginSecurityContext, siteUrl: string) {
  const firstName   = getFirstName(u);
  const site        = x(siteUrl);
  const resetUrl    = x(`${siteUrl}/reset-password`);
  const year        = new Date().getFullYear();
  const isHighRisk  = sec.riskLevel === "high";
  const rc          = riskColor(sec.riskLevel);
  const time        = formatDate(sec.occurredAtIso, body.timezone);
  const travelInfo  = sec.impossibleTravel && sec.travelKm && sec.travelKmh
    ? `${Math.round(sec.travelKm).toLocaleString()} km — ${Math.round(sec.travelKmh).toLocaleString()} km/h (flagged)`
    : sec.travelKm ? `${Math.round(sec.travelKm).toLocaleString()} km from last login` : "";

  const content = `
    <tr><td style="background-color:#0D0D0D;padding:44px 60px 36px;text-align:center" valign="top">
      <p style="margin:0 0 10px;font-family:Arial,Helvetica,sans-serif;font-size:9px;font-weight:bold;letter-spacing:3.5px;text-transform:uppercase;color:#666666">DualMind Labs</p>
      <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:32pt;line-height:38pt;font-weight:normal;color:#FFFFFF">New sign-in<br>detected</h1>
      <p style="margin:16px 0 10px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#AAAAAA">Someone just signed in to your <strong style="color:#CCAA55">Arena</strong> account.</p>
      <table border="0" cellpadding="0" cellspacing="0" style="margin:8px auto 0"><tbody><tr>
        <td style="border-radius:20px;background-color:${rc};padding:5px 16px">
          <span style="font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:#FFFFFF">Risk: ${sec.riskLevel.toUpperCase()} &nbsp;&middot;&nbsp; ${sec.riskScore}/100</span>
        </td>
      </tr></tbody></table>
    </td></tr>
    <tr><td style="background-color:#CCAA55;height:3px;font-size:0;line-height:0">&nbsp;</td></tr>
    <tr><td style="padding:40px 100px 8px;text-align:left">
      <span style="font-family:Arial,Helvetica,sans-serif;font-size:13pt;line-height:20pt;color:#333333">
        Hi <strong style="color:#111111">${x(firstName)}</strong>,<br><br>
        We noticed a new sign-in to your DualMind Arena account. If this was you, no action is needed.
      </span>
    </td></tr>
    <tr><td style="padding:24px 100px 0"><table border="0" cellpadding="0" cellspacing="0" width="100%"><tbody><tr><td style="height:1px;background-color:#EEEEEE;font-size:0">&nbsp;</td></tr></tbody></table></td></tr>
    <tr><td style="padding:24px 100px 12px"><p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:9px;font-weight:bold;letter-spacing:2.5px;text-transform:uppercase;color:#999999">Sign-in details</p></td></tr>
    <tr><td style="padding:0 100px 28px">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid #EEEEEE"><tbody>
        ${dr("Account",          String(u.email ?? ""))}
        ${dr("Time",             time)}
        ${dr("IP Address",       sec.ipAddress, false, true)}
        ${dr("Location",         sec.locationText)}
        ${dr("City",             sec.cityName)}
        ${dr("Region",           sec.regionName)}
        ${dr("Postal Code",      sec.zipCode)}
        ${dr("Country",          sec.countryName + (sec.countryCode ? ` (${sec.countryCode})` : ""))}
        ${dr("Continent",        sec.continent)}
        ${dr("Capital",          sec.capital)}
        ${dr("Local Time",       sec.localTime)}
        ${dr("Currencies",       sec.currencies)}
        ${dr("Languages",        sec.languages)}
        ${dr("ISP / Org",        sec.asnOrganization)}
        ${dr("Network ASN",      sec.asn ? `AS${sec.asn}` : "")}
        ${dr("Proxy / VPN",      sec.isProxy ? "Yes — proxy or VPN detected" : "No")}
        ${dr("Device",           sec.device)}
        ${dr("Browser",          sec.browser)}
        ${dr("Sign-in via",      getProvider(u))}
        ${dr("New device",       sec.isNewDevice ? "Yes — first time seen" : "No — recognised")}
        ${dr("New country",      sec.isNewCountry ? "Yes — different from last login" : "No")}
        ${travelInfo ? dr("Travel distance", travelInfo) : ""}
        ${dr("Impossible travel",sec.impossibleTravel ? "Yes — flagged" : "No", true)}
      </tbody></table>
    </td></tr>
    <tr><td style="padding:0 100px 24px">
      <table border="0" cellpadding="0" cellspacing="0" width="100%"><tbody><tr>
        <td style="padding:16px 20px;background-color:#FEF9F9;border:1px solid #F5C6C6;border-left:3px solid #BB0000">
          <p style="margin:0 0 5px;font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:#BB0000">Wasn't you?</p>
          <span style="font-family:Arial,Helvetica,sans-serif;font-size:10pt;line-height:16pt;color:#7A0000">
            If you don't recognise this sign-in, your account may be compromised. Reset your password immediately or <a href="mailto:support@dualmindlab.tech" style="color:#BB0000;text-decoration:underline">contact us</a>.
          </span>
        </td>
      </tr></tbody></table>
    </td></tr>
    <tr><td style="padding:0 100px 40px;text-align:center">
      <table border="0" cellpadding="0" cellspacing="0" style="margin:0 auto"><tbody><tr>
        <td style="border-radius:3px;background-color:#BB0000;padding-right:10px">
          <a href="${resetUrl}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:#FFFFFF;text-decoration:none;border-radius:3px">Secure My Account</a>
        </td>
        <td style="border-radius:3px;background-color:#111111">
          <a href="${site}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:#FFFFFF;text-decoration:none;border-radius:3px">Go to Arena</a>
        </td>
      </tr></tbody></table>
    </td></tr>
    <tr><td style="padding:0 100px 32px">
      <span style="font-family:Arial,Helvetica,sans-serif;font-size:11pt;line-height:17pt;color:#555555">
        DualMind will never ask for your password by email. Need help? <strong><a href="mailto:support@dualmindlab.tech" style="text-decoration:underline;color:#111111">Contact support</a></strong>.
      </span><br>&nbsp;
    </td></tr>`;

  return {
    subject: isHighRisk
      ? `⚠ High-risk sign-in detected on your DualMind Arena account`
      : `New sign-in to your DualMind Arena account`,
    html: arenaShell(`New sign-in from ${sec.device} — ${sec.cityName || sec.countryName || "unknown location"}.`, content, year, site),
  };
}

// ─── Server ───────────────────────────────────────────────────────────────────
serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return new Response(
    JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: JSON_HDR });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return new Response(
      JSON.stringify({ error: "Missing or invalid Authorization header" }), { status: 401, headers: JSON_HDR });

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const RESEND_KEY   = Deno.env.get("RESEND_API_KEY");
    const SITE_URL     = Deno.env.get("SITE_URL") ?? "https://dualmindlab.tech";

    if (!SUPABASE_URL || !SERVICE_KEY || !RESEND_KEY) {
      console.error("[auth-email] Missing env vars");
      return new Response(JSON.stringify({ error: "Server configuration error" }), { status: 503, headers: JSON_HDR });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const token    = authHeader.slice(7).trim();
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);

    if (authErr || !user?.email) return new Response(
      JSON.stringify({ error: "Invalid or expired token" }), { status: 401, headers: JSON_HDR });

    if (isRateLimited(user.id)) return new Response(
      JSON.stringify({ error: "Rate limit reached — please wait before sending another email" }),
      { status: 429, headers: { ...JSON_HDR, "Retry-After": "60" } });

    const body: ReqBody = await req.json().catch(() => ({}));
    if (body.type !== "welcome" && body.type !== "login") return new Response(
      JSON.stringify({ error: 'type must be "welcome" or "login"' }), { status: 400, headers: JSON_HDR });

    const u = user as unknown as Record<string, unknown>;

    // ── Per-type from address ────────────────────────────────────────────────
    const fromName  = body.type === "welcome" ? "Team DualMind"             : "DualMind Security";
    const fromEmail = body.type === "welcome" ? "welcome@dualmindlab.tech"  : "security@dualmindlab.tech";

    let loginSecurity: LoginSecurityContext | null = null;
    if (body.type === "login") {
      loginSecurity = await buildLoginSecurityContext(supabase, user.id, body, req);
    }

    const email = body.type === "welcome"
      ? buildWelcome(u, body, SITE_URL)
      : buildLogin(u, body, loginSecurity as LoginSecurityContext, SITE_URL);

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to:   [user.email],
        subject: email.subject,
        html:    email.html,
        tags: [
          { name: "type",   value: body.type },
          { name: "userId", value: user.id   },
        ],
      }),
    });

    const resendData = await resendRes.json();

    if (body.type === "login" && loginSecurity) {
      await persistLoginSecurityData(supabase, user.id, loginSecurity, resendRes.ok, resendData?.id ?? null);
    }

    if (!resendRes.ok) {
      console.error("[auth-email] Resend error:", resendData);
      return new Response(JSON.stringify({ error: "Email delivery failed", detail: resendData }), { status: 502, headers: JSON_HDR });
    }

    return new Response(
      JSON.stringify({ success: true, sentTo: user.email, type: body.type, messageId: resendData?.id ?? null }),
      { status: 200, headers: JSON_HDR },
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    console.error("[auth-email] Unhandled:", msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: JSON_HDR });
  }
});