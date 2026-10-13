/* ==========================================================================
   BOOT — Auth gate + app initialization
   Loaded last (defer) so all dependencies are guaranteed available.
   ========================================================================== */

(async function() {
    'use strict';

    // Apply saved theme preference immediately to avoid flash
    if (typeof Theme !== 'undefined') Theme.init();

    try {
        await Auth.init();
    } catch (e) {
        console.error('[Boot] Auth init failed:', e);
    }
    var user = Auth.getUser();

    // No session — show login
    if (!user) {
        AuthUI.renderLoginPage();
        return;
    }

    // Password recovery flow (user clicked "Esqueci minha senha")
    if (Auth.isRecovery()) {
        AuthUI.renderPasswordChange();
        return;
    }

    // Authenticated — redirect to /home if needed
    var isHome = window.location.pathname.startsWith('/home');
    if (!isHome) {
        window.location.href = '/home';
        return;
    }

    // Load app
    await Calendar.init();
    await Sidebar.init();
    Router.init();
    await Gamification.init();
    Leaderboard.init();

    // Aurora — try localStorage first, fallback to Supabase L2
    if (typeof Aurora !== 'undefined') {
        Aurora.init();
        if (!document.getElementById('aurora-fab') && typeof Persistence !== 'undefined') {
            try {
                var psico = await Persistence.loadPsicometria();
                if (psico && psico.profile_data && psico.profile_data.profile) {
                    var key = 'psicometria_data_v2_' + user.id;
                    localStorage.setItem(key, JSON.stringify(psico.profile_data));
                    if (psico.source_text) {
                        localStorage.setItem('psicometria_source_v2_' + user.id, psico.source_text);
                    }
                    Aurora.init();
                }
            } catch (e) {
                console.warn('[Boot] Aurora L2 fallback error:', e);
            }
        }
    }
})();
