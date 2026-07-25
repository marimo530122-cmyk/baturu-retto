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
     ポルトガル語版（ブラジル向け。直訳ではなく churrasco・
     novela・futebol・carnavalなど現地の飲み会文化に
     合わせて再構成。situationsは次のactionに自然接続する形、
     actionsは動詞の原形で統一。
     ======================================================= */
  pt: {
    situations: [
      "Como um concierge de hotel cinco estrelas, com a voz mais suave possível",
      "Como um roqueiro dos anos 50 cheio de atitude",
      "Com o sorriso puro e inocente de um bebê",
      "Como um bilionário de três trilhões no banco, olhando todos de cima",
      "Como um apresentador de televendas vendendo com a vida",
      "Como um cavaleiro medieval, no tom mais solene possível",
      "Como o locutor mais animado de um parque de diversões",
      "Como um robô com a bateria acabando, travando no meio da frase",
      "Como um DJ de rádio da madrugada, sussurrando em voz grave",
      "Como um CEO em coletiva de imprensa pedindo desculpas, super sério",
      "Como um cantor de ópera, cantando cada palavra",
      "Como um técnico de futebol apaixonado, quase chorando",
      "Como uma celebridade em entrevista, soltando palavras difíceis",
      "Como um ninja, sussurrando enquanto observa os arredores",
      "Como um mordomo (ou governanta) real, com extrema educação",
      "Como se estivesse explicando para uma criança de cinco anos, bem gentil",
      "Como um narrador de futebol, na velocidade máxima",
      "Como um cantor de sertanejo, com o maior sofrência possível",
      "Como alguém que não dorme há três dias, bocejando sem parar",
      "Como um ídolo pop conhecendo os fãs, brilhando de alegria",
      "Como um diretor de escola, com uma introdução longa e desnecessária",
      "Como um detetive interrogando um suspeito, bem de perto",
      "Como um herói de anime, fazendo uma pose dramática",
      "No estilo rap mais rápido possível, soltando rimas",
      "Como um bibliotecário, no volume mais baixo possível",
      "Como um cientista fazendo primeiro contato com alienígenas, com muito cuidado",
      "Como um youtuber de comida provando o prato favorito, todo exagerado",
      "Como um sommelier de restaurante chique, com elegância exagerada",
      "Como um fisiculturista no meio do treino, todo tempo malhando",
      "Como um profeta anunciando o fim do mundo, de forma épica",
      "Como um personagem de novela escondendo a vergonha",
      "Como alguém com uma alergia terrível, com o nariz completamente entupido",
      "Como um vilão maligno, soltando risadas dramáticas",
      "Como a cena de confissão de uma novela das nove, no limite emocional",
      "Como uma criança no primeiro mandado sozinha, paralisada de nervoso",
      "Como um modelo de passarela em Paris, desfilando o tempo todo",
      "Com a energia de quem acabou de tirar o pior horóscopo do dia",
      "Como um comediante de stand-up, criando suas próprias piadas",
      "Como um repórter nervoso ao vivo na TV, tropeçando em cada palavra",
      "Como um príncipe acordando a Bela Adormecida, super teatral",
      "Fingindo ler a mente da outra pessoa com poderes psíquicos",
      "Como um zumbi, gemendo entre as palavras",
      "Como a maior cena de declaração de amor da história do cinema, com a mão no peito",
      "Como um apresentador de previsão do tempo animado de manhã",
      "Como um ritual secreto de iniciação, misteriosamente solene",
      "Como alguém correndo para pegar o último ônibus, completamente sem fôlego",
      "Como um maestro mundialmente famoso, regendo com uma batuta invisível",
      "Como um narrador de futebol gritando o gol do título",
      "Com a cara de quem pisaram no seu pé e nem pediram desculpa",
      "Como o orador da formatura, tomado pela emoção",
    ],
    actions: [
      "fazer o papel de garçom anotando um pedido de chá gelado",
      "explicar com paixão por que o tênis (ou meia) que está usando hoje é incrível",
      "olhar nos olhos da pessoa e fazer três elogios sinceros sem rir",
      "confessar o segredo mais vergonhoso que nunca contou a ninguém",
      "fingir que a chamada de vídeo travou e ficar completamente parado por 15 segundos",
      "apresentar a pessoa ao mundo como o maior gênio do século",
      "ter uma conversa séria de conselhos com o próprio copo",
      "explicar a origem do seu nome com uma história épica totalmente inventada",
      "anunciar que vai viajar para o espaço amanhã",
      "apresentar o penteado de alguém como se fosse lançamento de grife",
      "pular corda no ar por 10 segundos com toda a força",
      "descrever o que comeu hoje de manhã como se fosse uma resenha de restaurante chique",
      "sussurrar uma informação supersecreta que só aquela pessoa pode ouvir",
      "fazer mímica de esbarrar numa porta invisível",
      "anunciar a porcentagem da bateria do celular como se fosse notícia urgente da bolsa",
      "fazer um discurso de como passaria o último dia se o mundo acabasse amanhã",
      "avaliar a mão dominante de alguém como se fosse uma obra de arte rara",
      "compartilhar sua primeira lembrança de infância",
      "gritar uma coisa boa sobre cada pessoa presente, uma por uma",
      "recriar o clímax de um show lendário tocando violão no ar",
      "descrever o quanto seu travesseiro é confortável, como gerente de hotel cinco estrelas",
      "inventar e anunciar o horóscopo de hoje só para aquela pessoa",
      "encarar alguém sem rir por 10 segundos seguidos",
      "ler em voz alta uma carta de amor para sua comida favorita",
      "dar um aperto de mão apaixonado em uma pessoa invisível",
      "gritar uma torcida improvisada usando o nome da pessoa",
      "relembrar a vez que conheceu essa pessoa numa vida passada",
      "tirar um item da bolsa e vender como em um comercial de TV",
      "reencenar a vez que mais riu na vida, com gestos completos",
      "levantar da cadeira e sentar de novo em câmera lenta extrema",
      "explicar o celular de alguém como se fosse tecnologia militar secreta",
      "defender apaixonadamente o único item que levaria para uma ilha deserta",
      "embalar um bebê invisível para dormir",
      "explicar o conceito de moda por trás da roupa de hoje",
      "atuar a reação de um elevador que parou de repente",
      "recitar um poema curto sobre sua bebida favorita",
      "proteger alguém como segurança, vigiando a área por 10 segundos",
      "anunciar três avisos de segurança do próprio manual de instruções",
      "moldar o ar em formato de sushi premium e servir para a pessoa",
      "confessar a coisa mais vergonhosa que já fez na escola",
      "encostar no ombro de quem está ao lado e chorar dramaticamente por 10 segundos",
      "ler uma mensagem para si mesmo, enviada pelo seu eu do futuro, 10 anos depois",
      "virar um cachorro (ou gato) e reclamar do dono",
      "fazer cinco segundos de sapateado improvisado",
      "anunciar o sorriso de alguém como um meteorologista anunciando sol perfeito",
      "checar a carteira e fazer uma reunião de prestação de contas do mês",
      "revelar o segredo da família como descendente de ninjas",
      "fechar os olhos e tentar tocar o próprio nariz de primeira, três vezes seguidas",
      "criar um bordão para essa festa e anunciá-lo",
      "declarar bem alto que amanhã será o melhor dia de todos",
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

  /* =======================================================
     한국어판（韓国語、直訳ではなく王様ゲーム・노래방・회식文化に
     合わせて再構成。目上を落とすのではなく「目上の前で
     緊張する自分」を演じる方向で、面子を守る設計）
     ======================================================= */
  ko: {
    situations: [
      "최고급 호스트바 나가고 있는 사람처럼, 달콤한 목소리로",
      "조폭 영화 속 형님처럼, 눈에 힘을 잔뜩 주고",
      "갓 태어난 아기처럼, 순수한 미소와 목소리로",
      "자산 3조원의 재벌 회장처럼, 거만하게",
      "홈쇼핑 최고의 쇼호스트처럼, 목숨을 걸고",
      "사극 속 무사처럼, 근엄한 어조로",
      "놀이공원에서 제일 텐션 높은 언니처럼",
      "배터리가 다 되어가는 로봇처럼, 뚝뚝 끊기게",
      "심야 라디오 DJ처럼, 속삭이는 저음으로",
      "사과 기자회견 하는 대표처럼, 진지하게",
      "오페라 가수처럼, 모든 말을 노래로",
      "열혈 학원 강사처럼, 눈물을 흘리며",
      "해외에서 막 귀국한 인플루언서처럼, 영어를 섞어가며",
      "닌자처럼, 주변을 경계하며 작은 목소리로",
      "집사(또는 메이드)처럼, 공손하게",
      "다섯 살 아이에게 설명하듯, 아주 다정하게",
      "스포츠 캐스터처럼, 엄청 빠른 속도로",
      "노래방 단골처럼, 있는 힘껏 고음을 지르며",
      "사흘 밤을 새운 사람처럼, 하품을 섞어가며",
      "팬미팅 무대 위 아이돌처럼, 눈부신 미소로",
      "회식 자리 신입사원처럼, 잔뜩 긴장한 채",
      "베테랑 형사가 취조하듯, 한 걸음씩 다가가며",
      "마법소녀처럼, 필살기 포즈를 잡으며",
      "래퍼처럼, 초고속으로 라임을 맞춰가며",
      "도서관 사서처럼, 세상에서 제일 작은 목소리로",
      "외계인과 첫 교신하는 과학자처럼, 신중하게",
      "맛집 먹방 유튜버처럼, 오버스럽게",
      "대대로 내려오는 노포 사장님처럼, 관록 있게",
      "한창 운동 중인 트레이너처럼, 온몸에 힘을 주며",
      "세상의 종말을 예언하는 선지자처럼, 웅장하게",
      "마음은 안 그런데 괜히 새침 떠는 츤데레 캐릭터처럼",
      "비염이 심하게 온 사람처럼, 콧소리로",
      "악당 보스처럼, 중간중간 큰 웃음을 섞으며",
      "드라마 자백 장면처럼, 벼랑 끝에 몰린 심정으로",
      "첫 심부름 나온 어린아이처럼, 잔뜩 긴장해서",
      "파리 패션위크 모델처럼, 워킹을 하며",
      "뽑기에서 대흉을 뽑은 사람처럼, 절망적인 텐션으로",
      "스탠드업 코미디언처럼, 스스로 드립을 치고 받으며",
      "생방송 중 사고 난 리포터처럼, 말을 더듬으며",
      "잠자는 숲속의 공주를 깨우는 왕자처럼, 과장되게",
      "독심술사가 마음을 읽는 척하듯, 신비롭게",
      "좀비처럼, 신음소리를 섞어가며",
      "명작 영화 고백 장면처럼, 가슴에 손을 얹고",
      "아침 뉴스 날씨 캐스터처럼, 상쾌하게",
      "비밀결사 입단식처럼, 알 수 없는 진지함으로",
      "막차를 놓칠 뻔해서 전력질주하는 사람처럼, 숨을 헐떡이며",
      "세계적인 지휘자처럼, 보이지 않는 지휘봉을 흔들며",
      "인기 스트리머가 채팅을 읽어주듯",
      "만원 지하철에서 발을 밟혔는데 사과도 못 받은 표정으로",
      "졸업식 답사를 읽는 대표처럼, 감정이 북받쳐서",
    ],
    actions: [
      "우롱차 주문받는 점원 역할을 연기한다",
      "오늘 신은 신발(또는 양말)이 얼마나 멋진지 열변을 토한다",
      "상대의 눈을 바라보며 부끄러워하지 않고 장점 3가지를 칭찬한다",
      "누구에게도 말한 적 없는 인생 최고 흑역사를 고백한다",
      "영상통화가 갑자기 멈춘 척 15초간 정지 상태를 유지한다",
      "상대를 이 시대 최고의 천재라고 전 세계에 소개하는 프레젠테이션을 한다",
      "눈앞의 컵(또는 음료)에게 진지한 인생 상담을 한다",
      "자기 이름의 유래를 거창한 거짓말을 섞어 설명한다",
      "내일부터 우주로 떠난다고 중대 발표를 한다",
      "상대의 헤어스타일을 명품 브랜드 신상처럼 소개한다",
      "제자리에서 투명 줄넘기를 10초간 전력으로 한다",
      "오늘 아침에 먹은 것을 파인다이닝 코스요리처럼 설명한다",
      "상대의 귀에만 들리게 여기서만 통하는 비밀을 속삭인다",
      "보이지 않는 문에 부딪히는 마임을 선보인다",
      "자기 휴대폰 배터리 잔량을 주식 속보처럼 발표한다",
      "내일 세상이 끝난다면 어떻게 보낼지 연설한다",
      "상대의 주로 쓰는 손을 국보급 예술품처럼 감정한다",
      "자기 인생에서 가장 오래된 기억을 발표한다",
      "이 자리에 있는 모두의 장점을 한 명씩 외친다",
      "에어기타로 전설적인 콘서트의 클라이맥스를 재현한다",
      "자기 베개가 얼마나 편한지 5성급 호텔 지배인처럼 소개한다",
      "상대를 위한 오늘의 운세를 그 자리에서 즉흥으로 만들어 발표한다",
      "상대와 10초간 진지한 표정으로 눈싸움을 한다",
      "가장 좋아하는 음식에게 러브레터를 낭독한다",
      "투명인간과 뜨거운 악수를 나눈다",
      "상대의 이름을 넣어 즉흥 응원 구호를 외친다",
      "사실 전생에 만난 적이 있다는 설정으로 추억담을 이야기한다",
      "가방 속 물건 하나를 꺼내 홈쇼핑처럼 판매한다",
      "인생에서 제일 크게 웃었던 순간을 몸짓을 섞어 재현한다",
      "슬로모션으로 의자에서 일어났다 다시 앉는다",
      "상대의 휴대폰을 최첨단 비밀무기처럼 설명한다",
      "무인도에 하나만 가져간다면 무엇을 가져갈지 열정적으로 프레젠테이션한다",
      "보이지 않는 아기를 안고 재우는 연기를 한다",
      "오늘 코디에 담긴 패션 철학을 설명한다",
      "엘리베이터가 급정지하는 순간의 반응을 연기한다",
      "좋아하는 음료의 맛을 짧은 시로 낭송한다",
      "보디가드가 되어 10초간 주변을 경계한다",
      "자기 사용설명서에 있는 주의사항 3가지를 발표한다",
      "눈앞의 공기를 고급 초밥처럼 빚어 상대에게 건넨다",
      "학창시절 가장 부끄러웠던 흑역사를 고백한다",
      "옆 사람의 어깨를 빌려 10초간 오열하는 연기를 한다",
      "10년 후의 자신이 지금의 자신에게 보내는 메시지를 대신 읽는다",
      "강아지(또는 고양이)가 되어 주인에 대한 불만을 토로한다",
      "그 자리에서 즉흥으로 5초간 탭댄스를 선보인다",
      "상대의 미소를 맑음이라고 알리는 일기예보처럼 중계한다",
      "지갑을 열어 내용물을 확인하며 이달의 지출 반성회를 연다",
      "사실 자신은 닌자의 후손이라며 가문의 비밀을 이야기한다",
      "눈을 감고 단번에 자기 코를 만지거나, 3번 연속 성공에 도전한다",
      "이 모임을 위한 캐치프레이즈를 즉흥으로 만들어 발표한다",
      "모두를 향해 내일도 최고의 하루가 될 거라고 힘차게 선언한다",
    ],
  },

  /* =======================================================
     Español（スペイン語、直訳ではなく中南米・スペインの
     テレノベラ・サッカー実況・ダンス文化に合わせて再構成）
     ======================================================= */
  es: {
    situations: [
      "Como el anfitrión de un club de lujo, con la voz más dulce",
      "Como el protagonista de una telenovela en la escena de la gran traición",
      "Como un bebé recién nacido, con la sonrisa más pura",
      "Como un magnate con fortuna de tres billones, mirando a todos por encima del hombro",
      "Como el mejor comentarista de un partido de fútbol, gritando el gol",
      "Como un torero antes de la faena, con solemnidad absoluta",
      "Como el animador más entusiasta de un parque de diversiones",
      "Como un robot con la batería a punto de morir, entrecortadamente",
      "Como un locutor de radio nocturno, con una voz grave y susurrante",
      "Como un director dando una rueda de prensa de disculpas, muy serio",
      "Como un cantante de ópera, convirtiendo cada palabra en canto",
      "Como un profesor apasionado, con lágrimas en los ojos",
      "Como una estrella recién llegada de Hollywood, mezclando palabras en inglés",
      "Como un ninja, susurrando mientras vigilas los alrededores",
      "Como un mayordomo de la realeza, con extrema cortesía",
      "Como si le explicaras algo a un niño de cinco años, con muchísima ternura",
      "Como un comentarista deportivo, a toda velocidad",
      "Como el rey del karaoke en plena noche, sacando la voz al máximo",
      "Como alguien que no duerme hace tres días, entre bostezos",
      "Como un ídolo del pop en un encuentro con fans, con una sonrisa radiante",
      "Como el director de una escuela dando un discurso interminable antes de ir al grano",
      "Como un detective interrogando a un sospechoso, acercándote paso a paso",
      "Como una heroína mágica de anime, en tu pose final",
      "Como un rapero, improvisando rimas a toda velocidad",
      "Como un bibliotecario, con el volumen más bajo posible",
      "Como un científico haciendo primer contacto con extraterrestres, con muchísimo cuidado",
      "Como un youtuber de comida probando el plato estrella, de forma exagerada",
      "Como el chef de un restaurante familiar de toda la vida, con total autoridad",
      "Como un entrenador personal a mitad de rutina, tensando cada músculo",
      "Como un profeta anunciando el fin del mundo, de forma épica",
      "Como un personaje de telenovela que niega sus sentimientos, fingiendo indiferencia",
      "Como alguien con una alergia terrible, con la nariz completamente tapada",
      "Como el villano de la película, soltando una carcajada malvada de vez en cuando",
      "Como la escena de confesión de un thriller, al borde del abismo",
      "Como un niño haciendo su primer mandado solo, paralizado de nervios",
      "Como una top model en la Semana de la Moda de París, desfilando",
      "Con la energía de quien acaba de recibir la peor noticia del mundo",
      "Como un comediante de stand-up, improvisando tu propio remate",
      "Como un reportero en vivo que se traba con cada palabra",
      "Como el príncipe que despierta a la Bella Durmiente, de forma exageradamente teatral",
      "Como si leyeras la mente con poderes psíquicos, con mucho misterio",
      "Como un zombi, entre gemidos",
      "Como la escena de amor más famosa del cine, con la mano en el corazón",
      "Como el presentador del clima en las noticias matutinas, con mucha energía",
      "Como el ritual de iniciación de una sociedad secreta, con solemnidad misteriosa",
      "Como alguien corriendo para no perder el último tren, sin aliento",
      "Como un director de orquesta de fama mundial, agitando una batuta invisible",
      "Como un streamer leyendo comentarios falsos del chat en vivo",
      "Con la cara de quien le pisaron el pie en el metro y nadie se disculpó",
      "Como el mejor amigo dando el discurso en una boda, a punto de llorar de la emoción",
    ],
    actions: [
      "actuar como el mesero que toma el pedido de un té helado",
      "explicar con pasión por qué los zapatos (o calcetines) que llevas hoy son una maravilla",
      "mirar a los ojos de la otra persona y darle tres cumplidos sinceros sin reírte",
      "confesar el secreto más vergonzoso que nunca le has contado a nadie",
      "fingir que se congeló tu videollamada y quedarte inmóvil 15 segundos",
      "presentar a esa persona como el genio más grande del siglo",
      "tener una sesión seria de consejos de vida con tu bebida",
      "explicar el origen de tu nombre con una historia completamente inventada",
      "anunciar que mañana te vas al espacio",
      "presentar el peinado de esa persona como la nueva colección de una marca de lujo",
      "saltar la cuerda imaginaria durante 10 segundos con toda tu energía",
      "describir lo que desayunaste como si fuera el menú de un restaurante de lujo",
      "susurrarle al oído un secreto que solo esa persona puede escuchar",
      "hacer un mimo de chocar contra una puerta invisible",
      "anunciar el porcentaje de batería de tu celular como una noticia de última hora",
      "dar un discurso sobre cómo pasarías tu último día si el mundo se acabara mañana",
      "tasar la mano dominante de esa persona como si fuera una obra de arte invaluable",
      "compartir tu recuerdo más antiguo de la infancia",
      "gritarle a cada persona presente algo bueno de ella, una por una",
      "recrear el clímax de un concierto legendario con guitarra de aire",
      "describir lo cómoda que es tu almohada como el gerente de un hotel de cinco estrellas",
      "inventar y anunciar el horóscopo de hoy solo para esa persona",
      "hacer un concurso de miradas serias con esa persona durante 10 segundos",
      "leerle una carta de amor a tu comida favorita",
      "darle un apretón de manos apasionado a una persona invisible",
      "gritar una porra improvisada usando el nombre de esa persona",
      "contar una anécdota de cuando se conocieron en una vida pasada",
      "sacar algo de tu bolso y venderlo como en un comercial de televisión",
      "recrear con gestos exagerados la vez que más te has reído en tu vida",
      "levantarte de la silla y volver a sentarte en cámara lenta",
      "explicar el celular de esa persona como si fuera tecnología militar secreta",
      "presentar con pasión qué te llevarías si solo pudieras tener una cosa en una isla desierta",
      "mecer a un bebé invisible para dormirlo",
      "explicar el concepto de moda detrás de tu outfit de hoy",
      "actuar tu reacción a un elevador que se detiene de golpe",
      "recitar un pequeño poema sobre tu bebida favorita",
      "hacer de guardaespaldas, vigilando la zona durante 10 segundos",
      "anunciar tres advertencias de tu propio manual de instrucciones",
      "moldear el aire como si fuera sushi de lujo y ofrecérselo a esa persona",
      "confesar lo más vergonzoso que hiciste en la escuela",
      "usar el hombro de la persona de al lado y sollozar dramáticamente 10 segundos",
      "leer un mensaje de tu yo del futuro, dentro de 10 años, para tu yo de ahora",
      "convertirte en perro (o gato) y quejarte de tu dueño",
      "hacer una rutina improvisada de tap de 5 segundos",
      "reportar la sonrisa de esa persona como el clima perfecto en un pronóstico",
      "revisar tu cartera y hacer una junta de revisión de tus gastos del mes",
      "revelar el secreto de tu familia como descendiente de ninjas",
      "cerrar los ojos e intentar tocarte la nariz al primer intento, o lograrlo 3 veces seguidas",
      "inventar una frase publicitaria para esta reunión",
      "declarar a todo pulmón que mañana también será el mejor día de sus vidas",
    ],
  },

  /* =======================================================
     ベトナム語版（直訳ではなく、karaoke・"1-2-3 dzô"（乾杯の
     掛け声）・bia hơiなど現地の飲み会文化に合わせて再構成。
     situationsは次のactionに自然接続する形で統一。
     ======================================================= */
  vi: {
    situations: [
      "Như một lễ tân khách sạn 5 sao siêu sang, với giọng nói ngọt ngào nhất",
      "Như một tay chơi thập niên 50, đầy chất ngầu",
      "Với nụ cười ngây thơ trong sáng của một em bé",
      "Như một tỷ phú ba nghìn tỷ trong ngân hàng, nhìn mọi người từ trên xuống",
      "Như một MC bán hàng trên TV, bán bằng cả mạng sống",
      "Như một hiệp sĩ thời trung cổ, với giọng điệu trang nghiêm nhất",
      "Như người dẫn chương trình công viên giải trí hào hứng nhất thế giới",
      "Như một robot sắp hết pin, giật giật giữa câu nói",
      "Như một DJ radio nửa đêm, giọng trầm thì thầm",
      "Như một CEO trong buổi họp báo xin lỗi, cực kỳ nghiêm túc",
      "Như một ca sĩ opera, hát từng chữ một",
      "Như một huấn luyện viên bóng đá đầy nhiệt huyết, gần như muốn khóc",
      "Như một ngôi sao nổi tiếng trả lời phỏng vấn, dùng toàn từ ngữ hoa mỹ",
      "Như một ninja, thì thầm trong khi cảnh giác xung quanh",
      "Như một quản gia (hoặc người giúp việc) hoàng gia, cực kỳ lịch sự",
      "Như đang giải thích cho một đứa trẻ 5 tuổi, siêu nhẹ nhàng",
      "Như một bình luận viên bóng đá, với tốc độ tối đa",
      "Như một ca sĩ nhạc bolero, sến súa hết cỡ",
      "Như người ba ngày chưa ngủ, ngáp liên tục",
      "Như một ngôi sao nhạc pop gặp fan, lấp lánh niềm vui",
      "Như một hiệu trưởng, với phần mở đầu dài dòng không cần thiết",
      "Như một thám tử thẩm vấn nghi phạm, ghé sát vào mặt",
      "Như một anh hùng anime, tạo dáng đầy kịch tính",
      "Với phong cách rap nhanh nhất, thả vần liên tục",
      "Như một thủ thư, với âm lượng nhỏ nhất có thể",
      "Như một nhà khoa học lần đầu tiếp xúc với người ngoài hành tinh, cực kỳ thận trọng",
      "Như một YouTuber ẩm thực nếm món ăn yêu thích, phóng đại hết cỡ",
      "Như một sommelier nhà hàng sang trọng, thanh lịch quá mức",
      "Như một vận động viên thể hình đang tập, gồng cơ suốt",
      "Như một nhà tiên tri thông báo tận thế, đầy hoành tráng",
      "Như một nhân vật anime đang cố che giấu sự ngại ngùng",
      "Như người bị dị ứng nặng, nghẹt mũi hoàn toàn",
      "Như một kẻ phản diện độc ác, cười lớn đầy kịch tính",
      "Như cảnh thú tội trong phim hình sự, căng thẳng đến nghẹt thở",
      "Như một đứa trẻ lần đầu đi mua đồ một mình, cứng người vì lo lắng",
      "Như một người mẫu tuần lễ thời trang Paris, catwalk suốt",
      "Với năng lượng của người vừa bốc phải quẻ xui nhất",
      "Như một diễn viên hài độc thoại, tự thêm câu chốt hài hước",
      "Như một phóng viên run rẩy trên sóng trực tiếp, vấp từng chữ",
      "Như một hoàng tử đánh thức Người đẹp ngủ trong rừng, cực kỳ kịch tính",
      "Trong khi giả vờ đọc được suy nghĩ của người khác bằng siêu năng lực",
      "Như một xác sống, rên rỉ giữa các từ",
      "Như cảnh tỏ tình vĩ đại nhất lịch sử điện ảnh, tay đặt lên ngực",
      "Như một người dẫn bản tin thời tiết buổi sáng đầy tươi vui",
      "Như một nghi lễ nhập hội bí mật, trang nghiêm đầy bí ẩn",
      "Như người chạy hết tốc lực để kịp chuyến tàu cuối, thở không ra hơi",
      "Như một nhạc trưởng nổi tiếng thế giới, vung chiếc đũa chỉ huy vô hình",
      "Như một streamer đang livestream, đọc bình luận tưởng tượng",
      "Với gương mặt của người vừa bị giẫm chân mà không được xin lỗi",
      "Như thủ khoa đọc diễn văn tốt nghiệp, xúc động nghẹn ngào",
    ],
    actions: [
      "diễn vai bồi bàn nhận order một ly trà đá",
      "giải thích đầy nhiệt huyết vì sao đôi giày (hoặc đôi vớ) đang mang hôm nay tuyệt vời đến vậy",
      "nhìn thẳng vào mắt người đó và khen 3 lời chân thành không được cười",
      "thú nhận bí mật xấu hổ nhất chưa từng kể cho ai",
      "giả vờ cuộc gọi video bị đơ và đứng yên hoàn toàn trong 15 giây",
      "giới thiệu người đó với cả thế giới là thiên tài vĩ đại nhất thế kỷ",
      "tổ chức một buổi tư vấn cuộc sống nghiêm túc với ly nước của mình",
      "giải thích nguồn gốc tên của mình bằng một câu chuyện hoành tráng hoàn toàn bịa đặt",
      "tuyên bố rằng ngày mai sẽ bay vào vũ trụ",
      "giới thiệu kiểu tóc của ai đó như thể đó là bộ sưu tập mới của một thương hiệu xa xỉ",
      "nhảy dây tưởng tượng hết sức trong 10 giây",
      "miêu tả món ăn sáng nay như đang review thực đơn nhà hàng cao cấp",
      "thì thầm một thông tin tuyệt mật mà chỉ người đó nghe được",
      "diễn kịch câm cảnh đi vào một cánh cửa vô hình",
      "thông báo phần trăm pin điện thoại như đang đọc tin nóng chứng khoán",
      "phát biểu về cách bạn sẽ dùng ngày cuối cùng nếu ngày mai tận thế",
      "định giá bàn tay thuận của ai đó như một tác phẩm nghệ thuật vô giá",
      "kể lại ký ức tuổi thơ sớm nhất của mình",
      "hô to một điều tốt đẹp về từng người có mặt ở đây, lần lượt",
      "tái hiện cao trào của một buổi hòa nhạc huyền thoại bằng guitar hơi",
      "miêu tả chiếc gối của mình êm như thế nào, như một quản lý khách sạn 5 sao",
      "tự bịa và công bố tử vi hôm nay dành riêng cho người đó",
      "thi nhìn nhau không cười trong 10 giây với người đó",
      "đọc to một bức thư tình gửi cho món ăn yêu thích của mình",
      "bắt tay đầy cảm xúc với một người vô hình",
      "hô vang một bài cổ vũ ngẫu hứng dùng tên của người đó",
      "hồi tưởng lại lần gặp người đó ở kiếp trước",
      "lấy một món đồ trong túi ra và rao bán như quảng cáo trên TV",
      "tái hiện lần cười to nhất trong đời, với đầy đủ động tác",
      "đứng dậy khỏi ghế rồi ngồi xuống lại theo kiểu chuyển động chậm cực đoan",
      "giải thích chiếc điện thoại của ai đó như thể là công nghệ quân sự tối mật",
      "thuyết trình đầy nhiệt huyết về món đồ duy nhất sẽ mang theo đến hoang đảo",
      "ru một em bé vô hình ngủ",
      "giải thích ý tưởng thời trang đằng sau bộ trang phục hôm nay",
      "diễn lại phản ứng khi thang máy đột ngột dừng lại",
      "đọc một bài thơ ngắn về thức uống yêu thích của mình",
      "bảo vệ người đó như vệ sĩ, quan sát xung quanh trong 10 giây",
      "công bố ba lời cảnh báo từ sách hướng dẫn sử dụng của chính mình",
      "nặn không khí thành sushi cao cấp và mời người đó",
      "thú nhận điều xấu hổ nhất từng làm ở trường",
      "mượn vai người bên cạnh và khóc nức nở đầy kịch tính trong 10 giây",
      "đọc một tin nhắn gửi cho chính mình từ bản thân 10 năm sau",
      "biến thành chó (hoặc mèo) và than phiền về chủ nhân",
      "biểu diễn 5 giây nhảy tap ngẫu hứng",
      "thông báo nụ cười của ai đó như một dự báo thời tiết nắng đẹp hoàn hảo",
      "kiểm tra ví và tổ chức một cuộc họp báo cáo chi tiêu tháng này",
      "tiết lộ bí mật gia tộc với tư cách hậu duệ ninja",
      "nhắm mắt và cố chạm vào mũi mình ngay lần đầu, làm liên tiếp 3 lần",
      "nghĩ ra một câu khẩu hiệu cho bữa tiệc này và công bố nó",
      "hô thật to rằng ngày mai sẽ là ngày tuyệt vời nhất từ trước đến giờ",
    ],
  },
};

/* ---------------------------------------------------------
   💌 恋愛特化パック（有料機能）
   シチュエーション25種 × 行動25種 = 625通り（現在は日本語・英語のみ）
   ※恋愛は「褒める・照れる・盛り上げる」までに統一し、
     キス・身体的接触は入れない（世界お題ガイドの禁止事項に準拠）
   --------------------------------------------------------- */
const ROMANCE_DATA = {
  ja: {
    situations: [
      "告白直前のドキドキを隠しきれずに",
      "好きな人の前で緊張して声が裏返りながら",
      "少女漫画のヒロインになりきって、恥じらいながら",
      "運命の相手を見つけた占い師のように、確信を持って",
      "恋愛リアリティ番組の告白シーンのように、カメラ目線で",
      "好きな人を目の前にして舞い上がる気持ちを抑えきれずに",
      "初めてのデートで緊張している大学生のように",
      "ラブソングの主人公になりきって、切なく",
      "幼なじみに今更ときめいてしまった顔で",
      "遠距離恋愛中の恋人に電話するときのような優しい声で",
      "プロポーズを控えた恋人のように、真剣な眼差しで",
      "恋のキューピッドになりきって、2人を後押しするように",
      "花束を抱えた告白直前の男の子のように",
      "恋占いの結果に一喜一憂する乙女のように",
      "好きな人からの返信を待つ間のソワソワした様子で",
      "映画のクライマックスの告白シーンのような緊張感で",
      "恋人の写真を見て頬が緩んでしまった顔で",
      "デート前に鏡の前で自分を磨き上げる気持ちで",
      "好きな人にだけ見せる特別な笑顔で",
      "恋文をしたためる文豪のように、情熱的に",
      "両想いだと分かった瞬間の飛び上がりたい気持ちで",
      "恋のライバルに宣戦布告するように、堂々と",
      "好きな人の名前を呼ぶだけで照れてしまう様子で",
      "運命の再会を果たした恋人たちのように、感極まって",
      "永遠の愛を誓う結婚式のスピーチのように",
    ],
    actions: [
      "相手の目を見つめながら「好き」だと3回、違う言い方で伝える",
      "相手のことが好きになった瞬間を、思い出話として語る",
      "相手への愛のメッセージを、その場で即興の詩にして贈る",
      "相手の手を取るふりをして、エスコートする紳士（淑女）を演じる",
      "相手の名前を、世界で一番かわいい響きだと熱弁する",
      "もし付き合うならの妄想デートプランを情熱的に発表する",
      "相手の好きなところを、10秒間止まらずに言い続ける",
      "相手との将来の夢（新婚旅行先など）を熱く語る",
      "相手に贈る指輪を選ぶジュエリーショップの店員を演じる",
      "相手のために書いたラブレターを、その場で朗読する",
      "相手の笑顔が世界を救うレベルだと大げさに褒め称える",
      "好き避けしてしまっていたことを、今さら白状する",
      "相手との出会いに運命を感じたと、壮大に語る",
      "相手の一日を気遣う優しいメッセージを、声に出して考える",
      "相手のことを想いながら、空に向かって愛の叫びをする",
      "相手をお姫様（王子様）扱いする執事（メイド）を演じる",
      "相手のためだけの特別な愛称を、その場で考えて発表する",
      "相手との相性を、占い師のように占って発表する",
      "相手に贈る誕生日サプライズの計画を、興奮気味に発表する",
      "相手の魅力を、就活の自己PRのような熱意でプレゼンする",
      "相手と両想いになれた喜びを、全身で表現する",
      "相手への想いを我慢できず、突然の愛の告白をする",
      "相手の隣にいるだけで幸せだという気持ちを、静かに伝える",
      "相手のことを想って書いた日記の一部を、恥ずかしそうに読み上げる",
      "一生大切にするという誓いの言葉を、結婚式のスピーチ風に述べる",
    ],
  },
  en: {
    situations: [
      "Barely holding back the nerves right before a confession",
      "With your voice cracking from nervousness in front of your crush",
      "Like the heroine of a romance movie, blushing the whole time",
      "Like a fortune teller who just found your soulmate, with total certainty",
      "Like the confession scene of a dating reality show, straight to camera",
      "Unable to hide how giddy you are around your crush",
      "Like a nervous college student on a first date",
      "Like the lead singer of a heartfelt love song",
      "With the face of someone who just realized they like their childhood friend",
      "In the gentle voice you'd use calling a long-distance partner",
      "With the serious gaze of someone about to propose",
      "Like a matchmaking cupid, cheering the couple on",
      "Like someone about to confess with a bouquet in hand",
      "Like someone anxiously reading their love horoscope",
      "Fidgeting nervously while waiting for a text back",
      "With the tension of a movie's big confession scene",
      "With the face of someone smiling at a photo of their crush",
      "With the determination of someone getting ready for a big date",
      "With a special smile reserved only for the one you love",
      "Like a passionate poet writing a love letter",
      "Wanting to jump for joy the moment you found out it's mutual",
      "Like boldly declaring war on a rival in love",
      "Blushing just from saying your crush's name out loud",
      "Overcome with emotion like reuniting with the love of your life",
      "Like a wedding speech vowing eternal love",
    ],
    actions: [
      "look them in the eyes and say \"I like you\" three different ways",
      "tell the story of the exact moment you fell for them",
      "improvise a love poem for them on the spot",
      "pretend to take their hand and escort them like a true gentleman (or lady)",
      "passionately argue that their name is the cutest name in the world",
      "pitch an imaginary dream date plan, \"if we were dating\"",
      "list what you like about them non-stop for 10 seconds",
      "talk excitedly about a future dream together, like a honeymoon destination",
      "act like a jewelry store clerk helping pick out their ring",
      "read out loud a love letter you supposedly wrote for them",
      "gush that their smile could single-handedly save the world",
      "finally confess that you've been acting distant because you actually like them",
      "dramatically describe how meeting them felt like fate",
      "say out loud the caring text message you'd send checking on their day",
      "shout your feelings for them up at the sky",
      "play the part of a butler (or maid) treating them like royalty",
      "come up with a special nickname just for them, right now",
      "read their compatibility with you like a fortune teller",
      "excitedly reveal your plan for their surprise birthday party",
      "pitch their best qualities like a job interview self-promotion",
      "celebrate finding out your feelings are mutual with your whole body",
      "suddenly confess your feelings, unable to hold them back any longer",
      "quietly express how just being next to them makes you happy",
      "shyly read a line from a diary entry you wrote about them",
      "deliver a wedding-speech-style vow to cherish them forever",
    ],
  },
};

/* ---------------------------------------------------------
   🔞 大人向けパック（有料機能・年齢確認必須）
   シチュエーション20種 × 行動20種 = 400通り（現在は日本語・英語のみ）
   ※世界お題ガイドのルール3・4に基づき、大人向けパックのみ
     軽い身体接触（ハグ・手や額へのキスなど）を許可。
     露骨な性的表現・脱衣は含めない。
   --------------------------------------------------------- */
const ADULT_DATA = {
  ja: {
    situations: [
      "セクシーなバーテンダーになりきって、色気たっぷりに",
      "カジノの凄腕ディーラーのように、妖艶な流し目で",
      "深夜のジャズバーの歌姫のように、艶っぽい声で",
      "高級クラブのオーナーのように、余裕たっぷりの色気で",
      "お忍びで店に来た人気モデルのように、意味深な視線で",
      "危険な色気を纏う裏社会のボスのように",
      "一夜限りの恋を演出するホテルのバーテンダーのように",
      "セクシー女優のインタビューシーン風に、艶やかに",
      "ダンスクラブのメインダンサーのように、腰を揺らしながら",
      "秘密のパーティーに招かれたセレブのように、色っぽく",
      "官能小説の主人公になりきって、情熱的に",
      "妖艶な魔女が誘惑するように、蠱惑的な声で",
      "カリスマホストの指名No.1のように、甘く低い声で",
      "仮面舞踏会の貴族のように、謎めいた色気で",
      "セクシーな刑事ドラマの尋問シーン風に、迫るように",
      "大人の隠れ家バーのマダムのように、艶っぽく微笑みながら",
      "タンゴの情熱的なダンサーのように、熱い視線を送りながら",
      "深夜のラブソングのMVの主演のように、切なく色っぽく",
      "シャンパンタワーの主役のセレブのように、華やかに色気を振りまきながら",
      "一夜の恋人役を演じる俳優のように、真剣な眼差しで",
      "禁断の恋を演じる舞台俳優のように、切なく熱っぽく",
      "深夜のバーで一人グラスを傾ける、ミステリアスな紳士（淑女）のように",
      "情熱的なフラメンコダンサーのように、燃えるような視線で",
      "高級エステサロンの凄腕セラピストのように、癒しの色気で",
      "月夜に誘う人魚のように、妖しく美しい声で",
      "禁じられた恋を描く映画のヒロインのように、切なく",
      "王室のスキャンダルを起こす貴族のように、大胆不敵に",
      "極上のエスコートを演じる高級レストランの支配人のように",
      "セクシーな家庭教師のように、意味深に微笑みながら",
      "深夜のホテルのラウンジピアニストのように、艶やかな旋律にのせて",
    ],
    actions: [
      "相手の手の甲に、そっと騎士のようなキスをする",
      "相手をやさしくハグして「今夜は離さない」と甘く囁く",
      "相手の耳元で、とびきり色っぽい褒め言葉を3つ囁く",
      "相手の頬に軽くキスをするふりをして、寸前で耳元に囁く",
      "相手を見つめながら、10秒間のセクシーなスローダンスに誘う",
      "相手の肩をそっと抱き寄せて、甘い一言を告げる",
      "相手の手を取り、色っぽいタンゴのポーズを1つ決める",
      "相手をお姫様（王子様）抱っこする勢いで持ち上げるふりをする",
      "相手の目をじっと見つめたまま、5秒間沈黙して色気で語る",
      "相手の手のひらにハートを描きながら、甘い言葉を添える",
      "相手を椅子に座らせ、肩に手を置いて色っぽく耳打ちする",
      "相手のおでこに、そっとキスをする",
      "相手を後ろから軽くハグして「今日は特別な夜だね」と囁く",
      "相手の髪をそっとなでながら、とびきり甘い一言を伝える",
      "相手と腕を組んで、セクシーな流し目を送る",
      "相手の手を取り、指先にそっと口づけをするふりをする",
      "相手をぎゅっと抱きしめて、5秒間そのままキープする",
      "相手に色っぽいウィンクを送りながら、殺し文句を1つ言う",
      "相手の背中にそっと手を添えて、甘くエスコートする",
      "相手と至近距離で見つめ合いながら、10秒間セクシーに沈黙する",
      "相手の手を取り、甲にゆっくりと時間をかけてキスをする",
      "相手の肩にそっと頭を預けて、甘えるように寄り添う",
      "相手の手を包み込むように両手で握り、じっと見つめる",
      "相手の頬に手を添えて、優しく見つめ合う",
      "相手のために即興の口説き文句を1つ考えて、色っぽく伝える",
      "相手と息を合わせて、ゆっくり腕を組んで3周歩く",
      "相手の耳元で「今夜の主役はあなただよ」と甘く囁く",
      "相手をリードするように手を差し出し、優雅にお辞儀をする",
      "相手の肩に手を置いたまま、5秒間笑わずに見つめ合う",
      "相手の名前を、とびきり色っぽい呼び方で3回呼んでみる",
    ],
  },
  en: {
    situations: [
      "Like a sultry bartender mixing the last drink of the night",
      "Like a smooth casino dealer with a smoldering gaze",
      "Like a lounge singer crooning a late-night torch song",
      "Like the owner of an exclusive VIP club, dripping with confidence",
      "Like a celebrity sneaking into a bar in disguise, giving a knowing look",
      "Like a dangerously charming underworld boss",
      "Like a hotel bartender setting the mood for a one-night romance",
      "Like a movie star giving a sultry red-carpet interview",
      "Like the lead dancer at an exclusive club, swaying to the beat",
      "Like a celebrity slipping into a secret VIP party",
      "Like the passionate lead of a steamy romance novel",
      "Like an enchanting witch casting a spell of seduction",
      "Like the most requested host at an exclusive lounge, low and sweet",
      "Like a mysterious noble at a masquerade ball",
      "Like the sultry interrogation scene in a detective drama",
      "Like the madame of a hidden speakeasy, smiling knowingly",
      "Like a passionate tango dancer, locking eyes the whole time",
      "Like the star of a late-night love song music video",
      "Like the celebrity of the night under a champagne tower, radiating charm",
      "Like an actor playing the role of a one-night romance, with total sincerity",
      "Like a stage actor playing a forbidden romance, aching and intense",
      "Like a mysterious guest nursing a drink alone at a late-night bar",
      "Like a passionate flamenco dancer, with a burning gaze",
      "Like a top spa therapist with a soothing kind of charm",
      "Like a mermaid singing under the moonlight, eerily beautiful",
      "Like the heroine of a forbidden-romance film, aching with longing",
      "Like a scandalous royal, bold and unapologetic",
      "Like the maître d' of an exclusive restaurant, escorting you perfectly",
      "Like a sultry private tutor, smiling with a hidden meaning",
      "Like a late-night hotel lounge pianist, playing a sultry melody",
    ],
    actions: [
      "place a gentle, knightly kiss on the back of their hand",
      "pull them into a warm hug and whisper \"I'm not letting go tonight\"",
      "whisper three irresistibly smooth compliments in their ear",
      "lean in like you're about to kiss their cheek, then whisper in their ear instead",
      "lock eyes and pull them into a slow, sultry 10-second dance",
      "draw them close by the shoulder and deliver one sweet line",
      "take their hand and strike one dramatic tango pose",
      "pretend to sweep them off their feet like a movie hero would",
      "hold their gaze in total silence for 5 seconds, letting the tension speak",
      "trace a heart on their palm while saying something sweet",
      "seat them down, rest a hand on their shoulder, and whisper something smooth",
      "place a gentle kiss on their forehead",
      "hug them from behind and whisper \"tonight feels different\"",
      "gently stroke their hair while delivering one irresistibly sweet line",
      "link arms with them and give them your most sultry glance",
      "take their hand and pretend to kiss their fingertips",
      "pull them into a tight hug and hold it for a full 5 seconds",
      "give them a smoldering wink and deliver one killer pickup line",
      "place a hand gently on their back and escort them like royalty",
      "hold their gaze up close in silence for 10 sultry seconds",
      "take their hand and place a slow, lingering kiss on the back of it",
      "rest your head gently on their shoulder, leaning in sweetly",
      "cup their hand in both of yours and hold their gaze",
      "cradle their cheek gently and hold a warm, quiet gaze",
      "improvise one smooth pickup line just for them, delivered sultrily",
      "link arms and walk three slow, in-step circles together",
      "whisper in their ear: \"you're the star of tonight\"",
      "extend your hand like you're leading a dance, and bow elegantly",
      "keep a hand on their shoulder and hold a straight-faced gaze for 5 seconds",
      "say their name three times in your most sultry voice",
    ],
  },
};

/* ---------------------------------------------------------
   💑 1対1モード（有料機能・カップル用）
   シチュエーション20種 × 行動20種 = 400通り（現在は日本語・英語のみ）
   ※他のパックが「1人がもう1人に向けて演じる」形式なのに対し、
     このパックは「2人一緒に行う」共同アクティビティ形式。
     キス・身体的接触は含めず、手つなぎ・見つめ合い・
     ふれあい系のふりまでに統一（世界お題ガイドのルール3・4準拠）
   --------------------------------------------------------- */
const COUPLE_DATA = {
  ja: {
    situations: [
      "2人だけの特別な夜を噛みしめるように",
      "遠距離恋愛中の2人が久しぶりに会えたときのように",
      "付き合いたての初々しいカップルのように",
      "長年連れ添った夫婦のような安心感で",
      "運命の相手だと確信した瞬間のように",
      "初デートの緊張をお互いに隠しながら",
      "映画のラストシーンのカップルのように、感慨深く",
      "喧嘩した後に仲直りするカップルのように、照れながら",
      "プロポーズを控えた恋人のように、真剣な面持ちで",
      "同じ景色を見て同じ気持ちになれた2人のように",
      "記念日を2人きりで祝うカップルのように",
      "お互いを世界一大切な人だと再確認するように",
      "手をつないだまま離れたくないと思っているように",
      "2人だけの秘密を1つ増やすように",
      "次の休みも一緒に過ごしたいと思いながら",
      "出会った日のことを懐かしむように",
      "お互いの好きなところを再発見するように",
      "2人の未来を想像してわくわくしながら",
      "言葉にしなくても通じ合える2人のように",
      "今この瞬間を写真のように心に焼き付けながら",
    ],
    actions: [
      "2人で手をつないで、10秒間目を閉じたまま歩いてみる",
      "背中合わせに座って、今の気持ちを一言ずつ伝え合う",
      "2人で息を合わせて、せーので相手の好きなところを言う",
      "指切りげんまんをしながら、今夜の約束を1つ交わす",
      "2人で額を軽く合わせて、5秒間見つめ合う",
      "手をつないだまま、理想のデートプランを1分間語り合う",
      "2人で同じタイミングで「好き」と言えるまで挑戦する",
      "肩を寄せ合って、思い出の曲を1フレーズ一緒に歌う",
      "お互いの手のひらに、相手への一言を指で書いて当てっこする",
      "2人で写真を1枚、とびきりの笑顔で撮る",
      "見つめ合ったまま、10秒間笑わないゲームをする",
      "2人で「せーの」で今の気分を一言で表現する",
      "手をつないで、2人だけの合言葉を今その場で決める",
      "お互いの良いところを、交互に3つずつ言い合う",
      "2人で肩を組んで、今夜の乾杯の音頭を一緒に考える",
      "背中合わせになって、体温を感じながら10秒間じっとする",
      "2人で手を重ねて、小指だけで指切りをする",
      "見つめ合ったまま、相手の瞳の色を声に出して褒める",
      "2人でハイタッチしてから、そのまま手を握り合う",
      "額を寄せ合ったまま、今日の感謝を1つ伝え合う",
    ],
  },
  en: {
    situations: [
      "Like a couple savoring a special night, just the two of you",
      "Like a long-distance couple finally reunited after months apart",
      "Like a couple still in the fresh, nervous early days of dating",
      "Like a couple who's been together for years, completely at ease",
      "Like the moment you both realized this was the real thing",
      "Like a first date, both secretly nervous underneath the smiles",
      "Like the final scene of a romance movie, full of emotion",
      "Like a couple making up sweetly after a small argument",
      "Like someone about to propose, with a completely sincere look",
      "Like two people who just realized they feel exactly the same way",
      "Like a couple celebrating an anniversary, just the two of you",
      "Like reaffirming that this person means everything to you",
      "Like holding hands and never wanting to let go",
      "Like adding one more secret only the two of you share",
      "Like already looking forward to spending the next day off together",
      "Like fondly remembering the day you first met",
      "Like rediscovering one more thing you love about each other",
      "Like imagining your future together, giddy with excitement",
      "Like a couple who understands each other without needing words",
      "Like trying to burn this exact moment into memory forever",
    ],
    actions: [
      "hold hands and walk ten steps together with your eyes closed",
      "sit back to back and each share one thing you're feeling right now",
      "hold hands and, on the count of three, each say one thing you love about the other",
      "make a pinky promise about one thing for tonight",
      "gently touch foreheads and hold each other's gaze for 5 seconds",
      "hold hands and spend one minute describing your dream date together",
      "keep trying to say \"I love you\" in perfect unison until you both nail it",
      "lean shoulder to shoulder and sing one line of a song that means something to you both",
      "trace a word for the other person on their palm and have them guess it",
      "take one photo together with your biggest smiles",
      "hold each other's gaze and see who can go 10 seconds without laughing",
      "on the count of three, both blurt out your mood right now in one word",
      "hold hands and invent a secret phrase just for the two of you, right now",
      "take turns naming three things you love about each other",
      "put your arms around each other and come up with tonight's toast together",
      "sit back to back and stay still for 10 seconds, just feeling each other's warmth",
      "stack your hands together and pinky-swear on something small",
      "hold each other's gaze and compliment the color of their eyes out loud",
      "high-five, then hold hands right after",
      "rest your foreheads together and each share one thing you're grateful for today",
    ],
  },
};

/* ---------------------------------------------------------
   💘 ねるとんZoomモード（有料機能・初対面マッチングパーティー用）
   シチュエーション20種 × 行動20種 = 400通り（現在は日本語・英語のみ）
   ※既存の恋愛パックが「交際中の2人」向けなのに対し、
     こちらは「初対面同士のマッチングパーティー」向け。
     褒め合い・第一印象・告白ごっこまでに統一し、
     キス・身体接触は含めない（世界お題ガイドのルール準拠）
   --------------------------------------------------------- */
const NERUTON_DATA = {
  ja: {
    situations: [
      "初対面のドキドキを隠しきれない参加者のように",
      "運命の出会いを求めてこの会に参加したように",
      "第一印象で心を撃ち抜かれた瞬間のように",
      "恋愛番組の告白タイムに出演しているように",
      "気になる人を前にしてつい饒舌になってしまうように",
      "合コンのエース級の自己紹介をするように",
      "運命の人を探す真剣な眼差しで",
      "初対面なのに妙に馬が合う相手を見つけたように",
      "この出会いを一生の思い出にしたいと願うように",
      "恋のライバルに闘志を燃やすように",
      "好みのタイプ発表会に出演するように",
      "一目惚れした瞬間の高鳴る鼓動を隠しながら",
      "マッチングアプリのプロフィールを読み上げるように",
      "今夜だけの特別な出会いを噛みしめるように",
      "気になるあの人にだけ聞こえる声で",
      "恋のキューピッドに背中を押されているように",
      "運命の相手診断に一喜一憂する参加者のように",
      "初対面の緊張と期待が入り混じった表情で",
      "この場にいる全員を虜にする勢いで",
      "出会いに感謝する乾杯の音頭を取るように",
    ],
    actions: [
      "この場で第一印象が良かった人の名前を、Zoomのチャットでこっそり送る",
      "自分の「好きなタイプ」を3つ、具体的に発表する",
      "気になった人の第一印象を、傷つけない範囲で発表する",
      "自己紹介を、まるで婚活パーティーのプロフィールカード風に読み上げる",
      "この中で一番話してみたい人を指名し、理由を1つ添える",
      "自分の恋愛遍歴を、映画の予告編風に3行で紹介する",
      "今の自分を売り込む「自己PRタイム」を30秒行う",
      "理想のデートプランを、その場で即興で発表する",
      "この会に参加した理由を、正直に打ち明ける",
      "気になる人へのメッセージを、Zoomのチャットで一言だけこっそり送る",
      "自分の恋愛の決め手ベスト3を発表する",
      "この場にいる誰かの「良いところ」を3つ、名前を伏せて紹介する",
      "今の気持ちを、恋愛ソングのタイトルで表現する",
      "自分にとっての理想の相手像を、絵に描くように言葉で説明する",
      "この出会いの感想を、一言で表現する",
      "誰かに送りたい「気になっています」のサインを、身振りだけで表現する",
      "自分の趣味・特技を、モテアピール全開でプレゼンする",
      "今夜一番印象に残った会話を、再現してみせる",
      "この中で「もっと話したい」と思った人の名前を、紙に書いて見せる（本人には秘密で）",
      "出会いに乾杯する短いスピーチをする",
    ],
  },
  en: {
    situations: [
      "Like someone barely hiding the nerves of a first meeting",
      "Like someone who came here hoping for a fated encounter",
      "Like the moment your heart skipped a beat at first sight",
      "Like a contestant on a dating show's confession segment",
      "Like getting unexpectedly chatty around someone you're curious about",
      "Like giving an ace-level self-introduction at a mixer",
      "With the serious look of someone searching for \"the one\"",
      "Like discovering an oddly perfect connection with a total stranger",
      "Like wanting to remember this meeting for the rest of your life",
      "Like burning with rivalry over someone you like",
      "Like a contestant at a \"my type\" reveal segment",
      "Hiding the racing heartbeat of love at first sight",
      "Like reading your own dating-app profile out loud",
      "Like savoring this one special night of meeting new people",
      "In a voice meant only for the person you're curious about",
      "Like being pushed forward by love's own matchmaker",
      "Like a contestant anxiously awaiting a compatibility result",
      "With a face mixing first-meeting nerves and hope",
      "Like trying to charm absolutely everyone in the room",
      "Like giving a toast of gratitude for this chance encounter",
    ],
    actions: [
      "secretly send the name of whoever made the best first impression, via Zoom chat",
      "announce three specific things about your \"type\"",
      "share one kind first impression of someone here, keeping it gentle",
      "read your own self-introduction like a dating-party profile card",
      "call out the one person here you'd most like to talk to, with one reason why",
      "summarize your dating history in three lines, like a movie trailer",
      "deliver a 30-second \"sell yourself\" pitch",
      "improvise your dream date plan on the spot",
      "honestly share why you came to this gathering",
      "secretly send one message to someone you're curious about, via Zoom chat",
      "reveal your top three dealbreakers (in a good way) for love",
      "name three good things about someone here, without saying who",
      "describe your current mood using the title of a love song",
      "describe your ideal partner in vivid detail, like painting a picture with words",
      "sum up your impression of tonight in a single word",
      "act out (no words) a \"you caught my eye\" signal to someone",
      "pitch your hobbies and skills with maximum charm",
      "reenact the most memorable conversation you had tonight",
      "write down the name of the person you'd like to talk to more (keep it secret from them)",
      "give a short toast to new encounters",
    ],
  },
};

/* ---------------------------------------------------------
   🎉 法人・パーティープラン（結婚式二次会・会社の飲み会向け）
   --------------------------------------------------------- */
const PARTY_DATA = {
  ja: {
    situations: [
      "会場全体を巻き込む主役級の盛り上げ役として",
      "新郎新婦（または主賓）への感謝を噛みしめながら",
      "宴会部長に任命されたかのような貫禄で",
      "今日だけは社長・上司にも物おじせずに",
      "同期・同僚への愛をこれでもかと伝えるように",
      "乾杯の音頭を任された緊張感を抱えながら",
      "この会のMVPを決める審査員のような目で",
      "普段は言えない感謝を、この場を借りて伝えるように",
      "二次会のテンションを一段階アゲるように",
      "自己紹介タイムのトリを飾るように",
      "チームの結束をさらに固めるように",
      "今夜限りの余興スターとして",
      "会場の笑いを一身に背負う覚悟で",
      "上司から「いいぞ」と褒められることを期待して",
      "この会を一生の思い出にする勢いで",
    ],
    actions: [
      "この会の「主役」に向けて、30秒スピーチをする",
      "隣の人の良いところを3つ、全力でほめる",
      "自分の「今年頑張ったこと」を胸を張って発表する",
      "会社（または職場）の好きなところを1つ紹介する",
      "この場にいる誰かにビール（お酒）を注ぎに行く",
      "余興として、持ちネタを1つ披露する",
      "今日の主役（新郎新婦や主賓）へのメッセージを一言添える",
      "「乾杯！」の音頭を、いつもより3割増しのテンションで取る",
      "同僚・同期への感謝を、具体的なエピソードとともに伝える",
      "この1年で一番嬉しかったことを発表する",
      "隣の席の人と、握手して自己紹介し直す",
      "会場全体に向けて、大きな声で挨拶をする",
      "上司（または年長者）に、今日の感謝を伝える",
      "余興ソングのサビだけ、その場で歌う",
      "この会のテーマソングを1曲、勝手に決めて紹介する",
    ],
  },
  en: {
    situations: [
      "As the star performer who gets the whole room going",
      "While savoring your gratitude toward the guest(s) of honor",
      "With the dignity of someone appointed \"party captain\"",
      "Feeling bold enough to speak up to the boss, just for tonight",
      "Determined to spell out your love for your coworkers",
      "Carrying the nervous weight of being asked to give the toast",
      "With the judging eyes of someone crowning tonight's MVP",
      "Using this moment to say a thank-you you never usually say",
      "Ready to kick the after-party energy up a notch",
      "Closing out the self-introduction round in style",
      "Determined to bring the team even closer together",
      "As tonight's one-night-only entertainment star",
      "Carrying the whole room's laughter on your shoulders",
      "Hoping for a \"nice one!\" from the boss",
      "With the energy of making this a night to remember",
    ],
    actions: [
      "give a 30-second speech directed at tonight's guest of honor",
      "praise three good things about the person next to you, wholeheartedly",
      "proudly announce your proudest achievement of the year",
      "share one thing you genuinely like about your workplace",
      "go pour a drink for someone in the room",
      "perform one party trick or bit as entertainment",
      "add a short message for today's guest(s) of honor",
      "lead a toast with 30% more energy than usual",
      "thank a coworker with a specific story about them",
      "share the happiest moment of your year",
      "shake hands with your neighbor and reintroduce yourself",
      "greet the whole room loudly and clearly",
      "thank your boss (or a senior colleague) for tonight",
      "sing just the chorus of a party anthem, right now",
      "declare a \"theme song\" for this gathering and explain why",
    ],
  },
};

/* ---------------------------------------------------------
   🥤 ノンアルコール版パック（無料・お酒を前提にしない罰ゲーム）
   ---------------------------------------------------------
   イスラム圏など飲酒文化のない/少ない地域や、お酒を飲まない人が
   いる飲み会でも遊べるように、お酒に関する言及を一切含まない
   バージョン。世界お題ガイドの禁止6か条は他パック同様に適用。
   現在は日英のみ（他言語は generateOdai() 側で通常パックに
   自動フォールバックされる）。
   --------------------------------------------------------- */
const NOALCOHOL_DATA = {
  ja: {
    situations: [
      "誰よりも元気にジュースで乾杯しながら",
      "今夜のノンアルMVPとして",
      "水分補給担当という自覚を持って",
      "オレンジジュースを片手に、堂々と",
      "この場を盛り上げる司会者気分で",
      "みんなの笑いを取りに行く覚悟で",
      "スイーツ担当を任されたテンションで",
      "誰よりも声を張り上げて",
      "友達を笑わせる使命を背負って",
      "この会の記録係になったつもりで",
      "今日一番の元気印として",
      "写真映え担当の意気込みで",
      "みんなの心をつかむ勢いで",
      "この瞬間を一生の思い出にする気持ちで",
      "誰よりも楽しむ主役として",
    ],
    actions: [
      "好きな飲み物のCMのようなキメ台詞を叫ぶ",
      "この場にいる誰かの物まねを1つする",
      "自分の好きな食べ物について30秒語る",
      "最近あった面白い話を1つ披露する",
      "隣の人と一緒に決めポーズで写真を撮る",
      "今日の気分を絵文字3つだけで表現する",
      "好きな曲のサビだけ口ずさむ",
      "自己紹介を変な声でやり直す",
      "この中の誰かを全力でほめる",
      "その場でしりとりを3ターン続ける",
      "利き手じゃない手で、3人とエアハイタッチして回る",
      "好きな映画やドラマの名シーンを再現する",
      "この会のテーマソングを勝手に決めて発表する",
      "3秒間、無言で最高の変顔をキープする",
      "この瞬間の気持ちを一言で叫ぶ",
    ],
  },
  en: {
    situations: [
      "Toasting with juice more enthusiastically than anyone else",
      "As tonight's proud non-alcoholic MVP",
      "Taking your role as official hydration captain seriously",
      "Holding an orange juice like it's the finest cocktail in the room",
      "With the energy of tonight's self-appointed host",
      "Ready to get the biggest laugh of the night",
      "With the confidence of the designated dessert captain",
      "Projecting your voice louder than anyone else",
      "On a mission to make your friends laugh",
      "Acting as tonight's unofficial photographer",
      "As the most energetic person here tonight",
      "With main-character energy for the group photo",
      "Determined to win everyone's heart in the next 10 seconds",
      "Treating this moment like a core memory in the making",
      "As the star of tonight, no alcohol required",
    ],
    actions: [
      "deliver a dramatic commercial-style catchphrase for your favorite drink",
      "do a quick impression of someone in this group",
      "talk about your favorite food for 30 seconds straight",
      "share one funny thing that happened to you recently",
      "strike a pose with the person next to you for a photo",
      "describe your mood today using only 3 emojis, out loud",
      "hum just the chorus of your favorite song",
      "reintroduce yourself in a completely different voice",
      "give someone in the group an over-the-top compliment",
      "keep a word-chain game going for 3 rounds",
      "go around for an air high-five with your non-dominant hand",
      "recreate a famous movie or drama scene, solo",
      "declare a theme song for tonight and explain your reasoning",
      "hold the silliest face you can for 3 full seconds",
      "shout how you're feeling right now in one word",
    ],
  },
  de: {
    situations: [
      "Mit Saft in der Hand, enthusiastischer als alle anderen",
      "Als stolzester alkoholfreier MVP des Abends",
      "In deiner Rolle als offizieller Hydration-Captain",
      "Mit einem Orangensaft in der Hand, als wäre es der edelste Cocktail im Raum",
      "Mit der Energie des selbsternannten Gastgebers",
      "Bereit, die größten Lacher des Abends zu ernten",
      "Mit dem Selbstbewusstsein des designierten Dessert-Captains",
      "Lauter als alle anderen",
      "Mit der Mission, deine Freunde zum Lachen zu bringen",
      "Als inoffizieller Fotograf des Abends",
      "Als energiegeladenste Person hier heute Abend",
      "Mit Hauptdarsteller-Energie fürs Gruppenfoto",
      "Entschlossen, in den nächsten 10 Sekunden alle Herzen zu gewinnen",
      "Als würde dieser Moment eine unvergessliche Erinnerung werden",
      "Als Star des Abends, ganz ohne Alkohol",
    ],
    actions: [
      "einen dramatischen Werbespruch für dein Lieblingsgetränk aufsagen",
      "eine kurze Imitation von jemandem aus dieser Gruppe machen",
      "30 Sekunden am Stück über dein Lieblingsessen reden",
      "eine lustige Sache erzählen, die dir kürzlich passiert ist",
      "mit der Person neben dir für ein Foto posieren",
      "deine heutige Stimmung laut mit nur 3 Emojis beschreiben",
      "nur den Refrain deines Lieblingssongs summen",
      "dich mit einer komplett anderen Stimme neu vorstellen",
      "jemandem in der Gruppe ein übertriebenes Kompliment machen",
      "eine Wortkette 3 Runden lang am Laufen halten",
      "mit deiner schwächeren Hand reihum ein Luft-High-Five geben",
      "eine berühmte Film- oder Serienszene alleine nachspielen",
      "ein Motto für den heutigen Abend verkünden und es begründen",
      "3 volle Sekunden lang die albernste Grimasse halten",
      "in einem Wort herausrufen, wie du dich gerade fühlst",
    ],
  },
  tl: {
    situations: [
      "Habang nagto-toast gamit ang juice, mas masigla pa sa lahat",
      "Bilang pinaka-proud na non-alcoholic MVP ngayong gabi",
      "Seryosong ginagampanan ang tungkulin bilang official hydration captain",
      "Hawak ang orange juice na parang pinaka-mamahaling cocktail sa buong lugar",
      "May energy ng self-appointed host ngayong gabi",
      "Handa nang kumuha ng pinakamalaking tawa ngayong gabi",
      "May kumpiyansa ng itinalagang dessert captain",
      "Mas malakas ang boses kaysa sa lahat",
      "May misyon na patawanin ang mga kaibigan",
      "Gumaganap bilang unofficial photographer ngayong gabi",
      "Bilang pinaka-masiglang tao dito ngayong gabi",
      "May main-character energy para sa group photo",
      "Determinadong manalo sa puso ng lahat sa susunod na 10 segundo",
      "Parang ang sandaling ito ay magiging core memory",
      "Bilang bida ngayong gabi, hindi na kailangan ng alak",
    ],
    actions: [
      "magbigay ng dramatic commercial-style catchphrase para sa paborito mong inumin",
      "gumawa ng mabilisang impression ng isa sa grupo",
      "mag-usap tungkol sa paborito mong pagkain nang 30 segundo diretso",
      "magkwento ng isang nakakatawang nangyari sa iyo kamakailan",
      "mag-pose kasama ang katabi mo para sa litrato",
      "ilarawan ang mood mo ngayon gamit lang ang 3 emoji, nang malakas",
      "kantahin lang ang chorus ng paborito mong kanta",
      "ipakilala ulit ang sarili gamit ang ibang tono ng boses",
      "magbigay ng sobrang papuri sa isa sa grupo",
      "magpatuloy ng word-chain game nang 3 rounds",
      "mag-air high-five sa 3 tao gamit ang hindi mo dominanteng kamay",
      "gayahin ang sikat na eksena mula sa pelikula o drama, mag-isa",
      "magdeklara ng theme song para ngayong gabi at ipaliwanag kung bakit",
      "panatilihin ang pinaka-katawa-tawang mukha sa loob ng 3 segundo",
      "isigaw sa isang salita lang kung ano ang nararamdaman mo ngayon",
    ],
  },
  vi: {
    situations: [
      "Nâng ly nước ép nhiệt tình hơn ai hết",
      "Là MVP không cồn tự hào nhất tối nay",
      "Nghiêm túc đảm nhận vai trò đội trưởng cấp nước chính thức",
      "Cầm ly nước cam như thể đó là cocktail sang trọng nhất phòng",
      "Với năng lượng của người dẫn chương trình tự phong tối nay",
      "Sẵn sàng giành tiếng cười lớn nhất đêm nay",
      "Với sự tự tin của đội trưởng phụ trách món tráng miệng",
      "Nói to hơn bất kỳ ai khác",
      "Với sứ mệnh làm bạn bè cười",
      "Đóng vai nhiếp ảnh gia không chính thức tối nay",
      "Là người tràn đầy năng lượng nhất ở đây tối nay",
      "Với khí chất nhân vật chính khi chụp ảnh nhóm",
      "Quyết tâm chinh phục trái tim mọi người trong 10 giây tới",
      "Coi khoảnh khắc này như một kỷ niệm đáng nhớ",
      "Là ngôi sao của tối nay, không cần rượu bia",
    ],
    actions: [
      "hô vang một câu khẩu hiệu quảng cáo kịch tính cho món đồ uống yêu thích",
      "bắt chước nhanh một người trong nhóm",
      "nói về món ăn yêu thích của bạn trong 30 giây liên tục",
      "kể một chuyện vui vừa xảy ra với bạn gần đây",
      "tạo dáng chụp ảnh cùng người bên cạnh",
      "diễn tả tâm trạng hôm nay chỉ bằng 3 emoji, nói to lên",
      "ngân nga điệp khúc bài hát yêu thích",
      "giới thiệu lại bản thân bằng một giọng nói hoàn toàn khác",
      "khen ngợi một người trong nhóm một cách cường điệu",
      "chơi trò nối từ liên tục trong 3 lượt",
      "đi vòng quanh high-five trên không bằng tay không thuận",
      "tái hiện một cảnh phim hoặc phim truyền hình nổi tiếng, một mình",
      "tuyên bố bài hát chủ đề cho tối nay và giải thích lý do",
      "giữ khuôn mặt hài hước nhất có thể trong 3 giây",
      "hét lên cảm giác hiện tại của bạn chỉ bằng một từ",
    ],
  },
};

/* ---------------------------------------------------------
   🍶 ひとり飲みモード（無料・インバウンド観光客のバーひとり飲み向け）
   ---------------------------------------------------------
   グループでの罰ゲームではなく、バーで一人で飲んでいる人が
   店員さんや隣の席の人と自然に交流できるお題。20×25=500通り。
   現在は日英のみ。
   --------------------------------------------------------- */
const SOLO_DATA = {
  ja: {
    situations: [
      "一人飲みを楽しむ達人として",
      "今夜はこのお店の主役になったつもりで",
      "初めて来たお店を全力で楽しむ気持ちで",
      "今日出会う人には全員フレンドリーにいく所存で",
      "旅の思い出をひとつ増やす気持ちで",
      "このバーの雰囲気にすっかり惚れ込んだ様子で",
      "今夜はいつもより一歩踏み出す勇気を出して",
      "隣の席との距離をそっと縮めながら",
      "店員さんとも今夜だけの友達になるつもりで",
      "この一杯をとことん味わい尽くす覚悟で",
      "知らない街で新しい出会いを探す冒険者として",
      "今夜の主役はカウンター越しの会話だと思いながら",
      "せっかくの一人時間を最大限に活用する気持ちで",
      "グラス片手に、堂々とした立ち振る舞いで",
      "この店のことをもっと知りたいという好奇心で",
      "今夜だけの特別な思い出を作るつもりで",
      "誰かと乾杯することを目標に掲げながら",
      "お店の常連になったかのような余裕で",
      "一期一会の出会いを大切にする気持ちで",
      "このグラスが空になる前に、何か新しいことに挑戦する気持ちで",
    ],
    actions: [
      "隣の人に「乾杯」して、一言自己紹介する",
      "隣の人に、今日このお店に来た理由を聞いてみる",
      "隣の人と一緒に「乾杯ポーズ」で写真を撮ってもらう",
      "隣の人に、好きな音楽のジャンルを聞いてみる",
      "店員さんにおすすめのカクテルを聞いて、それを注文する",
      "店員さんに、この街のおすすめスポットを1つ聞く",
      "店員さんと乾杯ポーズで写真を撮らせてもらう",
      "一番人気のメニューを聞いて、次はそれを頼んでみる",
      "自分の国のおもしろい豆知識を1つ、隣の人か店員さんに教える",
      "「乾杯」を3つの言語で言ってみる",
      "日本語（またはその国の言語）を1つ、その場で教えてもらう",
      "店員さんにこのお店の一番の思い出を聞いてみる",
      "隣の人におすすめの旅先を聞いてみる",
      "今日撮った一番のお気に入り写真を店員さんに見せる",
      "このお店で一番好きなポイントを店員さんに伝える",
      "隣の人に、今どこから来たか聞いてみる",
      "店員さんに「今日のラッキーカラー」を占ってもらう(冗談で)",
      "隣の人と好きな映画の話をしてみる",
      "店員さんにこの店で一番人気のおつまみを聞いて注文する",
      "隣の人に、乾杯の合図でグラスを合わせてもらう(エアで)",
      "お店の中で一番気に入った内装や小物を1つ見つけて店員さんに伝える",
      "隣の人におすすめの日本食を教えてもらう",
      "店員さんに、この後どこに行くのがおすすめか聞いてみる",
      "今夜の出会いに感謝して、心の中で乾杯する",
      "隣の人と「今日一番良かったこと」を教え合う",
    ],
  },
  en: {
    situations: [
      "As a master of enjoying solo drinking",
      "Feeling like tonight's main character at this bar",
      "Ready to fully enjoy a bar you're visiting for the first time",
      "Determined to be friendly to everyone you meet tonight",
      "Looking to add one more memory to your trip",
      "Completely charmed by the vibe of this bar",
      "Finding a little extra courage to step outside your comfort zone tonight",
      "Quietly closing the distance with the seat next to you",
      "Planning to make a one-night friend out of the staff too",
      "Determined to savor this drink to the fullest",
      "As an adventurer seeking new encounters in an unfamiliar city",
      "Believing tonight's main event is the conversation across the counter",
      "Making the most of this precious solo time",
      "Standing tall and confident, drink in hand",
      "Curious to learn more about this place",
      "Set on making a special memory just for tonight",
      "With the goal of toasting with someone tonight",
      "With the ease of someone who's already a regular here",
      "Cherishing this once-in-a-lifetime encounter",
      "Determined to try something new before this glass is empty",
    ],
    actions: [
      "say \"cheers\" to the person next to you and introduce yourself",
      "ask the person next to you why they came to this bar today",
      "ask someone to take a \"cheers\" photo of you and your neighbor",
      "ask the person next to you what music genre they like",
      "ask the bartender for a recommendation and order it",
      "ask the staff for one spot they'd recommend in this city",
      "take a cheers photo with the bartender",
      "ask what the most popular item is and order that next",
      "share one fun fact about your home country with your neighbor or the staff",
      "say \"cheers\" in three different languages",
      "ask someone to teach you one word in Japanese (or their language)",
      "ask the staff for their favorite memory from working here",
      "ask the person next to you for a travel recommendation",
      "show the staff your favorite photo from today",
      "tell the staff what you like best about this bar",
      "ask the person next to you where they're from",
      "jokingly ask the staff to guess your \"lucky color\" for today",
      "talk about a favorite movie with the person next to you",
      "ask the staff for their most popular snack and order it",
      "do an air toast with the person next to you",
      "find your favorite piece of decor in the bar and tell the staff about it",
      "ask the person next to you to recommend a Japanese dish",
      "ask the staff where they'd recommend going next tonight",
      "silently toast to tonight's encounters in your head",
      "swap \"the best thing that happened today\" stories with your neighbor",
    ],
  },
};

/* ---------------------------------------------------------
   🍺 スポンサータイアップ枠（協賛ブランドの広告お題）
   ---------------------------------------------------------
   実際にスポンサー企業と契約が決まったら、brandName を
   入力して enabled を true にしてください。未契約の間
   （brandName が空、または enabled が false）は完全に
   無効で、通常のお題だけが出ます。
   --------------------------------------------------------- */
const SPONSOR_CONFIG = {
  enabled: false, // 契約が決まったら true にする
  brandName: "", // 例: "○○ビール"
  frequency: 0.1, // お題全体のうち何割をスポンサー枠にするか（0.1 = 10%）
  templates: {
    ja: [
      "{brand}で乾杯して、一気に飲み干す",
      "{brand}を片手に、感謝の気持ちを叫ぶ",
      "{brand}のCM風ポーズを決めながら、ひとことPRする",
      "{brand}への愛を、3秒スピーチで語る",
    ],
    en: [
      "toast with {brand} and drink it all in one go",
      "hold up a {brand} and shout your thanks",
      "strike a {brand} commercial pose and give a one-line pitch",
      "declare your love for {brand} in a 3-second speech",
    ],
  },
};

// スポンサー枠が有効なら、一定確率でアクションをブランド入りの文言に差し替える
function maybeInjectSponsorAction(action, lang) {
  if (!SPONSOR_CONFIG.enabled || !SPONSOR_CONFIG.brandName) return action;
  if (Math.random() >= SPONSOR_CONFIG.frequency) return action;
  const templates = SPONSOR_CONFIG.templates[lang] || SPONSOR_CONFIG.templates.ja;
  const template = pickRandom(templates);
  return template.split("{brand}").join(SPONSOR_CONFIG.brandName);
}

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
 * @param {string} lang     - "ja" / "en" / "zh" / "ko" / "es"
 * @param {string} pack     - "standard"（通常）または "romance"（💌恋愛パック）または "adult"（🔞大人向けパック）または "party"（🎉法人・パーティープラン）または "noalcohol"（🥤ノンアルコール版・無料、いずれも現在は日英のみ）
 * @returns {object} displayText: 画面表示用 / speechText: 朗読用
 */
function generateOdai(fromName, toName, lang = "ja", pack = "standard") {
  const PACK_DATA = { romance: ROMANCE_DATA, adult: ADULT_DATA, couple: COUPLE_DATA, nerutoon: NERUTON_DATA, party: PARTY_DATA, noalcohol: NOALCOHOL_DATA, solo: SOLO_DATA };
  const data =
    PACK_DATA[pack] ? PACK_DATA[pack][lang] || ODAI_DATA[lang] || ODAI_DATA.ja // 未対応言語は通常パックに戻す
      : ODAI_DATA[lang] || ODAI_DATA.ja;
  let situation, action, key;

  // 同じ組み合わせが2回連続したら引き直す
  do {
    situation = pickRandom(data.situations);
    action = pickRandom(data.actions);
    key = situation + "|" + action;
  } while (key === lastCombinationKey);
  lastCombinationKey = key;

  action = maybeInjectSponsorAction(action, lang);

  let displayText, speechText;

  if (pack === "solo") {
    // 🍶ひとり飲みモードは相手がいないので「から〜へ」を出さず、本人名だけ表示する
    if (lang === "ja") {
      displayText = `【${fromName}】\n${situation}、\n${action}！`;
      speechText = `${fromName}さん！${situation}、${action}！`;
    } else if (lang === "de") {
      displayText = `【${fromName}】\n${situation},\n${action}!`;
      speechText = `${fromName}! ${situation}, ${action}!`;
    } else if (lang === "tl") {
      displayText = `【${fromName}】\n${situation},\n${action}!`;
      speechText = `${fromName}! ${situation}, ${action}!`;
    } else {
      // en/zh/ko/es/pt/vi はSOLO_DATA未対応のため通常英語表記でフォールバック
      displayText = `【${fromName}】\n${situation},\n${action}!`;
      speechText = `${fromName}! ${situation}, ${action}!`;
    }
    return { displayText, speechText: toSpeechSafe(speechText), situation, action };
  }

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
  } else if (lang === "ko") {
    displayText =
      `【${fromName}】➜【${toName}】!\n` +
      `${situation},\n` +
      `${action}!`;
    speechText =
      `${fromName}, 상대는 ${toName}! ${situation}, ${action}!`;
  } else if (lang === "es") {
    displayText =
      `【${fromName}】 ➜ 【${toName}】!\n` +
      `${situation},\n` +
      `${action}!`;
    speechText =
      `${fromName}, tu objetivo es ${toName}! ${situation}, ${action}!`;
  } else if (lang === "pt") {
    displayText =
      `【${fromName}】 ➜ 【${toName}】!\n` +
      `${situation},\n` +
      `${action}!`;
    speechText =
      `${fromName}, seu alvo é ${toName}! ${situation}, ${action}!`;
  } else if (lang === "vi") {
    displayText =
      `【${fromName}】 ➜ 【${toName}】!\n` +
      `${situation},\n` +
      `${action}!`;
    speechText =
      `${fromName}, mục tiêu của bạn là ${toName}! ${situation}, ${action}!`;
  } else if (lang === "de") {
    displayText =
      `【${fromName}】 ➜ 【${toName}】!\n` +
      `${situation},\n` +
      `${action}!`;
    speechText =
      `${fromName}, dein Ziel ist ${toName}! ${situation}, ${action}!`;
  } else if (lang === "tl") {
    displayText =
      `【${fromName}】 ➜ 【${toName}】!\n` +
      `${situation},\n` +
      `${action}!`;
    speechText =
      `${fromName}, ang target mo ay si ${toName}! ${situation}, ${action}!`;
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
  "heami", "sora", "helena", "sabina", "monica", "paulina", "elvira", "laura",
];
const MALE_VOICE_HINTS = [
  "male", "man", "ichiro", "keita", "otoya", "daichi", "show",
  "david", "mark", "guy", "christopher", "daniel", "alex", "fred",
  "george", "james", "ryan", "eric", "william", "liam",
  "zhiwei", "kangkang", "yunjian",
  "injoon", "pablo", "raul", "jorge", "diego", "juan",
];

function classifyVoiceGender(voice) {
  const name = voice.name.toLowerCase();
  if (FEMALE_VOICE_HINTS.some((h) => name.includes(h))) return "female";
  if (MALE_VOICE_HINTS.some((h) => name.includes(h))) return "male";
  return null;
}

// 希望の言語＆性別に一番近い声を選ぶ
function pickVoice(lang, gender) {
  const PREFIX_MAP = { en: "en", zh: "zh", ko: "ko", es: "es", ja: "ja", pt: "pt", vi: "vi" };
  const prefix = PREFIX_MAP[lang] || "ja";
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
 * @param {string} lang       - "ja" / "en" / "zh" / "ko" / "es"
 * @param {object} persona    - 声のキャラクター設定（省略可）
 *                              例: { pitch: 0.45, rate: 0.9, gender: "male" }
 */
function speakOdai(speechText, lang = "ja", persona = null) {
  if (!("speechSynthesis" in window)) return; // 非対応ブラウザでは何もしない

  speechSynthesis.cancel(); // 前の読み上げが残っていたら止める

  function doSpeak() {
    // 一部のAndroid/Chromeは、止めた直後にすぐ喋らせようとすると
    // 無言のまま失敗することがあるため、ごくわずかに間を空ける
    const utterance = new SpeechSynthesisUtterance(speechText);
    const BCP47_MAP = { en: "en-US", zh: "zh-TW", ko: "ko-KR", es: "es-ES", ja: "ja-JP", pt: "pt-BR", vi: "vi-VN" };
    utterance.lang = BCP47_MAP[lang] || "ja-JP";
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

    // 稀に「一時停止」状態のまま固まる端末があるための保険
    if (speechSynthesis.paused) speechSynthesis.resume();
    speechSynthesis.speak(utterance);
  }

  setTimeout(doSpeak, 60);
}

// 一部のスマホは音声リストが後から非同期に届くため、
// 届いたタイミングで声の候補を最新化しておく
if ("speechSynthesis" in window && "onvoiceschanged" in speechSynthesis) {
  speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();
}

// iOS Safari等は「ユーザーの操作の中で直接呼ばれた読み上げ」しか
// 声を出さない制限があるため、最初のタップの瞬間に無音の発話を1回
// 送っておくことで、後から遅れて呼ばれる読み上げも解禁される
function unlockSpeech() {
  if (!("speechSynthesis" in window)) return;
  const silent = new SpeechSynthesisUtterance(" ");
  silent.volume = 0;
  speechSynthesis.speak(silent);
}
