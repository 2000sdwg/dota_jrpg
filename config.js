/* ===== ЕДИНЫЙ КОНФИГ БАЛАНСА DOTA IDLE RPG v3.7 ===== */
window.CONFIG = {
    version: '3.7',
    saveKey: 'dotaSave_v3_7',

    // Щиты, Пробитие, Иммунитет и скейлинг магии
    combat: {
        shieldDmgMult: 0.80,         // Целые щиты режут −20% урона
        bristleShieldDmgMult: 0.45,  // Бристлбэк со щитами режет −55% урона
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
        intMpRegenMult: 0.18,        // Множитель регена маны от ИНТ

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

    // Лес, Травы, Сбор чая и Котелок
    forest: {
        creepsPerHerb: 35,           // +1 🌿 за каждые 35 крипов (было 50)
        goblinHerbs: 1,              // +1 🌿 за Золотого Гоблина
        stackHerbs: 1,               // +1 🌿 за Стак
        runeHerbs: 1,                // +1 🌿 за Руну
        kettleMaxLevel: 10,          // Макс. уровень 🫖 Котелка
        kettleBaseCost: 4,           // Базовая цена Котелка: 4 🌿
        kettleCostStep: 2,           // Шаг цены Котелка: +2 🌿 за ур.
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
