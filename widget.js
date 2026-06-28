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

    // ★SNS 푸터 링크(쇼핑몰 하단에 인스타·스레드 아이콘). 비우면 해당 아이콘 미노출.
    instagramUrl: "https://www.instagram.com/trypick_2026",
    threadsUrl: "https://www.threads.com/@trypick_2026",
    socialLabel: "TRYPICK 팔로우하고 신상 소식 받기",

    // ★메인페이지에서 숨길 섹션(제목 텍스트 기준). 카페24 기본 디자인 잔여 섹션 제거용.
    //   제목이 일치하는 .main_section 통째로 숨김(섹션 번호가 바뀌어도 안전).
    hideSections: ["MAGAZINE", "MUMU TV"],
    // ★메뉴에서 숨길 링크(href 부분일치). 해당 링크의 메뉴 항목(li) 통째로 숨김.
    //   MAGAZINE 메뉴 = /board/magazine/... (PC·모바일 공통).
    hideNavHrefs: ["board/magazine"],
    // ★푸터 회사정보에서 가릴 문자열(부분일치 제거). 자택주소 동호수 등 프라이버시.
    //   ⚠️ 화면에서만 가림(카페24 다른 페이지엔 원본 남음). 정확한 삭제는 관리자 회사정보 수정.
    footerTextRemove: ["113동703호"],
    // ★페이지 전체 텍스트 치환(개인 전화번호 → 0502 안심번호 등). 화면 표시만 교체.
    textReplace: [
      { from: "01062365011", to: "0502-1936-2008" },
      { from: "010-6236-5011", to: "0502-1936-2008" },
    ],

    // 고객센터 상담: AI가 못 푸는 문의는 카카오톡 채널로 연결. (채널 채팅 URL)
    kakaoUrl: "http://pf.kakao.com/_PKFAX/chat",

    // 라이브에 떠 있던 '기존 카카오톡 플로팅 버튼'을 숨김(AI 비서만 남김).
    // 우리 채팅 말풍선 안의 카카오 상담 버튼(.tp-kakao)은 제외하고 숨깁니다.
    hideKakaoFloating: true,

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

    // ★상품목록 '예상 적립금' 표기: 판매가 아래에 한 줄("💰 최대 N원 적립")을 얹음.
    //   rate=0.20 → 구매 10% + 포토리뷰 10% 합산(=최대치)이라 prefix를 "최대 "로 둠.
    //   정책 바뀌면 rate/prefix/suffix만 조정. rewardShow:false로 끌 수 있음.
    rewardShow: true,
    rewardRate: 0.20,
    rewardPrefix: "최대 ",
    rewardSuffix: " 적립",
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
        "<b>마이페이지 &gt; 주문조회</b>에서 신청하실 수 있어요. 자세한 안내가 필요하시면 아래 카카오톡 채널로 상담해 주세요. 😊<br>" +
        '<a class="tp-kakao" href="' + CONFIG.kakaoUrl + '" target="_blank" rel="noopener">💬 카카오톡으로 상담하기</a>',
    },
    {
      title: "고객센터에 문의하고 싶어요",
      keywords: ["고객센터", "상담", "상담사", "상담원", "문의", "연결", "전화", "연락", "사람", "직원", "카카오", "카톡", "채팅상담"],
      answer:
        "AI 비서가 바로 도와드리기 어려운 문의는 <b>카카오톡 채널 상담</b>으로 연결해 드릴게요. 😊<br>" +
        "아래 버튼을 누르면 TRYPICK 카카오톡 채널로 바로 연결됩니다.<br>" +
        '<a class="tp-kakao" href="' + CONFIG.kakaoUrl + '" target="_blank" rel="noopener">💬 카카오톡으로 상담하기</a>',
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
    "다른 표현으로 다시 물어봐 주세요. 주문 관련 문의는 <b>마이페이지 &gt; 주문조회</b>를 확인해 주세요.<br>" +
    "바로 상담이 필요하시면 카카오톡 채널로 연결해 드릴게요.<br>" +
    '<a class="tp-kakao" href="' + CONFIG.kakaoUrl + '" target="_blank" rel="noopener">💬 카카오톡으로 상담하기</a>';

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
    // 기존 카카오톡 채널 버튼(우리 .tp-kakao 제외) 즉시 숨김
    (CONFIG.hideKakaoFloating
      ? 'a[href*="pf.kakao.com"]:not(.tp-kakao),iframe[src*="pf.kakao.com"]{display:none!important}'
      : "") +
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
    // 카카오톡 상담 버튼(채팅 말풍선 안에 노출)
    ".tp-kakao{display:inline-flex;align-items:center;gap:6px;margin-top:9px;background:#FEE500;color:#3C1E1E;font-weight:800;" +
    "text-decoration:none;padding:10px 16px;border-radius:12px;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,.12)}" +
    ".tp-kakao:hover{filter:brightness(.96)}" +
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
    // SNS 푸터 바(쇼핑몰 하단 인스타·스레드)
    ".tp-social{box-sizing:border-box;width:100%;display:flex;flex-direction:column;align-items:center;gap:11px;" +
    "padding:26px 16px 30px;background:" + CR + ";font-family:'Jua','Apple SD Gothic Neo','Malgun Gothic',sans-serif}" +
    ".tp-social-label{font-size:13px;color:" + CD + ";letter-spacing:.4px}" +
    ".tp-social-ic{display:flex;gap:14px}" +
    ".tp-social-ic a{width:46px;height:46px;border-radius:50%;background:" + C + ";display:flex;align-items:center;" +
    "justify-content:center;box-shadow:0 3px 10px rgba(200,95,87,.25);transition:transform .15s,background .15s}" +
    ".tp-social-ic a:hover{background:" + CD + ";transform:translateY(-2px)}" +
    ".tp-social-ic a svg{width:24px;height:24px;fill:#fff}" +
    // 상품목록 예상 적립금 한 줄
    ".tp-reward{list-style:none;margin:7px 0 0;padding:7px 2px 0;border-top:1px solid #f0e6e2;font-size:12px;line-height:1.3;color:#8a8a8a;display:flex;align-items:center;gap:5px;letter-spacing:-.2px}" +
    ".tp-reward .tp-coin{width:15px;height:15px;flex:0 0 auto}" +
    ".tp-reward .tp-rwd-amt{color:" + CD + ";font-weight:800}" +
    // 상세페이지 적립금(판매가 행 아래) — 살짝 크게
    ".tp-reward-detail{margin:10px 0 0;padding-top:10px;font-size:13.5px}" +
    ".tp-reward-detail .tp-coin{width:17px;height:17px}" +
    // 모바일
    "@media(max-width:480px){.tp-panel{right:0;bottom:0;width:100vw;height:100vh;max-height:100vh;border-radius:0}.tp-fab{right:16px;bottom:16px}.tp-reward{font-size:11px}}";
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

  /* ===== 기존 카카오톡 플로팅 버튼 숨김 =====
   * 라이브에 별도로 깔려 있던 카카오 채널 버튼을 AI 비서와 겹치지 않게 숨깁니다.
   * 우리 위젯(.tp-) 안의 카카오 상담 버튼은 절대 건드리지 않습니다.            */
  function hideKakao() {
    if (!CONFIG.hideKakaoFloating) return;
    try {
      var found = [];
      // 1) 카카오 채널로 가는 링크/iframe (우리 .tp-kakao 제외)
      document.querySelectorAll(
        'a[href*="pf.kakao.com"],a[href*="kakao.com/_"],iframe[src*="pf.kakao.com"],iframe[src*="kakao.com/_"]'
      ).forEach(function (n) { found.push(n); });
      // 2) class/id에 kakao가 들어간 '떠 있는' 요소(고정/절대 위치만)
      document.querySelectorAll('[class*="kakao" i],[id*="kakao" i],[class*="kko" i]').forEach(function (n) {
        var pos = "";
        try { pos = getComputedStyle(n).position; } catch (e) {}
        if (pos === "fixed" || pos === "absolute") found.push(n);
      });
      found.forEach(function (n) {
        // 우리 위젯 내부 요소는 건드리지 않음
        if (n.classList && n.classList.contains("tp-kakao")) return;
        if (n.closest && (n.closest(".tp-panel") || n.closest(".tp-pop-back") || n.closest(".tp-fab"))) return;
        // 떠 있는(고정/절대) 부모를 찾아 통째로 숨김(빈 잔상 방지)
        var hide = n, el = n;
        for (var i = 0; i < 6 && el && el !== document.body; i++) {
          var pos = "";
          try { pos = getComputedStyle(el).position; } catch (e) {}
          if (pos === "fixed" || pos === "absolute") { hide = el; break; }
          el = el.parentElement;
        }
        if (hide.closest && (hide.closest(".tp-panel") || hide.closest(".tp-pop-back") || hide.closest(".tp-fab"))) return;
        hide.style.setProperty("display", "none", "important");
      });
    } catch (e) {}
  }

  /* ===== 메인페이지 잔여 섹션 숨김 (MAGAZINE / MUMU TV 등) =====
   * 카페24 기본 디자인에 남은 섹션을 제목 텍스트로 찾아 통째로 숨깁니다.
   * 섹션 번호(main_section_N)가 아니라 '제목'으로 매칭해 디자인 변경에 안전.        */
  function hideSections() {
    try {
      // 1) 메인페이지 섹션(제목 텍스트 기준)
      if (CONFIG.hideSections && CONFIG.hideSections.length) {
        var wants = CONFIG.hideSections.map(function (s) { return (s || "").replace(/\s+/g, "").toUpperCase(); });
        document.querySelectorAll('.main_section,[id^="main_section_"]').forEach(function (sec) {
          if (sec.getAttribute("data-tp-hidden")) return;
          var h = sec.querySelector("h1,h2,h3,h4");
          if (!h) return;
          var t = (h.textContent || "").replace(/\s+/g, "").toUpperCase();
          if (wants.indexOf(t) !== -1) {
            sec.setAttribute("data-tp-hidden", "1");
            sec.style.setProperty("display", "none", "important");
          }
        });
      }
      // 2) 메뉴 링크(href 부분일치) — 해당 항목(li) 숨김. 예: MAGAZINE 메뉴 제거.
      if (CONFIG.hideNavHrefs && CONFIG.hideNavHrefs.length) {
        document.querySelectorAll("a[href]").forEach(function (a) {
          if (a.getAttribute("data-tp-navhide")) return;
          var href = a.getAttribute("href") || "";
          for (var i = 0; i < CONFIG.hideNavHrefs.length; i++) {
            if (href.indexOf(CONFIG.hideNavHrefs[i]) !== -1) {
              a.setAttribute("data-tp-navhide", "1");
              var li = a.closest("li") || a;
              li.style.setProperty("display", "none", "important");
              break;
            }
          }
        });
      }
    } catch (e) {}
  }

  /* ===== 푸터 회사정보 가리기 + 페이지 전체 텍스트 치환 (프라이버시) =====
   * footerTextRemove: 푸터 영역에서 문자열 제거(동호수 등)
   * textReplace: 페이지 전체에서 문자열 치환(개인 전화 → 0502 등). 화면 표시만 바꿈.        */
  function tpWalkText(root, fn) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), n, nodes = [];
    while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach(function (node) {
      var p = node.parentNode;
      if (p && (p.nodeName === "SCRIPT" || p.nodeName === "STYLE" || p.nodeName === "TEXTAREA")) return;
      if (p && p.closest && p.closest(".tp-panel,.tp-pop-back,.tp-fab,.tp-social")) return;  // 우리 위젯 제외
      var v = fn(node.nodeValue);
      if (v !== node.nodeValue) node.nodeValue = v;
    });
  }
  function scrubFooterText() {
    try {
      if (CONFIG.footerTextRemove && CONFIG.footerTextRemove.length) {
        var root = document.querySelector("#footer, footer, .xans-layout-footer") || document.body;
        tpWalkText(root, function (v) {
          var changed = false;
          CONFIG.footerTextRemove.forEach(function (s) {
            if (s && v.indexOf(s) !== -1) { v = v.split(s).join(""); changed = true; }
          });
          return changed ? v.replace(/\s{2,}/g, " ").replace(/\s+$/, "") : v;
        });
      }
      if (CONFIG.textReplace && CONFIG.textReplace.length) {
        tpWalkText(document.body, function (v) {
          CONFIG.textReplace.forEach(function (r) {
            if (r.from && v.indexOf(r.from) !== -1) v = v.split(r.from).join(r.to);
          });
          return v;
        });
      }
    } catch (e) {}
  }

  /* ===== SNS 푸터 바 (쇼핑몰 하단 인스타·스레드 아이콘) ===== */
  function injectSocial() {
    if (!CONFIG.instagramUrl && !CONFIG.threadsUrl) return;
    if (document.querySelector(".tp-social")) return;           // 중복 방지
    // 공식 로고(simple-icons) 글리프 — 흰색으로 코랄 원형 버튼 위에 표시
    var IG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.03.084c-1.277.06-2.149.264-2.911.563-.789.308-1.458.72-2.123 1.388C1.33 2.703.918 3.372.613 4.156.318 4.92.118 5.792.062 7.07.006 8.347-.007 8.758 0 12.017c.006 3.258.02 3.667.082 4.947.061 1.277.264 2.148.563 2.911.308.789.72 1.457 1.388 2.123.668.665 1.337 1.074 2.122 1.38.763.295 1.636.495 2.913.552 1.278.057 1.688.069 4.946.063 3.258-.006 3.668-.021 4.948-.082 1.28-.06 2.147-.265 2.91-.563.789-.309 1.458-.72 2.123-1.388.665-.668 1.074-1.338 1.38-2.121.295-.764.495-1.636.552-2.913.057-1.281.069-1.69.063-4.948-.006-3.258-.021-3.667-.082-4.947-.06-1.28-.264-2.149-.563-2.912-.308-.789-.72-1.457-1.388-2.123C21.298 1.33 20.628.92 19.845.616 19.081.321 18.209.121 16.931.064 15.654.007 15.243-.005 11.984.001 8.726.007 8.317.021 7.03.084m.14 21.693c-1.17-.05-1.805-.245-2.228-.408-.56-.216-.96-.477-1.382-.895-.422-.418-.681-.819-.9-1.378-.164-.423-.362-1.058-.417-2.228-.06-1.264-.072-1.644-.079-4.848-.007-3.204.005-3.583.061-4.848.05-1.169.246-1.805.408-2.228.216-.561.477-.96.895-1.382.418-.422.818-.68 1.378-.9.423-.164 1.058-.361 2.227-.417 1.266-.06 1.645-.072 4.848-.079 3.203-.007 3.583.005 4.85.061 1.168.05 1.805.245 2.227.408.561.216.96.476 1.382.895.422.419.681.818.9 1.378.165.423.362 1.058.417 2.228.06 1.265.073 1.644.081 4.848.008 3.204-.005 3.583-.061 4.848-.051 1.17-.245 1.805-.408 2.229-.216.56-.477.96-.896 1.382-.418.421-.818.68-1.378.9-.423.164-1.057.362-2.226.417-1.266.06-1.645.072-4.849.079-3.204.007-3.582-.006-4.848-.061m9.115-16.19a1.44 1.44 0 1 0 1.437-1.443 1.44 1.44 0 0 0-1.437 1.442M5.838 12.012c.007 3.403 2.771 6.156 6.173 6.149 3.403-.006 6.157-2.77 6.151-6.173-.006-3.403-2.771-6.157-6.174-6.15-3.403.007-6.156 2.771-6.15 6.174M8 12.005a4 4 0 1 1 4.008 3.992A4 4 0 0 1 8 12.005"/></svg>';
    var TH = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 0 1 3.02.142c-.126-.742-.375-1.332-.74-1.755-.5-.58-1.27-.876-2.29-.876h-.054c-.66.011-1.297.272-1.94.99l-1.503-1.39c.92-1.214 2.246-1.79 3.787-1.748 1.673.024 2.965.62 3.84 1.771.799 1.054 1.196 2.499 1.213 4.394.124.078.244.16.359.246 1.39 1.043 2.235 2.469 2.385 4.015.182 1.872-.515 4.197-2.385 6.027-1.834 1.795-4.052 2.61-7.236 2.633Zm1.018-11.405c-.327 0-.66.01-.999.03-1.84.103-2.984.946-2.91 2.144.07 1.135 1.328 1.66 2.527 1.594 1.102-.06 2.541-.488 2.783-3.483a10.32 10.32 0 0 0-1.401-.084z"/></svg>';
    var links = "";
    if (CONFIG.instagramUrl)
      links += '<a href="' + CONFIG.instagramUrl + '" target="_blank" rel="noopener" aria-label="TRYPICK 인스타그램">' + IG + "</a>";
    if (CONFIG.threadsUrl)
      links += '<a href="' + CONFIG.threadsUrl + '" target="_blank" rel="noopener" aria-label="TRYPICK 스레드">' + TH + "</a>";
    var bar = $('<div class="tp-social">' +
      (CONFIG.socialLabel ? '<div class="tp-social-label">' + CONFIG.socialLabel + "</div>" : "") +
      '<div class="tp-social-ic">' + links + "</div></div>");
    // 쇼핑몰 푸터를 찾아 그 안에 넣고, 없으면 body 끝에 붙임(둘 다 페이지 최하단)
    var target = document.querySelector("#footer") || document.querySelector("footer") ||
                 document.querySelector(".xans-layout-footer");
    if (!target) {
      var cand = document.querySelectorAll('[id*="footer" i],[class*="footer" i]');
      target = cand.length ? cand[cand.length - 1] : null;
    }
    (target || document.body).appendChild(bar);
  }

  /* ===== 예상 적립금 표기 (목록 + 상세) =====
   * 판매가(소비자가 아님!) × rewardRate 를 "🙂 최대 N원 적립" 한 줄로 얹음. 멱등(data-tp-reward).
   * 적립금은 판매가 기준. 소비자가>판매가면 .custom 텍스트는 '소비자가'라 오산되므로 판매가를 정확히 골라 씀. */
  var REWARD_SMILEY =
    '<svg class="tp-coin" viewBox="0 0 24 24" aria-hidden="true">' +
      '<rect x="1" y="1" width="22" height="22" rx="7" fill="' + CONFIG.color + '"/>' +
      '<circle cx="8.6" cy="10" r="1.8" fill="#fff"/><circle cx="15.4" cy="10" r="1.8" fill="#fff"/>' +
      '<path d="M7.6 13.8 Q12 18 16.4 13.8" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/>' +
    "</svg>";
  function rewardNode(price, extraClass) {
    var reward = Math.floor(price * CONFIG.rewardRate);
    return $('<li class="tp-reward' + (extraClass ? " " + extraClass : "") + '">' + REWARD_SMILEY +
      '<span>' + CONFIG.rewardPrefix +
      '<b class="tp-rwd-amt">' + reward.toLocaleString("ko-KR") + '원</b>' +
      CONFIG.rewardSuffix + "</span></li>");
  }
  function numFrom(el) {
    var m = el && (el.textContent || "").match(/[\d,]+/);
    return m ? parseInt(m[0].replace(/,/g, ""), 10) : 0;
  }

  // 목록: 각 카드 li.price_all 아래에
  function injectRewards() {
    if (!CONFIG.rewardShow) return;
    try {
      var rows = document.querySelectorAll("li.price_all");
      for (var i = 0; i < rows.length; i++) {
        var li = rows[i];
        if (li.getAttribute("data-tp-reward")) continue;          // 이미 처리됨
        // 판매가 추출: 디자인앱 d-custom(=판매가) 우선 → 폴백 .pri → .custom
        var price = 0;
        var card = li.closest ? (li.closest(".item_list_box") || li.closest("li")) : null;
        var cp = card && card.querySelector ? card.querySelector(".custom_pro") : null;
        if (cp && cp.getAttribute("d-custom")) price = parseInt(cp.getAttribute("d-custom"), 10);
        if (!price) price = numFrom(li.querySelector(".pri") || li.querySelector(".custom"));
        if (!price || price < 1000) continue;                      // 0원/비정상/로그인필요 → 스킵
        li.setAttribute("data-tp-reward", "1");
        var el = rewardNode(price);
        if (li.parentNode) li.parentNode.insertBefore(el, li.nextSibling);
      }
    } catch (e) {}
  }

  // 상세: 판매가(#span_product_price_text) 행 아래에
  function injectRewardDetail() {
    if (!CONFIG.rewardShow) return;
    try {
      var pe = document.getElementById("span_product_price_text");
      if (!pe) return;                                             // 상세페이지 아님
      var row = (pe.closest && (pe.closest(".product_price_css") || pe.closest("li"))) || pe.parentElement;
      if (!row || row.getAttribute("data-tp-reward")) return;
      var price = numFrom(pe);
      if (!price || price < 1000) return;
      row.setAttribute("data-tp-reward", "1");
      var el = rewardNode(price, "tp-reward-detail");
      if (row.parentNode) row.parentNode.insertBefore(el, row.nextSibling);
    } catch (e) {}
  }

  /* ===== 시작 ===== */
  function init() {
    document.body.appendChild(fab);
    buildPanel();
    showPopup();
    injectSocial();
    injectRewards();
    injectRewardDetail();
    hideSections();
    scrubFooterText();
    // 카카오 버튼·잔여 섹션은 SDK/모션으로 늦게 그려질 수 있어 여러 번/감시로 처리
    hideKakao();
    [400, 1200, 2500, 5000].forEach(function (ms) { setTimeout(function () { hideKakao(); injectRewards(); injectRewardDetail(); hideSections(); scrubFooterText(); }, ms); });
    try {
      var mo = new MutationObserver(function () { hideKakao(); injectRewards(); injectRewardDetail(); hideSections(); scrubFooterText(); });
      mo.observe(document.body, { childList: true, subtree: true });
      setTimeout(function () { mo.disconnect(); }, 12000); // 12초 후 감시 종료(성능)
    } catch (e) {}
    // 무한스크롤/더보기로 뒤늦게 로드되는 상품에도 적립금 표기(스로틀)
    var rTimer = null;
    window.addEventListener("scroll", function () {
      if (rTimer) return;
      rTimer = setTimeout(function () { rTimer = null; injectRewards(); }, 400);
    }, { passive: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
