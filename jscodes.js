// 2026 World Cup Qualified Teams (48 teams)
const qualifiedTeams = [
  "Algeria", "Argentina", "Australia", "Austria", "Belgium", 
  "Bosnia and Herzegovina", "Brazil", "Cabo Verde", "Canada", "Colombia", 
  "Congo DR", "Croatia", "Curaçao", "Côte d'Ivoire", "Czechia", 
  "Ecuador", "Egypt", "England", "France", "Germany", 
  "Ghana", "Haiti", "IR Iran", "Iraq", "Japan", 
  "Jordan", "Korea Republic", "Mexico", "Morocco", "Netherlands", 
  "New Zealand", "Norway", "Panama", "Paraguay", "Portugal", 
  "Qatar", "Saudi Arabia", "Senegal", "Scotland", "South Africa", 
  "Spain", "Sweden", "Switzerland", "Tunisia", "Türkiye", 
  "USA", "Uruguay", "Uzbekistan"
];

let playerTeams = {};
let playerPredictions = {};
let globalMatches = [];
let currentUser = '';
let lastPlayerCount = -1;
let hasPendingChanges = false;

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBY2d0tdTpNaAmeOSYeLz8tNrsf1BVD1wc",
  authDomain: "scoreboard-e6052.firebaseapp.com",
  databaseURL: "https://scoreboard-e6052-default-rtdb.firebaseio.com",
  projectId: "scoreboard-e6052",
  storageBucket: "scoreboard-e6052.firebasestorage.app",
  messagingSenderId: "598052155617",
  appId: "1:598052155617:web:83220fa59e77037be9c7a0"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

function savePlayers() {
  db.ref('worldCupPlayers').set(playerTeams);
}

function savePredictions() {
  db.ref('worldCupPredictions').set(playerPredictions);
}

function addPlayer() {
  const input = document.getElementById('new-player-name');
  if (!input) return;
  const name = input.value.trim().toLocaleLowerCase('tr-TR');
  if (!name) return;
  if (!/^[a-zçğışöü0-9 \-]+$/.test(name)) {
    alert('Player name can only contain letters, numbers, spaces, or hyphens.');
    return;
  }
  if (name.length > 20) {
    alert('Player name must be 20 characters or less.');
    return;
  }
  if (playerTeams.hasOwnProperty(name)) {
    alert(`Player "${name}" already exists.`);
    return;
  }
  playerTeams[name] = "";
  savePlayers();
  input.value = "";
  initializeTeamSelectors();
  updateDropdownStates();
  updateScoreboard();
}

function removePlayer(name) {
  if (confirm(`Are you sure you want to remove ${name}?`)) {
    delete playerTeams[name];
    savePlayers();
    initializeTeamSelectors();
    updateDropdownStates();
    updateScoreboard();
  }
}

const formW = '<span class="form-badge w">W</span>';
const formD = '<span class="form-badge d">D</span>';
const formL = '<span class="form-badge l">L</span>';

// Map each team to their ISO country code to fetch flags dynamically from FlagCDN
const teamCodes = {
  "Algeria": "dz", "Argentina": "ar", "Australia": "au", "Austria": "at", "Belgium": "be",
  "Bosnia and Herzegovina": "ba", "Brazil": "br", "Cabo Verde": "cv", "Canada": "ca", "Colombia": "co",
  "Congo DR": "cd", "Croatia": "hr", "Curaçao": "cw", "Côte d'Ivoire": "ci", "Czechia": "cz",
  "Ecuador": "ec", "Egypt": "eg", "England": "gb-eng", "France": "fr", "Germany": "de",
  "Ghana": "gh", "Haiti": "ht", "IR Iran": "ir", "Iraq": "iq", "Japan": "jp",
  "Jordan": "jo", "Korea Republic": "kr", "Mexico": "mx", "Morocco": "ma", "Netherlands": "nl",
  "New Zealand": "nz", "Norway": "no", "Panama": "pa", "Paraguay": "py", "Portugal": "pt",
  "Qatar": "qa", "Saudi Arabia": "sa", "Senegal": "sn", "Scotland": "gb-sct", "South Africa": "za",
  "Spain": "es", "Sweden": "se", "Switzerland": "ch", "Tunisia": "tn", "Türkiye": "tr",
  "USA": "us", "Uruguay": "uy", "Uzbekistan": "uz"
};

function getFlagUrl(teamName) {
  const code = teamCodes[teamName];
  // Use a transparent 1x1 pixel for TBD knockout teams so it looks like a clean white circle
  return code ? `https://flagcdn.com/w80/${code}.png` : 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
}

// Define API endpoint for World Cup matches
// You'll need to sign up for a free API key at a service like football-data.org 
const API_URL = "https://api.football-data.org/v4/competitions/WC/matches";
const API_KEY = "a6edf5bf071d4f2e8e294d7b61063d40"; 

async function updateScoreboard() {
  try {
    const response = await fetch(API_URL, {
      headers: { 'X-Auth-Token': API_KEY }
    });
    
    if (response.ok) {
      const data = await response.json();
      const allMatches = data.matches || [];
      
      // Strict filter: Only keep World Cup games or games where BOTH teams are in our qualified list.
      // This hides random league games if you are testing with the general "/matches" API endpoint.
      globalMatches = allMatches.filter(m => 
        m.competition?.code === 'WC' || 
        (qualifiedTeams.includes(m.homeTeam?.name) && qualifiedTeams.includes(m.awayTeam?.name))
      );
    } else {
      console.warn("API Key missing or invalid. Add a valid API key to fetch live scores.");
    }
  } catch (error) {
    console.error("Error fetching live scores:", error);
  }

  // If the API hasn't populated the 2026 World Cup fixture yet, generate it!
  if (globalMatches.length === 0) {
      globalMatches = generateWorldCupFixture();
  }

  // Render the horizontal live scores box
  renderLiveScores(globalMatches);

  // Re-render sidebar when players are added/removed; otherwise preserve typing focus
  const sidebar = document.getElementById('sidebar-predictions');
  const currentPlayerCount = Object.keys(playerTeams).length;
  if (sidebar && (sidebar.innerHTML.trim() === "" || currentPlayerCount !== lastPlayerCount)) {
      lastPlayerCount = currentPlayerCount;
      renderSidebarPredictions();
  }

    const tbody = document.getElementById("scoreboard-body");
    const predTbody = document.getElementById("pred-leaderboard-body");
    const grandTbody = document.getElementById("grand-leaderboard-body");
    if (tbody) tbody.innerHTML = "";
    if (predTbody) predTbody.innerHTML = "";
    if (grandTbody) grandTbody.innerHTML = "";
    
    const players = Object.keys(playerTeams);
    players.forEach(player => {
      let team = playerTeams[player];
      let wins = 0;
      let draws = 0;
      let losses = 0;
      let form = [];

      // Find all finished matches for the player's chosen team
      const teamMatches = globalMatches.filter(m => 
        (m.homeTeam.name === team || m.awayTeam.name === team) && 
        m.status === "FINISHED"
      );

      // Sort matches chronologically to calculate form correctly
      teamMatches.sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));

      teamMatches.forEach(match => {
        const isHome = match.homeTeam.name === team;
        const homeScore = match.score?.fullTime?.home ?? 0;
        const awayScore = match.score?.fullTime?.away ?? 0;

        if (homeScore === awayScore) {
          draws++;
          form.push(formD);
        } else if ((isHome && homeScore > awayScore) || (!isHome && awayScore > homeScore)) {
          wins++;
          form.push(formW);
        } else {
          losses++;
          form.push(formL);
        }
      });

      // Calculate pick points (picked team wins=3, draws=1, loses=0)
      let pickPoints = 0;
      // Calculate score prediction points (exact=10, outcome=5, partial score=3 each)
      let predPoints = 0;
      let exactCount = 0, outcomeCount = 0, partialCount = 0, totalPreds = 0;

      if (playerPredictions[player]) {
          Object.keys(playerPredictions[player]).forEach(matchId => {
              const pred = playerPredictions[player][matchId];
              const actualMatch = globalMatches.find(m => String(m.id) === String(matchId));
              if (!actualMatch || actualMatch.status !== "FINISHED") return;
              const actualHome = actualMatch.score?.fullTime?.home;
              const actualAway = actualMatch.score?.fullTime?.away;
              if (actualHome === undefined || actualHome === null) return;

              // Pick points
              if (pred.pick) {
                  const pickedHome = pred.pick === actualMatch.homeTeam.name;
                  const pickedAway = pred.pick === actualMatch.awayTeam.name;
                  if (pickedHome || pickedAway) {
                      if (actualHome === actualAway) pickPoints += 1;
                      else if ((pickedHome && actualHome > actualAway) || (pickedAway && actualAway > actualHome)) pickPoints += 3;
                  }
              }

              // Score prediction points
              const hasPredicted = pred.home !== '' || pred.away !== '';
              if (hasPredicted) {
                  totalPreds++;
                  const predHome = parseInt(pred.home);
                  const predAway = parseInt(pred.away);
                  const actualOutcome = actualHome > actualAway ? 'HOME' : (actualHome < actualAway ? 'AWAY' : 'DRAW');
                  const predictedOutcome = (!isNaN(predHome) && !isNaN(predAway)) ? (predHome > predAway ? 'HOME' : (predHome < predAway ? 'AWAY' : 'DRAW')) : null;
                  const guessedHome = !isNaN(predHome) && predHome === actualHome;
                  const guessedAway = !isNaN(predAway) && predAway === actualAway;
                  let pts = 0;
                  if (guessedHome && guessedAway) {
                      pts = 10; exactCount++;
                  } else {
                      if (predictedOutcome === actualOutcome) { pts += 5; outcomeCount++; }
                      if (guessedHome) { pts += 3; }
                      if (guessedAway) { pts += 3; }
                      if (guessedHome || guessedAway) partialCount++;
                  }
                  predPoints += pts;
              }
          });
      }

      const teamPoints = (wins * 3) + (draws * 1);
      const totalPoints = teamPoints + pickPoints + predPoints;

      let predWinRate = totalPreds > 0 ? Math.round(((exactCount + outcomeCount) / totalPreds) * 100) : 0;
      let exactPerc = totalPreds > 0 ? (exactCount / totalPreds) * 100 : 0;
      let outcomePerc = totalPreds > 0 ? (outcomeCount / totalPreds) * 100 : 0;
      let partialPerc = totalPreds > 0 ? (partialCount / totalPreds) * 100 : 0;
      let missedPerc = totalPreds > 0 ? 100 - (exactPerc + outcomePerc + partialPerc) : 100;

      // Ensure form array shows the last 5 results (or placeholders)
      let displayForm = form.slice(-5);
      while (displayForm.length < 5) displayForm.unshift('<span class="form-badge empty">-</span>');

      // Team standings row
      if (tbody) {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>
                <div class="scoreboard-team">
                    <span class="scoreboard-team-logo"><img src="${getFlagUrl(team)}" alt="${player}"></span>
                    <div class="team-info">
                        <span class="team-name">${team || 'No team selected'}</span>
                        <span class="player-name">${player.charAt(0).toUpperCase() + player.slice(1)}</span>
                    </div>
                </div>
            </td>
            <td class="stat-col">${wins}</td>
            <td class="stat-col">${draws}</td>
            <td class="stat-col">${losses}</td>
            <td class="points-col" style="color:var(--text-main); font-size:1.1rem;">${teamPoints}</td>
            <td><div class="formData">${displayForm.join('')}</div></td>
        `;
        tbody.appendChild(tr);
      }

      // Score prediction stats row
      if (predTbody) {
        const ptr = document.createElement("tr");
        ptr.innerHTML = `
            <td style="text-align:left; padding-left:10px;">
                <span class="player-name" style="font-size:0.9rem; color:var(--text-main); font-weight:600;">${player.charAt(0).toUpperCase() + player.slice(1)}</span>
            </td>
            <td class="points-col" style="color:#a78bfa;">${predPoints}</td>
            <td class="perc-col" style="text-align:left;">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px; white-space:nowrap;">
                    <span style="font-weight:800; font-size:0.8rem; color:var(--accent);">${predWinRate}%</span>
                    <span style="color:var(--win); font-size:0.7rem;">✓ ${exactCount}</span>
                    <span style="color:#fbbf24; font-size:0.7rem;">○ ${outcomeCount}</span>
                    <span style="color:var(--text-muted); font-size:0.7rem;">△ ${partialCount}</span>
                </div>
                <div class="perc-container">
                    <div class="perc-bar" style="background:var(--win); width:${exactPerc}%" title="Exact"></div>
                    <div class="perc-bar" style="background:#fbbf24; width:${outcomePerc}%" title="Outcome"></div>
                    <div class="perc-bar" style="background:var(--text-muted); width:${partialPerc}%" title="Partial"></div>
                    <div class="perc-bar" style="background:rgba(255,255,255,0.05); width:${missedPerc}%" title="Missed"></div>
                </div>
            </td>
        `;
        predTbody.appendChild(ptr);
      }

      // Grand total row
      if (grandTbody) {
        const gtr = document.createElement("tr");
        gtr.innerHTML = `
            <td style="text-align:left; padding-left:10px;">
                <span class="player-name" style="font-size:0.9rem; color:var(--text-main); font-weight:600;">${player.charAt(0).toUpperCase() + player.slice(1)}</span>
            </td>
            <td class="points-col" style="color:var(--text-main);">${teamPoints}</td>
            <td class="points-col" style="color:#34d399;">${pickPoints}</td>
            <td class="points-col" style="color:#a78bfa;">${predPoints}</td>
            <td class="points-col"><div class="points-badge">${totalPoints}</div></td>
        `;
        grandTbody.appendChild(gtr);
      }

    });

    sortTable();
    sortGrandTable();
}

function renderLiveScores(matches) {
  const container = document.getElementById("live-matches-list");
  if (!container) return;

  // Show live matches + all of today's matches (finished or upcoming)
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowMidnight = new Date(todayMidnight.getTime() + 86400000);

  let displayMatches = matches.filter(m => {
    const d = new Date(m.utcDate);
    if (m.status === 'IN_PLAY' || m.status === 'PAUSED') return true;
    return (m.status === 'FINISHED' || m.status === 'SCHEDULED' || m.status === 'TIMED')
      && d >= todayMidnight && d < tomorrowMidnight;
  });

  // Live matches first, then sorted by kick-off time
  displayMatches.sort((a, b) => {
    const aLive = (a.status === 'IN_PLAY' || a.status === 'PAUSED') ? 0 : 1;
    const bLive = (b.status === 'IN_PLAY' || b.status === 'PAUSED') ? 0 : 1;
    if (aLive !== bLive) return aLive - bLive;
    return new Date(a.utcDate) - new Date(b.utcDate);
  });

  if (displayMatches.length === 0) {
    container.innerHTML = '<div style="color:var(--text-muted); font-size: 0.9rem; font-style: italic; padding: 10px;">No matches scheduled for today.</div>';
    return;
  }

  container.innerHTML = displayMatches.map(m => {
    const homeTeam = m.homeTeam?.name || 'TBD';
    const awayTeam = m.awayTeam?.name || 'TBD';
    const homeScore = m.score?.fullTime?.home ?? (m.score?.halfTime?.home ?? '-');
    const awayScore = m.score?.fullTime?.away ?? (m.score?.halfTime?.away ?? '-');

    const localTimeStr = new Date(m.utcDate).toLocaleTimeString(undefined, {hour:'2-digit', minute:'2-digit'});
    const trTimeStr = new Date(m.utcDate).toLocaleTimeString('tr-TR', {timeZone: 'Europe/Istanbul', hour:'2-digit', minute:'2-digit'});
    const isLive = m.status === 'IN_PLAY' || m.status === 'PAUSED';
    const statusClass = isLive ? 'live' : '';
    const statusText = isLive ? 'LIVE' : (m.status === 'FINISHED' ? 'FT' : `${localTimeStr} (TRT: ${trTimeStr})`);
    const phaseText = m.group || m.stage || 'World Cup';

    return `
      <div class="match-card${isLive ? ' is-live' : ''}">
        <div class="match-team-row">
          <div class="match-team-info">
            <img src="${getFlagUrl(homeTeam)}" class="match-team-logo" alt="${homeTeam}">
            <span>${homeTeam}</span>
          </div>
          <span class="match-score">${homeScore}</span>
        </div>
        <div class="match-team-row">
          <div class="match-team-info">
            <img src="${getFlagUrl(awayTeam)}" class="match-team-logo" alt="${awayTeam}">
            <span>${awayTeam}</span>
          </div>
          <span class="match-score">${awayScore}</span>
        </div>
        <div class="match-status ${statusClass}">${statusText} <span class="sep">•</span> ${phaseText}</div>
      </div>
    `;
  }).join('');
}

function sortByCol(tableId, colIndex) {
  const table = document.getElementById(tableId);
  if (!table) return;
  let switching = true, i;
  while (switching) {
    switching = false;
    const rows = table.rows;
    for (i = 1; i < rows.length - 1; i++) {
      const x = rows[i].getElementsByTagName("TD")[colIndex];
      const y = rows[i + 1].getElementsByTagName("TD")[colIndex];
      if (Number(x.textContent) < Number(y.textContent)) {
        rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
        switching = true;
        break;
      }
    }
  }
  // Apply gold/silver/bronze rank classes to top 3
  const rows = table.rows;
  for (i = 1; i < rows.length; i++) {
    rows[i].classList.remove('rank-1', 'rank-2', 'rank-3');
    if (i === 1) rows[i].classList.add('rank-1');
    else if (i === 2) rows[i].classList.add('rank-2');
    else if (i === 3) rows[i].classList.add('rank-3');
  }
}

function sortTable() { sortByCol('myTable', 4); }
window.sortGrandTable = function() { sortByCol('grandTable', 4); }

function initializeTeamSelectors() {
  const adminPanel = document.getElementById('admin-panel');
  const container = document.getElementById('team-selection');
  if (!adminPanel || !container) return;


  adminPanel.style.display = 'flex';
  container.innerHTML = ""; // Clear existing selectors

  const players = Object.keys(playerTeams);
  players.forEach(player => {
    const group = document.createElement('div');
    group.className = 'selector-group';
    
    const label = document.createElement('label');
    label.textContent = player.charAt(0).toUpperCase() + player.slice(1);
    
    const select = document.createElement('select');
    select.id = `select-${player}`;

    const defaultOpt = document.createElement('option');
    defaultOpt.value = "";
    defaultOpt.textContent = "-- Select Team --";
    select.appendChild(defaultOpt);

    qualifiedTeams.forEach(team => {
      const opt = document.createElement('option');
      opt.value = team;
      opt.textContent = team;
      if (playerTeams[player] === team) {
        opt.selected = true;
      }
      select.appendChild(opt);
    });

    select.addEventListener('change', (e) => {
      playerTeams[player] = e.target.value;
      savePlayers();
      updateDropdownStates();
      updateScoreboard();
    });

    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove';
    removeBtn.className = 'admin-btn remove-btn';
    removeBtn.onclick = () => removePlayer(player);

    group.appendChild(label);
    group.appendChild(select);
    group.appendChild(removeBtn);
    container.appendChild(group);
  });
}

function renderSidebarPredictions() {
    const container = document.getElementById('sidebar-predictions');
    if (!container) return;
    
    const userOptions = Object.keys(playerTeams).map(p => `<option value="${p}" ${currentUser === p ? 'selected' : ''}>${p.charAt(0).toUpperCase() + p.slice(1)}</option>`).join('');
    
    container.innerHTML = `
        <h2 style="margin-bottom: 5px;">Predictions</h2>
        <div style="margin-bottom: 20px; padding: 12px; background: rgba(0,0,0,0.3); border-radius: 8px; border: 1px solid var(--border-color);">
            <label style="display:block; margin-bottom: 8px; font-size: 0.85rem; color: var(--text-muted);">Select your name to make picks:</label>
            <select class="admin-input" style="width: 100%; border-color: var(--accent);" onchange="setCurrentUser(this.value)">
                <option value="">-- Choose your name --</option>
                ${userOptions}
            </select>
        </div>
    `;

    let currentDayStr = '';

    // Sort matches strictly by chronological order
    const sortedMatches = [...globalMatches].sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));

    sortedMatches.forEach(match => {
        const homeTeam = match.homeTeam?.name || 'TBD';
        const awayTeam = match.awayTeam?.name || 'TBD';
        
        const matchDate = new Date(match.utcDate);
        const localTimeStr = matchDate.toLocaleTimeString(undefined, {hour:'2-digit', minute:'2-digit'});
        const trTimeStr = matchDate.toLocaleTimeString('tr-TR', {timeZone: 'Europe/Istanbul', hour:'2-digit', minute:'2-digit'});
        const dayStr = matchDate.toLocaleDateString(undefined, {weekday: 'long', month:'short', day:'numeric', year:'numeric'});
        
        const phaseText = match.group || match.stage || 'World Cup';
        
        // Lock the inputs the exact millisecond the scheduled kick-off time is reached
        const hasStarted = new Date() >= matchDate;
        const isLocked = match.status === 'FINISHED' || match.status === 'IN_PLAY' || match.status === 'PAUSED' || hasStarted;

        const actualHome = match.score?.fullTime?.home;
        const actualAway = match.score?.fullTime?.away;
        const hasScore = actualHome !== undefined && actualHome !== null;
        const vsText = match.status === 'FINISHED' && hasScore ? `<span style="color:var(--win); font-weight:900; margin:0 5px;">${actualHome} - ${actualAway}</span>` : '<span style="margin:0 5px;">vs</span>';

        if (dayStr !== currentDayStr) {
            currentDayStr = dayStr;
            const dayHeader = document.createElement('h3');
            dayHeader.className = 'phase-header';
            dayHeader.textContent = currentDayStr;
            container.appendChild(dayHeader);
        }

        const card = document.createElement('div');
        card.className = 'sidebar-match-card';
        
        let usersHtml = Object.keys(playerTeams).map(player => {
            const pred = playerPredictions[player]?.[match.id] || { pick: '', winner: '', home: '', away: '' };
            const isCurrentUser = player === currentUser;
            const disableInput = isLocked || !isCurrentUser;

            // Pick points earned
            let pickPtsHtml = '';
            if (match.status === 'FINISHED' && hasScore && pred.pick) {
                const pickedHome = pred.pick === homeTeam;
                const pickedAway = pred.pick === awayTeam;
                let pts = 0;
                if (actualHome === actualAway) pts = 1;
                else if ((pickedHome && actualHome > actualAway) || (pickedAway && actualAway > actualHome)) pts = 3;
                pickPtsHtml = pts > 0
                    ? `<span style="color:#34d399; font-weight:bold; font-size:0.75rem; margin-left:4px;">+${pts}</span>`
                    : `<span style="color:var(--loss); font-size:0.75rem; margin-left:4px;">+0</span>`;
            }

            // Score prediction points earned
            let predPtsHtml = '';
            if (match.status === 'FINISHED' && hasScore && (pred.home || pred.away)) {
                const pH = parseInt(pred.home), pA = parseInt(pred.away);
                const aOut = actualHome > actualAway ? 'HOME' : (actualHome < actualAway ? 'AWAY' : 'DRAW');
                const pOut = (!isNaN(pH) && !isNaN(pA)) ? (pH > pA ? 'HOME' : (pH < pA ? 'AWAY' : 'DRAW')) : null;
                const gH = !isNaN(pH) && pH === actualHome;
                const gA = !isNaN(pA) && pA === actualAway;
                let pts = 0;
                if (gH && gA) pts = 10;
                else { if (pOut === aOut) pts += 5; if (gH) pts += 3; if (gA) pts += 3; }
                predPtsHtml = pts > 0
                    ? `<span style="color:#a78bfa; font-weight:bold; font-size:0.75rem; margin-left:4px;">+${pts}</span>`
                    : `<span style="color:var(--loss); font-size:0.75rem; margin-left:4px;">+0</span>`;
            }

            return `
                <div class="user-pred-row" style="${isCurrentUser ? 'background:rgba(55,139,240,0.15); padding:4px 6px; border-radius:4px; border:1px solid var(--accent);' : 'padding:2px 6px;'}">
                    <span class="user-pred-name">${player.charAt(0).toUpperCase() + player.slice(1)}</span>
                    <div style="display:flex; flex-direction:column; gap:4px; flex:1;">
                        <div style="display:flex; align-items:center; gap:4px;">
                            <span style="font-size:0.65rem; color:var(--text-muted); white-space:nowrap;">Pick${pickPtsHtml}</span>
                            <select class="pred-select" id="pred-${match.id}-${player}-pick" ${disableInput ? 'disabled' : ''} onchange="savePrediction('${player}', ${match.id})" style="flex:1;">
                                <option value="">-- Pick --</option>
                                <option value="${homeTeam}" ${pred.pick === homeTeam ? 'selected' : ''}>${homeTeam}</option>
                                <option value="${awayTeam}" ${pred.pick === awayTeam ? 'selected' : ''}>${awayTeam}</option>
                            </select>
                        </div>
                        <div style="display:flex; align-items:center; gap:4px;">
                            <span style="font-size:0.65rem; color:var(--text-muted); white-space:nowrap;">Score${predPtsHtml}</span>
                            <input type="number" min="0" max="20" class="pred-input-small" id="pred-${match.id}-${player}-home" value="${pred.home}" placeholder="H" ${disableInput ? 'disabled' : ''} oninput="savePrediction('${player}', ${match.id}); scoreInputAnim(this)">
                            <span style="color:var(--text-muted); font-size:0.8rem;">–</span>
                            <input type="number" min="0" max="20" class="pred-input-small" id="pred-${match.id}-${player}-away" value="${pred.away}" placeholder="A" ${disableInput ? 'disabled' : ''} oninput="savePrediction('${player}', ${match.id}); scoreInputAnim(this)">
                            ${isCurrentUser ? `<button class="save-pred-btn" onclick="saveUserPredictions('${player}')">Save</button>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        card.innerHTML = `
            <div class="sidebar-match-header">
                <img src="${getFlagUrl(homeTeam)}" style="width:16px; border-radius:50%; vertical-align:middle;"> ${homeTeam} ${vsText} ${awayTeam} <img src="${getFlagUrl(awayTeam)}" style="width:16px; border-radius:50%; vertical-align:middle;">
                <br><small style="color:var(--text-muted); font-size:0.8rem; font-weight:normal;">Local: ${localTimeStr} • TRT: ${trTimeStr} • ${phaseText} ${isLocked ? '• ' + (match.status === 'SCHEDULED' ? 'LOCKED' : match.status) : ''}</small>
            </div>
            <div>${usersHtml}</div>
        `;
        container.appendChild(card);
    });
}

window.setCurrentUser = function(name) {
    currentUser = name;
    hasPendingChanges = false;
    renderSidebarPredictions();
}

window.savePrediction = function(player, matchId) {
    const pickVal = document.getElementById(`pred-${matchId}-${player}-pick`)?.value || '';
    let homeVal = document.getElementById(`pred-${matchId}-${player}-home`)?.value || '';
    let awayVal = document.getElementById(`pred-${matchId}-${player}-away`)?.value || '';
    if (homeVal !== '') homeVal = String(Math.max(0, Math.min(20, parseInt(homeVal) || 0)));
    if (awayVal !== '') awayVal = String(Math.max(0, Math.min(20, parseInt(awayVal) || 0)));
    if (!playerPredictions[player]) playerPredictions[player] = {};
    playerPredictions[player][matchId] = { pick: pickVal, home: homeVal, away: awayVal };
    hasPendingChanges = true;
    document.querySelectorAll('.save-pred-btn').forEach(btn => {
        btn.textContent = 'Save'; btn.classList.add('unsaved'); btn.classList.remove('saved');
    });
}

window.saveUserPredictions = function(player) {
    db.ref('worldCupPredictions/' + player).set(playerPredictions[player] || {});
    hasPendingChanges = false;
    document.querySelectorAll('.save-pred-btn').forEach(btn => {
        btn.textContent = 'Saved!'; btn.classList.remove('unsaved'); btn.classList.add('saved');
    });
    setTimeout(() => {
        document.querySelectorAll('.save-pred-btn').forEach(btn => {
            btn.textContent = 'Save'; btn.classList.remove('saved');
        });
    }, 2000);
}

window.scoreInputAnim = function(input) {
    input.classList.remove('score-pop');
    void input.offsetWidth;
    input.classList.add('score-pop');
}

function updateDropdownStates() {
  const selectedTeams = Object.values(playerTeams).filter(team => team !== "");
  
  const players = Object.keys(playerTeams);
  players.forEach(player => {
    const select = document.getElementById(`select-${player}`);
    if (!select) return;
    
    Array.from(select.options).forEach(opt => {
      if (opt.value === "") return;
      // Disable option if another player has selected this team
      if (selectedTeams.includes(opt.value) && playerTeams[player] !== opt.value) {
        opt.disabled = true;
      } else {
        opt.disabled = false;
      }
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  // Load live match scores immediately
  updateScoreboard();

  // Firebase real-time listeners — sync all data across devices
  db.ref('worldCupPlayers').on('value', snapshot => {
    playerTeams = snapshot.val() || {};
    initializeTeamSelectors();
    updateDropdownStates();
    updateScoreboard();
  });

  db.ref('worldCupPredictions').on('value', snapshot => {
    const remote = snapshot.val() || {};
    if (currentUser && hasPendingChanges && playerPredictions[currentUser]) {
      const localPreds = playerPredictions[currentUser];
      playerPredictions = remote;
      playerPredictions[currentUser] = localPreds;
    } else {
      playerPredictions = remote;
    }
    updateScoreboard();
  });

  const playerInput = document.getElementById('new-player-name');
  if (playerInput) {
    playerInput.addEventListener('keydown', e => { if (e.key === 'Enter') addPlayer(); });
  }

  // Refresh live match scores every 5 minutes
  setInterval(updateScoreboard, 300000);
});

function generateWorldCupFixture() {
  const fixture = [];
  let matchId = 1000;
  let dayOffset = 0;
  let matchesToday = 0;
  
  // Official 2026 World Cup Groups
  const officialGroups = [
    ["Mexico", "South Africa", "Korea Republic", "Czechia"],
    ["Canada", "Switzerland", "Qatar", "Bosnia and Herzegovina"],
    ["Brazil", "Morocco", "Haiti", "Scotland"],
    ["USA", "Paraguay", "Australia", "Türkiye"],
    ["Germany", "Curaçao", "Côte d'Ivoire", "Ecuador"],
    ["Netherlands", "Japan", "Tunisia", "Sweden"],
    ["Belgium", "Egypt", "IR Iran", "New Zealand"],
    ["Spain", "Cabo Verde", "Saudi Arabia", "Uruguay"],
    ["France", "Senegal", "Norway", "Iraq"],
    ["Argentina", "Algeria", "Austria", "Jordan"],
    ["Portugal", "Uzbekistan", "Colombia", "Congo DR"],
    ["England", "Croatia", "Ghana", "Panama"]
  ];

  // Group Stage (72 Matches - 12 Groups of 4)
  const rounds = [
    [[0, 1], [2, 3]], // Matchday 1
    [[0, 2], [3, 1]], // Matchday 2
    [[3, 0], [1, 2]]  // Matchday 3
  ];

  for (let r = 0; r < 3; r++) {
    for (let i = 0; i < 12; i++) {
      const groupName = `Group ${String.fromCharCode(65 + i)}`;

      const t1 = officialGroups[i][rounds[r][0][0]];
      const t2 = officialGroups[i][rounds[r][0][1]];
      const t3 = officialGroups[i][rounds[r][1][0]];
      const t4 = officialGroups[i][rounds[r][1][1]];
      
      const matchups = [
        [t1, t2], [t3, t4]
      ];
      
      matchups.forEach(matchup => {
        let matchDate = new Date('2026-06-11T00:00:00Z');
        matchDate.setUTCDate(matchDate.getUTCDate() + dayOffset);
        
        // Use official 2026 World Cup kickoff times (in UTC)
        if (dayOffset === 0) { // June 11 (Opening day)
            const slots = [19, 26]; // 3:00 PM EDT, 10:00 PM EDT
            matchDate.setUTCHours(slots[matchesToday]);
        } else if (dayOffset === 1) { // June 12
            const slots = [19, 25]; // 3:00 PM EDT, 9:00 PM EDT
            matchDate.setUTCHours(slots[matchesToday]);
        } else if (dayOffset === 2) { // June 13
            const slots = [19, 22, 25, 28]; // 3:00 PM, 6:00 PM, 9:00 PM, 12:00 AM EDT
            matchDate.setUTCHours(slots[matchesToday]);
        } else if (dayOffset === 3) { // June 14
            const slots = [17, 20, 23, 26]; // 1:00 PM, 4:00 PM, 7:00 PM, 10:00 PM EDT
            matchDate.setUTCHours(slots[matchesToday]);
        } else { // Standard days
            const slots = [16, 19, 22, 25]; // 12:00 PM, 3:00 PM, 6:00 PM, 9:00 PM EDT
            matchDate.setUTCHours(slots[matchesToday]);
        }

        fixture.push({
        id: matchId++,
        competition: { code: 'WC' },
        group: groupName,
          utcDate: matchDate.toISOString(),
        status: "SCHEDULED",
        homeTeam: { name: matchup[0] },
        awayTeam: { name: matchup[1] },
        score: { fullTime: { home: null, away: null } }
      });
      
      matchesToday++;
        const maxMatches = (dayOffset === 0 || dayOffset === 1) ? 2 : 4;
        if (matchesToday >= maxMatches) {
           matchesToday = 0;
           dayOffset++;
      }
    });
  }
  }
  
  // Knockout Stage (32 Matches)
  const knockouts = [
      { phase: 'Round of 32', count: 16 },
      { phase: 'Round of 16', count: 8 },
      { phase: 'Quarter-finals', count: 4 },
      { phase: 'Semi-finals', count: 2 },
      { phase: 'Third place play-off', count: 1 },
      { phase: 'Final', count: 1 }
  ];
  
  dayOffset += 2; // Rest days before knockouts
  matchesToday = 0;

  knockouts.forEach(stage => {
      for (let k = 0; k < stage.count; k++) {
          let matchDate = new Date('2026-06-11T00:00:00Z');
          matchDate.setUTCDate(matchDate.getUTCDate() + dayOffset);
          
          const maxMatches = stage.count > 2 ? 4 : stage.count;
          
          // For Semis, 3rd Place, and Final, use the prime time slot (3:00 PM EDT / 19:00 UTC)
          if (stage.count <= 2) {
              matchDate.setUTCHours(19); 
          } else {
              const slots = [16, 19, 22, 25];
              matchDate.setUTCHours(slots[matchesToday]);
          }

          fixture.push({
            id: matchId++,
            competition: { code: 'WC' },
            stage: stage.phase,
            utcDate: matchDate.toISOString(),
            status: "SCHEDULED",
            homeTeam: { name: `TBD (${stage.phase})` },
            awayTeam: { name: `TBD (${stage.phase})` },
            score: { fullTime: { home: null, away: null } }
          });
          
          matchesToday++;
          if (matchesToday >= maxMatches) { 
             matchesToday = 0;
             dayOffset++;
          }
      }
      dayOffset++; // Add a rest day between phases
  });

  return fixture;
}

window.switchTab = function(tabId, btnElement) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    
    document.getElementById(tabId + '-section').classList.add('active');
    btnElement.classList.add('active');
}
