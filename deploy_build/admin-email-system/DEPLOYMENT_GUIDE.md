# Admin Email System - Deployment Guide

Quick reference for deploying the Admin Email System to production.

## 📦 What You've Built

A complete admin email system with:
- ✅ Secure backend (Supabase Edge Function)
- ✅ Clean frontend UI (HTML/CSS/JS)
- ✅ Brevo API integration (transactional emails)
- ✅ Role-based access control (admin only)
- ✅ Professional email templates
- ✅ Complete documentation

## 🚀 Quick Deployment Steps

### 1. Deploy Edge Function (5 minutes)

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_ID

# Create function directory
cd /path/to/your/supabase/project
supabase functions new send-admin-email

# Copy the function code
# From: admin-email-system/backend/supabase-edge-function/send-admin-email.ts
# To: supabase/functions/send-admin-email/index.ts

# Set environment secrets
supabase secrets set BREVO_API_KEY="your_brevo_api_key"
supabase secrets set SENDER_EMAIL="admin@dualmindlab.tech"
supabase secrets set SENDER_NAME="DualMind Labs Admin"

# Deploy
supabase functions deploy send-admin-email
```

### 2. Configure Frontend (2 minutes)

Edit `admin-email-system/frontend/admin-email-panel.js`:

```javascript
// Line 4-6: Update these values
const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
const EDGE_FUNCTION_URL = 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/send-admin-email';
```

### 3. Set Admin Role (1 minute)

```sql
-- Run in Supabase SQL Editor
UPDATE users 
SET role = 'admin' 
WHERE email = 'your-admin-email@example.com';
```

### 4. Host Frontend (3 minutes)

**Option A: Supabase Storage (Recommended)**
```bash
# Upload to Supabase Storage bucket
# 1. Create public bucket named 'admin-panel'
# 2. Upload AdminEmailPanel.html and admin-email-panel.js
# 3. Access via: https://YOUR_PROJECT_ID.supabase.co/storage/v1/object/public/admin-panel/AdminEmailPanel.html
```

**Option B: Existing Web Server**
```bash
# Copy files to your web server
cp admin-email-system/frontend/* /var/www/html/admin/
```

**Option C: Local Testing**
```bash
# Just open the HTML file
cd admin-email-system/frontend
# Open AdminEmailPanel.html in browser
```

## ✅ Post-Deployment Checklist

- [ ] Edge function deployed successfully
- [ ] Secrets set in Supabase
- [ ] Frontend config updated
- [ ] At least one admin user exists
- [ ] Brevo sender email verified
- [ ] Test email sent successfully

## 🧪 Test the System

1. Open `AdminEmailPanel.html` in browser
2. Log in with admin credentials
3. Select a test user (yourself)
4. Send a test email
5. Verify email received

## 📁 File Locations

```
admin-email-system/
├── backend/
│   └── supabase-edge-function/
│       ├── send-admin-email.ts    ← Deploy this to Supabase
│       └── deno.json               ← Config file
├── frontend/
│   ├── AdminEmailPanel.html        ← Main UI file
│   └── admin-email-panel.js        ← Update config here
├── docs/
│   ├── README.md                   ← Full documentation
│   └── ENV_SETUP.md                ← Environment setup
└── DEPLOYMENT_GUIDE.md             ← This file
```

## 🔑 Required Credentials

Get these before deploying:

1. **Brevo API Key**: https://app.brevo.com/ → SMTP & API → API Keys
2. **Supabase URL**: Dashboard → Settings → API → Project URL
3. **Supabase Anon Key**: Dashboard → Settings → API → anon public
4. **Verify Sender**: Brevo → Senders & IP → Add admin@dualmindlab.tech

## 🐛 Common Issues

### Edge Function Not Working
```bash
# Check logs
supabase functions logs send-admin-email

# Redeploy
supabase functions deploy send-admin-email --no-verify-jwt
```

### Frontend Can't Connect
- Check browser console for errors
- Verify all config values are correct
- Ensure user is logged in
- Check CORS settings

### Emails Not Sending
- Verify Brevo API key is valid
- Check sender email is verified in Brevo
- Review edge function logs
- Check Brevo dashboard for blocks

## 📞 Need Help?

1. Check `docs/README.md` for detailed documentation
2. Check `docs/ENV_SETUP.md` for environment setup
3. Review edge function logs for errors
4. Check Brevo dashboard for email status

## 🎉 You're Done!

The Admin Email System is now live and ready to use. Admins can:
- View all users
- Select recipients
- Compose professional emails
- Send via Brevo API
- Track success/failure

---

**Built for DualMind Labs**  
**Version**: 1.0.0
