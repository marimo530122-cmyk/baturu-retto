/* =========================================================
   📢 広告（Google AdSense・無料版のみ表示）
   ---------------------------------------------------------
   ・ads-config.js が設定済み、かつ有料版が未解放のときだけ、
     AdSenseの読み込みタグを差し込み、.ad-slot コンテナに
     広告ユニットを表示する
   ・有料版が解放された瞬間（Billing.wasJustUnlocked等）は
     Ads.refresh() を呼ぶことで、表示中の広告も含めて隠す
   ・AdSense自体の審査・サイト登録はあなた自身の操作が必要
     （設定方法は 要件定義書.md を参照）
   ========================================================= */

const Ads = (function () {
  const SLOTS = [
    { id: "ad-slot-title", adSlot: () => ADSENSE_SLOT_TITLE },
    { id: "ad-slot-game", adSlot: () => ADSENSE_SLOT_GAME },
  ];

  let scriptLoaded = false;

  function isConfigured() {
    return (
      typeof ADSENSE_CLIENT_ID === "string" &&
      ADSENSE_CLIENT_ID.indexOf("ca-pub-") === 0 &&
      ADSENSE_CLIENT_ID.indexOf("YOUR_CLIENT_ID") === -1
    );
  }

  function isPremium() {
    return typeof Billing !== "undefined" && Billing.isPremium();
  }

  function shouldShow() {
    return isConfigured() && !isPremium();
  }

  function loadAdSenseScript() {
    if (scriptLoaded) return;
    scriptLoaded = true;
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + encodeURIComponent(ADSENSE_CLIENT_ID);
    script.crossOrigin = "anonymous";
    document.head.appendChild(script);
  }

  function fillSlot(slot) {
    const el = document.getElementById(slot.id);
    if (!el || el.dataset.filled === "1") return;
    const slotId = slot.adSlot();
    if (!slotId || slotId.indexOf("YOUR_") === 0) return;
    el.innerHTML =
      '<ins class="adsbygoogle" style="display:block" ' +
      'data-ad-client="' + ADSENSE_CLIENT_ID + '" ' +
      'data-ad-slot="' + slotId + '" ' +
      'data-ad-format="auto" data-full-width-responsive="true"></ins>';
    el.dataset.filled = "1";
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {}
  }

  // 表示中の広告スロットの見た目を、現在の状態（有料版/RECモード等）に合わせて更新する
  function refresh() {
    const show = shouldShow();
    SLOTS.forEach((slot) => {
      const el = document.getElementById(slot.id);
      if (!el) return;
      if (show) {
        el.classList.remove("hidden");
        fillSlot(slot);
      } else {
        el.classList.add("hidden");
      }
    });
    if (show) loadAdSenseScript();
  }

  return { refresh, isConfigured, shouldShow };
})();

Ads.refresh();
