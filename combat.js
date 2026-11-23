/* ===== БОЕВАЯ СИСТЕМА РЕЙДА И КАМПАНИИ v4.2 ===== */
let combat = {
    active: false, stage: 1, contract: 'normal',
    turnQueue: [], currentIdx: 0, targets: [],
    actionCache: null, itemsUsedThisTurn: 0,
    aegisUsed: false, dawnTriggered: false, gabenTriggered: false,
    summonCounter: 0, selectedTargetId: null, shamanBonus: false
};
let fastMode = false;

function toggleSpeed() {
    fastMode = !fastMode;
    document.getElementById('btn-speed').innerText = `Ускорение x2: ${fastMode ? 'ВКЛ' : 'ВЫКЛ'}`;
    document.getElementById('btn-speed').style.background = fastMode ? '#050' : '#252';
}

function selectEnemyTarget(targetId) {
    let features = (typeof getUnlockedFeatures === 'function') ? getUnlockedFeatures(state) : { combatTargeting: true };
    if (!features.combatTargeting) return;
    let e = combat.targets.find(t => t.id === targetId && t.isEnemy && t.hp > 0);
    if (e) {
        combat.selectedTargetId = targetId;
        renderArena();
    }
}

/* ===== ИНСПЕКТОР ЮНИТА (ГЕРОИ И ВРАГИ ИЗ ШКАЛЫ ХОДОВ) ===== */
function showUnitInspector(unitId) {
    if (!combat.active) return;
    let u = combat.targets.find(t => t.id === unitId) || combat.turnQueue.find(t => t.id === unitId);
    if (!u) return;

    let arm = getEffectiveArmor(u);
    let physPct = Math.round(getPhysicalReduction(arm) * 100);
    let magPct = Math.round(getMagicReduction(u) * 100);
    let rowTxt = u.row === 'front' ? '<span style="color:#fa0;">1-й ряд (Передовая)</span>' : '<span style="color:#0af;">2-й ряд (Тыл)</span>';
    let rangeTxt = u.isMelee ? 'Ближний бой' : 'Дальний бой';
    let sideTxt = u.isEnemy ? '<span style="color:#f66;">Враг</span>' : '<span style="color:#6f8;">Герой отряда</span>';

    let statusParts = [];
    if (u.stunTurns > 0) statusParts.push(`💫 Оглушён (${u.stunTurns} х.)`);
    if (u.cataclysmCharging) statusParts.push('☄️ Заряжает Катаклизм!');
    if (u.preparing) statusParts.push(`⏳ Подготовка «${u.preparing.skillObj.name}» (1 х.)`);
    if (u.buffs && u.buffs.some(b => b.type === 'defending')) statusParts.push('🛡️ Глухая защита (−50% урона, иммунитет к казням/критам)');
    (u.buffs || []).forEach(b => {
        if (b.type === 'broken') statusParts.push(`💥 Пробит (+20% урона, ${b.turns} х.)`);
        if (b.type === 'thorns') statusParts.push(`🦔 Шипы (возврат 50% урона, ${b.turns} х.)`);
        if (b.type === 'blade_mail') statusParts.push(`🦔 Шипастая броня (возврат 70% урона, ${b.turns} х.)`);
        if (b.type === 'shallow_grave') statusParts.push(`✝️ Тонкая грань (бессмертие 1 ЗД, ${b.turns} х.)`);
        if (b.type === 'decrepify') statusParts.push(`🟢 Астрал (+45% маг. урона, 100% иммунитет к физ. атакам, ${b.turns} х.)`);
        if (b.type === 'dueling') statusParts.push(`⚔️ В дуэли (${b.turns} х.)`);
        if (b.type === 'x_mark') statusParts.push(`❌ Метка (+${Math.round(b.amp * 100)}% маг. урона, ${b.turns} х.)`);
        if (b.type === 'hex_vuln') statusParts.push(`🐸 Хекс (+${Math.round(b.amp * 100)}% всего урона, ${b.turns} х.)`);
        if (b.type === 'stun_immune') statusParts.push(`⛓️ Иммунитет к оглушению (${b.turns} х.)`);
        if (b.type === 'silence') statusParts.push(`🔇 Безмолвие (${b.turns} х.)`);
        if (b.type === 'root') statusParts.push(`❄️ Оцепенение (${b.turns} х., запрет атак с руки)`);
        if (b.type === 'burn_dot') statusParts.push(`🔥 Горение ${b.dmg}/х (${b.turns} х.)`);
        if (b.type === 'poison_dot') statusParts.push(`🧪 Яд ${b.dmg}/х (${b.turns} х.)`);
        if (b.type === 'veil') statusParts.push(`🟣 Вуаль раздора (+20% маг. урона, ${b.turns} х.)`);
        if (b.type === 'orchid') statusParts.push(`🌺 Орхидея злобы (безмолвие, ${b.turns} х.)`);
        if (b.type === 'weaken') statusParts.push(`🌊 Ослаблен (−${Math.round(b.reduce * 100)}% УРН, ${b.turns} х.)`);
        if (b.type === 'armor_break') statusParts.push(`💔 −${b.value} БРО (${b.turns} х.)`);
        if (b.type === 'armor_up') statusParts.push(`🛡️ +${b.value} БРО (${b.turns} х.)`);
        if (b.type === 'atk') statusParts.push(`💪 +${Math.round((b.value - 1) * 100)}% УРН (${b.turns} х.)`);
        if (b.type === 'rum') statusParts.push(`🍺 Ром адмирала (−30% урона, ${b.turns} х.)`);
        if (b.type === 'bkb') statusParts.push(`🛡️ БКБ (иммунитет к магии и станам, ${b.turns} х.)`);
        if (b.type === 'nether_ward') statusParts.push(`🟢 Тотем Пустоты (${b.dmg} маг. урона за каст врага, ${b.turns} х.)`);
    });

    if ((u.isEnemy && u.row === 'front' && (!u.isMelee || u.archetype === 'mage' || u.archetype === 'support')) || (u.buffs && u.buffs.some(b => b.type === 'uncovered'))) {
        statusParts.push('⚠️ Без прикрытия (+20% физ. урона)');
    }
    if (u.row === 'back') {
        statusParts.push('🛡️ Защита строя (−15% физ. урона от ближников)');
    }
    if (u.isEnemy && u.lockedTargetId) {
        let lt = combat.targets.find(x => x.id === u.lockedTargetId);
        let ltName = lt ? lt.name : 'героя';
        statusParts.push(`🎯 Прицеливание в ${ltName} (ваншот в след. ход!)`);
    }
    if (!u.isEnemy && combat.targets.some(e => e.isEnemy && e.hp > 0 && e.lockedTargetId === u.id)) {
        statusParts.push('🎯 НА МУШКЕ ХУДВИНК (ваншот в след. ход! Прожмите 🛡️ БЛОК или сбейте каст)');
    }

    let shieldInfo = '';
    if (u.isEnemy) {
        shieldInfo = `<br>Щит пробития: ${'🛡️'.repeat(Math.max(0, u.shield || 0)) || 'ПРОБИТ'} (${u.shield}/${u.shieldMax})`;
    } else {
        shieldInfo = `<br>Ярость: <b style="color:gold;">${u.rage || 0}% / 100%</b>`;
    }

    let intentInfo = '';
    if (u.isEnemy) {
        let enemySilenced = u.buffs && u.buffs.some(b => b.type === 'orchid' || b.type === 'silence');
        let intentTxt = '';
        if (enemySilenced) {
            intentTxt = '🔇 Безмолвие (только удар) (~' + u.atk + ' УРН)';
        } else if (u.nextIntent && u.nextIntent.type === 'skill') {
            if (u.nextIntent.skill.type === 'hoodwink_release') {
                intentTxt = '<span style="color:#f33; font-weight:bold;">🎯 Смертоносный выстрел по намеченной цели!</span>';
            } else {
                intentTxt = `<span style="color:#f66;">🔥 Скилл «${u.nextIntent.skill.name}»</span>`;
            }
        } else {
            intentTxt = `⚔️ Обычная атака (~${u.atk} УРН)`;
        }
        intentInfo = `<br>Намерение: ${intentTxt}`;
    }

    let modal = document.getElementById('unit-inspector-modal') || document.getElementById('enemy-info-modal');
    let titleEl = document.getElementById('inspector-modal-title') || document.getElementById('enemy-modal-title');
    let statsEl = document.getElementById('inspector-modal-stats') || document.getElementById('enemy-modal-stats');
    let skillsEl = document.getElementById('inspector-modal-skills') || document.getElementById('enemy-modal-skills');

    if (titleEl) titleEl.innerHTML = `${u.icon} ${u.name} (${sideTxt})`;
    if (statsEl) {
        statsEl.innerHTML = fmtStats(
            `Позиция: ${rowTxt} • ${rangeTxt}<br>` +
            `ЗД: ${Math.max(0, Math.ceil(u.hp))} / ${u.maxHp} | МН: ${Math.max(0, Math.floor(u.mp))} / ${u.maxMp}<br>` +
            `УРН: ${u.atk} | БРО: ${arm} (${physPct}%) | МАГ.РЕЗ: ${magPct}%` +
            shieldInfo +
            intentInfo +
            (statusParts.length ? `<br><span style="color:#ff0;">Эффекты:</span> ${statusParts.join(', ')}` : '<br><span style="color:#888;">Эффекты: нет</span>')
        );
    }

    let skillsList = [];
    if (u.isEnemy) {
        skillsList = u.skills || [];
    } else {
        let dbH = DB.heroes.find(x => x.id === u.dbId);
        skillsList = dbH ? dbH.skills : (u.skills || []);
    }

    if (skillsEl) {
        let skillsHtml = (skillsList || []).map((sk, idx) => {
            let isEnemySkill = u.isEnemy;
            let lvl = !isEnemySkill && u.heroData && u.heroData.skillLevels ? u.heroData.skillLevels[idx] : 1;
            let estDmg = '';
            if (isEnemySkill) {
                estDmg = sk.mult > 0 ? `~${Math.floor(u.atk * sk.mult)} базового урона` : 'Особый эффект';
            } else {
                estDmg = (sk.dmg && sk.dmg[lvl - 1]) ? `${sk.dmg[lvl - 1]} базового урона` : (sk.full || '');
            }
            let typeTag = sk.type === 'phys' ? '<span style="color:#fa0;">Физ.</span>' : (sk.type === 'magic' ? '<span style="color:#c6f;">Маг.</span>' : '<span style="color:#0cf;">Особый / Бафф</span>');
            let costTag = sk.mpCost ? `${sk.mpCost} МН` : (sk.mp ? `${sk.mp[lvl - 1] || sk.mp[0]} МН` : 'Пассивно');

            return `<div class="enemy-skill-card" style="margin-bottom:6px; padding:6px; background:#181824; border:1px solid #334; border-radius:4px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:3px;">
                    <b style="color:#ff8;">${sk.type === 'passive' ? '🔹' : '🔥'} ${sk.name}</b>
                    <span style="color:#48f; font-size:7px;">${costTag}</span>
                </div>
                <div style="font-size:7px; color:#aaa; margin-bottom:3px;">Тип: ${typeTag} | ${estDmg}</div>
                <div style="font-size:8px; color:#ddd; line-height:1.4;">${fmtStats(sk.desc || sk.full || '')}</div>
            </div>`;
        }).join('');
        skillsEl.innerHTML = skillsHtml || '<p style="color:#777;">Нет особых способностей.</p>';
    }

    if (modal) modal.style.display = 'flex';
}
window.showUnitInspector = showUnitInspector;

function closeUnitInspector() {
    let m1 = document.getElementById('unit-inspector-modal');
    if (m1) m1.style.display = 'none';
    let m2 = document.getElementById('enemy-info-modal');
    if (m2) m2.style.display = 'none';
}
window.closeUnitInspector = closeUnitInspector;
function showEnemyInfo(id) { showUnitInspector(id); }
function closeEnemyInfo() { closeUnitInspector(); }

/* ===== ФОРМИРОВАНИЕ ВРАГОВ ПО ЭТАПАМ КАМПАНИИ ===== */
function adaptHeroSkillsForEnemy(dbH, lvl) {
    let res = [];
    if (!dbH || !dbH.skills) return res;
    let s1 = dbH.skills[0];
    if (s1) {
        let isPhys = s1.type === 'phys';
        let bHits = s1.breakHits || (s1.type === 'magic' ? 1 : 0);
        let sIdx = Math.max(0, Math.min(3, (lvl || 1) - 1));
        let stn = (Array.isArray(s1.stun) ? (s1.stun[sIdx] || 0) : (s1.stun || 0));
        let sil = s1.silence || 0;
        let rt = s1.rootTurns || 0;
        let dot = (Array.isArray(s1.burnDmg) ? (s1.burnDmg[sIdx] || 0) : (s1.burnDmg || 0));
        let debuffArm = (Array.isArray(s1.armorDebuff) ? (s1.armorDebuff[sIdx] || 0) : (s1.armorDebuff || 0));
        res.push({
            name: s1.name,
            type: isPhys ? 'phys' : 'magic',
            mult: 1.25,
            aoe: !!s1.aoe,
            frontOnly: !!s1.frontOnly,
            targetBackRow: !!s1.targetBackRow,
            breakHits: bHits,
            stun: stn,
            silence: sil,
            root: rt,
            poisonDot: dot,
            armorDebuff: debuffArm,
            mpCost: 50,
            desc: `Тень воспроизводит «${s1.name}»!`
        });
    }
    let ult = dbH.skills[3];
    if (ult && lvl >= 6) {
        let isPhys = ult.type === 'phys';
        res.push({
            name: ult.name,
            type: isPhys ? 'phys' : 'magic',
            mult: 1.65,
            aoe: !!ult.aoe,
            breakHits: 2,
            silence: ult.silence || 0,
            mpCost: 85,
            desc: `Тень обрушивает «${ult.name}»!`
        });
    }
    return res;
}

function buildCircusEnemies(contract) {
    let stage14Budget = (CONFIG.combat.stageHpBudgets && CONFIG.combat.stageHpBudgets[14]) || 5200;
    let rm = makeSpecialEnemy('ringmaster', 'e_rm', contract);
    let enemies = [rm];

    // До 3 теней героев из текущего отряда игрока
    let squadIds = (state.squad || []).slice(0, 3);
    if (squadIds.length === 0) {
        squadIds = (state.heroes || []).slice(0, 3).map(h => h.id);
    }

    squadIds.forEach((id, idx) => {
        let h = (state.heroes || []).find(x => x.id === id);
        let dbH = h ? DB.heroes.find(x => x.id === h.dbId) : null;
        if (!dbH) dbH = DB.heroes[idx % DB.heroes.length];
        let lvl = h ? (h.level || 1) : 12;

        let str = dbH.baseStr + dbH.gainStr * (lvl - 1);
        let agi = dbH.baseAgi + dbH.gainAgi * (lvl - 1);
        let int_ = dbH.baseInt + dbH.gainInt * (lvl - 1);
        let heroBaseHp = Math.round(200 + str * 22);
        let heroBaseAtk = Math.round(dbH.mainAttr === 'str' ? str : (dbH.mainAttr === 'agi' ? agi : int_));
        let heroBaseArmor = Math.round(dbH.baseArmor + agi / 6);

        let copyHp = Math.round(Math.max(heroBaseHp * 1.8, stage14Budget * 0.22));
        let copyAtk = Math.round(heroBaseAtk * 0.88 * (CONFIG.combat.enemyBaseAtkMult || 1.28));
        let copyShields = 3;

        if (contract === 'ambush') {
            copyHp = Math.floor(copyHp * CONFIG.contracts.ambush.enemyHpMult);
            copyAtk = Math.floor(copyAtk * CONFIG.contracts.ambush.enemyAtkMult);
        }
        if (contract === 'trial') {
            copyShields += CONFIG.contracts.trial.enemyShieldBonus;
            copyAtk = Math.floor(copyAtk * CONFIG.contracts.trial.enemyAtkMult);
        }

        let adaptedSkills = adaptHeroSkillsForEnemy(dbH, lvl);
        let copyRow = dbH.row || (dbH.isMelee ? 'front' : 'back');

        let shadow = {
            id: 'e_copy_' + (idx + 1),
            name: 'Тень ' + dbH.name,
            icon: dbH.icon,
            archetype: dbH.isMelee ? 'dd' : (dbH.mainAttr === 'int' ? 'mage' : 'dd'),
            row: copyRow,
            hp: copyHp, maxHp: copyHp,
            mp: 240, maxMp: 240, mpRegen: 16,
            baseArmorVal: heroBaseArmor, armor: heroBaseArmor,
            baseRes: 0.25, magicResBonuses: [],
            atk: copyAtk,
            isEnemy: true, isBoss: false, isMelee: dbH.isMelee,
            isCircusCopy: true,
            stunTurns: 0, buffs: [],
            shieldMax: copyShields, shield: copyShields,
            turnCount: idx % 3, skillCursor: 0,
            skills: adaptedSkills
        };
        rollEnemyIntent(shadow);
        enemies.push(shadow);
    });

    if (!enemies.some(e => e.row === 'front')) {
        let firstCopy = enemies.find(e => e.isCircusCopy) || enemies[0];
        firstCopy.row = 'front';
    }

    return enemies;
}

function makeSpecialEnemy(key, idTag, contract) {
    let tpl = SPECIAL_ENEMIES[key];
    let hp = tpl.hp;
    let atk = (key.startsWith('prologue_') || key.startsWith('forest_wolf')) ? tpl.atk : Math.floor(tpl.atk * (CONFIG.combat.enemyBaseAtkMult || 1.28));
    let sh = (typeof tpl.shieldMax === 'number') ? tpl.shieldMax : 2;
    if (contract === 'ambush') { hp = Math.floor(hp * CONFIG.contracts.ambush.enemyHpMult); atk = Math.floor(atk * CONFIG.contracts.ambush.enemyAtkMult); }
    if (contract === 'trial')  { sh += CONFIG.contracts.trial.enemyShieldBonus; atk = Math.floor(atk * CONFIG.contracts.trial.enemyAtkMult); }
    let row = tpl.row || (tpl.isMelee || tpl.archetype === 'tank' ? 'front' : 'back');
    let e = {
        ...tpl,
        id: idTag,
        row: row,
        hp: hp, maxHp: hp,
        mp: tpl.mp, maxMp: tpl.mp, mpRegen: 18,
        baseArmorVal: tpl.armor, armor: tpl.armor,
        baseRes: 0.25, magicResBonuses: [],
        atk: atk, isEnemy: true,
        stunTurns: 0, buffs: [],
        shieldMax: sh, shield: sh,
        turnCount: 0, skillCursor: 0,
        skills: tpl.skills || []
    };
    if (key === 'dawnbreaker_enemy' && state.heroes.some(h => h.dbId === 'dawnbreaker')) {
        e.scriptedDawn = false;
    }
    rollEnemyIntent(e);
    return e;
}

function buildStageEnemies(stage, contract) {
    if (stage === 'p1') return [makeSpecialEnemy('prologue_squirrel', 'e1', 'normal')];
    if (stage === 'p2') return [makeSpecialEnemy('prologue_boar', 'e1', 'normal')];
    if (stage === 'p3') return [makeSpecialEnemy('prologue_bandit', 'e1', 'normal'), makeSpecialEnemy('prologue_archer', 'e2', 'normal')];
    if (stage === 'p4') return [makeSpecialEnemy('prologue_guard_boss', 'e1', 'normal'), makeSpecialEnemy('prologue_runner', 'e2', 'normal')];
    if (stage === 1)  return [makeSpecialEnemy('forest_wolf_alpha', 'e1', contract), makeSpecialEnemy('forest_wolf', 'e2', contract)];
    if (stage === 5)  return [makeSpecialEnemy('bandit_thug', 'e1', contract), makeSpecialEnemy('bounty_hunter', 'e2', contract), makeSpecialEnemy('bandit_archer', 'e3', contract)];
    if (stage === 6)  return [
        makeSpecialEnemy('bristleback', 'e1', contract),
        makeSpecialEnemy('forest_witchdoctor', 'e2', contract),
        makeSpecialEnemy('poison_spider', 'e3', contract)
    ];
    if (stage === 7)  return [makeSpecialEnemy('traveler', 'e1', contract)];
    if (stage === 8)  return [makeSpecialEnemy('bog_ghoul', 'e1', contract), makeSpecialEnemy('pudge_stage8', 'e2', contract), makeSpecialEnemy('poison_spider', 'e3', contract)];
    if (stage === 9)  {
        if (state.shamanKilled) {
            return [
                makeSpecialEnemy('bandit_thug', 'e1', contract),
                makeSpecialEnemy('bandit_archer', 'e2', contract),
                makeSpecialEnemy('bandit_thug', 'e3', contract)
            ];
        } else {
            return [
                makeSpecialEnemy('bandit_thug', 'e1', contract),
                makeSpecialEnemy('hermit_shaman_boss', 'e2', contract),
                makeSpecialEnemy('bandit_archer', 'e3', contract)
            ];
        }
    }
    if (stage === 10) return [makeSpecialEnemy('io_boss', 'e1', contract), makeSpecialEnemy('tiny_boss', 'e2', contract), makeSpecialEnemy('lycan_boss', 'e3', contract)];
    if (stage === 11) return [makeSpecialEnemy('hoodwink', 'e1', contract)];
    if (stage === 14) return buildCircusEnemies(contract);
    if (stage === 15) return [makeSpecialEnemy('roshan_boss', 'e1', contract)];
    if (stage === 16) return [makeSpecialEnemy('dawnbreaker_enemy', 'e1', contract)];
    if (stage === 20) return [makeSpecialEnemy('dk_boss', 'e1', contract), makeSpecialEnemy('dragon_fire', 'e2', contract), makeSpecialEnemy('dragon_ice', 'e3', contract), makeSpecialEnemy('dragon_poison', 'e4', contract)];
    if (stage === 21) return [makeSpecialEnemy('invoker_boss', 'e1', contract)];
    if (stage === 24) return [makeSpecialEnemy('ck_boss', 'e1', contract)];
    if (stage === 25) return [makeSpecialEnemy('throne_elder', 'e1', contract)];

    // Обычные этапы кампании (2–4, 12–13, 17–19, 22–23)
    let act = getActForStage(stage);
    let actPool = ACT_ENEMY_POOLS[act.id] || ACT_ENEMY_POOLS[1];
    let count = (act.id <= 2) ? (Math.random() < 0.6 ? 2 : 3) : (Math.random() < 0.5 ? 3 : 4);
    if (stage === 4) count = 2;

    let heroCount = Math.min(2, Math.max(1, Math.floor(count / 2)));
    let minionCount = count - heroCount;

    let heroPool = actPool.heroes.filter(h => h.name !== 'Шаман-отшельник' || state.maxRaidCleared >= 9);
    let shuffledHeroes = [...heroPool].sort(() => Math.random() - 0.5);
    let shuffledMinions = [...actPool.minions].sort(() => Math.random() - 0.5);

    let chosen = [];
    for (let i = 0; i < heroCount; i++) {
        chosen.push(shuffledHeroes[i % shuffledHeroes.length]);
    }
    for (let i = 0; i < minionCount; i++) {
        chosen.push(shuffledMinions[i % shuffledMinions.length]);
    }
    chosen.sort(() => Math.random() - 0.5);

    let totalStageHp = (CONFIG.combat.stageHpBudgets && CONFIG.combat.stageHpBudgets[stage]) || Math.floor(500 + stage * 260);
    if (contract === 'ambush') totalStageHp = Math.floor(totalStageHp * CONFIG.contracts.ambush.enemyHpMult);

    let sumHpWeights = chosen.reduce((sum, u) => {
        let arch = CONFIG.combat.archetypes[u.archetype || 'minion'] || { hpMult: 1.0, atkMult: 1.0 };
        return sum + arch.hpMult;
    }, 0);

    let baseShield = stage >= 15 ? CONFIG.combat.normalShields.late : (stage >= 5 ? CONFIG.combat.normalShields.mid : CONFIG.combat.normalShields.early);

    let res = [];
    for (let i = 0; i < chosen.length; i++) {
        let u = chosen[i];
        let arch = CONFIG.combat.archetypes[u.archetype || 'minion'] || { hpMult: 1.0, atkMult: 1.0 };
        let unitHp = Math.max(100, Math.floor(totalStageHp * (arch.hpMult / sumHpWeights)));
        let baseAtk = Math.floor((22 + stage * 4.5) * (CONFIG.combat.enemyBaseAtkMult || 1.28));
        if (contract === 'ambush') baseAtk = Math.floor(baseAtk * CONFIG.contracts.ambush.enemyAtkMult);
        if (contract === 'trial') baseAtk = Math.floor(baseAtk * CONFIG.contracts.trial.enemyAtkMult);
        let unitAtk = Math.max(15, Math.floor(baseAtk * arch.atkMult));

        let sh = (u.archetype === 'minion') ? Math.max(1, (u.shieldMax !== undefined ? u.shieldMax : baseShield - 1)) : (u.shieldMax !== undefined ? u.shieldMax : baseShield);
        if (contract === 'trial') sh += CONFIG.contracts.trial.enemyShieldBonus;

        let arm = (u.armor || 0) + Math.floor(stage / 4);
        let row = u.row || (u.isMelee || u.archetype === 'tank' ? 'front' : 'back');
        let e = {
            id: 'e' + (i + 1),
            name: u.name,
            icon: u.icon,
            archetype: u.archetype,
            row: row,
            hp: unitHp, maxHp: unitHp,
            mp: 240, maxMp: 240, mpRegen: 16,
            baseArmorVal: arm, armor: arm,
            baseRes: 0.25, magicResBonuses: [],
            atk: unitAtk,
            isEnemy: true, isBoss: false, isMelee: u.isMelee,
            stunTurns: 0, buffs: [],
            shieldMax: sh, shield: sh,
            turnCount: i % 3, skillCursor: 0,
            skills: u.skills || []
        };
        rollEnemyIntent(e);
        res.push(e);
    }
    if (!res.some(e => e.row === 'front') && res.length > 0) {
        res[0].row = 'front';
    }
    return res;
}

function rollEnemyIntent(enemy) {
    let allies = (combat && combat.targets) ? combat.targets.filter(t => t.isEnemy && t.hp > 0) : [enemy];
    let heroes = (combat && combat.targets) ? combat.targets.filter(t => !t.isEnemy && t.hp > 0) : [];
    enemy.turnCount = (enemy.turnCount || 0) + 1;
    let act = chooseEnemyAction(enemy, allies, heroes);
    enemy.nextIntent = act;
}

function startRaid(stage, contract = 'normal') {
    if (state.squad.length === 0) { alert('Отряд пуст! Добавьте героя во вкладке «Таверна».'); return; }
    stage = stage || (state.prologueCleared < 4 ? ('p' + Math.min(4, (state.prologueCleared || 0) + 1)) : (state.selectedStage || Math.min(25, state.maxRaidCleared + 1)));
    if (typeof stage === 'string' && stage.startsWith('p')) {
        let pNum = parseInt(stage.replace('p', ''), 10) || 1;
        if (pNum <= (state.prologueCleared || 0)) {
            alert('Этот этап Пролога уже пройден!');
            return;
        }
    }
    let gate = (typeof ACT_FOREST_GATES !== 'undefined') ? ACT_FOREST_GATES[stage] : null;
    if (gate && stage > state.maxRaidCleared && !window.DEBUG_BYPASS_GATES && !gate.check(state)) {
        alert(`🔒 ${gate.title}\n${gate.reqText}\n(${gate.progress(state)})`);
        return;
    }

    if (stage === 9) {
        let storyKey = state.shamanKilled ? 'stage9_no_shaman' : 'stage9_shaman_reveal';
        if (!state.seenStories.includes(storyKey)) {
            showStory(storyKey, () => launchCombat(stage, contract), true);
            return;
        }
    }

    const introMap = {
        p1: 'prologue_p1_intro',
        p2: 'prologue_p2_intro',
        p3: 'prologue_p3_intro',
        p4: 'prologue_p4_intro',
        1: 'stage1_intro',
        6: 'stage6_intro',
        8: 'stage8_pudge_intro',
        11: 'stage11_intro',
        14: 'stage14_circus',
        16: 'stage16_intro',
        21: 'stage21_intro',
        25: 'stage25_intro'
    };
    let storyKey = introMap[stage];
    if (storyKey && !state.seenStories.includes(storyKey)) {
        showStory(storyKey, () => launchCombat(stage, contract), true);
    } else {
        launchCombat(stage, contract);
    }
}

function launchCombat(stage, contract) {
    combat.active = true;
    combat.stage = stage;
    combat.contract = contract;
    combat.targets = [];
    combat.currentIdx = 0;
    combat.actionCache = null;
    combat.itemsUsedThisTurn = 0;
    combat.aegisUsed = false;
    combat.dawnTriggered = false;
    combat.gabenTriggered = false;
    combat.summonCounter = 0;
    combat.selectedTargetId = null;
    combat.shamanBonus = false;

    document.getElementById('battle-log').innerHTML = '';
    document.getElementById('skills-submenu').style.display = 'none';

    let isPrologue = (typeof stage === 'string' && stage.startsWith('p'));
    if (isPrologue) {
        let pNum = stage.replace('p', '');
        document.getElementById('raid-level-display').innerText = `Акт 0 • Пролог: Этап ${pNum}`;
    } else {
        let act = getActForStage(stage);
        let cTag = contract === 'ambush' ? ' • 🔥 Засада' : (contract === 'trial' ? ' • 💀 Испытание' : '');
        document.getElementById('raid-level-display').innerText = `Акт ${act.id} • Этап ${stage}${cTag}`;
    }

    // Враги
    let enemies = buildStageEnemies(stage, contract);
    enemies.forEach(e => combat.targets.push(e));

    // Герои отряда
    state.squad.forEach(id => {
        const h = state.heroes.find(x => x.id === id);
        if (!h) return;
        const dbH = DB.heroes.find(x => x.id === h.dbId);
        let stats = getHeroStats(h, dbH);
        combat.targets.push({
            ...dbH,
            id: 'h_' + h.id,
            dbId: dbH.id,
            heroData: h,
            row: stats.row,
            isEnemy: false,
            hp: stats.maxHp, maxHp: stats.maxHp,
            mp: stats.maxMp, maxMp: stats.maxMp,
            atk: stats.atk,
            baseArmorVal: stats.armor, armor: stats.armor,
            baseRes: 0.25, magicResBonuses: stats.magicResBonuses,
            physLifesteal: stats.physLifesteal,
            spellLifesteal: stats.spellLifesteal,
            spellAmp: stats.spellAmp,
            itemCritChance: stats.itemCritChance,
            itemCritMult: stats.itemCritMult,
            hpRegen: stats.hpRegen, mpRegen: stats.mpRegen,
            stunTurns: 0, buffs: [],
            itemCooldowns: {}, skillCooldowns: {}, stickCharges: 0, rage: 0,
            armletOn: false, treadsMode: 'str',
            illusions: 0, lumiCount: 0, wkReincarnated: false, preparing: null
        });
    });

    if (stage === 'p3') {
        let svenCombatHero = combat.targets.find(t => !t.isEnemy && t.dbId === 'sven');
        if (svenCombatHero) svenCombatHero.rage = 50;
    }

    if (state.fishing && state.fishing.freshCatchBuff) {
        let beaver = combat.targets.find(t => !t.isEnemy && t.dbId === 'pudge');
        if (beaver) {
            let hpBonus = Math.floor(beaver.maxHp * 0.12);
            beaver.maxHp += hpBonus;
            beaver.hp += hpBonus;
            log(`🍲 «Свежий улов»: Бобёр-удильщик получает +${hpBonus} ЗД (+12%) на этот бой!`);
        }
        state.fishing.freshCatchBuff = false;
        save();
    }

    // Ауры брони (Кираса / Баклер — не стакаются)
    let heroesList = combat.targets.filter(t => !t.isEnemy);
    let enemiesList = combat.targets.filter(t => t.isEnemy);
    let hasAC = heroesList.some(h => getHeroEquippedItems(h).includes('assault_cuirass'));
    let hasBuckler = heroesList.some(h => getHeroEquippedItems(h).includes('buckler'));

    combat.turnQueue = [...combat.targets].sort((a, b) => (a.isEnemy === b.isEnemy ? 0 : a.isEnemy ? 1 : -1));
    switchTab('raid');
    renderArena();

    let meta = getStageMeta(stage);
    log(`⚔️ ${meta.title}!`);

    if (hasAC) {
        heroesList.forEach(h => { h.baseArmorVal += 5; h.armor += 5; });
        enemiesList.forEach(e => { e.baseArmorVal -= 5; e.armor -= 5; });
        log('👑 Аура Кирасы: +5 БРО отряду, −5 БРО врагам!');
    } else if (hasBuckler) {
        heroesList.forEach(h => { h.baseArmorVal += 2; h.armor += 2; });
        log('🔰 Аура Баклера: +2 БРО всему отряду!');
    }

    // Применение заваренного чая из Леса
    if (state.activeTea && stage > 1) {
        let tb = TEA_BUFFS.find(x => x.id === state.activeTea);
        if (tb) {
            let tStats = typeof getTeaStats === 'function' ? getTeaStats(state.kettleLevel || 0) : CONFIG.forest.teas;
            let tc = tStats ? tStats[tb.id] : CONFIG.forest.teas[tb.id];
            if (tb.id === 'ivan_tea' && tc) {
                heroesList.forEach(h => {
                    h.atk = Math.floor(h.atk * tc.atkMult);
                    h.spellAmp = (h.spellAmp || 0) + tc.spellAmp;
                });
            }
            if (tb.id === 'chamomile_tea' && tc) {
                heroesList.forEach(h => {
                    h.maxHp = Math.floor(h.maxHp * tc.hpMult);
                    h.hp = h.maxHp;
                    h.hpRegen += tc.hpRegen;
                });
            }
            if (tb.id === 'mint_tea' && tc) {
                heroesList.forEach(h => {
                    h.rage = Math.min(100, (h.rage || 0) + tc.startRage);
                    h.mpRegen += tc.mpRegen;
                });
            }
            log(`☕ Чай из Леса: ${tb.icon} ${tb.name} — ${tb.desc}`);
        }
        state.activeTea = null;
        localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    }

    // Сюжетный Этап 1: Свен истощён и ранен после изгнания
    if (stage === 1) {
        heroesList.forEach(h => {
            h.hp = Math.max(120, Math.floor(h.maxHp * 0.34));
            h.mp = Math.min(h.maxMp, 145);
        });
        log('🩸 Свен измотан после изгнания и начинает бой раненым (34% ЗД)!');
    }

    renderArena();
    nextTurn();
}

/* ===== ОТРИСОВКА АРЕНЫ (СЛЕВА ГЕРОИ В 2 РЯДА, СПРАВА ВРАГИ) ===== */
function renderUnitCard(t) {
    let pctHp = Math.max(0, (t.hp / t.maxHp) * 100);
    let pctMp = t.maxMp > 0 ? Math.max(0, (t.mp / t.maxMp) * 100) : 0;
    let stun = t.stunTurns > 0 ? `<div style="position:absolute; top:-8px; right:-8px; font-size:12px;">💫</div>` : '';

    let hasXMark = t.buffs && t.buffs.some(b => b.type === 'x_mark');
    let hasOrchid = t.buffs && t.buffs.some(b => b.type === 'orchid');
    let hasVeil = t.buffs && t.buffs.some(b => b.type === 'veil');
    let hasBladeMail = t.buffs && t.buffs.some(b => b.type === 'blade_mail');
    let hasBarrier = t.buffs && t.buffs.some(b => b.type === 'magic_barrier');
    let hasRum = t.buffs && t.buffs.some(b => b.type === 'rum');
    let hasGrave = t.buffs && t.buffs.some(b => b.type === 'shallow_grave');
    let hasWard = t.buffs && t.buffs.some(b => b.type === 'nether_ward');

    let hasStunImm = t.buffs && t.buffs.some(b => b.type === 'stun_immune');
    let hasSilence = t.buffs && t.buffs.some(b => b.type === 'silence');
    let hasRoot = t.buffs && t.buffs.some(b => b.type === 'root');
    let hasHex = t.buffs && t.buffs.some(b => b.type === 'hex_vuln');
    let hasThorns = t.buffs && t.buffs.some(b => b.type === 'thorns');
    let isPrep = !t.isEnemy && !!t.preparing;
    let isDefending = !t.isEnemy && t.buffs && t.buffs.some(b => b.type === 'defending');

    let leftBadge = '';
    if (t.isEnemy) {
        leftBadge = t.cataclysmCharging ? '☄️' : (hasHex ? '🐸' : (hasOrchid ? '🌺' : (hasSilence ? '🔇' : (hasRoot ? '❄️' : (hasThorns ? '🦔' : (hasXMark ? '❌' : (hasVeil ? '🟣' : (hasStunImm ? '⛓️' : (t.buffs && t.buffs.length > 0 ? '⬇️' : '')))))))));
    } else {
        leftBadge = isDefending ? '🛡️' : (isPrep ? '⏳' : (hasSilence ? '🔇' : (hasGrave ? '✝️' : (hasBladeMail ? '🦔' : (hasBarrier ? '🪈' : (hasWard ? '🟢' : (hasRum ? '🍺' : (hasStunImm ? '⛓️' : (t.buffs && t.buffs.length > 0 ? '⬆️' : '')))))))));
    }
    let buffIcon = leftBadge ? `<div style="position:absolute; top:-8px; left:-8px; font-size:12px;">${leftBadge}</div>` : '';
    let isBroken = t.buffs && t.buffs.some(b => b.type === 'broken');

    let extraCls = isDefending ? 'defending-state' : (isPrep ? 'prep-state' : (hasGrave ? 'grave-state' : (isBroken ? 'broken-state' : (hasXMark || hasOrchid || hasHex ? 'xmark-state' : (hasRum || hasBarrier ? 'rum-state' : '')))));

    let features = (typeof getUnlockedFeatures === 'function') ? getUnlockedFeatures(state) : { combatShields: true, combatRage: true, combatTargeting: true };

    if (t.isEnemy) {
        let enemySilenced = hasOrchid || hasSilence;
        let intentHtml = '';
        if (t.nextIntent && t.nextIntent.type === 'skill' && !enemySilenced) {
            let skName = (t.nextIntent.skill.type === 'hoodwink_release') ? '🎯 ВЫСТРЕЛ!' : `🔥 ${t.nextIntent.skill.name}`;
            intentHtml = `<div class="intent-badge spell">${skName}</div>`;
        } else {
            intentHtml = `<div class="intent-badge">${enemySilenced ? '🔇 ' : '⚔️ '}${t.atk}</div>`;
        }
        let shieldHtml = features.combatShields ? `<div class="shield-row">${isBroken ? '<span style="color:#f80;font-size:6px;">ПРОБИТ</span>' : '🛡️'.repeat(Math.max(0, t.shield || 0))}</div>` : '';
        let isSelected = features.combatTargeting && (t.id === combat.selectedTargetId);
        let targetCross = isSelected ? '<div class="target-crosshair">🎯</div>' : '';
        let targetCls = isSelected ? ' selected-target' : '';
        let wrapCls = isSelected ? ' selected-wrap' : '';
        let clickAttr = features.combatTargeting ? `onclick="selectEnemyTarget('${t.id}')" title="Нажмите для выбора цели 🎯"` : '';
        return `<div class="enemy-unit-wrap${wrapCls}" ${clickAttr}>
            ${intentHtml}
            <div style="position:relative;"><div class="sprite enemy ${extraCls}${targetCls}" id="sprite-${t.id}">${t.icon}${stun}${buffIcon}${targetCross}</div></div>
            <div style="font-size:7px; margin-top:3px; color:#ccc;">${t.name.split(' ')[0]}</div>
            ${shieldHtml}
            <div class="hp-bar-bg" style="width:44px; margin:2px auto;"><div class="hp-bar-fill" style="width:${pctHp}%"></div></div>
            ${t.maxMp > 0 ? `<div class="mp-bar-bg" style="width:44px; margin:1px auto;"><div class="mp-bar-fill" style="width:${pctMp}%"></div></div>` : ''}
        </div>`;
    } else {
        let isTargetLocked = combat.targets.some(e => e.isEnemy && e.hp > 0 && e.lockedTargetId === t.id);
        let targetLockedBadge = isTargetLocked ? `<div class="target-locked-badge">🎯 ПРИЦЕЛ</div>` : '';
        let rageHtml = features.combatRage ? `<div class="rage-bar-bg" style="width:44px; margin:1px auto;"><div class="rage-bar-fill" style="width:${Math.min(100, t.rage || 0)}%"></div></div>` : '';
        let illuTag = (t.dbId === 'pl' && t.illusions > 0) ? `<div style="font-size:6px; color:#0ef;">🔱×${t.illusions}</div>` : '';
        let prepBadge = isPrep ? `<div class="prep-badge">⏳ ${t.preparing.skillObj.name}</div>` : '';
        let defBadge = isDefending ? `<div class="defending-badge">🛡️ БЛОК</div>` : '';
        return `<div style="text-align:center; position:relative;">
            ${targetLockedBadge}
            ${defBadge}
            ${prepBadge}
            <div><div class="sprite ${extraCls}" id="sprite-${t.id}">${t.icon}${stun}${buffIcon}</div></div>
            <div style="font-size:7px; margin-top:3px; color:#ccc;">${t.name.split(' ')[0]}</div>
            ${illuTag}
            <div class="hp-bar-bg" style="width:44px; margin:2px auto;"><div class="hp-bar-fill" style="width:${pctHp}%"></div></div>
            ${t.maxMp > 0 ? `<div class="mp-bar-bg" style="width:44px; margin:1px auto;"><div class="mp-bar-fill" style="width:${pctMp}%"></div></div>` : ''}
            ${rageHtml}
        </div>`;
    }
}

function renderTurnOrderBar() {
    let bar = document.getElementById('turn-order-bar');
    if (!bar) return;
    let features = (typeof getUnlockedFeatures === 'function') ? getUnlockedFeatures(state) : { combatTurnBar: true };
    if (!features.combatTurnBar || !combat.active || !combat.turnQueue || combat.turnQueue.length === 0) {
        bar.innerHTML = '';
        bar.style.display = 'none';
        return;
    }
    bar.style.display = 'flex';
    let q = combat.turnQueue;
    let n = Math.min(6, q.length);
    let html = '';
    for (let i = 0; i < n; i++) {
        let idx = (combat.currentIdx + i) % q.length;
        let u = q[idx];
        let isHero = !u.isEnemy;
        let isActive = (i === 0);
        let cls = `turn-order-slot ${isHero ? 'hero' : 'enemy'}${isActive ? ' active' : ''}`;
        let flame = (u.isEnemy && u.nextIntent && u.nextIntent.type === 'skill')
            ? `<span class="intent-flame" title="${u.nextIntent.skill ? u.nextIntent.skill.name : 'Скилл'}">🔥</span>`
            : '';
        let defBadge = (!u.isEnemy && u.buffs && u.buffs.some(b => b.type === 'defending'))
            ? `<span class="turn-def-badge">🛡️</span>`
            : '';
        html += `<div class="${cls}" onclick="showUnitInspector('${u.id}')" style="cursor:pointer;" title="Нажмите, чтобы изучить ${u.name} (Ход #${i + 1})">
            <span class="slot-icon">${u.icon}</span>
            ${flame}${defBadge}
            <span class="slot-name">${u.name.split(' ')[0]}</span>
        </div>`;
    }
    bar.innerHTML = html;
}

function renderArena() {
    renderTurnOrderBar();
    const eDiv = document.getElementById('arena-enemies');
    const hDiv = document.getElementById('arena-heroes');
    if (!eDiv || !hDiv) return;
    eDiv.innerHTML = '';
    hDiv.innerHTML = '';

    const riverEl = document.getElementById('arena-river');
    if (riverEl) {
        riverEl.style.display = (combat.stage === 8) ? 'block' : 'none';
    }

    let features = (typeof getUnlockedFeatures === 'function') ? getUnlockedFeatures(state) : { combatRows: true };
    if (!features.combatRows) {
        let aliveHeroes = combat.targets.filter(t => !t.isEnemy && t.hp > 0);
        if (aliveHeroes.length === 0) aliveHeroes = combat.targets.filter(t => !t.isEnemy);
        hDiv.innerHTML = `<div class="formation-band"><div class="row">${aliveHeroes.map(renderUnitCard).join('')}</div></div>`;

        let aliveEnemies = combat.targets.filter(t => t.isEnemy && t.hp > 0);
        if (aliveEnemies.length === 0) aliveEnemies = combat.targets.filter(t => t.isEnemy);
        eDiv.innerHTML = `<div class="formation-band enemy-band"><div class="row">${aliveEnemies.map(renderUnitCard).join('')}</div></div>`;
        return;
    }

    let backHeroes = combat.targets.filter(t => !t.isEnemy && t.row === 'back');
    let frontHeroes = combat.targets.filter(t => !t.isEnemy && t.row === 'front');

    if (backHeroes.length > 0) {
        hDiv.innerHTML += `<div class="formation-band"><div class="row">${backHeroes.map(renderUnitCard).join('')}</div></div>`;
    }
    if (frontHeroes.length > 0) {
        hDiv.innerHTML += `<div class="formation-band"><div class="row">${frontHeroes.map(renderUnitCard).join('')}</div></div>`;
    }

    let frontEnemies = combat.targets.filter(t => t.isEnemy && t.row === 'front');
    let backEnemies = combat.targets.filter(t => t.isEnemy && t.row === 'back');

    if (frontEnemies.length > 0) {
        eDiv.innerHTML += `<div class="formation-band enemy-band front-band"><div class="row">${frontEnemies.map(renderUnitCard).join('')}</div></div>`;
    }
    if (backEnemies.length > 0) {
        eDiv.innerHTML += `<div class="formation-band enemy-band back-band"><div class="row">${backEnemies.map(renderUnitCard).join('')}</div></div>`;
    }
}

/* ===== ОБРАБОТКА СМЕРТЕЙ, ФАЗ И СКРИПТОВЫХ СОБЫТИЙ ===== */
function checkHeroSurvival(hero) {
    if (!hero || hero.isEnemy || hero.hp > 0) return;

    // 1. Крест Даззла (Shallow Grave)
    if (hero.buffs && hero.buffs.some(b => b.type === 'shallow_grave')) {
        hero.hp = 1;
        log(`✝️ Шэллоу Грейв не даёт ${hero.name} умереть (1 ЗД)!`);
        return;
    }

    // 2. Скрипт Донбрейкер: не даёт умереть ПОСЛЕДНЕМУ живому герою
    let dawn = combat.targets.find(t => t.isEnemy && t.scriptedDawn && t.hp > 0);
    if (dawn && !combat.dawnTriggered) {
        let otherAlive = combat.targets.filter(t => !t.isEnemy && t.id !== hero.id && t.hp > 0);
        if (otherAlive.length === 0) {
            hero.hp = Math.max(1, Math.floor(hero.maxHp * 0.14));
            log(`⚔️ ${hero.name} из последних сил сдерживает удар Донбрейкер!`);
            return;
        }
    }

    // 3. Реинкарнация Врайз Кинга
    if (hero.dbId === 'wk' && !hero.wkReincarnated && hero.heroData.skillLevels[3] > 0) {
        hero.wkReincarnated = true;
        let pct = hero.skills[3].reincarnatePct[hero.heroData.skillLevels[3] - 1] || 0.6;
        hero.hp = Math.floor(hero.maxHp * pct);
        hero.stunTurns = 0;
        log(`💀 РЕИНКАРНАЦИЯ! Врайз Кинг восстаёт с ${Math.round(pct * 100)}% ЗД и ослабляет врагов!`);
        combat.targets.filter(t => t.isEnemy && t.hp > 0).forEach(e => {
            e.buffs = e.buffs.filter(b => b.type !== 'weaken');
            e.buffs.push({ type: 'weaken', reduce: 0.25, turns: 2 });
        });
        return;
    }

    // 4. Реликвия Эгида Чащи (1 раз за бой)
    if (state.relics.includes('act2_aegis') && !combat.aegisUsed) {
        combat.aegisUsed = true;
        hero.hp = Math.floor(hero.maxHp * 0.5);
        hero.stunTurns = 0;
        log(`🛡️ ЭГИДА ЧАЩИ воскрешает ${hero.name} с 50% ЗД!`);
    }
}

function checkTravelerTransform(enemy) {
    if (!enemy || !enemy.isEnemy || !enemy.isMysteriousTraveler || enemy.isChicken || enemy.hp <= 0) return false;
    let shouldTransform = (enemy.hp <= enemy.maxHp * 0.65) || ((enemy.turnCount || 0) >= 2);
    if (!shouldTransform) return false;

    enemy.isChicken = true;
    enemy.name = 'Курица-беглец';
    enemy.icon = '🐔';
    enemy.shield = 0;
    enemy.shieldMax = 0;
    enemy.skills = [{ name: 'Побег в кусты!', type: 'chicken_flee', mult: 0, desc: 'Курица расправляет крылья и готовится удрать в кусты на своём ходу!' }];
    enemy.atk = 15;
    enemy.nextIntent = {
        type: 'skill',
        skill: enemy.skills[0]
    };
    log('🧓 Путник сбрасывает плащ и в клубах дыма превращается в 🐔 Курицу-беглеца! Она готовится удрать в кусты на своём ходу!');
    renderArena();

    if (!state.seenStories.includes('silence_escape')) {
        showStory('silence_escape', null, true);
    }
    return true;
}

function checkEnemyLethal(enemy) {
    if (!enemy || !enemy.isEnemy) return;
    if (enemy.isChicken) {
        let isSilenced = enemy.buffs && enemy.buffs.some(b => b.type === 'silence' || b.type === 'orchid');
        if (enemy.hp <= 0) {
            if (isSilenced) {
                state.shamanKilled = true;
                state.shamanFled = false;
                state.chickenKilled = true;
                combat.shamanBonus = true;
                save();
                log('⚡ Зачарованная курица повержена под Безмолвием! Шаманские чары развеяны!');
            } else {
                enemy.hp = 1;
                log('🐔 Курица неуязвима к обычному урону! Только 🔇 Безмолвие разрушит чары!');
            }
        }
        return;
    }
    if (enemy.hp <= 0 && enemy.lockedTargetId) {
        enemy.lockedTargetId = null;
    }
    if (enemy.hp <= 0 && !enemy._silencerCounted) {
        enemy._silencerCounted = true;
        let livingSilencers = combat.targets.filter(t => !t.isEnemy && t.dbId === 'silencer' && t.hp > 0);
        livingSilencers.forEach(sil => {
            sil.int = (sil.int || 0) + 5;
            sil.atk = (sil.atk || 0) + 5;
            log(`🔮 ${sil.name} похищает разум поверженного врага: +5 ИНТ (${sil.int} ИНТ)!`);
        });
        let livingPudges = combat.targets.filter(t => !t.isEnemy && t.dbId === 'pudge' && t.hp > 0);
        livingPudges.forEach(p => {
            let hpGain = Math.floor(p.maxHp * 0.04);
            p.maxHp += hpGain;
            p.hp = Math.min(p.maxHp, p.hp + hpGain);
            log(`🎣 «Рыбацкий улов»: Бобёр-удильщик лакомится добычей (+4% макс. ЗД, +${hpGain} ЗД)!`);
        });
    }
}

function checkSpecialEnemyEvents() {

    // Гибель Рингмастера
    let ringmaster = combat.targets.find(t => t.isEnemy && (t.dbId === 'ringmaster' || t.isRingmaster));
    if (ringmaster && ringmaster.hp <= 0 && !combat.ringmasterDeadTriggered) {
        combat.ringmasterDeadTriggered = true;
        let aliveCopies = combat.targets.filter(t => t.isEnemy && t.hp > 0 && t.isCircusCopy);
        if (aliveCopies.length > 0) {
            aliveCopies.forEach(c => {
                c.buffs.push({ type: 'no_conductor', turns: 99 });
                c.shield = Math.max(0, (c.shield || 0) - 1);
            });
            log(`🎪 Рингмастер пал! Оставшиеся копии растеряны («Без дирижёра»: −15% УРН, −1 🛡️)!`);
        }
    }

    // Прорыв вражеского строя (Breakthrough)
    let aliveEnemies = combat.targets.filter(t => t.isEnemy && t.hp > 0);
    if (aliveEnemies.length > 0) {
        let frontEnemies = aliveEnemies.filter(t => t.row === 'front');
        if (frontEnemies.length === 0) {
            let backEnemies = aliveEnemies.filter(t => t.row === 'back');
            if (backEnemies.length > 0) {
                let names = backEnemies.map(e => e.name).join(', ');
                backEnemies.forEach(e => { e.row = 'front'; });
                log(`💥 Линия врага прорвана! ${names} выходят в первый ряд!`);
            }
        }
    }

    // Фаза 2 Рошана
    let rosh = combat.targets.find(t => t.isEnemy && t.roshanPhases && t.phase === 1 && t.hp <= 0);
    if (rosh) {
        rosh.phase = 2;
        rosh.hp = Math.floor(rosh.maxHp * 0.75);
        rosh.atk = Math.floor(rosh.atk * 1.22);
        rosh.shield = rosh.shieldMax;
        rosh.stunTurns = 0;
        rosh.buffs = [];
        log(`👹 ФАЗА 2! Рошан срывает Эгиду, возрождается и впадает в ярость (+22% УРН)!`);
    }

    // Скрипт Донбрейкер: при <=50% ЗД оставляет 1 героя и присоединяется к отряду
    let dawn = combat.targets.find(t => t.isEnemy && t.scriptedDawn && !combat.dawnTriggered);
    if (dawn && dawn.hp <= dawn.maxHp * 0.5) {
        combat.dawnTriggered = true;
        let aliveHeroes = combat.targets.filter(t => !t.isEnemy && t.hp > 0);
        if (aliveHeroes.length > 1) {
            // Драматичный последний взрыв света, оставляющий ровно 1 героя (приоритетно Свена)
            let survivor = aliveHeroes.find(h => h.dbId === 'sven') || aliveHeroes[0];
            aliveHeroes.forEach(h => {
                if (h.id !== survivor.id) h.hp = 0;
                else h.hp = Math.max(1, Math.floor(h.maxHp * 0.14));
            });
            log(`☀️ Последняя вспышка Донбрейкер сбивает союзников — на ногах лишь ${survivor.name}!`);
        }
        renderArena();
        triggerDawnbreakerJoin();
        return true;
    }

    // Внезапный Агент Габена после убийства ЦК (Этап 24)
    if (combat.stage === 24 && !combat.gabenTriggered) {
        let ckAlive = combat.targets.some(t => t.isEnemy && t.ckAmbusher && t.hp > 0);
        if (!ckAlive) {
            combat.gabenTriggered = true;
            // Убираем оставшиеся копии ЦК
            combat.targets = combat.targets.filter(t => !(t.isEnemy && t.isSummon));
            combat.turnQueue = combat.turnQueue.filter(t => !(t.isEnemy && t.isSummon));
            renderArena();
            showStory('gaben_ambush', () => {
                let gaben = makeSpecialEnemy('agent_gaben', 'e_gaben', combat.contract);
                combat.targets.push(gaben);
                combat.turnQueue.push(gaben);
                combat.targets.filter(t => !t.isEnemy && t.hp > 0).forEach(h => {
                    h.hp = Math.min(h.maxHp, h.hp + Math.floor(h.maxHp * 0.25));
                    h.mp = Math.min(h.maxMp, h.mp + Math.floor(h.maxMp * 0.30));
                });
                log(`🤖 АГЕНТ ГАБЕНА врывается в бой! Отряд ловит второе дыхание (+25% ЗД, +30% МН)!`);
                renderArena();
                combat.currentIdx = 0;
                nextTurn();
            }, false);
            return true;
        }
    }
    return false;
}

function triggerDawnbreakerJoin() {
    combat.active = false;
    if (!state.heroes.some(h => h.dbId === 'dawnbreaker')) {
        let avgLvl = Math.max(8, Math.round(state.heroes.reduce((s, h) => s + h.level, 0) / Math.max(1, state.heroes.length)));
        let newDawn = {
            id: 'hero_dawnbreaker_story', dbId: 'dawnbreaker',
            level: avgLvl, xp: 0, sp: avgLvl, skillLevels: [0, 0, 0, 0],
            hasShard: false, hasScepter: false, items: [], neutralItem: null, duelDmg: 0, row: 'front'
        };
        state.heroes.push(newDawn);
        if (state.squad.length < getMaxSquadSize()) state.squad.push(newDawn.id);
    }
    showStory('dawnbreaker_join', () => {
        winBattle(true);
    }, false);
}

/* ===== ХОД БОЯ ===== */
function getTeamArcaneAuraMp() {
    let cm = combat.targets.find(t => !t.isEnemy && t.hp > 0 && t.dbId === 'cm' && t.heroData.skillLevels[2] > 0);
    if (!cm) return 0;
    let s = cm.skills[2];
    return s.teamMpGain || (s.teamMpRegen && s.teamMpRegen[cm.heroData.skillLevels[2] - 1]) || 6;
}

function getTeamWkLifesteal() {
    let wk = combat.targets.find(t => !t.isEnemy && t.hp > 0 && t.dbId === 'wk' && t.heroData.skillLevels[1] > 0);
    if (!wk) return 0;
    let s = wk.skills[1];
    return s.frontLifesteal || (s.teamLifesteal && s.teamLifesteal[wk.heroData.skillLevels[1] - 1]) || 0.15;
}

function nextTurn() {
    if (!combat.active) return;
    if (checkSpecialEnemyEvents()) return;

    combat.targets.forEach(t => {
        if (t.isEnemy) checkEnemyLethal(t);
    });

    combat.targets = combat.targets.filter(t => t.hp > 0);
    combat.turnQueue = combat.turnQueue.filter(t => t.hp > 0);
    renderArena();

    let enemies = combat.targets.filter(t => t.isEnemy);
    let heroes = combat.targets.filter(t => !t.isEnemy);
    if (enemies.length === 0) return winBattle(false);
    if (heroes.length === 0) return loseBattle();

    if (combat.currentIdx >= combat.turnQueue.length) combat.currentIdx = 0;
    let actor = combat.turnQueue[combat.currentIdx];
    document.getElementById('turn-indicator').innerText = `Ходит: ${actor.icon} ${actor.name}`;

    if (actor.buffs) {
        let expiredOrchid = null;
        actor.buffs.forEach(b => {
            if (b.type === 'broken') return; // Пробитие спадает в КОНЦЕ активного хода врага (finishEnemyTurn)
            b.turns--;
            if (b.type === 'salve_hot') {
                actor.hp = Math.min(actor.maxHp, actor.hp + 50);
                log(`🌿 Сальва лечит ${actor.name} на +50 ЗД.`);
            }
            if (b.type === 'tango_hot') {
                actor.hp = Math.min(actor.maxHp, actor.hp + 15);
                log(`🍃 Танго лечит ${actor.name} на +15 ЗД.`);
            }
            if (b.type === 'burn_dot' && actor.hp > 0) {
                let bd = Math.floor(b.dmg * (1 - getMagicReduction(actor)));
                actor.hp -= bd;
                recordOrchidDmg(actor, bd);
                log(`🔥 Горение наносит ${bd} Маг. урона по ${actor.name}.`);
                checkHeroSurvival(actor);
                applyDuelDeathCheck(actor);
            }
            if (b.type === 'poison_dot' && actor.hp > 0) {
                let pd = Math.floor(b.dmg * (1 - getMagicReduction(actor)));
                actor.hp -= pd;
                recordOrchidDmg(actor, pd);
                log(`🧪 Яд наносит ${pd} Маг. урона по ${actor.name}.`);
                checkHeroSurvival(actor);
                applyDuelDeathCheck(actor);
            }
            if (b.type === 'orchid' && b.turns <= 0) expiredOrchid = b;
        });
        actor.buffs = actor.buffs.filter(b => b.turns > 0);
        if (actor.hp <= 0) {
            renderArena();
            setTimeout(nextTurn, fastMode ? 350 : 700);
            return;
        }
        if (expiredOrchid && actor.hp > 0) {
            let popDmg = Math.floor((expiredOrchid.accumDmg || 0) * 0.25 * (1 - getMagicReduction(actor)));
            if (popDmg > 0) {
                actor.hp -= popDmg;
                log(`🌺 Взрыв Орчида наносит ${popDmg} Маг. урона по ${actor.name}!`);
                applyDuelDeathCheck(actor);
                if (actor.hp <= 0) {
                    renderArena();
                    setTimeout(nextTurn, fastMode ? 350 : 700);
                    return;
                }
            } else {
                log(`🌺 Действие Орчида на ${actor.name} закончилось.`);
            }
        }
    }

    if (actor.isEnemy) {
        if (actor.isMysteriousTraveler) checkTravelerTransform(actor);
        actor.mp = Math.min(actor.maxMp, actor.mp + (actor.mpRegen || 16));
    } else {
        let auraMp = getTeamArcaneAuraMp();
        actor.mp = Math.min(actor.maxMp, actor.mp + actor.mpRegen + auraMp);
        actor.hp = Math.min(actor.maxHp, actor.hp + actor.hpRegen);
        combat.itemsUsedThisTurn = 0;

        Object.keys(actor.itemCooldowns || {}).forEach(k => {
            if (actor.itemCooldowns[k] > 0) actor.itemCooldowns[k]--;
        });
        Object.keys(actor.skillCooldowns || {}).forEach(k => {
            if (actor.skillCooldowns[k] > 0) actor.skillCooldowns[k]--;
        });

        if (actor.armletOn) {
            actor.hp = Math.max(1, actor.hp - 50);
            log(`💪 Армлет сжигает 50 ЗД у ${actor.name}.`);
        }
    }

    renderArena();

    if (actor.stunTurns > 0) {
        actor.stunTurns--;
        log(`💫 ${actor.name} оглушён и пропускает ход!`);
        if (actor.stunTurns <= 0) {
            let immTurns = (actor.isEnemy && actor.isBoss) ? CONFIG.combat.stunImmunityBoss : CONFIG.combat.stunImmunityNormal;
            actor.buffs = actor.buffs.filter(b => b.type !== 'stun_immune');
            actor.buffs.push({ type: 'stun_immune', turns: immTurns });
            log(`⛓️ ${actor.name} выходит из оглушения и получает Иммунитет (${immTurns} х.)!`);
        }
        if (actor.isEnemy) finishEnemyTurn(actor);
        combat.currentIdx++;
        setTimeout(nextTurn, fastMode ? 400 : 800);
        return;
    }

    // Автоматический запуск подготовленного ультимейта в начале следующего хода героя
    if (!actor.isEnemy && actor.preparing) {
        let prep = actor.preparing;
        actor.preparing = null;
        let tgt = combat.targets.find(t => t.id === prep.targetId && t.hp > 0) || getHeroTargetEnemy();
        if (tgt) {
            prep.target = tgt;
            prep.actor = actor;
            prep.cost = 0;
            prep.isPrepRelease = true;
            document.getElementById('btn-attack').disabled = true;
            document.getElementById('btn-skills').disabled = true;
            if (document.getElementById('btn-defend')) document.getElementById('btn-defend').disabled = true;
            document.getElementById('btn-items').disabled = true;
            log(`✨ ${actor.name} завершает подготовку и применяет «${prep.skillObj.name}»!`);
            setTimeout(() => executeHeroAction(prep), fastMode ? 350 : 700);
            return;
        }
    }

    let duelBuff = actor.buffs && actor.buffs.find(b => b.type === 'dueling');
    if (duelBuff) {
        let duelTarget = combat.targets.find(t => t.id === duelBuff.targetId);
        if (!duelTarget) {
            actor.buffs = actor.buffs.filter(b => b.type !== 'dueling');
        } else {
            document.getElementById('btn-skills').disabled = true;
            if (document.getElementById('btn-defend')) document.getElementById('btn-defend').disabled = true;
            document.getElementById('btn-items').disabled = true;
            if (!actor.isEnemy) {
                showModal('Атака (Дуэль)', duelTarget, actor.atk, 'phys', null, 0);
                return;
            } else {
                setTimeout(() => enemyAI(actor, duelTarget), fastMode ? 450 : 900);
                return;
            }
        }
    }

    let features = (typeof getUnlockedFeatures === 'function') ? getUnlockedFeatures(state) : { combatBlock: true, shopTab: true };
    let btnSkills = document.getElementById('btn-skills');
    let btnDefend = document.getElementById('btn-defend');
    let btnItems = document.getElementById('btn-items');

    if (btnDefend) {
        btnDefend.style.display = features.combatBlock ? '' : 'none';
    }
    if (btnItems) {
        btnItems.style.display = (features.shopTab && combat.stage !== 'p1') ? '' : 'none';
    }

    if (actor.isEnemy) {
        document.getElementById('btn-attack').disabled = true;
        if (btnDefend) btnDefend.disabled = true;
        btnSkills.disabled = true;
        btnSkills.classList.remove('btn-rage-ready');
        btnSkills.innerText = 'СКИЛЛЫ';
        if (btnItems) btnItems.disabled = true;
        document.getElementById('skills-submenu').style.display = 'none';
        setTimeout(() => enemyAI(actor), fastMode ? 450 : 900);
    } else {
        if (!actor.isEnemy && combat.stage === 'p2' && !combat.boarHintShown) {
            let boar = combat.targets.find(t => t.isEnemy && t.hp > 0 && (t.tplKey === 'prologue_boar' || t.name === 'Лесной вепрь'));
            if (boar && boar.nextIntent && boar.nextIntent.type === 'skill') {
                combat.boarHintShown = true;
                log('<span style="color:#0cf;">⚔️ Свен: «Зверь разгоняется для тарана... Нужно встретить удар мечом! (🛡️ БЛОК)»</span>');
            }
        }
        if (btnDefend) btnDefend.disabled = false;
        let heroRooted = actor.buffs && actor.buffs.some(b => b.type === 'root');
        let btnAttack = document.getElementById('btn-attack');
        if (heroRooted) {
            btnAttack.disabled = true;
            btnAttack.innerText = '❄️ ОЦЕПЕНЕНИЕ';
        } else {
            btnAttack.disabled = false;
            btnAttack.innerText = 'УДАР';
        }

        let heroSilenced = actor.buffs && actor.buffs.some(b => b.type === 'silence');
        if (heroSilenced) {
            btnSkills.disabled = true;
            btnSkills.classList.remove('btn-rage-ready');
            btnSkills.innerText = '🔇 БЕЗМОЛВИЕ';
        } else {
            btnSkills.disabled = false;
            if (actor.rage >= 100) {
                btnSkills.classList.add('btn-rage-ready');
                btnSkills.innerText = '⚡ ЯРОСТЬ!';
            } else {
                btnSkills.classList.remove('btn-rage-ready');
                btnSkills.innerText = 'СКИЛЛЫ';
            }
        }
        let maxItems = state.relics.includes('act3_cheese') ? 2 : 1;
        document.getElementById('btn-items').disabled = combat.itemsUsedThisTurn >= maxItems;
    }
}

function log(msg) {
    let l = document.getElementById('battle-log');
    if (!l) return;
    l.innerHTML += `<div>> ${msg}</div>`;
    l.scrollTop = l.scrollHeight;
}

function playAnim(attackerId, type, cb) {
    let el = document.getElementById('sprite-' + attackerId);
    if (el) {
        el.classList.add(type);
        let d1 = fastMode ? 280 : 580;
        let d2 = fastMode ? 340 : 700;
        setTimeout(() => { el.classList.remove(type); setTimeout(cb, d2); }, d1);
    } else cb();
}

function getHeroTargetEnemy() {
    let enemies = combat.targets.filter(t => t.isEnemy && t.hp > 0);
    if (enemies.length === 0) return null;
    if (combat.selectedTargetId) {
        let sel = enemies.find(e => e.id === combat.selectedTargetId);
        if (sel) return sel;
    }
    let auto = enemies.sort((a, b) => a.hp - b.hp)[0];
    combat.selectedTargetId = auto ? auto.id : null;
    return auto;
}

function raidAction(type) {
    let actor = combat.turnQueue[combat.currentIdx];
    if (!actor || actor.isEnemy) return;
    if (type === 'defend') {
        let defMp = CONFIG.combat.defendMpGain || 25;
        actor.buffs = actor.buffs.filter(b => b.type !== 'defending');
        actor.buffs.push({ type: 'defending', turns: 1 });
        actor.mp = Math.min(actor.maxMp, actor.mp + defMp);
        actor.rage = Math.min(100, (actor.rage || 0) + 15);

        if (document.getElementById('btn-attack')) document.getElementById('btn-attack').disabled = true;
        if (document.getElementById('btn-skills')) document.getElementById('btn-skills').disabled = true;
        if (document.getElementById('btn-defend')) document.getElementById('btn-defend').disabled = true;
        if (document.getElementById('btn-items')) document.getElementById('btn-items').disabled = true;
        document.getElementById('skills-submenu').style.display = 'none';

        log(`🛡️ ${actor.name} встаёт в глухую защиту! (−50% входящего урона, +${defMp} МН, +15 Ярости, защита от казней и критов)`);
        renderArena();
        combat.currentIdx++;
        setTimeout(nextTurn, fastMode ? 300 : 600);
        return;
    } else if (type === 'attack') {
        let target = getHeroTargetEnemy();
        let dmg = actor.atk;
        let atkBuff = actor.buffs && actor.buffs.find(b => b.type === 'atk');
        if (atkBuff) dmg = Math.floor(dmg * atkBuff.value);
        if (actor.dbId === 'pl' && actor.illusions > 0) dmg = Math.floor(dmg * (1 + actor.illusions * 0.12));
        let backPenalty = (actor.isMelee && actor.row === 'back');
        if (backPenalty) dmg = Math.floor(dmg * 0.75);
        showModal('Обычная атака' + (backPenalty ? ' (2-й ряд −25%)' : ''), target, dmg, 'phys', null, 0);
    } else if (type === 'skills') {
        let menu = document.getElementById('skills-submenu');
        menu.style.display = 'block';
        menu.innerHTML = '';
        let has = false;
        let isRage = actor.rage >= 100;
        let feat = (typeof getUnlockedFeatures === 'function') ? getUnlockedFeatures(state) : { combatUlt: true };
        actor.skills.forEach((sk, idx) => {
            if (sk.type === 'passive') return;
            if (!feat.combatUlt && (idx === 3 || sk.id === 's4')) return;
            if (combat.stage === 'p1' && idx > 0) return;
            let lvl = actor.heroData.skillLevels[idx];
            if (lvl > 0) {
                has = true;
                let dmg = sk.dmg[lvl - 1];
                if (actor.dbId === 'silencer') {
                    if (sk.id === 's1') dmg = Math.floor(1.2 * actor.atk + 2.2 * (actor.int || 0));
                    if (sk.id === 's4') dmg = Math.floor(0.85 * actor.atk + 1.5 * (actor.int || 0));
                }
                let stun = (sk.stun && sk.stun[lvl - 1]) || 0;
                let cost = sk.mp[lvl - 1];
                let cdLeft = (actor.skillCooldowns && actor.skillCooldowns[sk.id]) || 0;
                if (actor.dbId === 'pudge' && (sk.id === 's1' || sk.name === 'Фишинг хук')) {
                    let rLvl = (state.fishing && state.fishing.rodLevel) || 0;
                    let rStat = (typeof getRodStats === 'function') ? getRodStats(rLvl) : null;
                    if (rStat) {
                        if (rStat.mpSave) cost = Math.max(20, cost - rStat.mpSave);
                        if (rStat.dmgBonus) dmg = Math.floor(dmg * (1 + rStat.dmgBonus));
                    }
                }
                let canCast = actor.mp >= cost && cdLeft === 0;
                let ampMult = (sk.type === 'magic' && actor.spellAmp > 0) ? (1 + actor.spellAmp) : 1;
                let dispDmg = Math.floor(dmg * ampMult * (isRage ? 1.5 : 1));
                let infoTxt = '';
                if (sk.cleave) infoTxt = `Сплэш ${Math.floor((dmg + actor.atk * (sk.atkBonus || 0)) * (isRage ? 1.5 : 1))}`;
                else if (sk.guaranteedCrit) infoTxt = `100% Крит ×${sk.guaranteedCrit[lvl - 1]}`;
                else if (dmg > 0) infoTxt += `${dispDmg} ${sk.type === 'heal' ? 'ЗД' : 'УРН'}`;
                if (sk.teamArmor) infoTxt = `+${sk.teamArmor[lvl - 1]} БРО отряду`;
                if (sk.selfAtkMult) infoTxt = `+${Math.round((sk.selfAtkMult[lvl - 1] - 1) * 100)}% УРН`;
                if (sk.shallowGrave) infoTxt = 'Крест (2 х.)';
                if (sk.jujuArmor) infoTxt = `−${sk.jujuArmor[lvl - 1]} БРО, −${sk.jujuCd[lvl - 1]} КД`;
                if (sk.wardDmg) infoTxt = `Вард ${sk.wardDmg[lvl - 1]} УРН`;
                if (sk.doppel) infoTxt = 'Уклон +2 Иллюз.';
                if (sk.manaSteal) infoTxt += `${sk.manaSteal[lvl - 1]} МН`;
                if (sk.xMarkAmp) infoTxt = `+${Math.round(sk.xMarkAmp[lvl - 1] * 100)}% маг.`;
                if (sk.hexAmp) infoTxt = `🔇 ${sk.silence}х, +${Math.round(sk.hexAmp[lvl - 1] * 100)}% урн`;
                if (sk.rootTurns) infoTxt += (infoTxt ? ', ' : '') + `❄️ ${sk.rootTurns}х`;
                if (sk.silence && !sk.hexAmp) infoTxt += (infoTxt ? ', ' : '') + `🔇 ${sk.silence}х`;
                if (sk.breakHits >= 2 || sk.primaryBreakHits >= 2 || sk.breakHitsTarget >= 2) {
                    let aLvl = (actor && (actor.level || (actor.heroData && actor.heroData.level))) || 1;
                    let bText = (aLvl < 4) ? (isRage ? '💥 −2🛡️' : '💥 −1🛡️ (2🛡️ с 4 ур.)') : (isRage ? '💥 −3🛡️' : '💥 −2🛡️');
                    infoTxt += (infoTxt ? ', ' : '') + bText;
                }
                if (sk.type === 'duel') infoTxt = 'Дуэль 3х';
                let prepTag = sk.prep ? (isRage ? ' <span style="color:#fc0;">[МГНОВЕННО!]</span>' : ` <span style="color:#0ef;">[⏳ ${sk.prep}х]</span>`) : '';
                let rightTxt = cdLeft > 0 ? `<span style="float:right; color:#f66;">КД: ${cdLeft}х</span>` : `<span style="float:right; color:#0af;">МН: ${cost}</span>`;
                menu.innerHTML += `<button class="skill-btn" ${canCast ? '' : 'disabled'} onclick="prepareSkill(${idx},${dmg},${stun},${cost})">
                    ${isRage ? '🔥' : '⚡'} ${sk.name}${prepTag} <span style="color:#0f0;">(${infoTxt || 'Бафф'})</span>
                    ${rightTxt}
                </button>`;
            }
        });
        if (!has) menu.innerHTML = '<p style="font-size:8px; color:#aaa; margin-top:5px; text-align:center;">Нет изученных активных навыков.</p>';
    }
}

function prepareSkill(idx, calcDmg, stunDur, cost) {
    document.getElementById('skills-submenu').style.display = 'none';
    let actor = combat.turnQueue[combat.currentIdx];
    let skill = actor.skills[idx];
    let lvl = actor.heroData.skillLevels[idx];
    let target;

    if (skill.type === 'heal' || skill.type === 'buff') target = actor;
    else if (skill.aoe || skill.cleave || skill.jujuArmor) target = combat.targets.filter(t => t.isEnemy)[0];
    else target = getHeroTargetEnemy();

    if (skill.atkBonus) {
        let atkVal = actor.atk;
        let atkBuff = actor.buffs && actor.buffs.find(b => b.type === 'atk');
        if (atkBuff) atkVal = Math.floor(atkVal * atkBuff.value);
        calcDmg += Math.floor(atkVal * skill.atkBonus);
    }
    if (actor.dbId === 'silencer') {
        if (skill.id === 's1') calcDmg = Math.floor(1.2 * actor.atk + 2.2 * (actor.int || 0));
        if (skill.id === 's4') calcDmg = Math.floor(0.85 * actor.atk + 1.5 * (actor.int || 0));
    }
    if (actor.dbId === 'pudge' && (skill.id === 's1' || skill.name === 'Фишинг хук')) {
        let rLvl = (state.fishing && state.fishing.rodLevel) || 0;
        let rStat = (typeof getRodStats === 'function') ? getRodStats(rLvl) : null;
        if (rStat) {
            if (rStat.mpSave) cost = Math.max(20, cost - rStat.mpSave);
            if (rStat.dmgBonus) calcDmg = Math.floor(calcDmg * (1 + rStat.dmgBonus));
        }
    }
    if (skill.useIllusions && actor.illusions > 0) calcDmg = Math.floor(calcDmg * (1 + actor.illusions * 0.12));
    if (skill.heavenlyJump) calcDmg = skill.heavenlyJump[lvl - 1];
    if (skill.manaSteal) calcDmg = skill.manaSteal[lvl - 1];
    if (skill.wardDmg) calcDmg = skill.wardDmg[lvl - 1];

    if (actor.spellAmp > 0 && calcDmg > 0 && skill.type === 'magic') {
        calcDmg = Math.floor(calcDmg * (1 + actor.spellAmp));
    }

    if (actor.heroData.hasShard && skill.type !== 'passive' && calcDmg > 0) calcDmg = Math.floor(calcDmg * 1.2);
    if (actor.heroData.hasScepter && idx === 3 && calcDmg > 0) calcDmg = Math.floor(calcDmg * 1.3);

    let usedRage = actor.rage >= 100;
    if (usedRage && calcDmg > 0) calcDmg = Math.floor(calcDmg * 1.5);

    showModal(skill.name + (usedRage ? ' 🔥' : ''), target, calcDmg, skill.type, skill, stunDur, cost, usedRage, lvl);
}

/* ===== АКТИВНЫЕ ПРЕДМЕТЫ В БОЮ (СЛОТЫ + КД + СЫР + ОСКОЛОК) ===== */
function openItemUse() {
    let modal = document.getElementById('item-use-modal');
    let list = document.getElementById('item-use-list');
    list.innerHTML = '';
    let actor = combat.turnQueue[combat.currentIdx];
    let equipped = getHeroEquippedItems(actor);

    let hasUsable = false;
    const addBtn = (id, label, bg, extraDisabled = false) => {
        hasUsable = true;
        let cd = (actor.itemCooldowns && actor.itemCooldowns[id]) || 0;
        let dis = cd > 0 || extraDisabled;
        let cdTxt = cd > 0 ? ` (КД: ${cd} х.)` : '';
        list.innerHTML += `<button ${dis ? 'disabled' : ''} onclick="useItem('${id}')" style="width:100%; margin-bottom:5px; background:${bg}; font-size:8px; text-align:left;">${label}${cdTxt}</button>`;
    };

    if (equipped.includes('veil_of_discord')) addBtn('veil_of_discord', '🟣 Вейл оф Дискорд (+20% Маг. урон врагам, 2 х.)', '#415');
    if (equipped.includes('blade_mail')) addBtn('blade_mail', '🦔 Блейдмейл (Возврат 70% урона врагу, 2 х.)', '#531');
    if (equipped.includes('mekansm')) addBtn('mekansm', '✨ Меказм (+200 ЗД всему отряду)', '#154');
    if (equipped.includes('pipe_of_insight')) addBtn('pipe_of_insight', '🪈 Пайп оф Инсайт (Маг. щит 150 всему отряду, 2 х.)', '#145');
    if (equipped.includes('orchid_malevolence')) addBtn('orchid_malevolence', '🌺 Орчид Малеволенс (Безмолвие + взрыв 25%, 2 х.)', '#614');
    if (equipped.includes('power_treads')) addBtn('power_treads', `🥾 Пауэр Тредс (Перекл. на ${actor.treadsMode === 'str' ? 'ИНТ: +120 МН' : 'СИЛ: +220 ЗД'})`, '#335');

    if (equipped.includes('satanic')) addBtn('satanic', '😈 Сатаник (+175% физ. вампиризм, 3 х.)', '#550');
    if (equipped.includes('glimmer')) addBtn('glimmer', '🧥 Глиммер Кейп (100% физ. уклонение, 2 х.)', '#235');
    if (equipped.includes('arcane_boots')) addBtn('arcane_boots', '👢 Аркейн Бутс (+45 МН всему отряду)', '#136');
    if (equipped.includes('magic_stick')) addBtn('magic_stick', `🪄 Мэджик Стик (+${30 + (actor.stickCharges || 0) * 15} ЗД, зар: ${actor.stickCharges || 0})`, '#252');
    if (equipped.includes('bkb')) addBtn('bkb', '🛡️ БКБ (Иммунитет к магии и станам, 3 х.)', '#650');
    if (equipped.includes('armlet')) addBtn('armlet', `💪 Армлет (${actor.armletOn ? 'ВЫКЛЮЧИТЬ' : 'ВКЛЮЧИТЬ: +25 СИЛ / −50 ЗД/ход'})`, '#522');

    if (state.raidInv.includes('salve')) addBtn('salve', `🌿 Хилинг Сальв (150 ЗД / 3 х.) [×${state.raidInv.filter(x => x === 'salve').length}]`, '#142');
    if (state.raidInv.includes('tango')) addBtn('tango', `🍃 Танго (60 ЗД / 4 х.) [×${state.raidInv.filter(x => x === 'tango').length}]`, '#142');

    if (!hasUsable) list.innerHTML = '<p style="color:#aaa; font-size:8px;">Нет активных предметов в слотах героя и расходников в схроне.</p>';
    modal.style.display = 'flex';
}
function closeItemUse() { document.getElementById('item-use-modal').style.display = 'none'; }

function useItem(id) {
    closeItemUse();
    let actor = combat.turnQueue[combat.currentIdx];
    let itemDef = findAnyItem(id);

    if (id === 'veil_of_discord') {
        combat.targets.filter(t => t.isEnemy && t.hp > 0).forEach(e => {
            e.buffs = e.buffs.filter(b => b.type !== 'veil');
            e.buffs.push({ type: 'veil', turns: 2 });
        });
        log(`🟣 ${actor.name} применяет Вейл оф Дискорд (+20% Маг. урона врагам, 2 х.).`);
    } else if (id === 'blade_mail') {
        actor.buffs = actor.buffs.filter(b => b.type !== 'blade_mail');
        actor.buffs.push({ type: 'blade_mail', turns: 2 });
        log(`🦔 ${actor.name} активирует Блейдмейл (возврат 70% урона, 2 х.)!`);
    } else if (id === 'mekansm') {
        combat.targets.filter(t => !t.isEnemy && t.hp > 0).forEach(ally => {
            ally.hp = Math.min(ally.maxHp, ally.hp + 200);
        });
        log(`✨ ${actor.name} активирует Меказм: +200 ЗД всему отряду!`);
    } else if (id === 'pipe_of_insight') {
        combat.targets.filter(t => !t.isEnemy && t.hp > 0).forEach(ally => {
            ally.buffs = ally.buffs.filter(b => b.type !== 'magic_barrier');
            ally.buffs.push({ type: 'magic_barrier', shield: 150, turns: 2 });
        });
        log(`🪈 ${actor.name} активирует Пайп оф Инсайт: маг. барьер 150 всему отряду (2 х.)!`);
    } else if (id === 'orchid_malevolence') {
        let enemy = getHeroTargetEnemy();
        if (enemy) {
            enemy.buffs = enemy.buffs.filter(b => b.type !== 'orchid' && b.type !== 'silence');
            enemy.buffs.push({ type: 'orchid', turns: 2, accumDmg: 0 });
            enemy.buffs.push({ type: 'silence', turns: 2 });
            interruptUnitCast(enemy, '🌺 Орчид');
            if (enemy.isChicken) {
                enemy.nextIntent = { type: 'attack' };
                log(`🌺 ${actor.name} накладывает Орчид на курицу 🐔! Побег сорван, Безмолвие (2 х.) развеяло защиту — добивайте её!`);
            } else {
                log(`🌺 ${actor.name} накладывает Орчид на ${enemy.name}: Безмолвие (2 х.) и каст сбит!`);
            }
            renderArena();
        }
    } else if (id === 'power_treads') {
        if (actor.treadsMode === 'str') {
            actor.treadsMode = 'int';
            actor.maxHp -= 220;
            actor.hp = Math.max(1, Math.min(actor.maxHp, actor.hp - 220));
            actor.maxMp += 120; actor.mp += 120;
            if (actor.mainAttr === 'str') actor.atk -= 10; else actor.atk += 10;
            log(`🥾 ${actor.name} переключает Пауэр Тредс на ИНТ (+120 МН).`);
        } else {
            actor.treadsMode = 'str';
            actor.maxMp -= 120;
            actor.mp = Math.max(0, Math.min(actor.maxMp, actor.mp - 120));
            actor.maxHp += 220; actor.hp += 220;
            if (actor.mainAttr === 'str') actor.atk += 10; else actor.atk -= 10;
            log(`🥾 ${actor.name} переключает Пауэр Тредс на СИЛ (+220 ЗД).`);
        }
    } else if (id === 'satanic') {
        actor.buffs.push({ type: 'lifesteal', value: 1.75, turns: 3 });
        log(`😈 ${actor.name} активирует Сатаник! Физ. вампиризм 175% (3 х.).`);
    } else if (id === 'glimmer') {
        actor.buffs.push({ type: 'glimmer', turns: 2 });
        log(`🧥 ${actor.name} активирует Глиммер (100% физ. уклонение, 2 х.)!`);
    } else if (id === 'arcane_boots') {
        combat.targets.filter(t => !t.isEnemy).forEach(ally => {
            ally.mp = Math.min(ally.maxMp, ally.mp + 45);
        });
        log(`👢 ${actor.name} использует Аркейн Бутс: +45 МН всему отряду!`);
    } else if (id === 'salve') {
        let lowest = combat.targets.filter(t => !t.isEnemy).sort((a, b) => a.hp - b.hp)[0];
        lowest.buffs.push({ type: 'salve_hot', turns: 3 });
        log(`🌿 ${lowest.name} применяет Хилинг Сальв (150 ЗД за 3 хода).`);
        state.raidInv.splice(state.raidInv.indexOf('salve'), 1);
    } else if (id === 'tango') {
        let lowest = combat.targets.filter(t => !t.isEnemy).sort((a, b) => a.hp - b.hp)[0];
        lowest.buffs.push({ type: 'tango_hot', turns: 4 });
        log(`🍃 ${lowest.name} съедает Танго (60 ЗД за 4 хода).`);
        state.raidInv.splice(state.raidInv.indexOf('tango'), 1);
    } else if (id === 'magic_stick') {
        let heal = 30 + (actor.stickCharges || 0) * 15;
        actor.hp = Math.min(actor.maxHp, actor.hp + heal);
        log(`🪄 ${actor.name} использует Мэджик Стик: +${heal} ЗД (зарядов: ${actor.stickCharges || 0}).`);
        actor.stickCharges = 0;
    } else if (id === 'bkb') {
        actor.buffs.push({ type: 'bkb', turns: 3 });
        log(`🛡️ ${actor.name} активирует БКБ: иммунитет к магии и станам (3 х.)!`);
    } else if (id === 'armlet') {
        if (actor.armletOn) {
            actor.armletOn = false;
            actor.maxHp -= 550;
            actor.hp = Math.max(1, Math.min(actor.maxHp, actor.hp - 550));
            if (actor.mainAttr === 'str') actor.atk -= 25;
            log(`💪 ${actor.name} выключает Армлет.`);
        } else {
            actor.armletOn = true;
            actor.maxHp += 550; actor.hp += 550;
            if (actor.mainAttr === 'str') actor.atk += 25;
            log(`💪 ${actor.name} включает Армлет (+25 СИЛ, +550 ЗД, −50 ЗД/ход)!`);
        }
    }

    if (itemDef && itemDef.cd) {
        let cdVal = state.relics.includes('act4_shard') ? Math.max(1, itemDef.cd - 1) : itemDef.cd;
        actor.itemCooldowns[id] = cdVal;
    }
    combat.itemsUsedThisTurn++;
    let maxItems = state.relics.includes('act3_cheese') ? 2 : 1;
    document.getElementById('btn-items').disabled = combat.itemsUsedThisTurn >= maxItems;
    renderArena();
    save();
}

/* ===== ПРЕВЬЮ УРОНА И ДЕЙСТВИЙ ===== */
function getThroneSealReduction(unit) {
    if (unit && unit.throneBoss && combat.targets.some(t => t.isEnemy && t.isSummon && t.hp > 0)) return 0.65;
    return 1;
}

function showModal(name, target, baseDmg, type, skillObj, stunDur, cost = 0, usedRage = false, skillLvl = 1) {
    let actor = combat.turnQueue[combat.currentIdx];
    combat.actionCache = { actor, target, baseDmg, type, skillObj, stunDur, cost, usedRage, skillLvl };
    let desc = '';

    if (skillObj && skillObj.type === 'mana_drain') {
        desc = `<span style="color:#aaa;">Цель:</span> ${target.name}<br>Крадёт ${baseDmg} МН (при 0 МН наносит Маг. урон).`;
    } else if (skillObj && skillObj.type === 'duel') {
        desc = `<span style="color:#aaa;">Цель:</span> ${target.name}<br>Дуэль 3 хода: оба бьют только с руки. Победа даёт постоянный УРН.`;
    } else if (skillObj && skillObj.jujuArmor) {
        desc = `Снижает БРО всех врагов на <b>−${skillObj.jujuArmor[skillLvl - 1]}</b> (3 х.) и уменьшает КД всех предметов отряда на <b>${skillObj.jujuCd[skillLvl - 1]} х.</b>`;
    } else if (skillObj && skillObj.hexAmp) {
        let ampPct = Math.round(skillObj.hexAmp[skillLvl - 1] * 100);
        let sDur = (skillObj.silence || 1) + (usedRage ? 1 : 0);
        desc = `<span style="color:#aaa;">Цель:</span> ${target.name}<br>🐸 Хекс (🔇 Безмолвие ${sDur} х.): сбивает каст и запрещает скиллы; цель получает <b>+${ampPct}% ВСЕГО урона</b> (${2 + (usedRage ? 1 : 0)} х.).`;
    } else if (skillObj && skillObj.type === 'debuff' && skillObj.xMarkAmp) {
        let ampPct = Math.round(skillObj.xMarkAmp[skillLvl - 1] * 100);
        desc = `<span style="color:#aaa;">Цель:</span> ${target.name}<br>Вешает дебафф (2 х.): +<b>${ampPct}%</b> входящего Маг. урона` +
               (skillObj.weakenTarget ? ` и −${Math.round(skillObj.weakenTarget * 100)}% УРН цели.` : ' и сбивает подготовленный скилл.');
    } else if (skillObj && skillObj.type === 'buff') {
        if (skillObj.teamArmor) desc = `Варкрай: даёт <b>+${skillObj.teamArmor[skillLvl - 1]} БРО</b> всему отряду на 2 хода.`;
        else if (skillObj.selfAtkMult) desc = `Годс Стренс: <b>+${Math.round((skillObj.selfAtkMult[skillLvl - 1] - 1) * 100)}% УРН</b> на 3 хода!`;
        else if (skillObj.shallowGrave) {
            let low = combat.targets.filter(t => !t.isEnemy).sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0];
            desc = `Шэллоу Грейв на <b>${low.name}</b>: 2 хода ЗД не может упасть ниже 1!`;
        } else if (skillObj.wardDmg) desc = `Ставит Незер Вард (3 х.): враги получают <b>${baseDmg} Маг. урон</b> за каждый каст скилла!`;
        else if (skillObj.doppel) desc = `Снимает дебаффы, даёт 60% уклонения (2 х.) и +2 Иллюзии!`;
        else if (skillObj.heavenlyJump) desc = `Защита от ближней атаки (2 х.) + контрудар <b style="color:#c6f;">${baseDmg} Маг. урон</b>.`;
        else desc = `Даёт 50% шанс уклонения от физических атак на 2 хода.`;
    } else if (skillObj && skillObj.cleave) {
        let enemies = combat.targets.filter(t => t.isEnemy);
        desc = `<b style="color:#fa0;">Физ. сплэш по всем врагам:</b><br>` + enemies.map(e => {
            let arm = skillObj.ignoreArmor ? Math.floor(getEffectiveArmor(e) / 2) : getEffectiveArmor(e);
            let d = Math.floor(baseDmg * (1 - getPhysicalReduction(arm)) * getIncomingDmgMult(e, 'phys') * getThroneSealReduction(e));
            return `<div style="margin-left:10px;">→ ${e.name}: <b style="color:#f55;">${d}</b></div>`;
        }).join('');
    } else if (skillObj && skillObj.aoe) {
        let enemies = combat.targets.filter(t => t.isEnemy);
        desc = `<b style="color:#fa0;">AoE Маг. урон (${enemies.length}):</b><br>` + enemies.map(e => {
            let bb = (skillObj.brokenBonus && e.buffs && e.buffs.some(b => b.type === 'broken')) ? (1 + skillObj.brokenBonus) : 1;
            let d = Math.floor(baseDmg * bb * (1 - getMagicReduction(e)) * getIncomingDmgMult(e, 'magic') * getThroneSealReduction(e));
            return `<div style="margin-left:10px;">→ ${e.name}: <b style="color:#f55;">${d}</b></div>`;
        }).join('');
        if (skillObj.rumBuff) desc += `<br><span style="color:#0f8;">🍺 + Корабельный ром отряду (−35% урона, 2 х.)</span>`;
        if (skillObj.teamShieldDmgRed) desc += `<br><span style="color:#fc0;">☀️ + Солнечный щит отряду (−${Math.round(skillObj.teamShieldDmgRed * 100)}% урона, 2 х.)</span>`;
        if (skillObj.teamHealVal) desc += `<br><span style="color:#0f0;">☀️ + Лечение отряда на +${skillObj.teamHealVal[skillLvl - 1]} ЗД</span>`;
        else if (skillObj.solarHeal) desc += `<br><span style="color:#0f0;">☀️ + Лечение отряда на ${skillObj.solarHeal[skillLvl - 1]} ЗД</span>`;
    } else if (skillObj && skillObj.splash) {
        let enemies = combat.targets.filter(t => t.isEnemy);
        desc = `<b style="color:#f80;">Сплэш (${enemies.length}):</b><br>` + enemies.map(e => {
            let mult = (e.id === target.id) ? 1 : skillObj.splash;
            let d = Math.floor(baseDmg * mult * (1 - getMagicReduction(e)) * getIncomingDmgMult(e, 'magic') * getThroneSealReduction(e));
            return `<div style="margin-left:10px;">→ ${e.name}: <b style="color:#f55;">${d}</b>${e.id === target.id ? ' (осн.)' : ''}</div>`;
        }).join('');
    } else if (skillObj && skillObj.targets) {
        let enemies = combat.targets.filter(t => t.isEnemy).sort((a, b) => a.hp - b.hp).slice(0, skillObj.targets);
        desc = `<b style="color:#fa0;">Целей (${enemies.length}):</b><br>` + enemies.map(e => {
            let bb = (skillObj.brokenBonus && e.buffs && e.buffs.some(b => b.type === 'broken')) ? (1 + skillObj.brokenBonus) : 1;
            let d = Math.floor(baseDmg * bb * (1 - getMagicReduction(e)) * getIncomingDmgMult(e, 'magic') * getThroneSealReduction(e));
            return `<div style="margin-left:10px;">→ ${e.name}: <b style="color:#f55;">${d}</b></div>`;
        }).join('');
    } else if (type === 'heal') {
        if (skillObj && skillObj.cleanseAll) {
            let low = combat.targets.filter(t => !t.isEnemy).sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0] || actor;
            desc = `<span style="color:#aaa;">Цель:</span> ${low.name}<br>Снимает ВСЕ дебаффы, лечит на <b>+${baseDmg} ЗД</b> и даёт <b>+30% УРН</b> (2 х.)!`;
        } else if (skillObj && skillObj.teamHeal) {
            desc = `<b style="color:#0f0; font-size:11px;">Лечит ВЕСЬ отряд: +${baseDmg} ЗД</b><br>И наносит ~${Math.floor(baseDmg * 0.7)} Маг. урон врагу.` +
                   (skillObj.graveLowest ? `<br><span style="color:#fc0;">✝️ + Тонкая грань (бессмертие 2 х.) самому раненому союзнику!</span>` : '');
        } else {
            let lowest = combat.targets.filter(t => !t.isEnemy).sort((a, b) => a.hp - b.hp)[0];
            desc = `<span style="color:#aaa;">Цель:</span> ${lowest.name}<br><b style="color:#0f0; font-size:12px;">Лечение: +${baseDmg} ЗД</b>`;
        }
    } else {
        let arm = getEffectiveArmor(target);
        if (skillObj && skillObj.ignoreArmor) arm = Math.floor(arm / 2);
        let red = (type === 'phys') ? getPhysicalReduction(arm) : getMagicReduction(target);
        let effBase = (skillObj && skillObj.guaranteedCrit) ? Math.floor(baseDmg * skillObj.guaranteedCrit[skillLvl - 1]) : baseDmg;
        let bb = (skillObj && skillObj.brokenBonus && target.buffs && target.buffs.some(b => b.type === 'broken')) ? (1 + skillObj.brokenBonus) : 1;
        let isRootCombo = (type === 'phys' && target.buffs && target.buffs.some(b => b.type === 'root'));

        let isHook = (actor.dbId === 'pudge' && skillObj && (skillObj.id === 's1' || skillObj.name === 'Мит Хук' || skillObj.name === 'Фишинг хук'));
        let hasFrontAlive = combat.targets.some(t => t.isEnemy && t.hp > 0 && t.row === 'front');
        let isMeleeBackPenalty = (!actor.isEnemy && actor.isMelee && target.isEnemy && target.row === 'back' && hasFrontAlive && !isHook);
        let backMult = isMeleeBackPenalty ? 0.75 : 1;

        let fd = Math.floor(effBase * bb * (1 - red) * getIncomingDmgMult(target, type) * getThroneSealReduction(target) * (isRootCombo ? 1.25 : 1) * backMult);
        desc = `<span style="color:#aaa;">Цель:</span> ${target.name}<br>
            <span style="color:#aaa;">БРО:</span> ${arm} (${Math.round(getPhysicalReduction(arm) * 100)}%) | <span style="color:#aaa;">МАГ.РЕЗ:</span> ${Math.round(getMagicReduction(target) * 100)}%<br>
            <span style="color:#aaa;">Итоговый срез:</span> ${Math.round(red * 100)}%<br><br>
            <b style="color:#fff; font-size:12px;">Итог: ${fd} урона${skillObj && skillObj.guaranteedCrit ? ' 💥' : ''}</b>`;
        if (isMeleeBackPenalty) desc += `<br><span style="color:#f88;">🛡️ Защищён строем: −25% урона от ближней атаки!</span>`;
        if (isHook) {
            let rLvl = (state.fishing && state.fishing.rodLevel) || 0;
            let rStat = (typeof getRodStats === 'function') ? getRodStats(rLvl) : null;
            let rExp = rStat ? Math.round((rStat.exposedBonus || 0.20) * 100) : 20;
            let rBrk = 2 + ((rStat && rStat.extraShieldBreak) ? rStat.extraShieldBreak : 0);
            desc += `<br><span style="color:#0ef;">🎣 Фишинг хук (${rStat ? rStat.name : 'Удочка'}): вытянет врага в 1-й ряд, лишит прикрытия (+${rExp}% физ.) и сломает −${rBrk} 🛡️!</span>`;
        }
        if (!skillObj && actor.dbId === 'silencer') {
            let pure = Math.round((actor.int || 0) * 0.35);
            desc += `<br><span style="color:#c6f;">🔮 Глефы: +${pure} чистого урона сквозь броню!</span>`;
            if (target.buffs && target.buffs.some(b => b.type === 'silence' || b.type === 'orchid')) {
                desc += `<br><span style="color:#0af;">🔇 Кара замолкшего: снимет −1 🛡️!</span>`;
            }
        }
        if (skillObj && actor.dbId === 'silencer' && skillObj.id === 's1') {
            desc += `<br><span style="color:#0af;">🔇 Сорвёт каст и снимет −2 🛡️, если враг готовит скилл 🔥!</span>`;
        }
        if (isRootCombo) desc += `<br><span style="color:#6cf;">❄️ Хрупкость: +25% физ. урона по оцепенелому врагу!</span>`;
        if (skillObj && skillObj.torrentWeaken) desc += `<br><span style="color:#0cf;">🌊 Ослабляет УРН врага (2 х.)</span>`;
        if (skillObj && skillObj.drainHeal) desc += `<br><span style="color:#0f0;">🟢 Лечит Пугну на 100% урона</span>`;
    }

    if (!skillObj) {
        let mpGain = CONFIG.combat.attackMpGain || 18;
        desc += `<br><span style="color:#0cf;">⚡ Обычная атака восстанавливает +${mpGain} МН</span>`;
    }

    if (skillObj && skillObj.prep && !usedRage) {
        desc += `<br><span style="color:#0ef;">⏳ Подготовка: 1 ход (сработает в начале следующего хода; оглушение или безмолвие сбивают подготовку)</span>`;
    } else if (skillObj && skillObj.prep && usedRage) {
        desc += `<br><span style="color:#fc0;">🔥 ЯРОСТЬ: Мгновенное применение без подготовки!</span>`;
    }
    if (usedRage && skillObj && (skillObj.duration || skillObj.silence || skillObj.rootTurns)) {
        desc += `<br><span style="color:#fc0;">🔥 ЯРОСТЬ: +1 ход к длительности эффекта!</span>`;
    }
    if (skillObj && (skillObj.breakHits >= 2 || skillObj.primaryBreakHits >= 2 || skillObj.breakHitsTarget >= 2)) {
        let aLvl = (actor && (actor.level || (actor.heroData && actor.heroData.level))) || 1;
        let note = (aLvl < 4) ? (usedRage ? 'снимает 2 щита 🛡️ (⚡ Ярость!)' : 'снимает 1 щит 🛡️ (2 🛡️ с 4 ур.)') : (usedRage ? 'снимает 3 щита 🛡️ (⚡ Ярость!)' : 'снимает 2 щита 🛡️');
        desc += `<br><span style="color:#f80;">💥 Пробитие: ${note}${skillObj.brokenBonus ? ' (+25% урона по пробитому)' : ''}</span>`;
    }
    if (skillObj && skillObj.silence && !skillObj.hexAmp) {
        desc += `<br><span style="color:#ff8;">🔇 Безмолвие (${skillObj.silence + (usedRage ? 1 : 0)} х.): сбивает каст и запрещает скиллы поверх щитов</span>`;
    }
    if (skillObj && skillObj.rootTurns) desc += `<br><span style="color:#6cf;">❄️ Оцепенение (${skillObj.rootTurns + (usedRage ? 1 : 0)} х.): запрет атак с руки поверх щитов</span>`;
    document.getElementById('modal-title').innerText = name;
    document.getElementById('modal-desc').innerHTML = fmtStats(desc);
    document.getElementById('modal-overlay').style.display = 'flex';
}
function closeModal() { document.getElementById('modal-overlay').style.display = 'none'; }

/* ===== ВСПОМОГАТЕЛЬНЫЕ ЭФФЕКТЫ БОЯ ===== */
function recordOrchidDmg(unit, dmg) {
    if (!unit || !unit.isEnemy || dmg <= 0 || !unit.buffs) return;
    let orch = unit.buffs.find(b => b.type === 'orchid');
    if (orch) orch.accumDmg = (orch.accumDmg || 0) + dmg;
}

function applyDuelDeathCheck(target) {
    if (target.hp > 0) return;
    let checkDuel = target.buffs && target.buffs.find(b => b.type === 'dueling');
    if (!checkDuel) return;
    let winner = combat.targets.find(t => t.id === checkDuel.targetId);
    if (winner && !winner.isEnemy && winner.dbId === 'lc') {
        let ultLvl = Math.max(1, winner.heroData.skillLevels[3]);
        let bonus = [15, 25, 35][ultLvl - 1] || 15;
        winner.heroData.duelDmg = (winner.heroData.duelDmg || 0) + bonus;
        winner.atk += bonus;
        log(`🏆 Легионка побеждает в дуэли! Навсегда +${bonus} УРН!`);
    }
}

function interruptUnitCast(target, sourceName) {
    if (!target || target.hp <= 0) return false;
    if (target.isEnemy) {
        if (target.lockedTargetId) {
            target.lockedTargetId = null;
            target.nextIntent = { type: 'attack' };
            log(`🐿️ Прицеливание Худвинка прервано! (${sourceName})`);
            renderArena();
            return true;
        }
        if ((target.nextIntent && target.nextIntent.type === 'skill') || target.cataclysmCharging) {
            let oldSk = target.cataclysmCharging ? 'Катаклизм' : target.nextIntent.skill.name;
            target.nextIntent = { type: 'attack' };
            target.cataclysmCharging = false;
            log(`⚡ ${sourceName} сбивает каст «${oldSk}» у ${target.name}!`);
            renderArena();
            return true;
        }
        return false;
    } else if (target.preparing) {
        let prep = target.preparing;
        target.preparing = null;
        let refund = Math.floor((prep.cost || 0) * 0.5);
        if (refund > 0) target.mp = Math.min(target.maxMp, target.mp + refund);
        target.skillCooldowns[prep.skillObj.id] = 1;
        log(`💥 ${sourceName} сбивает подготовку «${prep.skillObj.name}» у ${target.name}! (Возврат ${refund} МН, КД 1 х.)`);
        return true;
    }
    return false;
}

function applySilence(target, turns, sourceName) {
    if (!target || target.hp <= 0 || turns <= 0) return false;
    if (target.buffs && target.buffs.some(b => b.type === 'bkb')) {
        log(`🛡️ ${target.name} блокирует безмолвие (БКБ)!`);
        return false;
    }
    if (target.isChicken) {
        target.buffs = target.buffs.filter(b => b.type !== 'silence');
        target.buffs.push({ type: 'silence', turns });
        interruptUnitCast(target, sourceName);
        target.nextIntent = { type: 'attack' };
        log(`⚡ ${sourceName}: Безмолвие срывает маскировку и побег курицы 🐔! Защита снята — добивайте её!`);
        renderArena();
        return true;
    }
    interruptUnitCast(target, sourceName);
    let existing = (target.buffs || []).find(b => b.type === 'silence');
    if (existing) existing.turns = Math.max(existing.turns, turns);
    else target.buffs.push({ type: 'silence', turns });
    log(`🔇 ${target.name} получает Безмолвие на ${turns} х. (скиллы заблокированы)!`);
    return true;
}

function applyHardStun(target, dur, sourceName) {
    if (!target || target.hp <= 0 || dur <= 0) return false;
    if (target.buffs && target.buffs.some(b => b.type === 'bkb')) {
        log(`🛡️ ${target.name} невосприимчив к оглушению (БКБ)!`);
        return false;
    }
    interruptUnitCast(target, sourceName);
    if (target.buffs && target.buffs.some(b => b.type === 'stun_immune')) {
        log(`⛓️ Иммунитет ${target.name} защищает от оглушения!`);
        return false;
    }
    target.stunTurns = Math.max(target.stunTurns, dur);
    return true;
}

function applyRoot(target, turns, sourceName) {
    if (!target || target.hp <= 0 || turns <= 0) return false;
    if (target.buffs && target.buffs.some(b => b.type === 'bkb')) {
        log(`🛡️ ${target.name} невосприимчив к оцепенению (БКБ)!`);
        return false;
    }
    target.buffs = target.buffs || [];
    let existing = target.buffs.find(b => b.type === 'root');
    if (existing) existing.turns = Math.max(existing.turns, turns);
    else target.buffs.push({ type: 'root', turns });
    log(`❄️ ${sourceName}: ${target.name} скован льдом (❄️ Оцепенение на ${turns} х., запрет атак с руки)!`);
    return true;
}

function finishEnemyTurn(enemy) {
    if (!enemy || !enemy.isEnemy || enemy.hp <= 0 || !enemy.buffs) return;
    let br = enemy.buffs.find(b => b.type === 'broken');
    if (br) {
        br.turns--;
        if (br.turns <= 0) {
            enemy.buffs = enemy.buffs.filter(b => b.type !== 'broken');
            enemy.shield = enemy.shieldMax;
            log(`🛡️ ${enemy.name} восстанавливает щиты (${enemy.shieldMax} 🛡️)!`);
        }
    }
}

function applyBreakCheck(enemy, hits, attacker = null) {
    let cnt = (hits === true) ? 1 : (Number(hits) || 0);
    if (cnt <= 0 || !enemy.isEnemy || enemy.hp <= 0) return;
    if (enemy.buffs && enemy.buffs.some(b => b.type === 'broken')) return;
    enemy.shield = Math.max(0, (enemy.shield || 0) - cnt);
    if (enemy.shield <= 0) {
        interruptUnitCast(enemy, '💥 ПРОБИТИЕ');
        enemy.buffs.push({ type: 'broken', turns: CONFIG.combat.brokenTurns });
        if (attacker && !attacker.isEnemy && attacker.hp > 0) {
            attacker.rage = Math.min(100, (attacker.rage || 0) + 15);
        }
        let hasImm = enemy.buffs && enemy.buffs.some(b => b.type === 'stun_immune');
        if (!hasImm) {
            enemy.stunTurns = Math.max(enemy.stunTurns, 1);
            log(`💥 ПРОБИТИЕ! ${enemy.name} оглушён на 1 ход и получает +20% урона!`);
        } else {
            log(`💥 ПРОБИТИЕ! Щиты ${enemy.name} сломаны (+20% урона), но ⛓️ Иммунитет защитил от оглушения!`);
        }
    }
}

function applyArmorDebuff(target, sourceTag, value, turns) {
    target.buffs = target.buffs.filter(b => !(b.type === 'armor_break' && b.source === sourceTag));
    target.buffs.push({ type: 'armor_break', source: sourceTag, value, turns });
}

function applySpellLifesteal(actor, totalMagicDmg) {
    if (actor.spellLifesteal > 0 && totalMagicDmg > 0) {
        let heal = Math.floor(totalMagicDmg * actor.spellLifesteal);
        if (heal > 0) {
            actor.hp = Math.min(actor.maxHp, actor.hp + heal);
            log(`🩸 Бладстоун: ${actor.name} +${heal} ЗД.`);
        }
    }
}

function applyPhysLifesteal(actor, totalPhysDmg) {
    let ls = (actor.physLifesteal || 0) + getTeamWkLifesteal();
    if (actor.buffs && actor.buffs.some(b => b.type === 'lifesteal')) ls = 1.75;
    if (ls > 0 && totalPhysDmg > 0) {
        let heal = Math.min(Math.floor(totalPhysDmg * ls), Math.floor(actor.maxHp * 0.5));
        if (heal > 0) {
            actor.hp = Math.min(actor.maxHp, actor.hp + heal);
            log(`🎭 Физ. вампиризм: ${actor.name} +${heal} ЗД.`);
        }
    }
}

function applyBladeMailReflect(hero, attacker, dmgTaken) {
    if (dmgTaken <= 0 || !hero.buffs || !hero.buffs.some(b => b.type === 'blade_mail') || attacker.hp <= 0) return;
    let reflected = Math.floor(dmgTaken * 0.70);
    if (reflected > 0) {
        attacker.hp -= reflected;
        log(`🦔 Блейдмейл ${hero.name} возвращает ${reflected} урона → ${attacker.name}!`);
        recordOrchidDmg(attacker, reflected);
        applyDuelDeathCheck(attacker);
    }
}

function applyBristleQuillCounter(enemy, attacker) {
    if (!enemy || !enemy.bristlePassive || enemy.hp <= 0 || (enemy.shield || 0) <= 0) return;
    if (enemy.buffs && enemy.buffs.some(b => b.type === 'broken')) return;
    if (!attacker || attacker.isEnemy || attacker.hp <= 0) return;
    let qDmg = Math.floor(enemy.atk * 0.35 * (1 - getPhysicalReduction(getEffectiveArmor(attacker))));
    if (qDmg > 0) {
        attacker.hp -= qDmg;
        log(`🦔 Колючая спина Бристлбэка отвечает ${attacker.name}: ${qDmg} Физ. урона!`);
        checkHeroSurvival(attacker);
    }
}

function applyThornsReflect(target, attacker, dmgDealt) {
    if (dmgDealt <= 0 || !target || !target.isEnemy || !target.buffs || !attacker || attacker.isEnemy || attacker.hp <= 0) return;
    if (target.buffs.some(b => b.type === 'thorns')) {
        let ref = Math.floor(dmgDealt * 0.50);
        if (ref > 0) {
            attacker.hp -= ref;
            log(`🦔 Шипы ${target.name} возвращают ${ref} урона → ${attacker.name}!`);
            checkHeroSurvival(attacker);
        }
    }
}

function addPlIllusions(actor, amount) {
    if (actor.dbId !== 'pl') return;
    let ultLvl = actor.heroData.skillLevels[3];
    let maxIll = ultLvl > 0 ? actor.skills[3].maxIllusions[ultLvl - 1] : 3;
    actor.illusions = Math.min(maxIll, (actor.illusions || 0) + amount);
}

/* ===== ПРИМЕНЕНИЕ ДЕЙСТВИЯ ГЕРОЯ ===== */
function confirmAction() {
    closeModal();
    let act = combat.actionCache;
    if (!act) return;
    let { actor, target, baseDmg, type, skillObj, stunDur, cost, usedRage, skillLvl } = act;

    // Если у скилла есть Подготовка (1 х.) и герой НЕ под Яростью — встаём в подготовку
    if (skillObj && skillObj.prep > 0 && !usedRage) {
        if (cost > 0) actor.mp -= cost;
        actor.rage = Math.min(100, (actor.rage || 0) + 15);
        if (skillObj.selfArmor) {
            actor.buffs = actor.buffs.filter(b => b.type !== 'armor_up');
            actor.buffs.push({ type: 'armor_up', value: skillObj.selfArmor, turns: 2 });
            log(`❄️ ${actor.name} получает +${skillObj.selfArmor} БРО на время подготовки!`);
        }
        actor.preparing = {
            actor, targetId: target ? target.id : null,
            baseDmg, type, skillObj, stunDur, cost, usedRage: false, skillLvl, isPrepRelease: true
        };
        document.getElementById('btn-attack').disabled = true;
        document.getElementById('btn-skills').disabled = true;
        if (document.getElementById('btn-defend')) document.getElementById('btn-defend').disabled = true;
        document.getElementById('btn-items').disabled = true;
        document.getElementById('skills-submenu').style.display = 'none';
        log(`⏳ ${actor.name} начинает подготовку «${skillObj.name}» (сработает в след. ход)!`);
        combat.currentIdx++;
        nextTurn();
        return;
    }

    executeHeroAction(act);
}

function executeHeroAction(act) {
    let { actor, target, baseDmg, type, skillObj, stunDur, cost, usedRage, skillLvl, isPrepRelease } = act;

    if (!isPrepRelease && cost > 0) actor.mp -= cost;
    if (skillObj && skillObj.cd) actor.skillCooldowns[skillObj.id] = skillObj.cd;
    if (skillObj && skillObj.selfHpCostPct) {
        let hpCost = Math.floor(actor.maxHp * skillObj.selfHpCostPct);
        actor.hp = Math.max(1, actor.hp - hpCost);
        log(`🩸 ${actor.name} расходует ${hpCost} ЗД на «${skillObj.name}»!`);
    }

    let durBonus = usedRage ? 1 : 0;
    if (usedRage) {
        actor.rage = 0;
        log(`🔥 ЯРОСТЬ ДРЕВНИХ! ${actor.name} усиливает способность!`);
    } else if (!actor.isEnemy && !isPrepRelease) {
        actor.rage = Math.min(100, (actor.rage || 0) + (skillObj ? 15 : 10));
    }

    if (!skillObj && !isPrepRelease) {
        let mpGain = CONFIG.combat.attackMpGain || 18;
        actor.mp = Math.min(actor.maxMp, actor.mp + mpGain);
        log(`⚡ Удар восстанавливает +${mpGain} МН!`);
    }

    document.getElementById('btn-attack').disabled = true;
    document.getElementById('btn-skills').disabled = true;
    if (document.getElementById('btn-defend')) document.getElementById('btn-defend').disabled = true;
    document.getElementById('btn-items').disabled = true;
    document.getElementById('skills-submenu').style.display = 'none';

    let equipped = getHeroEquippedItems(actor);

    playAnim(actor.id, actor.isEnemy ? 'attacking-left' : 'attacking-right', () => {
        if (actor.dbId === 'lina' && skillObj && actor.heroData.skillLevels[2] > 0) {
            actor.buffs.push({ type: 'atk', value: 1.5, turns: 2 + durBonus });
            log(`🔥 Лина активирует Файери Соул (+50% УРН на ${2 + durBonus} х.).`);
        }

        // Баффы и особые скиллы
        if (skillObj && skillObj.teamArmor) {
            let val = skillObj.teamArmor[skillLvl - 1];
            let dur = 2 + durBonus;
            combat.targets.filter(t => !t.isEnemy && t.hp > 0).forEach(ally => {
                ally.buffs = ally.buffs.filter(b => b.type !== 'armor_up');
                ally.buffs.push({ type: 'armor_up', value: val, turns: dur });
            });
            log(`⚔️ Свен кричит Варкрай: +${val} БРО всему отряду (${dur} х.)!`);
            combat.currentIdx++; nextTurn(); return;
        }

        if (skillObj && skillObj.selfAtkMult) {
            let mult = skillObj.selfAtkMult[skillLvl - 1];
            let dur = 3 + durBonus;
            actor.buffs = actor.buffs.filter(b => b.type !== 'atk');
            actor.buffs.push({ type: 'atk', value: mult, turns: dur });
            log(`🔥 Свен включает ГОДС СТРЕНС (+${Math.round((mult - 1) * 100)}% УРН на ${dur} х.)!`);
            combat.currentIdx++; nextTurn(); return;
        }

        if (skillObj && skillObj.shallowGrave) {
            let low = combat.targets.filter(t => !t.isEnemy && t.hp > 0).sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0];
            if (low) {
                let dur = 2 + durBonus;
                low.buffs = low.buffs.filter(b => b.type !== 'shallow_grave');
                low.buffs.push({ type: 'shallow_grave', turns: dur });
                log(`✝️ Даззл вешает Шэллоу Грейв на ${low.name} (бессмертие на ${dur} х.)!`);
            }
            combat.currentIdx++; nextTurn(); return;
        }

        if (skillObj && skillObj.jujuArmor) {
            let armLoss = skillObj.jujuArmor[skillLvl - 1];
            let cdRed = skillObj.jujuCd[skillLvl - 1];
            let dur = 3 + durBonus;
            combat.targets.filter(t => t.isEnemy && t.hp > 0).forEach(e => applyArmorDebuff(e, 'juju', armLoss, dur));
            combat.targets.filter(t => !t.isEnemy && t.hp > 0).forEach(ally => {
                Object.keys(ally.itemCooldowns || {}).forEach(k => {
                    ally.itemCooldowns[k] = Math.max(0, ally.itemCooldowns[k] - cdRed);
                });
            });
            log(`🔮 Бэд Джуджу! Врагам −${armLoss} БРО (${dur} х.), КД предметов отряда −${cdRed} х.!`);
            combat.currentIdx++; nextTurn(); return;
        }

        if (skillObj && skillObj.wardDmg) {
            let dur = 3 + durBonus;
            actor.buffs = actor.buffs.filter(b => b.type !== 'nether_ward');
            actor.buffs.push({ type: 'nether_ward', dmg: baseDmg, turns: dur });
            log(`🟢 Пугна ставит Незер Вард (${baseDmg} Маг. урона за каст врага, ${dur} х.)!`);
            combat.currentIdx++; nextTurn(); return;
        }

        if (skillObj && skillObj.doppel) {
            let dur = 2 + durBonus;
            actor.buffs = actor.buffs.filter(b => !['armor_break', 'weaken'].includes(b.type));
            actor.buffs.push({ type: 'doppel_evade', turns: dur });
            addPlIllusions(actor, 2);
            log(`🔱 Доппельгангер! ${actor.name} сбрасывает дебаффы, 60% уклонения (${dur} х.) и +2 Иллюзии!`);
            combat.currentIdx++; nextTurn(); return;
        }

        if (skillObj && skillObj.heavenlyJump) {
            let dur = 2 + durBonus;
            actor.buffs.push({ type: 'heavenlyJump', turns: dur, dmg: baseDmg });
            log(`⚡ ${actor.name} использует Хивенли Джамп (${dur} х.).`);
            combat.currentIdx++; nextTurn(); return;
        }

        if (skillObj && skillObj.type === 'buff' && skillObj.id === 's3' && actor.dbId === 'pa') {
            let dur = 2 + durBonus;
            actor.buffs.push({ type: 'blur', turns: dur });
            log(`🌫️ ${actor.name} активирует Блюр (50% уклонение, ${dur} х.)!`);
            combat.currentIdx++; nextTurn(); return;
        }

        // Хекс Лиона (Безмолвие 1 х. + уязвимость +25..40% ко ВСЕМУ урону 2 х.)
        if (skillObj && skillObj.hexAmp) {
            let amp = skillObj.hexAmp[(skillLvl || 1) - 1];
            let dur = 2 + durBonus;
            let silDur = (skillObj.silence || 1) + durBonus;
            target.buffs = target.buffs.filter(b => b.type !== 'hex_vuln');
            target.buffs.push({ type: 'hex_vuln', amp, turns: dur });
            applySilence(target, silDur, '🐸 Хекс');
            log(`🐸 ${actor.name} превращает ${target.name} в лягушку: +${Math.round(amp * 100)}% всего урона (${dur} х.)!`);
            combat.currentIdx++; nextTurn(); return;
        }

        if (skillObj && skillObj.type === 'debuff' && skillObj.xMarkAmp) {
            let amp = skillObj.xMarkAmp[(skillLvl || 1) - 1];
            let dur = 2 + durBonus;
            target.buffs = target.buffs.filter(b => b.type !== 'x_mark');
            target.buffs.push({ type: 'x_mark', amp, turns: dur });
            if (skillObj.weakenTarget) {
                target.buffs = target.buffs.filter(b => b.type !== 'weaken');
                target.buffs.push({ type: 'weaken', reduce: skillObj.weakenTarget, turns: dur });
                log(`🟢 Декрепифай на ${target.name}: +${Math.round(amp * 100)}% маг. урона и −${Math.round(skillObj.weakenTarget * 100)}% УРН (${dur} х.)!`);
            } else {
                if (skillObj.silence) applySilence(target, skillObj.silence + durBonus, '❌ Метка X');
                log(`❌ ${actor.name} вешает Метку X на ${target.name} (+${Math.round(amp * 100)}% маг. урона, ${dur} х.)!`);
            }
            combat.currentIdx++; nextTurn(); return;
        }

        if (skillObj && skillObj.type === 'duel') {
            let dur = 3 + durBonus;
            actor.buffs.push({ type: 'dueling', turns: dur, targetId: target.id });
            target.buffs.push({ type: 'dueling', turns: dur, targetId: actor.id });
            interruptUnitCast(target, '⚔️ Дуэль');
            log(`⚔️ ДУЭЛЬ! ${actor.name} и ${target.name} сражаются ${dur} х.!`);
            combat.currentIdx++; nextTurn(); return;
        }

        if (skillObj && skillObj.type === 'mana_drain') {
            let stolen = Math.min(target.mp, baseDmg);
            if (stolen > 0) {
                target.mp -= stolen;
                actor.mp = Math.min(actor.maxMp, actor.mp + stolen);
                log(`💧 ${actor.name} крадёт ${stolen} МН у ${target.name}.`);
            } else {
                let d = Math.floor(baseDmg * (1 - getMagicReduction(target)) * getIncomingDmgMult(target, 'magic') * getThroneSealReduction(target));
                target.hp -= d;
                recordOrchidDmg(target, d);
                log(`💧 У ${target.name} нет МН — Мана Дрейн наносит ${d} Маг. урона!`);
                applyBreakCheck(target, 1, actor);
                applySpellLifesteal(actor, d);
                applyDuelDeathCheck(target);
            }
            combat.currentIdx++; nextTurn(); return;
        }

        if (skillObj && skillObj.cleave) {
            let isCleaveCrit = (actor.itemCritChance > 0 && Math.random() < actor.itemCritChance);
            let lumiProc = false;
            if (actor.dbId === 'dawnbreaker' && actor.heroData.skillLevels[2] > 0) {
                actor.lumiCount = (actor.lumiCount || 0) + 1;
                if (actor.lumiCount >= 3) { actor.lumiCount = 0; lumiProc = true; isCleaveCrit = true; }
            }
            let mult = lumiProc ? 1.8 : (isCleaveCrit ? actor.itemCritMult : 1);
            let cleaveBase = Math.floor(baseDmg * mult);
            let totalPhys = 0;
            let primaryEnemy = getHeroTargetEnemy();
            combat.targets.filter(t => t.isEnemy && t.hp > 0).forEach(e => {
                if (e.isChicken) {
                    let isSilenced = e.buffs && e.buffs.some(b => b.type === 'silence' || b.type === 'orchid');
                    if (!isSilenced) {
                        log('🐔 Курица уворачивается от сплэша! Наложите 🔇 Безмолвие!');
                        return;
                    }
                }
                if (equipped.includes('desolator')) applyArmorDebuff(e, 'deso', 6, 2);
                else if (equipped.includes('blight')) applyArmorDebuff(e, 'blight', 2, 2);
                let arm = skillObj.ignoreArmor ? Math.floor(getEffectiveArmor(e) / 2) : getEffectiveArmor(e);
                let d = Math.floor(cleaveBase * (1 - getPhysicalReduction(arm)) * getIncomingDmgMult(e, 'phys') * getThroneSealReduction(e));
                if (e.buffs && e.buffs.some(b => b.type === 'root')) {
                    d = Math.floor(d * 1.25);
                    log(`❄️ Хрупкость +25% урона по ${e.name}!`);
                }
                e.hp -= d;
                recordOrchidDmg(e, d);
                totalPhys += d;
                log(`${actor.icon} ${skillObj.name} → ${e.name}: ${d}${isCleaveCrit ? ' 💥 КРИТ!' : ''}`);
                let extraBreak = 0;
                if (e.buffs) {
                    if (e.buffs.some(b => b.type === 'burn_dot' || b.type === 'burn')) {
                        extraBreak++;
                        log(`🔥 Прогар щита: −1 🛡️ у ${e.name}!`);
                    } else if (e.buffs.some(b => b.type === 'poison_dot')) {
                        extraBreak++;
                        log(`🧪 Разъедание щита: −1 🛡️ у ${e.name}!`);
                    }
                }
                let bHits = 0;
                if (primaryEnemy && e.id === primaryEnemy.id) {
                    bHits = getHeroSkillBreakHits(actor, skillObj, usedRage);
                }
                if (isCleaveCrit) bHits = Math.max(bHits, 1 + (usedRage ? 1 : 0));
                if (bHits + extraBreak > 0) applyBreakCheck(e, bHits + extraBreak, actor);
                if (stunDur > 0 && primaryEnemy && e.id === primaryEnemy.id && e.hp > 0) {
                    applyHardStun(e, stunDur, skillObj.name);
                }
                applyBristleQuillCounter(e, actor);
                applyThornsReflect(e, actor, d);
                applyDuelDeathCheck(e);
                checkEnemyLethal(e);
                checkTravelerTransform(e);
            });
            applyPhysLifesteal(actor, totalPhys);
            if (lumiProc && totalPhys > 0) {
                let healPct = actor.skills[2].lumiHeal[actor.heroData.skillLevels[2] - 1] || 0.3;
                let th = Math.floor(totalPhys * healPct * 0.5);
                combat.targets.filter(t => !t.isEnemy && t.hp > 0).forEach(a => { a.hp = Math.min(a.maxHp, a.hp + th); });
                log(`☀️ Люминосити лечит весь отряд на +${th} ЗД!`);
            }
        } else if (skillObj && skillObj.aoe) {
            let totalMagic = 0;
            combat.targets.filter(t => t.isEnemy && t.hp > 0).forEach(e => {
                if (e.buffs && e.buffs.some(b => b.type === 'bkb')) { log(`${e.name} блокирует магию (БКБ)!`); return; }
                if (skillObj.silence) applySilence(e, skillObj.silence + durBonus, skillObj.name);
                if (actor.dbId === 'silencer' && skillObj.id === 's4') {
                    if (e.preparing || e.cataclysmCharging) {
                        e.preparing = null;
                        e.cataclysmCharging = false;
                        applyBreakCheck(e, 1, actor);
                        log(`🔇 Глобальное безмолвие срывает подготовку ${e.name} (−1 🛡️)!`);
                    }
                }
                if (e.isChicken) {
                    let isSilenced = e.buffs && e.buffs.some(b => b.type === 'silence' || b.type === 'orchid');
                    if (!isSilenced && !skillObj.silence) {
                        log('🐔 Курица уворачивается от AoE магии! Наложите 🔇 Безмолвие!');
                        return;
                    }
                }
                let wasBroken = e.buffs && e.buffs.some(b => b.type === 'broken');
                let bb = (skillObj.brokenBonus && wasBroken) ? (1 + skillObj.brokenBonus) : 1;
                let d = Math.floor(baseDmg * bb * (1 - getMagicReduction(e)) * getIncomingDmgMult(e, 'magic') * getThroneSealReduction(e));
                e.hp -= d;
                recordOrchidDmg(e, d);
                totalMagic += d;
                log(`${actor.name} → ${e.name}: ${d} (AoE${bb > 1 ? ', +25% по пробитому' : ''})`);
                let extraBreak = 0;
                if (e.buffs) {
                    if (e.buffs.some(b => b.type === 'burn_dot' || b.type === 'burn')) {
                        extraBreak++;
                        log(`🔥 Прогар щита: −1 🛡️ у ${e.name}!`);
                    } else if (e.buffs.some(b => b.type === 'poison_dot')) {
                        extraBreak++;
                        log(`🧪 Разъедание щита: −1 🛡️ у ${e.name}!`);
                    }
                }
                let aoeBreak = getHeroSkillBreakHits(actor, skillObj, usedRage);
                if (!aoeBreak) aoeBreak = (skillObj.breakHits || 1) + (usedRage ? 1 : 0);
                applyBreakCheck(e, aoeBreak + extraBreak, actor);
                applyThornsReflect(e, actor, d);
                if (skillObj.weaken && e.hp > 0) {
                    e.buffs = e.buffs.filter(b => b.type !== 'weaken');
                    e.buffs.push({ type: 'weaken', reduce: skillObj.weaken, turns: 2 + durBonus });
                }
                if (stunDur > 0 && e.hp > 0) applyHardStun(e, stunDur, skillObj.name);
                applyDuelDeathCheck(e);
                checkEnemyLethal(e);
                checkTravelerTransform(e);
            });
            applySpellLifesteal(actor, totalMagic);
            if (skillObj.selfArmor && !isPrepRelease) {
                actor.buffs.push({ type: 'armor_up', value: skillObj.selfArmor, turns: 2 + durBonus });
                log(`❄️ Мейден получает +${skillObj.selfArmor} БРО (${2 + durBonus} х.)!`);
            }
            if (skillObj.rumBuff) {
                let rDur = 2 + durBonus;
                combat.targets.filter(t => !t.isEnemy && t.hp > 0).forEach(ally => {
                    ally.buffs = ally.buffs.filter(b => b.type !== 'rum');
                    ally.buffs.push({ type: 'rum', reduce: 0.35, turns: rDur });
                });
                log(`🍺 Корабельный ром! Отряд получает −35% урона на ${rDur} х.!`);
            }
            if (skillObj.teamShieldDmgRed) {
                let sDur = 2 + durBonus;
                combat.targets.filter(t => !t.isEnemy && t.hp > 0).forEach(ally => {
                    ally.buffs = (ally.buffs || []).filter(b => b.type !== 'solar_shield');
                    ally.buffs.push({ type: 'solar_shield', reduce: skillObj.teamShieldDmgRed, turns: sDur });
                });
                log(`☀️ Солнечный страж: отряд укрыт щитом (−${Math.round(skillObj.teamShieldDmgRed * 100)}% входящего урона на ${sDur} х.)!`);
            }
            if (skillObj.teamHealVal) {
                let sh = Math.floor(skillObj.teamHealVal[skillLvl - 1] * (usedRage ? 1.5 : 1));
                combat.targets.filter(t => !t.isEnemy && t.hp > 0).forEach(ally => {
                    ally.hp = Math.min(ally.maxHp, ally.hp + sh);
                });
                log(`☀️ Солнечный страж лечит ВЕСЬ отряд на +${sh} ЗД!`);
            } else if (skillObj.solarHeal) {
                let sh = Math.floor(skillObj.solarHeal[skillLvl - 1] * (usedRage ? 1.5 : 1));
                combat.targets.filter(t => !t.isEnemy && t.hp > 0).forEach(ally => {
                    ally.hp = Math.min(ally.maxHp, ally.hp + sh);
                });
                log(`☀️ Солар Гардиан лечит ВЕСЬ отряд на +${sh} ЗД!`);
            }
        } else if (skillObj && skillObj.splash) {
            let totalMagic = 0;
            combat.targets.filter(t => t.isEnemy && t.hp > 0).forEach(e => {
                let mult = (e.id === target.id) ? 1 : skillObj.splash;
                let d = Math.floor(baseDmg * mult * (1 - getMagicReduction(e)) * getIncomingDmgMult(e, 'magic') * getThroneSealReduction(e));
                e.hp -= d;
                recordOrchidDmg(e, d);
                totalMagic += d;
                log(`${actor.name} → ${e.name}: ${d}${e.id === target.id ? ' (осн.)' : ' (сплэш)'}`);
                let extraBreak = 0;
                if (e.buffs) {
                    if (e.buffs.some(b => b.type === 'burn_dot' || b.type === 'burn')) {
                        extraBreak++;
                        log(`🔥 Прогар щита: −1 🛡️ у ${e.name}!`);
                    } else if (e.buffs.some(b => b.type === 'poison_dot')) {
                        extraBreak++;
                        log(`🧪 Разъедание щита: −1 🛡️ у ${e.name}!`);
                    }
                }
                if (e.id === target.id) applyBreakCheck(e, 1 + extraBreak, actor);
                applyThornsReflect(e, actor, d);
                applyDuelDeathCheck(e);
                checkEnemyLethal(e);
                checkTravelerTransform(e);
            });
            applySpellLifesteal(actor, totalMagic);
        } else if (skillObj && skillObj.targets) {
            let totalMagic = 0;
            let enemies = combat.targets.filter(t => t.isEnemy && t.hp > 0).sort((a, b) => a.hp - b.hp).slice(0, skillObj.targets);
            enemies.forEach(e => {
                let d = Math.floor(baseDmg * (1 - getMagicReduction(e)) * getIncomingDmgMult(e, 'magic') * getThroneSealReduction(e));
                e.hp -= d;
                recordOrchidDmg(e, d);
                totalMagic += d;
                log(`${actor.name} → ${e.name}: ${d}`);
                let extraBreak = 0;
                if (e.buffs) {
                    if (e.buffs.some(b => b.type === 'burn_dot' || b.type === 'burn')) {
                        extraBreak++;
                        log(`🔥 Прогар щита: −1 🛡️ у ${e.name}!`);
                    } else if (e.buffs.some(b => b.type === 'poison_dot')) {
                        extraBreak++;
                        log(`🧪 Разъедание щита: −1 🛡️ у ${e.name}!`);
                    }
                }
                applyBreakCheck(e, 1 + extraBreak, actor);
                applyThornsReflect(e, actor, d);
                if (skillObj.armorDebuff) {
                    applyArmorDebuff(e, 'poison_touch', skillObj.armorDebuff[skillLvl - 1], 2 + durBonus);
                }
                applyDuelDeathCheck(e);
                checkEnemyLethal(e);
                checkTravelerTransform(e);
            });
            applySpellLifesteal(actor, totalMagic);
            if (actor.dbId === 'lc') {
                actor.buffs.push({ type: 'atk', value: 1.3, turns: 2 + durBonus });
                log(`🛡️ Легионка получает +30% к УРН на ${2 + durBonus} х.`);
            }
        } else if (type === 'heal') {
            if (skillObj && skillObj.cleanseAll) {
                let lowest = combat.targets.filter(t => !t.isEnemy && t.hp > 0).sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0] || actor;
                lowest.hp = Math.min(lowest.maxHp, lowest.hp + baseDmg);
                lowest.buffs = (lowest.buffs || []).filter(b => !['armor_break', 'weaken', 'burn_dot', 'burn', 'poison_dot', 'root', 'silence', 'hex_vuln', 'decrepify', 'x_mark'].includes(b.type));
                lowest.stunTurns = 0;
                let bDur = 2 + durBonus;
                lowest.buffs = lowest.buffs.filter(b => b.type !== 'atk');
                lowest.buffs.push({ type: 'atk', value: 1 + (skillObj.buffAtkPct || 0.30), turns: bDur });
                log(`🛡️ ${actor.name} применяет ${skillObj.name} на ${lowest.name}: сняты ВСЕ дебаффы, +${baseDmg} ЗД и +30% УРН (${bDur} х.)!`);
            } else if (skillObj && skillObj.teamHeal) {
                combat.targets.filter(t => !t.isEnemy && t.hp > 0).forEach(ally => {
                    ally.hp = Math.min(ally.maxHp, ally.hp + baseDmg);
                });
                log(`🔮 Волна теней лечит весь отряд на +${baseDmg} ЗД!`);
                let e = getHeroTargetEnemy();
                if (e) {
                    let wd = Math.floor(baseDmg * 0.7 * (1 - getMagicReduction(e)) * getIncomingDmgMult(e, 'magic') * getThroneSealReduction(e));
                    e.hp -= wd;
                    recordOrchidDmg(e, wd);
                    log(`🔮 Волна теней задевает ${e.name}: ${wd} Маг. урона!`);
                    applyBreakCheck(e, 1, actor);
                }
                if (skillObj.graveLowest) {
                    let lowest = combat.targets.filter(t => !t.isEnemy && t.hp > 0).sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0];
                    if (lowest) {
                        let gDur = 2 + durBonus;
                        lowest.buffs = (lowest.buffs || []).filter(b => b.type !== 'shallow_grave');
                        lowest.buffs.push({ type: 'shallow_grave', turns: gDur });
                        log(`✝️ Тонкая грань: ${lowest.name} получает бессмертие на ${gDur} х.!`);
                    }
                }
            } else {
                let lowest = combat.targets.filter(t => !t.isEnemy && t.hp > 0).sort((a, b) => a.hp - b.hp)[0];
                if (lowest) {
                    lowest.hp = Math.min(lowest.maxHp, lowest.hp + baseDmg);
                    log(`💚 ${actor.name} лечит ${lowest.name} на +${baseDmg} ЗД.`);
                }
            }
        } else if (type === 'phys' || type === 'magic') {
            if (target && target.isChicken) {
                let isSilenced = target.buffs && target.buffs.some(b => b.type === 'silence' || b.type === 'orchid');
                let hasSilence = skillObj && (skillObj.silence || skillObj.hexAmp);
                if (!isSilenced && !hasSilence) {
                    log('🐔 Курица кудахчет и уворачивается от обычного урона! Наложите 🔇 Безмолвие, чтобы сделать её уязвимой!');
                    combat.currentIdx++; nextTurn(); return;
                }
            }
            if (type === 'phys' && !skillObj && target.treeEvade && target.stunTurns <= 0 && Math.random() < 0.5) {
                log(`🌲 ${target.name} ловко уклоняется в ветвях от обычного удара!`);
                combat.currentIdx++; nextTurn(); return;
            }

            let isCrit = false;
            let lumiProc = false;

            if (skillObj && skillObj.brokenOrRootedCrit) {
                let isVuln = (target.shield <= 0) || (target.buffs && target.buffs.some(b => b.type === 'broken' || b.type === 'root'));
                let mult = isVuln ? skillObj.brokenOrRootedCrit : skillObj.baseCrit;
                isCrit = true;
                baseDmg = Math.floor(baseDmg * mult);
            } else if (skillObj && skillObj.guaranteedCrit) {
                isCrit = true;
                baseDmg = Math.floor(baseDmg * skillObj.guaranteedCrit[skillLvl - 1]);
            } else if (type === 'phys' && (!skillObj || (skillObj.id === 's1' && actor.dbId === 'pa'))) {
                if (actor.dbId === 'dawnbreaker' && actor.heroData.skillLevels[2] > 0) {
                    actor.lumiCount = (actor.lumiCount || 0) + 1;
                    if (actor.lumiCount >= 3) { actor.lumiCount = 0; lumiProc = true; isCrit = true; baseDmg = Math.floor(baseDmg * 1.8); }
                }
                if (!isCrit && actor.dbId === 'pa' && actor.heroData.skillLevels[3] > 0) {
                    let ult = actor.skills[3];
                    if (Math.random() < ult.critChance) {
                        isCrit = true;
                        baseDmg = Math.floor(baseDmg * ult.critMult[actor.heroData.skillLevels[3] - 1]);
                    }
                }
                if (!isCrit && actor.itemCritChance > 0 && Math.random() < actor.itemCritChance) {
                    isCrit = true;
                    baseDmg = Math.floor(baseDmg * actor.itemCritMult);
                }
            }

            if (type === 'phys' && !actor.isEnemy) {
                if (equipped.includes('desolator')) applyArmorDebuff(target, 'deso', 6, 2);
                else if (equipped.includes('blight')) applyArmorDebuff(target, 'blight', 2, 2);
            }

            let arm = getEffectiveArmor(target);
            if (skillObj && skillObj.ignoreArmor) arm = Math.floor(arm / 2);

            let wasBroken = target.buffs && target.buffs.some(b => b.type === 'broken');
            let bb = (skillObj && skillObj.brokenBonus && wasBroken) ? (1 + skillObj.brokenBonus) : 1;
            let red = (type === 'phys') ? getPhysicalReduction(arm) : getMagicReduction(target);

            let isHook = (actor.dbId === 'pudge' && skillObj && (skillObj.id === 's1' || skillObj.name === 'Мит Хук' || skillObj.name === 'Фишинг хук'));
            let rLvl = (state.fishing && state.fishing.rodLevel) || 0;
            let rStat = (isHook && typeof getRodStats === 'function') ? getRodStats(rLvl) : null;
            if (isHook && rStat && rStat.dmgBonus) {
                baseDmg = Math.floor(baseDmg * (1 + rStat.dmgBonus));
            }
            let hasFrontAlive = combat.targets.some(t => t.isEnemy && t.hp > 0 && t.row === 'front');
            let isMeleeBackPenalty = (!actor.isEnemy && actor.isMelee && target.isEnemy && target.row === 'back' && hasFrontAlive && !isHook);
            let backMult = isMeleeBackPenalty ? 0.75 : 1;

            let d = Math.floor(baseDmg * bb * (1 - red) * getIncomingDmgMult(target, type) * getThroneSealReduction(target) * backMult);
            if (type === 'phys' && target.buffs && target.buffs.some(b => b.type === 'root')) {
                d = Math.floor(d * 1.25);
                log(`❄️ Хрупкость +25% урона по ${target.name}!`);
            }

            if (type === 'magic' && target.buffs && target.buffs.some(b => b.type === 'bkb')) {
                d = 0;
                log(`${target.name} блокирует магию (БКБ)!`);
            }

            if (isHook && target.isEnemy) {
                let targetWasFront = (target.row === 'front');
                if (target.row === 'back') target.row = 'front';
                target.buffs = target.buffs || [];
                let expBonus = rStat ? (rStat.exposedBonus || 0.20) : 0.20;
                target.buffs = target.buffs.filter(b => b.type !== 'uncovered');
                target.buffs.push({ type: 'uncovered', turns: 2, bonus: expBonus });

                let hookBreaks = (getHeroSkillBreakHits(actor, skillObj, usedRage) || 2) + ((rStat && rStat.extraShieldBreak) ? rStat.extraShieldBreak : 0);
                applyBreakCheck(target, hookBreaks, actor);
                log(`🎣 Бобёр-удильщик подсекает ${target.name} «Фишинг хуком» и вытягивает в 1-й ряд (−${hookBreaks} 🛡️)!`);

                if (rStat) {
                    if (rStat.interruptCast) {
                        interruptUnitCast(target, '🎣 Фишинг хук');
                    }
                    if (rStat.rageGain) {
                        actor.rage = Math.min(100, (actor.rage || 0) + rStat.rageGain);
                        log(`⚡ «${rStat.name}»: +${rStat.rageGain} Ярости Бобру-удильщику!`);
                    }
                    if (rStat.frontRowRoot && targetWasFront) {
                        applyRoot(target, 2, '🎣 Тяжёлая катушка');
                    }
                    if (rStat.drPct) {
                        actor.buffs = actor.buffs.filter(b => b.type !== 'rod_dr');
                        actor.buffs.push({ type: 'rod_dr', value: rStat.drPct, turns: 1 });
                        log(`🛡️ «Упор на леску»: Бобёр-удильщик снижает входящий урон на −${Math.round(rStat.drPct * 100)}% на 1 ход!`);
                    }
                    if (rStat.bleedTurns) {
                        let bDmg = Math.max(10, Math.floor(actor.atk * 0.45));
                        target.buffs = target.buffs.filter(b => b.type !== 'bleed');
                        target.buffs.push({ type: 'bleed', turns: rStat.bleedTurns, dmg: bDmg });
                        log(`🩸 «Тройной крючок»: ${target.name} получает кровотечение (${bDmg} урона/ход, ${rStat.bleedTurns} х.)!`);
                    }
                }
            }

            target.hp -= d;
            recordOrchidDmg(target, d);
            let rowNote = isMeleeBackPenalty ? ' (защищён строем -25%)' : '';
            log(`${actor.name} → ${target.name}${rowNote}: ${d}${isCrit ? ' 💥 КРИТ!' : ''}`);
            checkEnemyLethal(target);
            checkTravelerTransform(target);

            if (isHook && rStat && target.hp > 0) {
                if (rStat.brokenMaxHpPct && target.buffs && target.buffs.some(b => b.type === 'broken')) {
                    let extraPure = Math.floor(rStat.brokenMaxHpPct * actor.maxHp);
                    target.hp -= extraPure;
                    recordOrchidDmg(target, extraPure);
                    log(`🎣 Пробитие! Дополнительно +${extraPure} чистого урона по пробитой цели!`);
                    checkEnemyLethal(target);
                }
                if (rStat.executeNormal && target.hp > 0 && !target.isChicken && !target.isInvulnerable) {
                    let execThresh = target.isBoss ? (rStat.executeBoss || 0.10) : (rStat.executeNormal || 0.15);
                    if ((target.hp / target.maxHp) <= execThresh) {
                        target.hp = 0;
                        log(`☠️ «Катушка-лебёдка»: Бобёр-удильщик затягивает и добивает ${target.name} (ЗД < ${Math.round(execThresh * 100)}%)!`);
                        checkEnemyLethal(target);
                    }
                }
            }

            if (skillObj && skillObj.detonateBurn && target.buffs) {
                let bBuff = target.buffs.find(b => b.type === 'burn_dot' || b.type === 'burn');
                if (bBuff) {
                    let bDmgRate = bBuff.dmg || 50;
                    let burst = Math.floor(bDmgRate * (bBuff.turns || 1) * 1.5);
                    target.hp -= burst;
                    recordOrchidDmg(target, burst);
                    target.buffs = target.buffs.filter(b => b.type !== 'burn_dot' && b.type !== 'burn');
                    log(`💥 Детонация горения! Клинок Лагуны взрывает огонь на ${target.name}: +${burst} чистого урона!`);
                    checkEnemyLethal(target);
                }
            }

            if (actor.dbId === 'lion' && skillObj && skillObj.id === 's1') {
                actor.mp = Math.min(actor.maxMp, actor.mp + 22);
                log(`🧙‍♂️ Лион восстанавливает +22 МН от Земляных шипов!`);
                let otherRow = (target.row === 'front') ? 'back' : 'front';
                let colEnemy = combat.targets.find(t => t.isEnemy && t.hp > 0 && t.id !== target.id && t.row === otherRow);
                if (colEnemy) {
                    let colDmg = Math.floor(baseDmg * (1 - getMagicReduction(colEnemy)) * getIncomingDmgMult(colEnemy, 'magic') * getThroneSealReduction(colEnemy));
                    colEnemy.hp -= colDmg;
                    recordOrchidDmg(colEnemy, colDmg);
                    log(`🧙‍♂️ Земляные шипы пробивают колонну → ${colEnemy.name}: ${colDmg}`);
                    applyBreakCheck(colEnemy, 1, actor);
                    applyDuelDeathCheck(colEnemy);
                    checkEnemyLethal(colEnemy);
                    checkTravelerTransform(colEnemy);
                }
            }

            if (actor.dbId === 'lion' && skillObj && skillObj.id === 's4' && target.hp <= 0) {
                let refund = Math.floor((cost || 85) * 0.5);
                actor.mp = Math.min(actor.maxMp, actor.mp + refund);
                actor.rage = Math.min(100, (actor.rage || 0) + 50);
                log(`🧙‍♂️ Палец смерти уничтожает цель! Возврат ${refund} МН и +50 Ярости!`);
            }

            if (skillObj && skillObj.tidebringerPureSplash) {
                let backEnemies = combat.targets.filter(t => t.isEnemy && t.hp > 0 && t.row === 'back');
                let splashDmg = Math.floor(d * (skillObj.splashPct || 0.65));
                backEnemies.forEach(be => {
                    be.hp -= splashDmg;
                    recordOrchidDmg(be, splashDmg);
                    log(`🌊 Приливный клинок прорубает тыл → ${be.name}: ${splashDmg} (чистый сплэш)!`);
                    applyBreakCheck(be, 1, actor);
                    applyDuelDeathCheck(be);
                    checkEnemyLethal(be);
                    checkTravelerTransform(be);
                });
            }

            if (actor.dbId === 'zeus' && skillObj && actor.heroData.skillLevels[2] > 0 && target.hp > 0) {
                let sPct = actor.skills[2].staticFieldPct || 0.05;
                let sBurn = Math.max(1, Math.floor(target.hp * sPct));
                target.hp -= sBurn;
                recordOrchidDmg(target, sBurn);
                log(`⚡ Статическое поле: ${sBurn} чистого урона по ${target.name}!`);
                checkEnemyLethal(target);
            }

            if (!skillObj && actor.dbId === 'silencer' && !actor.isEnemy) {
                let pureDmg = Math.round((actor.int || 0) * 0.35);
                if (pureDmg > 0) {
                    target.hp -= pureDmg;
                    recordOrchidDmg(target, pureDmg);
                    log(`🔮 Глефы Мудрости: +${pureDmg} чистого урона по ${target.name}!`);
                    checkEnemyLethal(target);
                }
                let isTargetSilenced = target.buffs && target.buffs.some(b => b.type === 'silence' || b.type === 'orchid');
                if (isTargetSilenced) {
                    applyBreakCheck(target, 1, actor);
                    log(`🔇 Глефы карают замолкшего врага: −1 🛡️ у ${target.name}!`);
                }
            }

            if (skillObj && actor.dbId === 'silencer' && skillObj.id === 's1') {
                let isPreparing = (target.preparing || target.cataclysmCharging);
                if (isPreparing) {
                    target.preparing = null;
                    target.cataclysmCharging = false;
                    applyBreakCheck(target, 2, actor);
                    log(`🚫 ${actor.name} срывает подготовку ${target.name} и ломает −2 🛡️!`);
                }
            }

            if (skillObj && skillObj.addIllusions) addPlIllusions(actor, skillObj.addIllusions);
            if (type === 'phys' && actor.dbId === 'pl' && actor.heroData.skillLevels[3] > 0) addPlIllusions(actor, 1);
            if (skillObj && skillObj.spiritLanceRework) {
                actor.mirageStacks = Math.min(3, (actor.mirageStacks || 0) + 2);
                log(`🔱 Копьё духов: +2 стака Миража (всего: ${actor.mirageStacks})!`);
            }
            if (skillObj && skillObj.phantomRushRework) {
                let st = actor.mirageStacks || 0;
                actor.mirageStacks = 0;
                let rushBreaks = Math.min(5, 2 + st);
                applyBreakCheck(target, rushBreaks, actor);
                log(`🔱 Натиск миражей! Обрушивает копии (серия ударов, −${rushBreaks} 🛡️)!`);
            }

            let extraBreak = 0;
            if (skillObj && target.buffs) {
                if (target.buffs.some(b => b.type === 'burn_dot' || b.type === 'burn')) {
                    extraBreak++;
                    log(`🔥 Прогар щита: −1 🛡️ у ${target.name}!`);
                } else if (target.buffs.some(b => b.type === 'poison_dot')) {
                    extraBreak++;
                    log(`🧪 Разъедание щита: −1 🛡️ у ${target.name}!`);
                }
            }
            let baseBreaks = getHeroSkillBreakHits(actor, skillObj, usedRage);
            let breakHits = (skillObj && baseBreaks > 0) ? baseBreaks : ((type === 'magic' || isCrit) ? (1 + (usedRage ? 1 : 0)) : 0);
            if (actor.dbId === 'sven' && actor.buffs && actor.buffs.some(b => b.type === 'atk')) {
                let svenLvl = (actor.level || (actor.heroData && actor.heroData.level)) || 1;
                let svenBreak = (svenLvl >= 4 ? 2 : 1) + (usedRage ? 1 : 0);
                breakHits = Math.max(breakHits, svenBreak);
            }
            if (actor.dbId === 'sven' && skillObj && skillObj.id === 's1' && target.buffs && target.buffs.some(b => b.type === 'root')) {
                extraBreak++;
                log(`❄️ Ледяное комбо Свена: −1 🛡️ у ${target.name}!`);
                let neighbors = combat.targets.filter(t => t.isEnemy && t.hp > 0 && t.id !== target.id && t.row === target.row);
                neighbors.forEach(n => {
                    let nDmg = Math.floor(d * 0.5);
                    n.hp -= nDmg;
                    recordOrchidDmg(n, nDmg);
                    applyBreakCheck(n, 1, actor);
                    log(`⚡ Молот бури задевает соседа → ${n.name}: ${nDmg} (−1 🛡️)!`);
                });
            }
            applyBreakCheck(target, breakHits + extraBreak, actor);

            // Безмолвие (сбивает каст и запрещает скиллы поверх щитов и иммунитета)
            if (skillObj && skillObj.silence && target.hp > 0) {
                applySilence(target, skillObj.silence + durBonus, skillObj.name);
            }

            // Оцепенение (Фростбайт Мейден: запрещает бить с руки)
            if (skillObj && skillObj.rootTurns && target.hp > 0) {
                let rDur = skillObj.rootTurns + durBonus;
                target.buffs = target.buffs.filter(b => b.type !== 'root');
                target.buffs.push({ type: 'root', turns: rDur });
                log(`❄️ ${target.name} в оцепенении (${rDur} х.) — не может бить с руки!`);
            }

            // Поджог (Лайт Страйк Лины)
            if (skillObj && skillObj.burnDmg && target.hp > 0) {
                let bDmg = skillObj.burnDmg[skillLvl - 1];
                let bDur = 2 + durBonus;
                target.buffs = target.buffs.filter(b => b.type !== 'burn_dot');
                target.buffs.push({ type: 'burn_dot', dmg: bDmg, turns: bDur });
                log(`🔥 ${target.name} подожжён (${bDmg} Маг. урон/ход, ${bDur} х.)!`);
            }

            // Грейт Клив Свена на обычной атаке
            if (type === 'phys' && !skillObj && actor.dbId === 'sven' && actor.heroData.skillLevels[1] > 0 && d > 0) {
                let pct = actor.skills[1].cleavePct[actor.heroData.skillLevels[1] - 1];
                let others = combat.targets.filter(t => t.isEnemy && t.hp > 0 && t.id !== target.id);
                others.forEach(o => {
                    let cd = Math.floor(d * pct);
                    o.hp -= cd;
                    recordOrchidDmg(o, cd);
                    log(`⚔️ Грейт Клив → ${o.name}: ${cd}`);
                    applyDuelDeathCheck(o);
                });
            }

            if (lumiProc && d > 0) {
                let healPct = actor.skills[2].lumiHeal[actor.heroData.skillLevels[2] - 1] || 0.3;
                let th = Math.floor(d * healPct);
                combat.targets.filter(t => !t.isEnemy && t.hp > 0).forEach(a => { a.hp = Math.min(a.maxHp, a.hp + th); });
                log(`☀️ Люминосити лечит весь отряд на +${th} ЗД!`);
            }

            if (skillObj && skillObj.drainHeal && d > 0) {
                let dh = Math.floor(d * skillObj.drainHeal);
                actor.hp = Math.min(actor.maxHp, actor.hp + dh);
                log(`🟢 Лайф Дрейн: Пугна восстанавливает +${dh} ЗД!`);
            }

            if (skillObj && skillObj.drainHealPct && d > 0) {
                let ph = Math.floor(d * skillObj.drainHealPct);
                actor.hp = Math.min(actor.maxHp, actor.hp + ph);
                log(`🎣 «Тяжёлая сеть»: Бобёр-удильщик восстанавливает +${ph} ЗД!`);
            }

            if (skillObj && skillObj.poisonTurns && target.hp > 0) {
                let pDur = skillObj.poisonTurns + durBonus;
                let pDmg = (skillObj.poisonDmg && skillObj.poisonDmg[skillLvl - 1]) || 40;
                target.buffs = (target.buffs || []).filter(b => b.type !== 'poison_dot');
                target.buffs.push({ type: 'poison_dot', dmg: pDmg, turns: pDur });
                log(`🧪 ${target.name} опутан «Тяжёлой сетью» (${pDmg} урона/ход, ${pDur} х.)!`);
            }

            if (skillObj && skillObj.wkHealDmgPct && d > 0) {
                let wkHeal = Math.floor(d * skillObj.wkHealDmgPct);
                actor.hp = Math.min(actor.maxHp, actor.hp + wkHeal);
                log(`💀 Смертельный удар: Врайз Кинг восстанавливает +${wkHeal} ЗД!`);
            }

            if (skillObj && skillObj.torrentWeaken && target.hp > 0) {
                let wDur = 2 + durBonus;
                target.buffs = target.buffs.filter(b => b.type !== 'weaken');
                target.buffs.push({ type: 'weaken', reduce: skillObj.torrentWeaken, turns: wDur });
                log(`🌊 ${skillObj.name} ослабляет ${target.name} (−${Math.round(skillObj.torrentWeaken * 100)}% УРН, ${wDur} х.)!`);
            }

            applyBristleQuillCounter(target, actor);
            applyThornsReflect(target, actor, d);
            applyDuelDeathCheck(target);

            if (type === 'phys' && !skillObj && equipped.includes('echo_sabre') && target.hp > 0 && Math.random() < 0.25) {
                target.hp -= d;
                recordOrchidDmg(target, d);
                log(`⚔️ Эхо Сейбр: двойной удар! +${d} урона.`);
                applyDuelDeathCheck(target);
            }

            if (stunDur > 0 && target.hp > 0) {
                applyHardStun(target, stunDur, skillObj ? skillObj.name : actor.name);
            }

            if (skillObj && skillObj.id === 's2' && actor.dbId === 'pa') {
                actor.buffs.push({ type: 'atk', value: 1.5, turns: 2 + durBonus });
                log(`🗡️ Фантомка получает +50% к УРН на ${2 + durBonus} х.`);
            }

            if (type === 'phys' && d > 0) applyPhysLifesteal(actor, d);
            if (type === 'magic' && d > 0) applySpellLifesteal(actor, d);

            if (skillObj && skillObj.id === 's1' && actor.dbId === 'zeus') {
                let bounces = skillObj.bounces[actor.heroData.skillLevels[0] - 1];
                let others = combat.targets.filter(t => t.isEnemy && t.hp > 0 && t.id !== target.id);
                let bounceTotal = 0;
                for (let i = 0; i < bounces && others.length > 0; i++) {
                    let b = others[Math.floor(Math.random() * others.length)];
                    let bd = Math.floor(baseDmg * (1 - getMagicReduction(b)) * getIncomingDmgMult(b, 'magic') * getThroneSealReduction(b));
                    b.hp -= bd;
                    recordOrchidDmg(b, bd);
                    bounceTotal += bd;
                    log(`⚡ Отскок молнии → ${b.name}: ${bd}`);
                    applyBreakCheck(b, 1, actor);
                    applyDuelDeathCheck(b);
                    others = others.filter(o => o.id !== b.id);
                }
                applySpellLifesteal(actor, bounceTotal);
            }
        }

        combat.currentIdx++;
        nextTurn();
    });
}

/* ===== ИИ ПРОТИВНИКОВ И ОСОБЫЕ БОССЫ ===== */
function chooseEnemyAction(enemy, allies, playerHeroes) {
    if (enemy.lockedTargetId) {
        return {
            type: 'skill',
            skill: { name: 'Снайперский выстрел', type: 'hoodwink_release', mult: 0, aoe: false, stun: 0, mpCost: 0, desc: 'Смертоносный выстрел из арбалета по намеченной цели!' }
        };
    }
    if (enemy.cataclysmCharging) {
        return {
            type: 'skill',
            skill: { name:'☄️ КАТАКЛИЗМ!', type:'cataclysm_release', mult:2.2, aoe:true, stun:0, mpCost:0, desc:'Обрушивает заряженный Катаклизм на весь отряд!' }
        };
    }
    if (enemy.isChicken) {
        let isSilenced = enemy.buffs && enemy.buffs.some(b => b.type === 'silence' || b.type === 'orchid');
        if (isSilenced) return { type: 'attack' };
        return {
            type: 'skill',
            skill: { name: 'Побег в кусты!', type: 'chicken_flee', mult: 0, desc: 'Курица расправляет крылья и готовится удрать в кусты на своём ходу!' }
        };
    }

    if (enemy.tplKey === 'prologue_boar' || enemy.name === 'Лесной вепрь') {
        let isSilenced = enemy.buffs && enemy.buffs.some(b => b.type === 'silence' || b.type === 'orchid');
        if (isSilenced) return { type: 'attack' };
        if (enemy.turnCount === 2 || enemy.turnCount === 1) {
            return {
                type: 'skill',
                skill: { name: 'Свирепый таран', type: 'phys', mult: 1.8, aoe: false, stun: 0, mpCost: 0, desc: 'Вепрь разгоняется для сокрушительного тарана!' }
            };
        }
    }

    let isSilenced = enemy.buffs && enemy.buffs.some(b => b.type === 'silence' || b.type === 'orchid');
    if (isSilenced) return { type: 'attack' };

    let interval = (combat && combat.contract === 'trial') ? (CONFIG.contracts.trial.enemySkillInterval || 2) : 3;
    let isSkillTurn = enemy.skills && enemy.skills.length > 0 && ((enemy.turnCount || 0) % interval === 0);
    if (!isSkillTurn) return { type: 'attack' };

    let usableSkills = enemy.skills.filter(s => (enemy.mp >= (s.mpCost || 0)));
    if (usableSkills.length === 0) return { type: 'attack' };

    // 1. Саппорты / хилеры (включая Шпрехшталмейстера, Даззла, Ио)
    let healSkill = usableSkills.find(s => s.type === 'applause' || s.type === 'heal_ally' || s.addShield);
    if (healSkill) {
        let aliveAllies = allies.filter(a => a.hp > 0);
        let woundedAlly = aliveAllies.find(a => (a.hp / a.maxHp) < 0.6 || (a.shieldMax > 0 && (a.shield || 0) === 0));
        let allHealthy = aliveAllies.every(a => (a.hp / a.maxHp) > 0.8 && (a.shield || 0) > 0);
        if (woundedAlly || !allHealthy) {
            return { type: 'skill', skill: healSkill };
        } else {
            return { type: 'attack', aiHeldHeal: true };
        }
    }

    // 2. Контроллеры / маги с дебаффом
    let controlSkill = usableSkills.find(s => s.silence || s.stun || s.root || s.type === 'debuff');
    if (controlSkill) {
        let threatHero = playerHeroes.find(h => h.hp > 0 && (h.preparing || (h.rage || 0) >= 80));
        if (threatHero) {
            return { type: 'skill', skill: controlSkill, priorityTarget: threatHero };
        }
    }

    // 3. Остальные скиллы по очереди курсора
    let idx = (enemy.skillCursor || 0) % enemy.skills.length;
    let cand = enemy.skills[idx];
    if (cand && enemy.mp >= (cand.mpCost || 0)) {
        enemy.skillCursor = idx + 1;
        return { type: 'skill', skill: cand };
    }
    return { type: 'skill', skill: usableSkills[0] };
}

function chooseEnemyTarget(enemy, action, playerHeroes) {
    let aliveHeroes = playerHeroes.filter(h => h.hp > 0);
    if (aliveHeroes.length === 0) return { target: null, reason: null };
    if (aliveHeroes.length === 1) return { target: aliveHeroes[0], reason: null };

    if (enemy.lockedTargetId) {
        let locked = aliveHeroes.find(h => h.id === enemy.lockedTargetId);
        if (locked) return { target: locked, reason: 'цель на мушке 🎯' };
    }

    // 1. Таунт / Дуэль Легионки
    let enemyDuel = (enemy.buffs || []).find(b => b.type === 'dueling' || b.type === 'duel');
    if (enemyDuel) {
        let duelist = aliveHeroes.find(h => h.id === enemyDuel.targetId);
        if (duelist) return { target: duelist, reason: 'скован дуэлью' };
    }
    let tauntHero = aliveHeroes.find(h => h.buffs && h.buffs.some(b => b.type === 'taunt' || b.type === 'duel' || (b.type === 'dueling' && b.targetId === enemy.id)));
    if (tauntHero) return { target: tauntHero, reason: 'скован дуэлью' };

    let isSkill = action && action.type === 'skill';
    let sk = isSkill ? action.skill : null;
    let isPhysAttack = !sk || sk.type === 'phys';

    let hasFrontAlive = aliveHeroes.some(h => h.row === 'front');
    let isMelee = enemy.isMelee && (!sk || sk.type === 'phys');

    let scored = aliveHeroes.map(h => {
        let score = 100;
        let reason = null;

        // Декрепифай (Астрал): полный иммунитет к физ. атакам
        let hasDecrep = h.buffs && h.buffs.some(b => b.type === 'decrepify');
        if (hasDecrep && isPhysAttack) {
            score -= 180;
        }

        if (isMelee) {
            if (h.row === 'front') score += 65;
            else if (hasFrontAlive) score -= 55;
        } else {
            if (h.row === 'back') score += 15;
        }

        if (sk && sk.targetBackRow && h.row === 'back') score += 75;
        if (sk && sk.targetLowest) score += Math.floor((1 - (h.hp / h.maxHp)) * 60);

        let effAtk = getEnemyOutgoingAtk(enemy);
        let arm = getEffectiveArmor(h);
        let red = (sk && sk.type === 'magic') ? getMagicReduction(h) : getPhysicalReduction(arm);
        let estDmg = Math.floor(effAtk * (sk ? (sk.mult || 1.2) : 1) * (1 - red));

        let hasGrave = h.buffs && h.buffs.some(b => b.type === 'shallow_grave');
        if (hasGrave) {
            // Под Крестом Даззла герой бессмертен (ЗД не падает ниже 1) — ИИ не сливает добивание
            score -= 30;
        } else if (h.hp < h.maxHp * 0.30 || estDmg >= h.hp) {
            score += 80;
            if (!reason) reason = 'пытается добить';
        } else if (h.hp < h.maxHp * 0.55) {
            score += 30;
        }

        if (h.preparing) {
            score += 55;
            if (!reason) reason = 'срывает подготовку';
        }
        if ((h.rage || 0) >= 90) {
            score += 25;
            if (!reason) reason = 'сдерживает ярость';
        }

        let isDefending = h.buffs && h.buffs.some(b => b.type === 'defending');
        if (isDefending) {
            score -= 50;
        }
        if (enemy.isMelee && h.buffs && h.buffs.some(b => b.type === 'root')) {
            score += 35;
        }

        score += (Math.random() * 24 - 12);
        return { hero: h, score: score, reason: reason, isDefending: isDefending };
    });

    scored.sort((a, b) => b.score - a.score);
    let best = scored[0];
    let chosenReason = best.reason;
    if (!chosenReason && !best.isDefending && aliveHeroes.some(h => h.buffs && h.buffs.some(b => b.type === 'defending'))) {
        chosenReason = 'обходит блок';
    }
    return { target: best.hero, reason: chosenReason };
}

function pickEnemyTarget(actor, heroes, forcedTarget, sk) {
    if (forcedTarget) return { target: forcedTarget, reason: null };
    let action = sk ? { type: 'skill', skill: sk } : { type: 'attack' };
    return chooseEnemyTarget(actor, action, heroes);
}

function getEnemyOutgoingAtk(actor) {
    let atk = actor.atk;
    let ab = actor.buffs && actor.buffs.find(b => b.type === 'atk');
    if (ab) atk = Math.floor(atk * ab.value);
    let wk = actor.buffs && actor.buffs.find(b => b.type === 'weaken');
    if (wk) atk = Math.floor(atk * (1 - wk.reduce));
    if (actor.isCircusCopy) {
        let rmAlive = combat.targets.some(t => t.isEnemy && t.hp > 0 && (t.dbId === 'ringmaster' || t.isRingmaster));
        if (rmAlive) atk = Math.floor(atk * 1.15);
        else if (actor.buffs && actor.buffs.some(b => b.type === 'no_conductor')) atk = Math.floor(atk * 0.85);
    }
    if (actor.isEnemy && actor.isMelee && actor.row === 'back') {
        atk = Math.floor(atk * 0.75);
    }
    return atk;
}

function summonEnemyUnit(key) {
    let aliveSummons = combat.targets.filter(t => t.isEnemy && t.isSummon && t.hp > 0);
    if (aliveSummons.length >= 2) return null;
    combat.summonCounter++;
    let unit = makeSpecialEnemy(key, 'esum_' + combat.summonCounter, 'normal');
    combat.targets.push(unit);
    combat.turnQueue.push(unit);
    return unit;
}

function triggerNetherWardCheck(caster) {
    let pugna = combat.targets.find(t => !t.isEnemy && t.hp > 0 && t.buffs && t.buffs.some(b => b.type === 'nether_ward'));
    if (!pugna) return;
    let wb = pugna.buffs.find(b => b.type === 'nether_ward');
    let wd = Math.floor(wb.dmg * (1 - getMagicReduction(caster)));
    caster.hp -= wd;
    recordOrchidDmg(caster, wd);
    log(`🟢 Незер Вард бьёт ${caster.name} за каст способности: ${wd} Маг. урона!`);
}

function enemyAI(actor, forcedTarget) {
    let heroes = combat.targets.filter(t => !t.isEnemy && t.hp > 0);
    if (heroes.length === 0) return;

    let intent = forcedTarget ? { type: 'attack' } : (actor.nextIntent || { type: 'attack' });
    let sk = (intent.type === 'skill') ? intent.skill : null;
    let isSilenced = actor.buffs && actor.buffs.some(b => b.type === 'orchid' || b.type === 'silence');
    if (isSilenced && sk) {
        log(`🔇 ${actor.name} под Безмолвием и не может применить ${sk.name}!`);
        sk = null;
        actor.cataclysmCharging = false;
        if (actor.lockedTargetId) {
            actor.lockedTargetId = null;
            log('🐿️ Прицеливание Худвинка прервано!');
        }
    }

    if (actor.isChicken) {
        if (!isSilenced) {
            log('🐔 Курица-беглец взмахивает крыльями и со всех ног удирает в кусты!');
            combat.targets = combat.targets.filter(t => t.id !== actor.id);
            combat.turnQueue = combat.turnQueue.filter(t => t.id !== actor.id);
            state.shamanFled = true;
            state.shamanKilled = false;
            save();
            renderArena();
            winBattle(false);
            return;
        } else {
            let targetRes = pickEnemyTarget(actor, heroes, forcedTarget, null);
            let target = targetRes.target || heroes[0];
            log(`🔇 Курица-беглец под Безмолвием не может взлететь и растерянно клюёт ${target.name}!`);
            let red = getPhysicalReduction(getEffectiveArmor(target));
            let d = Math.max(1, Math.floor(15 * (1 - red)));
            if (target.buffs && target.buffs.some(b => b.type === 'defending')) d = Math.floor(d * 0.5);
            target.hp -= d;
            log(`🐔 Курица наносит ${d} урона.`);
            checkHeroSurvival(target);
            finishEnemyTurn(actor);
            rollEnemyIntent(actor);
            combat.currentIdx++;
            nextTurn();
            return;
        }
    }

    let targetRes = pickEnemyTarget(actor, heroes, forcedTarget, sk);
    let target = targetRes.target || heroes[0];
    let aiReasonTag = targetRes.reason ? ` (${targetRes.reason})` : '';
    let effAtk = getEnemyOutgoingAtk(actor);

    // Скрипт Донбрейкер: пока >1 героя живо и её ХП падает, она бьёт сокрушительно, чтобы довести отряд до 1 выжившего
    if (actor.scriptedDawn && !combat.dawnTriggered && heroes.length > 1 && actor.hp < actor.maxHp * 0.78) {
        let nonSven = heroes.filter(h => h.dbId !== 'sven');
        if (nonSven.length > 0) target = nonSven.sort((a, b) => a.hp - b.hp)[0];
        effAtk = Math.max(effAtk, Math.floor(target.maxHp * 0.95));
    }

    playAnim(actor.id, 'attacking-left', () => {
        if (sk && actor.mp >= (sk.mpCost || 0)) {
            actor.mp -= (sk.mpCost || 0);
            triggerNetherWardCheck(actor);
            if (actor.hp <= 0) {
                combat.currentIdx++; nextTurn(); return;
            }

            // Особые скиллы боссов: лечение союзников, призывы, заряд Катаклизма
            if (sk.type === 'applause') {
                let copies = combat.targets.filter(t => t.isEnemy && t.hp > 0 && t.isCircusCopy);
                let lowCopy = copies.sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0] || actor;
                let healVal = Math.round(lowCopy.maxHp * 0.20);
                lowCopy.hp = Math.min(lowCopy.maxHp, lowCopy.hp + healVal);
                lowCopy.buffs.push({ type: 'atk', value: 1.25, turns: 2 });
                let shTxt = '';
                if ((lowCopy.shield || 0) < lowCopy.shieldMax && !lowCopy.buffs.some(b => b.type === 'broken')) {
                    lowCopy.shield++;
                    shTxt = ' и +1 🛡️';
                }
                log(`👏 Шпрехшталмейстер взрывается аплодисментами: +${healVal} ЗД, +25% УРН${shTxt} для ${lowCopy.name}!`);
                finishEnemyTurn(actor); rollEnemyIntent(actor); combat.currentIdx++; nextTurn(); return;
            }
            if (sk.addShield) {
                let shieldAlly = combat.targets.filter(t => t.isEnemy && t.hp > 0 && (t.shield || 0) < t.shieldMax).sort((a, b) => (a.shield || 0) - (b.shield || 0))[0];
                if (shieldAlly) {
                    shieldAlly.shield = Math.min(shieldAlly.shieldMax, (shieldAlly.shield || 0) + 1);
                    shieldAlly.buffs = shieldAlly.buffs.filter(b => b.type !== 'broken');
                    log(`🛡️ ${actor.name} применяет ${sk.name}: +1 🛡️ для ${shieldAlly.name} (${shieldAlly.shield}/${shieldAlly.shieldMax})!`);
                } else {
                    actor.shield = Math.min(actor.shieldMax, (actor.shield || 0) + 1);
                    log(`🛡️ ${actor.name} укрепляет свои щиты (+1 🛡️)!`);
                }
                finishEnemyTurn(actor); rollEnemyIntent(actor); combat.currentIdx++; nextTurn(); return;
            }
            if (sk.thorns) {
                actor.buffs = actor.buffs.filter(b => b.type !== 'thorns');
                actor.buffs.push({ type: 'thorns', turns: 2 });
                log(`🦔 ${actor.name} активирует ${sk.name} (Шипы: 50% возврат урона на 1 ход)!`);
                finishEnemyTurn(actor); rollEnemyIntent(actor); combat.currentIdx++; nextTurn(); return;
            }
            if (sk.type === 'heal_ally') {
                let lowAlly = combat.targets.filter(t => t.isEnemy && t.hp > 0).sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0];
                if (lowAlly) {
                    lowAlly.hp = Math.min(lowAlly.maxHp, lowAlly.hp + sk.healAmt);
                    lowAlly.buffs = lowAlly.buffs.filter(b => b.type !== 'atk');
                    lowAlly.buffs.push({ type: 'atk', value: 1.25, turns: 2 });
                    log(`🔵 Ио связывается с ${lowAlly.name}: +${sk.healAmt} ЗД и +25% УРН!`);
                }
                finishEnemyTurn(actor); rollEnemyIntent(actor); combat.currentIdx++; nextTurn(); return;
            }
            if (sk.type === 'summon_forge' || sk.type === 'summon_ck' || sk.type === 'summon_seal') {
                let key = sk.type === 'summon_forge' ? 'forge_spirit' : (sk.type === 'summon_ck' ? 'ck_illusion' : 'ancient_seal');
                let u = summonEnemyUnit(key);
                if (u) log(`✨ ${actor.name} применяет ${sk.name} — на поле выходит ${u.icon} ${u.name}!`);
                else log(`✨ ${actor.name} усиливает своих миньонов!`);
                finishEnemyTurn(actor); rollEnemyIntent(actor); combat.currentIdx++; nextTurn(); return;
            }
            if (sk.type === 'cataclysm_charge') {
                actor.cataclysmCharging = true;
                log(`☄️ Инвокер начинает заряжать КАТАКЛИЗМ! Закройтесь БКБ, Пайпом, Ромом или Крестом!`);
                finishEnemyTurn(actor); rollEnemyIntent(actor); combat.currentIdx++; nextTurn(); return;
            }
            if (sk.type === 'cataclysm_release') {
                actor.cataclysmCharging = false;
                sk = { ...sk, type: 'magic' };
            }
            if (sk.type === 'hoodwink_prep') {
                let validTargets = heroes.filter(h => h.hp > 0);
                let undefended = validTargets.filter(h => !(h.buffs && h.buffs.some(b => b.type === 'defending')));
                let pool = undefended.length > 0 ? undefended : validTargets;
                let backRow = pool.filter(h => h.row === 'back');
                let chosenTarget = (backRow.length > 0 ? backRow : pool)[0] || heroes[0];

                actor.lockedTargetId = chosenTarget.id;
                log(`🐿️ Худвинк натягивает арбалет, прицеливаясь в ${chosenTarget.name}! Выстрел в следующий ход смертелен!`);
                renderArena();
                finishEnemyTurn(actor); rollEnemyIntent(actor); combat.currentIdx++; nextTurn(); return;
            }
            if (sk.type === 'hoodwink_release') {
                let targetHero = heroes.find(h => h.id === actor.lockedTargetId);
                if (!targetHero || targetHero.hp <= 0) {
                    targetHero = heroes.find(h => h.hp > 0) || heroes[0];
                }
                actor.lockedTargetId = null;
                if (!targetHero) {
                    finishEnemyTurn(actor); rollEnemyIntent(actor); combat.currentIdx++; nextTurn(); return;
                }
                let rawDmg = Math.round(Math.max(actor.atk * 3.8, targetHero.maxHp * 1.15));
                let isDefending = targetHero.buffs && targetHero.buffs.some(b => b.type === 'defending');
                let finalDmg = rawDmg;
                if (isDefending) {
                    finalDmg = Math.round(finalDmg * 0.5);
                }
                targetHero.hp -= finalDmg;
                log(`🎯 Снайперский выстрел Худвинка пробивает ${targetHero.name} на ${finalDmg} чистого урона!${isDefending ? ' (🛡️ БЛОК смягчил удар на 50%!)' : ''}`);
                checkHeroSurvival(targetHero);
                applyBladeMailReflect(targetHero, actor, finalDmg);
                renderArena();
                finishEnemyTurn(actor); rollEnemyIntent(actor); combat.currentIdx++; nextTurn(); return;
            }

            if (sk.selfAtkBuff) {
                actor.buffs = actor.buffs.filter(b => b.type !== 'atk');
                actor.buffs.push({ type: 'atk', value: sk.selfAtkBuff, turns: 2 });
                effAtk = getEnemyOutgoingAtk(actor);
                log(`💪 ${actor.name} активирует ${sk.name} (+${Math.round((sk.selfAtkBuff - 1) * 100)}% УРН)!`);
            }

            let hitList;
            if (sk.aoe && sk.frontOnly) {
                let front = heroes.filter(h => h.row === 'front');
                hitList = front.length > 0 ? front : heroes;
            } else if (sk.aoe) {
                hitList = heroes;
            } else {
                hitList = [target];
            }

            hitList.forEach(h => {
                let hEquip = getHeroEquippedItems(h);
                if (!sk.aoe && hEquip.includes('linken') && !(h.itemCooldowns && h.itemCooldowns.linken > 0)) {
                    h.itemCooldowns.linken = state.relics.includes('act4_shard') ? 4 : 5;
                    log(`🔗 Линка ${h.name} блокирует ${sk.name} от ${actor.name}!`);
                    return;
                }
                if (sk.type === 'magic' && h.buffs && h.buffs.some(b => b.type === 'bkb')) {
                    log(`🛡️ БКБ ${h.name} полностью блокирует ${sk.name}!`);
                    return;
                }

                let rawDmg = Math.floor(effAtk * sk.mult * (CONFIG.combat.enemySkillDmgMult || 1.20));
                let isDefending = h.buffs && h.buffs.some(b => b.type === 'defending');
                if (sk.execute && h.hp < h.maxHp * 0.3 && !isDefending) {
                    rawDmg = Math.floor(rawDmg * 1.5);
                    log(`🪓 Казнь! У ${h.name} мало ЗД — урон увеличен!`);
                }
                if (sk.manaVoid) {
                    let missingMp = Math.max(0, h.maxMp - h.mp);
                    rawDmg += Math.min(Math.floor(effAtk * 1.1), Math.floor(missingMp * 0.4));
                }

                let red = (sk.type === 'phys') ? getPhysicalReduction(getEffectiveArmor(h)) : getMagicReduction(h);
                let d = Math.floor(rawDmg * (1 - red));

                if (sk.type === 'phys' && actor.isMelee && h.row === 'back') d = Math.floor(d * 0.85);
                if (sk.aoe && h.row === 'back' && combat.targets.some(t => !t.isEnemy && t.hp > 0 && t.dbId === 'pudge')) d = Math.floor(d * 0.85);
                if (h.buffs && h.buffs.some(b => b.type === 'solar_shield')) d = Math.floor(d * 0.75);
                if (h.buffs && h.buffs.some(b => b.type === 'rum')) d = Math.floor(d * 0.65);
                if (isDefending) d = Math.floor(d * 0.5);

                if (sk.type === 'magic' && d > 0 && h.buffs) {
                    let mb = h.buffs.find(b => b.type === 'magic_barrier' && b.shield > 0);
                    if (mb) {
                        let absorbed = Math.min(d, mb.shield);
                        d -= absorbed;
                        mb.shield -= absorbed;
                        log(`🪈 Барьер Пайпа поглотил ${absorbed} Маг. урона у ${h.name}!`);
                        if (mb.shield <= 0) h.buffs = h.buffs.filter(b => b.type !== 'magic_barrier');
                    }
                }

                h.hp -= d;
                if (d > 0) h.rage = Math.min(100, (h.rage || 0) + 20);
                log(`🔥 ${actor.name} применяет ${sk.name} → ${h.name}${aiReasonTag}: ${d}`);
                checkHeroSurvival(h);
                applyBladeMailReflect(h, actor, d);

                if (sk.vuln && h.hp > 0) {
                    h.buffs = h.buffs.filter(b => b.type !== 'whip_vuln');
                    h.buffs.push({ type: 'whip_vuln', amp: sk.vuln, turns: 2 });
                    log(`💥 ${actor.name} накладывает Уязвимость на ${h.name} (+${Math.round(sk.vuln * 100)}% входящего урона на 2 х.)!`);
                }

                if (sk.armorDebuff) {
                    applyArmorDebuff(h, sk.name, sk.armorDebuff, 2);
                    log(`💔 ${h.name} теряет −${sk.armorDebuff} БРО (2 х.).`);
                }
                if (sk.manaBurn) {
                    let burned = Math.min(h.mp, sk.manaBurn);
                    h.mp -= burned;
                    if (burned > 0) log(`🚫 ${actor.name} сжигает ${burned} МН у ${h.name}.`);
                }
                if (sk.dispel && h.buffs) {
                    const dispellable = ['atk', 'blur', 'glimmer', 'rum', 'heavenlyJump', 'lifesteal', 'magic_barrier', 'armor_up'];
                    let before = h.buffs.length;
                    h.buffs = h.buffs.filter(b => !dispellable.includes(b.type));
                    if (h.buffs.length < before) log(`🌪️ ${sk.name} развеивает баффы с ${h.name}!`);
                }
                if (d > 0 && h.buffs && h.buffs.some(b => b.type === 'salve_hot')) {
                    h.buffs = h.buffs.filter(b => b.type !== 'salve_hot');
                    log(`💔 Урон сбивает Хилинг Сальв с ${h.name}!`);
                }
                if (hEquip.includes('magic_stick') && d > 0) {
                    h.stickCharges = Math.min(10, (h.stickCharges || 0) + 1);
                }
                if (h.hp > 0) {
                    if (sk.stun > 0) {
                        applyHardStun(h, sk.stun, `${actor.name} (${sk.name})`);
                    }
                    if (sk.silence > 0) {
                        applySilence(h, sk.silence, `${actor.name} (${sk.name})`);
                    }
                    if (sk.root > 0) {
                        if (h.buffs && h.buffs.some(b => b.type === 'bkb')) {
                            log(`🛡️ БКБ ${h.name} защищает от Оцепенения!`);
                        } else {
                            h.buffs = h.buffs.filter(b => b.type !== 'root');
                            h.buffs.push({ type: 'root', turns: sk.root });
                            log(`❄️ ${actor.name} накладывает Оцепенение на ${h.name} (${sk.root} х.)!`);
                        }
                    }
                    if (sk.poisonDot > 0) {
                        h.buffs = h.buffs.filter(b => b.type !== 'poison_dot');
                        h.buffs.push({ type: 'poison_dot', dmg: sk.poisonDot, turns: 2 });
                        log(`🧪 ${h.name} отравлен (${sk.poisonDot} Маг. урон/ход, 2 х.)!`);
                    }
                    if (sk.burnDot > 0) {
                        h.buffs = h.buffs.filter(b => b.type !== 'burn_dot');
                        h.buffs.push({ type: 'burn_dot', dmg: sk.burnDot, turns: 2 });
                        log(`🔥 ${h.name} подожжён (${sk.burnDot} Маг. урон/ход, 2 х.)!`);
                    }
                }
            });
        } else {
            if (actor.buffs && actor.buffs.some(b => b.type === 'root')) {
                log(`❄️ ${actor.name} скован Оцепенением и не может ударить с руки!`);
                finishEnemyTurn(actor);
                rollEnemyIntent(actor);
                combat.currentIdx++;
                nextTurn();
                return;
            }
            let red = getPhysicalReduction(getEffectiveArmor(target));
            let d = Math.floor(effAtk * (1 - red));

            if (actor.isMelee && target.row === 'back') d = Math.floor(d * 0.85);
            if (target.buffs && target.buffs.some(b => b.type === 'solar_shield')) d = Math.floor(d * 0.75);
            if (target.buffs && target.buffs.some(b => b.type === 'rum')) d = Math.floor(d * 0.65);
            if (target.buffs && target.buffs.some(b => b.type === 'defending')) d = Math.floor(d * 0.5);

            let plDodge = (target.dbId === 'pl' && target.illusions > 0) ? Math.min(0.4, target.illusions * 0.05) : 0;
            if (target.buffs && target.buffs.some(b => b.type === 'glimmer')) {
                d = 0; log(`🧥 ${target.name} полностью уклоняется (Глиммер)!`);
            } else if (target.buffs && target.buffs.some(b => b.type === 'doppel_evade') && Math.random() < 0.6) {
                d = 0; log(`🔱 ${target.name} уходит в иллюзию (Доппельгангер)!`);
            } else if ((target.buffs && target.buffs.some(b => b.type === 'blur')) || (target.dbId === 'pa' && Math.random() < 0.25)) {
                d = 0;
                target.rage = Math.min(100, (target.rage || 0) + 15);
                log(`🌫️ ${target.name} уклоняется (Блюр: +15 Ярости)!`);
            } else if (plDodge > 0 && Math.random() < plDodge) {
                d = 0; log(`🔱 Удар пришёлся в Иллюзию Фантом Лансера!`);
            }

            if (d > 0 && target.buffs && target.buffs.some(b => b.type === 'heavenlyJump') && actor.isMelee) {
                d = Math.floor(d * 0.5);
                let jb = target.buffs.find(b => b.type === 'heavenlyJump');
                let counterDmg = Math.floor(jb.dmg * (1 - getMagicReduction(actor)));
                actor.hp -= counterDmg;
                recordOrchidDmg(actor, counterDmg);
                log(`⚡ Хивенли Джамп! ${actor.name} получает ${counterDmg} Маг. урона!`);
                target.buffs = target.buffs.filter(b => b.type !== 'heavenlyJump');
            }

            if (d > 0) {
                if (target.buffs && target.buffs.some(b => b.type === 'salve_hot')) {
                    target.buffs = target.buffs.filter(b => b.type !== 'salve_hot');
                    log(`💔 Урон сбивает Хилинг Сальв с ${target.name}!`);
                }
                target.hp -= d;
                target.rage = Math.min(100, (target.rage || 0) + 20);
                let backRowMeleeNote = (actor.isMelee && actor.row === 'back') ? ' (из глубины строя -25%)' : '';
                log(`${actor.name} бьёт ${target.name}${aiReasonTag}${backRowMeleeNote}: ${d}`);
                checkHeroSurvival(target);
                applyBladeMailReflect(target, actor, d);
                applyDuelDeathCheck(target);

                if (getHeroEquippedItems(target).includes('magic_stick')) {
                    target.stickCharges = Math.min(10, (target.stickCharges || 0) + 1);
                }
            }

            if (target.hp > 0 && actor.hp > 0 && target.dbId === 'lc') {
                let inDuel = target.buffs && target.buffs.some(b => b.type === 'dueling');
                let chance = inDuel ? 1.0 : ([0, 0.25, 0.35, 0.45, 0.55][target.heroData.skillLevels[2]] || 0.25);
                if (inDuel || (target.heroData.skillLevels[2] > 0 && Math.random() < chance)) {
                    let cDmg = Math.floor(target.atk * 0.65 * (1 - getPhysicalReduction(getEffectiveArmor(actor))));
                    actor.hp -= cDmg;
                    recordOrchidDmg(actor, cDmg);
                    applyBreakCheck(actor, 1, target);
                    log(`🛡️ Миг отваги! Легионка контратакует ${actor.name}: ${cDmg} (−1 🛡️)!`);
                    applyDuelDeathCheck(actor);
                }
            }
        }

        finishEnemyTurn(actor);
        rollEnemyIntent(actor);
        combat.currentIdx++;
        nextTurn();
    });
}

/* ===== ПОБЕДА, ПОРАЖЕНИЕ, ТРОФЕИ И СЮЖЕТ ===== */
function winBattle(isScriptedVictory = false) {
    combat.active = false;
    let st = combat.stage;

    let isPrologue = (typeof st === 'string' && st.startsWith('p'));
    if (isPrologue) {
        let pNum = parseInt(st.replace('p', ''), 10) || 1;
        let baseGold = 90;
        let baseXp = 35;
        if (pNum === 1) { baseGold = 90;  baseXp = 35; }
        if (pNum === 2) { baseGold = 160; baseXp = 55; }
        if (pNum === 3) { baseGold = 260; baseXp = 80; }
        if (pNum === 4) { baseGold = 350; baseXp = 110; }

        state.gold += baseGold;
        state.squad.forEach(id => {
            let h = state.heroes.find(x => x.id === id);
            if (!h) return;
            h.xp += baseXp;
            while (h.level < 25 && h.xp >= xpNeeded(h.level)) {
                h.xp -= xpNeeded(h.level);
                h.level++;
                h.sp++;
            }
        });

        state.prologueCleared = Math.max(state.prologueCleared || 0, pNum);
        if (pNum < 4) {
            state.selectedPrologueStage = pNum + 1;
        } else {
            state.selectedStage = 1;
        }

        if (pNum === 1) {
            state.seenTabs = state.seenTabs || {};
            state.seenTabs.shop = false;
            state.seenTabs.squad = false;
            if (typeof showFeatureToast === 'function') {
                showFeatureToast('🏪 Открыта вкладка 🏪 Лавка — покупайте снаряжение и собирайте артефакты, чтобы усилить героев.');
                showFeatureToast('🎒 Открыта вкладка 🎒 Отряд — надевайте купленные вещи на героев и расставляйте их по рядам.');
            }
        } else if (pNum === 2) {
            if (typeof showFeatureToast === 'function') {
                showFeatureToast('🌲 В Лесу появились Стаки, Руны и Золотой Гоблин — успевайте ловить их, чтобы быстрее фармить золото.');
            }
        } else if (pNum === 3) {
            state.seenTabs = state.seenTabs || {};
            state.seenTabs.heroes = false;
            if (typeof showFeatureToast === 'function') {
                showFeatureToast('🍺 Открыта вкладка 🍺 Таверна — нанимайте новых героев, чтобы собрать полноценный отряд.');
            }
        } else if (pNum === 4) {
            state.selectedStage = 1;
            state.seenTabs = state.seenTabs || {};
            state.seenTabs.raid = false;
            if (typeof showFeatureToast === 'function') {
                showFeatureToast('🌿 Акт 1 открыт! Впереди тракт и Запутанные тропы.');
            }
        }

        save();

        const showVic = () => {
            document.getElementById('victory-title').innerText = 'ПОБЕДА!';
            document.getElementById('victory-title').style.color = 'gold';
            document.getElementById('victory-desc').innerHTML = `💰 +${baseGold} золота<br>⭐ +${baseXp} опыта каждому`;
            document.getElementById('victory-modal').style.display = 'flex';
        };

        if (pNum === 4) {
            showStory('prologue_p4_win', showVic, true);
        } else {
            showVic();
        }
        return;
    }

    // Чертёж Орчида с босса Этапа 5 (проверяется ДО обновления maxRaidCleared)
    let shouldDropOrchid = (st === 5 && !state.orchidRecipeDropped);
    if (shouldDropOrchid) {
        state.orchidRecipeDropped = true;
        if (!state.raidInv.includes('orchid_recipe')) {
            state.raidInv.push('orchid_recipe');
        }
    }

    let firstClear = (typeof st === 'number' && st > state.maxRaidCleared);
    if (firstClear) {
        state.maxRaidCleared = st;
        state.raidLevel = Math.min(25, st + 1);
        state.selectedStage = Math.min(25, st + 1);
        if (st === 2 && typeof showFeatureToast === 'function') {
            showFeatureToast('📜 В Рейдах открыты Контракты — выбирайте Засаду или Испытание ради повышенного золота, опыта и редкого лута.');
        }
    }

    let baseGold = Math.floor(95 * Math.pow(1.20, st - 1));
    let baseXp = Math.floor(110 * Math.pow(1.18, st - 1));
    if (st === 1) { baseGold = 120; baseXp = 190; }
    if (st % 5 === 0) { baseGold = Math.floor(baseGold * (firstClear ? 2.0 : 1.4)); baseXp = Math.floor(baseXp * 1.5); }

    if (combat.contract === 'ambush') { baseXp = Math.floor(baseXp * CONFIG.contracts.ambush.xpMult); }
    if (combat.contract === 'trial')  { baseGold = Math.floor(baseGold * CONFIG.contracts.trial.goldMult); baseXp = Math.floor(baseXp * CONFIG.contracts.trial.xpMult); }
    if (state.relics.includes('act5_crown')) { baseXp = Math.floor(baseXp * 1.25); }

    state.gold += baseGold;

    let extraHtml = '';
    if (combat.shamanBonus) {
        let bonusGold = Math.floor(baseGold * 0.80);
        state.gold += bonusGold;
        state.herbs = (state.herbs || 0) + 3;
        extraHtml += `<br><span style="color:#d4af37;">🐔 НАГРАДА ЗА ПОИМКУ БЕГЛЕЦА: +${bonusGold} G (+80%) и +3 🌿 Травы!</span>`;
    }

    if (shouldDropOrchid) {
        extraHtml += `<br><br><span style="color:#d4af37;">📜 ПОЛУЧЕН ЧЕРТЁЖ: 🌺 Чертёж: Орчид Малеволенс!</span>`;
        if (typeof checkRaidCrafts === 'function') {
            let crafted = checkRaidCrafts();
            if (crafted && crafted.length > 0) {
                extraHtml += `<br><span style="color:#0f0;">✨ Автоматически собран артефакт: 🌺 Орчид Малеволенс!</span>`;
            }
        }
    }

    if (st === 1 && !state.forestUnlocked) {
        state.forestUnlocked = true;
        extraHtml += `<br><span style="color:#0f0;">🌲 Открыты вкладки ЛЕС и ЛАВКА!</span>`;
    }

    // Трофей за босса Акта
    let act = getActForStage(st);
    if (st === act.end && !state.relics.includes(act.relicId)) {
        state.relics.push(act.relicId);
        let rel = RELICS_DB[act.relicId];
        extraHtml += `<br><br><span style="color:gold;">🏆 ПОЛУЧЕН ТРОФЕЙ: ${rel.icon} ${rel.name}</span><br><span style="color:#ccc; font-size:7px;">${rel.desc}</span>`;
    }

    // Вербовка Бобра-удильщика на Этапе 8
    let shouldRecruitBeaver = (st === 8 && !(state.heroes || []).some(h => h.dbId === 'pudge'));
    if (shouldRecruitBeaver) {
        let pId = 'hero_pudge_' + Date.now();
        let newHero = {
            id: pId,
            dbId: 'pudge',
            level: 3,
            xp: 0,
            sp: 3,
            skillLevels: [1, 0, 0, 0],
            skills: { s1: 1, s2: 0, s3: 0, s4: 0 },
            items: [null, null, null, null],
            neutralItem: null,
            row: 'front'
        };
        state.heroes.push(newHero);
        if (state.squad.length < getMaxSquadSize()) {
            state.squad.push(pId);
        }
        state.fishing = state.fishing || { bait: 0, points: 0, rodLevel: 0, caughtSpecies: {}, foundCurios: {}, freshCatchBuff: false };
        let maxB = (CONFIG.fishing ? CONFIG.fishing.maxBait : 12);
        state.fishing.bait = Math.min(maxB, (state.fishing.bait || 0) + 3);
        state.seenTabs = state.seenTabs || {};
        state.seenTabs.river = false;
        if (typeof setTabBadge === 'function') setTabBadge('river', true);
        if (typeof showFeatureToast === 'function') {
            showFeatureToast('Открыта вкладка 🎣 Речка — ловите рыбу для Бобра-удильщика, чтобы улучшать его снасть и усиливать «Фишинг хук».');
        }
        if (typeof updateNavLocks === 'function') updateNavLocks();
        extraHtml += `<br><br><span style="color:#0f0;">🦫 Бобёр-удильщик присоединился к отряду (+3 🪱 Наживки)!</span>`;
    }

    // Наживка за победу в Рейде
    let featRiver = (typeof getUnlockedFeatures === 'function') ? getUnlockedFeatures(state).riverTab : false;
    if (featRiver && state.fishing) {
        let maxB = (CONFIG.fishing ? CONFIG.fishing.maxBait : 12);
        let gain = (combat.contract === 'ambush' || combat.contract === 'trial') ? 2 : 1;
        let oldB = state.fishing.bait || 0;
        let newB = Math.min(maxB, oldB + gain);
        let added = newB - oldB;
        state.fishing.bait = newB;
        if (added > 0) {
            extraHtml += `<br><span style="color:#6be;">🪱 +${added} Наживки (всего: ${newB}/${maxB})</span>`;
        }
    }

    let recLvl = Math.max(1, Math.min(25, Math.ceil(st * 0.9)));
    state.squad.forEach(id => {
        let h = state.heroes.find(x => x.id === id);
        if (!h) return;
        let heroXp = baseXp;
        let overleveled = (h.level >= recLvl + 3);
        if (overleveled) {
            heroXp = Math.max(1, Math.floor(heroXp * 0.3));
        }
        h.xp += heroXp;
        let lvled = false;
        while (h.level < 25 && h.xp >= xpNeeded(h.level)) {
            h.xp -= xpNeeded(h.level);
            h.level++;
            h.sp++;
            lvled = true;
        }
        let dbH = DB.heroes.find(x => x.id === h.dbId);
        let hName = dbH ? dbH.name : h.id;
        if (overleveled) {
            extraHtml += `<br><span style="color:#aaa;">${hName}: +${heroXp} опыта <span style="color:#f88;">(перекач −70% опыта)</span></span>`;
        }
        if (lvled) extraHtml += `<br>↑ ${hName} достиг ${h.level} ур.!`;
    });

    let neutralChance = combat.contract === 'ambush' ? CONFIG.neutrals.raidAmbushChance : CONFIG.neutrals.raidNormalChance;
    if (typeof st === 'number' && st > 1 && state.prologueCleared >= 4 && Math.random() < neutralChance) {
        let act = getActForStage(st);
        let n = pickRandomNeutralDrop(act.id);
        if (n) {
            state.neutralInv.push(n.id);
            extraHtml += `<br>🎁 Нейтральный предмет (${act.id} разряд): ${n.icon} ${n.name}`;
        }
    }

    save();

    const showVic = () => {
        document.getElementById('victory-title').innerText = isScriptedVictory ? 'СОЮЗ ЗАКЛЮЧЁН!' : 'ПОБЕДА!';
        document.getElementById('victory-title').style.color = 'gold';
        document.getElementById('victory-desc').innerHTML = `💰 +${baseGold} золота<br>⭐ +${baseXp} опыта каждому${extraHtml}`;
        document.getElementById('victory-modal').style.display = 'flex';
    };

    if (st === 1 && firstClear) {
        showStory('after_stage1', showVic, true);
    } else if (st === 8 && shouldRecruitBeaver) {
        showStory('stage8_beaver_win', showVic, true);
    } else if (st === 25 && firstClear) {
        showStory('ending_twist', showVic, true);
    } else {
        showVic();
    }
}

function loseBattle() {
    log('💀 Поражение...');
    combat.active = false;
    document.getElementById('victory-title').innerText = 'ПОРАЖЕНИЕ';
    document.getElementById('victory-title').style.color = '#f55';
    document.getElementById('victory-desc').innerHTML =
        `Отряд разбит на Этапе ${combat.stage}.<br>Подфармите золото в Лесу, купите артефакты или прокачайтесь на прошлых этапах!`;
    document.getElementById('victory-modal').style.display = 'flex';
    save();
}

function closeVictory() {
    document.getElementById('victory-modal').style.display = 'none';
    if (state.prologueCleared < 4) {
        state.selectedPrologueStage = Math.min(4, (state.prologueCleared || 0) + 1);
    } else {
        state.selectedStage = 1;
    }
    switchTab('raid');
}

/* ===== ИНИЦИАЛИЗАЦИЯ ИГРЫ ===== */
updateUI();
spawnForestCreep();
