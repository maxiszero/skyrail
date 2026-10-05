/** SKYRAIL · flight instruments and dispatch interface. No external UI dependencies. */
export const WEAPONS = [
  { id: 'repeater', name: 'REPEATER', damage: 26, rate: .17, ammo: 24, reload: 1.35, range: 100, color: 0xffd88d, description: 'Точная скорострельная винтовка. Надёжный выбор на любой дистанции.', type: 'PRECISION RIFLE', glyph: '━╋━', specialty: 'Точность / мобильность' },
  { id: 'thunder', name: 'THUNDER COIL', damage: 33, rate: .42, ammo: 12, reload: 1.7, range: 60, color: 0x86e9ff, description: 'Разряд перескакивает между ближайшими противниками.', type: 'CHAIN ELECTRIC', glyph: 'ϟ', specialty: 'Цепная молния / группы' },
  { id: 'scatter', name: 'SCATTER CANNON', damage: 92, rate: .8, ammo: 6, reload: 1.9, range: 25, color: 0xffbc78, description: 'Широкий сектор поражения и сильный импульс. Отдача помогает менять траекторию в воздухе.', type: 'KINETIC SHOTGUN', glyph: '≋', specialty: 'Ближний бой / импульс' },
  { id: 'harpoon', name: 'HARPOON', damage: 112, rate: 1.1, ammo: 4, reload: 2.1, range: 115, color: 0xe8e5c5, description: 'Тяжёлый гарпун оглушает и далеко отбрасывает цель.', type: 'HEAVY PENETRATOR', glyph: '⟶', specialty: 'Импульс / дальность' },
  { id: 'flare', name: 'FLARE GUN', damage: 86, rate: .9, ammo: 6, reload: 2, range: 85, color: 0xff7750, description: 'Взрывной заряд поражает область и детонирует топливные баки.', type: 'INCENDIARY LAUNCHER', glyph: '✳', specialty: 'Взрыв / окружение' },
];

export const UPGRADES = [
  { id: 'double_hook', name: 'DOUBLE HOOK', description: 'Магниты восстанавливаются быстрее. Больше точек опоры в воздухе.', tag: 'GRAPPLE', effect: 'hookCooldown', value: .35 },
  { id: 'long_line', name: 'LONG LINE', description: 'Дальность магнитного троса увеличена с 64 до 95 метров.', tag: 'GRAPPLE', effect: 'hookRange', value: 95 },
  { id: 'magnetic_boots', name: 'MAGNETIC BOOTS', description: 'Бег по металлическим стенам длится до 3,6 секунды.', tag: 'MOVEMENT', effect: 'wallTime', value: 3.6 },
  { id: 'kinetic_reload', name: 'KINETIC RELOAD', description: 'Скольжение по рельсам постепенно пополняет магазин.', tag: 'SYNERGY', effect: 'grindReload', value: true },
  { id: 'aerial_ace', name: 'AERIAL ACE', description: 'Вы наносите на 40% больше урона, пока находитесь в воздухе.', tag: 'COMBAT', effect: 'airDamage', value: 1.4 },
  { id: 'thunder_line', name: 'THUNDER LINE', description: 'Попадание крюка поражает противника электричеством.', tag: 'SYNERGY', effect: 'hookDamage', value: 35 },
  { id: 'slingshot_plus', name: 'SLINGSHOT+', description: 'Импульс катапульты увеличен на 40%. Выше, дальше, быстрее.', tag: 'GRAPPLE', effect: 'slingPower', value: 1.4 },
  { id: 'impact', name: 'IMPACT', description: 'Приземление с большой скоростью создаёт ударную волну.', tag: 'SYNERGY', effect: 'slam', value: true },
  { id: 'chain_hook', name: 'CHAIN HOOK', description: 'Всего 0,2 секунды между зацепами. Постройте собственную воздушную линию.', tag: 'GRAPPLE', effect: 'hookCooldown', value: .2 },
  { id: 'high_velocity', name: 'HIGH VELOCITY', description: 'Скорость усиливает урон оружия — до дополнительных 65%.', tag: 'SYNERGY', effect: 'velocityDamage', value: .65 },
  { id: 'reinforced', name: 'REINFORCED', description: 'Усиленный жилет. Максимальное здоровье увеличено на 30.', tag: 'SURVIVAL', effect: 'maxHealth', value: 30 },
  { id: 'field_medic', name: 'FIELD MEDIC', description: 'Убийство восстанавливает 9 здоровья. Раны постепенно заживают сами.', tag: 'SURVIVAL', effect: 'killHeal', value: 9 },
  { id: 'overclock', name: 'OVERCLOCK', description: 'Усиленные сервоприводы повышают скорость бега на 13%.', tag: 'MOVEMENT', effect: 'runSpeed', value: 1.13 },
  { id: 'deep_magazine', name: 'DEEP MAGAZINE', description: 'Ёмкость магазина любого оружия увеличена на 40%.', tag: 'COMBAT', effect: 'magazine', value: 1.4 },
  { id: 'quick_hands', name: 'QUICK HANDS', description: 'Перезарядка занимает на 32% меньше времени.', tag: 'COMBAT', effect: 'reload', value: .68 },
  { id: 'air_dash', name: 'AIR DASH+', description: 'Рывок восстанавливается за 1,3 секунды вместо 2,5.', tag: 'MOVEMENT', effect: 'dashCooldown', value: 1.3 },
  { id: 'wind_rider', name: 'WIND RIDER', description: 'Лучше управляйте полётом и сопротивляйтесь штормовому ветру.', tag: 'MOVEMENT', effect: 'airControl', value: 22 },
  { id: 'life_line', name: 'LIFE LINE', description: 'Аварийный трос отнимает лишь 5 здоровья вместо 18.', tag: 'SURVIVAL', effect: 'rescueCost', value: 5 },
  { id: 'salvage', name: 'SALVAGE EXPERT', description: 'За каждого противника вы получаете 13 деталей вместо 9.', tag: 'ECONOMY', effect: 'killScrap', value: 13 },
  { id: 'blast_shield', name: 'BLAST SHIELD', description: 'Броня снижает весь получаемый урон на 22%.', tag: 'SURVIVAL', effect: 'damageTaken', value: .78 },
  { id: 'deadeye', name: 'DEADEYE', description: 'Умный прицел легче захватывает цель во время стремительного движения.', tag: 'COMBAT', effect: 'aimAssist', value: .17 },
  { id: 'executioner', name: 'EXECUTIONER', description: '+50% урона противникам, у которых осталось меньше 30% здоровья.', tag: 'COMBAT', effect: 'finisher', value: 1.5 },
  { id: 'storm_cell', name: 'STORM CELL', description: 'Радиус цепных молний увеличен с 10 до 16 метров.', tag: 'SYNERGY', effect: 'chainRadius', value: 16 },
  { id: 'momentum_bank', name: 'MOMENTUM BANK', description: 'Улучшенные подшипники дольше сохраняют накопленную скорость.', tag: 'MOVEMENT', effect: 'momentum', value: .88 },
];

export const DEFAULT_SETTINGS = Object.freeze({
  quality: 'high', renderScale: 1, shadows: true, clouds: true, particles: true,
  fov: 76, sensitivity: 1, cameraShake: .35, autoMantle: true, toggleSprint: false,
  master: .65, music: .35, sfx: .8,
});

export const WORKSHOP = [
  { id: 'armor', name: 'REINFORCED HARNESS', description: '+15 к максимальному здоровью в каждом забеге.', cost: 80, max: 4, glyph: '◇' },
  { id: 'engine', name: 'TUNED MAGNETS', description: '+8% к скорости спринта и мощности крюка.', cost: 100, max: 4, glyph: 'ϟ' },
  { id: 'magazine', name: 'EXPANDED RACK', description: '+10% к ёмкости магазина любого оружия.', cost: 90, max: 4, glyph: '▥' },
  { id: 'medbay', name: 'FIELD INFIRMARY', description: '+10 здоровья при аварийном спасении.', cost: 120, max: 4, glyph: '+' },
];

const SETTINGS_KEY = 'skyrail.settings.v1';
const MODES = ['PULL', 'SWING', 'SLINGSHOT', 'DRAG', 'RIP', 'LINK'];
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const clamp = (value, low, high) => Math.min(high, Math.max(low, Number(value) || 0));
const seconds = value => `${Math.floor((Number(value) || 0) / 60).toString().padStart(2, '0')}:${Math.floor((Number(value) || 0) % 60).toString().padStart(2, '0')}`;
const emblem = `<svg viewBox="0 0 80 80" aria-hidden="true"><path d="M11 58 40 11 69 58M24 58 40 31 56 58M17 67h46M40 44v32"/><path d="m6 39 11-3M63 36l11 3"/></svg>`;
const arrow = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19 19 5M6 5h13v13"/></svg>`;
const button = (action, title, detail = '', className = '', attrs = '') => `<button type="button" class="sr-button ${className}" data-action="${action}" ${attrs}><span>${title}${detail ? `<small>${detail}</small>` : ''}</span>${arrow}</button>`;

function readSettings() {
  let stored = {};
  try { stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); } catch { /* storage may be unavailable */ }
  const settings = { ...DEFAULT_SETTINGS };
  for (const key of Object.keys(settings)) {
    if (typeof stored?.[key] === typeof settings[key]) settings[key] = stored[key];
  }
  if (!['low', 'medium', 'high', 'ultra'].includes(settings.quality)) settings.quality = 'high';
  const ranges = { renderScale: [.5, 1.5], fov: [55, 105], sensitivity: [.2, 2.5], cameraShake: [0, 1], master: [0, 1], music: [0, 1], sfx: [0, 1] };
  for (const [key, [min, max]] of Object.entries(ranges)) settings[key] = clamp(settings[key], min, max);
  return settings;
}

export function createUI(callbacks = {}) {
  const root = document.createElement('div');
  root.id = 'ui';
  root.innerHTML = '<div id="sr-screen"></div><div class="sr-toasts" aria-live="polite" aria-atomic="false"></div>';
  document.body.appendChild(root);
  const screenEl = root.querySelector('#sr-screen');
  const toasts = root.querySelector('.sr-toasts');
  const settings = readSettings();
  let screen = 'menu';
  const navigation = [];
  let save = null;
  let screenData = {};
  let live = {};
  let selectedWeapon = 0;
  let settingTab = 'graphics';
  let refs = {};
  let focusBefore = null;
  let lastHealth = null;

  const invoke = (name, ...args) => callbacks[name]?.(...args);
  const scrap = () => Number(save?.scrap ?? save?.bank ?? screenData.scrap ?? 0);
  const workshopLevel = id => Number((save?.workshop ?? save?.permanent)?.[id] || 0);
  const canContinue = () => Boolean(save?.canContinue ?? save?.activeRun ?? save?.checkpoint ?? save?.run ?? save?.hasRun);
  const footer = `<footer class="sr-footer"><span>SKYRAIL <i>•</i> INDEPENDENT AIRWAYS</span><span>ДВИЖЕНИЕ — ВАШЕ ПРЕИМУЩЕСТВО</span><span>H <i>/</i> FIELD GUIDE</span></footer>`;
  const masthead = `<div class="sr-masthead"><div class="sr-small-emblem">${emblem}</div><span>INDEPENDENT<br>AIRWAYS</span><span class="sr-masthead-end">EST. ABOVE THE CLOUDS</span></div>`;

  function pageTop(code, title, description, extra = '') {
    return `${masthead}<div class="sr-page-heading"><div><span class="sr-eyebrow">${code}</span><h1>${title}</h1>${description ? `<p>${description}</p>` : ''}</div>${extra}</div>`;
  }

  function renderMenu() {
    return `<section class="sr-menu sr-screen" aria-label="Главное меню">
      ${masthead}
      <div class="sr-menu-body"><div class="sr-kicker"><span class="sr-live-dot"></span> THE SKY HAS NO BORDERS</div>
      <h1 class="sr-title">SKYRAIL<span class="sr-title-mark">®</span></h1>
      <div class="sr-title-caption"><span>A HIGH-VELOCITY ADVENTURE</span><span>01 — THE IRON RUN</span></div>
      <nav class="sr-main-nav" aria-label="Главное меню">
        ${button('continue', '<span class="sr-nav-number">01</span>CONTINUE', '', '', canContinue() ? '' : 'disabled aria-label="Continue — нет сохранённого забега"')}
        ${button('start', '<span class="sr-nav-number">02</span>NEW RUN', 'Следующий состав не будет ждать.', 'sr-primary')}
        ${button('loadout', '<span class="sr-nav-number">03</span>LOADOUT')}
        ${button('workshop', '<span class="sr-nav-number">04</span>WORKSHOP')}
        ${button('settings', '<span class="sr-nav-number">05</span>SETTINGS')}
        ${button('quit', '<span class="sr-nav-number">06</span>QUIT')}
      </nav></div>
      <aside class="sr-world-caption" aria-label="Название маршрута"><span class="sr-eyebrow">DEPARTURE / NORTHLINE</span><strong>THE IRON RUN</strong><p>Последний вагон. Первый шаг.<br>Весь мир — под ногами.</p><div class="sr-world-rule"><span>FREIGHT CORRIDOR 07</span><span>↗</span></div></aside>
      ${footer}</section>`;
  }

  function renderHUD() {
    return `<section class="sr-hud" aria-label="Игровой интерфейс">
      <div class="sr-objective"><span class="sr-eyebrow" data-ref="location">01 / THE IRON RUN</span><h2 data-ref="objective">TARGET: CARGO 07</h2><p data-ref="subobjective">Зацепитесь за последний вагон.</p><div class="sr-mission-track"><span data-ref="progress"></span></div></div>
      <div class="sr-run-info"><span><b data-ref="scrap">0</b><small>SALVAGE</small></span><span><b data-ref="kills">0</b><small>TAKEDOWNS</small></span><span><b data-ref="elapsed">00:00</b><small>RUN TIME</small></span></div>
      <div class="sr-boss" data-ref="boss" hidden><div><span>THE ADMIRAL</span><span data-ref="bossPhase">PHASE 01</span></div><div class="sr-boss-track"><i data-ref="bossHealth"></i></div></div>
      <div class="sr-reticle" data-ref="reticle"><i></i><i></i><i></i><i></i><b></b></div>
      <div class="sr-target" data-ref="target" hidden><span class="sr-target-bracket">⌖</span><span data-ref="hookTarget"></span><strong data-ref="hookDistance"></strong></div>
      <div class="sr-combo" data-ref="combo" hidden></div>
      <div class="sr-hint" data-ref="hint"></div>
      <div class="sr-player-instruments"><div class="sr-health-head"><span class="sr-eyebrow">VITAL SYSTEMS</span><span><b data-ref="health">100</b><small>/ <span data-ref="maxHealth">100</span></small></span></div><div class="sr-health-track"><span data-ref="healthFill"></span></div>
        <div class="sr-weapon-readout"><div><span class="sr-eyebrow">ACTIVE WEAPON</span><strong data-ref="weapon">REPEATER</strong><span class="sr-reload-hint">R <i>/</i> RELOAD</span></div><div class="sr-ammo"><b data-ref="ammo">16</b><small>/ <span data-ref="maxAmmo">16</span></small></div></div>
        <div class="sr-weapon-slots">${WEAPONS.map((weapon, index) => `<span class="sr-weapon-slot ${index === 0 ? 'is-active' : ''}" data-slot="${index}" title="${weapon.name}"><b>${index + 1}</b><i>${weapon.glyph}</i></span>`).join('')}</div>
      </div>
      <div class="sr-grapple-instrument"><span class="sr-eyebrow">MAGNETIC LINE / <b data-ref="grappleStatus">READY</b></span><div class="sr-grapple-mode"><span class="sr-key">E</span><strong data-ref="grappleMode">PULL</strong><span class="sr-mode-switch">Q<br><small>MODE</small></span></div><div class="sr-mode-dots">${MODES.map((_, index) => `<i data-mode="${index}" class="${index === 0 ? 'is-active' : ''}"></i>`).join('')}</div><span class="sr-dash-status" data-ref="dash">AIR DASH / READY</span></div>
      <div class="sr-speed-instrument"><svg class="sr-speed-arc" viewBox="0 0 200 180" aria-hidden="true"><path d="M30 145a83 83 0 1 1 140 0" class="sr-speed-track"/><path d="M30 145a83 83 0 1 1 140 0" class="sr-speed-fill" data-ref="speedArc"/><path d="m34 144 7-5m-14-16 8-3m-10-20h9m-6-22 9 3m-1-24 8 5m7-23 6 7m14-20 3 9m17-16v10m21-9-2 9m22-3-4 8m21 3-6 7m18 12-8 4m13 20-9 1m6 20-9-1m1 22-8-4" class="sr-speed-ticks"/></svg><span class="sr-eyebrow">TRUE AIRSPEED</span><strong data-ref="speed">000</strong><span class="sr-speed-unit">KM/H</span><div class="sr-speed-caption">KEEP YOUR MOMENTUM</div></div>
      <div class="sr-controls-ribbon"><span><kbd>W A S D</kbd> MOVE</span><span><kbd>SPACE</kbd> JUMP ×2</span><span><kbd>SHIFT</kbd> SPRINT</span><span><kbd>E</kbd> GRAPPLE</span><span><kbd>H</kbd> GUIDE</span></div>
      <div class="sr-damage-flash" data-ref="damage"></div>
    </section>`;
  }

  function renderPause() {
    return `<section class="sr-panel-screen sr-screen">${pageTop('FLIGHT RECORDER / PAUSED', 'HOLD POSITION', 'Небо подождёт. Ваш маршрут сохранён.')}
      <div class="sr-pause-body"><nav class="sr-action-stack">${button('resume', 'RESUME FLIGHT', 'Вернуться в полёт', 'sr-primary')}${button('settings', 'SETTINGS')}${button('controls', 'FIELD GUIDE')}${button('menu', 'MAIN MENU', 'Сохранить и вернуться в меню')}</nav><div class="sr-pause-note"><span class="sr-eyebrow">RAIDER’S NOTE / 07</span><blockquote>Не боритесь<br>со скоростью.<br><em>Сохраните её.</em></blockquote><p>Прыжок сохраняет инерцию платформы.<br>Трос превращает высоту в скорость.</p></div></div>${footer}</section>`;
  }

  function renderLoadout() {
    const weapon = WEAPONS[selectedWeapon] || WEAPONS[0];
    return `<section class="sr-panel-screen sr-screen">${pageTop('FLIGHT PREPARATION / 01', 'THE WEAPON RACK', 'Пять инструментов для сложных посадок. Выберите стартовое оружие.')}
      <div class="sr-loadout-layout"><div class="sr-weapon-list" role="group" aria-label="Стартовое оружие">${WEAPONS.map((item, index) => `<button class="sr-weapon-choice ${index === selectedWeapon ? 'is-selected' : ''}" data-action="weapon" data-index="${index}" aria-pressed="${index === selectedWeapon}"><span class="sr-weapon-number">0${index + 1}</span><span><small>${item.type}</small><strong>${item.name}</strong></span><span class="sr-selection-mark">${index === selectedWeapon ? '✓' : '↗'}</span></button>`).join('')}</div>
      <article class="sr-weapon-detail"><span class="sr-eyebrow">AIRWORTHY EQUIPMENT / MK. I</span><div class="sr-weapon-illustration" aria-hidden="true"><svg viewBox="0 0 440 190"><defs><pattern id="blueprint-grid" width="22" height="22" patternUnits="userSpaceOnUse"><path d="M22 0H0V22" fill="none" stroke="currentColor" stroke-width=".4" opacity=".4"/></pattern></defs><rect width="440" height="190" fill="url(#blueprint-grid)"/><g class="sr-blueprint-gun"><path d="M50 87h80l20-13h124v-8h70v11h53v10h-53v11h-74l-11 18h-18v32h-31l-6-41h-30l-18 24h-18l7-37H83l-10 17H50z"/><path d="M166 74v33m99-33v32m-78-20h54m-87 8h86m-36 13h45m38-31v23m10-23v23m10-23v23m10-23v23M85 87v18"/><circle cx="250" cy="85" r="5"/><path d="M35 55h370M35 50v10m370-10v10M420 75v69m-5-69h10m-10 69h10" class="sr-dimension-line"/></g><text x="35" y="43">${esc(weapon.type)}</text><text x="310" y="165">SR / 0${selectedWeapon + 1} / ${weapon.ammo}R</text></svg></div>
        <span class="sr-eyebrow">${esc(weapon.specialty)}</span><h2>${weapon.name}</h2><p>${weapon.description}</p><dl class="sr-weapon-stats"><div><dt>УРОН</dt><dd>${weapon.damage}</dd></div><div><dt>МАГАЗИН</dt><dd>${weapon.ammo}</dd></div><div><dt>ДАЛЬНОСТЬ</dt><dd>${weapon.range}<small>м</small></dd></div><div><dt>ПЕРЕЗАРЯДКА</dt><dd>${weapon.reload}<small>с</small></dd></div></dl><p class="sr-equipped-note">✓ EQUIPPED FOR DEPARTURE <span>Все пять видов доступны во время забега: 1–5.</span></p>
      </article></div><div class="sr-bottom-actions">${button('back', '← BACK', '', 'sr-quiet')}${button('start', 'START NEW RUN', '', 'sr-primary')}</div>${footer}</section>`;
  }

  function renderWorkshop() {
    return `<section class="sr-panel-screen sr-screen">${pageTop('HOME BASE / PERMANENT UPGRADES', 'THE WORKSHOP', 'Снаряжение остаётся с вами. Даже когда забег заканчивается.', `<div class="sr-salvage-balance"><span class="sr-eyebrow">AVAILABLE SALVAGE</span><strong>${scrap()}<small>SC</small></strong></div>`)}
      <div class="sr-workshop-list">${WORKSHOP.map((item, index) => {
        const level = workshopLevel(item.id);
        const cost = Math.round(item.cost * (level + 1));
        const maxed = level >= item.max;
        return `<article class="sr-workshop-row"><span class="sr-workshop-glyph" aria-hidden="true">${item.glyph}</span><div class="sr-workshop-copy"><span class="sr-eyebrow">BAY 0${index + 1} / ${maxed ? 'FULLY UPGRADED' : 'ENGINEERING'}</span><h2>${item.name}</h2><p>${item.description}</p></div><div class="sr-workshop-level"><span>LEVEL ${level} / ${item.max}</span><div>${Array.from({ length: item.max }, (_, i) => `<i class="${i < level ? 'is-active' : ''}"></i>`).join('')}</div></div><button class="sr-purchase ${maxed || scrap() < cost ? '' : 'is-affordable'}" data-action="purchase" data-id="${item.id}" ${maxed || scrap() < cost ? 'disabled' : ''}>${maxed ? 'MAX LEVEL' : `<b>${cost} <small>SC</small></b><span>${scrap() < cost ? 'НЕДОСТАТОЧНО МЕТАЛЛА' : 'INSTALL UPGRADE ↗'}</span>`}</button></article>`;
      }).join('')}</div><div class="sr-bottom-actions">${button('back', '← BACK', '', 'sr-quiet')}<p class="sr-footnote">Собирайте металл в вагонах, побеждайте охрану и завершайте маршруты.</p></div>${footer}</section>`;
  }

  function renderUpgrades() {
    const all = screenData.choices ?? screenData.upgrades ?? UPGRADES.slice(0, 3);
    const choices = all.map(item => typeof item === 'string' ? UPGRADES.find(upgrade => upgrade.id === item) : item).filter(Boolean);
    return `<section class="sr-panel-screen sr-screen sr-choice-screen">${pageTop('FIELD MODIFICATION / CHOOSE ONE', 'MAKE IT YOURS', 'Одна модификация. Новый способ пересечь небо.')}
      <div class="sr-upgrade-options">${choices.map((item, index) => `<button class="sr-upgrade-card" data-action="upgrade" data-id="${esc(item.id)}"><span class="sr-upgrade-index">0${index + 1}<span>↗</span></span><span class="sr-upgrade-tag">${esc(item.tag || 'MODIFICATION')}</span><h2>${esc(item.name)}</h2><p>${esc(item.description)}</p><span class="sr-upgrade-select">INSTALL MODIFICATION ${arrow}</span></button>`).join('')}</div><p class="sr-choice-footnote">Модификация действует до конца текущего забега. Комбинируйте эффекты.</p>${footer}</section>`;
  }

  function renderRoutes() {
    const routes = screenData.routes ?? screenData.choices ?? [];
    return `<section class="sr-panel-screen sr-screen sr-choice-screen">${pageTop('RAIL JUNCTION / NEXT DESTINATION', 'CHOOSE YOUR LINE', 'У каждого пути своя цена. И своя награда.')}
      <div class="sr-route-options">${routes.map((route, index) => `<button class="sr-route-card" data-action="route" data-id="${esc(route.id)}"><div class="sr-route-line"><span>LINE 0${index + 1}</span><i>${['↖', '↑', '↗'][index % 3]}</i></div><span class="sr-eyebrow">${esc(route.biome ?? route.tag ?? 'UNEXPLORED CORRIDOR')}</span><h2>${esc(route.name ?? route.title ?? route.id)}</h2><p>${esc(route.description)}</p><dl><div><dt>THREAT</dt><dd>${esc(route.risk ?? route.difficulty ?? 'UNKNOWN')}</dd></div><div><dt>REWARD</dt><dd>${esc(route.reward ?? 'SALVAGE + MOD')}</dd></div></dl><span class="sr-route-select">SET COURSE ${arrow}</span></button>`).join('') || '<p class="sr-empty">Диспетчер подготавливает следующий маршрут…</p>'}</div>${footer}</section>`;
  }

  function renderHub() {
    return `<section class="sr-panel-screen sr-screen sr-hub-screen">${pageTop('HOME / WAYFARER STATION', 'A PLACE TO LAND', 'Ваш маленький остров над большим миром.', `<div class="sr-salvage-balance"><span class="sr-eyebrow">SALVAGE RESERVE</span><strong>${scrap()}<small>SC</small></strong></div>`)}
      <div class="sr-hub-layout"><nav class="sr-hub-nav">${button('start', 'THE DEPARTURE DECK', 'Новый забег / The Iron Run', 'sr-primary')}${button('workshop', 'THE WORKSHOP', 'Постоянные улучшения базы')}${button('loadout', 'THE WEAPON RACK', 'Подготовка снаряжения')}${button('controls', 'THE FIELD GUIDE', 'Движение, бой, магнитный трос')}${button('menu', 'MAIN MENU')}</nav><aside class="sr-hub-log"><span class="sr-eyebrow">YOUR FLIGHT RECORD</span><div class="sr-hub-emblem">${emblem}</div><dl><div><dt>ЗАВЕРШЁННЫЕ ЗАБЕГИ</dt><dd>${Number(save?.runs ?? save?.totalRuns ?? 0)}</dd></div><div><dt>ПОБЕДЫ</dt><dd>${Number(save?.wins ?? 0)}</dd></div><div><dt>УЛУЧШЕНИЯ БАЗЫ</dt><dd>${WORKSHOP.reduce((sum, item) => sum + workshopLevel(item.id), 0)}</dd></div></dl><p>«Если ещё слышишь ветер —<br>значит, всё только начинается.»<span>— THE MECHANIC</span></p></aside></div>${footer}</section>`;
  }

  function renderEnding(victory) {
    const data = { ...live, ...screenData };
    return `<section class="sr-panel-screen sr-screen sr-ending ${victory ? 'is-victory' : ''}">${masthead}<div class="sr-ending-body"><span class="sr-eyebrow">FLIGHT RECORDER / ${victory ? 'CONTRACT COMPLETE' : 'SIGNAL LOST'}</span><h1>${victory ? 'THE SKY<br>IS YOURS.' : 'ONE MORE<br>FLIGHT.'}</h1><p>${victory ? 'Адмирал пал. Груз наш. Небо всё ещё бесконечно.' : esc(data.reason ?? 'Гравитация выиграла этот раунд. Мастерская ждёт вас.')}</p><dl class="sr-ending-stats"><div><dt>TIME ALOFT</dt><dd>${seconds(data.elapsed)}</dd></div><div><dt>TAKEDOWNS</dt><dd>${Number(data.kills || 0)}</dd></div><div><dt>SALVAGE</dt><dd>${Number(data.scrap || 0)}<small>SC</small></dd></div><div><dt>MODIFICATIONS</dt><dd>${Array.isArray(data.upgrades) ? data.upgrades.length : Number(data.upgrades || 0)}</dd></div></dl><div class="sr-ending-actions">${button(victory ? 'hub' : 'retry', victory ? 'RETURN TO BASE' : 'FLY AGAIN', '', 'sr-primary')}${button(victory ? 'retry' : 'hub', victory ? 'ANOTHER RUN' : 'THE WORKSHOP', '', 'sr-quiet')}</div></div><div class="sr-ending-emblem">${emblem}</div>${footer}</section>`;
  }

  function slider(key, label, description, min, max, step, format = value => `${Math.round(value * 100)}%`) {
    return `<div class="sr-setting-row"><label for="sr-${key}"><strong>${label}</strong><small>${description}</small></label><div class="sr-slider-control"><input id="sr-${key}" data-setting="${key}" type="range" min="${min}" max="${max}" step="${step}" value="${settings[key]}"><output for="sr-${key}" data-output="${key}">${format(settings[key])}</output></div></div>`;
  }
  function toggle(key, label, description) {
    return `<div class="sr-setting-row"><label for="sr-${key}"><strong>${label}</strong><small>${description}</small></label><label class="sr-toggle"><input id="sr-${key}" data-setting="${key}" type="checkbox" ${settings[key] ? 'checked' : ''}><span aria-hidden="true"></span><b>${settings[key] ? 'ON' : 'OFF'}</b></label></div>`;
  }
  function renderSettings() {
    let content = '';
    if (settingTab === 'graphics') content = `<div class="sr-setting-row"><label for="sr-quality"><strong>QUALITY PRESET</strong><small>Баланс детализации и производительности.</small></label><select id="sr-quality" data-setting="quality">${['low', 'medium', 'high', 'ultra'].map(value => `<option value="${value}" ${settings.quality === value ? 'selected' : ''}>${value.toUpperCase()}</option>`).join('')}</select></div>${slider('renderScale', 'RENDER SCALE', 'Разрешение сцены. Интерфейс остаётся чётким.', .5, 1.5, .1)}${toggle('shadows', 'DYNAMIC SHADOWS', 'Тени от персонажей и транспорта.')}${toggle('clouds', 'CLOUDSCAPE', 'Слои объёмных облаков и дальняя атмосфера.')}${toggle('particles', 'PARTICLE EFFECTS', 'Искры, дым, следы и атмосферные частицы.')}<div class="sr-setting-row"><div><strong>DISPLAY</strong><small>${window.innerWidth} × ${window.innerHeight} · адаптивное разрешение</small></div><button class="sr-inline-button" data-action="fullscreen">${document.fullscreenElement ? 'EXIT FULLSCREEN' : 'FULLSCREEN ↗'}</button></div>`;
    if (settingTab === 'gameplay') content = `${slider('sensitivity', 'MOUSE SENSITIVITY', 'Чувствительность камеры.', .2, 2.5, .1, value => `${value.toFixed(1)}×`)}${slider('fov', 'FIELD OF VIEW', 'Базовый угол обзора. Увеличивается на скорости.', 55, 105, 1, value => `${Math.round(value)}°`)}${slider('cameraShake', 'CAMERA SHAKE', 'Сила отклика камеры на действия.', 0, 1, .05)}${toggle('autoMantle', 'AUTO MANTLE', 'Автоматически подтягиваться за край платформы.')}${toggle('toggleSprint', 'TOGGLE SPRINT', 'Нажатие переключает бег вместо удержания Shift.')}<div class="sr-setting-row"><div><strong>FLIGHT CONTROLS</strong><small>Все приёмы движения, боя и троса.</small></div><button class="sr-inline-button" data-action="controls">FIELD GUIDE ↗</button></div>`;
    if (settingTab === 'audio') content = `${slider('master', 'MASTER VOLUME', 'Общая громкость.', 0, 1, .05)}${slider('music', 'MUSIC', 'Адаптивная музыка полёта и боя.', 0, 1, .05)}${slider('sfx', 'SOUND EFFECTS', 'Двигатели, ветер, трос, оружие и окружение.', 0, 1, .05)}<div class="sr-audio-note"><span class="sr-live-dot"></span> HEADPHONES RECOMMENDED<p>Слушайте, откуда приближается следующий состав.</p></div>`;
    return `<section class="sr-panel-screen sr-screen">${pageTop('FLIGHT SYSTEMS / CONFIGURATION', 'FINE TUNING', 'Изменения применяются сразу и сохраняются автоматически.')}<div class="sr-settings-layout"><nav class="sr-settings-tabs" aria-label="Разделы настроек">${[['graphics', '01', 'GRAPHICS'], ['gameplay', '02', 'GAMEPLAY'], ['audio', '03', 'AUDIO']].map(([id, number, name]) => `<button data-action="settingtab" data-id="${id}" class="${settingTab === id ? 'is-selected' : ''}" aria-pressed="${settingTab === id}"><span>${number}</span>${name}<i>↗</i></button>`).join('')}</nav><div class="sr-settings-content">${content}</div></div><div class="sr-bottom-actions">${button('back', '← BACK', '', 'sr-quiet')}<button class="sr-text-button" data-action="resetsettings">RESTORE DEFAULTS</button></div>${footer}</section>`;
  }

  function renderControls() {
    const groups = [
      ['MOVEMENT', [['W A S D', 'Движение'], ['MOUSE', 'Обзор и прицеливание'], ['SHIFT', 'Спринт'], ['SPACE', 'Прыжок / двойной прыжок'], ['CTRL', 'Подкат'], ['C', 'Воздушный рывок'], ['SPACE + WALL', 'Бег по стене / прыжок от стены'], ['RAIL EDGE', 'Автоматический grind у края вагона']]],
      ['MAGNETIC GRAPPLE', [['E', 'Зацепиться / отпустить трос'], ['Q', 'Сменить режим крюка'], ['PULL', 'Притянуть себя к точке'], ['SWING', 'Раскачиваться на тросе'], ['SLINGSHOT', 'Удерживать E, затем отпустить'], ['DRAG', 'Притянуть противника'], ['RIP', 'Вырвать щит или бронепанель'], ['LINK', 'Соединить два объекта']]],
      ['COMBAT & FLIGHT', [['LMB', 'Огонь'], ['RMB / ← →', 'Поворот камеры без захвата мыши'], ['R', 'Перезарядка'], ['X', 'Ближний бой'], ['1 — 5', 'Смена оружия'], ['F', 'Подобрать / активировать'], ['ESC', 'Пауза'], ['H', 'Этот справочник']]],
    ];
    return `<section class="sr-panel-screen sr-screen">${pageTop('RAIDER HANDBOOK / KEEP IT CLOSE', 'THE FIELD GUIDE', 'Скорость сохраняется в воздухе. Комбинируйте прыжки, трос и рельсы.')}<div class="sr-controls-groups">${groups.map(([name, rows]) => `<section><h2>${name}</h2>${rows.map(([key, explanation]) => `<div class="sr-control-row"><kbd>${key}</kbd><span>${explanation}</span></div>`).join('')}</section>`).join('')}</div><div class="sr-bottom-actions">${button('back', '← BACK', '', 'sr-quiet')}<p class="sr-footnote">При падении ищите магнитные точки: у вас ещё есть время спастись.</p></div>${footer}</section>`;
  }

  function renderQuit() {
    return `<section class="sr-panel-screen sr-screen">${pageTop('FLIGHT RECORDER / END OF SHIFT', 'UNTIL NEXT FLIGHT.', 'Прогресс сохранён. Можно закрыть вкладку или вернуться в небо.')}<div class="sr-quit-actions">${button('back', 'RETURN TO SKYRAIL', '', 'sr-primary')}${button('hub', 'VISIT HOME BASE', '', 'sr-quiet')}</div>${footer}</section>`;
  }

  function render() {
    root.dataset.screen = screen;
    const views = { menu: renderMenu, hud: renderHUD, pause: renderPause, settings: renderSettings, loadout: renderLoadout, workshop: renderWorkshop, upgrades: renderUpgrades, routes: renderRoutes, hub: renderHub, victory: () => renderEnding(true), death: () => renderEnding(false), controls: renderControls, quit: renderQuit };
    screenEl.innerHTML = (views[screen] || renderMenu)();
    refs = {};
    screenEl.querySelectorAll('[data-ref]').forEach(el => { refs[el.dataset.ref] = el; });
    if (screen === 'hud') {
      updateHUD();
    } else {
      requestAnimationFrame(() => {
        if (screen !== 'hud') screenEl.querySelector('button.sr-primary:not(:disabled), button:not(:disabled), select')?.focus({ preventScroll: true });
      });
    }
  }

  function show(nextScreen, data = {}) {
    if (nextScreen !== screen) toasts.replaceChildren();
    if (nextScreen !== screen && ['settings', 'loadout', 'workshop', 'controls', 'quit'].includes(nextScreen)) {
      navigation.push({ screen: screen === 'hud' ? 'pause' : screen, data: screenData });
    } else if (!['settings', 'loadout', 'workshop', 'controls', 'quit'].includes(nextScreen)) navigation.length = 0;
    if (screen === 'hud' && nextScreen !== 'hud') focusBefore = document.activeElement;
    screen = nextScreen;
    screenData = data;
    if (Number.isInteger(data.weaponIndex)) selectedWeapon = clamp(data.weaponIndex, 0, WEAPONS.length - 1);
    render();
    if (screen === 'hud') focusBefore?.blur?.();
  }

  function setText(name, value) {
    if (refs[name] && refs[name].textContent !== String(value)) refs[name].textContent = value;
  }

  function updateHUD() {
    if (screen !== 'hud') return;
    const health = Math.max(0, Number(live.health ?? 100));
    const maxHealth = Math.max(1, Number(live.maxHealth ?? 100));
    const speed = Math.max(0, Number(live.speed || 0)) * 3.6;
    const weaponIndex = Number(live.weaponIndex ?? selectedWeapon);
    const weapon = typeof live.weapon === 'object' ? live.weapon.name : live.weapon;
    setText('health', Math.ceil(health));
    setText('maxHealth', Math.ceil(maxHealth));
    refs.healthFill.style.width = `${clamp(health / maxHealth, 0, 1) * 100}%`;
    refs.healthFill.classList.toggle('is-critical', health / maxHealth < .3);
    if (lastHealth !== null && health < lastHealth) {
      refs.damage.classList.remove('is-active');
      void refs.damage.offsetWidth;
      refs.damage.classList.add('is-active');
    }
    lastHealth = health;
    setText('speed', Math.round(speed).toString().padStart(3, '0'));
    refs.speedArc.style.strokeDashoffset = String(417 - clamp(speed / 320, 0, 1) * 417);
    refs.speed.parentElement.classList.toggle('is-fast', speed >= 235);
    setText('ammo', live.reloading ? '··' : live.ammo ?? '—');
    setText('maxAmmo', live.maxAmmo ?? '—');
    setText('weapon', weapon ?? WEAPONS[weaponIndex]?.name ?? 'REPEATER');
    setText('scrap', Math.round(Number(live.scrap || 0)));
    setText('kills', live.kills || 0);
    setText('elapsed', seconds(live.elapsed));
    setText('objective', live.objective ?? 'TARGET: CARGO 07');
    setText('subobjective', live.subobjective ?? '');
    setText('location', `${String(live.act ?? 1).padStart(2, '0')} / ${live.location ?? 'THE IRON RUN'}`);
    const progress = Number(live.progress || 0);
    refs.progress.style.width = `${clamp(progress > 1 ? progress / 100 : progress, 0, 1) * 100}%`;
    const mode = typeof live.grappleMode === 'number' ? MODES[live.grappleMode] : String(live.grappleMode || 'PULL').toUpperCase();
    setText('grappleMode', mode);
    setText('grappleStatus', live.grappleReady === false ? 'CHARGING' : 'READY');
    root.querySelectorAll('[data-mode]').forEach(el => el.classList.toggle('is-active', MODES[Number(el.dataset.mode)] === mode));
    setText('dash', Number(live.dashCooldown) > .1 ? `AIR DASH / ${Number(live.dashCooldown).toFixed(1)}s` : 'AIR DASH / READY');
    root.querySelectorAll('[data-slot]').forEach(el => el.classList.toggle('is-active', Number(el.dataset.slot) === weaponIndex));
    const rawTarget = typeof live.hookTarget === 'object' && live.hookTarget ? live.hookTarget.name ?? live.hookTarget.label : live.hookTarget;
    const target = rawTarget === 'NO TARGET' ? null : rawTarget;
    refs.target.hidden = !target;
    setText('hookTarget', target || '');
    setText('hookDistance', live.hookDistance != null ? `${Math.round(Number(live.hookDistance))} M` : '');
    refs.reticle.classList.toggle('has-target', Boolean(target));
    refs.reticle.classList.toggle('is-hit', Boolean(live.hitMarker));
    refs.combo.hidden = !(Number(live.combo) > 1);
    setText('combo', `×${Number(live.combo || 0)} FLOW`);
    refs.boss.hidden = !(Number(live.bossMax) > 0 && Number(live.bossHealth) > 0);
    refs.bossHealth.style.width = `${clamp(Number(live.bossHealth || 0) / Math.max(1, Number(live.bossMax || 1)), 0, 1) * 100}%`;
    setText('bossPhase', `PHASE ${String(live.bossPhase || 1).padStart(2, '0')}`);
    refs.hint.hidden = !live.hint;
    setText('hint', live.hint || '');
    root.querySelector('.sr-controls-ribbon').classList.toggle('is-subtle', Number(live.elapsed) > 45);
  }

  function update(data = {}) {
    live = { ...live, ...data };
    updateHUD();
  }

  function toast(title, subtitle = '', kind = 'info') {
    const el = document.createElement('div');
    el.className = `sr-toast sr-toast-${kind === 'error' ? 'error' : kind === 'success' ? 'success' : 'info'}`;
    el.innerHTML = `<span class="sr-toast-mark">${kind === 'error' ? '!' : kind === 'success' ? '✓' : '↗'}</span><div><strong>${esc(title)}</strong>${subtitle ? `<p>${esc(subtitle)}</p>` : ''}</div>`;
    toasts.appendChild(el);
    while (toasts.children.length > 3) toasts.firstElementChild.remove();
    setTimeout(() => { el.classList.add('is-leaving'); setTimeout(() => el.remove(), 350); }, 3800);
  }

  function setSave(data) {
    save = data;
    if (Number.isInteger(data?.weaponIndex)) selectedWeapon = clamp(data.weaponIndex, 0, WEAPONS.length - 1);
    if (['menu', 'hub', 'workshop', 'loadout'].includes(screen)) render();
  }

  function applySettings() {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* settings still apply for the session */ }
    invoke('onSettings', { ...settings });
  }

  root.addEventListener('input', event => {
    const input = event.target.closest('[data-setting]');
    if (!input) return;
    const key = input.dataset.setting;
    settings[key] = input.type === 'checkbox' ? input.checked : input.tagName === 'SELECT' ? input.value : Number(input.value);
    const output = root.querySelector(`[data-output="${key}"]`);
    if (output) output.value = key === 'fov' ? `${Math.round(settings[key])}°` : key === 'sensitivity' ? `${settings[key].toFixed(1)}×` : `${Math.round(settings[key] * 100)}%`;
    if (input.type === 'checkbox') input.parentElement.querySelector('b').textContent = input.checked ? 'ON' : 'OFF';
    applySettings();
  });

  root.addEventListener('click', async event => {
    const target = event.target.closest('[data-action]');
    if (!target || target.disabled) return;
    const action = target.dataset.action;
    if (action === 'start') invoke('onStart');
    else if (action === 'continue') invoke('onContinue');
    else if (action === 'resume') invoke('onResume');
    else if (action === 'menu') invoke('onMenu');
    else if (action === 'hub') invoke('onHub');
    else if (action === 'retry') invoke('onRetry');
    else if (action === 'back') { const previous = navigation.pop() ?? { screen: 'menu', data: {} }; screen = previous.screen; screenData = previous.data; toasts.replaceChildren(); render(); }
    else if (['settings', 'loadout', 'workshop', 'controls', 'quit'].includes(action)) show(action);
    else if (action === 'weapon') { selectedWeapon = Number(target.dataset.index); invoke('onWeapon', selectedWeapon); render(); }
    else if (action === 'upgrade') invoke('onUpgrade', target.dataset.id);
    else if (action === 'route') invoke('onRoute', target.dataset.id);
    else if (action === 'purchase') invoke('onWorkshop', target.dataset.id);
    else if (action === 'settingtab') { settingTab = target.dataset.id; render(); }
    else if (action === 'resetsettings') { Object.assign(settings, DEFAULT_SETTINGS); applySettings(); render(); toast('FACTORY SETTINGS', 'Настройки восстановлены.'); }
    else if (action === 'fullscreen') {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else await document.documentElement.requestFullscreen();
        if (screen === 'settings') render();
      } catch { toast('DISPLAY UNAVAILABLE', 'Полноэкранный режим недоступен в этом окне.', 'error'); }
    }
  });

  // Menus keep keyboard focus inside the visible UI without intercepting game keys.
  root.addEventListener('keydown', event => {
    if (event.key !== 'Tab' || screen === 'hud') return;
    const elements = [...screenEl.querySelectorAll('button:not(:disabled), input, select, [tabindex="0"]')];
    const first = elements[0];
    const last = elements.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  });

  show('menu');
  return { show, update, toast, setSave, getSettings: () => ({ ...settings }), getScreen: () => screen, get screen() { return screen; }, get element() { return root; } };
}
