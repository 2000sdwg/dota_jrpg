/* ===== ЕДИНЫЙ КОНФИГ БАЛАНСА DOTA IDLE RPG v4.2 ===== */
window.CONFIG = {
    version: '4.2',
    saveKey: 'dotaSave_v4_2',

    // Щиты, Пробитие, Иммунитет, мана и боевой баланс
    combat: {
        shieldDmgMult: 0.65,         // Целые щиты режут −35% урона (было −20%)
        bristleShieldDmgMult: 0.40,  // Бристлбэк со щитами режет −60% урона (было −55%)
        brokenDmgMult: 1.20,         // Пробитый враг получает +20% урона
        breakSkillBonus: 0.25,       // Бонус урона скиллов Пробития по уже пробитому (+25%)
        brokenTurns: 2,              // Ходы Пробития (спадает в конце активного хода врага)
        stunImmunityNormal: 2,       // ⛓️ Иммунитет к оглушению у обычных врагов и героев
        stunImmunityBoss: 3,         // ⛓️ Иммунитет к оглушению у боссов
        normalShields: {             // Щиты у обычных врагов по этапам
            early: 2,                // Этапы 2–4
            mid: 3,                  // Этапы 5–14
            late: 4                  // Этапы 15–25
        },
        intSpellAmpPerPoint: 0.005,  // +0.5% к урону маг. скиллов за каждую 1 ИНТ
        intMpMult: 8,                // Множитель пула маны от ИНТ (было 12)
        intMpRegenMult: 0.09,        // Множитель регена маны от ИНТ (было 0.18)
        attackMpGain: 18,            // Базовая атака «УДАР» восстанавливает +18 МН
        defendMpGain: 25,            // Действие «БЛОК» восстанавливает +25 МН
        enemySkillDmgMult: 1.20,     // Множитель урона вражеских скиллов при касте раз в 3 хода

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
            2:  600,   3:  850,   4: 1100,
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
        ambush: { enemyHpMult: 1.25, enemyAtkMult: 1.15, xpMult: 1.6 },
        trial:  { enemyShieldBonus: 1, enemyAtkMult: 1.15, goldMult: 1.8, xpMult: 1.4 }
    }
};
