/**
 * Watch-Along Live Broadcast Engine (Clean Production Build)
 * Fixes: Stray character bug, Deep Emerald Grid & Bulletproof Auto-Rotation
 */

const CONFIG = {
  dataPath: 'assets/data/custom-lineups.json',
  clubsPath: 'assets/images/clubs/',
  outfieldKitPath: 'assets/images/jerseys/outfield/',
  gkKitPath: 'assets/images/jerseys/gk/'
};

let teamsData = {};
let currentDisplayedSide = 'home';
let autoSwitchTimer = null;
let isAutoSwitchEnabled = true;

// Match Clock & Scores
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

// Clean Kit Image Generator (Completely prevents syntax arrows)
function getPlayerKitHtml(teamCode, isGK = false) {
  const kitFolder = isGK ? CONFIG.gkKitPath : CONFIG.outfieldKitPath;
  const kitUrl = `${kitFolder}${teamCode}.png`;
  const fallbackOutfield = `${CONFIG.outfieldKitPath}${teamCode}.png`;
  const fallbackSvg = getFallbackJerseySVG(teamCode, isGK);

  return `<img src="${kitUrl}" alt="${teamCode}" class="real-kit-img" onerror="if(this.src!=='${fallbackOutfield}'){this.src='${fallbackOutfield}';}else{this.onerror=null;this.src='${fallbackSvg}';}">`;
}

// Render Team into Tactical Pitch Frame
function displayTeamLineup(teamId, side = 'home') {
  const team = teamsData[String(teamId)] || Object.values(teamsData).find(t => String(t.teamId) === String(teamId));
  if (!team || !team.lineup) return;

  currentDisplayedSide = side;

  // Header Details
  const logoEl = document.getElementById('displayTeamLogo');
  logoEl.src = `${CONFIG.clubsPath}${team.teamCode}.png`;
  logoEl.onerror = () => { logoEl.style.display = 'none'; };

  document.getElementById('displayTeamName').textContent = team.teamName;
  document.getElementById('displayTeamStatus').textContent = side === 'home' ? 'HOME LINEUP' : 'AWAY LINEUP';
  document.getElementById('displayFormation').textContent = team.formation;

  // Pitch Field Rendering
  const pitchEl = document.getElementById('pitchSurface');
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
      
      // Strict clean template literals (Eliminating any stray slash/arrow)
      slot.innerHTML = `
        <div class="jersey-icon-box">
          ${getPlayerKitHtml(team.teamCode, isGK)}
          <span class="role-tag">${player.role}</span>
        </div>
        <div class="name-plate">
          <span class="player-name-text">${player.name}</span>
        </div>
      `;
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
    const homeId = document.getElementById('homeSelect').value;
    const awayId = document.getElementById('awaySelect').value;

    if (currentDisplayedSide === 'home') {
      displayTeamLineup(awayId, 'away');
    } else {
      displayTeamLineup(homeId, 'home');
    }
  }, 10000); // exactly 10s switch
}

// Update Scoreboard HUD at Bottom Center
function updateBottomScoreboard() {
  const homeId = document.getElementById('homeSelect').value;
  const awayId = document.getElementById('awaySelect').value;

  const homeTeam = teamsData[String(homeId)];
  const awayTeam = teamsData[String(awayId)];

  if (homeTeam) {
    document.getElementById('hudHomeLogo').src = `${CONFIG.clubsPath}${homeTeam.teamCode}.png`;
    document.getElementById('hudHomeName').textContent = homeTeam.teamName;
  }
  if (awayTeam) {
    document.getElementById('hudAwayLogo').src = `${CONFIG.clubsPath}${awayTeam.teamCode}.png`;
    document.getElementById('hudAwayName').textContent = awayTeam.teamName;
  }

  document.getElementById('ctrlHomeScore').textContent = homeScore;
  document.getElementById('hudHomeGoals').textContent = homeScore;
  document.getElementById('ctrlAwayScore').textContent = awayScore;
  document.getElementById('hudAwayGoals').textContent = awayScore;
}

// Match Clock Controls
function formatClock(totalSec) {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function updateClockHUD() {
  document.getElementById('hudMatchClock').textContent = formatClock(matchSeconds);

  const periodBadge = document.getElementById('hudMatchPeriod');
  if (matchSeconds >= 2700 && matchSeconds < 5400) {
    periodBadge.textContent = '2ND HALF';
  } else if (matchSeconds >= 5400) {
    periodBadge.textContent = 'EXTRA TIME / FT';
  } else {
    periodBadge.textContent = '1ST HALF';
  }
}

function toggleClock() {
  const btn = document.getElementById('btnClockToggle');
  if (isTimerRunning) {
    clearInterval(timerInterval);
    isTimerRunning = false;
    btn.textContent = 'Start';
    btn.classList.remove('btn-secondary');
  } else {
    const inputM = parseInt(document.getElementById('inputClockMin').value) || 0;
    const inputS = parseInt(document.getElementById('inputClockSec').value) || 0;

    if (matchSeconds === 0 && (inputM > 0 || inputS > 0)) {
      matchSeconds = (inputM * 60) + inputS;
    }

    timerInterval = setInterval(() => {
      matchSeconds++;
      updateClockHUD();
      document.getElementById('inputClockMin').value = Math.floor(matchSeconds / 60);
      document.getElementById('inputClockSec').value = matchSeconds % 60;
    }, 1000);

    isTimerRunning = true;
    btn.textContent = 'Pause';
    btn.classList.add('btn-secondary');
  }
}

function resetClock() {
  clearInterval(timerInterval);
  isTimerRunning = false;
  matchSeconds = 0;
  document.getElementById('inputClockMin').value = 0;
  document.getElementById('inputClockSec').value = 0;
  document.getElementById('btnClockToggle').textContent = 'Start';
  document.getElementById('btnClockToggle').classList.remove('btn-secondary');
  updateClockHUD();
}

// Event Bindings
function setupEvents() {
  const homeSelect = document.getElementById('homeSelect');
  const awaySelect = document.getElementById('awaySelect');

  homeSelect.addEventListener('change', () => {
    updateBottomScoreboard();
    displayTeamLineup(homeSelect.value, 'home');
    startAutoRotation();
  });

  awaySelect.addEventListener('change', () => {
    updateBottomScoreboard();
    displayTeamLineup(awaySelect.value, 'away');
    startAutoRotation();
  });

  // Score Controls
  document.getElementById('btnHomeScoreAdd').addEventListener('click', () => { homeScore++; updateBottomScoreboard(); });
  document.getElementById('btnHomeScoreSub').addEventListener('click', () => { if (homeScore > 0) homeScore--; updateBottomScoreboard(); });
  document.getElementById('btnAwayScoreAdd').addEventListener('click', () => { awayScore++; updateBottomScoreboard(); });
  document.getElementById('btnAwayScoreSub').addEventListener('click', () => { if (awayScore > 0) awayScore--; updateBottomScoreboard(); });

  // Clock Actions
  document.getElementById('btnClockToggle').addEventListener('click', toggleClock);
  document.getElementById('btnClockReset').addEventListener('click', resetClock);

  document.getElementById('inputClockMin').addEventListener('change', (e) => {
    matchSeconds = (parseInt(e.target.value) || 0) * 60 + (parseInt(document.getElementById('inputClockSec').value) || 0);
    updateClockHUD();
  });
  document.getElementById('inputClockSec').addEventListener('change', (e) => {
    matchSeconds = (parseInt(document.getElementById('inputClockMin').value) || 0) * 60 + (parseInt(e.target.value) || 0);
    updateClockHUD();
  });

  // Auto Switch Button
  const autoBtn = document.getElementById('btnAutoSwitchToggle');
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

  // Hide Controls Bar for OBS
  document.getElementById('btnHideControlBar').addEventListener('click', () => {
    document.getElementById('streamerDashboard').classList.toggle('hidden');
  });

  const params = new URLSearchParams(window.location.search);
  if (params.get('controls') === 'false') {
    document.getElementById('streamerDashboard').classList.add('hidden');
  }
}

// Populate UI Dropdowns
function initDropdowns() {
  const homeSelect = document.getElementById('homeSelect');
  const awaySelect = document.getElementById('awaySelect');

  homeSelect.innerHTML = '';
  awaySelect.innerHTML = '';

  Object.entries(teamsData).forEach(([key, team]) => {
    homeSelect.add(new Option(`${team.teamName} (${team.formation})`, key));
    awaySelect.add(new Option(`${team.teamName} (${team.formation})`, key));
  });

  const params = new URLSearchParams(window.location.search);
  homeSelect.value = params.get('home') || '1';
  awaySelect.value = params.get('away') || '6';

  updateBottomScoreboard();
  displayTeamLineup(homeSelect.value, 'home');
  startAutoRotation(); // Boot Auto Rotation immediately
}

// App Bootstrapper
async function initApp() {
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
