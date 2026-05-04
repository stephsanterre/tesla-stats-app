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

// ===========================
// UI helpers
// ===========================
function showDashboard() {
  document.getElementById("login-screen").style.display = "none";
  document.getElementById("dashboard").style.display = "block";
}

function showLogin() {
  document.getElementById("dashboard").style.display = "none";
  document.getElementById("login-screen").style.display = "block";
}

// ===========================
// AUTH
// ===========================
window.loginWithTesla = function loginWithTesla() {
  const state = Math.random().toString(36).slice(2);
  localStorage.setItem("tesla_state", state);

  const authUrl =
    `${CONFIG.authBase}/authorize?` +
    `client_id=${encodeURIComponent(CONFIG.clientId)}` +
    `&redirect_uri=${encodeURIComponent(CONFIG.redirectUri)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(CONFIG.scope)}` +
    `&state=${encodeURIComponent(state)}`;

  window.location.href = authUrl;
};

window.logout = function logout() {
  localStorage.removeItem("tesla_token");
  localStorage.removeItem("tesla_refresh");
  localStorage.removeItem("tesla_state");
  showLogin();
};

// ===========================
// CALLBACK: exchange code -> token
// ===========================
async function handleCallbackIfPresent() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const state = params.get("state");
  if (!code) return false;

  const savedState = localStorage.getItem("tesla_state");
  if (!savedState || state !== savedState) {
    alert("Erreur de sécurité (state). Recommence la connexion.");
    return false;
  }

  const resp = await fetch(`${CONFIG.authBase}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: CONFIG.clientId,
      code,
      redirect_uri: CONFIG.redirectUri,
    }),
  });

  const data = await resp.json();

  if (!data.access_token) {
    console.error("Token exchange failed:", data);
    alert("Échec de connexion Tesla (token). Voir console.");
    return false;
  }

  localStorage.setItem("tesla_token", data.access_token);
  if (data.refresh_token) localStorage.setItem("tesla_refresh", data.refresh_token);

  // Clean URL
  window.history.replaceState({}, document.title, window.location.pathname);
  return true;
}

// ===========================
// API
// ===========================
async function apiGet(path) {
  const token = localStorage.getItem("tesla_token");
  const resp = await fetch(`${CONFIG.apiBase}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(JSON.stringify(data));
  return data.response;
}

async function fetchVehicles() {
  return await apiGet("/vehicles");
}

async function fetchVehicleData(vehicleId) {
  // endpoints param dépend parfois du serveur; on commence simple
  return await apiGet(`/vehicles/${vehicleId}/vehicle_data`);
}

// ===========================
// UI Data binding
// ===========================
async function populateVehicles() {
  const vehicles = await fetchVehicles();
  const select = document.getElementById("vehicle-select");
  select.innerHTML = "";

  vehicles.forEach((v) => {
    const opt = document.createElement("option");
    opt.value = v.id;
    opt.textContent = `${v.display_name || "Tesla"} (${v.vin})`;
    select.appendChild(opt);
  });

  if (vehicles.length) {
    await loadVehicleData();
  }
}

window.loadVehicleData = async function loadVehicleData() {
  const vehicleId = document.getElementById("vehicle-select").value;
  if (!vehicleId) return;

  const data = await fetchVehicleData(vehicleId);

  const odometerMi = data?.vehicle_state?.odometer;
  const battery = data?.charge_state?.battery_level;
  const rangeMi = data?.charge_state?.battery_range;
  const temp = data?.climate_state?.outside_temp;
  const speedMi = data?.drive_state?.speed;

  document.getElementById("odometer").textContent =
    odometerMi != null ? `${Math.round(odometerMi * 1.60934).toLocaleString()} km` : "--";

  document.getElementById("battery").textContent =
    battery != null ? `${battery}%` : "--";

  document.getElementById("range").textContent =
    rangeMi != null ? `${Math.round(rangeMi * 1.60934)} km` : "--";

  document.getElementById("temp").textContent =
    temp != null ? `${temp}°C` : "--";

  document.getElementById("speed").textContent =
    speedMi != null ? `${Math.round(speedMi * 1.60934)} km/h` : "0 km/h";

  document.getElementById("state").textContent =
    data?.state || "online";
};

// ===========================
// INIT
// ===========================
async function init() {
  try {
    const callbackOk = await handleCallbackIfPresent();
    const token = localStorage.getItem("tesla_token");

    if (token || callbackOk) {
      showDashboard();
      await populateVehicles();
    } else {
      showLogin();
    }
  } catch (e) {
    console.error("Init error:", e);
    showLogin();
  }
}

window.addEventListener("load", init);
