/* ===== ЕДИНЫЙ КОНФИГ БАЛАНСА DOTA IDLE RPG v4.7 ===== */
window.CONFIG = {
    version: '4.7',
    saveKey: 'dotaSave_v4_7',

    // Щиты, Пробитие, Иммунитет, мана и боевой баланс
    combat: {
        shieldDmgMult: 0.42,         // Целые щиты режут −58% урона
        bristleShieldDmgMult: 0.28,  // Бристлбэк со щитами режет −72% урона
        brokenDmgMult: 1.60,         // Пробитый враг получает +60% урона (контраст 3.81×)
        breakSkillBonus: 0.30,       // Бонус урона скиллов Пробития по уже пробитому (+30%)
        brokenTurns: 2,              // Ходы Пробития (спадает в конце активного хода врага)
        stunImmunityNormal: 2,       // ⛓️ Иммунитет к оглушению у обычных врагов и героев
        stunImmunityBoss: 3,         // ⛓️ Иммунитет к оглушению у боссов
        normalShields: {             // Щиты у обычных врагов по этапам
            early: 2,                // Этапы 2–4
            mid: 3,                  // Этапы 5–14
            late: 4                  // Этапы 15–25
        },
        intSpellAmpPerPoint: 0.005,  // +0.5% к урону маг. скиллов за каждую 1 ИНТ
        intMpMult: 8,                // Множитель пула маны от ИНТ
        intMpRegenMult: 0.09,        // Множитель регена маны от ИНТ
        attackMpGain: 18,            // Базовая атака «УДАР» восстанавливает +18 МН
        defendMpGain: 25,            // Действие «БЛОК» восстанавливает +25 МН
        enemyBaseAtkMult: 1.28,      // Множитель базовой атаки всех врагов (включая боссов)
        enemySkillDmgMult: 1.45,     // Множитель урона вражеских скиллов при касте раз в 3 хода (раз в 2 на Испытании)

        // Архетипы врагов и веса статов
        archetypes: {
            tank:    { hpMult: 1.25, atkMult: 0.85, shieldMinus: 0 },
            dd:      { hpMult: 0.80, atkMult: 1.20, shieldMinus: 0 },
            mage:    { hpMult: 0.80, atkMult: 1.15, shieldMinus: 0 },
            support: { hpMult: 0.90, atkMult: 0.80, shieldMinus: 0 },
            minion:  { hpMult: 0.50, atkMult: 0.65, shieldMinus: 1 }
        },

        // Ориентиры суммарного бюджета ЗД обычных этапов (всегда ниже босса своего Акта)
        stageHpBudgets: {
            2:  540,   3:  780,   4: 1100,
            7: 1800,   8: 2400,   9: 3000,
            12: 3600, 13: 4400,  14: 5200,
            17: 5600, 18: 6000,  19: 6500,
            22: 6200, 23: 6800
        }
    },

    // Экономика и Налог Таверны
    economy: {
        tavernTaxPerActHero: 0.40    // +40% к цене следующих героев того же Акта
    },

    // Лес, Травы, Сбор чая и Котелок
    forest: {
        creepsPerHerb: 65,           // +1 🌿 за каждые 65 крипов (акцент на Стаки и Руны)
        goblinHerbs: 1,              // +1 🌿 за Золотого Гоблина
        stackHerbs: 1,               // +1 🌿 за Стак
        stackHpMult: 1.18,           // +18% ЗД Стака крипов в Лесу
        runeHerbs: 1,                // +1 🌿 за Руну
        kettleMaxLevel: 10,          // Макс. уровень 🫖 Котелка
        kettleActCaps: {             // Потолок уровня Котелка по Актам
            1: 2,
            2: 4,
            3: 6,
            4: 8,
            5: 10
        },
        kettleCosts: [               // Двойная цена прокачки Котелка (Травы + Золото)
            { herbs: 6,   gold: 400 },
            { herbs: 10,  gold: 900 },
            { herbs: 16,  gold: 2000 },
            { herbs: 24,  gold: 4000 },
            { herbs: 34,  gold: 7000 },
            { herbs: 46,  gold: 11000 },
            { herbs: 60,  gold: 16000 },
            { herbs: 75,  gold: 22000 },
            { herbs: 92,  gold: 30000 },
            { herbs: 110, gold: 40000 }
        ],
        kettleGoldPctPerLvl: 0.05,   // +5% золота в Лесу за ур. Котелка
        kettleHpPctPerLvl: 0.02,     // +2% макс. ЗД героям за ур. Котелка

        // Ранги усиления чаёв по уровням Котелка (на чётных уровнях 0-1, 2, 4, 6, 8, 10)
        teaTiers: {
            0: {
                name: 'I. Походная',
                ivan_tea:      { cost: 3, atkMult: 1.16, spellAmp: 0.10 },
                chamomile_tea: { cost: 3, hpMult: 1.20, hpRegen: 12 },
                mint_tea:      { cost: 4, startRage: 40, mpRegen: 10 }
            },
            2: {
                name: 'II. Крепкая',
                ivan_tea:      { cost: 3, atkMult: 1.20, spellAmp: 0.14 },
                chamomile_tea: { cost: 3, hpMult: 1.25, hpRegen: 18 },
                mint_tea:      { cost: 4, startRage: 50, mpRegen: 14 }
            },
            4: {
                name: 'III. Отборная',
                ivan_tea:      { cost: 3, atkMult: 1.24, spellAmp: 0.18 },
                chamomile_tea: { cost: 3, hpMult: 1.30, hpRegen: 26 },
                mint_tea:      { cost: 4, startRage: 60, mpRegen: 18 }
            },
            6: {
                name: 'IV. Мастерская',
                ivan_tea:      { cost: 3, atkMult: 1.28, spellAmp: 0.22 },
                chamomile_tea: { cost: 3, hpMult: 1.35, hpRegen: 36 },
                mint_tea:      { cost: 4, startRage: 70, mpRegen: 22 }
            },
            8: {
                name: 'V. Чащобная',
                ivan_tea:      { cost: 3, atkMult: 1.32, spellAmp: 0.26 },
                chamomile_tea: { cost: 3, hpMult: 1.40, hpRegen: 48 },
                mint_tea:      { cost: 4, startRage: 80, mpRegen: 26 }
            },
            10: {
                name: 'VI. Легендарная',
                ivan_tea:      { cost: 3, atkMult: 1.38, spellAmp: 0.32 },
                chamomile_tea: { cost: 3, hpMult: 1.48, hpRegen: 65 },
                mint_tea:      { cost: 4, startRage: 95, mpRegen: 32 }
            }
        },
        teas: {
            ivan_tea:      { cost: 3, atkMult: 1.16, spellAmp: 0.10 },
            chamomile_tea: { cost: 3, hpMult: 1.20, hpRegen: 12 },
            mint_tea:      { cost: 4, startRage: 40, mpRegen: 10 }
        }
    },

    // Шансы выпадения нейтральных предметов
    neutrals: {
        forestCreepChance: 0.003,    // 0.3% обычный крип
        forestStackChance: 0.03,     // 3% Стак
        forestGoblinChance: 0.10,    // 10% Золотой Гоблин
        raidNormalChance: 0.05,      // 5% Обычный / Испытание
        raidAmbushChance: 0.15       // 15% Засада
    },

    // Контракты Рейда
    contracts: {
        ambush: { enemyHpMult: 1.30, enemyAtkMult: 1.25, xpMult: 1.6 },
        trial:  { enemyHpMult: 1.25, enemyShieldBonus: 2, enemyAtkMult: 1.35, enemySkillInterval: 2, goldMult: 2.1, xpMult: 1.6 }
    },

    // Конфиг рыбалки, 12-уровневая снасть и обитатели реки
    fishing: {
        maxBait: 12,
        rodActCaps: { 2: 3, 3: 6, 4: 9, 5: 12 },
        rodLevels: [
            { id: 0,  name: 'Простая удочка',     cost: 0,   dmgBonus: 0,    mpSave: 0,  exposedBonus: 0.20, extraShieldBreak: 0, rageGain: 0,  drPct: 0,    brokenMaxHpPct: 0 },
            { id: 1,  name: 'Крепкая леска',      cost: 20,  dmgBonus: 0.08, mpSave: 2,  exposedBonus: 0.20, extraShieldBreak: 0, rageGain: 0,  drPct: 0,    brokenMaxHpPct: 0 },
            { id: 2,  name: 'Свинцовое грузило',  cost: 35,  dmgBonus: 0.16, mpSave: 4,  exposedBonus: 0.22, extraShieldBreak: 0, rageGain: 0,  drPct: 0,    brokenMaxHpPct: 0 },
            { id: 3,  name: 'Стальной крючок',    cost: 50,  reqFish: 'pike',    dmgBonus: 0.24, mpSave: 6,  exposedBonus: 0.25, interruptCast: true, extraShieldBreak: 1, rageGain: 0,  drPct: 0,    brokenMaxHpPct: 0 },
            { id: 4,  name: 'Быстрая катушка',    cost: 60,  dmgBonus: 0.32, mpSave: 6,  exposedBonus: 0.25, interruptCast: true, extraShieldBreak: 1, rageGain: 6,  drPct: 0,    brokenMaxHpPct: 0 },
            { id: 5,  name: 'Тормоз катушки',     cost: 75,  dmgBonus: 0.40, mpSave: 8,  exposedBonus: 0.25, interruptCast: true, extraShieldBreak: 1, rageGain: 12, drPct: 0,    brokenMaxHpPct: 0 },
            { id: 6,  name: 'Тяжёлая катушка',    cost: 95,  reqFish: 'eel',     dmgBonus: 0.48, mpSave: 8,  exposedBonus: 0.25, interruptCast: true, extraShieldBreak: 1, rageGain: 12, frontRowRoot: true, drPct: 0,    brokenMaxHpPct: 0 },
            { id: 7,  name: 'Толстая леска',      cost: 110, dmgBonus: 0.56, mpSave: 8,  exposedBonus: 0.25, interruptCast: true, extraShieldBreak: 1, rageGain: 12, frontRowRoot: true, drPct: 0.15, brokenMaxHpPct: 0 },
            { id: 8,  name: 'Стальной поводок',   cost: 130, dmgBonus: 0.64, mpSave: 8,  exposedBonus: 0.28, interruptCast: true, extraShieldBreak: 1, rageGain: 12, frontRowRoot: true, drPct: 0.20, brokenMaxHpPct: 0 },
            { id: 9,  name: 'Двойная блесна',     cost: 160, reqFish: 'carp',    dmgBonus: 0.72, mpSave: 8,  exposedBonus: 0.28, interruptCast: true, extraShieldBreak: 1, rageGain: 18, frontRowRoot: true, drPct: 0.25, brokenMaxHpPct: 0.12 },
            { id: 10, name: 'Тросовая леска',     cost: 180, dmgBonus: 0.80, mpSave: 10, exposedBonus: 0.28, interruptCast: true, extraShieldBreak: 1, rageGain: 18, frontRowRoot: true, drPct: 0.25, brokenMaxHpPct: 0.14 },
            { id: 11, name: 'Тройной крючок',     cost: 210, dmgBonus: 0.88, mpSave: 10, exposedBonus: 0.30, interruptCast: true, extraShieldBreak: 1, rageGain: 18, frontRowRoot: true, drPct: 0.25, brokenMaxHpPct: 0.14, bleedTurns: 2 },
            { id: 12, name: 'Катушка-лебёдка',    cost: 250, reqFish: 'catfish', dmgBonus: 0.95, mpSave: 10, exposedBonus: 0.30, interruptCast: true, extraShieldBreak: 1, rageGain: 18, frontRowRoot: true, drPct: 0.25, brokenMaxHpPct: 0.16, bleedTurns: 2, executeNormal: 0.15, executeBoss: 0.10 }
        ],
        species: [
            // Акт 2 — Заводь
            { id: 'gudgeon',        name: 'Пескарь',          icon: '🐟', act: 2, rarity: 'common',    points: 10, pattern: 'smooth',      speed: 1.0,  tension: 0.25, desc: 'Спокойное плавное скольжение по центру' },
            { id: 'crucian',        name: 'Карась',            icon: '🐠', act: 2, rarity: 'common',    points: 14, pattern: 'sine',        speed: 1.1,  tension: 0.28, desc: 'Мягкие синусоидальные перепады' },
            { id: 'perch',          name: 'Колючий окунь',     icon: '🐡', act: 2, rarity: 'common',    points: 16, pattern: 'hops',        speed: 1.25, tension: 0.30, desc: 'Частые короткие подскоки' },
            { id: 'crayfish',       name: 'Речной рак',        icon: '🦞', act: 2, rarity: 'uncommon',  points: 20, pattern: 'corner_dash', speed: 1.3,  tension: 0.32, desc: 'Прячется у левого края и резко пятится в сторону' },
            { id: 'pike',           name: 'Зубастая щука',     icon: '🐊', act: 2, rarity: 'rare',      points: 26, pattern: 'ambush',      speed: 1.5,  tension: 0.38, desc: 'Замирает в засаде, затем делает длинный резкий бросок — ключ к Ур. 3' },

            // Акт 3 — Глубокий омут
            { id: 'bream',          name: 'Бронзовый лещ',     icon: '🐟', act: 3, rarity: 'common',    points: 22, pattern: 'heavy_drift', speed: 1.2,  tension: 0.35, desc: 'Тяжёлый медленный дрейф с резкой сменой направления' },
            { id: 'burbot',         name: 'Болотный налим',    icon: '🐍', act: 3, rarity: 'uncommon',  points: 28, pattern: 'edge_slip',   speed: 1.4,  tension: 0.38, desc: 'Жмётся к краям полосы и выскальзывает' },
            { id: 'glow_loach',     name: 'Светлячок-голец',   icon: '✨', act: 3, rarity: 'rare',      points: 34, herbBonus: 1, pattern: 'flicker_dash', speed: 1.6, tension: 0.40, desc: 'Мерцает и делает короткие рывки (+1 🌿 Трава)' },
            { id: 'eel',            name: 'Речной угорь',      icon: '⚡', act: 3, rarity: 'rare',      points: 38, pattern: 'zigzag',      speed: 1.7,  tension: 0.44, desc: 'Быстрые нервные зигзаги — ключ к Ур. 6' },

            // Акт 4 — Бурные пороги
            { id: 'grayling',       name: 'Речной хариус',     icon: '🐟', act: 4, rarity: 'uncommon',  points: 36, pattern: 'fast_flow',   speed: 1.75, tension: 0.45, desc: 'Быстрые проходы против течения' },
            { id: 'trout',          name: 'Радужная форель',   icon: '🐡', act: 4, rarity: 'uncommon',  points: 42, pattern: 'bouncing',    speed: 1.85, tension: 0.48, desc: 'Прыгучая траектория от края к краю' },
            { id: 'carp',           name: 'Зеркальный карп',   icon: '👑', act: 4, rarity: 'trophy',    points: 54, pattern: 'heavy_jerk',  speed: 1.9,  tension: 0.52, desc: 'Тяжёлая инерция + мощные рывки — ключ к Ур. 9' },

            // Акт 5 — Чёрный плёс
            { id: 'sturgeon',       name: 'Речной осётр',      icon: '🦈', act: 5, rarity: 'trophy',    points: 58, pattern: 'stubborn_pull', speed: 2.0, tension: 0.55, desc: 'Упорная тяга с короткими окнами передышки' },
            { id: 'catfish',        name: 'Старый сом',        icon: '🐋', act: 5, rarity: 'trophy',    points: 78, pattern: 'double_jerk', speed: 2.2,  tension: 0.60, desc: 'Двойные рывки и сильное сопротивление — ключ к Ур. 12' },

            // Особая легендарная
            { id: 'golden_crucian', name: 'Золотой карасик',   icon: '🌟', act: 3, rarity: 'legendary', points: 90, goldMult: 120, herbBonus: 2, isLegendary: true, pattern: 'shy_skitter', speed: 2.4, tension: 0.65, desc: 'Очень пугливый и быстрый (+золото, +2 🌿 Травы, реплика про 3 желания)' }
        ],
        riverFinds: [
            { id: 'boot',         name: 'Одинокий сапог',           icon: '👢', goldMult: 25, instant: true,  quote: '«Чей-то фазовый сапог... правда, один и без подошвы»' },
            { id: 'mossy_pouch',  name: 'Замшелый кошель',          icon: '💰', goldMult: 55, instant: true,  quote: '«Кто-то на переправе карман порвал — нам пригодится»' },
            { id: 'river_herbs',  name: 'Пучок речного сбора',       icon: '🌿', herbBonus: 2, instant: true,  quote: '«Свежая трава с коряги — в котелок пойдёт как родная»' },
            { id: 'bait_jar',     name: 'Затонувшая банка червей',  icon: '🪱', baitBonus: 2, instant: true,  quote: '«Вот это удача! Потратил одного — вытянул двоих»' },
            { id: 'sunken_ward',  name: 'Затонувший вард',          icon: '👁️', pointsBonus: 15, goldMult: 40, instant: true, quote: '«Ну кто ставит обзор прямо на дно реки?!»' },
            { id: 'sunken_chest', name: 'Старый сундучок',          icon: '🧰', goldMult: 90, herbBonus: 1, baitBonus: 1, neutralChance: 0.25, instant: false, quote: '«Старый сундучок со дна! Посмотрим, что внутри...»' }
        ]
    }
};

function getTeaStats(kettleLevel) {
    let kl = (kettleLevel !== undefined) ? kettleLevel : ((typeof state !== 'undefined' && state && state.kettleLevel) ? state.kettleLevel : 0);
    let tiers = (CONFIG.forest && CONFIG.forest.teaTiers) ? CONFIG.forest.teaTiers : null;
    if (!tiers) return { name: 'I. Походная', ivan_tea: { cost: 3, atkMult: 1.16, spellAmp: 0.10 }, chamomile_tea: { cost: 3, hpMult: 1.20, hpRegen: 12 }, mint_tea: { cost: 4, startRage: 40, mpRegen: 10 } };
    let lvl = Math.min(10, Math.max(0, Math.floor(kl / 2) * 2));
    return tiers[lvl] || tiers[0];
}
window.getTeaStats = getTeaStats;

function getRodStats(rodLevel) {
    let lvl = (rodLevel !== undefined) ? rodLevel : ((typeof state !== 'undefined' && state && state.fishing && state.fishing.rodLevel) ? state.fishing.rodLevel : 0);
    lvl = Math.max(0, Math.min(12, lvl));
    let levels = (CONFIG.fishing && CONFIG.fishing.rodLevels) ? CONFIG.fishing.rodLevels : null;
    if (!levels) return { id: 0, name: 'Простая удочка', cost: 0, dmgBonus: 0, mpSave: 0, exposedBonus: 0.20, extraShieldBreak: 0, rageGain: 0, drPct: 0, brokenMaxHpPct: 0 };
    return levels[lvl] || levels[0];
}
window.getRodStats = getRodStats;
