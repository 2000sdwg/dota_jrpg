/* ===== КЛИКЕР И ВКЛАДКА ЛЕС (ПРОГРЕССИЯ ОТ АКТОВ РЕЙДА) ===== */
let currentCreep = { hp:15, maxHp:15, gold:5, name:'Крип-мечник', icon:'🧟', isAncient:false, isStacked:false, stackTimeLeft:0 };
let midasCooldown = 0;
let radianceCharges = 0;
let goblinTimer = null;
let clickTimestamps = [];
let stackCooldown = 0;
let nextCreepStacked = false;
let runeSpawnTimer = 45;
let pendingRune = null;
let runeHideTimer = null;
let runeToastTimer = null;
let activeRuneBuff = { type: null, sec: 0 };

function getForestGoldMult() {
    let m = 1 + (state.kettleLevel || 0) * CONFIG.forest.kettleGoldPctPerLvl;
    if (state.relics.includes('act5_crown')) m *= 1.25;
    return m;
}

function awardForestHerbProgress(isGoblin) {
    if (isGoblin) {
        state.herbs = (state.herbs || 0) + CONFIG.forest.goblinHerbs;
        showRuneToast(`💰 Золотой Гоблин уронил +${CONFIG.forest.goblinHerbs} 🌿!`);
        return;
    }
    state.herbCreepProgress = (state.herbCreepProgress || 0) + 1;
    if (state.herbCreepProgress >= CONFIG.forest.creepsPerHerb) {
        state.herbCreepProgress = 0;
        state.herbs = (state.herbs || 0) + 1;
        if (isForestActive()) showRuneToast('🌿 Вы собрали пучок лесных трав (+1 🌿)!');
    }
}

function getForestDamage() {
    let branchMult = 1;
    let qbMult = 1;
    if (state.milestones.includes('m_b10')) branchMult *= 2;
    if (state.milestones.includes('m_b25')) branchMult *= 2;
    if (state.milestones.includes('m_q10')) qbMult *= 2;
    if (state.milestones.includes('m_q25')) qbMult *= 2;

    let dmg = 1;
    state.forestInv.forEach(id => {
        let it = DB.forestItems.find(i => i.id === id);
        if (!it || !it.dmg) return;
        let d = it.dmg;
        if (id === 'branch') d *= branchMult;
        if (id === 'qb') d *= qbMult;
        dmg += d;
    });
    let radLvl = state.forestItemLevels.radiance || 0;
    dmg += radLvl * 20;
    return Math.floor(dmg);
}

function getForestCritChance() {
    let c = 0.05;
    state.forestInv.forEach(id => {
        let it = DB.forestItems.find(i => i.id === id);
        if (it && it.clickCrit) c += it.clickCrit;
    });
    return Math.min(0.65, c);
}

function getArmyDps() {
    let domLvl = state.forestItemLevels.dominator || 0;
    if (domLvl <= 0 || state.forestArmy <= 0) return 0;
    let dps = state.forestArmy * domLvl * 3;
    if (activeRuneBuff.type === 'haste' && activeRuneBuff.sec > 0) dps *= 2;
    return dps;
}

function getComboMultiplier() {
    let now = Date.now();
    clickTimestamps = clickTimestamps.filter(t => now - t <= 2000);
    let n = clickTimestamps.length;
    if (n >= 16) return 3;
    if (n >= 10) return 2;
    if (n >= 5) return 1.5;
    return 1;
}

function getForestZoneInfo() {
    if (state.maxRaidCleared >= 15) return { tier:'ancient', label:'🌲 Древние руины (Древние крипы)' };
    if (state.maxRaidCleared >= 10) return { tier:'large',   label:'🌲 Логова чащи (Крупные крипы)' };
    if (state.maxRaidCleared >= 5)  return { tier:'medium',  label:'🌲 Глухая чаща (Средние крипы)' };
    return { tier:'small', label:'🌲 Окраина троп (Лайн и Малые крипы)' };
}

function stackCamp() {
    if (!state.forestUnlocked || stackCooldown > 0 || nextCreepStacked) return;
    nextCreepStacked = true;
    stackCooldown = 30;
    updateForestUI();
}

function showRuneToast(text) {
    let el = document.getElementById('forest-rune-toast');
    if (!el) return;
    el.innerText = text;
    el.style.display = 'block';
    if (runeToastTimer) clearTimeout(runeToastTimer);
    runeToastTimer = setTimeout(() => { el.style.display = 'none'; }, 3500);
}

function spawnRune() {
    if (!state.forestUnlocked || !isForestActive() || pendingRune) return;
    const runes = [
        { type:'dd', icon:'⚡', color:'#0cf', desc:'⚡ Руна Двойного урона: ×2 урон клика на 15 сек!' },
        { type:'haste', icon:'💨', color:'#f44', desc:'💨 Руна Ускорения: ×2 урон Армии леса на 15 сек!' },
        { type:'bounty', icon:'💰', color:'#fc0', desc:'💰 Руна Богатства: мгновенное золото!' }
    ];
    pendingRune = runes[Math.floor(Math.random() * runes.length)];

    let el = document.getElementById('forest-rune-icon');
    if (el) {
        let leftPct = 14 + Math.random() * 72;
        let topPct = 16 + Math.random() * 68;
        el.innerText = pendingRune.icon;
        el.style.left = leftPct + '%';
        el.style.top = topPct + '%';
        el.style.borderColor = pendingRune.color;
        el.style.boxShadow = `0 0 16px ${pendingRune.color}, inset 0 0 8px #fff`;
        el.style.display = 'flex';
    }

    if (runeHideTimer) clearTimeout(runeHideTimer);
    runeHideTimer = setTimeout(() => {
        pendingRune = null;
        if (el) el.style.display = 'none';
    }, 1000);
}

function claimRune() {
    if (!pendingRune) return;
    let r = pendingRune;
    pendingRune = null;
    if (runeHideTimer) clearTimeout(runeHideTimer);
    let el = document.getElementById('forest-rune-icon');
    if (el) el.style.display = 'none';

    let prevTier = getHighestUnlockedShopTier();
    state.runesClaimed = (state.runesClaimed || 0) + 1;
    state.herbs = (state.herbs || 0) + CONFIG.forest.runeHerbs;

    if (r.type === 'bounty') {
        let totalPower = getForestDamage() + getArmyDps();
        let bonus = Math.max(50, Math.floor(25 * totalPower * getForestGoldMult()));
        state.gold += bonus;
        showRuneToast(`💰 Руна Богатства: +${bonus} G и +1 🌿 Трава!`);
        spawnDamageNumber(window.innerWidth / 2, window.innerHeight / 3, `+${bonus} G • +1🌿`, true);
    } else {
        activeRuneBuff = { type: r.type, sec: 15 };
        showRuneToast(`${r.desc} (+1 🌿 Трава)`);
        spawnDamageNumber(window.innerWidth / 2, window.innerHeight / 3, r.type === 'dd' ? '⚡ ×2 КЛИК • +1🌿' : '💨 ×2 АРМИЯ • +1🌿', true);
    }
    checkShopTierUnlockToast(prevTier);
    save();
}

function spawnForestCreep() {
    if (goblinTimer) clearTimeout(goblinTimer);
    let clickDmg = getForestDamage();
    let armyDps = getArmyDps();
    let totalPower = clickDmg + armyDps;

    if (state.forestUnlocked && !nextCreepStacked && Math.random() < 0.05 && isForestActive()) {
        let hp = Math.max(30, Math.floor(totalPower * 12));
        let g = Math.max(25, Math.floor(totalPower * 8 * getForestGoldMult()));
        currentCreep = { maxHp:hp, hp:hp, gold:g, name:'Золотой Гоблин', icon:'💰', isAncient:true, isStacked:false, stackTimeLeft:0 };
        goblinTimer = setTimeout(() => {
            if (currentCreep.name === 'Золотой Гоблин' && currentCreep.hp > 0) {
                currentCreep.hp = 0;
                spawnDamageNumber(window.innerWidth / 2, window.innerHeight / 2, 'ГОБЛИН СБЕЖАЛ!', true);
                spawnForestCreep();
            }
        }, 5000);
        updateForestUI();
        return;
    }

    // Доступные лагеря открываются победами над боссами Актов!
    let zone = getForestZoneInfo();
    let pool = FOREST_CREEPS.lane;
    let isAncient = false;
    if (zone.tier === 'ancient' && totalPower > 90) { pool = FOREST_CREEPS.ancient; isAncient = true; }
    else if (zone.tier === 'ancient') { pool = FOREST_CREEPS.large; }
    else if (zone.tier === 'large' && totalPower > 40) { pool = FOREST_CREEPS.large; }
    else if (zone.tier === 'large') { pool = FOREST_CREEPS.medium; }
    else if (zone.tier === 'medium' && totalPower > 14) { pool = FOREST_CREEPS.medium; }
    else if (zone.tier === 'medium') { pool = FOREST_CREEPS.small; }
    else if (totalPower > 6) { pool = FOREST_CREEPS.small; }

    let t = pool[Math.floor(Math.random() * pool.length)];
    let hp = isAncient ? Math.floor(t.hp + totalPower * 2.8) : t.hp;
    let gold = isAncient ? Math.floor((t.g + totalPower * 0.8) * getForestGoldMult()) : Math.floor(t.g * getForestGoldMult());
    let stacked = false;
    let stackTime = 0;
    let name = t.n;

    if (nextCreepStacked) {
        stacked = true;
        nextCreepStacked = false;
        let expectedActiveDps = clickDmg * 4.5 * 1.5 + armyDps;
        let challengeHp = Math.floor(expectedActiveDps * 6.2);
        hp = Math.max(Math.floor(hp * 3), challengeHp);
        gold = Math.floor(gold * 4.5);
        stackTime = 8.0;
        name = `[СТАК] ${t.n}`;
    }

    currentCreep = { maxHp:hp, hp:hp, gold:gold, name:name, icon:t.i, isAncient:isAncient, isStacked:stacked, stackTimeLeft:stackTime };
    let ic = document.getElementById('forest-creep-icon');
    if (ic) ic.classList.remove('rad-burn');
    updateForestUI();
}

function updateForestUI() {
    let zoneEl = document.getElementById('forest-zone-label');
    if (zoneEl) zoneEl.innerText = getForestZoneInfo().label;

    let pct = Math.max(0, (currentCreep.hp / currentCreep.maxHp) * 100);
    document.getElementById('forest-creep-hp').style.width = pct + '%';
    document.getElementById('forest-creep-hp-text').innerText = `${Math.max(0, Math.ceil(currentCreep.hp))} / ${currentCreep.maxHp} ЗД`;
    document.getElementById('forest-creep-name').innerText = currentCreep.name;
    document.getElementById('forest-creep-icon').innerText = currentCreep.icon;

    let midasLvl = state.forestItemLevels.midas || 0;
    let midasTxt = midasLvl > 0 ? ` | 🖐️ ${midasCooldown > 0 ? Math.ceil(midasCooldown) + 'с' : 'ГОТОВ'}` : '';
    document.getElementById('forest-dmg-display').innerText =
        `Урон клика: ${getForestDamage()} (Крит ${Math.round(getForestCritChance() * 100)}%)${midasTxt}`;

    let domLvl = state.forestItemLevels.dominator || 0;
    let armyEl = document.getElementById('forest-army-display');
    if (domLvl > 0) {
        armyEl.style.display = 'block';
        armyEl.innerText = `👹 Армия леса: ${state.forestArmy}/${domLvl * 50} (${getArmyDps()} УРН/с)`;
    } else {
        armyEl.style.display = 'none';
    }

    let combo = getComboMultiplier();
    document.getElementById('forest-combo-display').innerText = `Боевой азарт: ×${combo}`;

    let timerEl = document.getElementById('forest-stack-timer');
    if (timerEl) {
        if (currentCreep.isStacked && currentCreep.stackTimeLeft > 0) {
            timerEl.style.display = 'block';
            timerEl.innerText = `⏱ Успей убить стак: ${currentCreep.stackTimeLeft.toFixed(1)}с`;
        } else {
            timerEl.style.display = 'none';
        }
    }

    let buffEl = document.getElementById('forest-rune-buff-display');
    if (activeRuneBuff.type && activeRuneBuff.sec > 0) {
        buffEl.style.display = 'block';
        let lbl = activeRuneBuff.type === 'dd' ? '⚡ Двойной урон' : '💨 Ускорение армии';
        buffEl.innerText = `${lbl}: ${Math.ceil(activeRuneBuff.sec)}с`;
    } else {
        buffEl.style.display = 'none';
    }

    let teaBtn = document.getElementById('btn-forest-tea');
    if (teaBtn) teaBtn.innerText = `☕ Сбор чая (🌿 ${state.herbs || 0})`;

    let teaDisp = document.getElementById('forest-tea-buff-display');
    if (teaDisp) {
        let parts = [];
        if (state.activeTea) {
            let tb = TEA_BUFFS.find(x => x.id === state.activeTea);
            if (tb) parts.push(`☕ Заварен: ${tb.icon} ${tb.name}`);
        }
        parts.push(`🌿 До травы: ${state.herbCreepProgress || 0}/${CONFIG.forest.creepsPerHerb}`);
        if ((state.kettleLevel || 0) > 0) parts.push(`🫖 Котелок Ур.${state.kettleLevel}`);
        teaDisp.style.display = 'block';
        teaDisp.innerText = parts.join(' • ');
    }

    // Подсказка прогресса к следующему тиру Рейдовой лавки
    let progEl = document.getElementById('forest-shop-progress');
    if (progEl) {
        let nextTier = SHOP_TIERS.find(t => !t.check(state));
        if (nextTier) {
            progEl.innerText = `🔓 До Тир ${nextTier.tier} Лавки: ${nextTier.progress(state)}`;
            progEl.style.color = '#9cf';
        } else {
            progEl.innerText = `✨ Все 5 тиров Рейдовой лавки открыты!`;
            progEl.style.color = '#6e6';
        }
    }

    let stackBtn = document.getElementById('btn-stack-camp');
    if (nextCreepStacked) {
        stackBtn.disabled = true;
        stackBtn.innerText = '📚 Стак на след. крипе!';
    } else if (stackCooldown > 0) {
        stackBtn.disabled = true;
        stackBtn.innerText = `📚 Стак (${Math.ceil(stackCooldown)}с)`;
    } else {
        stackBtn.disabled = false;
        stackBtn.innerText = '📚 Стакнуть лагерь';
    }
}

function tryDropNeutral(chance) {
    if (Math.random() >= chance) return;
    let tier = 1;
    if (state.maxRaidCleared >= 20) tier = 5;
    else if (state.maxRaidCleared >= 15) tier = 4;
    else if (state.maxRaidCleared >= 10) tier = 3;
    else if (state.maxRaidCleared >= 5)  tier = 2;
    let n = pickRandomNeutralDrop(tier);
    if (n) {
        state.neutralInv.push(n.id);
        if (isForestActive()) showRuneToast(`🎁 Выпал нейтральный предмет (${tier} разряд): ${n.icon} ${n.name}!`);
    }
}

function checkNutcrackerDrop() {
    if (state.maxRaidCleared < 5) return;
    let hasPudge = (state.heroes || []).some(h => h.dbId === 'pudge');
    if (hasPudge) return;
    let hasNutcracker = (state.neutralInv || []).includes('enchanted_nut') ||
                        (state.neutralInv || []).includes('nutcracker') ||
                        (state.raidInv || []).includes('enchanted_nut') ||
                        (state.raidInv || []).includes('nutcracker') ||
                        (state.heroes || []).some(h => h.neutralItem === 'enchanted_nut' || h.neutralItem === 'nutcracker' || (h.items && (h.items.includes('enchanted_nut') || h.items.includes('nutcracker')))) ||
                        state.nutcrackerDropped;
    if (hasNutcracker) return;

    state.act2CreepsKilled = (state.act2CreepsKilled || 0) + 1;
    let drop = Math.random() < 0.12 || state.act2CreepsKilled >= 10;
    if (drop) {
        state.neutralInv.push('enchanted_nut');
        state.nutcrackerDropped = true;
        showRuneToast('🎁 В кустах найдено странное лакомство: 🌰 Заколдованный орех! Похоже, его можно применить на кого-то в бою...');
        save();
    }
}

function checkShopTierUnlockToast(prevTier) {
    let curTier = getHighestUnlockedShopTier();
    if (curTier > prevTier) {
        let tObj = SHOP_TIERS.find(t => t.tier === curTier);
        if (tObj) showRuneToast(`🔓 Открыта Лавка: ${tObj.name}!`);
    }
}

function clickCreep(e) {
    if (!state.forestUnlocked || currentCreep.hp <= 0) return;
    clickTimestamps.push(Date.now());

    let dmg = getForestDamage() * getComboMultiplier();
    if (activeRuneBuff.type === 'dd' && activeRuneBuff.sec > 0) dmg *= 2;
    let crit = Math.random() < getForestCritChance();
    let fd = Math.floor(crit ? dmg * 2 : dmg);

    let radLvl = state.forestItemLevels.radiance || 0;
    let domLvl = state.forestItemLevels.dominator || 0;
    let midasLvl = state.forestItemLevels.midas || 0;

    if (radLvl > 0) {
        radianceCharges++;
        if (radianceCharges >= 10) {
            fd += Math.floor(getForestDamage() * (4 + radLvl * 4));
            radianceCharges = 0;
            document.getElementById('forest-creep-icon').classList.add('rad-burn');
            spawnDamageNumber(e.clientX, e.clientY - 22, 'RADIANCE!', true);
        }
    }

    if (midasLvl > 0 && midasCooldown <= 0 && !currentCreep.isAncient && !currentCreep.isStacked) {
        fd = currentCreep.hp;
        currentCreep.gold = Math.floor(currentCreep.gold * (2 + midasLvl * 0.5));
        midasCooldown = Math.max(20, 65 - midasLvl * 5);
        spawnDamageNumber(e.clientX, e.clientY, 'MIDAS!', true);
    } else {
        spawnDamageNumber(e.clientX, e.clientY, fd, crit);
    }

    currentCreep.hp -= fd;
    spawnSparks(e.clientX, e.clientY, crit ? 10 : 5, crit);
    shakeCreep(); flashCreep();

    if (currentCreep.hp <= 0) {
        if (goblinTimer) clearTimeout(goblinTimer);
        explosionEffect(e.clientX, e.clientY);

        let prevTier = getHighestUnlockedShopTier();
        let recruitChance = 0.04 + domLvl * 0.01;
        let armyCap = domLvl * 50;
        if (domLvl > 0 && state.forestArmy < armyCap && !currentCreep.isAncient && !currentCreep.isStacked && Math.random() < recruitChance) {
            state.forestArmy++;
            spawnDamageNumber(e.clientX, e.clientY, 'ВЕРБОВКА!', false);
        } else {
            state.gold += currentCreep.gold;
            if (currentCreep.isStacked) {
                state.stacksKilled = (state.stacksKilled || 0) + 1;
                state.herbs = (state.herbs || 0) + CONFIG.forest.stackHerbs;
                showRuneToast(`🏆 Стак убит: +${currentCreep.gold} G и +1 🌿 Трава!`);
                spawnDamageNumber(e.clientX, e.clientY - 26, `🏆 +${currentCreep.gold} G • +1🌿`, true);
            }
        }
        let nChance = currentCreep.name === 'Золотой Гоблин' ? CONFIG.neutrals.forestGoblinChance : (currentCreep.isStacked ? CONFIG.neutrals.forestStackChance : CONFIG.neutrals.forestCreepChance);
        tryDropNeutral(nChance);
        checkNutcrackerDrop();
        state.creepsKilled++;
        awardForestHerbProgress(currentCreep.name === 'Золотой Гоблин');
        checkShopTierUnlockToast(prevTier);
        save();
        spawnForestCreep();
    } else {
        updateForestUI();
    }
}

setInterval(() => {
    if (!state.forestUnlocked) return;

    if (midasCooldown > 0) midasCooldown = Math.max(0, midasCooldown - 0.1);
    if (stackCooldown > 0) stackCooldown = Math.max(0, stackCooldown - 0.1);
    if (activeRuneBuff.sec > 0) {
        activeRuneBuff.sec = Math.max(0, activeRuneBuff.sec - 0.1);
        if (activeRuneBuff.sec <= 0) activeRuneBuff.type = null;
    }

    if (isForestActive()) {
        runeSpawnTimer -= 0.1;
        if (runeSpawnTimer <= 0) {
            runeSpawnTimer = 35 + Math.random() * 25;
            spawnRune();
        }
    }

    if (!currentCreep || currentCreep.hp <= 0) return;

    if (currentCreep.isStacked && isForestActive()) {
        currentCreep.stackTimeLeft = Math.max(0, currentCreep.stackTimeLeft - 0.1);
        if (currentCreep.stackTimeLeft <= 0) {
            currentCreep.hp = 0;
            spawnDamageNumber(window.innerWidth / 2, window.innerHeight / 2, 'СТАК РАЗБЕЖАЛСЯ!', true);
            spawnForestCreep();
            return;
        }
    }

    let dps = getArmyDps();
    if (dps > 0) {
        currentCreep.hp -= dps / 10;
        if (isForestActive() && Math.random() < 0.2) shakeCreep();
    }

    if (currentCreep.hp <= 0) {
        if (goblinTimer) clearTimeout(goblinTimer);
        let prevTier = getHighestUnlockedShopTier();
        state.gold += currentCreep.gold;
        if (currentCreep.isStacked) { state.stacksKilled = (state.stacksKilled || 0) + 1; state.herbs = (state.herbs || 0) + CONFIG.forest.stackHerbs; }
        checkNutcrackerDrop();
        state.creepsKilled++;
        awardForestHerbProgress(currentCreep.name === 'Золотой Гоблин');
        checkShopTierUnlockToast(prevTier);
        localStorage.setItem(SAVE_KEY, JSON.stringify(state));
        let displayGold = state.gold > 1000000 ? (state.gold / 1000000).toFixed(1) + 'M' : state.gold;
        document.getElementById('gold-display').innerText = '💰 ' + displayGold;
        spawnForestCreep();
    } else if (isForestActive() && (dps > 0 || midasCooldown > 0 || stackCooldown > 0 || activeRuneBuff.sec > 0 || currentCreep.isStacked || clickTimestamps.length > 0)) {
        updateForestUI();
    }
}, 100);

function spawnDamageNumber(x, y, v, crit) {
    if (!isForestActive()) return;
    let el = document.createElement('div');
    el.className = 'dmg-number' + (crit ? ' crit' : '');
    let plain = ['MIDAS!', 'RADIANCE!', 'ГОБЛИН СБЕЖАЛ!', 'СТАК РАЗБЕЖАЛСЯ!', 'ВЕРБОВКА!'].includes(v) ||
                String(v).startsWith('+') || String(v).startsWith('⚡') || String(v).startsWith('💨') || String(v).startsWith('🏆');
    el.innerText = (crit && !plain ? '💥' : '') + v;
    el.style.left = x + 'px'; el.style.top = y + 'px';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 950);
}

function spawnSparks(x, y, n, crit) {
    if (!isForestActive()) return;
    for (let i = 0; i < n; i++) {
        let el = document.createElement('div');
        el.className = 'spark' + (crit ? ' crit' : '');
        el.style.left = x + 'px'; el.style.top = y + 'px';
        let a = Math.random() * Math.PI * 2, d = 25 + Math.random() * 50;
        el.style.setProperty('--dx', Math.cos(a) * d + 'px');
        el.style.setProperty('--dy', Math.sin(a) * d + 'px');
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 600);
    }
}

function explosionEffect(x, y) {
    if (!isForestActive()) return;
    for (let i = 0; i < 14; i++) {
        let el = document.createElement('div');
        el.className = 'explosion-particle';
        el.style.left = x + 'px'; el.style.top = y + 'px';
        let a = Math.random() * Math.PI * 2, d = 40 + Math.random() * 80;
        el.style.setProperty('--dx', Math.cos(a) * d + 'px');
        el.style.setProperty('--dy', Math.sin(a) * d + 'px');
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 750);
    }
}

function shakeCreep() {
    let el = document.getElementById('creep-card');
    if (!el) return;
    el.classList.add('card-shake');
    setTimeout(() => el.classList.remove('card-shake'), 150);
}

function flashCreep() {
    let el = document.getElementById('forest-creep-icon');
    if (!el) return;
    el.classList.add('hit-flash');
    setTimeout(() => el.classList.remove('hit-flash'), 100);
}

function toggleForestShop() {
    let zone = document.getElementById('forest-shop-zone');
    zone.classList.toggle('expanded');
    document.getElementById('btn-toggle-forest-shop').innerText = zone.classList.contains('expanded') ? 'Свернуть' : 'Развернуть';
}

/* ===== ЛЕСНАЯ ЛАВКА (ОТКРЫТИЕ ОТ ПОБЕД НАД БОССАМИ АКТОВ) ===== */
function renderForestShop() {
    const list = document.getElementById('forest-shop');
    if (!list) return;
    list.innerHTML = '';

    DB.forestMilestones.forEach(m => {
        if (state.milestones.includes(m.id)) return;
        let ownedCnt = state.forestInv.filter(id => id === m.reqItem).length;
        if (ownedCnt >= m.reqCount) {
            list.innerHTML += `<div class="card milestone-card" style="display:flex; justify-content:space-between; align-items:center;">
                <div style="flex:1;"><span style="color:gold;">🏆 ${m.name}</span><br>
                <span style="font-size:8px; color:#ddd;">${m.desc}</span></div>
                <button onclick="buyMilestone('${m.id}')" style="background:#a70; border-color:#fc0;">${m.cost} G</button>
            </div>`;
        }
    });

    const renderCard = (item) => {
        let count = state.forestInv.filter(id => id === item.id).length;
        let html = `<div class="card" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <div style="flex:1;"><span style="color:#0f0;">${item.icon} ${item.name}</span><br>
            <span style="font-size:8px; color:#aaa;">${fmtStats(item.short)}</span>
            <div><button class="info-btn" onclick="showItemInfo('forest','${item.id}')">Подробнее [?]</button></div></div>`;

        if (item.isUpgradable) {
            let lvl = state.forestItemLevels[item.id] || 0;
            let compOwned = item.components.every(c => state.forestInv.includes(c));
            if (lvl === 0) {
                let btn = compOwned
                    ? `<button onclick="upgradeForestItem('${item.id}')" style="margin-top:5px; background:#060; border-color:#0a0;">Собрать</button>`
                    : `<span style="font-size:7px; color:#a55;">Нужны компоненты</span>`;
                html += `<div style="text-align:right;">${btn}</div>`;
            } else {
                let upgCost = item.baseCost * (lvl + 1);
                html += `<div style="text-align:right;"><span style="font-size:8px; color:gold;">Ур. ${lvl}</span><br>
                <button onclick="upgradeForestItem('${item.id}')" style="margin-top:5px; background:#a50; border-color:#f80;">Улучшить ${upgCost} G</button></div>`;
            }
        } else {
            html += `<div style="text-align:right;"><span style="font-size:8px; color:#aaa;">Имеется: ${count}</span><br>
            <button onclick="buyForestItem('${item.id}')" style="margin-top:5px;">${item.cost} G</button></div>`;
        }
        return html + `</div>`;
    };

    DB.forestItems.filter(i => !i.group).forEach(item => { list.innerHTML += renderCard(item); });

    const groups = [
        { id:'midas',     title:'Сборка: 🖐️ Хенд оф Мидас',         reqRaid:5,  prevRaid:0,  reqText:'Победите босса Акта 1 (Этап 5)' },
        { id:'dominator', title:'Сборка: 👹 Хельм оф Доминатор',    reqRaid:10, prevRaid:5,  reqText:'Победите босса Акта 2 (Этап 10)' },
        { id:'radiance',  title:'Сборка: ✨ Радианс (без свитка)',   reqRaid:15, prevRaid:10, reqText:'Победите босса Акта 3 (Этап 15)' }
    ];
    groups.forEach(g => {
        if (state.maxRaidCleared >= g.reqRaid) {
            let lvl = state.forestItemLevels[g.id] || 0;
            let groupItems = DB.forestItems.filter(i => i.group === g.id);
            let inner = '';
            groupItems.forEach(item => {
                if (lvl > 0 && !item.isUpgradable) return;
                inner += renderCard(item);
            });
            list.innerHTML += `<div class="recipe-group"><div class="recipe-group-title">${g.title}</div>${inner}</div>`;
        } else if (state.maxRaidCleared >= g.prevRaid) {
            list.innerHTML += `<div class="card locked-card">
                <div style="color:#aaa; margin-bottom:4px;">🔒 ${g.title}</div>
                <div style="font-size:7px; color:#ca0;">Условие: ${g.reqText}</div>
            </div>`;
        }
    });
}

function buyMilestone(id) {
    let m = DB.forestMilestones.find(x => x.id === id);
    if (!m || state.milestones.includes(id) || state.gold < m.cost) return;
    state.gold -= m.cost;
    state.milestones.push(id);
    save();
}

function buyForestItem(id) {
    let item = DB.forestItems.find(i => i.id === id);
    if (!item || item.isUpgradable || state.gold < item.cost) return;
    if (item.reqRaid && state.maxRaidCleared < item.reqRaid) return;
    state.gold -= item.cost;
    let prevTier = getHighestUnlockedShopTier();
    state.forestInv.push(id);
    checkShopTierUnlockToast(prevTier);
    save();
}

function upgradeForestItem(id) {
    let item = DB.forestItems.find(i => i.id === id);
    let lvl = state.forestItemLevels[id] || 0;
    if (lvl === 0) {
        if (!item.components.every(c => state.forestInv.includes(c))) return;
        item.components.forEach(c => {
            let idx = state.forestInv.indexOf(c);
            if (idx !== -1) state.forestInv.splice(idx, 1);
        });
        let prevTier = getHighestUnlockedShopTier();
        state.forestItemLevels[id] = 1;
        alert(`⚒️ Собран ${item.icon} ${item.name}!`);
        checkShopTierUnlockToast(prevTier);
        save();
    } else {
        let cost = item.baseCost * (lvl + 1);
        if (state.gold < cost) return;
        state.gold -= cost;
        state.forestItemLevels[id] = lvl + 1;
        save();
    }
}
/* ===== СБОР ЧАЯ И ПОХОДНЫЙ КОТЕЛОК ===== */
function openTeaModal() {
    let kl = state.kettleLevel || 0;
    let maxK = CONFIG.forest.kettleMaxLevel;
    let actCap = getKettleActCap();
    let kCost = getKettleUpgradeCost(kl);
    let curTeaTier = typeof getTeaStats === 'function' ? getTeaStats(kl) : { name:'I. Походная' };

    let hEl = document.getElementById('tea-herbs-display');
    if (hEl) hEl.innerText = `🌿 Собранные травы: ${state.herbs || 0} (заварено кружек: ${state.teasBrewed || 0}) • Заварка: ${curTeaTier.name}`;

    let kBox = document.getElementById('tea-kettle-box');
    if (kBox) {
        let btn = '';
        if (kl >= maxK) {
            btn = `<span style="color:gold; font-size:8px;">MAX</span>`;
        } else if (kl >= actCap) {
            btn = `<span style="color:#f88; font-size:7px; line-height:1.3; display:inline-block; max-width:130px; text-align:right;">🔒 Лимит Акта (макс. Ур. ${actCap}). Победите босса Акта, чтобы поднять лимит</span>`;
        } else if (kCost) {
            let canAfford = (state.herbs || 0) >= kCost.herbs && (state.gold || 0) >= kCost.gold;
            btn = `<button ${canAfford ? '' : 'disabled'} onclick="upgradeKettle()" style="background:#530; border-color:#ca0; font-size:8px; padding:4px 6px;">${kCost.herbs} 🌿 + ${kCost.gold} G</button>`;
        }

        let nextLvlBlock = '';
        if (kl < maxK) {
            let nextKl = kl + 1;
            let curGoldPct = Math.round(kl * CONFIG.forest.kettleGoldPctPerLvl * 100);
            let nextGoldPct = Math.round(nextKl * CONFIG.forest.kettleGoldPctPerLvl * 100);
            let curHpPct = Math.round(kl * CONFIG.forest.kettleHpPctPerLvl * 100);
            let nextHpPct = Math.round(nextKl * CONFIG.forest.kettleHpPctPerLvl * 100);
            let teaBoostLine = '';
            if (nextKl % 2 === 0) {
                let nextTeaTier = typeof getTeaStats === 'function' ? getTeaStats(nextKl) : { name:'Усиление' };
                teaBoostLine = `<div style="color:gold; font-size:7px; margin-top:3px;">☕ Усиление всех чаёв → ${nextTeaTier.name}!</div>`;
            } else {
                let nextBoostLvl = nextKl + 1;
                teaBoostLine = `<div style="color:#888; font-size:7px; margin-top:3px;">Следующее усиление чаёв на Ур. ${nextBoostLvl}</div>`;
            }
            nextLvlBlock = `<div style="margin-top:6px; padding-top:5px; border-top:1px dashed #654; font-size:7px; color:#bbb; line-height:1.45;">
                <b style="color:#0ef;">Следующий уровень (Ур. ${nextKl}):</b><br>
                • Бонус золота Леса: <b>+${curGoldPct}% → +${nextGoldPct}%</b><br>
                • Бонус ЗД героев: <b>+${curHpPct}% → +${nextHpPct}%</b>
                ${teaBoostLine}
            </div>`;
        }

        kBox.innerHTML = `<div class="card milestone-card" style="margin-bottom:6px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div style="flex:1; padding-right:6px;">
                    <div style="color:gold; font-size:8px; margin-bottom:3px;">🫖 Походный котелок (Ур. ${kl}/${maxK}) <span style="color:#0ef; font-size:7px;">[${curTeaTier.name}]</span></div>
                    <div style="font-size:7px; color:#ddd; line-height:1.45;">Навсегда: <b>+${Math.round(kl * CONFIG.forest.kettleGoldPctPerLvl * 100)}%</b> золота в Лесу и <b>+${Math.round(kl * CONFIG.forest.kettleHpPctPerLvl * 100)}%</b> макс. ЗД героям в Рейдах.</div>
                </div>
                <div>${btn}</div>
            </div>
            ${nextLvlBlock}
        </div>`;
    }

    let list = document.getElementById('tea-list');
    list.innerHTML = '';
    TEA_BUFFS.forEach(t => {
        let isActive = state.activeTea === t.id;
        let canBrew = !isActive && (state.herbs || 0) >= t.cost;
        let btnHtml = isActive
            ? `<span style="color:#0f0; font-size:8px;">✓ ЗАВАРЕН</span>`
            : `<button ${canBrew ? '' : 'disabled'} onclick="brewTea('${t.id}')" style="background:#153; border-color:#3a6; font-size:8px;">${t.cost} 🌿</button>`;
        list.innerHTML += `<div class="card" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; border-color:${isActive ? '#0f0' : '#444'};">
            <div style="flex:1; padding-right:6px;">
                <div style="color:#6f8; font-size:8px; margin-bottom:3px;">${t.icon} ${t.name} <span style="color:gold; font-size:7px;">[${curTeaTier.name}]</span></div>
                <div style="font-size:7px; color:#ccc; line-height:1.45;">${fmtStats(t.desc)}</div>
            </div>
            <div>${btnHtml}</div>
        </div>`;
    });
    document.getElementById('tea-modal').style.display = 'flex';
}

function closeTeaModal() {
    document.getElementById('tea-modal').style.display = 'none';
}

function brewTea(teaId) {
    let t = TEA_BUFFS.find(x => x.id === teaId);
    if (!t || state.activeTea === teaId || (state.herbs || 0) < t.cost) return;
    state.herbs -= t.cost;
    state.activeTea = teaId;
    state.teasBrewed = (state.teasBrewed || 0) + 1;
    save();
    openTeaModal();
}

function upgradeKettle() {
    let kl = state.kettleLevel || 0;
    if (kl >= CONFIG.forest.kettleMaxLevel) return;
    if (kl >= getKettleActCap()) return;
    let cost = getKettleUpgradeCost(kl);
    if (!cost || (state.herbs || 0) < cost.herbs || (state.gold || 0) < cost.gold) return;
    state.herbs -= cost.herbs;
    state.gold -= cost.gold;
    state.kettleLevel = kl + 1;
    save();
    openTeaModal();
    if (typeof updateUI === 'function') updateUI();
}
