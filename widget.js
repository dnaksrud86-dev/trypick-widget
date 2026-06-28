/* ============================================================================
 * TRYPICK 스토어프론트 위젯  (코드네임: Greet)
 * - ① 적립/쿠폰 안내 팝업
 * - ② AI 비서 채팅(위챗 스타일 플로팅)  — 하이브리드: FAQ 즉답 + Claude 폴백
 *
 * 의존성 없음(순수 바닐라 JS). 카페24 스킨에 <script src=".../widget.js"> 한 줄로 주입.
 * 모든 CSS 클래스는 tp- 접두사로 격리(쇼핑몰 스킨과 충돌 방지).
 *
 * 수정 포인트는 아래 CONFIG / KB(지식베이스) 두 곳이면 충분합니다.
 * ==========================================================================*/
(function () {
  "use strict";
  if (window.__trypickWidget) return;          // 중복 주입 방지
  window.__trypickWidget = true;

  /* ===== CONFIG — 운영자가 바꾸는 값은 여기만 ===== */
  var CONFIG = {
    brand: "TRYPICK",
    color: "#e07a73",          // TRYPICK 브랜드 코랄로즈. 바꾸면 전체 색이 따라감
    colorDark: "#c75f57",      // 강조용 진한 코랄
    cream: "#fbf1ec",          // 크림 배경(브랜드 톤)
    accent: "#fce7e0",         // 연한 코랄(아이콘칸 배경)
    joinUrl: "/member/join.html",      // 회원가입 페이지
    couponAmount: "3,000원",           // 가입 축하 쿠폰 금액(안내 문구용)

    // AI 비서 백엔드(Cloudflare Worker 등). 비워두면 FAQ 전용으로 동작.
    // 진짜 Claude 연결 시 worker URL을 넣으세요. 예: "https://trypick-bot.xxx.workers.dev/chat"
    chatApiUrl: "",

    // 팝업: 같은 사람에게 하루 1번만 노출
    popupOncePerDay: true,

    // ★이미지형 팝업: 사장님이 만든 디자인 이미지 1장 URL을 넣으면 그게 팝업이 됩니다.
    //   (실사 사진처럼 고급스러운 팝업은 이 방식 권장. 비워두면 아래 코드형 팝업이 뜸.)
    // 라이브 호스팅된 팝업 이미지(카페24 스토리지). 전역 변수로 덮어쓸 수 있음.
    popupImage: (typeof window.TRYPICK_POPUP_IMAGE === "string")
      ? window.TRYPICK_POPUP_IMAGE
      : "https://ecimg.cafe24img.com/pg2875b27060327061/trypick2026/web/upload/NNEditor/20260628/676b296e20b07c2169656b0ac5bca4c5.png",
    popupCtaText: "회원가입하고 3,000원 받기 🎁",

    // 이미지에 버튼·닫기가 이미 디자인돼 있으면 true → 위젯은 투명 클릭영역만 얹음(버튼 중복 방지).
    popupImageBare: true,
    // 클릭영역 위치(이미지 대비 %). 이미지 레이아웃 바뀌면 여기 숫자만 조정.
    popupHotspots: [
      { l: 3,  t: 80, w: 94, h: 10, action: "join"  },  // 회원가입 버튼
      { l: 2,  t: 93, w: 42, h: 6,  action: "today" },  // 오늘 하루 보지 않기
      { l: 74, t: 93, w: 25, h: 6,  action: "close" },  // 닫기
    ],
  };

  /* ===== KB — FAQ 지식베이스(즉답용). 운영자가 자유롭게 추가/수정 =====
   * keywords: 사용자 문장에 이 단어가 있으면 매칭(점수 가산)
   * title:    빠른질문 칩에 노출(없으면 칩 미노출)
   * answer:   답변(HTML 약간 허용)                                          */
  var KB = [
    {
      title: "발주는 얼마나 걸려요?",
      keywords: ["발주", "주문하면", "언제", "며칠", "도매", "들어가", "받아", "배송기간", "얼마나"],
      answer:
        "‘오늘의 픽’ 상품은 <b>주문하시는 즉시 동대문 도매처에 발주</b>가 들어갑니다. " +
        "동대문 아동복 특성상 인기 상품은 금방 품절되니, 마음에 드시면 <b>바로 주문</b>해 주세요! 🚀",
    },
    {
      title: "재고가 금방 없어지나요?",
      keywords: ["재고", "품절", "없어", "남아", "마지막", "수량", "재입고", "다시"],
      answer:
        "네, 동대문 아동복은 <b>소량 생산</b>이라 재고가 빠르게 소진됩니다. " +
        "품절 후에는 재제작에 <b>보통 한 달 정도</b> 걸리거나 다시 못 구할 수도 있어요. " +
        "마음에 드는 상품은 <b>빠른 주문</b>을 권장드립니다! 🙏",
    },
    {
      title: "신상은 언제 올라와요?",
      keywords: ["신상", "새상품", "업데이트", "오늘의픽", "오늘의 픽", "새로운", "언제올라"],
      answer:
        "매일 새로운 신상이 <b>‘오늘의 픽’</b>에 올라옵니다. " +
        "좋은 상품일수록 빨리 나가니, 자주 들러서 확인해 주세요! 👀",
    },
    {
      title: "사이즈는 어떻게 고르나요?",
      keywords: ["사이즈", "치수", "size", "키", "몸무게", "나이", "맞을까", "작나", "크나", "호수"],
      answer:
        "상품 <b>상세페이지 하단</b>에 권장 나이·키·몸무게가 적힌 <b>사이즈 안내표</b>가 있어요. " +
        "참고용이며 브랜드별로 1~2cm 차이가 있을 수 있으니, 평소보다 여유 있게 고르시면 좋아요. 📏",
    },
    {
      title: "배송은 얼마나 걸려요?",
      keywords: ["배송", "택배", "도착", "받는", "발송", "출고", "언제와", "며칠걸"],
      answer:
        "주문하신 상품은 동대문 도매처에서 <b>고객님께 바로 발송(직배송)</b>됩니다. " +
        "보통 영업일 기준 <b>2~4일</b> 내 도착하며, 도매처 사정에 따라 달라질 수 있어요. " +
        "정확한 배송 현황은 <b>마이페이지 &gt; 주문조회</b>에서 확인하실 수 있습니다. 📦",
    },
    {
      title: "적립금·쿠폰 혜택이 궁금해요",
      keywords: ["적립", "포인트", "쿠폰", "혜택", "할인", "이벤트", "마일리지"],
      answer:
        "회원가입만 해도 <b>" + CONFIG.couponAmount + " 쿠폰</b>을 즉시 드려요! 🎁<br>" +
        "그리고 <b>구매 시 10% 적립</b>, <b>포토리뷰 작성 시 10% 적립</b> 혜택이 있습니다. " +
        "적립금은 다음 구매 때 현금처럼 사용하실 수 있어요.",
    },
    {
      title: "교환·반품 되나요?",
      keywords: ["교환", "반품", "환불", "취소", "변심", "사이즈교환"],
      answer:
        "상품 수령 후 <b>7일 이내</b>에 교환·반품 신청이 가능합니다(단순 변심 시 왕복 배송비 고객 부담). " +
        "<b>마이페이지 &gt; 주문조회</b>에서 신청하시거나, 자세한 안내가 필요하시면 말씀해 주세요. 😊",
    },
    {
      keywords: ["회원가입", "가입", "join", "혜택받"],
      answer:
        "지금 회원가입하시면 <b>" + CONFIG.couponAmount + " 쿠폰</b>을 즉시 드려요! " +
        '<a href="' + CONFIG.joinUrl + '" style="color:' + CONFIG.colorDark + ';font-weight:700">회원가입 하러 가기 →</a>',
    },
  ];

  var GREETING =
    "안녕하세요! TRYPICK AI 비서예요. 😊<br>" +
    "동대문 신상 아동복은 <b>금방 품절</b>되니 좋은 상품은 빠른 주문을 추천드려요. " +
    "궁금한 점을 물어보거나 아래 버튼을 눌러보세요!";
  var FALLBACK =
    "죄송해요, 정확히 이해하지 못했어요. 🙏 아래 자주 묻는 질문을 눌러보시거나, " +
    "다른 표현으로 다시 물어봐 주세요. 주문 관련 문의는 <b>마이페이지 &gt; 주문조회</b>를 확인해 주세요.";

  /* ===== 유틸 ===== */
  function $(html) {
    var d = document.createElement("div");
    d.innerHTML = html.trim();
    return d.firstChild;
  }
  function normalize(s) {
    return (s || "").toLowerCase().replace(/\s+/g, "");
  }
  // FAQ 매칭: 키워드 점수 최대 항목 반환(없으면 null)
  function matchKB(msg) {
    var n = normalize(msg), best = null, bestScore = 0;
    for (var i = 0; i < KB.length; i++) {
      var score = 0;
      for (var k = 0; k < KB[i].keywords.length; k++) {
        if (n.indexOf(normalize(KB[i].keywords[k])) !== -1) score++;
      }
      if (score > bestScore) { bestScore = score; best = KB[i]; }
    }
    return bestScore >= 1 ? best : null;
  }

  /* ===== 스타일 주입 ===== */
  var C = CONFIG.color, CD = CONFIG.colorDark, CR = CONFIG.cream, AC = CONFIG.accent;
  var css =
    ".tp-hidden{display:none!important}" +
    // 채팅 플로팅 버튼
    ".tp-fab{position:fixed;right:20px;bottom:20px;z-index:2147483000;width:60px;height:60px;border-radius:50%;" +
    "background:" + C + ";box-shadow:0 6px 20px rgba(0,0,0,.25);cursor:pointer;display:flex;align-items:center;" +
    "justify-content:center;border:none;transition:transform .15s}" +
    ".tp-fab:hover{transform:scale(1.06)}" +
    ".tp-fab svg{width:30px;height:30px;fill:#fff}" +
    ".tp-fab-badge{position:absolute;top:-2px;right:-2px;background:#fff;color:" + CD + ";font-size:11px;font-weight:800;" +
    "border-radius:10px;padding:1px 6px;box-shadow:0 2px 6px rgba(0,0,0,.2)}" +
    // 채팅 패널
    ".tp-panel{position:fixed;right:20px;bottom:90px;z-index:2147483000;width:360px;max-width:calc(100vw - 32px);" +
    "height:560px;max-height:calc(100vh - 120px);background:#fff;border-radius:18px;box-shadow:0 12px 40px rgba(0,0,0,.28);" +
    "display:flex;flex-direction:column;overflow:hidden;font-family:'Jua','Apple SD Gothic Neo','Malgun Gothic',sans-serif}" +
    ".tp-head{background:" + C + ";color:#fff;padding:16px 18px;display:flex;align-items:center;gap:10px}" +
    ".tp-head .tp-av{width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.25);display:flex;align-items:center;justify-content:center;font-size:18px}" +
    ".tp-head .tp-t{font-weight:800;font-size:16px;line-height:1.2}" +
    ".tp-head .tp-s{font-size:12px;opacity:.9}" +
    ".tp-x{margin-left:auto;background:none;border:none;color:#fff;font-size:22px;cursor:pointer;line-height:1;opacity:.85}" +
    ".tp-x:hover{opacity:1}" +
    ".tp-body{flex:1;overflow-y:auto;padding:16px;background:#f7f7f9}" +
    ".tp-msg{display:flex;margin-bottom:12px}" +
    ".tp-msg.tp-me{justify-content:flex-end}" +
    ".tp-bubble{max-width:80%;padding:10px 13px;border-radius:14px;font-size:14px;line-height:1.55;word-break:break-word}" +
    ".tp-bot .tp-bubble{background:#fff;color:#222;border-bottom-left-radius:4px;box-shadow:0 1px 3px rgba(0,0,0,.07)}" +
    ".tp-me .tp-bubble{background:" + C + ";color:#fff;border-bottom-right-radius:4px}" +
    ".tp-bubble a{text-decoration:underline}" +
    ".tp-chips{display:flex;flex-wrap:wrap;gap:7px;margin:4px 0 14px}" +
    ".tp-chip{background:#fff;border:1px solid " + C + ";color:" + CD + ";border-radius:16px;padding:7px 12px;font-size:13px;cursor:pointer;transition:.12s}" +
    ".tp-chip:hover{background:" + C + ";color:#fff}" +
    ".tp-typing .tp-bubble{color:#999}" +
    ".tp-foot{display:flex;gap:8px;padding:10px;border-top:1px solid #eee;background:#fff}" +
    ".tp-foot input{flex:1;border:1px solid #ddd;border-radius:20px;padding:10px 14px;font-size:14px;outline:none}" +
    ".tp-foot input:focus{border-color:" + C + "}" +
    ".tp-send{background:" + C + ";border:none;border-radius:50%;width:40px;height:40px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex:0 0 auto}" +
    ".tp-send svg{width:20px;height:20px;fill:#fff}" +
    // 팝업
    ".tp-pop-back{position:fixed;inset:0;z-index:2147483600;background:rgba(60,30,25,.45);display:flex;align-items:center;justify-content:center;padding:20px}" +
    ".tp-pop{width:360px;max-width:100%;background:" + CR + ";border-radius:24px;overflow:hidden;box-shadow:0 24px 70px rgba(150,80,70,.38);font-family:'Jua','Apple SD Gothic Neo','Malgun Gothic',sans-serif;animation:tp-pop-in .28s cubic-bezier(.18,.9,.3,1.1)}" +
    "@keyframes tp-pop-in{from{transform:translateY(24px) scale(.94);opacity:0}to{transform:none;opacity:1}}" +
    ".tp-pop-hero{padding:26px 24px 12px;text-align:center}" +
    ".tp-smiley{width:50px;height:50px;margin:0 auto 4px;display:block}" +
    ".tp-brand{font-family:'Quicksand','Apple SD Gothic Neo',sans-serif;font-weight:700;letter-spacing:4px;color:" + C + ";font-size:34px;line-height:1}" +
    ".tp-brand small{display:block;font-family:'Quicksand',sans-serif;letter-spacing:4px;font-size:10px;font-weight:600;color:" + C + ";opacity:.7;margin-top:6px}" +
    ".tp-pop-label{display:inline-block;margin:18px 0 4px;background:#fff;color:" + CD + ";font-weight:400;font-size:12px;padding:6px 14px;border-radius:16px;box-shadow:0 3px 10px rgba(200,95,87,.18)}" +
    ".tp-pop-bigwrap{display:flex;align-items:flex-end;justify-content:center;gap:8px;margin:6px 0 0}" +
    ".tp-pop-mega{font-family:'Quicksand','Apple SD Gothic Neo',sans-serif;font-size:100px;font-weight:700;color:" + C + ";line-height:.82;letter-spacing:-3px}" +
    ".tp-pop-mega i{font-size:62px;font-style:normal}" +
    ".tp-pop-megasub{font-size:32px;font-weight:800;color:" + C + ";padding-bottom:14px}" +
    ".tp-pop-sub{color:#a98a82;font-size:13px;margin-top:12px;font-weight:600}" +
    ".tp-perks{padding:6px 22px 2px}" +
    ".tp-perk{display:flex;align-items:center;gap:10px;background:#fff;border-radius:12px;padding:8px 12px;margin-bottom:7px;box-shadow:0 2px 9px rgba(190,120,110,.09)}" +
    ".tp-perk .tp-ic{width:30px;height:30px;border-radius:9px;background:" + AC + ";display:flex;align-items:center;justify-content:center;font-size:15px;flex:0 0 auto}" +
    ".tp-perk b{color:" + CD + ";font-weight:800}" +
    ".tp-perk .tp-pt{font-size:12.5px;color:#4a3b37;line-height:1.35}" +
    // 이미지형 팝업
    ".tp-pop-imgwrap{position:relative;line-height:0}" +
    ".tp-pop-imgwrap img{width:100%;display:block}" +
    ".tp-pop-imgx{position:absolute;top:10px;right:10px;width:32px;height:32px;border-radius:50%;background:rgba(0,0,0,.38);color:#fff;border:none;font-size:16px;cursor:pointer;line-height:32px;text-align:center;z-index:4}" +
    ".tp-pop-imgx:hover{background:rgba(0,0,0,.6)}" +
    ".tp-hot{position:absolute;background:transparent;border:none;cursor:pointer;padding:0;z-index:3}" +
    ".tp-pop-cta{display:block;margin:8px 20px 12px;background:" + C + ";color:#fff;text-align:center;padding:15px;border-radius:14px;font-weight:800;font-size:16px;text-decoration:none;box-shadow:0 6px 16px rgba(200,95,87,.32)}" +
    ".tp-pop-cta:hover{background:" + CD + "}" +
    ".tp-pop-foot{display:flex;justify-content:space-between;padding:0 24px 18px;font-size:12px}" +
    ".tp-pop-foot button{background:none;border:none;color:#b09a93;cursor:pointer;font-size:12px}" +
    ".tp-pop-foot button:hover{color:#7a655f}" +
    // 모바일
    "@media(max-width:480px){.tp-panel{right:0;bottom:0;width:100vw;height:100vh;max-height:100vh;border-radius:0}.tp-fab{right:16px;bottom:16px}}";
  // 둥근 폰트: Quicksand(로고/숫자), Jua(한글 본문) — 위젯 전체를 동글하게
  document.head.appendChild($('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Quicksand:wght@600;700&family=Jua&display=swap">'));
  document.head.appendChild($("<style>" + css + "</style>"));

  /* ===== 팝업 ===== */
  function showPopup() {
    if (CONFIG.popupOncePerDay) {
      var today = new Date().toISOString().slice(0, 10);
      if (localStorage.getItem("tp_popup_day") === today) return;
    }
    var back = $('<div class="tp-pop-back"></div>');
    if (CONFIG.popupImage) {
      // 이미지형: 사장님이 만든 디자인 이미지 1장이 곧 팝업
      var hot = (CONFIG.popupImageBare ? (CONFIG.popupHotspots || []) : []).map(function (h) {
        return '<button class="tp-hot" data-tp="' + h.action + '" aria-label="' + h.action + '" ' +
               'style="left:' + h.l + '%;top:' + h.t + '%;width:' + h.w + '%;height:' + h.h + '%"></button>';
      }).join("");
      back.innerHTML =
        '<div class="tp-pop tp-pop-img" role="dialog" aria-label="이벤트 안내">' +
          '<div class="tp-pop-imgwrap">' +
            '<button class="tp-pop-imgx" data-tp="close" aria-label="닫기">✕</button>' +
            '<a href="' + CONFIG.joinUrl + '" data-tp="join"><img src="' + CONFIG.popupImage + '" alt="TRYPICK 이벤트"></a>' +
            hot +
          '</div>' +
          (CONFIG.popupImageBare ? "" :
            '<a class="tp-pop-cta" href="' + CONFIG.joinUrl + '">' + CONFIG.popupCtaText + '</a>' +
            '<div class="tp-pop-foot"><button data-tp="today">오늘 하루 보지 않기</button><button data-tp="close">닫기 ✕</button></div>') +
        '</div>';
    } else {
    back.innerHTML =
      '<div class="tp-pop" role="dialog" aria-label="이벤트 안내">' +
        '<div class="tp-pop-hero">' +
          '<svg class="tp-smiley" viewBox="0 0 100 100" aria-hidden="true">' +
            '<circle cx="50" cy="50" r="40" fill="none" stroke="' + C + '" stroke-width="6"/>' +
            '<circle cx="38" cy="43" r="4.5" fill="' + C + '"/><circle cx="62" cy="43" r="4.5" fill="' + C + '"/>' +
            '<path d="M33 58 Q50 75 67 58" fill="none" stroke="' + C + '" stroke-width="6" stroke-linecap="round"/>' +
          '</svg>' +
          '<div class="tp-brand">TRYPICK<small>LOVELY KIDS DAILY LOOK</small></div>' +
          '<div class="tp-pop-label">🎉 오픈 기념 적립 이벤트</div>' +
          '<div class="tp-pop-bigwrap"><span class="tp-pop-mega">20<i>%</i></span><span class="tp-pop-megasub">적립</span></div>' +
          '<div class="tp-pop-sub">최대 20% 적립 — 지금 가입하고 다 받아가세요!</div>' +
        '</div>' +
        '<div class="tp-perks">' +
          '<div class="tp-perk"><div class="tp-ic">🎁</div><div class="tp-pt">회원가입하면 <b>' + CONFIG.couponAmount + ' 쿠폰</b> 즉시 지급</div></div>' +
          '<div class="tp-perk"><div class="tp-ic">🛍️</div><div class="tp-pt">구매하면 <b>10% 적립</b></div></div>' +
          '<div class="tp-perk"><div class="tp-ic">📸</div><div class="tp-pt">포토리뷰 작성하면 <b>10% 적립</b></div></div>' +
        '</div>' +
        '<a class="tp-pop-cta" href="' + CONFIG.joinUrl + '">회원가입하고 ' + CONFIG.couponAmount + ' 받기 🎁</a>' +
        '<div class="tp-pop-foot"><button data-tp="today">오늘 하루 보지 않기</button><button data-tp="close">닫기 ✕</button></div>' +
      '</div>';
    }
    function close(remember) {
      if (remember) localStorage.setItem("tp_popup_day", new Date().toISOString().slice(0, 10));
      back.remove();
    }
    back.addEventListener("click", function (e) {
      var t = e.target.getAttribute("data-tp");
      if (t === "today") close(true);
      else if (t === "join") window.location.href = CONFIG.joinUrl;
      else if (t === "close" || e.target === back) close(false);
    });
    document.body.appendChild(back);
  }

  /* ===== 채팅 ===== */
  var panel, bodyEl, inputEl, opened = false, history = [];

  function buildPanel() {
    panel = $(
      '<div class="tp-panel tp-hidden">' +
        '<div class="tp-head">' +
          '<div class="tp-av">🧸</div>' +
          '<div><div class="tp-t">TRYPICK AI 비서</div><div class="tp-s">보통 몇 초 안에 답해요</div></div>' +
          '<button class="tp-x" aria-label="닫기">✕</button>' +
        '</div>' +
        '<div class="tp-body"></div>' +
        '<div class="tp-foot">' +
          '<input type="text" placeholder="궁금한 점을 입력하세요" aria-label="메시지 입력"/>' +
          '<button class="tp-send" aria-label="보내기"><svg viewBox="0 0 24 24"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg></button>' +
        '</div>' +
      '</div>'
    );
    bodyEl = panel.querySelector(".tp-body");
    inputEl = panel.querySelector(".tp-foot input");
    panel.querySelector(".tp-x").addEventListener("click", toggle);
    panel.querySelector(".tp-send").addEventListener("click", function () { submit(); });
    inputEl.addEventListener("keydown", function (e) { if (e.key === "Enter") submit(); });
    document.body.appendChild(panel);

    addBot(GREETING);
    addChips();
  }

  function scrollDown() { bodyEl.scrollTop = bodyEl.scrollHeight; }

  function addMsg(who, html) {
    var m = $('<div class="tp-msg tp-' + who + '"><div class="tp-bubble">' + html + "</div></div>");
    bodyEl.appendChild(m);
    scrollDown();
    return m;
  }
  function addBot(html) { return addMsg("bot", html); }
  function addMe(text) { return addMsg("me", text.replace(/</g, "&lt;")); }

  function addChips() {
    var chips = KB.filter(function (k) { return k.title; });
    var wrap = $('<div class="tp-chips"></div>');
    chips.forEach(function (k) {
      var c = $('<button class="tp-chip">' + k.title + "</button>");
      c.addEventListener("click", function () {
        addMe(k.title);
        wrap.remove();
        botReply(k.answer);
      });
      wrap.appendChild(c);
    });
    bodyEl.appendChild(wrap);
    scrollDown();
  }

  function typing() {
    var t = $('<div class="tp-msg tp-bot tp-typing"><div class="tp-bubble">입력 중<span>…</span></div></div>');
    bodyEl.appendChild(t); scrollDown();
    return t;
  }

  function botReply(html) { setTimeout(function () { addBot(html); }, 250); }

  function submit() {
    var text = (inputEl.value || "").trim();
    if (!text) return;
    inputEl.value = "";
    addMe(text);
    history.push({ role: "user", content: text });

    // 1) FAQ 즉답
    var hit = matchKB(text);
    if (hit) { botReply(hit.answer); history.push({ role: "assistant", content: hit.answer }); return; }

    // 2) 백엔드(Claude) 폴백 — 설정돼 있으면 호출, 아니면 안내
    if (!CONFIG.chatApiUrl) { botReply(FALLBACK); return; }
    askClaude(text);
  }

  function askClaude(text) {
    var t = typing();
    fetch(CONFIG.chatApiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, history: history.slice(-8) }),
    })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        t.remove();
        var reply = (d && d.reply) ? d.reply : FALLBACK;
        addBot(reply.replace(/\n/g, "<br>"));
        history.push({ role: "assistant", content: reply });
      })
      .catch(function () {
        t.remove();
        addBot(FALLBACK);
      });
  }

  function toggle() {
    opened = !opened;
    panel.classList.toggle("tp-hidden", !opened);
    fab.classList.toggle("tp-hidden", opened);
    if (opened) { var b = fab.querySelector(".tp-fab-badge"); if (b) b.remove(); setTimeout(function () { inputEl.focus(); }, 50); }
  }

  /* ===== 플로팅 버튼 ===== */
  var fab = $(
    '<button class="tp-fab" aria-label="AI 비서에게 물어보기">' +
      '<span class="tp-fab-badge">1</span>' +
      '<svg viewBox="0 0 24 24"><path d="M12 2C6.5 2 2 5.8 2 10.5c0 2.5 1.3 4.7 3.4 6.2-.1 1-.6 2.4-1.4 3.6 1.7-.3 3.4-1 4.7-1.9.9.2 1.9.3 3.3.3 5.5 0 10-3.8 10-8.5S17.5 2 12 2z"/></svg>' +
    "</button>"
  );
  fab.addEventListener("click", toggle);

  /* ===== 시작 ===== */
  function init() {
    document.body.appendChild(fab);
    buildPanel();
    showPopup();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
