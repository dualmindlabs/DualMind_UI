
const PROJECT_ID = 'calqfzajyidkdzbaswjp';
const BASE_URL = `https://${PROJECT_ID}.supabase.co/auth/v1`;
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhbHFmemFqeWlka2R6YmFzd2pwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNzMwODMsImV4cCI6MjA3OTg0OTA4M30.ptXyUNCcAhGi9u2kVDHOxSBvQv0W72S5HHqkIFXQS08';

const PROVIDERS = ['github', 'google', 'discord', 'apple'];

async function runDiagnostics() {
    console.log(`\n🚀 Supabase Auth Diagnostics for Project: ${PROJECT_ID}\n`);

    for (const provider of PROVIDERS) {
        const url = `${BASE_URL}/authorize?provider=${provider}`;
        console.log(`Checking [${provider.toUpperCase()}]...`);

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'apikey': ANON_KEY,
                    'Authorization': `Bearer ${ANON_KEY}`
                },
                redirect: 'manual'
            });

            if (response.status === 302) {
                console.log('✅ ENABLED: Redirects to GitHub/Google...');
            } else if (response.status === 400) {
                const data = await response.json();
                console.log(`❌ FAILED: ${data.msg} (Code: ${data.error_code})`);
            } else {
                console.log(`❓ UNKNOWN STATUS (${response.status})`);
            }
        } catch (error) {
            console.error(`💥 FETCH FAILED: ${error.message}`);
        }
    }

    console.log('\n--- DIAGNOSIS SUMMARY ---');
    console.log('If GITHUB shows ❌ DISABLED:');
    console.log('1. Go to https://app.supabase.com/project/' + PROJECT_ID + '/auth/providers');
    console.log('2. Find GitHub and toggle "Enable GitHub" to ON.');
    console.log('3. Ensure Client ID and Secret are saved.');
    console.log('4. Ensure Callback URL matches: ' + BASE_URL + '/callback');
}

runDiagnostics();
