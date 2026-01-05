# Admin Email System

A secure, production-ready admin email system for DualMind Labs that allows administrators to send emails to selected users via the Brevo (Sendinblue) transactional email API.

## 🎯 Overview

This system provides a clean admin interface for:
- Viewing all registered users
- Selecting one or multiple users
- Composing professional emails with subject, title, and HTML body
- Sending emails securely through Brevo API
- Tracking send status with success/error feedback

## 🔒 Security Features

- **Admin-only access**: Only users with `role = 'admin'` in the database can access the system
- **Authentication required**: Uses Supabase Auth to verify user identity
- **Token-based authorization**: Edge function validates JWT tokens before processing
- **No exposed secrets**: API keys stored securely in environment variables
- **XSS protection**: All user inputs are sanitized before rendering

## 📁 Folder Structure

```
admin-email-system/
├── backend/
│   └── supabase-edge-function/
│       └── send-admin-email.ts       # Edge function for sending emails
├── frontend/
│   ├── AdminEmailPanel.html          # Main UI
│   └── admin-email-panel.js          # Frontend logic
└── docs/
    ├── README.md                      # This file
    └── ENV_SETUP.md                   # Environment setup guide
```

## 🚀 How It Works

### Backend Flow

1. **Authentication Check**: Edge function receives request with JWT token
2. **Role Verification**: Queries `users` table to confirm admin role
3. **Input Validation**: Validates email list, subject, title, and HTML content
4. **Email Sending**: Loops through recipients and sends via Brevo API
5. **Response**: Returns success/failure count with details

### Frontend Flow

1. **Access Control**: Verifies user is logged in and has admin role
2. **User Loading**: Fetches all users from Supabase `users` table
3. **User Selection**: Checkbox-based selection with select all/deselect
4. **Email Composition**: Subject, title, and body inputs with live preview
5. **Sending**: Calls edge function with selected emails and content
6. **Feedback**: Shows success/error alerts with send statistics

## 📧 Email Template

Emails are sent with a professional, responsive HTML template that includes:
- Gradient header with email title
- Clean body section with custom content
- Footer with DualMind Labs branding
- Mobile-responsive design
- Inline CSS for maximum compatibility

## 🎨 How Admins Use It

### Step 1: Access the Panel
Navigate to `AdminEmailPanel.html` in your browser. The system will:
- Verify you're logged in
- Check if you have admin role
- Show access denied if not authorized

### Step 2: Select Recipients
- View the complete list of users (name + email)
- Click checkboxes to select individual users
- Use "Select All" to select everyone
- See selected count update in real-time

### Step 3: Compose Email
- **Subject**: Enter email subject line (max 200 chars)
- **Title**: Enter title shown in email header (max 100 chars)
- **Body**: Write your message
  - Toggle "Enable HTML mode" for rich formatting
  - Preview updates in real-time
- Review the preview before sending

### Step 4: Send
- Click "Send Email" button
- Confirm the action in the dialog
- Wait for confirmation message
- View success/failure statistics

### Step 5: Clear (Optional)
- Click "Clear Form" to reset all fields
- Deselect users to start fresh

## 🔧 How to Extend Later

### Add Email Templates
1. Create template functions in `send-admin-email.ts`
2. Add template selector in frontend
3. Pass template ID to edge function

### Add Scheduling
1. Store email drafts in Supabase table
2. Add scheduled_at timestamp
3. Create cron job to send scheduled emails

### Add Email History
1. Create `email_logs` table in Supabase
2. Log each send in edge function
3. Add history view in admin panel

### Add Attachments
1. Upload files to Supabase Storage
2. Get public URLs
3. Pass URLs to Brevo API attachments parameter

### Add User Filtering
1. Add filter controls in frontend (role, date joined, etc.)
2. Filter `allUsers` array before rendering
3. Show filtered count

### Add Email Personalization
1. Use placeholders like `{{name}}` in body
2. Replace placeholders per user in edge function
3. Send personalized emails to each recipient

## 🛡️ Best Practices

### Security
- Never commit API keys to version control
- Rotate Brevo API key periodically
- Monitor edge function logs for suspicious activity
- Implement rate limiting if needed

### Email Deliverability
- Use clear, non-spammy subject lines
- Include unsubscribe option for marketing emails
- Verify sender domain in Brevo
- Monitor bounce rates

### Performance
- Batch large sends (>100 users) into chunks
- Add retry logic for failed sends
- Cache user list with refresh button
- Optimize edge function cold starts

## 📊 Monitoring

### Check Edge Function Logs
```bash
supabase functions logs send-admin-email
```

### Monitor Brevo Dashboard
- View send statistics
- Check bounce/spam rates
- Review delivery status

### Database Queries
```sql
-- Check admin users
SELECT user_id, email, full_name, role 
FROM users 
WHERE role = 'admin';

-- Count total users
SELECT COUNT(*) FROM users;
```

## 🐛 Troubleshooting

### "Access Denied" Error
- Verify user is logged in to Supabase Auth
- Check `role` column in `users` table is set to `'admin'`
- Ensure JWT token is valid and not expired

### "Failed to load users" Error
- Check Supabase connection
- Verify `users` table exists with correct schema
- Check browser console for detailed errors

### "Email service not configured" Error
- Verify `BREVO_API_KEY` is set in edge function secrets
- Check environment variable spelling
- Redeploy edge function after adding secrets

### Emails Not Sending
- Verify Brevo API key is valid
- Check sender email is verified in Brevo
- Review Brevo dashboard for blocked sends
- Check edge function logs for errors

### Preview Not Updating
- Check browser console for JavaScript errors
- Verify all input fields have correct IDs
- Clear browser cache and reload

## 📝 Notes

- This system uses **transactional email API**, not SMTP
- Sender email must be verified in Brevo account
- Free Brevo tier: 300 emails/day limit
- Edge function timeout: 60 seconds (adjust for large batches)
- HTML mode allows full control but requires HTML knowledge

## 🔗 Related Documentation

- [Brevo API Documentation](https://developers.brevo.com/docs)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase Auth](https://supabase.com/docs/guides/auth)

## 📞 Support

For issues or questions:
1. Check troubleshooting section above
2. Review edge function logs
3. Check Brevo dashboard
4. Contact DualMind Labs technical team

---

**Built with ❤️ for DualMind Labs**
