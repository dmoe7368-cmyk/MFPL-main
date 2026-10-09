/**
 * Watch-Along Live Broadcast Engine
 * Handles Real Club Logos, Real Outfield/GK Kits, Tactical Role Separation & Scoreboard
 */

const CONFIG = {
  dataPath: 'assets/data/custom-lineups.json',
  clubsPath: 'assets/images/clubs/',
  jerseysPath: 'assets/images/jerseys/outfield/',
  gkJerseysPath: 'assets/images/jerseys/gk/'
};

let teamsData = {};
let currentDisplayedSide = 'home';
let autoSwitchTimer = null;
let isAutoSwitchEnabled = true;

// Match States
let matchSeconds = 0;
let timerInterval = null;
let isTimerRunning = false;
let homeScore = 0;
let awayScore = 0;

// High-Accuracy Formation Tier Sorter by Player Tactical Roles
function groupLineupByTacticalTiers(lineup) {
  const tiers = {
    ST: [],
    AM: [],
    DM: [],
    DEF: [],
    GK: []
  };

  lineup.forEach(player => {
    const role = (player.role || '').toUpperCase();
    const pos = (player.pos || '').toUpperCase();

    if (pos === 'GK' || role === 'GK') {
      tiers.GK.push(player);
    } else if (pos === 'DEF' || ['LB', 'LCB', 'CB', 'RCB', 'RB', 'LWB', 'RWB'].includes(role)) {
      tiers.DEF.push(player);
    } else if (['LDM', 'RDM', 'CDM', 'LCM', 'RCM', 'CM'].includes(role)) {
      tiers.DM.push(player);
    } else if (['LAM', 'CAM', 'RAM', 'LM', 'RM'].includes(role)) {
      tiers.AM.push(player);
    } else if (pos === 'FWD' || ['ST', 'CF', 'LW', 'RW', 'LS', 'RS'].includes(role)) {
      tiers.ST.push(player);
    } else {
      tiers.AM.push(player);
    }
  });

  return tiers;
}

// Generate Player Kit Image with Automatic Fallback
function getJerseyImageHtml(teamCode, isGK = false) {
  const folder = isGK ? CONFIG.gkJerseysPath : CONFIG.jerseysPath;
  const kitUrl = `${folder}${teamCode}.png`;
  const fallbackUrl = `${CONFIG.jerseysPath}${teamCode}.png`;

  return `
    <img src="${kitUrl}" 
         alt="${teamCode} kit" 
         class="real-kit-img" 
         onerror="if(this.src!=='${fallbackUrl}'){this.src='${fallbackUrl}';}else{this.style.display='none';}" />
  `;
}

// Render Team onto the Right Pitch Frame
function displayTeamLineup(teamId, side = 'home') {
  const team = teamsData[String(teamId)] || Object.values(teamsData).find(t => String(t.teamId) === String(teamId));
  if (!team || !team.lineup) return;

  // Header Details
  document.getElementById('displayTeamLogo').src = `${CONFIG.clubsPath}${team.teamCode}.png`;
  document.getElementById('displayTeamName').textContent = team.teamName;
  document.getElementById('displayTeamStatus').textContent = side === 'home' ? 'HOME LINEUP' : 'AWAY LINEUP';
  document.getElementById('displayFormation').textContent = team.formation;

  const pitchEl = document.getElementById('pitchSurface');
  pitchEl.innerHTML = '';

  const tacticalTiers = groupLineupByTacticalTiers(team.lineup);
  const tierOrder = ['ST', 'AM', 'DM', 'DEF', 'GK'];

  tierOrder.forEach(tierKey => {
    const playersInTier = tacticalTiers[tierKey];
    if (playersInTier.length === 0) return;

    const rowEl = document.createElement('div');
    rowEl.className = `pitch-row pitch-row-${tierKey.toLowerCase()}`;

    playersInTier.forEach(player => {
      const isGK = player.pos === 'GK' || player.role === 'GK';
      const slot = document.createElement('div');
      slot.className = 'player-slot';
      slot.innerHTML = `
        <div class="jersey-icon-box">
          ${getJerseyImageHtml(team.teamCode, isGK)}
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

// Auto Rotation (10 seconds switch)
function startAutoRotation() {
  if (autoSwitchTimer) clearInterval(autoSwitchTimer);
  if (!isAutoSwitchEnabled) return;

  autoSwitchTimer = setInterval(() => {
    const homeId = document.getElementById('homeSelect').value;
    const awayId = document.getElementById('awaySelect').value;

    if (currentDisplayedSide === 'home') {
      currentDisplayedSide = 'away';
      displayTeamLineup(awayId, 'away');
    } else {
      currentDisplayedSide = 'home';
      displayTeamLineup(homeId, 'home');
    }
  }, 10000);
}

// Update Bottom Scoreboard HUD
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

// Timer Functions
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

// User Action Handlers
function setupEvents() {
  const homeSelect = document.getElementById('homeSelect');
  const awaySelect = document.getElementById('awaySelect');

  homeSelect.addEventListener('change', () => {
    updateBottomScoreboard();
    if (currentDisplayedSide === 'home') displayTeamLineup(homeSelect.value, 'home');
  });

  awaySelect.addEventListener('change', () => {
    updateBottomScoreboard();
    if (currentDisplayedSide === 'away') displayTeamLineup(awaySelect.value, 'away');
  });

  // Score Buttons
  document.getElementById('btnHomeScoreAdd').addEventListener('click', () => { homeScore++; updateBottomScoreboard(); });
  document.getElementById('btnHomeScoreSub').addEventListener('click', () => { if (homeScore > 0) homeScore--; updateBottomScoreboard(); });
  document.getElementById('btnAwayScoreAdd').addEventListener('click', () => { awayScore++; updateBottomScoreboard(); });
  document.getElementById('btnAwayScoreSub').addEventListener('click', () => { if (awayScore > 0) awayScore--; updateBottomScoreboard(); });

  // Clock Buttons
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

  // Toggle Auto Switching
  const autoBtn = document.getElementById('btnAutoSwitchToggle');
  autoBtn.addEventListener('click', () => {
    isAutoSwitchEnabled = !isAutoSwitchEnabled;
    autoBtn.classList.toggle('active', isAutoSwitchEnabled);
    autoBtn.textContent = isAutoSwitchEnabled ? 'Auto: ON (10s)' : 'Auto: OFF';
    if (isAutoSwitchEnabled) startAutoRotation();
    else clearInterval(autoSwitchTimer);
  });

  // Toggle Dashboard Header
  document.getElementById('btnHideControlBar').addEventListener('click', () => {
    document.getElementById('streamerDashboard').classList.toggle('hidden');
  });

  // URL Parameter auto-hide (?controls=false)
  const params = new URLSearchParams(window.location.search);
  if (params.get('controls') === 'false') {
    document.getElementById('streamerDashboard').classList.add('hidden');
  }
}

// Populate Selectors from Data
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
  startAutoRotation();
}

// Init Application
async function initApp() {
  setupEvents();
  updateClockHUD();

  try {
    const res = await fetch(CONFIG.dataPath);
    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    teamsData = await res.json();
    initDropdowns();
  } catch (err) {
    console.error('Failed to load lineup JSON:', err);
  }
}

document.addEventListener('DOMContentLoaded', initApp);
