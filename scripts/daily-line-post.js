/* =========================================================
   LINE公式アカウントへの毎日の自動投稿スクリプト
   ---------------------------------------------------------
   GitHub Actions（.github/workflows/daily-line-post.yml）から
   毎日決まった時刻に自動実行される。
   季節・曜日に合わせた一言コメントをランダムに選び、
   LINE Messaging APIのbroadcast（友だち全員への配信）で送信する。

   必要な環境変数:
     LINE_CHANNEL_ACCESS_TOKEN … GitHub Secretsに保存したチャネルアクセストークン
   ========================================================= */

const GAME_URL = "https://marimo530122-cmyk.github.io/baturu-retto/";

// 月ごとの飲み会シーズンネタ
const MONTHLY_THEMES = {
  1: ["🎍 新年会シーズン到来！今年最初の一杯、盛り上げの主役はこれ", "❄️ 寒い夜こそ、罰ゲームで熱くなろう"],
  2: ["🍫 バレンタイン飲み会にもぴったり", "💴 節分×飲み会、鬼は外・盛り上がりは内"],
  3: ["🌸 送別会シーズン。最後の夜を最高の盛り上がりで締めくくろう", "🎓 卒業・異動シーズンの飲み会に"],
  4: ["🌸 花見×バツルーレットで新歓を一気に盛り上げよう", "👋 新歓コンパの空気が固いなら、これで一発解凍"],
  5: ["🍃 新緑の季節、外飲み・BBQのお供にも", "🎏 GW明けの飲み会、リフレッシュがてらいかが？"],
  6: ["☔ 梅雨のジメジメも、盛り上がりで吹き飛ばそう", "🍺 ジューンブライド二次会の余興にも"],
  7: ["🎆 夏本番！ビアガーデンの主役はこのゲーム", "🌻 暑気払い、まだ静かなら今すぐ回そう"],
  8: ["🎇 お盆の同窓会・帰省飲み会で世代を超えて盛り上がる", "🍉 真夏の飲み会、汗と一緒に照れも吹き飛ばそう"],
  9: ["🌕 十五夜の夜長は、じっくりルーレットを回すのにぴったり", "🍁 秋の気配とともに、飲み会シーズン再開"],
  10: ["🎃 ハロウィン飲み会の余興にどうぞ", "🍂 芋・栗・カボチャより盛り上がる説"],
  11: ["🦃 忘年会シーズンの幕開け、幹事の武器はこれ", "🍁 紅葉と一緒に、恋のうわさも色づくかも？"],
  12: ["🎄 忘年会・クリスマス会、今年最後の盛り上がりを", "🎊 締めの一年、締めの一杯、締めのルーレット"],
};

// 曜日ごとのひとこと（0=日曜 … 6=土曜）
const WEEKDAY_LINES = {
  5: ["🍻 花金の夜は、飲み会も最高潮に", "🎉 今夜は金曜日！盛り上げるなら今しかない"],
  6: ["🌙 土曜の夜、時間を気にせず思いっきり回そう"],
};

// 年間いつでも使える定番ネタ
const GENERIC_LINES = [
  "🎰 幹事の悩み「場が静か…」を一発で解決",
  "👑 10%の確率で王様誕生。運命のルーレット",
  "📱 スマホ1台あれば準備0秒でスタート",
  "🔥 罰ゲーム2,500通り、まだ見ぬネタがきっとある",
  "🎤 司会者ボイス付きだから、幹事も一緒に楽しめる",
];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildMessage() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const weekday = now.getDay();

  const pool = [
    ...(MONTHLY_THEMES[month] || []),
    ...(WEEKDAY_LINES[weekday] || []),
    ...GENERIC_LINES,
  ];
  const line = pickRandom(pool);

  return `${line}\n\n🎰 バツルーレット\n飲み会を爆上げする罰ゲームルーレット\n${GAME_URL}`;
}

async function main() {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    throw new Error("環境変数 LINE_CHANNEL_ACCESS_TOKEN が設定されていません");
  }

  const text = buildMessage();

  const res = await fetch("https://api.line.me/v2/bot/message/broadcast", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ messages: [{ type: "text", text }] }),
  });

  const body = await res.text();
  console.log("status:", res.status);
  console.log("response:", body);
  console.log("sent text:", text);

  if (!res.ok) {
    throw new Error(`LINE broadcast failed: ${res.status} ${body}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
