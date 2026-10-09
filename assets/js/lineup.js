/**
 * Watch-Along Live Broadcast Engine
 * Features: Auto Team Rotation (10s), Embedded Teams Registry, HD Vector Kits, Live Timer & Scoreboard
 */

// 20 Clubs Fallback Registry to Guarantee Display on Static Hosts
const FALLBACK_REGISTRY = {
  "1": {
    teamId: 1, teamName: "Arsenal", shortName: "ARS", teamCode: "ars", formation: "4-2-3-1",
    lineup: [
      { name: "Raya", pos: "GK", role: "GK" },
      { name: "Calafiori", pos: "DEF", role: "LB" },
      { name: "Gabriel", pos: "DEF", role: "LCB" },
      { name: "Konsa", pos: "DEF", role: "RCB" },
      { name: "Timber", pos: "DEF", role: "RB" },
      { name: "Guimarães", pos: "MID", role: "LDM" },
      { name: "Rice", pos: "MID", role: "RDM" },
      { name: "Tzolis", pos: "MID", role: "LAM" },
      { name: "Ødegaard", pos: "MID", role: "CAM" },
      { name: "Saka", pos: "MID", role: "RAM" },
      { name: "Havertz", pos: "FWD", role: "ST" }
    ]
  },
  "2": {
    teamId: 2, teamName: "Aston Villa", shortName: "AVL", teamCode: "avl", formation: "4-2-3-1",
    lineup: [
      { name: "Suzuki", pos: "GK", role: "GK" },
      { name: "Ruggeri", pos: "DEF", role: "LB" },
      { name: "Mings", pos: "DEF", role: "LCB" },
      { name: "Lindelöf", pos: "DEF", role: "RCB" },
      { name: "Wan-Bissaka", pos: "DEF", role: "RB" },
      { name: "Gomes", pos: "MID", role: "LDM" },
      { name: "Kamara", pos: "MID", role: "RDM" },
      { name: "Buendía", pos: "MID", role: "LAM" },
      { name: "Manzambi", pos: "MID", role: "CAM" },
      { name: "McGinn", pos: "MID", role: "RAM" },
      { name: "Jackson", pos: "FWD", role: "ST" }
    ]
  },
  "6": {
    teamId: 6, teamName: "Chelsea", shortName: "CHE", teamCode: "che", formation: "3-4-2-1",
    lineup: [
      { name: "Martínez", pos: "GK", role: "GK" },
      { name: "Colwill", pos: "DEF", role: "LCB" },
      { name: "Lacroix", pos: "DEF", role: "CB" },
      { name: "Fofana", pos: "DEF", role: "RCB" },
      { name: "Chavarría", pos: "MID", role: "LWB" },
      { name: "Barco", pos: "MID", role: "LDM" },
      { name: "Henderson", pos: "MID", role: "RDM" },
      { name: "Neto", pos: "MID", role: "RWB" },
      { name: "Rogers", pos: "MID", role: "LAM" },
      { name: "Palmer", pos: "MID", role: "RAM" },
      { name: "Welbeck", pos: "FWD", role: "ST" }
    ]
  },
  "14": {
    teamId: 14, teamName: "Liverpool", shortName: "LIV", teamCode: "liv", formation: "4-2-3-1",
    lineup: [
      { name: "Alisson", pos: "GK", role: "GK" },
      { name: "Kerkez", pos: "DEF", role: "LB" },
      { name: "van Dijk", pos: "DEF", role: "LCB" },
      { name: "Jacquet", pos: "DEF", role: "RCB" },
      { name: "Araujo", pos: "DEF", role: "RB" },
      { name: "Mac Allister", pos: "MID", role: "LDM" },
      { name: "Szoboszlai", pos: "MID", role: "RDM" },
      { name: "Barcola", pos: "MID", role: "LAM" },
      { name: "Wirtz", pos: "MID", role: "CAM" },
      { name: "Gakpo", pos: "MID", role: "RAM" },
      { name: "Isak", pos: "FWD", role: "ST" }
    ]
  },
  "15": {
    teamId: 15, teamName: "Manchester City", shortName: "MCI", teamCode: "mci", formation: "4-2-3-1",
    lineup: [
      { name: "Donnarumma", pos: "GK", role: "GK" },
      { name: "Gvardiol", pos: "DEF", role: "LB" },
      { name: "Guéhi", pos: "DEF", role: "LCB" },
      { name: "Dias", pos: "DEF", role: "RCB" },
      { name: "Nunes", pos: "DEF", role: "RB" },
      { name: "Anderson", pos: "MID", role: "LDM" },
      { name: "Fernández", pos: "MID", role: "RDM" },
      { name: "Semenyo", pos: "MID", role: "LAM" },
      { name: "Cherki", pos: "MID", role: "CAM" },
      { name: "Ndiaye", pos: "MID", role: "RAM" },
      { name: "Haaland", pos: "FWD", role: "ST" }
    ]
  },
  "16": {
    teamId: 16, teamName: "Manchester United", shortName: "MUN", teamCode: "mun", formation: "4-2-3-1",
    lineup: [
      { name: "Lammens", pos: "GK", role: "GK" },
      { name: "Shaw", pos: "DEF", role: "LB" },
      { name: "Martínez", pos: "DEF", role: "LCB" },
      { name: "Maguire", pos: "DEF", role: "RCB" },
      { name: "Dalot", pos: "DEF", role: "RB" },
      { name: "Mainoo", pos: "MID", role: "LDM" },
      { name: "Tielemans", pos: "MID", role: "RDM" },
      { name: "Rashford", pos: "MID", role: "LAM" },
      { name: "Fernandes", pos: "MID", role: "CAM" },
      { name: "Mbeumo", pos: "MID", role: "RAM" },
      { name: "Cunha", pos: "FWD", role: "ST" }
    ]
  }
};

let teamsData = {};

// Kit themes (Primary, Secondary, Goalkeeper)
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

// Global App States
let currentDisplayedSide = 'home'; // 'home' or 'away'
let autoSwitchTimer = null;
let isAutoSwitchEnabled = true;

let matchSeconds = 0;
let timerInterval = null;
let isTimerRunning = false;
let homeScore = 0;
let awayScore = 0;

// High Definition Vector Jersey Generator
function getJerseySVG(teamCode, isGK = false) {
  const colors = TEAM_COLORS[teamCode] || { primary: '#2563EB', secondary: '#FFF', gk: '#10B981' };
  const baseColor = isGK ? colors.gk : colors.primary;
  const stripeColor = isGK ? '#00000033' : colors.secondary;

  return `
    <svg class="jersey-svg" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M30 18 L40 28 C45 32 55 32 60 28 L70 18 L88 34 L76 46 L72 38 L72 84 L28 84 L28 38 L24 46 L12 34 Z" fill="${baseColor}" stroke="rgba(255,255,255,0.4)" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M42 26 C46 30 54 30 58 26" stroke="${stripeColor}" stroke-width="3" stroke-linecap="round"/>
      <rect x="46" y="38" width="8" height="42" fill="${stripeColor}" opacity="0.85" rx="2" />
    </svg>
  `;
}

// Tactical Formation Tier Sorter
function groupLineupByTiers(lineup) {
  const tiers = { FWD: [], MID: [], DEF: [], GK: [] };
  lineup.forEach(p => {
    if (tiers[p.pos]) tiers[p.pos].push(p);
    else tiers.MID.push(p);
  });
  return tiers;
}

// Render Selected Team into the Right-Side Pitch
function displayTeamLineup(teamId, side = 'home') {
  const team = teamsData[String(teamId)] || Object.values(teamsData).find(t => String(t.teamId) === String(teamId));
  if (!team || !team.lineup) return;

  // Header Details
  document.getElementById('displayTeamBadge').textContent = team.shortName;
  document.getElementById('displayTeamName').textContent = team.teamName;
  document.getElementById('displayTeamStatus').textContent = side === 'home' ? 'HOME LINEUP' : 'AWAY LINEUP';
  document.getElementById('displayFormation').textContent = team.formation;

  // Render Pitch Players
  const pitchEl = document.getElementById('pitchSurface');
  pitchEl.innerHTML = '';

  const tiers = groupLineupByTiers(team.lineup);
  const rows = ['FWD', 'MID', 'DEF', 'GK'];

  rows.forEach(tierKey => {
    const rowEl = document.createElement('div');
    rowEl.className = `pitch-row pitch-row-${tierKey.toLowerCase()}`;

    tiers[tierKey].forEach(player => {
      const isGK = player.pos === 'GK';
      const slot = document.createElement('div');
      slot.className = 'player-slot';
      slot.innerHTML = `
        <div class="jersey-icon-box">
          ${getJerseySVG(team.teamCode, isGK)}
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

// Auto Switch Lineups Between Home & Away every 10 seconds
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
  }, 10000); // 10 seconds interval
}

// Update Scoreboard HUD at Bottom Center
function updateBottomScoreboard() {
  const homeId = document.getElementById('homeSelect').value;
  const awayId = document.getElementById('awaySelect').value;

  const homeTeam = teamsData[String(homeId)];
  const awayTeam = teamsData[String(awayId)];

  if (homeTeam) {
    document.getElementById('hudHomeBadge').textContent = homeTeam.shortName;
    document.getElementById('hudHomeName').textContent = homeTeam.teamName;
  }
  if (awayTeam) {
    document.getElementById('hudAwayBadge').textContent = awayTeam.shortName;
    document.getElementById('hudAwayName').textContent = awayTeam.teamName;
  }

  document.getElementById('ctrlHomeScore').textContent = homeScore;
  document.getElementById('hudHomeGoals').textContent = homeScore;
  document.getElementById('ctrlAwayScore').textContent = awayScore;
  document.getElementById('hudAwayGoals').textContent = awayScore;
}

// Clock Utilities
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

// Bind User Interactions
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

  // Score Controls
  document.getElementById('btnHomeScoreAdd').addEventListener('click', () => { homeScore++; updateBottomScoreboard(); });
  document.getElementById('btnHomeScoreSub').addEventListener('click', () => { if (homeScore > 0) homeScore--; updateBottomScoreboard(); });
  document.getElementById('btnAwayScoreAdd').addEventListener('click', () => { awayScore++; updateBottomScoreboard(); });
  document.getElementById('btnAwayScoreSub').addEventListener('click', () => { if (awayScore > 0) awayScore--; updateBottomScoreboard(); });

  // Clock Controls
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

  // Toggle Streamer Dashboard Header
  document.getElementById('btnHideControlBar').addEventListener('click', () => {
    document.getElementById('streamerDashboard').classList.toggle('hidden');
  });

  // URL Parameter auto-hide (?controls=false)
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
  startAutoRotation();
}

// App Bootstrapper
async function initApp() {
  setupEvents();
  updateClockHUD();

  try {
    const res = await fetch('assets/data/custom-lineups.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    teamsData = await res.json();
  } catch (err) {
    console.warn('Network issue fetching JSON. Activating Embedded Registry:', err);
    teamsData = FALLBACK_REGISTRY;
  }

  initDropdowns();
}

document.addEventListener('DOMContentLoaded', initApp);
