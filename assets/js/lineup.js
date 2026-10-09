/**
 * Live Watch-Along Dual Lineup Engine
 * Fetches JSON directly by teamId and renders players, jerseys, scoreboard, and timer
 */

const CONFIG = {
  dataPath: 'assets/data/custom-lineups.json',
  defaultHomeId: '1',  // Arsenal
  defaultAwayId: '6'   // Chelsea
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

// Match State
let matchSeconds = 0;
let timerInterval = null;
let isTimerRunning = false;
let homeScore = 0;
let awayScore = 0;

// High-Definition Vector Jersey SVG
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

// Tactical Formation Tier Sorter (FWD -> MID -> DEF -> GK)
function groupLineupByTiers(lineup) {
  const tiers = { FWD: [], MID: [], DEF: [], GK: [] };
  lineup.forEach(p => {
    if (tiers[p.pos]) {
      tiers[p.pos].push(p);
    } else {
      tiers.MID.push(p);
    }
  });
  return tiers;
}

// Render Team by ID
function renderTeam(teamId, type = 'home') {
  // Key string သို့မဟုတ် number နှစ်မျိုးစလုံး ရှာဖွေနိုင်အောင် handle လုပ်ထားသည်
  const team = teamsData[String(teamId)] || Object.values(teamsData).find(t => String(t.teamId) === String(teamId));
  if (!team || !team.lineup) return;

  const isHome = type === 'home';
  const prefix = isHome ? 'home' : 'away';

  // 1. Update Scoreboard HUD
  document.getElementById(`hud${isHome ? 'Home' : 'Away'}Badge`).textContent = team.shortName;
  document.getElementById(`hud${isHome ? 'Home' : 'Away'}Name`).textContent = team.teamName;

  // 2. Update Card Meta Header
  document.getElementById(`card${isHome ? 'Home' : 'Away'}Badge`).textContent = team.shortName;
  document.getElementById(`card${isHome ? 'Home' : 'Away'}Name`).textContent = team.teamName;
  document.getElementById(`card${isHome ? 'Home' : 'Away'}Formation`).textContent = team.formation;

  // 3. Render Pitch Players
  const pitchEl = document.getElementById(`${prefix}PitchSurface`);
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
        <div class="jersey-box">
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

// Score Management
function updateScores() {
  document.getElementById('ctrlHomeScore').textContent = homeScore;
  document.getElementById('hudHomeScore').textContent = homeScore;
  document.getElementById('ctrlAwayScore').textContent = awayScore;
  document.getElementById('hudAwayScore').textContent = awayScore;
}

// Match Timer Logic
function formatTimer(totalSec) {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function updateTimerDisplay() {
  const formatted = formatTimer(matchSeconds);
  document.getElementById('hudClock').textContent = formatted;

  const halfBadge = document.getElementById('hudMatchHalf');
  if (matchSeconds >= 2700 && matchSeconds < 5400) {
    halfBadge.textContent = '2ND HALF';
  } else if (matchSeconds >= 5400) {
    halfBadge.textContent = 'EXTRA TIME / FT';
  } else {
    halfBadge.textContent = '1ST HALF';
  }
}

function toggleTimer() {
  const startBtn = document.getElementById('timerStartBtn');
  if (isTimerRunning) {
    clearInterval(timerInterval);
    isTimerRunning = false;
    startBtn.textContent = 'Start';
    startBtn.classList.remove('btn-secondary');
  } else {
    const inputM = parseInt(document.getElementById('manualMin').value) || 0;
    const inputS = parseInt(document.getElementById('manualSec').value) || 0;

    if (matchSeconds === 0 && (inputM > 0 || inputS > 0)) {
      matchSeconds = (inputM * 60) + inputS;
    }

    timerInterval = setInterval(() => {
      matchSeconds++;
      updateTimerDisplay();
      document.getElementById('manualMin').value = Math.floor(matchSeconds / 60);
      document.getElementById('manualSec').value = matchSeconds % 60;
    }, 1000);

    isTimerRunning = true;
    startBtn.textContent = 'Pause';
    startBtn.classList.add('btn-secondary');
  }
}

function resetTimer() {
  clearInterval(timerInterval);
  isTimerRunning = false;
  matchSeconds = 0;
  document.getElementById('manualMin').value = 0;
  document.getElementById('manualSec').value = 0;
  document.getElementById('timerStartBtn').textContent = 'Start';
  document.getElementById('timerStartBtn').classList.remove('btn-secondary');
  updateTimerDisplay();
}

// UI Event Handlers
function setupEventHandlers() {
  const homeSelect = document.getElementById('homeTeamSelect');
  const awaySelect = document.getElementById('awayTeamSelect');

  homeSelect.addEventListener('change', (e) => renderTeam(e.target.value, 'home'));
  awaySelect.addEventListener('change', (e) => renderTeam(e.target.value, 'away'));

  // Score Steppers
  document.getElementById('homeScorePlus').addEventListener('click', () => { homeScore++; updateScores(); });
  document.getElementById('homeScoreMinus').addEventListener('click', () => { if (homeScore > 0) homeScore--; updateScores(); });
  document.getElementById('awayScorePlus').addEventListener('click', () => { awayScore++; updateScores(); });
  document.getElementById('awayScoreMinus').addEventListener('click', () => { if (awayScore > 0) awayScore--; updateScores(); });

  // Timer Buttons
  document.getElementById('timerStartBtn').addEventListener('click', toggleTimer);
  document.getElementById('timerResetBtn').addEventListener('click', resetTimer);

  document.getElementById('manualMin').addEventListener('change', (e) => {
    matchSeconds = (parseInt(e.target.value) || 0) * 60 + (parseInt(document.getElementById('manualSec').value) || 0);
    updateTimerDisplay();
  });
  document.getElementById('manualSec').addEventListener('change', (e) => {
    matchSeconds = (parseInt(document.getElementById('manualMin').value) || 0) * 60 + (parseInt(e.target.value) || 0);
    updateTimerDisplay();
  });

  // Toggle Streamer Controls
  document.getElementById('toggleHudBtn').addEventListener('click', () => {
    document.getElementById('controllerHub').classList.toggle('hidden');
  });

  // URL Parameter check (?controls=false)
  const params = new URLSearchParams(window.location.search);
  if (params.get('controls') === 'false') {
    document.getElementById('controllerHub').classList.add('hidden');
  }
}

// Populate Selectors from Data
function populateUI() {
  const homeSelect = document.getElementById('homeTeamSelect');
  const awaySelect = document.getElementById('awayTeamSelect');

  homeSelect.innerHTML = '';
  awaySelect.innerHTML = '';

  Object.entries(teamsData).forEach(([key, team]) => {
    homeSelect.add(new Option(`${team.teamName} (${team.formation})`, key));
    awaySelect.add(new Option(`${team.teamName} (${team.formation})`, key));
  });

  const params = new URLSearchParams(window.location.search);
  const initialHome = params.get('home') || CONFIG.defaultHomeId;
  const initialAway = params.get('away') || CONFIG.defaultAwayId;

  homeSelect.value = initialHome;
  awaySelect.value = initialAway;

  renderTeam(initialHome, 'home');
  renderTeam(initialAway, 'away');
}

// Fetch JSON Engine
async function initApp() {
  setupEventHandlers();
  updateScores();
  updateTimerDisplay();

  try {
    const res = await fetch(CONFIG.dataPath);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    teamsData = await res.json();
    populateUI();
  } catch (err) {
    console.error('Lineup JSON loading failed:', err);
  }
}

document.addEventListener('DOMContentLoaded', initApp);
