/**
 * DualMind · send-user-auth-email
 * Supabase Edge Function · Deno runtime
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const CORS: HeadersInit = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const JSON_HDR: HeadersInit = { ...CORS, "Content-Type": "application/json" };

const B = {
  primary: "#6C47FF",
  primaryDark: "#4F35C2",
  primaryMid: "#8B6FFF",
  primaryBg: "#F0ECFF",
  success: "#059669",
  successBg: "#ECFDF5",
  warning: "#D97706",
  warningBg: "#FFFBEB",
  danger: "#DC2626",
  dangerBg: "#FEF2F2",
  textDark: "#111827",
  textMid: "#374151",
  textSoft: "#6B7280",
  textLight: "#9CA3AF",
  bgPage: "#F3F0FF",
  bgCard: "#FFFFFF",
  border: "#E5E7EB",
  borderPurple: "#DDD6FE",
  font: "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif",
} as const;

type EmailType = "welcome" | "login";

interface LoginInfo {
  time?: string;
  browser?: string;
  device?: string;
  location?: string;
  ip?: string;
}

interface ReqBody {
  type?: EmailType;
  redirectUrl?: string;
  timezone?: string;
  userAgent?: string;
  loginInfo?: LoginInfo;
}

const rl = new Map<string, number[]>();

function isRateLimited(userId: string): boolean {
  const windowMs = Number(Deno.env.get("RATE_LIMIT_WINDOW_MS") ?? 60_000);
  const maxHits = Number(Deno.env.get("RATE_LIMIT_MAX_PER_WINDOW") ?? 5);
  const now = Date.now();
  const hits = (rl.get(userId) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= maxHits) return true;
  hits.push(now);
  rl.set(userId, hits);
  if (rl.size > 20_000) {
    [...rl.keys()].slice(0, 10_000).forEach((k) => rl.delete(k));
  }
  return false;
}

function x(v: string | null | undefined): string {
  return String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getIP(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("cf-connecting-ip")
      || req.headers.get("x-real-ip")
      || "—";
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
    const d = new Date(ts ?? new Date().toISOString());
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZoneName: "short",
      timeZone: tz ?? "UTC",
    }).format(d);
  } catch {
    return new Date(ts ?? "").toUTCString();
  }
}

function getName(user: Record<string, unknown>): string {
  const m = (user.user_metadata ?? {}) as Record<string, string>;
  return m.full_name || m.name || m.display_name
      || String(user.email ?? "").split("@")[0]
      || "there";
}

function getFirstName(user: Record<string, unknown>): string {
  const full = getName(user);
  return full.split(/\s+/)[0];
}

function getProvider(user: Record<string, unknown>): string {
  const a = (user.app_metadata ?? {}) as Record<string, unknown>;
  const p = (a.provider as string) ?? ((a.providers as string[] | undefined)?.[0]) ?? "email";
  return p.charAt(0).toUpperCase() + p.slice(1);
}

function shell(opts: {
  previewText: string;
  accentColor: string;
  content: string;
  siteUrl: string;
}): string {
  const { previewText, accentColor, content, siteUrl } = opts;
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml"
      xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:v="urn:schemas-microsoft-com:vml">
<head>
  <meta charset="utf-8"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <meta name="format-detection" content="telephone=no,date=no,address=no,email=no"/>
  <!--[if mso]>
  <xml>
    <o:OfficeDocumentSettings>
      <o:AllowPNG/>
      <o:PixelsPerInch>96</o:PixelsPerInch>
    </o:OfficeDocumentSettings>
  </xml>
  <![endif]-->
  <style>
    #outlook a { padding: 0; }
    body { margin: 0 !important; padding: 0 !important; width: 100% !important;
           -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { border-collapse: collapse !important;
                mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { border: 0; height: auto; line-height: 100%; outline: none;
          text-decoration: none; -ms-interpolation-mode: bicubic; }
    a[x-apple-data-detectors] { color: inherit !important;
      text-decoration: none !important; font-size: inherit !important;
      font-family: inherit !important; font-weight: inherit !important;
      line-height: inherit !important; }
    @media screen and (max-width: 600px) {
      .email-wrapper  { width: 100% !important; }
      .email-content  { padding: 24px 20px !important; }
      .email-header   { padding: 28px 20px !important; }
      .hero-title     { font-size: 26px !important; }
      .cta-table      { width: 100% !important; }
      .cta-td         { display: block !important; text-align: center !important; }
      .cta-btn        { display: block !important; width: 100% !important;
                        text-align: center !important; box-sizing: border-box !important; }
      .info-label-col { width: 36% !important; }
      .stack          { display: block !important; width: 100% !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${B.bgPage};font-family:${B.font};-webkit-font-smoothing:antialiased">
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;
            opacity:0;overflow:hidden;mso-hide:all;color:${B.bgPage}">
  ${x(previewText)}&nbsp;&zwnj;&hairsp;&zwnj;&hairsp;&zwnj;&hairsp;&zwnj;&hairsp;
  &zwnj;&hairsp;&zwnj;&hairsp;&zwnj;&hairsp;&zwnj;&hairsp;&zwnj;&hairsp;&zwnj;
</div>
<table role="presentation" border="0" cellpadding="0" cellspacing="0"
       width="100%" style="background-color:${B.bgPage}">
  <tr>
    <td align="center" style="padding:40px 16px 48px">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0"
             class="email-wrapper" width="600"
             style="max-width:600px;width:100%">
        <tr>
          <td align="center" style="padding-bottom:28px">
            <a href="${x(siteUrl)}" target="_blank"
               style="display:inline-block;text-decoration:none">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="40" height="40" align="center" valign="middle"
                      style="background-color:${B.primary};border-radius:12px;
                             width:40px;height:40px;
                             box-shadow:0 4px 12px rgba(108,71,255,0.35)">
                    <span style="font-size:20px;color:#fff;line-height:40px;
                                 font-family:serif">⬡</span>
                  </td>
                  <td style="padding-left:10px;white-space:nowrap">
                    <span style="font-size:20px;font-weight:800;color:${B.textDark};
                                 letter-spacing:-0.4px;
                                 font-family:${B.font}">Dual</span><span
                    style="font-size:20px;font-weight:800;color:${B.primary};
                           letter-spacing:-0.4px;
                           font-family:${B.font}">Mind</span>
                  </td>
                </tr>
              </table>
            </a>
          </td>
        </tr>
        <tr>
          <td style="background-color:${B.bgCard};border-radius:20px;
                     box-shadow:0 2px 40px rgba(108,71,255,0.12),
                                0 1px 4px rgba(0,0,0,0.04);
                     overflow:hidden">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0"
                   width="100%">
              <tr>
                <td height="5" style="background:linear-gradient(90deg,
                    ${accentColor} 0%,${B.primaryMid} 50%,${accentColor} 100%);
                    font-size:0;line-height:0">&nbsp;</td>
              </tr>
            </table>
            ${content}
          </td>
        </tr>
        <tr>
          <td align="center" style="padding-top:28px">
            <p style="margin:0 0 8px;font-size:12px;line-height:1.6;
                      color:${B.textLight};font-family:${B.font}">
              You received this because you have a DualMind account.
            </p>
            <p style="margin:0 0 8px;font-size:12px;line-height:1.6;
                      color:${B.textLight};font-family:${B.font}">
              <a href="${x(siteUrl)}/settings/notifications"
                 style="color:${B.primary};text-decoration:underline">
                Manage email preferences
              </a>
              &nbsp;·&nbsp;
              <a href="${x(siteUrl)}/privacy"
                 style="color:${B.primary};text-decoration:underline">
                Privacy policy
              </a>
            </p>
            <p style="margin:0;font-size:11px;color:${B.textLight};
                      font-family:${B.font}">
              © ${year} DualMind. All rights reserved.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

function ctaButton(href: string, label: string, bgColor = B.primary): string {
  return `
<table role="presentation" border="0" cellpadding="0" cellspacing="0" class="cta-table"
       style="margin:28px 0 4px">
  <tr>
    <td class="cta-td" align="left">
      <!--[if mso]>
      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml"
                   xmlns:w="urn:schemas-microsoft-com:office:word"
                   href="${x(href)}"
                   style="height:50px;v-text-anchor:middle;width:220px;"
                   arcsize="24%" stroke="f" fillcolor="${bgColor}">
        <w:anchorlock/>
        <center style="color:#ffffff;font-family:${B.font};font-size:15px;font-weight:bold">
          ${x(label)}
        </center>
      </v:roundrect>
      <![endif]-->
      <!--[if !mso]><!-->
      <a href="${x(href)}" target="_blank" class="cta-btn"
         style="display:inline-block;background-color:${bgColor};
                border-radius:12px;color:#ffffff;font-family:${B.font};
                font-size:15px;font-weight:700;letter-spacing:0.2px;
                line-height:1;padding:16px 36px;text-decoration:none;
                mso-padding-alt:0px">
        ${x(label)}
      </a>
      <!--<![endif]-->
    </td>
  </tr>
</table>`;
}

function p(html: string): string {
  return `<p style="margin:0 0 18px;font-size:15px;line-height:1.75;
color:${B.textMid};font-family:${B.font}">${html}</p>`;
}

function note(html: string): string {
  return `<p style="margin:0 0 12px;font-size:13px;line-height:1.65;
color:${B.textSoft};font-family:${B.font}">${html}</p>`;
}

function hr(): string {
  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0"
       width="100%" style="margin:24px 0">
  <tr><td height="1" style="background-color:${B.border};font-size:0;line-height:0">&nbsp;</td></tr>
</table>`;
}

function infoTable(rows: Array<{ icon: string; label: string; value: string }>): string {
  const filteredRows = rows.filter((r) => r.value && r.value !== "—");
  if (!filteredRows.length) return "";

  const rowsHtml = filteredRows.map((r) => `
  <tr>
    <td style="padding:11px 14px;border-bottom:1px solid ${B.border};
               font-size:12px;font-weight:600;color:${B.textSoft};
               white-space:nowrap;vertical-align:top;
               font-family:${B.font};letter-spacing:0.2px;
               text-transform:uppercase;width:28%" class="info-label-col">
      ${x(r.icon)}&nbsp;&nbsp;${x(r.label)}
    </td>
    <td style="padding:11px 14px;border-bottom:1px solid ${B.border};
               font-size:14px;color:${B.textDark};font-weight:500;
               font-family:${B.font};vertical-align:top">
      ${x(r.value)}
    </td>
  </tr>`).join("");

  return `
<table role="presentation" border="0" cellpadding="0" cellspacing="0"
       width="100%"
       style="border:1px solid ${B.borderPurple};border-radius:12px;
              overflow:hidden;margin:20px 0;background-color:${B.bgCard}">
  <tbody>${rowsHtml}</tbody>
</table>`;
}

function callout(html: string, kind: "info" | "warning" | "danger"): string {
  const map = {
    info: { bg: B.primaryBg, border: B.borderPurple, icon: "ℹ", iconColor: B.primary },
    warning: { bg: B.warningBg, border: "#FDE68A", icon: "⚠", iconColor: B.warning },
    danger: { bg: B.dangerBg, border: "#FECACA", icon: "⚑", iconColor: B.danger },
  };
  const c = map[kind];
  return `
<table role="presentation" border="0" cellpadding="0" cellspacing="0"
       width="100%"
       style="background-color:${c.bg};border:1px solid ${c.border};
              border-radius:12px;margin:20px 0">
  <tr>
    <td width="20" style="padding:14px 0 14px 16px;vertical-align:top;
                          font-size:16px;color:${c.iconColor};line-height:1">
      ${c.icon}
    </td>
    <td style="padding:13px 16px 13px 10px;font-size:13px;line-height:1.65;
               color:${B.textMid};font-family:${B.font}">
      ${html}
    </td>
  </tr>
</table>`;
}

function fallbackLink(href: string): string {
  return `
<p style="margin:16px 0 0;font-size:12px;line-height:1.7;
           color:${B.textSoft};font-family:${B.font}">
  Button not working?
  <a href="${x(href)}" target="_blank"
     style="color:${B.primary};text-decoration:underline;word-break:break-all">
    ${x(href)}
  </a>
</p>`;
}

function buildWelcome(
  user: Record<string, unknown>,
  body: ReqBody,
  siteUrl: string,
): { subject: string; html: string } {
  const name = getName(user);
  const firstName = getFirstName(user);
  const provider = getProvider(user);
  const dashUrl = body.redirectUrl ?? `${siteUrl}/dashboard`;

  const steps = [
    { icon: "🧠", title: "Your workspace", desc: "Start a session and see DualMind work." },
    { icon: "🔗", title: "Connect tools", desc: "Integrate your existing stack." },
    { icon: "⚙️", title: "Set preferences", desc: "Customise your experience." },
  ];

  const stepsHtml = `
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"
       style="margin:24px 0">
  <tr>
    ${steps.map((s) => `
    <td class="stack" align="center" valign="top"
        style="width:33%;padding:0 6px;vertical-align:top">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td align="center"
              style="background-color:${B.primaryBg};border:1px solid ${B.borderPurple};
                     border-radius:12px;padding:18px 14px">
            <div style="font-size:26px;margin-bottom:10px;line-height:1">${s.icon}</div>
            <div style="font-size:13px;font-weight:700;color:${B.textDark};
                        margin-bottom:6px;font-family:${B.font};line-height:1.3">
              ${x(s.title)}
            </div>
            <div style="font-size:12px;color:${B.textSoft};font-family:${B.font};
                        line-height:1.5">
              ${x(s.desc)}
            </div>
          </td>
        </tr>
      </table>
    </td>`).join("")}
  </tr>
</table>`;

  const content = `
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
  <tr>
    <td class="email-header"
        style="padding:40px 48px 0;background:linear-gradient(160deg,
               ${B.primaryBg} 0%,${B.bgCard} 100%)">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0">
        <tr>
          <td style="background-color:${B.successBg};border:1px solid #A7F3D0;
                     border-radius:999px;padding:5px 14px">
            <span style="font-size:12px;font-weight:700;color:${B.success};
                         letter-spacing:0.8px;text-transform:uppercase;
                         font-family:${B.font}">
              ✓&nbsp; Account created
            </span>
          </td>
        </tr>
      </table>
      <h1 class="hero-title"
          style="margin:18px 0 10px;font-size:32px;font-weight:800;
                 color:${B.textDark};line-height:1.15;letter-spacing:-0.8px;
                 font-family:${B.font}">
        Welcome to DualMind,<br/>${x(firstName)}! 👋
      </h1>
      <p style="margin:0 0 32px;font-size:16px;color:${B.textSoft};
                line-height:1.65;font-family:${B.font}">
        Your account is ready. Here's everything you need to get started.
      </p>
    </td>
  </tr>
</table>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
  <tr>
    <td class="email-content" style="padding:32px 48px 40px">
      ${p(`We're really glad you're here, <strong>${x(name)}</strong>. DualMind is built to make your workflow faster and smarter — let's get you set up.`)}
      ${stepsHtml}
      ${ctaButton(dashUrl, "Open Your Dashboard")}
      ${fallbackLink(dashUrl)}
      ${hr()}
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"
             style="margin:4px 0 20px">
        <tr>
          <td style="font-size:12px;font-weight:700;letter-spacing:0.8px;
                     text-transform:uppercase;color:${B.textLight};
                     font-family:${B.font};padding-bottom:10px">
            Your account
          </td>
        </tr>
        <tr>
          <td>
            ${infoTable([
              { icon: "✉", label: "Email", value: String(user.email ?? "") },
              { icon: "🔑", label: "Sign-in", value: provider },
            ])}
          </td>
        </tr>
      </table>
      ${provider !== "Email"
        ? callout(
            `You signed up with <strong>${x(provider)}</strong>. You can add a password anytime in <a href="${x(siteUrl)}/settings/security" style="color:${B.primary};font-weight:600">account settings</a>.`,
            "info"
          )
        : ""}
      ${note(`Questions? Reply to this email or visit our <a href="${x(siteUrl)}/help" style="color:${B.primary}">help centre</a>. We read every message.`)}
    </td>
  </tr>
</table>`;

  return {
    subject: `Welcome to DualMind, ${firstName}! Your account is ready 🎉`,
    html: shell({
      previewText: `Hey ${firstName}, your DualMind account is ready — let's get started!`,
      accentColor: B.success,
      content,
      siteUrl,
    }),
  };
}

function buildLogin(
  user: Record<string, unknown>,
  body: ReqBody,
  req: Request,
  siteUrl: string,
): { subject: string; html: string } {
  const firstName = getFirstName(user);
  const ua = body.userAgent ?? req.headers.get("user-agent") ?? "";
  const info = body.loginInfo ?? {};

  const detectedIP = info.ip ?? getIP(req);
  const detectedBrowser = info.browser ?? detectBrowser(ua);
  const detectedDevice = info.device ?? detectDevice(ua);
  const detectedTime = formatDate(info.time, body.timezone);
  const location = info.location ?? "—";
  const securityUrl = body.redirectUrl ?? `${siteUrl}/settings/security`;

  const content = `
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
  <tr>
    <td class="email-header"
        style="padding:40px 48px 0;background:linear-gradient(160deg,
               ${B.warningBg} 0%,${B.bgCard} 80%)">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0">
        <tr>
          <td style="background-color:${B.warningBg};border:1px solid #FDE68A;
                     border-radius:999px;padding:5px 14px">
            <span style="font-size:12px;font-weight:700;color:${B.warning};
                         letter-spacing:0.8px;text-transform:uppercase;
                         font-family:${B.font}">
              🔔&nbsp; Login detected
            </span>
          </td>
        </tr>
      </table>
      <h1 class="hero-title"
          style="margin:18px 0 10px;font-size:28px;font-weight:800;
                 color:${B.textDark};line-height:1.2;letter-spacing:-0.6px;
                 font-family:${B.font}">
        New sign-in to your account
      </h1>
      <p style="margin:0 0 32px;font-size:15px;color:${B.textSoft};
                line-height:1.65;font-family:${B.font}">
        Hi <strong style="color:${B.textDark}">${x(firstName)}</strong> —
        we noticed a new sign-in to your DualMind account.
        If this was you, no action is needed.
      </p>
    </td>
  </tr>
</table>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
  <tr>
    <td class="email-content" style="padding:32px 48px 40px">
      <div style="font-size:12px;font-weight:700;letter-spacing:0.8px;
                  text-transform:uppercase;color:${B.textLight};
                  font-family:${B.font};margin-bottom:10px">
        Sign-in details
      </div>
      ${infoTable([
        { icon: "✉", label: "Account", value: String(user.email ?? "") },
        { icon: "🕐", label: "Time", value: detectedTime },
        { icon: "🌐", label: "IP address", value: detectedIP },
        { icon: "📍", label: "Location", value: location },
        { icon: "🖥", label: "Device", value: detectedDevice },
        { icon: "🔵", label: "Browser", value: detectedBrowser },
        { icon: "🔑", label: "Sign-in via", value: getProvider(user) },
      ])}
      ${callout(
        `<strong>Wasn't you?</strong> If you don't recognise this sign-in,
        <a href="${x(siteUrl)}/settings/security"
           style="color:${B.danger};font-weight:700;text-decoration:underline">
          secure your account immediately →
        </a>
        Change your password and sign out of all devices.`,
        "danger"
      )}
      ${ctaButton(securityUrl, "Review Security Settings", B.warning)}
      ${fallbackLink(securityUrl)}
      ${hr()}
      ${note(`DualMind will never ask for your password by email. If you think your account has been compromised, change your password and contact <a href="mailto:support@dualmindlab.tech" style="color:${B.primary}">support@dualmindlab.tech</a> immediately.`)}
    </td>
  </tr>
</table>`;

  return {
    subject: `New sign-in to your DualMind account`,
    html: shell({
      previewText: `New sign-in detected on your DualMind account from ${detectedDevice}.`,
      accentColor: B.warning,
      content,
      siteUrl,
    }),
  };
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: JSON_HDR },
    );
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid Authorization header" }),
        { status: 401, headers: JSON_HDR },
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const RESEND_KEY = Deno.env.get("RESEND_API_KEY");
    const FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL");
    const FROM_NAME = Deno.env.get("RESEND_FROM_NAME") ?? "DualMind";
    const SITE_URL = Deno.env.get("SITE_URL") ?? "https://dualmindlab.tech";

    if (!SUPABASE_URL || !SERVICE_KEY || !RESEND_KEY || !FROM_EMAIL) {
      console.error("[send-user-auth-email] Missing env vars");
      return new Response(
        JSON.stringify({ error: "Server configuration error — contact support" }),
        { status: 503, headers: JSON_HDR },
      );
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const token = authHeader.slice(7).trim();
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);

    if (authErr || !user?.email) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: JSON_HDR },
      );
    }

    if (isRateLimited(user.id)) {
      return new Response(
        JSON.stringify({ error: "Rate limit reached — please wait before sending another email" }),
        { status: 429, headers: { ...JSON_HDR, "Retry-After": "60" } },
      );
    }

    const body: ReqBody = await req.json().catch(() => ({}));

    if (body.type !== "welcome" && body.type !== "login") {
      return new Response(
        JSON.stringify({ error: 'type must be "welcome" or "login"' }),
        { status: 400, headers: JSON_HDR },
      );
    }

    const u = user as unknown as Record<string, unknown>;
    const email =
      body.type === "welcome"
        ? buildWelcome(u, body, SITE_URL)
        : buildLogin(u, body, req, SITE_URL);

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [user.email],
        subject: email.subject,
        html: email.html,
        tags: [
          { name: "type", value: body.type },
          { name: "userId", value: user.id },
        ],
      }),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      console.error("[send-user-auth-email] Resend error:", resendData);
      return new Response(
        JSON.stringify({ error: "Email delivery failed", detail: resendData }),
        { status: 502, headers: JSON_HDR },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        sentTo: user.email,
        type: body.type,
        messageId: resendData?.id ?? null,
      }),
      { status: 200, headers: JSON_HDR },
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    console.error("[send-user-auth-email] Unhandled:", msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: JSON_HDR });
  }
});
