/**
 * Football Watch-Along Dual Lineup Engine
 * Production Ready with Auto-Fallback & Pitch Layout
 */

const CONFIG = {
  // Relative path to JSON data from index.html
  dataPath: 'assets/data/custom-lineups.json',
  defaultHomeId: '1',  // Arsenal
  defaultAwayId: '6'   // Chelsea
};

let teamsData = {};

// Kit Jersey Palette Mapping
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

// Scalable Vector Jersey Generator
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

// Tactical grouping for formation tiers
function groupLineupByTiers(lineup) {
  const tiers = { FWD: [], MID: [], DEF: [], GK: [] };

  lineup.forEach(player => {
    if (tiers[player.pos]) {
      tiers[player.pos].push(player);
    } else {
      tiers.MID.push(player);
    }
  });

  return tiers;
}

// Render Team Board
function renderTeam(teamId, type = 'home') {
  const team = teamsData[teamId];
  if (!team) return;

  const prefix = type === 'home' ? 'home' : 'away';

  document.getElementById(`${prefix}Name`).textContent = team.teamName;
  document.getElementById(`${prefix}Badge`).textContent = team.shortName;
  document.getElementById(`${prefix}Formation`).textContent = team.formation;

  const pitchEl = document.getElementById(`${prefix}Pitch`);
  pitchEl.innerHTML = '';

  const tiers = groupLineupByTiers(team.lineup);
  const rowsOrder = ['FWD', 'MID', 'DEF', 'GK'];

  rowsOrder.forEach(tierKey => {
    const rowEl = document.createElement('div');
    rowEl.className = `pitch-row pitch-row-${tierKey.toLowerCase()}`;

    tiers[tierKey].forEach(player => {
      const isGK = player.pos === 'GK';
      const slot = document.createElement('div');
      slot.className = 'player-slot';
      slot.innerHTML = `
        <div class="jersey-icon-wrap">
          ${getJerseySVG(team.teamCode, isGK)}
          <span class="player-role-badge">${player.role}</span>
        </div>
        <div class="player-meta">
          <span class="player-name">${player.name}</span>
        </div>
      `;
      rowEl.appendChild(slot);
    });

    pitchEl.appendChild(rowEl);
  });
}

// Initialize Selectors and URL Query Logic
function setupUI() {
  const homeSelect = document.getElementById('homeSelect');
  const awaySelect = document.getElementById('awaySelect');

  homeSelect.innerHTML = '';
  awaySelect.innerHTML = '';

  Object.values(teamsData).forEach(team => {
    const optHome = new Option(`${team.teamName} (${team.formation})`, team.teamId);
    const optAway = new Option(`${team.teamName} (${team.formation})`, team.teamId);
    homeSelect.add(optHome);
    awaySelect.add(optAway);
  });

  // URL parameters support: ?home=1&away=6&controls=false
  const params = new URLSearchParams(window.location.search);
  const homeParam = params.get('home') || CONFIG.defaultHomeId;
  const awayParam = params.get('away') || CONFIG.defaultAwayId;
  const hideControls = params.get('controls') === 'false';

  homeSelect.value = homeParam;
  awaySelect.value = awayParam;

  if (hideControls) {
    document.getElementById('controllerBar').classList.add('hidden');
  }

  homeSelect.addEventListener('change', (e) => renderTeam(e.target.value, 'home'));
  awaySelect.addEventListener('change', (e) => renderTeam(e.target.value, 'away'));

  document.getElementById('toggleControlsBtn').addEventListener('click', () => {
    document.getElementById('controllerBar').classList.toggle('hidden');
  });

  renderTeam(homeSelect.value, 'home');
  renderTeam(awaySelect.value, 'away');
}

// Data Fetching
async function initApp() {
  try {
    const res = await fetch(CONFIG.dataPath);
    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    teamsData = await res.json();
    setupUI();
  } catch (err) {
    console.error('Error loading lineup JSON:', err);
  }
}

document.addEventListener('DOMContentLoaded', initApp);
