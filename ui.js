/* ===== СЮЖЕТНЫЕ МОДАЛКИ И ТРОФЕИ ===== */
let storyOnClose = null;

function showStory(key, onCloseCb = null, onlyOnce = true) {
    let ev = STORY_EVENTS[key];
    if (!ev) { if (onCloseCb) onCloseCb(); return; }
    if (onlyOnce && state.seenStories.includes(key)) {
        if (onCloseCb) onCloseCb();
        return;
    }
    if (onlyOnce && !state.seenStories.includes(key)) {
        state.seenStories.push(key);
        localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    }
    storyOnClose = onCloseCb;
    document.getElementById('story-speaker').innerText = ev.icon;
    document.getElementById('story-title').innerText = ev.title;
    document.getElementById('story-text').innerHTML = ev.text;
    document.getElementById('story-modal').style.display = 'flex';
}

function showCustomStory(ev, onCloseCb = null) {
    if (!ev) { if (onCloseCb) onCloseCb(); return; }
    storyOnClose = onCloseCb;
    let spk = document.getElementById('story-speaker');
    let ttl = document.getElementById('story-title');
    let txt = document.getElementById('story-text');
    let mod = document.getElementById('story-modal');
    if (spk) spk.innerText = ev.icon || '📜';
    if (ttl) ttl.innerText = ev.title || 'Сюжет';
    if (txt) txt.innerHTML = ev.text || '';
    if (mod) mod.style.display = 'flex';
}
window.showCustomStory = showCustomStory;

function showFeatureToast(msg, duration = 5500) {
    let container = document.getElementById('feature-toast-container');
    if (!container) {
        let t = document.getElementById('feature-toast');
        if (!t) return;
        t.innerHTML = msg;
        t.classList.remove('hidden');
        t.classList.add('visible');
        clearTimeout(t._toastTimer);
        t._toastTimer = setTimeout(() => {
            t.classList.remove('visible');
            t.classList.add('hidden');
        }, duration);
        return;
    }
    let toast = document.createElement('div');
    toast.className = 'feature-toast-item visible';
    toast.innerHTML = msg;
    toast.onclick = () => {
        toast.classList.remove('visible');
        toast.classList.add('hidden');
        setTimeout(() => toast.remove(), 250);
    };
    container.appendChild(toast);
    setTimeout(() => {
        if (toast.parentNode) {
            toast.classList.remove('visible');
            toast.classList.add('hidden');
            setTimeout(() => toast.remove(), 250);
        }
    }, duration);
}
window.showFeatureToast = showFeatureToast;

function setTabBadge(tabId, hasBadge) {
    let b = document.getElementById('nav-' + tabId);
    if (!b) return;
    b.classList.toggle('has-dot', !!hasBadge);
}
window.setTabBadge = setTabBadge;

function closeStoryModal() {
    document.getElementById('story-modal').style.display = 'none';
    let cb = storyOnClose;
    storyOnClose = null;
    if (cb) cb();
}

function openRelicsModal() {
    let list = document.getElementById('relics-list');
    list.innerHTML = '';
    CAMPAIGN_ACTS.forEach(act => {
        let rel = RELICS_DB[act.relicId];
        let owned = state.relics.includes(act.relicId);
        if (owned) {
            list.innerHTML += `<div class="relic-chip">
                <div style="color:gold; margin-bottom:4px;">${rel.icon} ${rel.name}</div>
                <div style="color:#ddd; font-size:7px;">${rel.desc}</div>
            </div>`;
        } else {
            list.innerHTML += `<div class="card locked-card" style="padding:7px; margin-bottom:6px;">
                <div style="font-size:8px;">🔒 ??? — Босс Акта ${act.id} (Этап ${act.end})</div>
            </div>`;
        }
    });
    document.getElementById('relics-modal').style.display = 'flex';
}
function closeRelicsModal() { document.getElementById('relics-modal').style.display = 'none'; }

/* ===== НАВИГАЦИЯ И ОБЩИЙ UI ===== */
function updateNavLocks() {
    let f = (typeof getUnlockedFeatures === 'function') ? getUnlockedFeatures() : {
        forestTab: true, raidTab: true, shopTab: true, tavernTab: true, partyTab: true
    };
    let tabs = [
        { id: 'forest', unlocked: f.forestTab, btn: document.getElementById('nav-forest') },
        { id: 'shop',   unlocked: f.shopTab,   btn: document.getElementById('nav-shop') },
        { id: 'heroes', unlocked: f.tavernTab, btn: document.getElementById('nav-heroes') },
        { id: 'squad',  unlocked: f.partyTab,  btn: document.getElementById('nav-squad') },
        { id: 'raid',   unlocked: f.raidTab,   btn: document.getElementById('nav-raid') },
        { id: 'river',  unlocked: f.riverTab,  btn: document.getElementById('nav-river') }
    ];

    state.seenTabs = state.seenTabs || { forest: true };

    tabs.forEach(t => {
        if (!t.btn) return;
        if (!t.unlocked) {
            t.btn.style.display = 'none';
            setTabBadge(t.id, false);
        } else {
            t.btn.style.display = 'inline-block';
            let unseen = !state.seenTabs[t.id];
            setTabBadge(t.id, unseen);
        }
    });

    let relBtn = document.getElementById('btn-relics');
    if (relBtn) relBtn.style.display = (state.relics && state.relics.length > 0) ? 'inline-block' : 'none';
}

function switchTab(tabId, btn) {
    state.seenTabs = state.seenTabs || {};
    state.seenTabs[tabId] = true;
    setTabBadge(tabId, false);
    save();

    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    let tabEl = document.getElementById('tab-' + tabId);
    if (tabEl) tabEl.classList.add('active');
    if (btn) {
        btn.classList.add('active');
    } else {
        let navBtn = document.getElementById('nav-' + tabId);
        if (navBtn) navBtn.classList.add('active');
    }
    updateUI();
}

function updateUI() {
    let displayGold = state.gold > 1000000 ? (state.gold / 1000000).toFixed(1) + 'M' : state.gold;
    document.getElementById('gold-display').innerText = '💰 ' + displayGold;
    updateNavLocks();
    renderForestShop();
    renderRaidShop();
    renderHeroes();
    renderSquad();
    renderInventory();
    renderCampaign();
    let f = (typeof getUnlockedFeatures === 'function') ? getUnlockedFeatures() : null;
    if (typeof renderRiverUI === 'function' && f && f.riverTab) renderRiverUI();
    if (isForestActive() && state.forestUnlocked) updateForestUI();
}

function toggleInventory() {
    let el = document.getElementById('inventory-content');
    let hideBtn = document.getElementById('btn-hide-inv');
    let headerText = document.getElementById('inv-header-text');
    let isOpen = el && el.style.display !== 'none';
    if (isOpen) {
        if (el) el.style.display = 'none';
        if (hideBtn) hideBtn.style.display = 'none';
        if (headerText) headerText.innerHTML = '▸ 🎒 Общий инвентарь';
    } else {
        if (el) el.style.display = 'block';
        if (hideBtn) hideBtn.style.display = 'inline-block';
        if (headerText) headerText.innerHTML = '▾ 🎒 Общий инвентарь';
    }
}

/* ===== ОПИСАНИЕ ЭТАПОВ И ЭКРАН КАМПАНИИ ===== */
function getStageMeta(stage) {
    const special = {
        p1: { title:'Бешеная белка', icon:'🐿️', tag:'ПРОЛОГ • ЭТАП 1/4', isStory:true,
              desc:'Свен только переводит дух после первых крипов, как с ветки в лицо бросается бешеная белка с пеной у рта!', enemies:'🐿️ Бешеная белка (120 ЗД, 0 🛡️)' },
        p2: { title:'Лесной вепрь', icon:'🐗', tag:'ПРОЛОГ • ЭТАП 2/4', isStory:true,
              desc:'На запах костра из кустов выходит свирепый лесной вепрь, прикрытый прочной шкурой-щитами!', enemies:'🐗 Лесной вепрь (185 ЗД, 2 🛡️)' },
        p3: { title:'Костёр разбойников', icon:'🔥', tag:'ПРОЛОГ • ЭТАП 3/4', isStory:true,
              desc:'Разбойники у костра перекрыли путь: громила в 1-м ряду и лучник во 2-м ряду.', enemies:'🗡️ Разбойник (140 ЗД, 2 🛡️) + 🏹 Стрелок (105 ЗД, 1 🛡️)' },
        p4: { title:'Застава сержанта', icon:'🏰', tag:'ПРОЛОГ • ЭТАП 4/4', isBoss:true, isStory:true,
              desc:'Каменная застава перед выходом на тракт. Сержант и его оруженосец держат оборону!', enemies:'🛡️ Сержант (280 ЗД, 2 🛡️) + 🗡️ Оруженосец (135 ЗД, 1 🛡️)' },
        1:  { title:'Волчья стая', icon:'🐺', tag:'СЮЖЕТ • СТАЯ ХИЩНИКОВ', isStory:true,
              desc:'На опушке тракта рыщет волчья стая во главе с матёрым вожаком. Одолейте волков, чтобы расчистить тракт!', enemies:'🐺 Лесной вожак (200 ЗД, 2 🛡️) + 🐺 Лесной волк (175 ЗД, 1 🛡️)' },
        5:  { title:'БОСС АКТА 1: Банда разбойников', icon:'🥷', tag:'БОСС АКТА 1', isBoss:true, isStory:true,
              desc:'Шайка разбойников во главе с Баунти Хантером. Награда: 🚩 Знамя Изгнанника (+4-й слот, Мидас, Средний лес).', enemies:'🥷 Баунти Хантер + 2 разбойника' },
        6:  { title:'Колючая спина', icon:'🦔', tag:'СЮЖЕТ • СТЕНА ЩИТОВ', isStory:true,
              desc:'Бристлбэк прячется за 8 щитами и свитой! Разбейте прикрытие союзников или пробейте стену щитов.', enemies:'🦔 Бристлбэк + 🧙‍♂️ Знахарь + 🕷️ Паук' },
        7:  { title:'Таинственный путник', icon:'🧓', tag:'СЮЖЕТ • ТАЙНА ТЁМНОЙ ЧАЩИ', isStory:true,
              desc:'На тропе стоит одинокий старец, опираясь на сучковатый посох. Он пристально смотрит на вас...', enemies:'🧓 Таинственный путник (СОЛО)' },
        8:  { title:'Речная заводь: Бобёр-удильщик', icon:'🦫', tag:'МИНИ-БОСС • СЮЖЕТНЫЙ СОЮЗНИК', isStory:true,
              desc:'У тихой заводи рыбачит Бобёр-удильщик, готовый зацепить удочкой любого из 2-го ряда. Одолейте его в бою, чтобы он бесплатно присоединился к отряду и открыл Речку!', enemies:'🦫 Бобёр-удильщик + 2 лесные твари' },
        10: { title:'БОСС АКТА 2: Стражи Тёмной чащи', icon:'🐺', tag:'БОСС АКТА 2', isBoss:true, isStory:true,
              desc:'Ио лечит и усиливает Тини и Люкана — фокусите Ио первым! Награда: 🛡️ Эгида Чащи (+5-й слот, Доминатор).', enemies:'🔵 Ио + 🗿 Тини + 🐺 Люкан' },
        11: { title:'Снайпер в ветвях', icon:'🐿️', tag:'СЮЖЕТ • НАМЕРЕНИЯ', isStory:true,
              desc:'Худвинк целится смертоносным выстрелом! Прикрывайтесь 🛡️ БЛОКОМ при прицеле 🎯 или сбивайте её подготовку.', enemies:'🐿️ Худвинк (СОЛО)' },
        14: { title:'🎪 Бродячий цирк', icon:'🎪', tag:'ОСОБАЯ ВСТРЕЧА', isStory:true,
              desc:'Шпрехшталмейстер завлекает вас на смертельное представление, выставляя против вас зеркальные тени вашего же отряда!', enemies:'🎩 Шпрехшталмейстер + 🎭 3 зеркальные тени' },
        15: { title:'БОСС АКТА 3: Рошан Бессмертный', icon:'👹', tag:'БОСС АКТА 3', isBoss:true, isStory:true,
              desc:'Хозяин подземелья с 2 фазами (возрождается с Эгидой и яростью!). Награда: 🧀 Сыр Рошана (2 предмета за ход, Радианс).', enemies:'👹 Рошан (2 фазы)' },
        16: { title:'Сюжет: Страж Хайграунда', icon:'☀️', tag:'СЮЖЕТНОЕ СОБЫТИЕ', isStory:true,
              desc:'Непобедимая воительница Донбрейкер преграждает путь к стенам Замка. Продержитесь до 50% её ЗД!', enemies:'☀️ Донбрейкер' },
        20: { title:'БОСС АКТА 4: Драгон Найт и драконы', icon:'🐉', tag:'БОСС АКТА 4', isBoss:true, isStory:true,
              desc:'Рыцарь-дракон ведёт в бой Огненного, Ледяного и Ядовитого драконов. Награда: 💎 Осколок Аганима (−1 КД предметов).', enemies:'🛡️ Драгон Найт + 3 дракона' },
        21: { title:'Архимаг Замка', icon:'🌟', tag:'СЮЖЕТ • КАТАКЛИЗМ', isStory:true,
              desc:'Инвокер призывает Духов и заряжает разрушительный Катаклизм. Закрывайтесь БКБ, Пайпом или Ромом!', enemies:'🌟 Инвокер Замка' },
        24: { title:'Застава Трона: Хаос Найт (ЦК)', icon:'🐴', tag:'ПРЕДФИНАЛ • СЮРПРИЗ', isStory:true,
              desc:'ЦК призывает свои копии, а после его падения вас ждёт неожиданный паровой мини-босс!', enemies:'🐴 Хаос Найт → 🤖 ???' },
        25: { title:'ФИНАЛЬНЫЙ БОСС: Хранитель Трона', icon:'👑', tag:'ФИНАЛ КАМПАНИИ', isBoss:true, isStory:true,
              desc:'Немощный старик, приросший к Трону Древних Завоевателей. Награда: 👑 Печать Хранителя.', enemies:'👑 Хранитель Трона' }
    };
    if (special[stage]) return special[stage];

    let act = getActForStage(stage);
    let cnt = act.id <= 2 ? '2–3' : '3–4';
    return {
        title: `Разведка: ${act.name.split('. ')[1]}`,
        icon: act.icon,
        tag: `ЭТАП ${stage} / 25`,
        isStory: false,
        isBoss: false,
        desc: `Пробейтесь через патрули врагов (${cnt} враг.), чтобы приблизиться к боссу Акта.`,
        enemies: `${cnt} врага (герои и миньоны)`
    };
}

function changeSelectedStage(delta) {
    let maxAvail = Math.min(25, state.maxRaidCleared + 1);
    state.selectedStage = Math.max(1, Math.min(maxAvail, (state.selectedStage || 1) + delta));
    save();
    renderCampaign();
}

function changeSelectedPrologueStage(delta) {
    let maxAvail = Math.min(4, state.prologueCleared + 1);
    state.selectedPrologueStage = Math.max(1, Math.min(maxAvail, (state.selectedPrologueStage || 1) + delta));
    save();
    renderCampaign();
}
window.changeSelectedPrologueStage = changeSelectedPrologueStage;

function renderCampaign() {
    let campView = document.getElementById('raid-campaign-view');
    let battleView = document.getElementById('raid-battle-view');
    if (!campView || !battleView) return;

    if (typeof combat !== 'undefined' && combat.active) {
        campView.style.display = 'none';
        battleView.style.display = 'block';
        return;
    }
    campView.style.display = 'block';
    battleView.style.display = 'none';

    // Акт 0: Пролог (p1 .. p4)
    if (state.prologueCleared < 4) {
        let maxAvail = Math.min(4, state.prologueCleared + 1);
        if (!state.selectedPrologueStage || state.selectedPrologueStage > maxAvail) {
            state.selectedPrologueStage = maxAvail;
        }
        let pStage = state.selectedPrologueStage;
        let pStageKey = 'p' + pStage;
        let meta = getStageMeta(pStageKey);

        let dotsHtml = '';
        for (let s = 1; s <= 4; s++) {
            let cls = 'act-dot';
            if (s === 4) cls += ' boss';
            if (s <= state.prologueCleared) cls += ' done';
            else if (s === pStage) cls += ' current';
            dotsHtml += `<div class="${cls}" title="Этап ${s}"></div>`;
        }

        let isCleared = pStage <= state.prologueCleared;
        let isCurrent = pStage === (state.prologueCleared || 0) + 1;
        let clearedBadge = isCleared ? '<span style="color:#6c8; font-weight:bold; font-size:7px;">✅ Пройдено</span>' : (isCurrent ? '<span style="color:gold; font-weight:bold; font-size:7px;">🔥 ТЕКУЩИЙ БОЙ</span>' : '<span style="color:#aaa; font-size:7px;">НОВЫЙ</span>');

        let banner = document.getElementById('campaign-act-banner');
        if (banner) {
            banner.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                    <span style="color:gold; font-size:9px;">⚔️ Акт 0. Пробуждение в чаще</span>
                    <span style="color:#aaa; font-size:7px;">Этап ${pStage}/4</span>
                </div>
                <div style="font-size:7px; color:#ccc; line-height:1.5; margin-bottom:4px;">Одинокий Свен приходит в себя после предательства и пробивает путь через заставу разбойников.</div>
                <div class="act-progress-row">${dotsHtml}</div>
                <div style="font-size:7px; color:#fa0;">Цель: пробиться к воротам Большого Леса</div>
            `;
        }

        let stageCard = document.getElementById('campaign-stage-card');
        if (stageCard) {
            stageCard.className = 'card campaign-card' + (isCleared ? ' prologue-card-cleared' : (isCurrent ? ' prologue-card-active' : ''));
            stageCard.innerHTML = `
                <div class="stage-nav-row">
                    <button onclick="changeSelectedPrologueStage(-1)" ${pStage <= 1 ? 'disabled' : ''} style="padding:5px 10px; font-size:9px; background:#224; border-color:#448;">◀</button>
                    <div style="text-align:center; flex:1;">
                        <div style="color:#ff8; font-size:9px;">Этап ${pStage} / 4 ${clearedBadge}</div>
                        <div style="color:#8af; font-size:7px; margin-top:3px;">${meta.tag}</div>
                    </div>
                    <button onclick="changeSelectedPrologueStage(1)" ${pStage >= maxAvail ? 'disabled' : ''} style="padding:5px 10px; font-size:9px; background:#224; border-color:#448;">▶</button>
                </div>
                <div style="display:flex; align-items:center; gap:10px; margin-top:6px;">
                    <div style="font-size:32px;">${meta.icon}</div>
                    <div style="flex:1; font-size:8px; line-height:1.55;">
                        <div style="color:#fff; margin-bottom:3px;">${meta.title}</div>
                        <div style="color:#aaa; font-size:7px;">${meta.desc}</div>
                        <div style="color:#f88; font-size:7px; margin-top:4px;">Враги: ${meta.enemies}</div>
                    </div>
                </div>
            `;
        }

        let box = document.getElementById('campaign-contracts-box');
        if (box) {
            if (isCleared) {
                box.innerHTML = `<div class="card locked-card" style="text-align:center; padding:10px; font-size:8px; color:#8c8; border:1px solid #363; background:#122016;">
                    ✅ Этап пройден. Повторный бой недоступен.
                </div>`;
            } else {
                box.innerHTML = `<div class="contract-card story" onclick="startRaid('${pStageKey}', 'normal')">
                    <div style="flex:1;">
                        <div style="color:gold; font-size:9px; margin-bottom:4px;">⚔️ В БОЙ!</div>
                        <div style="font-size:7px; color:#ccc; line-height:1.45;">Одиночный поединок Свена.</div>
                    </div>
                    <button style="background:#840; border-color:#fc0; font-size:9px;">В БОЙ</button>
                </div>`;
            }
        }
        return;
    }

    let maxAvail = Math.min(25, state.maxRaidCleared + 1);
    if (!state.selectedStage || state.selectedStage > maxAvail) state.selectedStage = maxAvail;
    let stage = state.selectedStage;
    let act = getActForStage(stage);
    let meta = getStageMeta(stage);
    let rel = RELICS_DB[act.relicId];

    // Баннер Акта + прогресс 5 этапов
    let dotsHtml = '';
    for (let s = act.start; s <= act.end; s++) {
        let cls = 'act-dot';
        if (s === act.end) cls += ' boss';
        if (s <= state.maxRaidCleared) cls += ' done';
        else if (s === stage) cls += ' current';
        dotsHtml += `<div class="${cls}" title="Этап ${s}"></div>`;
    }
    let stageInAct = stage - act.start + 1;

    document.getElementById('campaign-act-banner').innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <span style="color:gold; font-size:9px;">${act.icon} ${act.name}</span>
            <span style="color:#aaa; font-size:7px;">Этап ${stageInAct}/5</span>
        </div>
        <div style="font-size:7px; color:#ccc; line-height:1.5; margin-bottom:4px;">${act.desc}</div>
        <div class="act-progress-row">${dotsHtml}</div>
        <div style="font-size:7px; color:#fa0;">Босс: ${act.bossName} • Трофей: ${rel.icon} ${rel.name}</div>
    `;

    // Переключатель этапов (можно откатываться на пройденные для фарма!)
    let clearedBadge = stage <= state.maxRaidCleared ? '<span style="color:#0f0; font-size:7px;">✓ ПРОЙДЕН</span>' : '<span style="color:#fa0; font-size:7px;">НОВЫЙ</span>';
    document.getElementById('campaign-stage-card').innerHTML = `
        <div class="stage-nav-row">
            <button onclick="changeSelectedStage(-1)" ${stage <= 1 ? 'disabled' : ''} style="padding:5px 10px; font-size:9px; background:#224; border-color:#448;">◀</button>
            <div style="text-align:center; flex:1;">
                <div style="color:#ff8; font-size:9px;">Этап ${stage} / 25 ${clearedBadge}</div>
                <div style="color:#8af; font-size:7px; margin-top:3px;">${meta.tag}</div>
            </div>
            <button onclick="changeSelectedStage(1)" ${stage >= maxAvail ? 'disabled' : ''} style="padding:5px 10px; font-size:9px; background:#224; border-color:#448;">▶</button>
        </div>
        <div style="display:flex; align-items:center; gap:10px; margin-top:6px;">
            <div style="font-size:32px;">${meta.icon}</div>
            <div style="flex:1; font-size:8px; line-height:1.55;">
                <div style="color:#fff; margin-bottom:3px;">${meta.title}</div>
                <div style="color:#aaa; font-size:7px;">${meta.desc}</div>
                <div style="color:#f88; font-size:7px; margin-top:4px;">Враги: ${meta.enemies}</div>
                ${state.activeTea ? (() => { let tb = TEA_BUFFS.find(x => x.id === state.activeTea); return tb ? `<div style="color:#6f8; font-size:7px; margin-top:4px;">☕ Заварен чай: ${tb.icon} ${tb.name}</div>` : ''; })() : ''}
            </div>
        </div>
    `;

    // Проверка Лесного рубежа (принудительное возвращение в Лес на входе в Акты 2–5)
    let box = document.getElementById('campaign-contracts-box');
    let gate = (typeof ACT_FOREST_GATES !== 'undefined') ? ACT_FOREST_GATES[stage] : null;
    let bypassGates = (typeof window !== 'undefined' && window.DEBUG_BYPASS_GATES);
    if (gate && stage > state.maxRaidCleared && !bypassGates && !gate.check(state)) {
        box.innerHTML = `<div class="gate-card">
            <div style="color:#fa0; font-size:9px; margin-bottom:6px;">🔒 ${gate.title}</div>
            <div style="font-size:7px; color:#ccc; line-height:1.5; margin-bottom:6px;">${gate.lore}</div>
            <div style="font-size:7px; color:#ff8; margin-bottom:4px;"><b>Условие:</b> ${gate.reqText}</div>
            <div style="font-size:7px; color:#0ef; margin-bottom:10px;">Прогресс: ${gate.progress(state)}</div>
            <button onclick="switchTab('forest')" style="width:100%; background:#153; border-color:#3a6; font-size:9px;">🌲 ВЕРНУТЬСЯ В ЛЕС</button>
        </div>`;
        return;
    }

    // Контракты боя (Сюжетный бой или выбор: Обычный / Засада / Испытание)
    let isFirstTimeStory = meta.isStory && stage > state.maxRaidCleared;
    if (isFirstTimeStory || stage === 1) {
        box.innerHTML = `<div class="contract-card story" onclick="startRaid(${stage}, 'normal')">
            <div style="flex:1;">
                <div style="color:gold; font-size:9px; margin-bottom:4px;">⚔️ ${stage === 1 ? 'НАЧАТЬ ПЕРВЫЙ БОЙ!' : 'В БОЙ ПО СЮЖЕТУ!'}</div>
                <div style="font-size:7px; color:#ccc; line-height:1.45;">${meta.isBoss ? 'Победа откроет новый Акт, Трофей, героев и зону Леса.' : 'Сюжетная схватка с новой механикой.'}</div>
            </div>
            <button style="background:#840; border-color:#fc0; font-size:9px;">В БОЙ</button>
        </div>`;
    } else {
        box.innerHTML = `
            <div style="font-size:8px; color:#aaa; margin-bottom:6px;">Выберите контракт на Этап ${stage}:</div>
            <div class="contract-card" onclick="startRaid(${stage}, 'normal')">
                <div style="flex:1;">
                    <div style="color:#fff; font-size:8px; margin-bottom:3px;">⚔️ Обычный бой</div>
                    <div style="font-size:7px; color:#aaa;">Стандартные враги и награда.</div>
                </div>
                <button style="font-size:8px; padding:6px 8px;">БОЙ</button>
            </div>
            <div class="contract-card ambush" onclick="startRaid(${stage}, 'ambush')">
                <div style="flex:1;">
                    <div style="color:#fa0; font-size:8px; margin-bottom:3px;">🔥 Засада</div>
                    <div style="font-size:7px; color:#dca;">Враги +${Math.round((CONFIG.contracts.ambush.enemyHpMult - 1) * 100)}% ЗД и +${Math.round((CONFIG.contracts.ambush.enemyAtkMult - 1) * 100)}% УРН • Награда: <b>×${CONFIG.contracts.ambush.xpMult} опыта</b> и <b>${Math.round(CONFIG.neutrals.raidAmbushChance * 100)}% шанс нейтрала</b>!</div>
                </div>
                <button style="background:#730; border-color:#c60; font-size:8px; padding:6px 8px;">БОЙ</button>
            </div>
            <div class="contract-card trial" onclick="startRaid(${stage}, 'trial')">
                <div style="flex:1;">
                    <div style="color:#d8f; font-size:8px; margin-bottom:3px;">💀 Испытание</div>
                    <div style="font-size:7px; color:#cad;">У врагов +${CONFIG.contracts.trial.enemyShieldBonus} щит 🛡️ и +${Math.round((CONFIG.contracts.trial.enemyAtkMult - 1) * 100)}% УРН • Награда: <b>×${CONFIG.contracts.trial.goldMult} золота</b> и <b>×${CONFIG.contracts.trial.xpMult} опыта</b>!</div>
                </div>
                <button style="background:#516; border-color:#a3c; font-size:8px; padding:6px 8px;">БОЙ</button>
            </div>
        `;
    }
}

/* ===== МОДАЛКИ ИНФО ПРЕДМЕТОВ И СКИЛЛОВ ===== */
function showItemInfo(type, id) {
    let item = findAnyItem(id);
    if (!item) return;
    let desc = fmtStats(item.full) + getItemMetaHtml(item);

    let targetId = item.buildsInto || item.partOf || (item.components ? item.id : null);
    let targetItem = targetId ? findAnyItem(targetId) : null;
    if (targetItem && targetItem.components) {
        let icons = targetItem.components.map(cid => {
            let c = findAnyItem(cid);
            return c ? `<span title="${c.name}" style="background:#333; padding:3px 5px; border-radius:3px; display:inline-block;">${c.icon}</span>` : '';
        }).join(' + ');
        let titleHtml = (targetItem.id !== item.id)
            ? `<span class="recipe-link" onclick="showItemInfo('${type}','${targetItem.id}')">${targetItem.icon} ${targetItem.name}</span>`
            : `<b style="color:#0f0;">${targetItem.icon} ${targetItem.name}</b>`;
        let extraDesc = (targetItem.id !== item.id) ? `<div style="font-size:8px; color:#ccc; margin-top:6px;">${fmtStats(targetItem.full)}</div>` : '';
        desc += `<div style="margin-top:10px; padding:8px; background:#151515; border:1px dashed #666;">
            <div style="font-size:8px; color:#aaa; margin-bottom:4px;">Сборка: ${titleHtml}</div>
            <div style="margin:6px 0;">${icons}</div>
            ${extraDesc}
        </div>`;
    }

    document.getElementById('item-modal-title').innerText = item.icon + ' ' + item.name;
    document.getElementById('item-modal-desc').innerHTML = desc;
    document.getElementById('item-info-modal').style.display = 'flex';
}
function closeItemInfo() { document.getElementById('item-info-modal').style.display = 'none'; }

function showSkillInfo(heroDbId, idx) {
    let dbH = DB.heroes.find(h => h.id === heroDbId);
    let sk = dbH.skills[idx];
    let maxLvl = sk.dmg.length;
    let typeRu = { magic:'Магический', phys:'Физический', heal:'Лечение', buff:'Бафф', debuff:'Дебафф', passive:'Пассивка', mana_drain:'Магия', duel:'Дуэль' }[sk.type] || sk.type;

    let levelsHtml = '';
    for (let l = 1; l <= maxLvl; l++) {
        let parts = [];
        if (sk.dmg && sk.dmg[l - 1] > 0) parts.push(`${sk.dmg[l - 1]} урона/хила`);
        if (sk.cleave) parts.push('сплэш по всем');
        if (sk.cleavePct && sk.cleavePct[l - 1]) parts.push(`сплэш ${Math.round(sk.cleavePct[l - 1] * 100)}%`);
        if (sk.teamArmor && sk.teamArmor[l - 1]) parts.push(`+${sk.teamArmor[l - 1]} БРО отряду (2 х.)`);
        if (sk.selfAtkMult && sk.selfAtkMult[l - 1]) parts.push(`+${Math.round((sk.selfAtkMult[l - 1] - 1) * 100)}% УРН (3 х.)`);
        if (sk.teamMpRegen && sk.teamMpRegen[l - 1]) parts.push(`+${sk.teamMpRegen[l - 1]} МН/ход отряду`);
        if (sk.teamLifesteal && sk.teamLifesteal[l - 1]) parts.push(`+${Math.round(sk.teamLifesteal[l - 1] * 100)}% физ. вампиризм отряду`);
        if (sk.guaranteedCrit && sk.guaranteedCrit[l - 1]) parts.push(`100% крит ×${sk.guaranteedCrit[l - 1]}`);
        if (sk.reincarnatePct && sk.reincarnatePct[l - 1]) parts.push(`воскрешение ${Math.round(sk.reincarnatePct[l - 1] * 100)}% ЗД`);
        if (sk.shallowGrave) parts.push('бессмертие (2 х.)');
        if (sk.jujuArmor && sk.jujuArmor[l - 1]) parts.push(`−${sk.jujuArmor[l - 1]} БРО врагам, −${sk.jujuCd[l - 1]} КД`);
        if (sk.armorDebuff && sk.armorDebuff[l - 1]) parts.push(`−${sk.armorDebuff[l - 1]} БРО`);
        if (sk.wardDmg && sk.wardDmg[l - 1]) parts.push(`${sk.wardDmg[l - 1]} Маг. урон за каст врага`);
        if (sk.maxIllusions && sk.maxIllusions[l - 1]) parts.push(`до ${sk.maxIllusions[l - 1]} иллюзий`);
        if (sk.lumiHeal && sk.lumiHeal[l - 1]) parts.push(`крит ×1.8 и хил отряду ${Math.round(sk.lumiHeal[l - 1] * 100)}%`);
        if (sk.solarHeal && sk.solarHeal[l - 1]) parts.push(`+${sk.solarHeal[l - 1]} ЗД всему отряду`);
        if (sk.heavenlyJump && sk.heavenlyJump[l - 1] > 0) parts.push(`${sk.heavenlyJump[l - 1]} Маг. урон в ответ`);
        if (sk.stun && sk.stun[l - 1] > 0) parts.push(`оглушение ${sk.stun[l - 1]} х.`);
        if (sk.manaSteal && sk.manaSteal[l - 1] > 0) parts.push(`крадёт ${sk.manaSteal[l - 1]} МН`);
        if (sk.bounces && sk.bounces[l - 1] > 0) parts.push(`отскоков: ${sk.bounces[l - 1]}`);
        if (sk.critChance && sk.critMult && sk.critMult[l - 1]) parts.push(`${Math.floor(sk.critChance * 100)}% крит (×${sk.critMult[l - 1]})`);
        if (sk.counterChance && sk.counterChance[l - 1] > 0) parts.push(`${Math.floor(sk.counterChance[l - 1] * 100)}% контратака`);
        if (sk.duelBonus && sk.duelBonus[l - 1] > 0) parts.push(`победа: +${sk.duelBonus[l - 1]} УРН навсегда`);
        if (sk.xMarkAmp && sk.xMarkAmp[l - 1] > 0) parts.push(`+${Math.round(sk.xMarkAmp[l - 1] * 100)}% входящего Маг. урона (2 х.)`);
        if (sk.hexAmp && sk.hexAmp[l - 1] > 0) parts.push(`+${Math.round(sk.hexAmp[l - 1] * 100)}% ВСЕГО урона (2 х.)`);
        if (sk.burnDmg && sk.burnDmg[l - 1] > 0) parts.push(`поджог ${sk.burnDmg[l - 1]} Маг. урон/ход (2 х.)`);
        if (sk.silence) parts.push(`безмолвие ${sk.silence} х. (сбивает каст)`);
        if (sk.rootTurns) parts.push(`оцепенение ${sk.rootTurns} х.`);
        if (sk.breakHits >= 2 || sk.primaryBreakHits >= 2 || sk.breakHitsTarget >= 2) {
            let heroInst = (typeof state !== 'undefined' && state.heroes) ? state.heroes.find(h => h.dbId === heroDbId) : null;
            let heroLvl = heroInst ? heroInst.level : 1;
            parts.push(heroLvl < 4 ? `пробитие (−1 🛡️, 2 🛡️ с 4 ур.)` : `пробитие (−2 🛡️)`);
        }
        if (sk.rumBuff) parts.push('Ром отряду: −35% урона (2 х.)');
        if (sk.name === 'Блюр') parts.push('50% уклонение (2 х.)');
        if (parts.length) levelsHtml += `<div style="color:#0f0; margin-left:10px;">Ур. ${l}: ${fmtStats(parts.join(', '))}</div>`;
    }

    let heroInst = (typeof state !== 'undefined' && state.heroes) ? state.heroes.find(h => h.dbId === heroDbId) : null;
    let heroLvl = heroInst ? heroInst.level : 1;
    let metaHtml = getSkillMetaHtml(sk, heroLvl);
    let reqHtml = (idx === 3) ? `<div style="color:#fa0; margin-top:8px;">🔒 Ультимейт:<br>Ур.1 — 6 ур. героя<br>Ур.2 — 12 ур. героя<br>Ур.3 — 18 ур. героя</div>` : '';

    let rodExtraHtml = '';
    if (heroDbId === 'pudge' && idx === 0 && typeof getRodStats === 'function') {
        let rLvl = (state.fishing && state.fishing.rodLevel) || 0;
        let rStat = getRodStats(rLvl);
        let rParts = [];
        if (rStat.dmgBonus) rParts.push(`+${Math.round(rStat.dmgBonus * 100)}% урона`);
        if (rStat.mpSave) rParts.push(`−${rStat.mpSave} МН (мин. 20)`);
        if (rStat.exposedBonus) rParts.push(`Без прикрытия +${Math.round(rStat.exposedBonus * 100)}% физ.`);
        if (rStat.extraShieldBreak) rParts.push(`+${rStat.extraShieldBreak} слом 🛡️`);
        if (rStat.interruptCast) rParts.push(`сбивает подготовку 🔥`);
        if (rStat.rageGain) rParts.push(`+${rStat.rageGain} Ярости`);
        if (rStat.frontRowRoot) rParts.push(`❄️ Оцепенение 1-го ряда (2 х.)`);
        if (rStat.drPct) rParts.push(`Упор на леску: −${Math.round(rStat.drPct * 100)}% урона (1 х.)`);
        if (rStat.brokenMaxHpPct) rParts.push(`+${Math.round(rStat.brokenMaxHpPct * 100)}% макс. ЗД чистым по пробитым`);
        if (rStat.bleedTurns) rParts.push(`🩸 Кровотечение (${rStat.bleedTurns} х.)`);
        if (rStat.executeNormal) rParts.push(`добивание (<15% обычные, <10% боссы)`);

        rodExtraHtml = `<div style="margin-top:8px; padding:6px; background:#023; border:1px solid #0af; border-radius:3px;">
            <b style="color:#0ef;">🎣 Снасть Бобра: ${rStat.name} (Ур. ${rLvl}/12)</b><br>
            <span style="color:#aff; font-size:8px;">${rParts.join(', ') || 'Базовая удочка без улучшений'}</span><br>
            <span style="color:#888; font-size:7px;">Улучшается на вкладке 🎣 Речка за очки улова!</span>
        </div>`;
    }

    document.getElementById('skill-modal-title').innerText = sk.name;
    document.getElementById('skill-modal-desc').innerHTML = `
        <b style="color:#aaa;">Тип:</b> ${typeRu}<br>
        <b style="color:#aaa;">МН:</b> ${sk.mp.join(' / ')}<br>
        ${metaHtml}
        <b style="color:#aaa;">Макс. уровень:</b> ${maxLvl}<br>
        ${levelsHtml ? '<b style="color:#aaa; margin-top:6px; display:block;">По уровням:</b>' + levelsHtml : ''}
        ${rodExtraHtml}
        <div style="margin-top:10px; padding:8px; background:#111; border-left:3px solid #0af;">${fmtStats(sk.full)}</div>
        ${reqHtml}`;
    document.getElementById('skill-info-modal').style.display = 'flex';
}
function closeSkillInfo() { document.getElementById('skill-info-modal').style.display = 'none'; }

/* ===== РЕЙДОВАЯ ЛАВКА (БАЗОВЫЕ ПРЕДМЕТЫ И СБОРКИ АРТЕФАКТОВ) ===== */
const CRAFT_CONFIGS = [
    { id:'blade_mail', tier:1, components:['broadsword','chainmail','bm_recipe'] },
    { id:'crystalys', tier:2, components:['blades_of_attack','broadsword','crystalys_recipe'] },
    { id:'kaya', tier:2, components:['staff_of_wizardry','kaya_recipe'] },
    { id:'mekansm', tier:2, components:['headdress','buckler','mek_recipe'] },
    { id:'orchid_malevolence', tier:2, components:['staff_of_wizardry','blades_of_attack','orchid_recipe'], isOrchid:true },
    { id:'veil_of_discord', tier:3, components:['staff_of_wizardry','chainmail','veil_recipe'] },
    { id:'desolator', tier:3, components:['blight','mithril','deso_recipe'] },
    { id:'daedalus', tier:4, components:['crystalys','demon_edge','daedalus_recipe'] },
    { id:'satanic', tier:4, components:['morbid','reaver','satanic_recipe'] },
    { id:'bkb', tier:4, components:['reaver','mithril','bkb_recipe'] },
    { id:'pipe_of_insight', tier:4, components:['headdress','pipe_recipe'] },
    { id:'assault_cuirass', tier:5, components:['platemail','buckler','ac_recipe'] }
];

function isComponentAvailable(cId) {
    if (cId === 'orchid_recipe' && state.orchidRecipeDropped) return true;
    if (state.raidInv && state.raidInv.includes(cId)) return true;
    if (state.heroes && state.heroes.some(h => (h.items || []).includes(cId) || h.neutralItem === cId)) return true;
    return false;
}

function quickBuyComponent(cId) {
    let item = DB.raidItems.find(x => x.id === cId);
    if (!item || !isShopTierUnlocked(item.tier)) {
        alert('🔒 Этот предмет доступен только в более позднем Тире лавки!');
        return;
    }
    if (state.gold < item.cost) {
        alert(`Недостаточно золота! Требуется ${item.cost} G.`);
        return;
    }
    state.gold -= item.cost;
    state.raidInv.push(cId);
    checkRaidCrafts();
    save();
    updateUI();
}
window.quickBuyComponent = quickBuyComponent;

function assembleCraft(craftId) {
    let cfg = CRAFT_CONFIGS.find(x => x.id === craftId);
    let art = DB.raidItems.find(x => x.id === craftId);
    if (!cfg || !art) return;
    if (!isShopTierUnlocked(cfg.tier)) {
        let t = SHOP_TIERS.find(x => x.tier === cfg.tier);
        alert(`🔒 Требуется открыть ${t ? t.name : 'Тир ' + cfg.tier}!`);
        return;
    }

    if (cfg.id === 'orchid_malevolence') {
        let hasRecipe = state.orchidRecipeDropped || isComponentAvailable('orchid_recipe');
        if (!hasRecipe) {
            alert('🔒 Требуется выбить Чертёж с Баунти Хантера!');
            return;
        }
    }

    let missing = [];
    let missingCost = 0;
    let missingLocked = false;

    cfg.components.forEach(cId => {
        if (isComponentAvailable(cId)) return;
        let cItem = DB.raidItems.find(x => x.id === cId);
        if (!cItem || cItem.bossDropOnly || !isShopTierUnlocked(cItem.tier)) {
            missingLocked = true;
        } else {
            missing.push(cId);
            missingCost += cItem.cost || 0;
        }
    });

    if (missingLocked) {
        alert('🔒 Не все компоненты открыты в лавке!');
        return;
    }

    if (state.gold < missingCost) {
        alert(`Недостаточно золота для быстрой сборки! Требуется ещё ${missingCost - state.gold} G.`);
        return;
    }

    if (missingCost > 0) {
        state.gold -= missingCost;
    }

    cfg.components.forEach(cId => {
        if (cId === 'orchid_recipe' && !state.raidInv.includes('orchid_recipe')) {
            return;
        }
        let invIdx = state.raidInv.indexOf(cId);
        if (invIdx !== -1) {
            state.raidInv.splice(invIdx, 1);
        } else {
            for (let h of (state.heroes || [])) {
                let sIdx = (h.items || []).indexOf(cId);
                if (sIdx !== -1) {
                    h.items[sIdx] = null;
                    break;
                }
            }
        }
    });

    state.raidInv.push(craftId);
    save();
    updateUI();
    alert(`⚒️ Собран артефакт: ${art.name}!`);
}
window.assembleCraft = assembleCraft;

function renderRaidShop() {
    const list = document.getElementById('raid-shop');
    if (!list) return;
    list.innerHTML = '';

    // Единый список всех доступных в лавке товаров (базовые + сборки), отсортированный по стоимости
    let shopEntries = [];

    // 1. Доступные базовые предметы
    DB.raidItems.forEach(item => {
        if (!item.craftable && !item.isRecipe && !item.bossDropOnly && isShopTierUnlocked(item.tier)) {
            shopEntries.push({
                type: 'base',
                cost: item.cost || 0,
                item: item
            });
        }
    });

    // 2. Доступные сборки (артефакты)
    CRAFT_CONFIGS.forEach(cfg => {
        let art = DB.raidItems.find(x => x.id === cfg.id);
        if (!art) return;

        // Orchid Malevolence: скрыт до нахождения чертежа с босса
        if (cfg.id === 'orchid_malevolence') {
            let hasRecipe = state.orchidRecipeDropped || isComponentAvailable('orchid_recipe');
            if (!hasRecipe) return;
        }

        if (isShopTierUnlocked(cfg.tier)) {
            let totalCost = cfg.components.reduce((sum, cId) => {
                let c = DB.raidItems.find(x => x.id === cId);
                return sum + (c ? (c.cost || 0) : 0);
            }, 0);

            shopEntries.push({
                type: 'craft',
                cost: totalCost,
                cfg: cfg,
                art: art
            });
        }
    });

    // Сортировка строго по возрастанию полной стоимости
    shopEntries.sort((a, b) => a.cost - b.cost);

    shopEntries.forEach(entry => {
        if (entry.type === 'base') {
            let item = entry.item;
            let count = state.raidInv.filter(id => id === item.id).length;
            list.innerHTML += `<div class="card" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                <div style="flex:1;"><span style="color:#f0f; font-weight:bold;">${item.icon} ${item.name}</span><br>
                <span style="font-size:8px; color:#aaa;">${fmtStats(item.short)}</span>
                ${getItemMetaHtml(item)}
                <div><button class="info-btn" onclick="showItemInfo('raid','${item.id}')">Подробнее [?]</button></div></div>
                <div style="text-align:right;"><span style="font-size:8px; color:#aaa;">В схроне: ${count}</span><br>
                <button onclick="buyRaidItem('${item.id}')" style="margin-top:5px;">${item.cost} G</button></div>
            </div>`;
        } else {
            let cfg = entry.cfg;
            let art = entry.art;
            let compListHtml = '';
            let missingCost = 0;
            let hasAll = true;
            let missingLocked = false;

            cfg.components.forEach(cId => {
                let isOwned = isComponentAvailable(cId);
                let cItem = DB.raidItems.find(x => x.id === cId);
                if (!cItem) return;

                if (isOwned) {
                    let dropBadge = (cId === 'orchid_recipe') ? ' <span style="color:#0f0; font-size:7px;">✅ Чертёж найден</span>' : ` <span style="color:#0f0; font-size:7px;">✅ Есть</span>`;
                    compListHtml += `<div style="display:flex; justify-content:space-between; align-items:center; font-size:8px; margin:2px 0;">
                        <span>${cItem.icon} ${cItem.name}</span>
                        <span>${dropBadge}</span>
                    </div>`;
                } else {
                    hasAll = false;
                    if (cItem.bossDropOnly) {
                        missingLocked = true;
                        compListHtml += `<div style="display:flex; justify-content:space-between; align-items:center; font-size:8px; margin:2px 0;">
                            <span>${cItem.icon} ${cItem.name}</span>
                            <span style="color:#f88; font-size:7px;">🔒 Только трофей</span>
                        </div>`;
                    } else if (!isShopTierUnlocked(cItem.tier)) {
                        missingLocked = true;
                        compListHtml += `<div style="display:flex; justify-content:space-between; align-items:center; font-size:8px; margin:2px 0;">
                            <span>${cItem.icon} ${cItem.name}</span>
                            <span style="color:#fa0; font-size:7px;">🔒 Заблокировано</span>
                        </div>`;
                    } else {
                        missingCost += cItem.cost || 0;
                        compListHtml += `<div style="display:flex; justify-content:space-between; align-items:center; font-size:8px; margin:2px 0;">
                            <span>${cItem.icon} ${cItem.name}</span>
                            <button onclick="quickBuyComponent('${cId}')" ${state.gold < cItem.cost ? 'disabled' : ''} style="padding:2px 6px; font-size:7px; background:#143; border-color:#285;">Купить (${cItem.cost} G)</button>
                        </div>`;
                    }
                }
            });

            let btnHtml = '';
            if (missingLocked) {
                btnHtml = `<button disabled style="width:100%; margin-top:6px; opacity:0.6; font-size:8px;">🔒 Часть компонентов недоступна</button>`;
            } else if (hasAll) {
                btnHtml = `<button onclick="assembleCraft('${cfg.id}')" style="width:100%; margin-top:6px; background:#252; border-color:#484; font-size:9px; font-weight:bold;">⚒️ Собрать</button>`;
            } else {
                let canAfford = state.gold >= missingCost;
                btnHtml = `<button onclick="assembleCraft('${cfg.id}')" ${canAfford ? '' : 'disabled'} style="width:100%; margin-top:6px; background:${canAfford ? '#252' : '#333'}; border-color:${canAfford ? '#484' : '#555'}; font-size:8px;">⚒️ Собрать за ${missingCost} G</button>`;
            }

            let orchidBadge = (cfg.id === 'orchid_malevolence') ? '<span style="color:#0f0; font-size:7px; margin-left:6px;">✅ Чертёж</span>' : '';

            list.innerHTML += `<div class="card craft-group-card" style="margin-bottom:8px; border:1px solid #d4af37; background:#151522; padding:8px; box-shadow:0 0 6px rgba(212,175,55,0.25);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                    <div><span style="color:#fa0; font-size:10px; font-weight:bold;">${art.icon} ${art.name}</span>${orchidBadge}</div>
                    <span style="color:gold; font-size:8px; font-weight:bold;">⚒️ Сборка (~${entry.cost} G)</span>
                </div>
                <div style="font-size:8px; color:#aaa; margin-bottom:4px; line-height:1.4;">${fmtStats(art.short)}</div>
                ${getItemMetaHtml(art)}
                <div style="margin:6px 0 4px; padding:4px 6px; background:#1a1a2a; border-radius:4px; border:1px solid #334;">
                    <div style="font-size:7px; color:#888; margin-bottom:3px; font-weight:bold;">Компоненты:</div>
                    ${compListHtml}
                </div>
                ${btnHtml}
            </div>`;
        }
    });

    let highestTier = getHighestUnlockedShopTier();
    if (highestTier < 5) {
        list.innerHTML += `<div class="card" style="text-align:center; padding:10px; margin-top:10px; background:rgba(255,215,0,0.04); border:1px dashed #665; color:#aaa; font-size:8px;">
            ✨ По мере фарма Леса в лавке будут появляться новые товары
        </div>`;
    }
}

function renderInventory() {
    let list = document.getElementById('inventory-list');
    if (!list) return;
    list.innerHTML = '';
    if (state.raidInv.length === 0 && state.neutralInv.length === 0) {
        list.innerHTML = '<span style="color:#777;">Инвентарь пуст.</span>';
        return;
    }
    let counts = {};
    [...state.raidInv, ...state.neutralInv].forEach(id => { counts[id] = (counts[id] || 0) + 1; });
    Object.keys(counts).forEach(id => {
        let item = findAnyItem(id);
        if (!item) return;
        let isNeutral = state.neutralInv.includes(id) && !state.raidInv.includes(id);
        let badge = counts[id] > 1 ? `<div class="stack-badge">${counts[id]}</div>` : '';
        list.innerHTML += `<div class="inventory-stack" onclick="showItemInfo('${isNeutral ? 'neutral' : 'raid'}','${id}')">
            <div style="background:${isNeutral ? '#234' : '#333'}; padding:6px; border-radius:4px; font-size:16px; border:1px solid #555;" title="${item.name}">${item.icon}</div>
            ${badge}
        </div>`;
    });
}

function checkRaidCrafts() {
    const crafts = [
        { res:'blade_mail', name:'Шипастая броня', req:['broadsword','chainmail','bm_recipe'] },
        { res:'crystalys', name:'Кристалис', req:['blades_of_attack','broadsword','crystalys_recipe'] },
        { res:'daedalus', name:'Даэдал', req:['crystalys','demon_edge','daedalus_recipe'] },
        { res:'kaya', name:'Кайя', req:['staff_of_wizardry','kaya_recipe'] },
        { res:'veil_of_discord', name:'Вуаль раздора', req:['staff_of_wizardry','chainmail','veil_recipe'] },
        { res:'assault_cuirass', name:'Кираса штурма', req:['platemail','buckler','ac_recipe'] },
        { res:'mekansm', name:'Меказм', req:['headdress','buckler','mek_recipe'] },
        { res:'pipe_of_insight', name:'Трубка прозрения', req:['headdress','pipe_recipe'] },
        { res:'orchid_malevolence', name:'Орхидея злобы', req:['staff_of_wizardry','blades_of_attack','orchid_recipe'] },
        { res:'desolator', name:'Дезолятор', req:['blight','mithril','deso_recipe'] },
        { res:'satanic', name:'Сатаник', req:['morbid','reaver','satanic_recipe'] },
        { res:'bkb', name:'Посох БКБ', req:['reaver','mithril','bkb_recipe'] }
    ];
    let craftedAny = false;
    crafts.forEach(c => {
        if (c.req.every(r => state.raidInv.includes(r))) {
            c.req.forEach(r => state.raidInv.splice(state.raidInv.indexOf(r), 1));
            state.raidInv.push(c.res);
            alert(`⚒️ Собран артефакт: ${c.name}!`);
            craftedAny = true;
        }
    });
    return craftedAny;
}
window.checkRaidCrafts = checkRaidCrafts;

function buyRaidItem(id) {
    let item = DB.raidItems.find(i => i.id === id);
    if (!item || item.craftable || item.bossDropOnly || !isShopTierUnlocked(item.tier) || state.gold < item.cost) return;
    state.gold -= item.cost;
    state.raidInv.push(id);
    checkRaidCrafts();
    save();
}

/* ===== ГЕРОИ И ОТРЯД ===== */
function formatHeroStatsBlock(stats, mainAttr) {
    let physPct = Math.round(getPhysicalReduction(stats.armor) * 100);
    let magPct = Math.round(stats.magicRes * 100);
    let attrBadge = mainAttr === 'str' ? '<span style="color:#f55;">[СИЛ]</span>' : '<span style="color:#0af;">[ИНТ]</span>';
    let extras = [];
    if (stats.spellAmp > 0) {
        let ampVal = (stats.spellAmp * 100).toFixed(1).replace(/\.0$/, '');
        extras.push(`<span style="color:#c6f;">+${ampVal}% маг.скиллы</span>`);
    }
    if (stats.itemCritChance > 0) extras.push(`<span style="color:#f80;">Крит ${Math.round(stats.itemCritChance * 100)}% (×${stats.itemCritMult})</span>`);
    return `${attrBadge} <span style="color:#f55;">СИЛ:</span> ${Math.floor(stats.str)} | <span style="color:#0af;">ИНТ:</span> ${Math.floor(stats.int)}<br>` +
           `<span style="color:#0f0;">ЗД:</span> ${stats.maxHp} | <span style="color:#48f;">МН:</span> ${stats.maxMp} (+${stats.mpRegen}/х) | <span style="color:#fa0;">УРН:</span> ${stats.atk}<br>` +
           `<span style="color:#ddd;">БРО:</span> ${stats.armor} (${physPct}%) | <span style="color:#6cf;">МАГ.РЕЗ:</span> ${magPct}%` +
           (extras.length ? `<br>${extras.join(' | ')}` : '');
}

function getUnlockedHeroAct() {
    if (state.prologueCleared < 4 && state.maxRaidCleared < 1) return 0;
    if (state.maxRaidCleared < 5) return 1;
    if (state.maxRaidCleared < 10) return 2;
    if (state.maxRaidCleared < 15) return 3;
    return 4;
}

function getHeroCurrentCost(dbHero) {
    if (!dbHero || !dbHero.cost) return 0;
    let boughtInSameAct = 0;
    (state.heroes || []).forEach(h => {
        let hDb = DB.heroes.find(x => x.id === h.dbId);
        if (hDb && !hDb.storyUnlock && hDb.unlockAct > 0 && hDb.unlockAct === dbHero.unlockAct) {
            boughtInSameAct++;
        }
    });
    let taxMult = (CONFIG.economy && CONFIG.economy.tavernTaxPerActHero) ? CONFIG.economy.tavernTaxPerActHero : 0.40;
    let cost = Math.round(dbHero.cost * Math.pow(1 + taxMult, boughtInSameAct) / 50) * 50;
    return cost;
}
window.getHeroCurrentCost = getHeroCurrentCost;

function renderHeroes() {
    const list = document.getElementById('heroes-list');
    if (!list) return;
    list.innerHTML = '';
    let maxAct = getUnlockedHeroAct();
    let maxSquad = getMaxSquadSize();

    DB.heroes.forEach(dbH => {
        const owned = state.heroes.find(h => h.dbId === dbH.id);

        if (!owned && dbH.storyUnlock) {
            if (dbH.id === 'pudge') {
                if (state.maxRaidCleared >= 5) {
                    list.innerHTML += `<div class="card locked-card">
                        <div style="color:#fc0;">🔒 ??? (Сюжетный союзник — Тёмная чаща, Акт 2)</div>
                        <div style="font-size:7px; color:#aaa; margin-top:4px;">Обитает на Этапе 8 у реки. Попробуйте угостить его Заколдованным орехом из Леса...</div>
                    </div>`;
                }
                return;
            }
            if (state.maxRaidCleared >= 10) {
                list.innerHTML += `<div class="card locked-card">
                    <div style="color:#fc0;">🔒 ??? (Сюжетный союзник)</div>
                    <div style="font-size:7px; color:#aaa; margin-top:4px;">Встретится на Хайграунде (Акт 4, Этап 16).</div>
                </div>`;
            }
            return;
        }

        if (!owned && dbH.unlockAct > maxAct) {
            if (dbH.unlockAct === maxAct + 1) {
                let reqBoss = dbH.unlockAct === 1 ? 'Завершите Пролог (Акт 0)' : `Победите босса Акта ${dbH.unlockAct - 1} (Этап ${(dbH.unlockAct - 1) * 5})`;
                list.innerHTML += `<div class="card locked-card">
                    <div style="color:#bbb;">🔒 ${dbH.icon} ${dbH.name} <span class="role-tag">${dbH.role}</span></div>
                    <div style="font-size:7px; color:#fa0; margin-top:4px;">Откроется: ${reqBoss}</div>
                </div>`;
            }
            return;
        }

        window.expandedHeroCards = window.expandedHeroCards || {};
        let isExpanded = !!window.expandedHeroCards[dbH.id];

        const div = document.createElement('div');
        div.className = isExpanded ? 'card hero-tavern-card expanded' : 'card hero-tavern-card';
        div.style.cursor = 'pointer';
        div.onclick = () => toggleHeroCard(dbH.id);

        if (!owned) {
            let role = dbH.mainAttr === 'str' ? '<span style="color:#f55;">Сила</span>' : '<span style="color:#0af;">Интеллект</span>';
            let range = dbH.isMelee ? 'Ближний' : 'Дальний';
            let cost = getHeroCurrentCost(dbH);
            let boughtInSameAct = (state.heroes || []).filter(h => {
                let hDb = DB.heroes.find(x => x.id === h.dbId);
                return hDb && !hDb.storyUnlock && hDb.unlockAct > 0 && hDb.unlockAct === dbH.unlockAct;
            }).length;
            let taxPct = boughtInSameAct > 0 ? Math.round((Math.pow(1.4, boughtInSameAct) - 1) * 100) : 0;
            let taxBadge = taxPct > 0 ? ` <span style="font-size:7px; color:#ff8;">(+${taxPct}%)</span>` : '';

            let unownedCompact = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <span style="font-size:11px; font-weight:bold;">${dbH.icon} ${dbH.name}</span>
                        <span class="role-tag" style="margin-left:4px;">${dbH.role}</span>
                    </div>
                    <button onclick="event.stopPropagation(); buyHero('${dbH.id}')" style="background:#252; border-color:#484; font-size:8px; padding:4px 8px;">НАНЯТЬ ЗА ${cost} G${taxBadge}</button>
                </div>
                <div style="font-size:7px; color:#aaa; margin-top:4px;">${role} • ${range}</div>
            `;

            if (!isExpanded) {
                div.innerHTML = unownedCompact;
            } else {
                let skillsPreview = dbH.skills.map(sk => {
                    return `<div style="border-top:1px solid #333; margin-top:5px; padding-top:4px; font-size:8px;">
                        <span style="color:#0af; font-weight:bold;">${sk.name}</span>: <span style="color:#ccc;">${fmtStats(sk.desc || sk.full || '')}</span>
                    </div>`;
                }).join('');

                div.innerHTML = unownedCompact + `
                    <div style="border-top:1px solid #334; margin-top:8px; padding-top:8px;">
                        <div style="font-size:8px; color:#aaa; margin-bottom:6px; line-height:1.5;">
                            Базовые параметры: СИЛ ${dbH.baseStr} (+${dbH.gainStr}/ур.) • ИНТ ${dbH.baseInt} (+${dbH.gainInt}/ур.) • БРО ${dbH.baseArmor} • МН ${dbH.baseMp}
                        </div>
                        <div style="font-size:8px; color:gold; margin-bottom:4px; font-weight:bold;">Способности:</div>
                        ${skillsPreview}
                    </div>
                `;
            }
        } else {
            let stats = getHeroStats(owned, dbH);
            let rowLabel = owned.row === 'back' ? '[2-й ряд]' : '[1-й ряд]';
            let rowColor = owned.row === 'back' ? '#0af' : '#fa0';
            let isInSquad = state.squad.includes(owned.id);

            let squadBtnHtml = '';
            if (isInSquad) {
                squadBtnHtml = `<span style="color:#0f0; font-size:8px; font-weight:bold;">✓ В отряде</span>`;
            } else if (state.squad.length < maxSquad) {
                squadBtnHtml = `<button onclick="event.stopPropagation(); addToSquad('${owned.id}')" style="padding:3px 8px; font-size:8px; background:#142; border-color:#284;">+ В отряд</button>`;
            } else {
                squadBtnHtml = `<span style="color:#777; font-size:8px;">Отряд полон</span>`;
            }

            let compactHeader = `
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:4px;">
                    <div>
                        <span style="font-size:11px; font-weight:bold;">${dbH.icon} ${dbH.name}</span>
                        <span style="color:gold; font-size:9px; margin-left:4px;">Ур. ${owned.level}</span>
                        <span class="role-tag" style="margin-left:4px;">${dbH.role}</span>
                        <span style="color:${rowColor}; font-size:8px; margin-left:4px; font-weight:bold;">${rowLabel}</span>
                    </div>
                    <div style="display:flex; align-items:center; gap:6px;">
                        ${squadBtnHtml}
                    </div>
                </div>
                <div style="font-size:8px; color:#aaa; margin-top:5px;">
                    <span style="color:#0f0;">ЗД: ${stats.maxHp}</span> | <span style="color:#fa0;">УРН: ${stats.atk}</span> | <span style="color:#ddd;">БРО: ${stats.armor}</span> | <span style="color:#6cf;">МАГ.РЕЗ: ${Math.round(stats.magicRes * 100)}%</span>
                </div>
            `;

            if (!isExpanded) {
                div.innerHTML = compactHeader;
            } else {
                let xpNeed = xpNeeded(owned.level);
                let xpPct = owned.level >= 25 ? 100 : Math.min(100, (owned.xp / xpNeed) * 100);
                let xpHtml = owned.level >= 25 ? '<span style="color:gold;">MAX УР.</span>'
                    : `Опыт: ${owned.xp}/${xpNeed} <span style="color:#0af;">(${xpPct.toFixed(0)}%)</span>`;
                let skillsHtml = dbH.skills.map((sk, idx) => {
                    let lvl = owned.skillLevels[idx];
                    let maxLvl = sk.dmg.length;
                    let isUlt = (idx === 3);
                    let reqLvl = isUlt ? [6, 12, 18][lvl] : 0;
                    let canLevel = owned.sp > 0 && lvl < maxLvl && (!isUlt || owned.level >= reqLvl);
                    let lock = (isUlt && owned.level < reqLvl && lvl < maxLvl)
                        ? `<div style="font-size:7px; color:#a55; margin-top:2px;">🔒 Нужен ${reqLvl} ур.</div>` : '';
                    let col = lvl > 0 ? '#0af' : '#666';
                    return `<div style="border-top:1px solid #333; margin-top:6px; padding-top:6px;">
                        <span style="color:${col}; font-size:9px;">${isUlt ? '⭐ ' : ''}${sk.name} (${lvl}/${maxLvl})</span>
                        <button class="info-btn" style="float:right; padding:2px 6px;" onclick="event.stopPropagation(); showSkillInfo('${dbH.id}',${idx})">[?]</button>
                        ${canLevel ? `<button onclick="event.stopPropagation(); upgradeSkill('${owned.id}',${idx})" style="padding:2px 8px; float:right; background:#005; border-color:#008; margin-right:4px;">+</button>` : ''}
                        ${getSkillMetaHtml(sk, owned.level)}
                        ${lock}
                    </div>`;
                }).join('');

                div.innerHTML = compactHeader + `
                    <div style="border-top:1px solid #334; margin-top:8px; padding-top:8px;">
                        <p style="color:#aaa; font-size:8px; margin-bottom:6px; line-height:1.6;">${formatHeroStatsBlock(stats, dbH.mainAttr)}</p>
                        <p style="color:#aaa; font-size:8px; margin-bottom:6px;">${xpHtml} | <span style="color:gold;">SP: ${owned.sp}</span></p>
                        <div class="hp-bar-bg" style="background:#224; height:5px; margin-bottom:8px;">
                            <div style="background:#0af; height:100%; width:${xpPct}%; transition:width 0.3s;"></div>
                        </div>
                        ${skillsHtml}
                    </div>`;
            }
        }
        list.appendChild(div);
    });
}

window.expandedHeroCards = window.expandedHeroCards || {};
function toggleHeroCard(heroId) {
    window.expandedHeroCards = window.expandedHeroCards || {};
    window.expandedHeroCards[heroId] = !window.expandedHeroCards[heroId];
    renderHeroes();
}
window.toggleHeroCard = toggleHeroCard;

function toggleHeroRow(heroId) {
    let h = state.heroes.find(x => x.id === heroId);
    if (!h) return;
    h.row = (h.row === 'front') ? 'back' : 'front';
    save();
}

function renderSquad() {
    const list = document.getElementById('squad-list');
    if (!list) return;
    list.innerHTML = '';

    let maxSquad = getMaxSquadSize();
    let hdr = document.getElementById('squad-header-title');
    if (hdr) hdr.innerText = `Ваш Отряд (${state.squad.length} / ${maxSquad} слотов)`;

    if (state.squad.length === 0) {
        list.innerHTML = '<p style="color:#777; text-align:center; padding:20px;">Отряд пуст. Добавьте героев во вкладке «Таверна».</p>';
        return;
    }

    let f = (typeof getUnlockedFeatures === 'function') ? getUnlockedFeatures() : { partyBackRow: true, neutralSlot: true };
    const squadHeroes = state.squad.map(id => state.heroes.find(x => x.id === id)).filter(Boolean);
    const frontList = squadHeroes.filter(h => (h.row || 'front') === 'front');
    const backList = squadHeroes.filter(h => h.row === 'back');

    const renderCard = (h) => {
        const dbH = DB.heroes.find(x => x.id === h.dbId);
        let typeTag = dbH.isMelee ? '<span style="color:#fa0; font-size:7px;">Ближ.</span>' : '<span style="color:#0af; font-size:7px;">Дальн.</span>';
        let warn = (dbH.isMelee && h.row === 'back' && f.partyBackRow) ? '<div style="font-size:7px; color:#f88; margin-top:3px;">⚠ −25% УРН с руки</div>' : '';
        let itemIcons = (h.items || []).filter(Boolean).map(iid => { let it = findAnyItem(iid); return it ? it.icon : ''; }).join('');
        let neutObj = (h.neutralItem && f.neutralSlot) ? findAnyItem(h.neutralItem) : null;
        if (neutObj) itemIcons += (itemIcons ? ' ' : '') + `<span style="border:1px solid #0ef; border-radius:3px; padding:0 2px; background:#123;">${neutObj.icon}</span>`;
        let moveLabel = h.row === 'front' ? '⬇ Во 2-й' : '⬆ В 1-й';
        let moveBtn = f.partyBackRow ? `<button class="row-move-btn" onclick="event.stopPropagation(); toggleHeroRow('${h.id}')">${moveLabel}</button>` : '';
        return `<div class="card" style="display:flex; justify-content:space-between; align-items:center; cursor:pointer; margin-bottom:6px;" onclick="openHeroSetup('${h.id}')">
            <div>${dbH.icon} ${dbH.name} <span style="color:gold; font-size:8px;">Ур.${h.level}</span> ${typeTag}
            ${warn}
            ${itemIcons ? `<div style="margin-top:4px; font-size:12px;">${itemIcons}</div>` : ''}</div>
            <div style="display:flex; align-items:center;">
                ${moveBtn}
                <button style="background:#500; font-size:7px; padding:5px 6px;" onclick="event.stopPropagation(); removeFromSquad('${h.id}')">✕</button>
            </div>
        </div>`;
    };

    list.innerHTML += `<div class="squad-row-box">
        <div class="squad-row-title" style="color:#fa0;">🛡️ 1-й ряд — Передовая <span style="color:#888; font-size:7px;">(+2 БРО, 80% ближних атак)</span></div>
        ${frontList.length ? frontList.map(renderCard).join('') : '<p style="color:#666; font-size:8px; text-align:center; padding:6px;">Пусто — враги сразу будут бить 2-й ряд</p>'}
    </div>`;

    if (f.partyBackRow) {
        list.innerHTML += `<div class="squad-row-box">
            <div class="squad-row-title" style="color:#0af;">🏹 2-й ряд — Тыл <span style="color:#888; font-size:7px;">(−15% физ. урона от ближников)</span></div>
            ${backList.length ? backList.map(renderCard).join('') : '<p style="color:#666; font-size:8px; text-align:center; padding:6px;">Пусто</p>'}
        </div>`;
    }

    if (maxSquad < 5) {
        let nextSlotTxt = maxSquad === 3 ? '4-й слот откроется за босса Акта 1 (Этап 5)' : '5-й слот откроется за босса Акта 2 (Этап 10)';
        list.innerHTML += `<div style="font-size:7px; color:#ca0; text-align:center; margin-bottom:8px;">🔒 ${nextSlotTxt}</div>`;
    }

    list.innerHTML += `<button onclick="switchTab('raid')" style="width:100%; padding:13px; background:#800; font-size:11px;">🔥 К КАМПАНИИ И РЕЙДАМ</button>`;
}

function buyHero(dbId) {
    const dbH = DB.heroes.find(x => x.id === dbId);
    if (!dbH || dbH.storyUnlock || dbH.unlockAct > getUnlockedHeroAct()) return;
    if (state.heroes.some(h => h.dbId === dbId)) return;
    let cost = getHeroCurrentCost(dbH);
    if (state.gold >= cost) {
        state.gold -= cost;
        let newHero = {
            id: Math.random().toString(36).substr(2, 9), dbId,
            level: 1, xp: 0, sp: 1, skillLevels: [0, 0, 0, 0],
            hasShard: false, hasScepter: false, items: [], neutralItem: null, duelDmg: 0,
            row: dbH.isMelee ? 'front' : 'back'
        };
        state.heroes.push(newHero);
        if (state.squad.length < getMaxSquadSize()) state.squad.push(newHero.id);

        // v4.6: Проверка на покупку 2-го героя (первого нанятого компаньона) -> открытие Трав и Чая
        if (!state.teaUnlocked && state.heroes.length >= 2) {
            state.teaUnlocked = true;
            state.herbs = (state.herbs || 0) + 3;
            state.seenTabs = state.seenTabs || {};
            state.seenTabs.forest = false;
            setTabBadge('forest', true);
            showFeatureToast('🌿 В Лесу открыты 🌿 Травы и 🫖 Котелок — собирайте травы, заваривайте чай перед боями и усиливайте весь отряд.');

            const heroTeaLore = {
                cm: '«Я знаю толк в северных травах! Добавь ледяную мяту в походный котелок — и мана польётся рекой. Держи мой запас снегоцвета (+3 🌿)!»',
                lion: '«В пустошах преисподней мало что растёт, но эти ядовито-пряные сборы мгновенно проясняют рассудок. Держи три пучка (+3 🌿), завари в котелке!»',
                lina: '«Огонь согреет любой настой! Крепкий иван-чай разжигает пламя ярости в крови. Держи сушёные сборы (+3 🌿), котелок уже кипит!»',
                lc: '«Перед атакой воины Бронзового легиона всегда пьют крепкий отвар ромашки и чабреца. Держи походный запас (+3 🌿), налей в котелок!»',
                dazzle: '«Хе-хе, духи тени шепчут тайные сборы! В котелке можно сварить отвар невиданной силы! Держи сушёные травы (+3 🌿)!»',
                kunkka: '«Старый морской рецепт: бросить пару листов мяты прямо в кружку с ромом! Держи пучок трав (+3 🌿), согреет в любом бою!»',
                wk: '«Даже костям нужна крепость! Отвары из могильных трав возвращают былую мощь. Забирай эти сборы (+3 🌿)!»',
                silencer: '«Тишина чащи рождает лучшие целебные травы. Они успокаивают нервы и даруют ясный разум. Держи три пучка (+3 🌿).»'
            };
            let loreText = heroTeaLore[dbH.id] || '«В долгом походе горячий настой из лесных трав незаменим. В Лесу травы дают силы и восстанавливают здоровье. Держи стартовый сбор (+3 🌿)!»';

            showCustomStory({
                icon: dbH.icon,
                title: '☕ Походный чай и Травы',
                text: `<b style="color:gold;">${dbH.name}:</b> ${loreText}<br><br><span style="color:#6f8;">В Лесу открыт сбор трав и походный котелок. Заваривайте чай перед рейдами!</span>`
            });
        }

        save();
        updateUI();
    }
}

function upgradeSkill(heroId, idx) {
    const h = state.heroes.find(x => x.id === heroId);
    if (!h || h.sp <= 0) return;
    let lvl = h.skillLevels[idx];
    let dbH = DB.heroes.find(x => x.id === h.dbId);
    if (lvl >= dbH.skills[idx].dmg.length) return;
    if (idx === 3 && h.level < [6, 12, 18][lvl]) return;
    h.sp--; h.skillLevels[idx]++;
    save();
}

function addToSquad(id) { if (state.squad.length < getMaxSquadSize()) { state.squad.push(id); save(); } }
function removeFromSquad(id) { state.squad = state.squad.filter(x => x !== id); save(); }

/* ===== НАСТРОЙКА ГЕРОЯ И СЛОТЫ ===== */
function openHeroSetup(heroId) {
    let hero = state.heroes.find(h => h.id === heroId);
    let dbH = DB.heroes.find(h => h.id === hero.dbId);
    let stats = getHeroStats(hero, dbH);

    document.getElementById('hs-name').innerText = `${dbH.icon} ${dbH.name} (Ур. ${hero.level})`;
    let rowTxt = hero.row === 'front' ? '🛡️ 1-й ряд (Передовая, +2 БРО)' : '🏹 2-й ряд (Тыл, −15% ближ. физ. урон)';
    document.getElementById('hs-stats').innerHTML = formatHeroStatsBlock(stats, dbH.mainAttr) +
        `<br><span style="color:#ccc;">Позиция: ${rowTxt}</span>` +
        (hero.duelDmg ? `<br><span style="color:gold;">🏆 Бонус Дуэлей: +${hero.duelDmg} УРН</span>` : '');

    let buffs = [];
    if (hero.hasShard) buffs.push('💎 Аганим Шард (+20% урона скиллов)');
    if (hero.hasScepter) buffs.push('🌀 Аганим Блессинг (+30% урона ульты)');
    let buffsHtml = buffs.length ? buffs.join('<br>') : 'Нет улучшений';
    if (state.raidInv.includes('shard') && !hero.hasShard) {
        buffsHtml += `<br><button onclick="consumeAghanim('${hero.id}', 'shard')" style="margin-top:5px; padding:4px 8px; font-size:8px; background:#250;">Съесть Шард</button>`;
    }
    if (state.raidInv.includes('scepter') && !hero.hasScepter) {
        buffsHtml += `<br><button onclick="consumeAghanim('${hero.id}', 'scepter')" style="margin-top:5px; padding:4px 8px; font-size:8px; background:#250;">Съесть Блессинг</button>`;
    }
    document.getElementById('hs-buffs').innerHTML = buffsHtml;

    let invHtml = '';
    for (let i = 0; i < 6; i++) {
        let itemId = (hero.items || [])[i];
        let item = itemId ? findAnyItem(itemId) : null;
        invHtml += `<div style="width:42px; height:42px; border:1px solid ${item ? '#0af' : '#555'}; background:#1a1a1a; display:flex; align-items:center; justify-content:center; font-size:18px; cursor:pointer; border-radius:4px;"
            title="${item ? item.name : 'Пусто'}" onclick="assignItemToHero('${hero.id}', ${i})">${item ? item.icon : '—'}</div>`;
    }
    document.getElementById('hs-items').innerHTML = invHtml;

    let f = (typeof getUnlockedFeatures === 'function') ? getUnlockedFeatures() : { neutralSlot: true };
    let neutSec = document.getElementById('hs-neutral-section');
    if (neutSec) {
        neutSec.style.display = f.neutralSlot ? 'block' : 'none';
    }
    let neutIt = hero.neutralItem ? findAnyItem(hero.neutralItem) : null;
    let neutEl = document.getElementById('hs-neutral-slot');
    if (neutEl) {
        neutEl.innerHTML = `<div class="neutral-slot-box" title="${neutIt ? neutIt.name : 'Пустой нейтральный слот'}" onclick="assignItemToHero('${hero.id}', 'neutral')">${neutIt ? neutIt.icon : '🎁'}</div>`;
    }

    document.getElementById('hs-skills').innerHTML = dbH.skills.map((sk, idx) =>
        `<div style="margin-bottom:4px;">${sk.name} (${hero.skillLevels[idx]}/${sk.dmg.length})</div>`
    ).join('');

    document.getElementById('hero-setup-modal').style.display = 'flex';
}
function closeHeroSetup() { document.getElementById('hero-setup-modal').style.display = 'none'; }

function consumeAghanim(heroId, type) {
    let hero = state.heroes.find(h => h.id === heroId);
    let idx = state.raidInv.indexOf(type);
    if (idx !== -1) {
        state.raidInv.splice(idx, 1);
        if (type === 'shard') hero.hasShard = true;
        if (type === 'scepter') hero.hasScepter = true;
        save();
        openHeroSetup(heroId);
    }
}

let currentAssignContext = { heroId: null, slot: null };

function assignItemToHero(heroId, slot) {
    currentAssignContext = { heroId, slot };
    let hero = state.heroes.find(h => h.id === heroId);
    let isNeutralSlot = (slot === 'neutral');
    let curItemId = isNeutralSlot ? hero.neutralItem : (hero.items || [])[slot];

    let sourceInv = isNeutralSlot ? state.neutralInv : state.raidInv;
    let equippable = sourceInv.filter(id => {
        let it = findAnyItem(id);
        return it && !it.consumable && !it.isRecipe;
    });

    let list = document.getElementById('item-select-list');
    list.innerHTML = '';

    if (curItemId) {
        let curIt = findAnyItem(curItemId);
        list.innerHTML += `<button onclick="unequipSlot()" style="width:100%; background:#620; margin-bottom:6px; font-size:8px;">↩️ Снять ${curIt ? curIt.icon + ' ' + curIt.name : 'предмет'}</button>`;
    }

    if (equippable.length === 0) {
        list.innerHTML += `<p style="color:#aaa;">${isNeutralSlot ? 'Нет свободных нейтральных предметов. Их можно выбить в Лесу или в Рейдах (особенно в Засаде).' : 'Нет свободных артефактов в общем инвентаре.'}</p>`;
    } else {
        let unique = [...new Set(equippable)];
        unique.forEach(id => {
            let it = findAnyItem(id);
            let cnt = equippable.filter(x => x === id).length;
            list.innerHTML += `<div class="card" style="margin:0; padding:8px; display:flex; align-items:center; cursor:pointer; background:${isNeutralSlot ? '#162432' : '#2a2a2a'}; border-color:${isNeutralSlot ? '#0ef' : '#444'};" onclick="doEquipItem('${id}')">
                <div style="font-size:20px; margin-right:10px;">${it.icon}</div>
                <div style="flex:1;">
                    <div style="color:${isNeutralSlot ? '#0ef' : '#0f0'}; font-size:8px;">${it.name} ${cnt > 1 ? `(×${cnt})` : ''}</div>
                    <div style="font-size:7px; color:#aaa;">${fmtStats(it.short)}</div>
                </div>
            </div>`;
        });
    }
    document.getElementById('item-select-modal').style.display = 'flex';
}

function unequipSlot() {
    let { heroId, slot } = currentAssignContext;
    let hero = state.heroes.find(h => h.id === heroId);
    if (slot === 'neutral') {
        if (hero.neutralItem) {
            state.neutralInv.push(hero.neutralItem);
            hero.neutralItem = null;
        }
    } else {
        let oldId = hero.items && hero.items[slot];
        if (oldId) {
            state.raidInv.push(oldId);
            hero.items[slot] = null;
        }
    }
    closeItemSelect();
    save();
    openHeroSetup(heroId);
}

function doEquipItem(itemId) {
    let { heroId, slot } = currentAssignContext;
    let hero = state.heroes.find(h => h.id === heroId);
    if (slot === 'neutral') {
        if (hero.neutralItem) state.neutralInv.push(hero.neutralItem);
        hero.neutralItem = itemId;
        let nIdx = state.neutralInv.indexOf(itemId);
        if (nIdx !== -1) state.neutralInv.splice(nIdx, 1);
    } else {
        hero.items = hero.items || [];
        if (hero.items[slot]) state.raidInv.push(hero.items[slot]);
        hero.items[slot] = itemId;
        let idx = state.raidInv.indexOf(itemId);
        if (idx !== -1) state.raidInv.splice(idx, 1);
    }
    closeItemSelect();
    save();
    openHeroSetup(heroId);
}

function closeItemSelect() { document.getElementById('item-select-modal').style.display = 'none'; }
