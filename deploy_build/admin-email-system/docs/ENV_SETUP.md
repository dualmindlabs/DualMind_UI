# Environment Setup Guide

This guide explains how to configure all required environment variables and settings for the Admin Email System.

## 📋 Prerequisites

Before setting up, ensure you have:
- ✅ Supabase project created
- ✅ Brevo (Sendinblue) account created
- ✅ Sender email verified in Brevo
- ✅ Supabase CLI installed (for deploying edge functions)

## 🔑 Required Environment Variables

### 1. Brevo API Configuration

#### BREVO_API_KEY
- **Description**: API key for Brevo transactional email service
- **Where to get it**: 
  1. Log in to [Brevo](https://app.brevo.com/)
  2. Go to Settings → SMTP & API → API Keys
  3. Click "Generate a new API key"
  4. Copy the key (starts with `xkeysib-...`)
- **Example**: `xkeysib-abc123def456...`
- **Required**: Yes

#### SENDER_EMAIL
- **Description**: Email address that appears as sender
- **Value**: `admin@dualmindlab.tech`
- **Note**: Must be verified in Brevo account
- **Required**: Yes

#### SENDER_NAME
- **Description**: Name that appears as sender
- **Value**: `DualMind Labs Admin`
- **Required**: Yes

### 2. Supabase Configuration

#### SUPABASE_URL
- **Description**: Your Supabase project URL
- **Where to get it**: 
  1. Go to [Supabase Dashboard](https://app.supabase.com/)
  2. Select your project
  3. Go to Settings → API
  4. Copy "Project URL"
- **Example**: `https://abcdefghijklmnop.supabase.co`
- **Required**: Yes (auto-provided in edge functions)

#### SUPABASE_ANON_KEY
- **Description**: Public anonymous key for client-side
- **Where to get it**: 
  1. Supabase Dashboard → Settings → API
  2. Copy "anon public" key
- **Example**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Required**: Yes (for frontend)

#### SUPABASE_SERVICE_ROLE_KEY
- **Description**: Service role key for server-side operations
- **Where to get it**: 
  1. Supabase Dashboard → Settings → API
  2. Copy "service_role" key (click "Reveal" first)
- **Example**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Required**: Yes (auto-provided in edge functions)
- **⚠️ SECURITY**: Never expose this key in frontend code!

## 🚀 Setup Instructions

### Step 1: Configure Brevo

1. **Create Brevo Account**
   ```
   Visit: https://www.brevo.com/
   Sign up for free account (300 emails/day)
   ```

2. **Verify Sender Email**
   ```
   1. Go to Senders & IP → Senders
   2. Click "Add a sender"
   3. Enter: admin@dualmindlab.tech
   4. Verify via email confirmation
   ```

3. **Generate API Key**
   ```
   1. Go to SMTP & API → API Keys
   2. Click "Generate a new API key"
   3. Name it: "DualMind Admin Email System"
   4. Copy and save the key securely
   ```

### Step 2: Set Edge Function Secrets

Deploy the edge function with secrets:

```bash
# Navigate to your Supabase project directory
cd /path/to/your/supabase/project

# Create the edge function
supabase functions new send-admin-email

# Copy the function code
# Copy content from: admin-email-system/backend/supabase-edge-function/send-admin-email.ts
# To: supabase/functions/send-admin-email/index.ts

# Set secrets
supabase secrets set BREVO_API_KEY="your_brevo_api_key_here"
supabase secrets set SENDER_EMAIL="admin@dualmindlab.tech"
supabase secrets set SENDER_NAME="DualMind Labs Admin"

# Deploy the function
supabase functions deploy send-admin-email
```

### Step 3: Configure Frontend

Edit `admin-email-system/frontend/admin-email-panel.js`:

```javascript
// Update these constants at the top of the file:
const SUPABASE_URL = 'https://your-project-id.supabase.co';
const SUPABASE_ANON_KEY = 'your_anon_key_here';
const EDGE_FUNCTION_URL = 'https://your-project-id.supabase.co/functions/v1/send-admin-email';
```

**How to get Edge Function URL:**
```
Format: https://[PROJECT_ID].supabase.co/functions/v1/send-admin-email
Replace [PROJECT_ID] with your actual Supabase project ID
```

### Step 4: Database Setup

Ensure your `users` table has the required structure:

```sql
-- Check if users table exists
SELECT * FROM users LIMIT 1;

-- Required columns:
-- user_id (uuid, primary key)
-- email (text)
-- full_name (text)
-- role (text) -- Must contain 'admin' for admin users

-- Set a user as admin
UPDATE users 
SET role = 'admin' 
WHERE email = 'your-admin-email@example.com';

-- Verify admin users
SELECT user_id, email, full_name, role 
FROM users 
WHERE role = 'admin';
```

## 📝 Environment Variable Summary

### Edge Function (Supabase Secrets)
```bash
BREVO_API_KEY=xkeysib-abc123...
SENDER_EMAIL=admin@dualmindlab.tech
SENDER_NAME=DualMind Labs Admin
```

### Frontend (JavaScript Config)
```javascript
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
EDGE_FUNCTION_URL=https://xxxxx.supabase.co/functions/v1/send-admin-email
```

## ✅ Verification Checklist

Before using the system, verify:

- [ ] Brevo account created and active
- [ ] Sender email (admin@dualmindlab.tech) verified in Brevo
- [ ] Brevo API key generated and saved
- [ ] Edge function deployed to Supabase
- [ ] Edge function secrets set correctly
- [ ] Frontend config updated with correct URLs and keys
- [ ] At least one user has `role = 'admin'` in database
- [ ] Test user can log in via Supabase Auth

## 🧪 Testing Setup

### Test Edge Function
```bash
# Test locally (requires Supabase CLI)
supabase functions serve send-admin-email

# Test with curl
curl -X POST http://localhost:54321/functions/v1/send-admin-email \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "emails": ["test@example.com"],
    "subject": "Test Email",
    "title": "Test Title",
    "html": "<p>Test message</p>"
  }'
```

### Test Frontend
1. Open `AdminEmailPanel.html` in browser
2. Should see "Verifying admin access..." briefly
3. If admin: Should see user list and email composer
4. If not admin: Should see "Access Denied" screen

### Test Email Sending
1. Select yourself as recipient
2. Enter test subject, title, and body
3. Click "Send Email"
4. Check your inbox for the email
5. Verify email looks professional and formatted correctly

## 🔒 Security Best Practices

### DO ✅
- Store API keys in environment variables/secrets
- Use service role key only in backend/edge functions
- Verify admin role before allowing access
- Rotate API keys periodically
- Monitor edge function logs for suspicious activity
- Use HTTPS for all requests

### DON'T ❌
- Commit API keys to version control
- Expose service role key in frontend code
- Share API keys in chat/email
- Use same API key across multiple projects
- Allow non-admin users to access the system
- Hardcode sensitive values in code

## 🐛 Troubleshooting

### "Email service not configured" Error
```bash
# Check if secrets are set
supabase secrets list

# Re-set secrets if missing
supabase secrets set BREVO_API_KEY="your_key"
supabase secrets set SENDER_EMAIL="admin@dualmindlab.tech"
supabase secrets set SENDER_NAME="DualMind Labs Admin"

# Redeploy function
supabase functions deploy send-admin-email
```

### "Invalid API key" from Brevo
- Verify API key is correct (copy-paste from Brevo dashboard)
- Check API key hasn't been deleted or expired
- Generate new API key if needed
- Update secret and redeploy

### "Sender email not verified"
- Log in to Brevo dashboard
- Go to Senders & IP → Senders
- Verify admin@dualmindlab.tech is listed and verified
- If not, add and verify the sender email

### Frontend Can't Connect
- Check browser console for errors
- Verify SUPABASE_URL is correct
- Verify SUPABASE_ANON_KEY is correct
- Check EDGE_FUNCTION_URL format
- Ensure user is logged in to Supabase Auth

## 📚 Additional Resources

- [Brevo API Documentation](https://developers.brevo.com/docs)
- [Supabase Edge Functions Guide](https://supabase.com/docs/guides/functions)
- [Supabase Secrets Management](https://supabase.com/docs/guides/functions/secrets)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)

## 📞 Support

If you encounter issues:
1. Check this guide thoroughly
2. Review error messages in browser console
3. Check edge function logs: `supabase functions logs send-admin-email`
4. Verify all environment variables are set correctly
5. Contact DualMind Labs technical team

---

**Last Updated**: December 2024  
**Version**: 1.0.0
