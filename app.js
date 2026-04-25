// ============================================
// CONFIGURATION TESLA
// ============================================
const CONFIG = {
    clientId: '3bb094ec-9132-46df-b00b-a8ca7f3294f7',
    redirectUri: 'https://stephsanterre.github.io/tesla-api-key/callback',
    scope: 'openid offline_access vehicle_device_data vehicle_location',
    apiBase: 'https://fleet-api.prd.na.vn.cloud.tesla.com/api/1',
    authBase: 'https://auth.tesla.com/oauth2/v3'
};

// ============================================
// AUTHENTIFICATION
// ============================================
function loginWithTesla() {
    // Générer un state aléatoire pour sécurité
    const state = Math.random().toString(36).substring(2);
    localStorage.setItem('tesla_state', state);

    // Construire l'URL d'authentification
    const authUrl = `${CONFIG.authBase}/authorize?` +
        `client_id=${CONFIG.clientId}` +
        `&redirect_uri=${encodeURIComponent(CONFIG.redirectUri)}` +
        `&response_type=code` +
        `&scope=${encodeURIComponent(CONFIG.scope)}` +
        `&state=${state}`;

    // Rediriger vers Tesla
    window.location.href = authUrl;
}

function logout() {
    localStorage.removeItem('tesla_token');
    localStorage.removeItem('tesla_refresh');
    localStorage.removeItem('tesla_state');
    document.getElementById('dashboard').style.display = 'none';
    document.getElementById('login-screen').style.display = 'block';
}

// ============================================
// GESTION DU TOKEN
// ============================================
async function handleCallback() {
    const params = new URLSearchParams(window.location.search);
