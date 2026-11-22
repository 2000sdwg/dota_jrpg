/* =====================================================================
   АВТОНОМНАЯ ПАНЕЛЬ ТЕСТИРОВАНИЯ (DEBUG)
   Чтобы полностью убрать перед релизом:
   1. Удали этот файл (debug.js)
   2. Удали строку подключения debug.js в index.html
   ===================================================================== */
(function initDebugTools() {
    window.DEBUG_BYPASS_GATES = false;

    const style = document.createElement('style');
    style.textContent = `
        #dbg-toggle-btn {
            position: fixed; top: 46px; right: 6px; z-index: 450;
            background: #203; border: 2px solid #a0f; color: #f8f;
            padding: 4px 7px; font-size: 8px; border-radius: 4px;
            opacity: 0.9; cursor: pointer;
        }
        #dbg-panel {
            position: fixed; top: 76px; right: 6px; width: 290px; max-width: calc(100vw - 12px);
            max-height: 76vh; overflow-y: auto; z-index: 450;
            background: rgba(16, 12, 24, 0.96); border: 2px solid #a0f; border-radius: 6px;
            padding: 10px; display: none; box-shadow: 0 4px 20px #000;
        }
        .dbg-sec { border-top: 1px solid #426; margin-top: 8px; padding-top: 6px; }
        .dbg-title { font-size: 7px; color: #d8f; margin-bottom: 5px; }
        .dbg-row { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 4px; }
        .dbg-btn {
            flex: 1; min-width: 52px; padding: 5px 4px; font-size: 7px;
            background: #2a183d; border: 1px solid #74a; color: #fff;
        }
        .dbg-btn.warn { background: #521; border-color: #c53; }
        .dbg-btn.ok { background: #142; border-color: #3a5; }
        #dbg-stage-select {
            width: 100%; background: #111; color: #ff8; border: 1px solid #74a;
            padding: 5px; font-size: 8px; margin-bottom: 5px; font-family: inherit;
        }
    `;
    document.head.appendChild(style);

    const btn = document.createElement('button');
    btn.id = 'dbg-toggle-btn';
    btn.innerText = '🛠️ ТЕСТ';
    btn.onclick = () => {
        const p = document.getElementById('dbg-panel');
        p.style.display = p.style.display === 'none' ? 'block' : 'none';
        if (p.style.display === 'block') syncDebugStageSelect();
    };
    document.body.appendChild(btn);

    const panel = document.createElement('div');
    panel.id = 'dbg-panel';

    let stageOptions = '';
    for (let s = 1; s <= 25; s++) {
        let meta = typeof getStageMeta === 'function' ? getStageMeta(s) : { title: 'Этап ' + s };
        stageOptions += `<option value="${s}">Этап ${s}: ${meta.title}</option>`;
    }

    panel.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <span style="color:#f8f; font-size:8px;">🛠️ ПАНЕЛЬ ТЕСТИРОВАНИЯ</span>
            <button onclick="document.getElementById('dbg-panel').style.display='none'" style="padding:2px 6px; font-size:8px;">✕</button>
        </div>

        <div class="dbg-sec" style="border-top:none; margin-top:0; padding-top:0;">
            <div class="dbg-title">💰 ЗОЛОТО</div>
            <div class="dbg-row">
                <button class="dbg-btn ok" onclick="dbgAddGold(500)">+500</button>
                <button class="dbg-btn ok" onclick="dbgAddGold(5000)">+5K</button>
                <button class="dbg-btn ok" onclick="dbgAddGold(50000)">+50K</button>
            </div>
            <div class="dbg-row">
                <button class="dbg-btn warn" onclick="dbgAddGold(-500)">−500</button>
                <button class="dbg-btn warn" onclick="dbgAddGold(-5000)">−5K</button>
                <button class="dbg-btn warn" onclick="dbgSetGold(0)">= 0 G</button>
            </div>
        </div>

        <div class="dbg-sec">
            <div class="dbg-title">🔥 ПРЫЖКИ ПО ЭТАПАМ РЕЙДА (1–25)</div>
            <select id="dbg-stage-select">${stageOptions}</select>
            <div class="dbg-row">
                <button class="dbg-btn" onclick="dbgJumpStage(false)">Выбрать этап</button>
                <button class="dbg-btn ok" onclick="dbgJumpStage(true)">⚔️ Сразу в бой</button>
            </div>
            <div class="dbg-row">
                <button class="dbg-btn" onclick="dbgUnlockAllStages()">🔓 Открыть 1–25</button>
                <button class="dbg-btn" id="dbg-gate-btn" onclick="dbgToggleGateBypass()">Рубежи: ВКЛ</button>
            </div>
            <div class="dbg-row">
                <button class="dbg-btn ok" onclick="dbgInstantWin()">⚡ Мгновенно победить в бою</button>
            </div>
        </div>

        <div class="dbg-sec">
            <div class="dbg-title">🌲 ЛЕС И СБОР ЧАЯ</div>
            <div class="dbg-row">
                <button class="dbg-btn" onclick="dbgUnlockForest()">🔓 Лес</button>
                <button class="dbg-btn ok" onclick="dbgAddHerbs(10)">+10 🌿</button>
                <button class="dbg-btn" onclick="dbgBoostForestStats()">+100 кр / +5 ст / +3 р</button>
            </div>
            <div class="dbg-row">
                <button class="dbg-btn" onclick="dbgGiveForestGear()">🖐️ Мидас + 👹 Дом(20) + ✨ Рад</button>
            </div>
        </div>

        <div class="dbg-sec">
            <div class="dbg-title">🛡️ ГЕРОИ И ОТРЯД</div>
            <div class="dbg-row">
                <button class="dbg-btn ok" onclick="dbgLvlSquad(1)">+1 Ур. отряду</button>
                <button class="dbg-btn ok" onclick="dbgLvlSquad(5)">+5 Ур. отряду</button>
            </div>
            <div class="dbg-row">
                <button class="dbg-btn" onclick="dbgUnlockAllRelics()">🏆 Все Трофеи (5 слотов)</button>
            </div>
        </div>
    `;
    document.body.appendChild(panel);

    window.syncDebugStageSelect = function() {
        const sel = document.getElementById('dbg-stage-select');
        if (sel && typeof state !== 'undefined') sel.value = String(state.selectedStage || 1);
    };

    window.dbgAddGold = function(delta) {
        state.gold = Math.max(0, (state.gold || 0) + delta);
        save();
    };
    window.dbgSetGold = function(val) {
        state.gold = Math.max(0, val);
        save();
    };

    window.dbgUnlockAllStages = function() {
        state.forestUnlocked = true;
        state.maxRaidCleared = 25;
        state.raidLevel = 25;
        save();
    };

    window.dbgToggleGateBypass = function() {
        window.DEBUG_BYPASS_GATES = !window.DEBUG_BYPASS_GATES;
        const b = document.getElementById('dbg-gate-btn');
        if (b) b.innerText = window.DEBUG_BYPASS_GATES ? 'Рубежи: ПРОПУСК' : 'Рубежи: ВКЛ';
        save();
    };

    window.dbgJumpStage = function(startNow) {
        const sel = document.getElementById('dbg-stage-select');
        const st = parseInt(sel.value, 10) || 1;
        if (st > 1) state.forestUnlocked = true;
        if (state.maxRaidCleared < st - 1) state.maxRaidCleared = st - 1;
        state.selectedStage = st;
        window.DEBUG_BYPASS_GATES = true;
        const gb = document.getElementById('dbg-gate-btn');
        if (gb) gb.innerText = 'Рубежи: ПРОПУСК';
        if (typeof combat !== 'undefined' && combat.active) combat.active = false;
        save();
        switchTab('raid');
        if (startNow) {
            document.getElementById('dbg-panel').style.display = 'none';
            startRaid(st, 'normal');
        }
    };

    window.dbgInstantWin = function() {
        if (typeof combat !== 'undefined' && combat.active) {
            combat.targets.filter(t => t.isEnemy).forEach(e => { e.hp = 0; });
            if (typeof nextTurn === 'function') nextTurn();
        }
    };

    window.dbgUnlockForest = function() {
        state.forestUnlocked = true;
        if (state.maxRaidCleared < 1) state.maxRaidCleared = 1;
        save();
    };

    window.dbgAddHerbs = function(n) {
        state.herbs = (state.herbs || 0) + n;
        save();
    };

    window.dbgBoostForestStats = function() {
        state.forestUnlocked = true;
        state.creepsKilled = (state.creepsKilled || 0) + 100;
        state.stacksKilled = (state.stacksKilled || 0) + 5;
        state.runesClaimed = (state.runesClaimed || 0) + 3;
        state.herbs = (state.herbs || 0) + 5;
        save();
    };

    window.dbgGiveForestGear = function() {
        state.forestUnlocked = true;
        state.forestItemLevels.midas = Math.max(1, state.forestItemLevels.midas || 0);
        state.forestItemLevels.dominator = Math.max(1, state.forestItemLevels.dominator || 0);
        state.forestItemLevels.radiance = Math.max(1, state.forestItemLevels.radiance || 0);
        state.forestArmy = Math.max(20, state.forestArmy || 0);
        state.kettleLevel = Math.max(2, state.kettleLevel || 0);
        state.teasBrewed = Math.max(1, state.teasBrewed || 0);
        save();
    };

    window.dbgLvlSquad = function(lvls) {
        state.squad.forEach(id => {
            let h = state.heroes.find(x => x.id === id);
            if (!h) return;
            for (let i = 0; i < lvls && h.level < 25; i++) {
                h.level++;
                h.sp++;
            }
        });
        save();
    };

    window.dbgUnlockAllRelics = function() {
        state.forestUnlocked = true;
        Object.keys(RELICS_DB).forEach(rid => {
            if (!state.relics.includes(rid)) state.relics.push(rid);
        });
        save();
    };
})();
