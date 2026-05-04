// ── CONSTANTS ──
const TYPE_COLORS = {"Normal":"#A8A878","Fire":"#F08030","Water":"#6890F0","Grass":"#78C850","Electric":"#F8D030","Ice":"#98D8D8","Fighting":"#C03028","Poison":"#A040A0","Ground":"#E0C068","Flying":"#A890F0","Psychic":"#F85888","Bug":"#A8B020","Rock":"#B8A038","Ghost":"#705898","Dragon":"#7038F8","Steel":"#B8B8D0","Dark":"#705848","Fairy":"#EE99AC"};
const SPEC_EMOJI  = {"Grow":"🌱","Burn":"🔥","Water":"💧","Fly":"🪶","Search":"🔍","Chop":"🪓","Build":"🔨","Crush":"💥","Bulldoze":"🪨","Trade":"🤝","Teleport":"✨","Generate":"⚡","Gather":"📦","Litter":"🌿","Hype":"🎉","Recycle":"♻️","Yawn":"😴","Collect":"💰","Explode":"💣","Paint":"🎨","DJ":"🎧","Illuminate":"💡","Transform":"🔄","Appraise":"🔎","Storage":"🗃️","Gather Honey":"🍯","Dream Island":"🏝️","Eat":"🍽️","Engineer":"⚙️","Party":"🎊","Rarify":"⭐","???":"❓"};

const AREAS = [
  {key:'Withered Wastelands',name:'Withered Wastelands',icon:'🏜️',qaId:'qa-ww'},
  {key:'Bleak Beach',        name:'Bleak Beach',        icon:'🏖️',qaId:'qa-bb'},
  {key:'Rocky Ridges',       name:'Rocky Ridges',       icon:'⛰️',qaId:'qa-rr'},
  {key:'Sparkling Skylands', name:'Sparkling Skylands', icon:'☁️',qaId:'qa-ss'},
  {key:'Palette Town',       name:'Palette Town',       icon:'🏘️',qaId:'qa-pt'},
];

const POKOPIA_UNIQUE = new Set(['Peakychu','Mosslax','Professor Tangrowth','Smearguru (Smeargle)','Chef Dente (Greedent)','Tinkmaster (Tinkaton)']);
const UNIQUE_FORMS = [
  {name:'Peakychu',               urlStr:'-peakychu'},
  {name:'Mosslax',                urlStr:'-mosslax'},
  {name:'Professor Tangrowth',    urlStr:'-professortangrowth'},
  {name:'Smearguru (Smeargle)',   urlStr:'-smearguru'},
  {name:'Toxtricity Amped Form',  urlStr:'-toxtricityampedform'},
  {name:'Toxtricity Low Key Form',urlStr:'-toxtricitylowkeyform'},
  {name:'Tinkmaster (Tinkaton)',  urlStr:'-tinkmeister'},
  {name:'Shellos East Sea',       urlStr:'-shelloseastsea'},
  {name:'Gastrodon East Sea',     urlStr:'-gastrodoneastsea'},
  {name:'Paldean Wooper',         urlStr:'-p'},
  {name:'Tatsugiri Curly Form',   urlStr:'-tatsugiricurlyform'},
  {name:'Tatsugiri Droopy Form',  urlStr:'-tatsugiridroopyform'},
  {name:'Tatsugiri Stretchy Form',urlStr:'-tatsugiristretchyform'},
  {name:'Chef Dente (Greedent)',  urlStr:'-cook'},
  {name:'Stereo Rotom',  urlStr:'-stereorotom'},
];

// ── STATE ──
let activeSort = 'id';
let activeHabSort = 'id';
let activeSpecFilters = [];
let specCollapsed = true;
// pokemonLocation: uid → areaKey  (no entry = in wild)
const pokemonLocation = {};
// Quick Add
let qaActive = false;
let qaTarget = null;

// ── LOCALSTORAGE PERSISTENCE ──
const LS_KEY = 'pokopia-locations';

function saveLocations() {
  // Only save pokemon that are actually in an area (not wild)
  const toSave = {};
  for (const [uid, area] of Object.entries(pokemonLocation)) {
    if (area) toSave[uid] = area;
  }
  localStorage.setItem(LS_KEY, JSON.stringify(toSave));
}

function loadLocations() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    // Only restore if uid still exists in ALL_POKEMON
    const validUids = new Set(ALL_POKEMON.map(p => p.uid));
    for (const [uid, area] of Object.entries(saved)) {
      if (validUids.has(uid) && AREAS.some(a => a.key === area)) {
        pokemonLocation[uid] = area;
      }
    }
  } catch(e) { console.warn('Could not load locations:', e); }
}

// ── SPRITE CONFIG ──
const SPRITE_SOURCE = 'serebii';

function spriteUrl(p) {
  const idStr = (p && p.natId) ? p.natId : (p ? String(p) : null);
  const idNum = (p && p.natId) ? p.natId : (p ? p : null);
  const uniqueEntry = UNIQUE_FORMS.find(pkmn => pkmn.name === p.name);
  const uStr = uniqueEntry ? uniqueEntry.urlStr : '';
  if (!idStr && !idNum) return 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/0.png';
  if (SPRITE_SOURCE === 'serebii') {
    const pad = idNum < 10 ? '00' : idNum < 100 ? '0' : '';
    return `https://www.serebii.net/pokemonpokopia/pokemon/small/${pad}${idStr}${uStr}.png`;
  } else if (SPRITE_SOURCE === 'artwork') {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${idNum}.png`;
  }
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${idNum}.png`;
}

const HABITAT_SPRITE_SOURCE = 'serebii';
function habitatSpriteUrl(habId) {
  if (!habId || HABITAT_SPRITE_SOURCE === 'none') return null;
  return `https://www.serebii.net/pokemonpokopia/habitatdex/${habId}.png`;
}

// ── HELPERS ──
function specImgUrl(s) {
  return `https://www.serebii.net/pokemonpokopia/pokedex/specialty/${s.toLowerCase().replace(/\s+/g,'-')}.png`;
}
function specTagHTML(s) {
  return `<span class="spec-tag" title="${s}"><img src="${specImgUrl(s)}" alt="${s}" style="width:14px;height:14px;object-fit:contain;vertical-align:middle" onerror="this.replaceWith(document.createTextNode('${SPEC_EMOJI[s]||'?'}'))"> ${s}</span>`;
}
function rarityHTML(r) {
  const count = r==='Very Rare'?3:r==='Rare'?2:r?1:0;
  let h='<span class="rarity-stars">';
  for(let i=1;i<=3;i++) h+=`<span class="${i<=count?'star-lit':'star-dim'}">★</span>`;
  return h+'</span>';
}
function timeIcons(t) {
  if(!t) return '';
  const m={'Morning':'🌅','Day':'☀️','Evening':'🌆','Night':'🌙'};
  return t.split(',').map(x=>m[x.trim()]||'').join('');
}
function weatherIcons(w) {
  if(!w) return '';
  const m={'Sun':'☀️','Cloud':'☁️','Rain':'🌧️'};
  return w.split(',').map(x=>m[x.trim()]||'').join('');
}
function areaByKey(key) { return AREAS.find(a=>a.key===key); }

// ── TOAST ──
let toastTimer;
function showToast(msg, dur=2600) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>el.classList.remove('show'), dur);
}

// ── CONFIRM DIALOG ──
function showConfirm(msg, onOk) {
  document.getElementById('confirm-msg').textContent = msg;
  document.getElementById('confirm-ok-btn').onclick = () => { closeConfirm(); onOk(); };
  document.getElementById('confirm-overlay').classList.add('open');
}
function closeConfirm() {
  document.getElementById('confirm-overlay').classList.remove('open');
}

// ── TABS ──
function switchTab(tab) {
  ['pokemon','habitats','areas'].forEach(t => {
    document.getElementById('tab-'+t).style.display = t===tab ? '' : 'none';
    document.querySelector(`[data-tab="${t}"]`)?.classList.toggle('active', t===tab);
  });
  if(tab!=='pokemon') qaActive?toggleQuickAdd():null; // auto-disable quick add when leaving pokemon tab
  if(tab==='habitats') renderHabitats();
  if(tab==='areas') renderAreas();
  window.scrollTo(0, 0);
}

// ── SORT / FILTERS ──
function setSort(s) {
  activeSort = s;
  document.getElementById('sort-id').classList.toggle('active', s==='id');
  document.getElementById('sort-name').classList.toggle('active', s==='name');
  renderPokemon();
}
function setHabSort(s) {
  activeHabSort = s;
  document.getElementById('hab-sort-id').classList.toggle('active', s==='id');
  document.getElementById('hab-sort-name').classList.toggle('active', s==='name');
  renderHabitats();
}
function toggleFilter(arr, val, el) {
  const i = arr.indexOf(val);
  if(i===-1) arr.push(val); else arr.splice(i,1);
  el.classList.toggle('active', arr.includes(val));
  renderPokemon();
}

// ── SPECIALTY COLLAPSE ──
function toggleSpecCollapse() {
  specCollapsed = !specCollapsed;
  const wrap = document.getElementById('spec-filters');
  wrap.classList.toggle('collapsed', specCollapsed);
  document.getElementById('spec-toggle-btn').textContent = specCollapsed ? 'Specialty ▾' : 'Specialty ▴';
  setTimeout(() => {
    const height = wrap.offsetHeight;
    document.documentElement.style.setProperty('--spec-h', height + 'px');
  }, 0);
}

// ── THEME PICKER ──
let currentTheme = 'normal';
const THEMES = [
    { id: 'normal',   bg: '#f8f8f2', accent: '#A8A878', order:1 },
    { id: 'dark-type',bg: '#121212', accent: '#705848', order:17},
    // Pastels
    { id: 'fire',     bg: '#fff5f0', accent: '#f08030', order:10},
    { id: 'grass',    bg: '#f2fff0', accent: '#78c850', order:12},
    { id: 'electric', bg: '#fffdf0', accent: '#f8d030', order:13},
    { id: 'bug',      bg: '#f9fff0', accent: '#a8b820', order:7},
    { id: 'ice',      bg: '#f0ffff', accent: '#98d8d8', order:15},
    { id: 'fairy',    bg: '#fff5f7', accent: '#ee99ac', order:18},
    // Earthy/Vibrant
    { id: 'ground',   bg: '#fdf5e6', accent: '#e0c068', order:5},
    { id: 'rock',     bg: '#f5f5f0', accent: '#b8a038', order:6},
    { id: 'fighting', bg: '#fff0f0', accent: '#c03028', order:2},
    { id: 'water',    bg: '#e0f0ff', accent: '#6890f0', order:11},
    { id: 'flying',   bg: '#f0eaff', accent: '#a890f0', order:3},
    { id: 'psychic',  bg: '#fff0f5', accent: '#f85888', order:14},
    // Deep/Dark
    { id: 'poison',   bg: '#1a0a1f', accent: '#a040a0', order:4},
    { id: 'ghost',    bg: '#0f0a1a', accent: '#705898', order:8},
    { id: 'dragon',   bg: '#0f0f1f', accent: '#7038f8', order:16},
    { id: 'steel',    bg: '#1a1c1e', accent: '#b8b8d0', order:9},
];

function initThemePicker() {
    const container = document.getElementById('theme-picker-popup');
    if (!container) return;

    container.innerHTML = THEMES.map(theme => `
        <div class="theme-option" data-theme="${theme.id}" onclick="setTheme('${theme.id}')">
            <span class="theme-swatch" style="background:${theme.bg}; border-color:${theme.accent}"></span>
            <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/types/generation-ix/scarlet-violet/${theme.order}.png" height="20" width="100%"></img>
        </div>
    `).join('');
}

function toggleThemePicker() {
  // All theme popups share one element — position it correctly
  const popup = document.getElementById('theme-picker-popup');
  popup.classList.toggle('open');
}

function setTheme(themeId) {
  THEMES.forEach(t => document.body.classList.remove('theme-'+t.id));
  if(themeId !== 'normal') document.body.classList.add('theme-'+themeId);
  currentTheme = themeId;
  document.querySelectorAll('.theme-option').forEach(el => {
    el.classList.toggle('selected', el.dataset.theme === themeId);
  });
  localStorage.setItem('pokopia-theme', themeId);
  // NOTE: intentionally NOT closing picker on selection per user request
}

// Close theme picker on outside click
document.addEventListener('click', e => {
  const popup = document.getElementById('theme-picker-popup');
  // Close if click is outside any theme-picker-wrap
  if(!e.target.closest('.theme-picker-wrap')) {
    if(popup) popup.classList.remove('open');
  }
});

// ── QUICK ADD ──
function toggleQuickAdd() {
  qaActive = !qaActive;
  document.getElementById('quick-add-bar').classList.toggle('hidden', !qaActive);
  document.getElementById('qa-toggle-btn').style.background = qaActive ? 'color-mix(in srgb,var(--accent2) 25%,transparent)' : '';
  document.body.classList.toggle('qa-open', qaActive);
  if(!qaActive) {
    qaTarget = null;
    document.querySelectorAll('.qa-area-btn').forEach(b=>b.classList.remove('active'));
  }
}

function setQAArea(key) {
  if(qaTarget===key) { qaTarget=null; document.querySelectorAll('.qa-area-btn').forEach(b=>b.classList.remove('active')); return; }
  qaTarget = key;
  document.querySelectorAll('.qa-area-btn').forEach(b=>b.classList.remove('active'));
  if(key==='wild') document.getElementById('qa-wild').classList.add('active');
  else { const a=AREAS.find(a=>a.key===key); if(a) document.getElementById(a.qaId).classList.add('active'); }
}

function confirmReturnAllToWild() {
  const count = Object.values(pokemonLocation).filter(v=>v).length;
  if(count===0) { showToast('No Pokémon are currently placed in any area.'); return; }
  showConfirm(
    `Return all ${count} Pokémon to the wild? This cannot be undone.`,
    () => {
      for(const uid of Object.keys(pokemonLocation)) delete pokemonLocation[uid];
      saveLocations();
      renderPokemon();
      if(document.getElementById('tab-areas').style.display!=='none') renderAreas();
      showToast(`🌿 ${count} Pokémon returned to the wild`);
    }
  );
}

// ── CARD CLICK ──
function handleCardClick(uid) {
  const p = ALL_POKEMON.find(x=>x.uid===uid);
  if(!p) return;
  if(qaActive && qaTarget) {
    if(qaTarget==='wild') {
      releaseToWild(uid);
    } else {
      if(pokemonLocation[uid]===qaTarget) { 
        // prevent user from adding to same area tiwce
        //showToast(`${p.name} is already in ${qaTarget}!`); 
        // let user de-select qa location if already there
        releaseToWild(uid);
        return;
      }
      pokemonLocation[uid] = qaTarget;
      saveLocations();
      renderPokemon();
      if(document.getElementById('tab-areas').style.display!=='none') renderAreas();
      const a = areaByKey(qaTarget);
      showToast(`${p.name} → ${a?a.icon:''} ${qaTarget}`);
    }
  } else {
    openPkModal(uid);
  }
}

// ── POKEMON CARD HTML ──
function pkCardHTML(p, clickable=true) {
  const loc = pokemonLocation[p.uid] ?? null;
  const inArea = !!loc;
  const areaObj = loc ? areaByKey(loc) : null;
  const areaLabel = areaObj ? `${areaObj.icon} ${areaObj.name}` : '';
  const onclick = clickable ? `onclick="handleCardClick('${p.uid}')"` : '';
  const typeBadges = p.types.map(t=>`<span class="type-badge" style="background:${TYPE_COLORS[t]||'#888'}">${t}</span>`).join('');
  const specs = p.specialties.map(s=>specTagHTML(s)).join('');
  const isPokopiaUnique = POKOPIA_UNIQUE.has(p.name);
  const isPrimary = loc && p.primaryLocation && loc===p.primaryLocation;
  return `<div class="pk-card${inArea?' in-area':''}" data-uid="${p.uid}" ${onclick}>
    ${inArea?`<span class="area-badge">${areaLabel}</span>`:''}
    ${isPokopiaUnique?`<span class="pokopia-badge">✦ Pokopia</span>`:''}
    ${isPrimary?`<span class="primary-star" title="In primary location">⭐</span>`:''}
    <div class="pk-id">#${String(p.pokopiaId).padStart(3,'0')}</div>
    <img src="${spriteUrl(p)}" alt="${p.name}" loading="lazy">
    <div class="pk-name">${p.name}</div>
    <div class="pk-types">${typeBadges}</div>
    <div class="pk-specs">${specs}</div>
    <div class="pk-tw"><span>${timeIcons(p.time)}</span><span>${weatherIcons(p.weather)}</span></div>
  </div>`;
}

// ── RENDER POKEMON ──
function renderPokemon() {
  const q = document.getElementById('pk-search').value.toLowerCase();
  let data = ALL_POKEMON.filter(p => {
    if(q && !p.name.toLowerCase().includes(q)) return false;
    if(activeSpecFilters.length && !activeSpecFilters.some(s=>p.specialties.includes(s))) return false;
    return true;
  });
  if(activeSort==='id') data.sort((a,b)=>a.pokopiaId-b.pokopiaId||a.name.localeCompare(b.name));
  else data.sort((a,b)=>a.name.localeCompare(b.name));
  document.getElementById('pokemon-grid').innerHTML = data.map(p=>pkCardHTML(p)).join('');
}

// ── HABITATS INDEX ──
function buildHabitatIndex() {
  const idx = {};
  ALL_POKEMON.forEach(p => {
    p.habitats.forEach(h => {
      if(!idx[h.name]) idx[h.name]={name:h.name,pokemon:[],meta:h,habitatId:h.habitatId||null};
      if(!idx[h.name].pokemon.find(x=>x.uid===p.uid)) idx[h.name].pokemon.push(p);
      if(h.habitatId && !idx[h.name].habitatId) idx[h.name].habitatId = h.habitatId;
    });
  });
  const habLookup = {};
  if(typeof ALL_HABITATS !== 'undefined') {
    ALL_HABITATS.forEach(h => { habLookup[h.id]=h; habLookup[h.name]=h; });
  }
  return Object.values(idx).sort((a,b)=>a.name.localeCompare(b.name)).map(h => {
    const master = habLookup[h.habitatId] || habLookup[h.name] || {};
    h.description = master.description || null;
    h.requirements = master.requirements || [];
    h.conditions   = master.conditions   || [];
    h.habitatId = h.habitatId || master.id || null;
    return h;
  });
}
const HABITAT_INDEX = buildHabitatIndex();

// Pre-compute sorted list of all specialties for the insights panel
const ALL_SPECIALTIES = [...new Set(ALL_POKEMON.flatMap(p => p.specialties))].sort();

function renderHabitats() {
  const q = document.getElementById('hab-search').value.toLowerCase().trim();
  let list;
  if (!q) {
    list = [...HABITAT_INDEX];
  } else {
    // Match by habitat name OR by any pokemon name found in that habitat
    list = HABITAT_INDEX.filter(h =>
      h.name.toLowerCase().includes(q) ||
      h.pokemon.some(p => p.name.toLowerCase().includes(q))
    );
  }
  if(activeHabSort==='id') list.sort((a,b)=>(a.habitatId||999)-(b.habitatId||999));
  else list.sort((a,b)=>a.name.localeCompare(b.name));
  document.getElementById('habitats-grid').innerHTML = list.map(h => {
    const sprUrl = habitatSpriteUrl(h.habitatId);
    const imgHtml = sprUrl
      ? `<img class="hab-img" src="${sprUrl}" alt="${h.name}" loading="lazy" onerror="this.style.display='none'">`
      : `<div style="font-size:2rem;text-align:center;margin-bottom:5px">🏡</div>`;
    const sprites = h.pokemon.slice(0,8).map(p=>`<img src="${spriteUrl(p)}" alt="${p.name}" title="${p.name}" loading="lazy">`).join('');
    const more = h.pokemon.length>8 ? `<span style="font-size:0.62rem;opacity:0.55">+${h.pokemon.length-8}</span>` : '';
    const idLabel = h.habitatId ? `<div class="hab-id">#${h.habitatId}</div>` : '';
    return `<div class="hab-card" onclick="openHabModal('${h.name.replace(/'/g,"\\'")}')">
      ${idLabel}${imgHtml}
      <div class="hab-name">${h.name}</div>
      <div class="hab-pokemon">${sprites}${more}</div>
    </div>`;
  }).join('');
}

// ── AREAS ──
// Track which area insight panels are open (persists across re-renders)
const areaInsightsOpen = {};

function toggleAreaInsights(areaKey) {
  areaInsightsOpen[areaKey] = !areaInsightsOpen[areaKey];
  // Re-render just the insights panel for this area without full re-render
  const panel = document.getElementById('insights-panel-' + areaKey.replace(/\s/g,'-'));
  const btn   = document.getElementById('insights-btn-'   + areaKey.replace(/\s/g,'-'));
  if (!panel || !btn) return;
  if (areaInsightsOpen[areaKey]) {
    panel.style.display = 'block';
    btn.textContent = 'Hide Insights ▴';
  } else {
    panel.style.display = 'none';
    btn.textContent = 'Show Insights ▾';
  }
}

function renderAreaInsightsPanel(areaKey, pksInArea) {
  // Build set of specialties present in this area
  const presentSpecs = new Set(pksInArea.flatMap(p => p.specialties));
  const isOpen = !!areaInsightsOpen[areaKey];
  const safeKey = areaKey.replace(/\s/g,'-');

  const pills = ALL_SPECIALTIES.map(s => {
    const active = presentSpecs.has(s);
    return `<span class="insight-pill${active ? ' active' : ''}" title="${s}">
      <img src="${specImgUrl(s)}" alt="${s}"
        style="width:11px;height:11px;object-fit:contain;vertical-align:middle;margin-right:2px"
        onerror="this.replaceWith(document.createTextNode('${SPEC_EMOJI[s]||'?'}'))">
      ${s}
    </span>`;
  }).join('');

  return `
    <div class="area-insights-bar">
      <button class="area-insights-btn" id="insights-btn-${safeKey}"
        onclick="toggleAreaInsights('${areaKey}')">
        ${isOpen ? 'Hide Insights ▴' : 'Show Insights ▾'}
      </button>
    </div>
    <div class="area-insights-panel" id="insights-panel-${safeKey}"
      style="display:${isOpen ? 'block' : 'none'}">
      <div class="area-insights-pills">${pills}</div>
    </div>`;
}

function renderAreas() {
  const q = (document.getElementById('area-search')?.value || '').toLowerCase();
  document.getElementById('areas-container').innerHTML = AREAS.map(area => {
    const pks = ALL_POKEMON.filter(p => pokemonLocation[p.uid] === area.key);
    const filteredPks = q ? pks.filter(p => p.name.toLowerCase().includes(q)) : pks;
    const shouldOpen = q ? filteredPks.length > 0 : pks.length > 0;
    const bid = 'area-body-' + area.key.replace(/\s/g,'-');
    const cid = 'area-chev-' + area.key.replace(/\s/g,'-');
    const wasOpen = document.getElementById(bid)?.classList.contains('open');
    const isOpen = q ? shouldOpen : (wasOpen !== undefined ? wasOpen : shouldOpen);

    return `<div class="area-section">
      <div class="area-header" onclick="toggleArea('${bid}','${cid}')">
        <div class="area-title">${area.icon} ${area.name}<span class="area-count">${pks.length} Pokémon</span></div>
        <span class="area-chev${isOpen?' open':''}" id="${cid}">▼</span>
      </div>
      <div class="area-body${isOpen?' open':''}" id="${bid}">
        ${filteredPks.length === 0
          ? (q
              ? '<div class="area-empty">No matches in this area.</div>'
              : '<div class="area-empty">No Pokémon assigned yet.<br>Use Quick Add or tap a card.</div>')
          : `${renderAreaInsightsPanel(area.key, pks)}
             <div class="area-pg">${filteredPks.map(p => pkCardHTML(p)).join('')}</div>`}
      </div>
    </div>`;
  }).join('');
}

function toggleArea(bid, cid) {
  document.getElementById(bid).classList.toggle('open');
  document.getElementById(cid).classList.toggle('open');
}

// ── POKEMON MODAL ──
function openPkModal(uid) {
  const p = ALL_POKEMON.find(x=>x.uid===uid);
  if(!p) return;
  const loc = pokemonLocation[p.uid] ?? null;
  const typeBadges = p.types.map(t=>`<span class="type-badge" style="background:${TYPE_COLORS[t]||'#888'}">${t}</span>`).join('');
  const specs = p.specialties.map(s=>specTagHTML(s)).join('');
  const habCards = p.habitats.map(h => {
    const hSpr = habitatSpriteUrl(h.habitatId);
    const hImg = hSpr
      ? `<img src="${hSpr}" alt="${h.name}" style="width:48px;height:36px;object-fit:cover;border-radius:4px;flex-shrink:0" loading="lazy" onerror="this.style.display='none'">`
      : `<span style="font-size:1.4rem">🏡</span>`;
    return `<div class="modal-hab-card" onclick="openHabFromPkModal('${h.name.replace(/'/g,"\\'")}')">
      <div style="display:flex;align-items:center;gap:8px">
        ${hImg}
        <div>
          <div class="modal-hab-name">${h.name}</div>
          <div class="modal-hab-meta">
            <span>${rarityHTML(h.rarity)} ${h.rarity||'?'}</span>
            <span>${timeIcons(h.time)} ${h.time||'Any'}</span>
            <span>${weatherIcons(h.weather)} ${h.weather||'Any'}</span>
          </div>
        </div>
      </div>
    </div>`;
  }).join('');
  const favChips = p.favorites.map(f=>`<span class="chip">${f}</span>`).join('');
  const curLocHTML = loc
    ? `<div class="cur-loc"><span class="loc-dot" style="background:var(--accent2)"></span><span>In <strong>${loc}</strong></span></div>`
    : `<div class="cur-loc"><span class="loc-dot" style="background:var(--text-dim)"></span><span>In the Wild</span></div>`;
  const areaBtns = AREAS.map(a => {
    const isCurrent = loc===a.key;
    const isPrimary = p.primaryLocation===a.key;
    return `<button class="area-pick-btn${isCurrent?' current-area':''}" onclick="assignToArea('${uid}','${a.key}')">${a.icon} ${a.name}${isPrimary?' ⭐':''}</button>`;
  }).join('');
  const relBtn = loc ? `<button class="release-btn" onclick="releaseToWild('${uid}')">🌿 Release to Wild</button>` : '';
  const detailRows = [
    `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border)"><span style="opacity:0.55">Primary Location</span><span><strong>${p.primaryLocation||'?'}</strong></span></div>`,
    `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border)"><span style="opacity:0.55">Active Time</span><span><strong>${p.time||'?'}</strong></span></div>`,
    `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border)"><span style="opacity:0.55">Weather</span><span><strong>${p.weather||'?'}</strong></span></div>`,
    p.idealHabitat ? `<div style="display:flex;justify-content:space-between;padding:4px 0"><span style="opacity:0.55">Ideal Habitat</span><span><strong>${p.idealHabitat}</strong></span></div>` : ''
  ].join('');
  document.getElementById('pk-modal-inner').innerHTML=`
    <button class="modal-close" onclick="closePkModal()">✕</button>
    <div class="modal-hdr">
      <img src="${spriteUrl(p)}" alt="${p.name}">
      <div class="modal-hdr-info">
        <div style="font-size:0.65rem;opacity:0.45;font-family:monospace">#${String(p.pokopiaId).padStart(3,'0')}</div>
        <h2>${p.name}</h2>
        <div style="display:flex;gap:3px;margin-top:3px">${typeBadges}</div>
        <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:5px">${specs}</div>
      </div>
    </div>
    <div class="modal-body">
      <div class="modal-sec"><h3>Details</h3><div style="font-size:0.8rem">${detailRows}</div></div>
      ${favChips?`<div class="modal-sec"><h3>Favorites</h3><div class="chips">${favChips}</div></div>`:''}
      ${habCards?`<div class="modal-sec"><h3>Where to Find</h3>${habCards}</div>`:''}
      <div class="modal-sec">
        <h3>Current Location</h3>
        ${curLocHTML}
        <div style="margin-top:9px">
          <div style="font-size:0.68rem;opacity:0.5;margin-bottom:5px">Assign to area:</div>
          <div class="area-picker">${areaBtns}</div>
          ${relBtn}
        </div>
      </div>
    </div>`;
  document.getElementById('pk-modal').classList.add('open');
}

function closePkModal(e) {
  if(!e || e.target===document.getElementById('pk-modal')) document.getElementById('pk-modal').classList.remove('open');
}
function openHabFromPkModal(name) {
  closePkModal();
  setTimeout(()=>{ openHabModal(name); }, 80);
}
function assignToArea(uid, areaKey) {
  pokemonLocation[uid] = areaKey;
  saveLocations();
  openPkModal(uid);
  renderPokemon();
  if(document.getElementById('tab-areas').style.display!=='none') renderAreas();
}
function releaseToWild(uid) {
  const p = ALL_POKEMON.find(x => x.uid === uid);
  delete pokemonLocation[uid];
  saveLocations();
  renderPokemon();
  if(document.getElementById('tab-areas').style.display!=='none') renderAreas();
  if(p) showToast(`${p.name} released to the wild 🌿`);
}

// ── HABITAT MODAL ──
function openHabModal(name) {
  // Accept raw name or encoded name
  const decodedName = name.includes('%') ? decodeURIComponent(name) : name;
  const hab = HABITAT_INDEX.find(h=>h.name===decodedName);
  if(!hab) return;
  const pkChips = hab.pokemon.map(p=>`
    <div class="hab-poke-chip" onclick="closeHabModal();setTimeout(()=>{openPkModal('${p.uid}');},80)">
      <img src="${spriteUrl(p)}" alt="${p.name}">
      <span>#${String(p.pokopiaId).padStart(3,'0')} ${p.name}</span>
    </div>`).join('');
  const sprUrl = habitatSpriteUrl(hab.habitatId);
  const imgHtml = sprUrl
    ? `<img src="${sprUrl}" alt="${decodedName}" style="width:100%;height:fit-content;object-fit:cover;border-radius:0 0 8px 8px;display:block" loading="lazy" onerror="this.style.display='none'">`
    : '';
  const idStr = hab.habitatId ? `<div style="font-size:0.65rem;opacity:0.45;font-family:monospace;text-align:center">#${hab.habitatId}</div>` : '';

  // Requirements section
  const reqHTML = hab.requirements && hab.requirements.length
    ? `<div class="modal-sec"><h3>Requirements</h3>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          ${hab.requirements.map(r=>`<span class="condition-chip">${r.item} <span class="condition-qty">${r.qty}</span></span>`).join('')}
        </div></div>`
    : '';

  // Conditions section (new field)
  const condHTML = hab.conditions && hab.conditions.length
    ? `<div class="modal-sec"><h3>Conditions</h3>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          ${hab.conditions.map(c=>`<span class="condition-chip">${c}</span>`).join('')}
        </div></div>`
    : '';

  document.getElementById('hab-modal-inner').innerHTML=`
    <button class="modal-close" onclick="closeHabModal()">✕</button>
    <div class="modal-hdr" style="flex-direction:column;align-items:center;text-align:center;gap:4px;padding:14px 14px 0;border-radius:14px 14px 0 0">
      ${idStr}
      <h2 style="font-size:0.95rem">${decodedName}</h2>
      ${hab.description?`<p style="font-size:0.75rem;opacity:0.65;line-height:1.4;margin-top:2px;font-style:italic;padding:0 8px">${hab.description}</p>`:''}
    </div>
    ${imgHtml}
    <div class="modal-body">
      ${reqHTML}
      ${condHTML}
      <div class="modal-sec"><h3>Pokémon Found in this Habitat (${hab.pokemon.length})</h3><div class="hab-poke-mini">${pkChips}</div></div>
    </div>`;
  document.getElementById('hab-modal').classList.add('open');
}

function closeHabModal(e) {
  if(!e || e.target===document.getElementById('hab-modal')) document.getElementById('hab-modal').classList.remove('open');
}

// ── INIT FILTERS ──
function initFilters() {
  const allSpecs = [...new Set(ALL_POKEMON.flatMap(p=>p.specialties))].sort();
  const specC = document.getElementById('spec-filters');
  allSpecs.forEach(s => {
    const b = document.createElement('button');
    b.className = 'filter-pill';
    b.innerHTML = `<img src="${specImgUrl(s)}" alt="${s}" style="width:12px;height:12px;vertical-align:middle;margin-right:2px" onerror="this.replaceWith(document.createTextNode('${SPEC_EMOJI[s]||'?'}'))"> ${s}`;
    b.onclick = () => toggleFilter(activeSpecFilters, s, b);
    specC.appendChild(b);
  });
}

// ── BOOT ──
document.addEventListener('DOMContentLoaded', () => {
  initThemePicker();
  const savedTheme = localStorage.getItem('pokopia-theme');
  if(savedTheme) setTheme(savedTheme);

  loadLocations();
  initFilters();
  renderPokemon();
});
