/* ===== МОДУЛЬ РЫБАЛКИ «РЕЧКА» (v4.7) ===== */
(function() {
    'use strict';

    let fState = {
        phase: 'idle', // idle, waiting, nibble, bite, reeling, result
        target: null,
        isFind: false,
        timer: null,
        nibblesLeft: 0,
        biteTimeout: null,
        reeling: {
            hookPos: 20,
            hookVel: 0,
            hookWidth: 26,
            isHolding: false,
            fishPos: 45,
            fishPatternTime: 0,
            progress: 25,
            riskBundle: null,
            lastFrame: 0,
            animId: null
        }
    };

    function getActNumber() {
        let cleared = (typeof state !== 'undefined' && state && state.maxRaidCleared) ? state.maxRaidCleared : 0;
        if (cleared >= 20) return 5;
        if (cleared >= 15) return 4;
        if (cleared >= 10) return 3;
        return 2;
    }

    function getDepthName(act) {
        switch(act) {
            case 2: return 'Заводь (Акт 2)';
            case 3: return 'Глубокий омут (Акт 3)';
            case 4: return 'Бурные пороги (Акт 4)';
            case 5: return 'Чёрный плёс (Акт 5)';
            default: return 'Речная заводь';
        }
    }

    function pickRandomCatch(act) {
        let isFind = Math.random() < 0.13;
        if (isFind) {
            let isChest = Math.random() < 0.15; // ~2% от общего числа забросов
            if (isChest) {
                let chest = CONFIG.fishing.riverFinds.find(f => f.id === 'sunken_chest');
                return { item: chest, isFind: true, isChest: true };
            }
            let instantFinds = CONFIG.fishing.riverFinds.filter(f => f.instant);
            let chosen = instantFinds[Math.floor(Math.random() * instantFinds.length)];
            return { item: chosen, isFind: true, isChest: false };
        }

        // Рыба
        let pool = CONFIG.fishing.species.filter(s => {
            if (s.isLegendary) return act >= 3 && Math.random() < 0.035;
            return s.act <= act;
        });
        if (!pool.length) pool = CONFIG.fishing.species.filter(s => s.act <= 2);

        // Вес текущего Акта чуть выше (1.8x)
        let weighted = [];
        pool.forEach(s => {
            let w = (s.act === act) ? 3 : 1;
            if (s.rarity === 'common') w *= 3;
            else if (s.rarity === 'uncommon') w *= 2;
            else if (s.rarity === 'rare') w *= 1.2;
            else if (s.rarity === 'trophy') w *= 0.8;
            else if (s.rarity === 'legendary') w = 0.5;
            for (let i = 0; i < Math.max(1, Math.round(w * 2)); i++) {
                weighted.push(s);
            }
        });
        let chosen = weighted[Math.floor(Math.random() * weighted.length)] || pool[0];
        return { item: chosen, isFind: false, isChest: false };
    }

    function renderRiverUI() {
        let container = document.getElementById('tab-river');
        if (!container) return;

        let act = getActNumber();
        let fData = (state && state.fishing) ? state.fishing : { bait: 0, points: 0, rodLevel: 0, caughtSpecies: {}, foundCurios: {}, freshCatchBuff: false };
        let curRod = getRodStats(fData.rodLevel || 0);
        let maxBait = (CONFIG.fishing && CONFIG.fishing.maxBait) ? CONFIG.fishing.maxBait : 12;

        let actCap = (CONFIG.fishing && CONFIG.fishing.rodActCaps) ? (CONFIG.fishing.rodActCaps[act] || 3) : 3;
        let isMax = fData.rodLevel >= 12;
        let isCapLocked = !isMax && (fData.rodLevel >= actCap);
        let nextRod = isMax ? null : getRodStats((fData.rodLevel || 0) + 1);

        let reqFishCaught = true;
        let reqFishObj = null;
        if (nextRod && nextRod.reqFish) {
            reqFishObj = CONFIG.fishing.species.find(s => s.id === nextRod.reqFish);
            reqFishCaught = !!(fData.caughtSpecies && fData.caughtSpecies[nextRod.reqFish]);
        }
        let canAfford = nextRod && (fData.points >= nextRod.cost);
        let canUpgrade = !isMax && !isCapLocked && reqFishCaught && canAfford;

        // Расчёт пойманных уникальных видов (садок X / 21)
        let uniqueFishCount = 0;
        CONFIG.fishing.species.forEach(s => {
            if (fData.caughtSpecies && fData.caughtSpecies[s.id]) uniqueFishCount++;
        });
        let uniqueFindsCount = 0;
        CONFIG.fishing.riverFinds.forEach(f => {
            if (fData.foundCurios && fData.foundCurios[f.id]) uniqueFindsCount++;
        });
        let totalUnique = uniqueFishCount + uniqueFindsCount;

        let html = `
            <div class="river-header-card">
                <div class="river-stat-row">
                    <div><b>🪱 Наживка:</b> <span style="color:#0f0;">${fData.bait} / ${maxBait}</span></div>
                    <div><b>🐟 Очки улова:</b> <span style="color:gold;">${fData.points}</span></div>
                </div>
                <div class="river-stat-row" style="margin-top:4px;">
                    <div><b>🎣 Снасть:</b> <span style="color:#0ef;">${curRod.name} (Ур. ${fData.rodLevel}/12)</span></div>
                    <div><b>🌊 Глубина:</b> <span style="color:#aaa;">${getDepthName(act)}</span></div>
                </div>
            </div>

            <!-- АРЕНА РЫБАЛКИ -->
            <div class="river-game-box" id="river-game-box">
                ${renderMinigameAreaHtml(fData)}
            </div>

            <!-- КАРТОЧКА УЛУЧШЕНИЯ СНАСТИ -->
            <div class="card rod-upgrade-card" style="margin-top:8px;">
                <div style="color:gold; font-size:10px; margin-bottom:4px;">🎣 Улучшение «Фишинг хука» (Снасть Бобра)</div>
                <div style="font-size:8px; line-height:1.5; color:#ddd;">
                    <b>Текущая:</b> ${curRod.name} (Ур. ${fData.rodLevel})<br>
                    <span style="color:#8df;">${describeRodBonuses(curRod)}</span>
                </div>

                ${isMax ? `
                    <div style="margin-top:6px; color:#0f0; font-size:8px; text-align:center;">🏆 Снасть Бобра улучшена до максимума!</div>
                ` : `
                    <div style="margin-top:6px; padding-top:6px; border-top:1px dashed #444; font-size:8px; line-height:1.5;">
                        <b style="color:#ffc;">Превью следующего:</b> ${nextRod.name} (Ур. ${nextRod.id})<br>
                        <span style="color:#8fd;">${describeRodBonuses(nextRod)}</span>
                        ${nextRod.reqFish ? `
                            <div style="color:${reqFishCaught ? '#0f0' : '#fa0'}; margin-top:3px;">
                                ${reqFishCaught ? '✅' : '🔒'} Требуется поймать: ${reqFishObj ? (reqFishObj.icon + ' ' + reqFishObj.name) : nextRod.reqFish}
                            </div>
                        ` : ''}
                        ${isCapLocked ? `
                            <div style="color:#f88; margin-top:3px;">
                                🔒 Лимит Акта (макс. Ур. ${actCap}). Победите босса Акта, чтобы открыть новые глубины!
                            </div>
                        ` : ''}
                    </div>
                    <button class="upgrade-rod-btn" ${canUpgrade ? '' : 'disabled'} onclick="window.upgradeBeaverRod()" style="width:100%; margin-top:6px;">
                        ${isCapLocked ? '🔒 Лимит глубин Акта' : (canAfford ? (reqFishCaught ? `Улучшить за ${nextRod.cost} очк.` : '🔒 Требуется редкая рыба') : `Не хватает очков (${fData.points}/${nextRod.cost})`)}
                    </button>
                `}
            </div>

            <!-- СЛИВ ОЧКОВ (СВЕЖИЙ УЛОВ И ПРОДАЖА) -->
            <div class="river-dump-row" style="display:flex; gap:6px; margin-top:8px;">
                <button class="dump-btn" onclick="window.buyFreshCatchBuff()" style="flex:1;" ${fData.points >= 25 ? '' : 'disabled'}>
                    🍲 Свежий улов<br>
                    <span style="font-size:7px; color:${fData.freshCatchBuff ? '#0f0' : '#aaa'};">
                        ${fData.freshCatchBuff ? '✅ АКТИВНО (+12% ЗД Бобру)' : '25 очк. → +12% ЗД на 1 бой'}
                    </span>
                </button>
                <button class="dump-btn" onclick="window.sellCatchPointsForGold()" style="flex:1;" ${fData.points >= 20 ? '' : 'disabled'}>
                    💰 Продать улов<br>
                    <span style="font-size:7px; color:#aaa;">20 очк. → ${45 * act} G</span>
                </button>
            </div>

            <!-- РЫБНЫЙ САДОК -->
            <div class="card river-keepnet-card" style="margin-top:8px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                    <b style="color:gold; font-size:9px;">🧺 Рыбный садок</b>
                    <span style="font-size:8px; color:#8df;">Поймано: ${totalUnique} / 21</span>
                </div>

                <div style="font-size:7px; color:#aaa; margin-bottom:3px;">РЫБА И РЕЧНЫЕ ТВАРИ (15):</div>
                <div class="keepnet-grid">
                    ${CONFIG.fishing.species.map(s => {
                        let caught = fData.caughtSpecies && fData.caughtSpecies[s.id];
                        return `
                            <div class="keepnet-item ${caught ? 'caught' : 'unknown'}" onclick="window.inspectFish('${s.id}', false)">
                                <div class="keepnet-icon">${caught ? s.icon : '❓'}</div>
                                <div class="keepnet-name">${caught ? s.name : '???'}</div>
                            </div>
                        `;
                    }).join('')}
                </div>

                <div style="font-size:7px; color:#aaa; margin-top:6px; margin-bottom:3px;">НАХОДКИ СО ДНА (6):</div>
                <div class="keepnet-grid">
                    ${CONFIG.fishing.riverFinds.map(f => {
                        let caught = fData.foundCurios && fData.foundCurios[f.id];
                        return `
                            <div class="keepnet-item ${caught ? 'caught' : 'unknown'}" onclick="window.inspectFish('${f.id}', true)">
                                <div class="keepnet-icon">${caught ? f.icon : '❓'}</div>
                                <div class="keepnet-name">${caught ? f.name : '???'}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;

        container.innerHTML = html;
        bindReelingTouchEvents();
    }

    function describeRodBonuses(r) {
        if (!r) return '';
        let p = [];
        if (r.dmgBonus) p.push(`+${Math.round(r.dmgBonus * 100)}% урона Хука`);
        if (r.mpSave) p.push(`−${r.mpSave} МН`);
        if (r.exposedBonus) p.push(`Без прикрытия +${Math.round(r.exposedBonus * 100)}% физ.`);
        if (r.extraShieldBreak) p.push(`+${r.extraShieldBreak} слом 🛡️`);
        if (r.interruptCast) p.push(`срыв подготовки 🔥`);
        if (r.rageGain) p.push(`+${r.rageGain} Ярости`);
        if (r.frontRowRoot) p.push(`❄️ Оцепенение 1-го ряда`);
        if (r.drPct) p.push(`−${Math.round(r.drPct * 100)}% входящего урона (1 х.)`);
        if (r.brokenMaxHpPct) p.push(`+${Math.round(r.brokenMaxHpPct * 100)}% ЗД чистым по пробитым`);
        if (r.bleedTurns) p.push(`🩸 Кровотечение (${r.bleedTurns} х.)`);
        if (r.executeNormal) p.push(`добивание (<15% обычные, <10% боссы)`);
        return p.join(' | ') || 'Базовая удочка (без бонусов)';
    }

    function renderMinigameAreaHtml(fData) {
        if (fState.phase === 'idle') {
            return `
                <div class="river-water-view">
                    <div class="river-water-waves"></div>
                    <div class="river-beaver-sprite">🦫</div>
                    <div class="river-float-idle">🎣</div>
                    <div class="river-water-hint">Тихая гладь реки... Забросьте удочку с наживкой.</div>
                </div>
                <button class="cast-rod-btn" ${fData.bait > 0 ? '' : 'disabled'} onclick="window.castFishingRod()">
                    🎣 Забросить (1 🪱)
                </button>
            `;
        }

        if (fState.phase === 'waiting' || fState.phase === 'nibble') {
            return `
                <div class="river-water-view active-fishing" onclick="window.onEarlyTap()">
                    <div class="river-water-waves animated"></div>
                    <div class="river-beaver-sprite">🦫</div>
                    <div class="river-float-bobbing ${fState.phase === 'nibble' ? 'nibble-wobble' : ''}">🪱</div>
                    <div class="river-water-hint" style="color:#0ef;">
                        ${fState.phase === 'nibble' ? '💦 Качнулся поплавок... Ждите поклёвки!' : 'Ожидание клёва... Не дергайте раньше времени!'}
                    </div>
                </div>
                <button class="cast-rod-btn" disabled>⏳ Ожидание клёва...</button>
            `;
        }

        if (fState.phase === 'bite') {
            return `
                <div class="river-water-view bite-active" onclick="window.onBiteHookTap()">
                    <div class="river-water-waves splash-effect"></div>
                    <div class="river-beaver-sprite">🦫</div>
                    <div class="river-float-diving">💦</div>
                    <div class="bite-alert-banner">⚡ ПОДСЕКАЙ! ⚡</div>
                </div>
                <button class="cast-rod-btn bite-btn" onclick="window.onBiteHookTap()">
                    ⚡ ПОДСЕКАЙ! (НАЖМИ СЕЙЧАС)
                </button>
            `;
        }

        if (fState.phase === 'reeling') {
            let r = fState.reeling;
            let targetIcon = fState.isFind ? (fState.target.item.icon || '🧰') : (fState.target.item.icon || '🐟');
            let isInside = (r.fishPos >= r.hookPos && r.fishPos <= (r.hookPos + r.hookWidth));
            let bundle = r.riskBundle;

            return `
                <div class="reeling-arena">
                    <div class="reeling-status-bar">
                        <span style="color:#ffc;">Вываживание: ${targetIcon} ${fState.target.item.name}</span>
                        <span style="color:${isInside ? '#0f0' : '#f55'}; font-size:7px;">
                            ${isInside ? '🟢 НА КРЮЧКЕ!' : '🔴 СРЫВАЕТСЯ!'}
                        </span>
                    </div>

                    <!-- ПОЛОСА ВЫВАЖИВАНИЯ (0..100%) -->
                    <div class="reeling-track" id="reeling-track">
                        <!-- ЗЕЛЕНАЯ ЗОНА КРЮЧКА -->
                        <div class="reeling-hook-frame ${isInside ? 'in-zone' : ''}" style="left:${r.hookPos}%; width:${r.hookWidth}%;"></div>

                        <!-- РИСК-СВЕРТОК (Dredge) -->
                        ${bundle && bundle.active ? `
                            <div class="reeling-risk-bundle ${bundle.claimed ? 'claimed' : ''}" style="left:${bundle.pos}%;">
                                ${bundle.claimed ? '✨' : '📦'}
                            </div>
                        ` : ''}

                        <!-- РЫБА -->
                        <div class="reeling-fish-target" style="left:${r.fishPos}%;">
                            ${targetIcon}
                        </div>
                    </div>

                    <!-- ШКАЛА ПОИМКИ (0..100%) -->
                    <div class="catch-progress-track">
                        <div class="catch-progress-bar ${isInside ? 'filling' : 'draining'}" style="width:${Math.round(r.progress)}%;"></div>
                        <div class="catch-progress-text">${Math.round(r.progress)}%</div>
                    </div>

                    <!-- БОЛЬШАЯ ЗОНА УДЕРЖАНИЯ -->
                    <div class="reeling-hold-zone" id="reeling-hold-zone">
                        <div style="font-size:12px; font-weight:bold;">ДЕРЖАТЬ / ТЯНУТЬ</div>
                        <div style="font-size:7px; color:#aaa; margin-top:2px;">Зажмите, чтобы тянуть вправо. Отпустите — пойдёт влево.</div>
                    </div>
                </div>
            `;
        }

        return '';
    }

    /* ===== ИГРОВОЙ ЦИКЛ РЫБАЛКИ ===== */
    function castFishingRod() {
        if (!state || !state.fishing || state.fishing.bait <= 0) {
            alert('Нет наживки! Добудьте червей в Лесу или Рейдах.');
            return;
        }
        if (fState.phase !== 'idle') return;

        state.fishing.bait--;
        save();

        let act = getActNumber();
        fState.target = pickRandomCatch(act);
        fState.isFind = fState.target.isFind;
        fState.phase = 'waiting';
        fState.nibblesLeft = Math.floor(Math.random() * 2) + 1; // 1-2 ложных колебания

        renderRiverUI();
        scheduleNextEvent();
    }

    function scheduleNextEvent() {
        if (fState.timer) clearTimeout(fState.timer);

        if (fState.nibblesLeft > 0) {
            let delay = 1200 + Math.random() * 1400;
            fState.timer = setTimeout(() => {
                fState.phase = 'nibble';
                fState.nibblesLeft--;
                renderRiverUI();

                setTimeout(() => {
                    if (fState.phase === 'nibble') {
                        fState.phase = 'waiting';
                        renderRiverUI();
                        scheduleNextEvent();
                    }
                }, 800);
            }, delay);
        } else {
            // Настоящая поклёвка
            let delay = 1000 + Math.random() * 1500;
            fState.timer = setTimeout(() => {
                triggerBite();
            }, delay);
        }
    }

    function onEarlyTap() {
        if (fState.phase === 'waiting' || fState.phase === 'nibble') {
            if (fState.timer) clearTimeout(fState.timer);
            fState.phase = 'idle';
            // Наживка не сгорает при фальстарте!
            state.fishing.bait = Math.min((CONFIG.fishing ? CONFIG.fishing.maxBait : 12), state.fishing.bait + 1);
            save();
            renderRiverUI();
            if (typeof showFeatureToast === 'function') {
                showFeatureToast('⚠️ Слишком рано! Рыба испугалась, но наживка цела — забрасывайте снова.');
            }
        }
    }

    function triggerBite() {
        fState.phase = 'bite';
        renderRiverUI();

        // 0.9 сек окно на подсечку
        if (fState.biteTimeout) clearTimeout(fState.biteTimeout);
        fState.biteTimeout = setTimeout(() => {
            if (fState.phase === 'bite') {
                // Срыв из-за опоздания
                fState.phase = 'idle';
                renderRiverUI();
                if (typeof showFeatureToast === 'function') {
                    showFeatureToast('💨 Срыв! Вы опоздали с подсечкой — наживка утеряна.');
                }
            }
        }, 900);
    }

    function onBiteHookTap() {
        if (fState.phase !== 'bite') return;
        if (fState.biteTimeout) clearTimeout(fState.biteTimeout);

        // Мгновенная находка со дна
        if (fState.isFind && !fState.target.isChest) {
            claimInstantFind(fState.target.item);
            return;
        }

        // Переход к Фазе 2: вываживание
        startReeling(fState.target);
    }

    function claimInstantFind(find) {
        fState.phase = 'idle';
        let act = getActNumber();
        let fData = state.fishing;
        fData.foundCurios = fData.foundCurios || {};
        fData.foundCurios[find.id] = (fData.foundCurios[find.id] || 0) + 1;

        let rewardText = '';
        if (find.goldMult) {
            let g = find.goldMult * act;
            state.gold += g;
            rewardText += `+${g} G `;
        }
        if (find.herbBonus) {
            state.herbs = (state.herbs || 0) + find.herbBonus;
            rewardText += `+${find.herbBonus} 🌿 `;
        }
        if (find.baitBonus) {
            let maxB = (CONFIG.fishing ? CONFIG.fishing.maxBait : 12);
            let added = Math.min(maxB, fData.bait + find.baitBonus) - fData.bait;
            fData.bait = Math.min(maxB, fData.bait + find.baitBonus);
            if (added > 0) rewardText += `+${added} 🪱 `;
        }
        if (find.pointsBonus) {
            fData.points += find.pointsBonus;
            rewardText += `+${find.pointsBonus} очк. `;
        }
        save();
        renderRiverUI();

        showCatchModal(find.icon, find.name, find.quote, rewardText, 'Находка со дна!');
    }

    function startReeling(targetWrap) {
        fState.phase = 'reeling';
        let r = fState.reeling;
        r.hookPos = 20;
        r.hookVel = 0;
        r.isHolding = false;
        r.fishPos = 50;
        r.fishPatternTime = 0;
        r.progress = 25; // Успешная подсечка стартует с 25%

        // 20% шанс появления риска Dredge
        let hasRisk = Math.random() < 0.20;
        if (hasRisk) {
            r.riskBundle = {
                active: true,
                pos: Math.random() < 0.5 ? 12 : 78,
                timer: 2.5,
                holdTime: 0,
                claimed: false
            };
        } else {
            r.riskBundle = null;
        }

        r.lastFrame = performance.now();
        renderRiverUI();

        if (r.animId) cancelAnimationFrame(r.animId);
        r.animId = requestAnimationFrame(reelingLoop);
    }

    function reelingLoop(now) {
        if (fState.phase !== 'reeling') return;
        let dt = Math.min(0.1, (now - fState.reeling.lastFrame) / 1000);
        fState.reeling.lastFrame = now;

        updateReelingPhysics(dt);
        renderReelingFrame();

        if (fState.phase === 'reeling') {
            fState.reeling.animId = requestAnimationFrame(reelingLoop);
        }
    }

    function updateReelingPhysics(dt) {
        let r = fState.reeling;
        let item = fState.target.item;

        // Физика крючка: удержание тянет вправо, отпускание сносит влево
        let accel = r.isHolding ? 140 : -130;
        r.hookVel += accel * dt;
        r.hookVel = Math.max(-100, Math.min(100, r.hookVel));
        r.hookPos += r.hookVel * dt;

        if (r.hookPos < 0) { r.hookPos = 0; r.hookVel = 0; }
        if (r.hookPos > (100 - r.hookWidth)) { r.hookPos = 100 - r.hookWidth; r.hookVel = 0; }

        // AI поведение рыбы
        r.fishPatternTime += dt;
        let t = r.fishPatternTime;
        let pattern = item.pattern || 'smooth';
        let spd = item.speed || 1.0;

        let targetPos = 50;
        switch(pattern) {
            case 'smooth':
                targetPos = 50 + Math.sin(t * 1.5 * spd) * 35;
                break;
            case 'sine':
                targetPos = 50 + Math.sin(t * 2.5 * spd) * 38 + Math.cos(t * 0.8) * 10;
                break;
            case 'hops':
                targetPos = 50 + (Math.floor(t * 2.8 * spd) % 2 === 0 ? 25 : -25) + Math.sin(t * 5) * 8;
                break;
            case 'corner_dash':
                targetPos = (Math.sin(t * 1.2 * spd) > 0.3) ? 82 : 14;
                break;
            case 'ambush':
                targetPos = (Math.floor(t * spd) % 3 === 0) ? 80 : 25;
                break;
            case 'heavy_drift':
                targetPos = 50 + Math.sin(t * 0.9 * spd) * 42;
                break;
            case 'edge_slip':
                targetPos = (Math.sin(t * 2 * spd) > 0) ? 88 : 10;
                break;
            case 'flicker_dash':
                targetPos = 50 + Math.sin(t * 4 * spd) * 30 + (Math.sin(t * 9) > 0 ? 15 : -15);
                break;
            case 'zigzag':
                targetPos = 50 + (Math.sin(t * 5 * spd) > 0 ? 38 : -38);
                break;
            case 'fast_flow':
                targetPos = 50 + Math.sin(t * 3.2 * spd) * 42;
                break;
            case 'bouncing':
                targetPos = 50 + Math.sin(t * 4.2 * spd) * 44;
                break;
            case 'heavy_jerk':
                targetPos = 50 + Math.sin(t * 1.8 * spd) * 36 + (Math.sin(t * 3.5) > 0.6 ? 20 : -20);
                break;
            case 'stubborn_pull':
                targetPos = 75 + Math.sin(t * 2.2 * spd) * 20;
                break;
            case 'double_jerk':
                targetPos = 50 + Math.sin(t * 3 * spd) * 25 + (Math.sin(t * 6) > 0 ? 22 : -22);
                break;
            case 'shy_skitter':
                targetPos = 50 + Math.sin(t * 5.5 * spd) * 42;
                break;
            default: // сундучок
                targetPos = 50 + Math.sin(t * 0.8) * 25;
                break;
        }

        targetPos = Math.max(5, Math.min(95, targetPos));
        r.fishPos += (targetPos - r.fishPos) * Math.min(1, 4.5 * dt * spd);

        // Проверка нахождения в зелёной рамке
        let isInside = (r.fishPos >= r.hookPos && r.fishPos <= (r.hookPos + r.hookWidth));
        let fillRate = 18.5; // % в секунду
        let drainRate = 15.0; // % срыва в секунду

        if (isInside) {
            r.progress += fillRate * dt;
        } else {
            r.progress -= drainRate * dt;
        }

        // Риск-свёрток Dredge
        let bundle = r.riskBundle;
        if (bundle && bundle.active && !bundle.claimed) {
            bundle.timer -= dt;
            let onBundle = (bundle.pos >= r.hookPos && bundle.pos <= (r.hookPos + r.hookWidth));
            if (onBundle) {
                bundle.holdTime += dt;
                if (bundle.holdTime >= 0.6) {
                    bundle.claimed = true;
                    if (typeof showFeatureToast === 'function') {
                        showFeatureToast('✨ Затонувший свёрток подцеплен крючком!');
                    }
                }
            }
            if (bundle.timer <= 0) bundle.active = false;
        }

        if (r.progress >= 100) {
            completeReeling(true);
        } else if (r.progress <= 0) {
            completeReeling(false);
        }
    }

    function renderReelingFrame() {
        let track = document.getElementById('reeling-track');
        if (!track) return;

        let r = fState.reeling;
        let isInside = (r.fishPos >= r.hookPos && r.fishPos <= (r.hookPos + r.hookWidth));

        let hookEl = track.querySelector('.reeling-hook-frame');
        if (hookEl) {
            hookEl.style.left = r.hookPos + '%';
            hookEl.className = 'reeling-hook-frame ' + (isInside ? 'in-zone' : '');
        }

        let fishEl = track.querySelector('.reeling-fish-target');
        if (fishEl) fishEl.style.left = r.fishPos + '%';

        let bundleEl = track.querySelector('.reeling-risk-bundle');
        if (bundleEl && r.riskBundle) {
            bundleEl.style.left = r.riskBundle.pos + '%';
            if (r.riskBundle.claimed) bundleEl.classList.add('claimed');
        }

        let barEl = document.querySelector('.catch-progress-bar');
        if (barEl) {
            barEl.style.width = Math.max(0, Math.min(100, Math.round(r.progress))) + '%';
            barEl.className = 'catch-progress-bar ' + (isInside ? 'filling' : 'draining');
        }

        let txtEl = document.querySelector('.catch-progress-text');
        if (txtEl) txtEl.innerText = Math.max(0, Math.min(100, Math.round(r.progress))) + '%';
    }

    function completeReeling(success) {
        fState.phase = 'idle';
        let item = fState.target.item;
        let act = getActNumber();
        let fData = state.fishing;

        if (!success) {
            renderRiverUI();
            if (typeof showFeatureToast === 'function') {
                showFeatureToast(`💨 Срыв! ${item.name} сорвался с крючка.`);
            }
            return;
        }

        // УСПЕШНЫЙ ВЫЛОВ!
        let isFirstTime = false;
        let pointsEarned = item.points || 15;

        if (fState.isFind) {
            // Сундук
            fData.foundCurios = fData.foundCurios || {};
            fData.foundCurios[item.id] = (fData.foundCurios[item.id] || 0) + 1;
            let goldReward = (item.goldMult || 90) * act;
            state.gold += goldReward;
            state.herbs = (state.herbs || 0) + (item.herbBonus || 1);
            let maxB = (CONFIG.fishing ? CONFIG.fishing.maxBait : 12);
            fData.bait = Math.min(maxB, fData.bait + (item.baitBonus || 1));

            let extraNeutral = '';
            if (Math.random() < (item.neutralChance || 0.25)) {
                let n = pickRandomNeutralDrop(act);
                if (n) {
                    state.neutralInv.push(n.id);
                    extraNeutral = `<br>🎁 Нейтральный предмет (${act} разряд): ${n.icon} ${n.name}!`;
                }
            }
            save();
            renderRiverUI();
            showCatchModal(item.icon, item.name, item.quote, `+${goldReward} G, +1 🌿, +1 🪱${extraNeutral}`, 'Трофей со дна!');
            return;
        }

        // Рыба
        fData.caughtSpecies = fData.caughtSpecies || {};
        if (!fData.caughtSpecies[item.id]) {
            isFirstTime = true;
            pointsEarned *= 2; // ×2 за первый улов вида!
        }
        fData.caughtSpecies[item.id] = (fData.caughtSpecies[item.id] || 0) + 1;
        fData.points += pointsEarned;

        let extraReward = '';
        if (item.herbBonus) {
            state.herbs = (state.herbs || 0) + item.herbBonus;
            extraReward += ` +${item.herbBonus} 🌿 `;
        }
        if (item.goldMult) {
            let g = item.goldMult * act;
            state.gold += g;
            extraReward += ` +${g} G `;
        }

        // Награда за риск Dredge
        let bundleBonus = '';
        if (fState.reeling.riskBundle && fState.reeling.riskBundle.claimed) {
            if (Math.random() < 0.5) {
                state.herbs = (state.herbs || 0) + 1;
                bundleBonus = ' ✨ Из свёртка: +1 🌿 Трава!';
            } else {
                let bg = 50 * act;
                state.gold += bg;
                bundleBonus = ` ✨ Из свёртка: +${bg} G!`;
            }
        }

        save();
        renderRiverUI();

        let quote = (item.id === 'golden_crucian')
            ? '«Ого! Золотой карасик! Говорят, он исполняет три желания: золото, травы и верную поклёвку!»'
            : (isFirstTime ? '«Ого, новый вид в наш садок! За первый улов — двойные очки!»' : '«Отличная добыча! Пойдёт на улучшение снасти.»');

        showCatchModal(item.icon, item.name, quote, `+${pointsEarned} очков улова${isFirstTime ? ' (×2 новый вид!)' : ''}${extraReward}${bundleBonus}`, 'Улов пойман!');
    }

    function bindReelingTouchEvents() {
        let zone = document.getElementById('reeling-hold-zone');
        if (!zone) return;

        const onDown = (e) => {
            e.preventDefault();
            fState.reeling.isHolding = true;
            zone.classList.add('active');
        };
        const onUp = (e) => {
            e.preventDefault();
            fState.reeling.isHolding = false;
            zone.classList.remove('active');
        };

        zone.addEventListener('pointerdown', onDown);
        zone.addEventListener('pointerup', onUp);
        zone.addEventListener('pointercancel', onUp);
        zone.addEventListener('touchstart', onDown, { passive: false });
        zone.addEventListener('touchend', onUp, { passive: false });
        zone.addEventListener('touchcancel', onUp, { passive: false });
    }

    /* ===== УЛУЧШЕНИЯ И ОПЕРАЦИИ С ОЧКАМИ ===== */
    function upgradeBeaverRod() {
        let act = getActNumber();
        let fData = state.fishing;
        let actCap = (CONFIG.fishing && CONFIG.fishing.rodActCaps) ? (CONFIG.fishing.rodActCaps[act] || 3) : 3;

        if (fData.rodLevel >= 12) {
            alert('Снасть уже улучшена до максимума!');
            return;
        }
        if (fData.rodLevel >= actCap) {
            alert(`🔒 Лимит Акта (макс. Ур. ${actCap}). Победите босса Акта, чтобы открыть новые глубины!`);
            return;
        }

        let nextLvl = fData.rodLevel + 1;
        let nextRod = getRodStats(nextLvl);
        if (nextRod.reqFish && (!fData.caughtSpecies || !fData.caughtSpecies[nextRod.reqFish])) {
            let reqObj = CONFIG.fishing.species.find(s => s.id === nextRod.reqFish);
            alert(`🔒 Требуется поймать: ${reqObj ? reqObj.name : nextRod.reqFish}!`);
            return;
        }
        if (fData.points < nextRod.cost) {
            alert(`Не хватает очков улова (${fData.points}/${nextRod.cost})!`);
            return;
        }

        fData.points -= nextRod.cost;
        fData.rodLevel = nextLvl;
        save();
        renderRiverUI();
        if (typeof showFeatureToast === 'function') {
            showFeatureToast(`🎣 Снасть Бобра улучшена: ${nextRod.name} (Ур. ${nextLvl}/12)! «Фишинг хук» стал сильнее.`);
        }
    }

    function buyFreshCatchBuff() {
        let fData = state.fishing;
        if (fData.freshCatchBuff) {
            alert('Бафф «Свежий улов» уже активен на следующий бой (+12% ЗД Бобру)!');
            return;
        }
        if (fData.points < 25) {
            alert('Требуется 25 очков улова!');
            return;
        }
        fData.points -= 25;
        fData.freshCatchBuff = true;
        save();
        renderRiverUI();
        if (typeof showFeatureToast === 'function') {
            showFeatureToast('🍲 Свежий улов приготовлен! Бобёр-удильщик получит +12% макс. ЗД в следующем бою.');
        }
    }

    function sellCatchPointsForGold() {
        let fData = state.fishing;
        let act = getActNumber();
        if (fData.points < 20) {
            alert('Требуется минимум 20 очков улова для продажи!');
            return;
        }
        fData.points -= 20;
        let goldGain = 45 * act;
        state.gold += goldGain;
        save();
        renderRiverUI();
        if (typeof showFeatureToast === 'function') {
            showFeatureToast(`💰 Продано 20 очков улова: +${goldGain} G!`);
        }
    }

    function inspectFish(id, isFind) {
        let item = isFind
            ? CONFIG.fishing.riverFinds.find(f => f.id === id)
            : CONFIG.fishing.species.find(s => s.id === id);
        if (!item) return;

        let fData = state.fishing || {};
        let count = isFind
            ? (fData.foundCurios && fData.foundCurios[id]) || 0
            : (fData.caughtSpecies && fData.caughtSpecies[id]) || 0;

        let title = item.icon + ' ' + item.name;
        let body = count > 0
            ? `<div style="font-size:8px; line-height:1.6; color:#eee;">
                   <b>Описание:</b> ${item.desc || item.quote || 'Обитатель речных глубин.'}<br>
                   ${item.points ? `<b>Базовые очки:</b> ${item.points}<br>` : ''}
                   <b>Выловлено всего:</b> ${count} шт.
               </div>`
            : `<div style="font-size:8px; color:#aaa;">Этот вид ещё не пойман. Ловите рыбу на соответствующей глубине!</div>`;

        showCatchModal(item.icon, title, '', body, 'Справочник садка');
    }

    function showCatchModal(icon, title, quote, desc, bannerText = 'Улов!') {
        let m = document.getElementById('fish-catch-modal');
        if (!m) return;
        document.getElementById('fish-catch-icon').innerText = icon;
        document.getElementById('fish-catch-title').innerText = title;
        document.getElementById('fish-catch-banner').innerText = bannerText;
        document.getElementById('fish-catch-quote').innerHTML = quote ? `<i>${quote}</i>` : '';
        document.getElementById('fish-catch-desc').innerHTML = desc;
        m.style.display = 'flex';
    }

    function closeCatchModal() {
        let m = document.getElementById('fish-catch-modal');
        if (m) m.style.display = 'none';
    }

    // Экспорт в window
    window.renderRiverUI = renderRiverUI;
    window.castFishingRod = castFishingRod;
    window.onEarlyTap = onEarlyTap;
    window.onBiteHookTap = onBiteHookTap;
    window.upgradeBeaverRod = upgradeBeaverRod;
    window.buyFreshCatchBuff = buyFreshCatchBuff;
    window.sellCatchPointsForGold = sellCatchPointsForGold;
    window.inspectFish = inspectFish;
    window.closeCatchModal = closeCatchModal;

})();
