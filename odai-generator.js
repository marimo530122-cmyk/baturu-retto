/* =========================================================
   お題ジェネレーター【掛け算システム】日本語・英語対応
   シチュエーション50種 × 行動50種 = 2500通り（言語ごと）
   ---------------------------------------------------------
   使い方:
     const odai = generateOdai("たろう", "はなこ");        // 日本語
     const odai = generateOdai("Tom", "Amy", "en");       // 英語
     画面表示 → odai.displayText
     朗読     → speakOdai(odai.speechText, "ja" または "en");
   ========================================================= */

const ODAI_DATA = {

  /* =======================================================
     日本語版
     ※文法バグを防ぐため、シチュエーションは全て「〜で」
       「〜ながら」「〜風に」など次に自然につながる形で終わり、
       行動は全て「〜する」など言い切りの形で終わるよう統一。
     ======================================================= */
  ja: {
    situations: [
      "超一流ホスト（またはキャバ嬢）になりきって、甘い声で",
      "昭和のヤンキー風に、ものすごいメンチを切りながら",
      "赤ちゃんのような満面の無垢な笑顔と声で",
      "総資産3兆円の大富豪っぽく、超上から目線で",
      "テレビショッピングのプロの実演販売士っぽく、命がけで",
      "時代劇の侍になりきって、重々しい口調で",
      "究極にテンションの高いテーマパークのお姉さん風に",
      "電池が切れかけのロボットみたいに、カクカクしながら",
      "深夜ラジオのDJっぽく、ささやくような低音ボイスで",
      "謝罪会見に臨む社長風に、神妙な面持ちで",
      "オペラ歌手のように、すべてを歌にしながら",
      "熱血高校教師っぽく、涙ながらに",
      "海外セレブのインタビュー風に、英語まじりのルー語で",
      "忍者のように、周囲を警戒しながら小声で",
      "執事（またはメイド）になりきって、うやうやしく",
      "5歳児に説明するように、ものすごく優しく",
      "スポーツ実況アナウンサーっぽく、超早口で",
      "演歌歌手のように、こぶしを効かせながら",
      "眠くて仕方ない人のように、あくび混じりで",
      "アイドルのファンミーティング風に、キラキラの笑顔で",
      "校長先生の朝礼スピーチ風に、無駄に長い前置きをつけてから",
      "取り調べ中のベテラン刑事っぽく、カツ丼を差し出す勢いで",
      "魔法少女になりきって、決めポーズをつけながら",
      "超高速ラップ風に、韻を踏みながら",
      "図書館の司書さんのように、限界まで小さい声で",
      "宇宙人と初交信する研究者風に、慎重に",
      "大好物を目の前にした食レポYouTuberっぽく、大げさに",
      "老舗旅館の女将のように、丁寧すぎる敬語で",
      "筋トレ中のマッチョトレーナー風に、全身に力を込めながら",
      "世界の終わりを告げる預言者っぽく、壮大に",
      "ツンデレキャラになりきって、照れ隠しをしながら",
      "花粉症がつらすぎる人のように、鼻声で",
      "悪の組織のボスっぽく、高笑いを交えながら",
      "サスペンスドラマの自白シーン風に、崖っぷちの雰囲気で",
      "初めてのおつかいの子どものように、緊張でガチガチになりながら",
      "パリコレのトップモデルのように、ウォーキングしながら",
      "おみくじで大凶を引いた直後のテンションで",
      "人気お笑い芸人の漫才風に、ノリツッコミを入れながら",
      "生放送で緊張しすぎたレポーター風に、噛みまくりながら",
      "眠れる森の美女を起こす王子様風に、芝居がかった調子で",
      "超能力で相手の心を読んでいるフリをしながら",
      "ゾンビになりきって、うめき声まじりで",
      "人生最高の告白シーン風に、胸に手を当てながら",
      "朝の情報番組のお天気キャスターっぽく、爽やかに",
      "秘密結社の入会の儀式風に、謎の重厚感で",
      "遅刻ギリギリで駅まで走ってきた人のように、息を切らしながら",
      "世界的指揮者のように、見えないタクトを振りながら",
      "人気VTuberの生配信風に、コメントを読み上げるテイで",
      "満員電車で足を踏まれたのに謝られなかった人の顔で",
      "卒業式の答辞を読む生徒代表風に、感極まりながら",
    ],
    actions: [
      "ウーロン茶を注文する店員役を演じる",
      "今日自分が履いている靴（または靴下）の素晴らしさを熱弁する",
      "相手の目を見つめながら、良いところを照れずに3つ全力で褒めちぎる",
      "今まで誰にも言ったことがない、人生で一番ダサかった秘密を暴露する",
      "突然スマホのビデオ通話がバグって画面が固まったフリを15秒間やりきる",
      "相手を、今世紀最大の天才として全世界に紹介するプレゼンをする",
      "目の前のコップ（または飲み物）に、真剣な人生相談をする",
      "自分の名前の由来を、壮大なウソまじりで語り尽くす",
      "実は明日から宇宙に行くことになったと、重大発表をする",
      "相手の髪型を、高級ブランドの新作のように紹介する",
      "エア縄跳びを10秒間、本気でやりきる",
      "今朝食べたものを、フルコース料理の解説風に発表する",
      "相手にしか聞こえない声で、ここだけの極秘情報を耳打ちする",
      "見えないドアに頭をぶつけるパントマイムを披露する",
      "自分のスマホの充電残量を、株価の速報のように発表する",
      "もしも明日世界が終わるならどう過ごすかをスピーチする",
      "相手の利き手を、国宝級の芸術品として鑑定する",
      "自分の人生で一番古い記憶を発表する",
      "この場にいる全員のいいところを、順番にひとことずつ叫ぶ",
      "エアギターで伝説のライブのクライマックスを再現する",
      "自分の枕の寝心地を、5つ星ホテルの支配人として紹介する",
      "相手のための今日の運勢占いを、その場で即興で作って発表する",
      "相手と10秒間、真顔で見つめ合うのをやりきる",
      "一番好きな食べ物への愛を、ラブレター風に朗読する",
      "透明人間と熱い握手を交わすパントマイムをする",
      "相手の名前を使った即興の応援コールを叫ぶ",
      "実は前世で会ったことがあるという設定で、思い出話をする",
      "カバンの中の物をひとつ取り出し、通販番組風に売り込む",
      "人生で一番笑った出来事を、身振り手振りつきで再現する",
      "スローモーションで椅子から立ち上がり、また座るまでをやりきる",
      "相手のスマホを、最新鋭の秘密兵器として解説する",
      "無人島にひとつだけ持っていくなら何かを熱くプレゼンする",
      "見えない赤ちゃんをあやして、寝かしつける演技をする",
      "自分の今日のコーディネートのこだわりを解説する",
      "エレベーターが急停止した瞬間のリアクションを演じきる",
      "好きな飲み物のおいしさを、俳句または短歌で詠み上げる",
      "相手を守るボディーガードとして、周囲を10秒間警戒する",
      "自分の取扱説明書の注意事項を、3つ発表する",
      "目の前の空気を高級寿司として握り、相手に差し出す",
      "学生時代の一番の黒歴史をカミングアウトする",
      "隣の人の肩を借りて、感動のすすり泣きを10秒間やりきる",
      "10年後の自分から今の自分へのメッセージを代読する",
      "犬（または猫）になりきって、飼い主への不満を訴える",
      "その場で軽快なタップダンス風ステップを5秒間披露する",
      "相手の笑顔を、天気予報の快晴として実況する",
      "財布の中身を確認して、今月のお金の反省会を開く",
      "実は忍者の末裔ですという設定で、一族の秘密を語る",
      "目をつぶったまま自分の鼻を一発で触れるか、3回連続で挑戦する",
      "この集まりのキャッチコピーを即興で発表する",
      "全員に向かって、明日も最高の一日になると全力で宣言する",
    ],
  },

  /* =======================================================
     英語版（直訳ではなく、英語圏のパーティー文化に合わせて再構成）
     ※シチュエーションは "Like a ..." などの前置きフレーズ、
       行動は命令形で統一し、"situation, action!" の形で
       必ず自然な英文になるようにしてある。
     ======================================================= */
  en: {
    situations: [
      "Like a super-smooth five-star hotel concierge, in your silkiest voice",
      "Like a 1950s greaser giving major attitude",
      "With the pure, innocent smile and voice of a baby",
      "Like a billionaire with three trillion in the bank, looking down on everyone",
      "Like a TV shopping host selling for their life",
      "Like a medieval knight, in the most solemn tone",
      "Like the world's most hyped theme-park announcer",
      "Like a robot running out of battery, glitching mid-sentence",
      "Like a late-night radio DJ, in a whispery deep voice",
      "Like a CEO at an apology press conference, dead serious",
      "Like an opera singer, singing every single word",
      "Like a passionate high-school coach, on the verge of tears",
      "Like a Hollywood celebrity in an interview, dropping fancy words",
      "Like a ninja, whispering while scanning for enemies",
      "Like a royal butler (or maid), with utmost politeness",
      "As if explaining to a five-year-old, super gently",
      "Like a sports commentator, at maximum speed",
      "Like a country singer, with maximum twang",
      "Like someone who hasn't slept in three days, yawning constantly",
      "Like a pop star at a fan meeting, sparkling with joy",
      "Like a school principal, with a pointlessly long introduction",
      "Like a detective interrogating a suspect, leaning in close",
      "Like a magical anime hero, striking a dramatic pose",
      "In super-fast rap style, dropping rhymes",
      "Like a librarian, at the absolute quietest volume possible",
      "Like a scientist making first contact with aliens, very carefully",
      "Like a food YouTuber tasting their favorite dish, totally over the top",
      "Like a fancy restaurant sommelier, with excessive elegance",
      "Like a bodybuilder mid-workout, flexing the whole time",
      "Like a prophet announcing the end of the world, epically",
      "Like a moody anime character trying to hide their embarrassment",
      "Like someone with terrible allergies, nose fully stuffed up",
      "Like an evil villain, with dramatic laughter in between",
      "Like the confession scene of a crime drama, on the edge of a cliff",
      "Like a kid on their very first errand, frozen with nerves",
      "Like a Paris Fashion Week model, strutting the whole time",
      "With the energy of someone who just got the worst fortune ever",
      "Like a stand-up comedian, adding your own punchlines",
      "Like a nervous reporter on live TV, stumbling over every word",
      "Like a prince waking Sleeping Beauty, overly theatrical",
      "While pretending to read the other person's mind with psychic powers",
      "Like a zombie, groaning between words",
      "Like the greatest love-confession scene in movie history, hand on heart",
      "Like a cheerful morning-show weather reporter",
      "Like a secret society initiation ceremony, mysteriously solemn",
      "Like someone sprinting to catch the last train, completely out of breath",
      "Like a world-famous conductor, waving an invisible baton",
      "Like a streamer doing a live broadcast, reading fake chat comments",
      "With the face of someone whose foot just got stepped on with no apology",
      "Like a valedictorian giving a graduation speech, overcome with emotion",
    ],
    actions: [
      "act out being a waiter taking an order for iced tea",
      "passionately explain why the shoes (or socks) you're wearing today are amazing",
      "look them in the eyes and give three sincere compliments without laughing",
      "confess the most embarrassing secret you've never told anyone",
      "pretend your video call froze and hold completely still for 15 seconds",
      "introduce them to the world as the greatest genius of the century",
      "have a serious life-advice session with your drink",
      "explain the origin of your name with a completely made-up epic story",
      "announce that you're leaving for space tomorrow",
      "present their hairstyle like it's a luxury brand's new collection",
      "do air jump-rope for 10 seconds at full effort",
      "describe what you ate this morning like a fancy tasting-menu review",
      "whisper a top-secret piece of information that only they can hear",
      "perform a mime of walking into an invisible door",
      "announce your phone's battery percentage like breaking stock-market news",
      "give a speech on how you'd spend your last day if the world ended tomorrow",
      "appraise their dominant hand like it's a priceless work of art",
      "share your earliest childhood memory",
      "shout one nice thing about every single person here, one by one",
      "recreate the climax of a legendary concert on air guitar",
      "describe how comfortable your pillow is, as a five-star hotel manager",
      "invent and announce today's horoscope just for them",
      "hold a completely straight-faced staring contest with them for 10 seconds",
      "read a love letter to your favorite food out loud",
      "share a passionate handshake with an invisible person",
      "shout an improvised cheer routine using their name",
      "reminisce about the time you met them in a past life",
      "pull one item out of your bag and sell it like a TV infomercial",
      "re-enact the hardest you've ever laughed, with full gestures",
      "stand up from your chair and sit back down in extreme slow motion",
      "explain their phone like it's cutting-edge secret military technology",
      "pitch passionately the one item you'd bring to a desert island",
      "rock an invisible baby to sleep",
      "explain the fashion concept behind today's outfit",
      "act out your reaction to an elevator suddenly stopping",
      "recite a short poem about your favorite drink",
      "guard them like a bodyguard, scanning the area for 10 seconds",
      "announce three warning labels from your own instruction manual",
      "shape the air into premium sushi and serve it to them",
      "confess the most embarrassing thing you did in school",
      "borrow the shoulder of the person next to you and sob dramatically for 10 seconds",
      "read a message to yourself from your future self, 10 years from now",
      "become a dog (or cat) and complain about your owner",
      "perform five seconds of improvised tap dancing",
      "report their smile like a weather forecaster announcing perfect sunshine",
      "check your wallet and hold a review meeting about this month's spending",
      "reveal your family's secret, as a descendant of ninjas",
      "close your eyes and try to touch your nose on the first try, three times in a row",
      "come up with a catchphrase for this party and announce it",
      "declare at the top of your lungs that tomorrow will be the best day ever",
    ],
  },

  /* =======================================================
     繁體中文版（台灣・香港，直訳ではなく夜市・KTV・カンフー
     映画・占い師など現地の飲み会文化に合わせて再構成）
     ※「面子」文化への配慮として、恥をかかせすぎない
       「かわいい系の照れ・盛り上げ」に強度を抑えてある。
     situationsは「地」で終わり次のactionに自然接続、
     actionsは動詞句の言い切りで統一。
     ======================================================= */
  zh: {
    situations: [
      "像五星級飯店禮賓員一樣，用最溫柔的聲音",
      "像廟口夜市的老闆一樣，中氣十足地",
      "像剛出生的嬰兒一樣，用最純真無邪的笑容",
      "像身價三兆的富豪一樣，用超級高姿態",
      "像電視購物台的金牌主持人一樣，拼了命地",
      "像武俠片裡的絕世高手一樣，深沉地",
      "像遊樂園裡最high的迎賓姐姐一樣",
      "像電量快耗盡的機器人一樣，卡卡地",
      "像深夜廣播主持人一樣，用氣音般的低沉嗓音",
      "像召開道歉記者會的老闆一樣，一臉凝重地",
      "像歌劇演唱家一樣，把每句話都唱出來",
      "像熱血的補習班名師一樣，聲淚俱下地",
      "像剛從國外回來的網紅一樣，中英夾雜地",
      "像忍者一樣，一邊警戒四周一邊小聲地",
      "像貼身管家一樣，畢恭畢敬地",
      "像在跟五歲小孩解釋一樣，超級溫柔地",
      "像體育主播一樣，用超快語速",
      "像卡拉OK包廂裡的常客一樣，用力飆高音地",
      "像三天沒睡的人一樣，一邊打哈欠一邊",
      "像偶像見面會上的明星一樣，笑容閃閃發光地",
      "像校長朝會致詞一樣，先講一長串廢話再",
      "像資深刑警偵訊嫌犯一樣，步步逼近地",
      "像魔法少女一樣，擺出決勝姿勢",
      "像饒舌歌手一樣，用超快押韻節奏",
      "像圖書館館員一樣，用全場最小聲的音量",
      "像第一次跟外星人接觸的科學家一樣，小心翼翼地",
      "像美食網紅試吃招牌菜一樣，浮誇地",
      "像老字號餐廳的總鋪師一樣，一派大將之風地",
      "像健身教練練到一半一樣，全身肌肉緊繃地",
      "像預言世界末日的先知一樣，氣勢磅礴地",
      "像日劇裡口是心非的傲嬌角色一樣，明明害羞卻硬要裝酷地",
      "像過敏發作鼻塞嚴重的人一樣，用濃濃的鼻音",
      "像反派大魔王一樣，中間穿插一段狂笑",
      "像八點檔苦情戲認罪自白的場景一樣，豁出去地",
      "像第一次自己出門買東西的小孩一樣，緊張到僵硬地",
      "像走秀的名模一樣，一邊踩台步一邊",
      "像剛抽到下下籤一樣，帶著絕望的語氣",
      "像脫口秀演員一樣，自己加哏自己接地",
      "像現場直播突然大當機的記者一樣，結結巴巴地",
      "像喚醒睡美人的王子一樣，浮誇做作地",
      "像通靈師正在讀心一樣，故弄玄虛地",
      "像殭屍一樣，中間夾雜呻吟聲地",
      "像影史經典告白場景一樣，手放胸口深情地",
      "像晨間新聞氣象主播一樣，用陽光爽朗的語氣",
      "像神秘結社入會儀式一樣，用莫名的莊嚴感",
      "像趕最後一班捷運狂奔的人一樣，上氣不接下氣地",
      "像世界級指揮家一樣，揮舞著看不見的指揮棒",
      "像直播主唸出觀眾留言一樣，唸出一段假彈幕地",
      "像被踩到腳卻沒被道歉的乘客一樣，一臉不爽地",
      "像畢業典禮致答詞的畢業生代表一樣，感動落淚地",
    ],
    actions: [
      "扮演幫客人點烏龍茶的服務生",
      "熱血講解自己今天穿的鞋子（或襪子）有多讚",
      "直視對方雙眼，毫不害臊地稱讚對方三個優點",
      "坦白一個從沒告訴過任何人的人生最糗祕密",
      "假裝視訊突然當機畫面凍結，撐過15秒不准笑場",
      "把對方介紹成本世紀最偉大的天才",
      "對著眼前的杯子（或飲料）認真做人生諮商",
      "用超展開的瞎掰故事解釋自己名字的由來",
      "宣布自己明天要出發去外太空的重大消息",
      "把對方的髮型講成精品品牌的最新聯名款",
      "原地空氣跳繩，全力撐滿10秒",
      "把今天早餐講得像高級餐廳的套餐介紹",
      "湊到對方耳邊，小聲說出一個超級機密",
      "表演一場撞到隱形門的默劇",
      "把手機剩餘電量講得像股市即時快報",
      "發表一段如果明天世界末日你會怎麼過的演講",
      "把對方的慣用手鑑定成國寶級藝術品",
      "分享自己人生中最早的一段記憶",
      "對在場每個人依序大喊一句他的優點",
      "用空氣吉他重現傳說中演唱會的高潮片段",
      "把自己的枕頭講成五星飯店經理在介紹床墊",
      "當場即興幫對方編一則今日運勢",
      "跟對方大眼瞪小眼10秒，中途不准笑",
      "對著自己最愛的食物朗讀一封情書",
      "跟空氣中的隱形人熱情握手",
      "用對方的名字即興編一段加油口號大喊出來",
      "掰一段「其實我們上輩子見過面」的往事",
      "從包包裡拿出一樣東西，用電視購物台的口吻推銷",
      "用誇張的肢體動作重現自己人生中笑到最誇張的一次",
      "用慢動作從椅子上站起來再坐回去",
      "把對方的手機講解成最新型的秘密武器",
      "熱情推銷如果只能帶一樣東西去無人島你會帶什麼",
      "假裝手上抱著一個隱形嬰兒，輕輕搖哄入睡",
      "解說自己今天穿搭背後的時尚理念",
      "演出電梯突然緊急煞停那一瞬間的反應",
      "用一句即興小詩讚美自己最愛的飲料",
      "化身保鑣，警戒四周整整10秒",
      "發表自己使用說明書上的三條注意事項",
      "把空氣捏成高級壽司，恭敬地遞給對方",
      "坦白自己學生時代最不堪回首的黑歷史",
      "借旁邊人的肩膀，浮誇地啜泣10秒",
      "代替十年後的自己，念一段話給現在的自己聽",
      "化身一隻狗（或貓），跟大家抱怨自己的飼主",
      "原地即興尬一段5秒踢踏舞",
      "把對方的笑容播報成氣象預報裡的晴朗好天氣",
      "打開錢包檢查內容物，開一場本月花費檢討大會",
      "自稱是忍者的後代，說出一族的祕密",
      "閉上眼睛挑戰單次摸到自己鼻子，或連續成功3次",
      "幫這場聚會即興想一句宣傳標語",
      "對著全場大聲宣告明天也會是最棒的一天",
    ],
  },
};

/* ---------------------------------------------------------
   お題の生成（掛け算：50 × 50 = 2500通り）
   --------------------------------------------------------- */

// 配列からランダムに1つ選ぶ
function pickRandom(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// 直前と全く同じ組み合わせが連続で出るのを防ぐ
let lastCombinationKey = "";

/**
 * お題を生成する
 * @param {string} fromName - お題を実行する人の名前
 * @param {string} toName   - お題の相手の名前
 * @param {string} lang     - "ja"（日本語）/ "en"（英語）/ "zh"（繁體中文）
 * @returns {object} displayText: 画面表示用 / speechText: 朗読用
 */
function generateOdai(fromName, toName, lang = "ja") {
  const data = ODAI_DATA[lang] || ODAI_DATA.ja;
  let situation, action, key;

  // 同じ組み合わせが2回連続したら引き直す
  do {
    situation = pickRandom(data.situations);
    action = pickRandom(data.actions);
    key = situation + "|" + action;
  } while (key === lastCombinationKey);
  lastCombinationKey = key;

  let displayText, speechText;

  if (lang === "en") {
    displayText =
      `【${fromName}】 ➜ 【${toName}】!\n` +
      `${situation},\n` +
      `${action}!`;
    speechText =
      `${fromName}, your target is ${toName}! ${situation}, ${action}!`;
  } else if (lang === "zh") {
    displayText =
      `【${fromName}】➜【${toName}】！\n` +
      `${situation}，\n` +
      `${action}！`;
    speechText =
      `${fromName}，你的對象是${toName}！${situation}，${action}！`;
  } else {
    // 日本語：名前に「さん」を付けて「から」「へ」がどんな名前でも自然につながるようにする
    displayText =
      `【${fromName}】から【${toName}】へ！\n` +
      `${situation}、\n` +
      `${action}！`;
    speechText =
      `${fromName}さんから、${toName}さんへ！　` +
      `${situation}、${action}！`;
  }

  return {
    displayText,
    speechText: toSpeechSafe(speechText),
    situation,
    action,
  };
}

/* ---------------------------------------------------------
   朗読（Web Speech API）への最適化
   --------------------------------------------------------- */

// 読み上げで不自然になる記号を、自然な"間"に変換する
function toSpeechSafe(text) {
  return text
    .replace(/（/g, "、")          // 日本語カッコは読点に
    .replace(/）/g, "、")
    .replace(/\s*\(\s*/g, ", ")    // 英語カッコはカンマに
    .replace(/\s*\)\s*/g, ", ")
    .replace(/【|】/g, "")         // 飾りカッコは読まない
    .replace(/、、+/g, "、")       // 読点の重複を整理
    .replace(/\s+,/g, ",")         // カンマ前の空白を除去
    .replace(/,(\s*,)+/g, ",")     // カンマの重複を整理
    .replace(/ {2,}/g, " ")        // 空白の重複を整理
    .replace(/,\s*([!?.])/g, "$1"); // 文末直前の余計なカンマを除去
}

/* ---------------------------------------------------------
   声の性別を見分ける
   端末に入っている声はそれぞれ名前を持っているので、
   代表的な名前から「男性の声か、女性の声か」を判定する。
   --------------------------------------------------------- */
const FEMALE_VOICE_HINTS = [
  "female", "woman", "ayumi", "haruka", "sayaka", "nanami", "kyoko",
  "o-ren", "mizuki", "zira", "jenny", "aria", "samantha", "victoria",
  "eva", "hazel", "susan", "linda", "michelle", "sonia", "natasha",
  "hanhan", "yaoyao", "huihui", "mei-jia", "meijia", "sin-ji", "sinji", "tingting",
];
const MALE_VOICE_HINTS = [
  "male", "man", "ichiro", "keita", "otoya", "daichi", "show",
  "david", "mark", "guy", "christopher", "daniel", "alex", "fred",
  "george", "james", "ryan", "eric", "william", "liam",
  "zhiwei", "kangkang", "yunjian",
];

function classifyVoiceGender(voice) {
  const name = voice.name.toLowerCase();
  if (FEMALE_VOICE_HINTS.some((h) => name.includes(h))) return "female";
  if (MALE_VOICE_HINTS.some((h) => name.includes(h))) return "male";
  return null;
}

// 希望の言語＆性別に一番近い声を選ぶ
function pickVoice(lang, gender) {
  const prefix = lang === "en" ? "en" : lang === "zh" ? "zh" : "ja";
  const list = speechSynthesis
    .getVoices()
    .filter((v) => v.lang && v.lang.replace("_", "-").startsWith(prefix));
  if (list.length === 0) return null;
  if (gender) {
    const match = list.find((v) => classifyVoiceGender(v) === gender);
    if (match) return match;
  }
  return list[0];
}

/**
 * お題を朗読する
 * @param {string} speechText - 朗読するテキスト
 * @param {string} lang       - "ja" / "en" / "zh"
 * @param {object} persona    - 声のキャラクター設定（省略可）
 *                              例: { pitch: 0.45, rate: 0.9, gender: "male" }
 */
function speakOdai(speechText, lang = "ja", persona = null) {
  if (!("speechSynthesis" in window)) return; // 非対応ブラウザでは何もしない

  speechSynthesis.cancel(); // 前の読み上げが残っていたら止める

  const utterance = new SpeechSynthesisUtterance(speechText);
  utterance.lang = lang === "en" ? "en-US" : lang === "zh" ? "zh-TW" : "ja-JP";
  utterance.rate = persona && persona.rate ? persona.rate : 1.0;
  utterance.pitch = persona && persona.pitch ? persona.pitch : 1.1;

  const voice = pickVoice(lang, persona ? persona.gender : null);
  if (voice) utterance.voice = voice;

  // 読み上げ中はBGMを小さくして、声を聞き取りやすくする
  if (typeof BGM !== "undefined") {
    utterance.onstart = () => BGM.duck(true);
    utterance.onend = () => BGM.duck(false);
    utterance.onerror = () => BGM.duck(false);
  }

  speechSynthesis.speak(utterance);
}
