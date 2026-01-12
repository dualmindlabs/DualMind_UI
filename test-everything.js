// DualMind Arena - Complete System Test
// Run this in browser console to verify everything works

async function testEverything() {
    console.log('🚀 Starting DualMind Arena System Test...\n');
    
    // 1. Check Frontend
    console.log('1. Frontend Check:');
    console.log('   ✅ URL:', window.location.origin);
    console.log('   ✅ Title:', document.title);
    
    // 2. Check Authentication
    console.log('\n2. Authentication Check:');
    if (window.DualMindAuth) {
        const isLoggedIn = window.DualMindAuth.isLoggedIn();
        console.log('   ✅ Auth module loaded');
        console.log('   ✅ Logged in:', isLoggedIn);
        if (isLoggedIn) {
            const user = window.DualMindAuth.getUser();
            console.log('   ✅ User:', user?.email || user?.phone || 'Unknown');
        }
    } else {
        console.log('   ❌ Auth module not loaded');
    }
    
    // 3. Check Backend
    console.log('\n3. Backend Check:');
    try {
        const response = await fetch('http://localhost:5079/api/arena/ping');
        if (response.ok) {
            console.log('   ✅ Backend reachable');
            const data = await response.json();
            console.log('   ✅ Backend response:', data.message);
        } else {
            console.log('   ❌ Backend error:', response.status);
        }
    } catch (error) {
        console.log('   ❌ Backend not reachable:', error.message);
    }
    
    // 4. Check Components
    console.log('\n4. Components Check:');
    const components = ['sidebar-container', 'header-container', 'chat-input-container', 'main-content'];
    components.forEach(id => {
        const el = document.getElementById(id);
        console.log('   ' + (el ? '✅' : '❌'), id);
    });
    
    // 5. Check Configuration
    console.log('\n5. Configuration Check:');
    console.log('   ✅ Backend URL:', window.DUALMIND_CONFIG?.apiBaseUrl);
    console.log('   ✅ Supabase URL:', window.DUALMIND_CONFIG?.supabase?.url ? 'Set' : 'Not set');
    console.log('   ✅ App Ready:', window._DUALMIND_APP_READY ? 'Yes' : 'No');
    
    // 6. Test User Sync
    console.log('\n6. User Sync Test:');
    if (window.DualMindAuth && window.DualMindAuth.isLoggedIn()) {
        try {
            const response = await fetch('http://localhost:5079/api/users/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: 'test-' + Date.now(),
                    email: 'test@example.com',
                    name: 'Test User'
                })
            });
            if (response.ok) {
                console.log('   ✅ User sync endpoint working');
            } else {
                console.log('   ❌ User sync failed:', await response.text());
            }
        } catch (error) {
            console.log('   ❌ User sync error:', error.message);
        }
    }
    
    console.log('\n🎉 System Test Complete!');
    console.log('\n📋 Summary:');
    console.log('   - Frontend: http://localhost:8002');
    console.log('   - Backend:  http://localhost:5079');
    console.log('   - Login:    http://localhost:8002/login/');
    console.log('   - Test:     http://localhost:8002/test-auth.html');
}

// Auto-run the test
testEverything();
