/* =========================================================
   🏆 実績・バッジシステム
   端末に一生分の記録を残し、条件を満たすとバッジが解除される。
   （表彰式は「その夜だけ」の記録、こちらは「ずっと」の記録）
   ========================================================= */

const ACHIEVEMENT_LIST = [
  { id: "first_round", emoji: "🔰", need: (s) => s.totalRounds >= 1 },
  { id: "rounds_10", emoji: "🎯", need: (s) => s.totalRounds >= 10 },
  { id: "rounds_50", emoji: "🌟", need: (s) => s.totalRounds >= 50 },
  { id: "rounds_100", emoji: "🏅", need: (s) => s.totalRounds >= 100 },
  { id: "king_1", emoji: "👑", need: (s) => s.totalKings >= 1 },
  { id: "king_10", emoji: "🤴", need: (s) => s.totalKings >= 10 },
  { id: "pass_10", emoji: "🔄", need: (s) => s.totalPasses >= 10 },
  { id: "rig_1", emoji: "🃏", need: (s) => s.totalRigs >= 1 },
  { id: "nights_5", emoji: "🌙", need: (s) => s.sessionsPlayed >= 5 },
];

// バッジの名前（言語ごと）
const ACHIEVEMENT_NAMES = {
  ja: {
    first_round: "はじめの一歩",
    rounds_10: "10ラウンド突破",
    rounds_50: "宴の達人",
    rounds_100: "バツルーレット殿堂入り",
    king_1: "はじめての王様",
    king_10: "王様体質",
    pass_10: "パスの申し子",
    rig_1: "イカサマ師デビュー",
    nights_5: "常連さん",
  },
  en: {
    first_round: "First Spin",
    rounds_10: "10 Rounds Club",
    rounds_50: "Party Master",
    rounds_100: "Hall of Fame",
    king_1: "First King",
    king_10: "Royal Blood",
    pass_10: "Pass Master",
    rig_1: "Rigger Debut",
    nights_5: "Regular",
  },
  zh: {
    first_round: "初次轉盤",
    rounds_10: "10輪達成",
    rounds_50: "派對高手",
    rounds_100: "名人堂",
    king_1: "初代國王",
    king_10: "王者體質",
    pass_10: "跳過大師",
    rig_1: "作弊初體驗",
    nights_5: "常客",
  },
  ko: {
    first_round: "첫 스핀",
    rounds_10: "10라운드 달성",
    rounds_50: "파티 마스터",
    rounds_100: "명예의 전당",
    king_1: "첫 왕",
    king_10: "왕의 혈통",
    pass_10: "패스의 달인",
    rig_1: "조작 데뷔",
    nights_5: "단골손님",
  },
  es: {
    first_round: "Primer giro",
    rounds_10: "Club de 10 rondas",
    rounds_50: "Maestro de fiestas",
    rounds_100: "Salón de la fama",
    king_1: "Primer Rey",
    king_10: "Sangre real",
    pass_10: "Maestro del pase",
    rig_1: "Debut amañado",
    nights_5: "Cliente frecuente",
  },
};

const Achievements = (() => {
  const STORAGE_KEY = "batsu-lifetime-stats";
  let stats = {
    totalRounds: 0,
    totalKings: 0,
    totalPasses: 0,
    totalRigs: 0,
    sessionsPlayed: 0,
    unlocked: [],
  };
  let onUnlock = null;

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) Object.assign(stats, JSON.parse(raw));
    } catch (e) {}
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
    } catch (e) {}
  }

  function checkUnlocks() {
    ACHIEVEMENT_LIST.forEach((a) => {
      if (!stats.unlocked.includes(a.id) && a.need(stats)) {
        stats.unlocked.push(a.id);
        if (onUnlock) onUnlock(a);
      }
    });
  }

  // 記録を1つ増やす（例: bump("totalRounds")）
  function bump(field, n = 1) {
    stats[field] = (stats[field] || 0) + n;
    checkUnlocks();
    save();
  }

  function setUnlockHandler(fn) {
    onUnlock = fn;
  }

  function get() {
    return stats;
  }

  load();
  stats.sessionsPlayed = (stats.sessionsPlayed || 0) + 1;
  save();

  return { bump, get, setUnlockHandler, list: ACHIEVEMENT_LIST };
})();
