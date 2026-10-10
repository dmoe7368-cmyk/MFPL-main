/**
 * Watch-Along Live Broadcast Engine
 * Clean Production Build: 
 * - Full State Persistence (localStorage auto-recovery on refresh)
 * - Anti-Accidental Refresh Guard (beforeunload protection)
 * - Native DOM Image Handling (Zero Syntax Leaks)
 * - 10s Auto-Rotation & 5-Tier Tactical Alignment
 */

const CONFIG = {
  dataPath: 'assets/data/custom-lineups.json',
  clubsPath: 'assets/images/clubs/',
  outfieldKitPath: 'assets/images/jerseys/outfield/',
  gkKitPath: 'assets/images/jerseys/gk/'
};

// Storage Keys for Stream State Persistence
const STORAGE_KEYS = {
  MATCH_TIME: 'mfpl_match_seconds',
  TIMER_RUNNING: 'mfpl_timer_running',
  HOME_SCORE: 'mfpl_home_score',
  AWAY_SCORE: 'mfpl_away_score',
  HOME_TEAM_ID: 'mfpl_home_team_id',
  AWAY_TEAM_ID: 'mfpl_away_team_id',
  LAST_UPDATE: 'mfpl_last_timestamp'
};

let teamsData = {};
let currentDisplayedSide = 'home';
let autoSwitchTimer = null;
let isAutoSwitchEnabled = true;

// Match Clock & Goals State
let matchSeconds = 0;
let timerInterval = null;
let isTimerRunning = false;
let homeScore = 0;
let awayScore = 0;

// High-Contrast SVG Kit Fallback
const TEAM_COLORS = {
  ars: { primary: '#EF0107', secondary: '#FFFFFF', gk: '#00FF66' },
  avl: { primary: '#95BFE5', secondary: '#670E36', gk: '#FFE600' },
  bou: { primary: '#DA020E', secondary: '#000000', gk: '#00E5FF' },
  bre: { primary: '#E30613', secondary: '#FFFFFF', gk: '#FFCC00' },
  bha: { primary: '#0057B8', secondary: '#FFFFFF', gk: '#FF0055' },
  che: { primary: '#034694', secondary: '#EE2737', gk: '#E8C838' },
  cov: { primary: '#5CABE0', secondary: '#000000', gk: '#FF8A00' },
  cry: { primary: '#1B458F', secondary: '#C4122E', gk: '#76FF03' },
  eve: { primary: '#003399', secondary: '#FFFFFF', gk: '#00E5FF' },
  ful: { primary: '#FFFFFF', secondary: '#000000', gk: '#FFD700' },
  hul: { primary: '#F5971E', secondary: '#000000', gk: '#39FF14' },
  ips: { primary: '#004494', secondary: '#FFFFFF', gk: '#FF007F' },
  lee: { primary: '#FFFFFF', secondary: '#1D428A', gk: '#00FF85' },
  liv: { primary: '#C8102E', secondary: '#00B2A9', gk: '#2D3436' },
  mci: { primary: '#6CABDD', secondary: '#1C2C5B', gk: '#E056FD' },
  mun: { primary: '#DA291C', secondary: '#000000', gk: '#2ED573' },
  new: { primary: '#241F20', secondary: '#FFFFFF', gk: '#3742FA' },
  nfo: { primary: '#DD0000', secondary: '#FFFFFF', gk: '#FFA502' },
  tot: { primary: '#132257', secondary: '#FFFFFF', gk: '#2ED573' },
  sun: { primary: '#EB172B', secondary: '#FFFFFF', gk: '#00D2D3' }
};

// ==========================================
// STATE PERSISTENCE & STORAGE MANAGEMENT
// ==========================================
function saveBroadcastState() {
  localStorage.setItem(STORAGE_KEYS.MATCH_TIME, String(matchSeconds));
  localStorage.setItem(STORAGE_KEYS.TIMER_RUNNING, String(isTimerRunning));
  localStorage.setItem(STORAGE_KEYS.HOME_SCORE, String(homeScore));
  localStorage.setItem(STORAGE_KEYS.AWAY_SCORE, String(awayScore));
  localStorage.setItem(STORAGE_KEYS.LAST_UPDATE, String(Date.now()));

  const homeSelect = document.getElementById('homeSelect');
  const awaySelect = document.getElementById('awaySelect');
  if (homeSelect) localStorage.setItem(STORAGE_KEYS.HOME_TEAM_ID, homeSelect.value);
  if (awaySelect) localStorage.setItem(STORAGE_KEYS.AWAY_TEAM_ID, awaySelect.value);
}

function loadBroadcastState() {
  const savedTime = localStorage.getItem(STORAGE_KEYS.MATCH_TIME);
  const wasRunning = localStorage.getItem(STORAGE_KEYS.TIMER_RUNNING) === 'true';
  const lastTime = parseInt(localStorage.getItem(STORAGE_KEYS.LAST_UPDATE) || '0', 10);
  const savedHomeScore = localStorage.getItem(STORAGE_KEYS.HOME_SCORE);
  const savedAwayScore = localStorage.getItem(STORAGE_KEYS.AWAY_SCORE);

  if (savedHomeScore !== null) homeScore = parseInt(savedHomeScore, 10) || 0;
  if (savedAwayScore !== null) awayScore = parseInt(savedAwayScore, 10) || 0;

  if (savedTime !== null) {
    let recoveredSeconds = parseInt(savedTime, 10) || 0;

    // Refresh ဖြစ်သွားချိန် ကြားကာလစက္ကန့်များကို Timer ပြေးနေပါက auto-catchup တွက်ချက်ခြင်း
    if (wasRunning && lastTime > 0) {
      const elapsedSeconds = Math.floor((Date.now() - lastTime) / 1000);
      recoveredSeconds += Math.max(0, elapsedSeconds);
    }

    matchSeconds = recoveredSeconds;

    // Timer ပြေးနေခဲ့ပါက refresh အပြီး auto resume ပြန်လုပ်ခြင်း
    if (wasRunning) {
      setTimeout(() => {
        if (!isTimerRunning) toggleClock();
      }, 300);
    }
  }
}

function clearBroadcastState() {
  localStorage.removeItem(STORAGE_KEYS.MATCH_TIME);
  localStorage.removeItem(STORAGE_KEYS.TIMER_RUNNING);
  localStorage.removeItem(STORAGE_KEYS.HOME_SCORE);
  localStorage.removeItem(STORAGE_KEYS.AWAY_SCORE);
  localStorage.removeItem(STORAGE_KEYS.LAST_UPDATE);
}

// 5-Tier Tactical Formation Tier Sorter
function groupLineupByTier(lineup) {
  const tiers = {
    FWD: [],
    AM: [],
    DM: [],
    DEF: [],
    GK: []
  };

  lineup.forEach(player => {
    const tier = player.tier ? player.tier.toUpperCase() : '';
    const role = (player.role || '').toUpperCase();
    const pos = (player.pos || '').toUpperCase();

    if (tier && tiers[tier]) {
      tiers[tier].push(player);
    } else if (pos === 'GK' || role === 'GK') {
      tiers.GK.push(player);
    } else if (pos === 'DEF' || ['LB', 'LCB', 'CB', 'RCB', 'RB', 'LWB', 'RWB'].includes(role)) {
      tiers.DEF.push(player);
    } else if (['LDM', 'RDM', 'CDM', 'LCM', 'RCM', 'CM'].includes(role)) {
      tiers.DM.push(player);
    } else if (['LAM', 'CAM', 'RAM', 'LM', 'RM'].includes(role)) {
      tiers.AM.push(player);
    } else {
      tiers.FWD.push(player);
    }
  });

  return tiers;
}

// Fallback Kit Data URI
function getFallbackJerseySVG(teamCode, isGK = false) {
  const colors = TEAM_COLORS[teamCode] || { primary: '#2563EB', secondary: '#FFF', gk: '#10B981' };
  const baseColor = isGK ? colors.gk : colors.primary;
  const stripeColor = isGK ? '#00000033' : colors.secondary;

  return `data:image/svg+xml;utf8,<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M30 18 L40 28 C45 32 55 32 60 28 L70 18 L88 34 L76 46 L72 38 L72 84 L28 84 L28 38 L24 46 L12 34 Z" fill="${encodeURIComponent(baseColor)}" stroke="rgba(255,255,255,0.4)" stroke-width="2.5"/><path d="M42 26 C46 30 54 30 58 26" stroke="${encodeURIComponent(stripeColor)}" stroke-width="3"/><rect x="46" y="38" width="8" height="42" fill="${encodeURIComponent(stripeColor)}" opacity="0.85" rx="2"/></svg>`;
}

// Pure DOM Image Generator: string concatenation လုံးဝမသုံးဘဲ တိုက်ရိုက် create လုပ်သည်
function createPlayerKitElement(teamCode, isGK = false) {
  const img = document.createElement('img');
  img.className = 'real-kit-img';
  img.alt = teamCode;

  const primaryKit = `${isGK ? CONFIG.gkKitPath : CONFIG.outfieldKitPath}${teamCode}.png`;
  const fallbackOutfield = `${CONFIG.outfieldKitPath}${teamCode}.png`;

  img.src = primaryKit;
  img.onerror = function() {
    if (this.src !== fallbackOutfield) {
      this.src = fallbackOutfield;
    } else {
      this.onerror = null;
      this.src = getFallbackJerseySVG(teamCode, isGK);
    }
  };

  return img;
}

// Render Team into Tactical Pitch Frame
function displayTeamLineup(teamId, side = 'home') {
  const team = teamsData[String(teamId)] || Object.values(teamsData).find(t => String(t.teamId) === String(teamId));
  if (!team || !team.lineup) return;

  currentDisplayedSide = side;

  // Header Details
  const logoEl = document.getElementById('displayTeamLogo');
  if (logoEl) {
    logoEl.src = `${CONFIG.clubsPath}${team.teamCode}.png`;
    logoEl.style.display = 'block';
    logoEl.onerror = () => { logoEl.style.display = 'none'; };
  }

  const nameEl = document.getElementById('displayTeamName');
  if (nameEl) nameEl.textContent = team.teamName;

  const statusEl = document.getElementById('displayTeamStatus');
  if (statusEl) statusEl.textContent = side === 'home' ? 'HOME LINEUP' : 'AWAY LINEUP';

  const formEl = document.getElementById('displayFormation');
  if (formEl) formEl.textContent = team.formation;

  // Pitch Field Rendering
  const pitchEl = document.getElementById('pitchSurface');
  if (!pitchEl) return;
  pitchEl.innerHTML = '';

  const tacticalTiers = groupLineupByTier(team.lineup);
  const tierOrder = ['FWD', 'AM', 'DM', 'DEF', 'GK'];

  tierOrder.forEach(tierKey => {
    const playersInTier = tacticalTiers[tierKey];
    if (!playersInTier || playersInTier.length === 0) return;

    const rowEl = document.createElement('div');
    rowEl.className = `pitch-row pitch-row-${tierKey.toLowerCase()}`;

    playersInTier.forEach(player => {
      const isGK = player.pos === 'GK' || player.role === 'GK';
      const slot = document.createElement('div');
      slot.className = 'player-slot';

      // 1. Jersey Box
      const jerseyBox = document.createElement('div');
      jerseyBox.className = 'jersey-icon-box';
      
      const kitImg = createPlayerKitElement(team.teamCode, isGK);
      const roleTag = document.createElement('span');
      roleTag.className = 'role-tag';
      roleTag.textContent = player.role;

      jerseyBox.appendChild(kitImg);
      jerseyBox.appendChild(roleTag);

      // 2. Name Plate
      const namePlate = document.createElement('div');
      namePlate.className = 'name-plate';
      
      const nameText = document.createElement('span');
      nameText.className = 'player-name-text';
      nameText.textContent = player.name;

      namePlate.appendChild(nameText);

      // Assemble Slot
      slot.appendChild(jerseyBox);
      slot.appendChild(namePlate);
      rowEl.appendChild(slot);
    });

    pitchEl.appendChild(rowEl);
  });
}

// 10-Second Auto Switch Loop
function startAutoRotation() {
  if (autoSwitchTimer) {
    clearInterval(autoSwitchTimer);
    autoSwitchTimer = null;
  }
  
  if (!isAutoSwitchEnabled) return;

  autoSwitchTimer = setInterval(() => {
    const homeSelect = document.getElementById('homeSelect');
    const awaySelect = document.getElementById('awaySelect');
    if (!homeSelect || !awaySelect) return;

    if (currentDisplayedSide === 'home') {
      displayTeamLineup(awaySelect.value, 'away');
    } else {
      displayTeamLineup(homeSelect.value, 'home');
    }
  }, 10000);
}

// Update Scoreboard HUD at Bottom Center
function updateBottomScoreboard() {
  const homeSelect = document.getElementById('homeSelect');
  const awaySelect = document.getElementById('awaySelect');
  if (!homeSelect || !awaySelect) return;

  const homeTeam = teamsData[String(homeSelect.value)];
  const awayTeam = teamsData[String(awaySelect.value)];

  const homeLogo = document.getElementById('hudHomeLogo');
  const homeName = document.getElementById('hudHomeName');
  if (homeTeam && homeLogo && homeName) {
    homeLogo.src = `${CONFIG.clubsPath}${homeTeam.teamCode}.png`;
    homeName.textContent = homeTeam.teamName;
  }

  const awayLogo = document.getElementById('hudAwayLogo');
  const awayName = document.getElementById('hudAwayName');
  if (awayTeam && awayLogo && awayName) {
    awayLogo.src = `${CONFIG.clubsPath}${awayTeam.teamCode}.png`;
    awayName.textContent = awayTeam.teamName;
  }

  const ctrlHome = document.getElementById('ctrlHomeScore');
  const hudHome = document.getElementById('hudHomeGoals');
  if (ctrlHome) ctrlHome.textContent = homeScore;
  if (hudHome) hudHome.textContent = homeScore;

  const ctrlAway = document.getElementById('ctrlAwayScore');
  const hudAway = document.getElementById('hudAwayGoals');
  if (ctrlAway) ctrlAway.textContent = awayScore;
  if (hudAway) hudAway.textContent = awayScore;

  saveBroadcastState();
}

// Match Timer Functions
function formatClock(totalSec) {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function updateClockHUD() {
  const clockEl = document.getElementById('hudMatchClock');
  if (clockEl) clockEl.textContent = formatClock(matchSeconds);

  const inM = document.getElementById('inputClockMin');
  const inS = document.getElementById('inputClockSec');
  if (inM && !isTimerRunning) inM.value = Math.floor(matchSeconds / 60);
  if (inS && !isTimerRunning) inS.value = matchSeconds % 60;

  const periodBadge = document.getElementById('hudMatchPeriod');
  if (periodBadge) {
    if (matchSeconds >= 2700 && matchSeconds < 5400) {
      periodBadge.textContent = '2ND HALF';
    } else if (matchSeconds >= 5400) {
      periodBadge.textContent = 'EXTRA TIME / FT';
    } else {
      periodBadge.textContent = '1ST HALF';
    }
  }
}

function toggleClock() {
  const btn = document.getElementById('btnClockToggle');

  if (isTimerRunning) {
    clearInterval(timerInterval);
    isTimerRunning = false;
    if (btn) {
      btn.textContent = 'Start';
      btn.classList.remove('btn-secondary');
    }
    saveBroadcastState();
  } else {
    const inputM = parseInt(document.getElementById('inputClockMin')?.value, 10) || 0;
    const inputS = parseInt(document.getElementById('inputClockSec')?.value, 10) || 0;

    if (matchSeconds === 0 && (inputM > 0 || inputS > 0)) {
      matchSeconds = (inputM * 60) + inputS;
    }

    timerInterval = setInterval(() => {
      matchSeconds++;
      updateClockHUD();
      saveBroadcastState();
    }, 1000);

    isTimerRunning = true;
    if (btn) {
      btn.textContent = 'Pause';
      btn.classList.add('btn-secondary');
    }
    saveBroadcastState();
  }
}

function resetClock() {
  clearInterval(timerInterval);
  isTimerRunning = false;
  matchSeconds = 0;
  const inM = document.getElementById('inputClockMin');
  const inS = document.getElementById('inputClockSec');
  if (inM) inM.value = 0;
  if (inS) inS.value = 0;

  const btn = document.getElementById('btnClockToggle');
  if (btn) {
    btn.textContent = 'Start';
    btn.classList.remove('btn-secondary');
  }
  updateClockHUD();
  saveBroadcastState();
}

// User Action Handlers & Event Setup
function setupEvents() {
  const homeSelect = document.getElementById('homeSelect');
  const awaySelect = document.getElementById('awaySelect');

  if (homeSelect) {
    homeSelect.addEventListener('change', () => {
      updateBottomScoreboard();
      displayTeamLineup(homeSelect.value, 'home');
      startAutoRotation();
      saveBroadcastState();
    });
  }

  if (awaySelect) {
    awaySelect.addEventListener('change', () => {
      updateBottomScoreboard();
      displayTeamLineup(awaySelect.value, 'away');
      startAutoRotation();
      saveBroadcastState();
    });
  }

  // Score Controls
  document.getElementById('btnHomeScoreAdd')?.addEventListener('click', () => { homeScore++; updateBottomScoreboard(); });
  document.getElementById('btnHomeScoreSub')?.addEventListener('click', () => { if (homeScore > 0) homeScore--; updateBottomScoreboard(); });
  document.getElementById('btnAwayScoreAdd')?.addEventListener('click', () => { awayScore++; updateBottomScoreboard(); });
  document.getElementById('btnAwayScoreSub')?.addEventListener('click', () => { if (awayScore > 0) awayScore--; updateBottomScoreboard(); });

  // Clock Actions
  document.getElementById('btnClockToggle')?.addEventListener('click', toggleClock);
  document.getElementById('btnClockReset')?.addEventListener('click', resetClock);

  document.getElementById('inputClockMin')?.addEventListener('change', (e) => {
    matchSeconds = (parseInt(e.target.value, 10) || 0) * 60 + (parseInt(document.getElementById('inputClockSec')?.value, 10) || 0);
    updateClockHUD();
    saveBroadcastState();
  });
  document.getElementById('inputClockSec')?.addEventListener('change', (e) => {
    matchSeconds = (parseInt(document.getElementById('inputClockMin')?.value, 10) || 0) * 60 + (parseInt(e.target.value, 10) || 0);
    updateClockHUD();
    saveBroadcastState();
  });

  // Auto Switch Button
  const autoBtn = document.getElementById('btnAutoSwitchToggle');
  if (autoBtn) {
    autoBtn.addEventListener('click', () => {
      isAutoSwitchEnabled = !isAutoSwitchEnabled;
      autoBtn.classList.toggle('active', isAutoSwitchEnabled);
      autoBtn.textContent = isAutoSwitchEnabled ? 'Auto: ON (10s)' : 'Auto: OFF';
      if (isAutoSwitchEnabled) {
        startAutoRotation();
      } else {
        clearInterval(autoSwitchTimer);
        autoSwitchTimer = null;
      }
    });
  }

  // Hide Controls Bar for OBS
  document.getElementById('btnHideControlBar')?.addEventListener('click', () => {
    document.getElementById('streamerDashboard')?.classList.toggle('hidden');
  });

  // ==========================================
  // ANTI-ACCIDENTAL REFRESH GUARD
  // ==========================================
  window.addEventListener('beforeunload', (e) => {
    // Timer ပြေးနေချိန် သို့မဟုတ် ရမှတ်များ ရှိနေချိန်တွင် Refresh သို့မဟုတ် Tab ပိတ်မိပါက browser prompt ပြပေးခြင်း
    if (isTimerRunning || matchSeconds > 0 || homeScore > 0 || awayScore > 0) {
      e.preventDefault();
      e.returnValue = 'Live stream is currently active. Are you sure you want to reload?';
      return e.returnValue;
    }
  });

  // URL Parameter check (?controls=false)
  const params = new URLSearchParams(window.location.search);
  if (params.get('controls') === 'false') {
    document.getElementById('streamerDashboard')?.classList.add('hidden');
  }
}

// Populate UI Dropdowns
function initDropdowns() {
  const homeSelect = document.getElementById('homeSelect');
  const awaySelect = document.getElementById('awaySelect');
  if (!homeSelect || !awaySelect) return;

  homeSelect.innerHTML = '';
  awaySelect.innerHTML = '';

  Object.entries(teamsData).forEach(([key, team]) => {
    homeSelect.add(new Option(`${team.teamName} (${team.formation})`, key));
    awaySelect.add(new Option(`${team.teamName} (${team.formation})`, key));
  });

  const params = new URLSearchParams(window.location.search);
  
  // Storage တွင် သိမ်းဆည်းထားသော အသင်း ID သို့မဟုတ် URL/Default ID ဖြင့် ဦးစားပေး ခေါ်ယူခြင်း
  const savedHome = localStorage.getItem(STORAGE_KEYS.HOME_TEAM_ID);
  const savedAway = localStorage.getItem(STORAGE_KEYS.AWAY_TEAM_ID);

  homeSelect.value = params.get('home') || savedHome || '1';
  awaySelect.value = params.get('away') || savedAway || '6';

  updateBottomScoreboard();
  displayTeamLineup(homeSelect.value, 'home');
  startAutoRotation();
}

// App Bootstrapper
async function initApp() {
  loadBroadcastState(); // Refresh မဖြစ်မီ သိမ်းထားသော ပွဲချိန်နှင့် ရမှတ်များ ပြန်လည်ဆွဲယူခြင်း
  setupEvents();
  updateClockHUD();

  try {
    const res = await fetch(CONFIG.dataPath);
    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    teamsData = await res.json();
    initDropdowns();
  } catch (err) {
    console.error('Failed to load custom-lineups.json:', err);
  }
}

document.addEventListener('DOMContentLoaded', initApp);
