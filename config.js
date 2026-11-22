/* ===== ЕДИНЫЙ КОНФИГ БАЛАНСА DOTA IDLE RPG v3.6 ===== */
window.CONFIG = {
    version: '3.6',
    saveKey: 'dotaSave_v3_6',

    // Щиты, Пробитие и Иммунитет
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
        }
    },

    // Лес, Травы, Сбор чая и Котелок
    forest: {
        creepsPerHerb: 50,           // +1 🌿 за каждые 50 крипов
        goblinHerbs: 1,              // +1 🌿 за Золотого Гоблина
        stackHerbs: 1,               // +1 🌿 за Стак
        runeHerbs: 1,                // +1 🌿 за Руну
        kettleMaxLevel: 10,          // Макс. уровень 🫖 Котелка
        kettleBaseCost: 5,           // Цена Котелка: 5 + ур * 3
        kettleCostStep: 3,
        kettleGoldPctPerLvl: 0.05,   // +5% золота в Лесу за ур. Котелка
        kettleHpPctPerLvl: 0.02,     // +2% макс. ЗД героям за ур. Котелка
        teas: {
            ivan_tea:      { cost: 4, atkMult: 1.12, spellAmp: 0.08 },
            chamomile_tea: { cost: 4, hpMult: 1.15,  hpRegen: 10 },
            mint_tea:      { cost: 5, startRage: 30, mpRegen: 8 }
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
