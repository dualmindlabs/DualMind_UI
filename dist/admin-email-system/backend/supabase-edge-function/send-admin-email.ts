// Supabase Edge Function: Send Admin Email
// Endpoint: POST /send-admin-email
// Purpose: Allow admins to send emails to selected users via Brevo API

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// CORS headers for browser requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  emails: string[];
  subject: string;
  title: string;
  html: string;
}

interface BrevoEmailPayload {
  sender: {
    name: string;
    email: string;
  };
  to: Array<{ email: string }>;
  subject: string;
  htmlContent: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Verify admin role
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (userError || !userData || userData.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Access denied. Admin role required." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Parse request body
    const body: EmailRequest = await req.json();
    const { emails, subject, title, html } = body;

    // Validate input
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return new Response(
        JSON.stringify({ error: "At least one email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!subject || !title || !html) {
      return new Response(
        JSON.stringify({ error: "Subject, title, and html are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Get Brevo configuration from environment
    const brevoApiKey = Deno.env.get("BREVO_API_KEY");
    const senderEmail = Deno.env.get("SENDER_EMAIL") || "admin@dualmindlab.tech";
    const senderName = Deno.env.get("SENDER_NAME") || "DualMind Labs Admin";

    if (!brevoApiKey) {
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Build professional email HTML template
    const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f7; }
    .email-wrapper { width: 100%; background-color: #f4f4f7; padding: 40px 0; }
    .email-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .email-header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; }
    .email-header h1 { margin: 0; color: #ffffff; font-size: 28px; font-weight: 600; }
    .email-body { padding: 40px 30px; color: #333333; line-height: 1.6; }
    .email-body h2 { color: #667eea; font-size: 22px; margin-top: 0; }
    .email-body p { margin: 16px 0; font-size: 16px; }
    .email-footer { background-color: #f8f9fa; padding: 30px; text-align: center; color: #6c757d; font-size: 14px; border-top: 1px solid #e9ecef; }
    .email-footer p { margin: 8px 0; }
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; border-radius: 0; }
      .email-header, .email-body, .email-footer { padding: 30px 20px !important; }
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-container">
      <div class="email-header">
        <h1>${title}</h1>
      </div>
      <div class="email-body">
        ${html}
      </div>
      <div class="email-footer">
        <p><strong>DualMind Labs</strong></p>
        <p>This is an official communication from DualMind Labs Admin.</p>
        <p style="font-size: 12px; color: #999;">If you have questions, please contact support.</p>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();

    // 6. Send emails via Brevo API
    const results = [];
    const errors = [];

    for (const email of emails) {
      try {
        const brevoPayload: BrevoEmailPayload = {
          sender: {
            name: senderName,
            email: senderEmail,
          },
          to: [{ email: email.trim() }],
          subject: subject,
          htmlContent: emailHtml,
        };

        const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "api-key": brevoApiKey,
          },
          body: JSON.stringify(brevoPayload),
        });

        if (brevoResponse.ok) {
          const responseData = await brevoResponse.json();
          results.push({ email, success: true, messageId: responseData.messageId });
        } else {
          const errorData = await brevoResponse.text();
          errors.push({ email, error: errorData });
        }
      } catch (error) {
        errors.push({ email, error: error.message });
      }
    }

    // 7. Return results
    const response = {
      success: true,
      sent: results.length,
      failed: errors.length,
      results,
      errors: errors.length > 0 ? errors : undefined,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
