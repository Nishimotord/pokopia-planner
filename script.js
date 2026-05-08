// ── CONSTANTS ──
const TYPE_COLORS = {"Normal":"#A8A878","Fire":"#F08030","Water":"#6890F0","Grass":"#78C850","Electric":"#F8D030","Ice":"#98D8D8","Fighting":"#C03028","Poison":"#A040A0","Ground":"#E0C068","Flying":"#A890F0","Psychic":"#F85888","Bug":"#A8B020","Rock":"#B8A038","Ghost":"#705898","Dragon":"#7038F8","Steel":"#B8B8D0","Dark":"#705848","Fairy":"#EE99AC"};
const SPEC_EMOJI  = {"Grow":"🌱","Burn":"🔥","Water":"💧","Fly":"🪶","Search":"🔍","Chop":"🪓","Build":"🔨","Crush":"💥","Bulldoze":"🪨","Trade":"🤝","Teleport":"✨","Generate":"⚡","Gather":"📦","Litter":"🌿","Hype":"🎉","Recycle":"♻️","Yawn":"😴","Collect":"💰","Explode":"💣","Paint":"🎨","DJ":"🎧","Illuminate":"💡","Transform":"🔄","Appraise":"🔎","Storage":"🗃️","Gather Honey":"🍯","Dream Island":"🏝️","Eat":"🍽️","Engineer":"⚙️","Party":"🎊","Rarify":"⭐","???":"❓"};

const AREAS = [
  {key:'Withered Wastelands',name:'Withered Wastelands',icon:'🏜️',qaId:'qa-ww'},
  {key:'Bleak Beach',        name:'Bleak Beach',        icon:'🏖️',qaId:'qa-bb'},
  {key:'Rocky Ridges',       name:'Rocky Ridges',       icon:'⛰️',qaId:'qa-rr'},
  {key:'Sparkling Skylands', name:'Sparkling Skylands', icon:'☁️',qaId:'qa-ss'},
  {key:'Palette Town',       name:'Palette Town',       icon:'🏘️',qaId:'qa-pt'},
  {key:'Unregistered',       name:'(In the Wild)',          icon:'🌿',qaId:''},
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
let pokemonStatusFilter = false;
let habitatStatusFilter = false;
let currTab = document.querySelector('.tab-btn.active')?.dataset.tab || 'pokemon';
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
function _origSwitchTab(tab) {
  ['pokemon','habitats','areas'].forEach(t => {
    document.getElementById('tab-'+t).style.display = t===tab ? '' : 'none';
    document.querySelector(`[data-tab="${t}"]`)?.classList.toggle('active', t===tab);
  });
  if(tab!=='pokemon') qaActive?toggleQuickAdd():null; // auto-disable quick add when leaving pokemon tab
  if(tab==='pokemon') renderPokemon();
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

function toggleStatusFilter(button){
  if (currTab === 'pokemon') {
    pokemonStatusFilter = !pokemonStatusFilter;
    button.classList.toggle('active', pokemonStatusFilter)
  }
  if (currTab === 'habitats') {
    habitatStatusFilter = !habitatStatusFilter;
    button.classList.toggle('active', habitatStatusFilter);
  } 
  if (IS_MOBILE()) {
    mobUpdateFilterBadge();
  }
  currTab === 'pokemon' ? renderPokemon() : renderHabitats();
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
            <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/types/generation-ix/scarlet-violet/${theme.order}.png" height="20"></img>
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
  if (!popup) return;
  if (!e.target.closest('.theme-picker-wrap') && !e.target.closest('#mob-btn-theme')) {
    popup.classList.remove('open');
    document.getElementById('mob-btn-theme')?.classList.remove('active');
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
    // search by name
    if(q && !p.name.toLowerCase().includes(q)) return false;
    // search by specialty
    if(activeSpecFilters.length && !activeSpecFilters.some(s=>p.specialties.includes(s))) return false;
    // filter by stat (in area or wild)
    if(pokemonStatusFilter) return pokemonLocation[p.uid] ? false : true;
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

  if(habitatStatusFilter) {
    list = list.filter(h => h.pokemon.some(p => pokemonLocation[p.uid] === undefined));
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
    const pks = area.key === 'Unregistered' ? ALL_POKEMON.filter(p => pokemonLocation[p.uid] === undefined)
      : ALL_POKEMON.filter(p => pokemonLocation[p.uid] === area.key);
    const filteredPks = q ? pks.filter(p => p.name.toLowerCase().includes(q)) : pks;
    const shouldOpen = q ? filteredPks.length > 0 : false; // auto-open if search matches pokemon in this area
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
  const specC = document.getElementById('spec-filters');
  ALL_SPECIALTIES.forEach(s => {
    const b = document.createElement('button');
    b.className = 'filter-pill';
    b.innerHTML = `<img src="${specImgUrl(s)}" alt="${s}" style="width:12px;height:12px;vertical-align:middle;margin-right:2px" onerror="this.replaceWith(document.createTextNode('${SPEC_EMOJI[s]||'?'}'))"> ${s}`;
    b.onclick = () => toggleFilter(activeSpecFilters, s, b);
    specC.appendChild(b);
  });
}


// (boot handled in mobile section below)

// ════════════════════════════════════════════
// MOBILE UI  (≤ 600px)
// Injects action bar + slide panels into DOM.
// Desktop elements remain in DOM but hidden by CSS.
// All data/state functions (renderPokemon, setSort, etc.)
// are shared — mobile panels just call the same functions.
// ════════════════════════════════════════════

const IS_MOBILE = () => window.matchMedia('(max-width:600px)').matches;

// ── State for which mobile panel is open ──
let mobOpenPanel = null; // 'search' | 'filter' | 'qa' | null

// ── Inject mobile chrome into DOM (runs once on DOMContentLoaded) ──
function initMobileUI() {
  if (!IS_MOBILE()){
    return;
  }
  // ── ACTION BAR ──
  const bar = document.createElement('div');
  bar.id = 'mob-action-bar';
  bar.innerHTML = `
    <button class="mob-act-btn" id="mob-btn-search" onclick="mobTogglePanel('search')">
      <span style="font-size:1.2rem">🔍</span>
      <span>Search</span>
    </button>
    <button class="mob-act-btn" id="mob-btn-filter" onclick="mobTogglePanel('filter')">
      <span style="font-size:1.2rem">▼</span>
      <span>Filter</span>
      <span class="mob-act-badge" id="mob-filter-badge"></span>
    </button>
    <button class="mob-act-btn" id="mob-btn-qa" onclick="mobTogglePanel('qa')">
      <span style="font-size:1.2rem">⚡+</span>
      <span>Quick Add</span>
      <span class="mob-qa-dot" id="mob-qa-dot"></span>
    </button>
    <button class="mob-act-btn" id="mob-btn-theme" onclick="mobTogglePanel('theme')">
      <span style="font-size:1.2rem">🎨</span>
      <span>Theme</span>
    </button>
  `;
  document.body.appendChild(bar);

  // ── BACKDROP ──
  const bd = document.createElement('div');
  bd.id = 'mob-backdrop';
  bd.onclick = mobCloseAll;
  document.body.appendChild(bd);

  // ── SEARCH PANEL ──
  const searchPanel = document.createElement('div');
  searchPanel.id = 'mob-search-panel';
  searchPanel.className = 'mob-panel';
  searchPanel.innerHTML = `
    <div class="mob-search-row">
      <span class="mob-search-label" id="mob-search-label">Search Pokémon</span>
    </div>
    <input type="text" id="mob-search-input" placeholder="Type to search…" oninput="mobHandleSearch(this.value)" autocomplete="off" autocorrect="off" spellcheck="false">
    <div class="mob-sort-row" id="mob-sort-row">
      <button class="mob-sort-btn active" id="mob-sort-id"   onclick="mobSetSort('id')">Sort: ID</button>
      <button class="mob-sort-btn"        id="mob-sort-name" onclick="mobSetSort('name')">Sort: Name</button>
    </div>
  `;
  document.body.appendChild(searchPanel);

  // ── FILTER PANEL ──
  const filterPanel = document.createElement('div');
  filterPanel.id = 'mob-filter-panel';
  filterPanel.className = 'mob-panel';
  filterPanel.innerHTML = `
    <div class="mob-panel-title" id='mob-panel-filter-title'>Specialty Filter</div>
    <div id="mob-filter-pills"></div>
    <div class="mob-sort-row" id="mob-filter-row">
      <button class="mob-sort-btn" id="mob-status-filter" onclick="toggleStatusFilter(this)">Hide Registered</button>
    </div>
  `;
  document.body.appendChild(filterPanel);

  // ── QUICK ADD PANEL ──
  const qaPanel = document.createElement('div');
  qaPanel.id = 'mob-qa-panel';
  qaPanel.className = 'mob-panel';
  qaPanel.innerHTML = `
    <div class="mob-panel-title">
      <span><span class="qa-dot" style="display:inline-block;margin-right:5px"></span>Quick Add — tap a card to place it</span>
      <button class="mob-qa-return-btn" style="width:auto;padding:4px 10px;font-size:0.65rem" onclick="confirmReturnAllToWild()">🗑️ Return All</button>
    </div>
    <div id="mob-qa-area-btns">
      <button class="mob-qa-area-btn wild-btn" id="mob-qa-wild"  onclick="mobSetQAArea('wild')">🌿 Wild</button>
      <button class="mob-qa-area-btn"          id="mob-qa-ww"    onclick="mobSetQAArea('Withered Wastelands')">🏜️ Withered Wastelands</button>
      <button class="mob-qa-area-btn"          id="mob-qa-bb"    onclick="mobSetQAArea('Bleak Beach')">🏖️ Bleak Beach</button>
      <button class="mob-qa-area-btn"          id="mob-qa-rr"    onclick="mobSetQAArea('Rocky Ridges')">⛰️ Rocky Ridges</button>
      <button class="mob-qa-area-btn"          id="mob-qa-ss"    onclick="mobSetQAArea('Sparkling Skylands')">☁️ Sparkling Skylands</button>
      <button class="mob-qa-area-btn"          id="mob-qa-pt"    onclick="mobSetQAArea('Palette Town')">🏘️ Palette Town</button>
    </div>
    <button class="mob-qa-return-btn" onclick="confirmReturnAllToWild()">🗑️ Return All Pokémon to Wild</button>
  `;
  document.body.appendChild(qaPanel);

  // Populate specialty filter pills (mirrors desktop initFilters)
  const pillWrap = document.getElementById('mob-filter-pills');
  ALL_SPECIALTIES.forEach(s => {
    const b = document.createElement('button');
    b.className = 'filter-pill';
    // Sync active state with desktop activeSpecFilters
    if (activeSpecFilters.includes(s)) b.classList.add('active');
    b.innerHTML = `<img src="${specImgUrl(s)}" alt="${s}" style="width:13px;height:13px;object-fit:contain;vertical-align:middle;margin-right:3px" onerror="this.replaceWith(document.createTextNode('${SPEC_EMOJI[s]||'?'}'))"> ${s}`;
    b.onclick = () => {
      toggleFilter(activeSpecFilters, s, b);
      // Also sync the desktop pill if it exists
      const desktopPill = [...document.querySelectorAll('#spec-filters .filter-pill')]
        .find(el => el.textContent.trim().includes(s));
      if (desktopPill) desktopPill.classList.toggle('active', activeSpecFilters.includes(s));
      mobUpdateFilterBadge();
    };
    pillWrap.appendChild(b);
  });

  mobUpdateSortUI();
}

// ── Panel open/close ──
function mobTogglePanel(name) {
  // Theme panel uses the existing desktop popup (repositioned by CSS)
  if (name === 'theme') {
    mobCloseContentPanels(); // close other panels first
    const popup = document.getElementById('theme-picker-popup');
    const btn   = document.getElementById('mob-btn-theme');
    // checks if currently open
    const isOpen = popup.classList.contains('open');
    if(isOpen) {
      mobCloseThemePanel();
      return;
    }
    else{
      popup.classList.toggle('open');
      btn?.classList.toggle('active', isOpen);
      // show backdrop so tapping outside closes it
      document.getElementById('mob-backdrop').classList.add('open');
      mobOpenPanel = 'theme';
    }
    return;
  }

  // Hide/show Quick Add and Filter based on current tab
  if (name === 'filter' && currTab === 'areas') { showToast('Filters available on the Pokémon and Habitat tabs'); return; }
  if (name === 'qa'     && currTab !== 'pokemon') { showToast('Quick Add available on the Pokémon tab'); return; }

  if (mobOpenPanel === name) {
    mobCloseAll();
    return;
  }
  mobCloseContentPanels();
  mobOpenPanel = name;
  document.getElementById(`mob-${name}-panel`).classList.add('open');
  document.getElementById('mob-backdrop').classList.add('open');
  document.getElementById(`mob-btn-${name === 'search' ? 'search' : name === 'filter' ? 'filter' : 'qa'}`)?.classList.add('active');

  // Update search label + sort visibility for current tab
  if (name === 'search') {
    const labels = {pokemon:'Search Pokémon', habitats:'Search Habitats by Name or Pokémon', areas:'Search Areas by Pokémon Name'};
    document.getElementById('mob-search-label').textContent = labels[currTab] || 'Search';
    // Sort row only relevant for pokemon + habitats
    document.getElementById('mob-sort-row').style.display = currTab === 'areas' ? 'none' : 'flex';
    mobUpdateSortUI();
    setTimeout(() => document.getElementById('mob-search-input')?.focus(), 200);
  }
  // Update Filter label + visibility for current tab
  if (name === 'filter') {
    const labels = {pokemon:'Hide Registered Pokemon', habitats:'Show only Habitats with Unregistered Pokemon', areas:''};
    document.getElementById('mob-status-filter').textContent = labels[currTab] || 'error';
    // Sort row only relevant for pokemon + habitats
    document.getElementById('mob-filter-row').style.display = currTab === 'areas' ? 'none' : 'flex';
    mobUpdateSortUI();
  }
}

function mobCloseThemePanel() {
  document.getElementById('theme-picker-popup')?.classList.remove('open');
  document.getElementById('mob-btn-theme')?.classList.remove('active');
  document.getElementById('mob-backdrop')?.classList.remove('open');
  mobOpenPanel = null;
}

function mobCloseContentPanels() {
  ['search','filter','qa'].forEach(name => {
    document.getElementById(`mob-${name}-panel`)?.classList.remove('open');
    document.getElementById(`mob-btn-${name}`)?.classList.remove('active');
  });
}


function mobCloseAll() {
  mobCloseContentPanels();
  mobCloseThemePanel();
}

// ── Search routing ──
function mobHandleSearch(val) {
  // Sync value to the relevant hidden desktop input so existing render fns work
  if (currTab === 'pokemon') {
    document.getElementById('pk-search').value = val;
    renderPokemon();
  } else if (currTab === 'habitats') {
    document.getElementById('hab-search').value = val;
    renderHabitats();
  } else if (currTab === 'areas') {
    document.getElementById('area-search').value = val;
    renderAreas();
  }
}

// ── Sort routing (mirrors desktop setSort / setHabSort) ──
function mobSetSort(s) {
  if (currTab === 'habitats') {
    setHabSort(s);
  } else {
    setSort(s);
  }
  mobUpdateSortUI();
}

function mobUpdateSortUI() {
  const active = currTab === 'habitats' ? activeHabSort : activeSort;
  document.getElementById('mob-sort-id')  ?.classList.toggle('active', active === 'id');
  document.getElementById('mob-sort-name')?.classList.toggle('active', active === 'name');

  if (currTab !== 'pokemon') {
    // Hide sort options if not on pokemon tab since they don't apply
    qaActive = false;
    qaTarget = null;
    document.querySelectorAll('.mob-qa-area-btn').forEach(b => b.classList.remove('active'));
    mobUpdateQADot();
  }
}

// ── Filter badge ──
function mobUpdateFilterBadge() {
  const badge = document.getElementById('mob-filter-badge');
  if (!badge) return;
  const count = (currTab === 'pokemon' ? (activeSpecFilters.length + (pokemonStatusFilter ? 1 : 0)) : 0) + (habitatStatusFilter && currTab === 'habitats' ? 1 : 0);
  badge.textContent = count;

  if (currTab === 'pokemon') {
    badge.classList.toggle('visible', count > 0 && currTab === 'pokemon');
  } else if (currTab === 'habitats') {
    badge.classList.toggle('visible', count > 0 && currTab === 'habitats');
  }
  else{
    badge.classList.toggle('visible', false);
  }
  
}
// ── Filter Options ──
function mobUpdateFilterSelection(){
  /*
  const filterPanel = document.getElementById('mob-filter-panel');
  
  filterPanel.id = 'mob-filter-panel';
  filterPanel.className = 'mob-panel';
  filterPanel.innerHTML = `
    <div class="mob-panel-title">Specialty Filter</div>
    <div id="mob-filter-pills"></div>
    <div class="mob-sort-row" id="mob-sort-row">
      <button class="mob-sort-btn" id="mob-status-filter" onclick="toggleStatusFilter(this)">Hide Registered</button>
    </div>
  `;*/
  const filterPanelTitle = document.getElementById('mob-panel-filter-title');
  const mobFilterPills = document.getElementById('mob-filter-pills');
  if (currTab === 'pokemon') {
    filterPanelTitle.textContent = 'Specialty Filter';
    document.getElementById('mob-filter-pills').style.display = 'flex';
    document.getElementById('mob-status-filter').classList.toggle('active', pokemonStatusFilter);
  } else if (currTab === 'habitats') {
    filterPanelTitle.textContent = 'Status Filter';
    document.getElementById('mob-filter-pills').style.display = 'none';
    document.getElementById('mob-status-filter').classList.toggle('active', habitatStatusFilter);
   }
}

// ── QA on mobile: mirrors desktop setQAArea + qaActive state ──
function mobSetQAArea(key) {
  // Toggle: if same key selected again, deselect
  if (qaTarget === key) {
    qaTarget = null;
    qaActive = false;
    document.querySelectorAll('.mob-qa-area-btn').forEach(b => b.classList.remove('active'));
    mobUpdateQADot();
    return;
  }
  qaTarget = key;
  qaActive = true;
  document.querySelectorAll('.mob-qa-area-btn').forEach(b => b.classList.remove('active'));
  if (key === 'wild') {
    document.getElementById('mob-qa-wild')?.classList.add('active');
  } else {
    const areaIdMap = {
      'Withered Wastelands':'mob-qa-ww',
      'Bleak Beach':'mob-qa-bb',
      'Rocky Ridges':'mob-qa-rr',
      'Sparkling Skylands':'mob-qa-ss',
      'Palette Town':'mob-qa-pt',
    };
    document.getElementById(areaIdMap[key])?.classList.add('active');
  }
  mobUpdateQADot();
  // Close panel after selection so user can see the cards
  showToast(`⚡ Quick Add: ${key === 'wild' ? '🌿 Wild' : key} — tap a card`);
}

function mobUpdateQADot() {
  const dot = document.getElementById('mob-qa-dot');
  if (dot) dot.classList.toggle('visible', qaActive && qaTarget !== null);
  // Also keep the action bar QA button highlighted while active
  document.getElementById('mob-btn-qa')?.classList.toggle('active', qaActive && qaTarget !== null);
}

// ── Patch switchTab to clear mobile search + close panels ──
function switchTab(tab) {
  _origSwitchTab(tab);
  currTab = tab
  if (IS_MOBILE()) {
    // Clear search input when switching tabs
    const inp = document.getElementById('mob-search-input');
    if (inp) inp.value = '';
    // Clear desktop search inputs too so render fns start fresh
    ['pk-search','hab-search','area-search'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    // Close any open panel
    mobCloseAll();
    // QA state persists across pokemon tab only — clear when leaving TODO: update QA UI to reflect this better
    if (tab !== 'pokemon' && qaActive) {
      qaActive = false;
      qaTarget = null;
      mobUpdateQADot();
    }
    // Update sort UI if search panel is opened later
    mobUpdateSortUI();
    mobUpdateFilterBadge();
    mobUpdateFilterSelection();
    }
}


// ── BOOT ──
document.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('pokopia-theme');
  if(savedTheme) setTheme(savedTheme);

  loadLocations();
  initFilters();
  initThemePicker();
  renderPokemon();


  if (IS_MOBILE()) {
    initMobileUI();
  }
});
