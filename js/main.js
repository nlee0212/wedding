(function () {
  "use strict";
  var W = window.WEDDING;
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  var get = function (path) { return path.split(".").reduce(function (o, k) { return o && o[k]; }, W); };
  var el = function (tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  var pad = function (v) { return v < 10 ? "0" + v : String(v); };
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  };

  // ── 색 테마 (config.theme, 미리보기는 ?theme=paper 등) ──
  var themeQ = /[?&]theme=(\w+)/.exec(location.search);
  var theme = themeQ ? themeQ[1] : W.theme;
  if (theme && theme !== "rose") document.documentElement.setAttribute("data-theme", theme);

  // ── 날짜 문구 만들기 (한국 시간 기준) ──
  var wd = new Date(W.date);
  var kst = new Date(wd.getTime() + 9 * 3600 * 1000);
  var Y = kst.getUTCFullYear(), M = kst.getUTCMonth(), D = kst.getUTCDate(), dow = kst.getUTCDay();
  var h = kst.getUTCHours(), mi = kst.getUTCMinutes();
  var KO_DOW = ["일", "월", "화", "수", "목", "금", "토"];
  var EN_DOW = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var EN_MON = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var koTime = (h < 12 ? "오전 " : "오후 ") + ((h % 12) || 12) + "시" + (mi ? " " + mi + "분" : "");
  var enTime = (h < 12 ? "AM " : "PM ") + ((h % 12) || 12) + ":" + pad(mi);
  W.dateKo = Y + "년 " + (M + 1) + "월 " + D + "일 (" + KO_DOW[dow] + ") " + koTime;
  W.dateKoFull = Y + "년 " + (M + 1) + "월 " + D + "일 " + KO_DOW[dow] + "요일 | " + koTime;
  W.dateEn = EN_DOW[dow] + ", " + EN_MON[M] + " " + D + ", " + Y + " | " + enTime;
  W.dateDot = Y + "." + (M + 1) + "." + D;
  W.dateDotSpaced = Y + ". " + (M + 1) + ". " + D;

  // ── 텍스트 채우기 ──
  $$("[data-f]").forEach(function (n) { n.textContent = get(n.dataset.f) || ""; });
  // 미리보기용: 주소 뒤에 ?cover=09 를 붙이면 그 사진으로 표지를 바꿔 볼 수 있음
  var coverQ = /[?&]cover=(\d{2})\b/.exec(location.search);
  $("#coverImg").src = coverQ ? "images/gallery/full/" + coverQ[1] + ".jpg" : W.cover;
  $("#closingImg").src = W.closing || W.cover;
  W.greeting.forEach(function (line) { $("#greeting").appendChild(el("p", null, line)); });

  // ── 꽃잎 ──
  var petals = document.querySelector(".petals");
  for (var p = 0; W.petals && p < 16; p++) {
    var pe = el("span", "petal");
    var size = 0.6 + Math.random() * 0.9;
    pe.style.left = Math.random() * 100 + "%";
    pe.style.animationDuration = 7 + Math.random() * 7 + "s";
    pe.style.animationDelay = -Math.random() * 12 + "s";
    pe.style.setProperty("--dx", (Math.random() * 160 - 60) + "px");
    pe.style.setProperty("--rot", (Math.random() * 720 - 360) + "deg");
    pe.style.width = 14 * size + "px";
    pe.style.height = 11 * size + "px";
    petals.appendChild(pe);
  }

  // ── 토스트 / 복사 ──
  var toastTimer;
  function toast(msg) {
    var t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 2000);
  }
  function copy(text, msg) {
    var done = function () { toast(msg || "복사되었습니다"); };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, function () { if (fallback(text)) done(); });
    } else if (fallback(text)) done();
  }
  function fallback(text) {
    var ta = el("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;";
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    var ok = false;
    try { ok = document.execCommand("copy"); } catch (e) {}
    ta.remove();
    if (!ok) toast("복사에 실패했어요. 길게 눌러 복사해 주세요");
    return ok;
  }

  // ── 달력 ──
  var cal = $("#cal");
  var head = cal.insertRow();
  KO_DOW.forEach(function (d) { head.appendChild(el("th", null, d)); });
  var first = new Date(Date.UTC(Y, M, 1)).getUTCDay();
  var days = new Date(Date.UTC(Y, M + 1, 0)).getUTCDate();
  var row;
  for (var i = 0; i < Math.ceil((first + days) / 7) * 7; i++) {
    if (i % 7 === 0) row = cal.insertRow();
    var td = row.insertCell(), n = i - first + 1;
    if (n < 1 || n > days) continue;
    var span = el("span", null, n);
    td.appendChild(span);
    if (n === D) td.className = "day";
    else if (i % 7 === 0) td.className = "sun";
    else if (i % 7 === 6) td.className = "sat";
  }

  // ── 카운트다운 ──
  function tick() {
    var diff = wd.getTime() - Date.now(), txt = $("#ddayText");
    txt.textContent = "";
    if (diff <= 0) {
      ["#cdD", "#cdH", "#cdM", "#cdS"].forEach(function (s) { $(s).textContent = "0"; });
      txt.textContent = W.groom.first + " & " + W.bride.first + "의 결혼식에 함께해 주셔서 감사합니다";
      return;
    }
    var s = Math.floor(diff / 1000);
    $("#cdD").textContent = Math.floor(s / 86400);
    $("#cdH").textContent = Math.floor(s / 3600) % 24;
    $("#cdM").textContent = Math.floor(s / 60) % 60;
    $("#cdS").textContent = s % 60;
    txt.append(W.groom.first + " & " + W.bride.first + "의 결혼식이 ");
    txt.appendChild(el("em", null, Math.ceil(diff / 86400000) + "일"));
    txt.append(" 남았습니다");
  }
  tick();
  setInterval(tick, 1000);

  var fmt = function (d) { return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, ""); };
  // 캘린더에 추가: 기본 캘린더(wedding.ics) / Google 캘린더 중 선택
  // ※ 날짜·장소를 바꾸면 wedding.ics 파일도 같이 고쳐야 함
  var gcalUrl = "https://calendar.google.com/calendar/render?action=TEMPLATE" +
    "&text=" + encodeURIComponent(W.groom.name + " " + W.bride.name + " 결혼식") +
    "&dates=" + fmt(wd) + "/" + fmt(new Date(wd.getTime() + 2 * 3600 * 1000)) +
    "&location=" + encodeURIComponent(W.venue.name + " " + W.venue.hall + ", " + W.venue.address);
  var isAndroidUA = /Android/i.test(navigator.userAgent), isIOSUA = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  var calBtn = $("#gcal");
  calBtn.textContent = "＋ 내 캘린더에 추가";
  calBtn.removeAttribute("target");
  calBtn.href = "#";
  // 아이폰·PC: 기본 캘린더(.ics) / Google 캘린더 선택 창, 안드로이드: Google 캘린더로 바로
  var calModal = $("#calModal"), calIcs = $("#calIcs");
  $("#calIcsName").textContent = isIOSUA ? "iPhone 캘린더" : isAndroidUA ? "휴대폰 캘린더" : "캘린더 앱";
  $("#calIcsSub").textContent = isIOSUA ? "기본 캘린더 앱" : isAndroidUA ? "삼성 캘린더 등" : "Outlook · Apple 캘린더 등";
  // 아이폰 사파리는 download 속성이 있으면 저장만 하므로, 아이폰에서는 바로 열리게
  if (!isIOSUA) calIcs.setAttribute("download", "김용현이나연_결혼식.ics");
  $("#calGoogle").href = gcalUrl;
  var closeCal = function () { calModal.hidden = true; document.body.style.overflow = ""; };
  if (isAndroidUA) {
    // 안드로이드: 웹에서 휴대폰 캘린더를 바로 열 수 없어 파일 다운로드가 돼 버림 → 선택 창 없이 Google 캘린더로 바로
    // (삼성 캘린더도 구글 계정과 연동돼 있으면 같이 보임)
    calBtn.textContent = "＋ Google 캘린더에 추가";
    calBtn.href = gcalUrl; calBtn.target = "_blank"; calBtn.rel = "noopener";
  } else calBtn.addEventListener("click", function (e) { e.preventDefault(); calModal.hidden = false; document.body.style.overflow = "hidden"; });
  calModal.querySelector("[data-close]").addEventListener("click", closeCal);
  calModal.addEventListener("click", function (e) { if (e.target === calModal) closeCal(); });
  [calIcs, $("#calGoogle")].forEach(function (x) { x.addEventListener("click", function () { setTimeout(closeCal, 300); }); });

  // ── 갤러리 + 라이트박스 ──
  var g = $("#gallery"), lb = $("#lightbox"), lbImg = lb.querySelector("img"), cur = 0;
  // ?v=3: 사진 파일을 같은 이름으로 바꿔 넣었을 때 휴대폰에 남은 예전 사진 대신 새 사진을 받게 함 (사진을 교체하면 숫자 올리기)
  var full = function (id) { return /\//.test(id) ? id : "images/gallery/full/" + id + ".jpg?v=3"; };
  var thumb = function (id) { return /\//.test(id) ? id : "images/gallery/thumb/" + id + ".jpg?v=3"; };
  // 테마 목록 (예전처럼 번호 배열만 넣어도 동작)
  var themes = (W.gallery || []).length && typeof W.gallery[0] === "string"
    ? [{ emoji: "", name: "전체", photos: W.gallery }]
    : (W.gallery || []);
  // 각 테마 안에서는 파일명 순서로 정렬 (01, 02 … 15, 15a, 16, 16a, b01 …, r04, tw01 …). 숫자는 크기대로(2 < 10)
  // 특정 사진 바로 뒤에 넣고 싶으면 파일명 끝에 a, b 를 붙이면 됨 (예: 15a → 15 바로 다음)
  themes.forEach(function (t) {
    t.photos = t.photos.slice().sort(function (a, b) { return a.localeCompare(b, "en", { numeric: true }); });
  });
  // '전체' = 테마 순서대로 이어 붙이기 (섞지 않음)
  var mixed = [];
  themes.forEach(function (t) { mixed = mixed.concat(t.photos); });
  var G = [], curIds = [];
  var moreBtn = $("#galleryMore");
  var FIRST = 9, STEP = 15, shown = FIRST; // 처음 9장, '더 보기' 한 번에 15장씩
  function applyShown() {
    $$("#gallery button").forEach(function (b, i) { b.hidden = i >= shown; });
    var left = curIds.length - shown;
    moreBtn.hidden = curIds.length <= FIRST;
    moreBtn.textContent = left > 0 ? "⌄ " + Math.min(STEP, left) + "장 더 보기" : "⌃ 접기";
  }
  function renderGallery(ids) {
    G = ids.map(full);
    curIds = ids.slice();
    shown = FIRST;
    g.innerHTML = "";
    g.classList.remove("expanded", "single");
    if (ids.length === 1) g.classList.add("single");
    ids.forEach(function (id, idx) {
      var b = el("button");
      b.type = "button";
      var im = el("img");
      im.src = thumb(id); im.loading = "lazy"; im.alt = "사진 " + (idx + 1);
      b.appendChild(im);
      b.dataset.id = id;
      var badge = el("span", "thumb-badge"); badge.hidden = true; b.appendChild(badge); // ♥ 3 · 💬 2 (반응이 있을 때만 보임)
      b.addEventListener("click", function () { openFeed(idx); });
      g.appendChild(b);
    });
    updateBadges();
    applyShown();
  }
  moreBtn.addEventListener("click", function () {
    if (shown >= curIds.length) {           // 다 펼친 상태 → 접기
      shown = FIRST;
      applyShown();
      $("#gallerySec").scrollIntoView({ behavior: "smooth" });
    } else {
      shown = Math.min(curIds.length, shown + STEP);
      applyShown();
    }
  });
  if (!mixed.length) $("#gallerySec").hidden = true;
  else {
    var chips = $("#galleryChips");
    var opts = themes.length > 1 ? [{ label: "ALL", name: "전체", photos: mixed }].concat(themes) : [{ name: "", photos: mixed }];
    if (themes.length > 1) {
      opts.forEach(function (t, i) {
        var c = el("button", "chip");
        c.type = "button";
        c.setAttribute("aria-pressed", String(i === 0));
        // 화면에는 이모지만. 이름은 화면 읽기·길게 누르기 툴팁용으로만 둠
        c.appendChild(t.label ? el("span", "chip-all", t.label) : el("span", "chip-emoji", t.emoji));
        c.setAttribute("aria-label", t.name + " " + t.photos.length + "장");
        c.title = t.name;
        c.addEventListener("click", function () {
          $$(".chip").forEach(function (x) { x.setAttribute("aria-pressed", String(x === c)); });
          renderGallery(t.photos);
        });
        chips.appendChild(c);
      });
    } else chips.hidden = true;
    renderGallery(mixed);
  }
  // ── 사진 피드 (인스타처럼: 하트·댓글, 구글 시트 '사진하트'·'사진댓글' 탭) ──
  var feedEl = $("#feed"), feedList = $("#feedList");
  var feedData = { likes: {}, comments: {} }, feedLoaded = false, feedOpen = false;
  var themeOf = {};
  themes.forEach(function (t) { t.photos.forEach(function (id) { themeOf[id] = (t.emoji ? t.emoji + " " : "") + t.name; }); });
  var deviceId = store.get("dev-id") || (function () { var d = "d" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36); store.set("dev-id", d); return d; })();
  var liked = {};
  try { liked = JSON.parse(store.get("liked") || "{}"); } catch (e) {}
  var saveLiked = function () { store.set("liked", JSON.stringify(liked)); };
  var HEART = '<svg viewBox="0 0 24 24"><path d="M12 20.5s-7.6-4.6-9.6-9.3C.9 7.8 3 4.2 6.6 4.2c2.1 0 3.5 1.1 5.4 3.1 1.9-2 3.3-3.1 5.4-3.1 3.6 0 5.7 3.6 4.2 7-2 4.7-9.6 9.3-9.6 9.3z"/></svg>';
  var BUBBLE = '<svg viewBox="0 0 24 24"><path d="M20.5 11.6a8.4 8.4 0 01-12.3 7.5L3.5 20.5l1.4-4.5A8.4 8.4 0 1120.5 11.6z"/></svg>';

  function loadFeed() {
    if (!W.appsScriptUrl) return;
    callScript({ type: "feed_get" }).then(function (res) {
      // 구글 시트는 "01" 같은 사진 번호를 숫자 1로 바꿔 저장함 → "1"로 돌아온 키를 원래 ID("01")로 되돌림
      var byNum = {};
      themes.forEach(function (t) { t.photos.forEach(function (id) { if (/^\d+$/.test(id)) byNum[String(Number(id))] = id; }); });
      var fix = function (k) { k = String(k).trim(); return /^\d+(\.0+)?$/.test(k) ? (byNum[String(Number(k))] || k) : k; };
      var likes = {}, comments = {};
      Object.keys(res.likes || {}).forEach(function (k) { var id = fix(k); likes[id] = (likes[id] || 0) + (Number(res.likes[k]) || 0); });
      Object.keys(res.comments || {}).forEach(function (k) { var id = fix(k); comments[id] = (comments[id] || []).concat(res.comments[k] || []); });
      feedData = { likes: likes, comments: comments };
      feedLoaded = true;
      $$(".post").forEach(function (p) { updatePost(p); });
      updateBadges();
    }).catch(function () {});
  }
  function updateBadges() {
    if (!feedData) return;
    $$("#gallery button").forEach(function (b) {
      var badge = b.querySelector(".thumb-badge");
      if (!badge) return;
      var id = b.dataset.id, n = feedData.likes[id] || 0, c = (feedData.comments[id] || []).length;
      badge.textContent = (n ? "🤍 " + n : "") + (n && c ? "  " : "") + (c ? "💬 " + c : "");
      badge.hidden = !(n || c);
    });
  }
  function updatePost(post) {
    var id = post.dataset.id;
    var n = feedData.likes[id] || 0;
    var on = !!liked[id];
    post.querySelector(".like").classList.toggle("on", on);
    post.querySelector(".like").setAttribute("aria-pressed", String(on));
    post.querySelector(".likes").innerHTML = "";
    post.querySelector(".likes").append("좋아요 ");
    post.querySelector(".likes").appendChild(el("b", null, n));
    post.querySelector(".likes").append("개");
    var list = feedData.comments[id] || [];
    var ul = post.querySelector(".cmts"), all = post.classList.contains("all");
    ul.innerHTML = "";
    if (list.length > 2 && !all) {
      var more = el("li", "cmt-more", "댓글 " + list.length + "개 모두 보기");
      more.addEventListener("click", function () { post.classList.add("all"); updatePost(post); });
      ul.appendChild(more);
    }
    (all ? list : list.slice(-2)).forEach(function (c) {
      var li = el("li");
      li.appendChild(el("b", null, c.name));
      li.append(" " + c.text);
      ul.appendChild(li);
    });
  }
  function toggleLike(post, forceOn) {
    var id = post.dataset.id, on = !liked[id];
    if (forceOn && liked[id]) return;
    if (on) liked[id] = 1; else delete liked[id];
    saveLiked();
    feedData.likes[id] = Math.max(0, (feedData.likes[id] || 0) + (on ? 1 : -1));
    updateBadges(); // 갤러리 정사각형의 ♥ 숫자도 바로 반영
    updatePost(post);
    if (on) { var h = post.querySelector(".like"); h.classList.remove("pop"); void h.offsetWidth; h.classList.add("pop"); }
    if (W.appsScriptUrl) callScript({ type: "feed_like", id: id, delta: on ? 1 : -1, device: deviceId }).catch(function () {});
  }
  function buildPost(id, i, total) {
    var post = el("article", "post");
    post.dataset.id = id;
    var head = el("header", "post-head"), av = el("img", "avatar"), who = el("div");
    av.src = thumb(W.gallery[0] && W.gallery[0].photos ? W.gallery[0].photos[0] : id); av.alt = "";
    who.appendChild(el("b", null, (W.groom.en + "_" + W.bride.en).toLowerCase()));
    who.appendChild(el("small", null, themeOf[id] || ""));
    head.appendChild(av); head.appendChild(who);
    head.appendChild(el("span", "post-n", (i + 1) + " / " + total));
    var box = el("div", "post-img"), im = el("img"), burst = el("span", "burst");
    im.src = full(id); im.loading = i < 2 ? "eager" : "lazy"; im.alt = "사진 " + (i + 1);
    burst.innerHTML = HEART;
    box.appendChild(im); box.appendChild(burst);
    // 사진 두 번 탭 → 하트
    var lastTap = 0;
    box.addEventListener("click", function () {
      var now = Date.now();
      if (now - lastTap < 320) {
        toggleLike(post, true);
        burst.classList.remove("show"); void burst.offsetWidth; burst.classList.add("show");
      }
      lastTap = now;
    });
    var act = el("div", "post-actions"), like = el("button", "like"), cmt = el("button", "cmt-btn");
    like.type = cmt.type = "button";
    like.innerHTML = HEART; like.setAttribute("aria-label", "좋아요");
    cmt.innerHTML = BUBBLE; cmt.setAttribute("aria-label", "댓글 달기");
    like.addEventListener("click", function () { toggleLike(post); });
    act.appendChild(like); act.appendChild(cmt);
    var likes = el("p", "likes"), ul = el("ul", "cmts");
    var form = el("form", "cmt-form"), nm = el("input"), tx = el("input"), send = el("button", null, "게시");
    nm.placeholder = "이름"; nm.maxLength = 10; nm.value = store.get("cmt-name") || "";
    tx.placeholder = "댓글 달기…"; tx.maxLength = 60; send.type = "submit";
    form.appendChild(nm); form.appendChild(tx); form.appendChild(send);
    cmt.addEventListener("click", function () { (nm.value ? tx : nm).focus(); });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = nm.value.trim(), text = tx.value.trim();
      if (!name) { nm.focus(); return toast("이름을 입력해 주세요"); }
      if (!text) { tx.focus(); return; }
      if (!W.appsScriptUrl) return toast("아직 서버가 연결되지 않았어요");
      store.set("cmt-name", name);
      send.disabled = true;
      callScript({ type: "feed_comment", id: id, name: name, text: text })
        .then(function (res) {
          (feedData.comments[id] = feedData.comments[id] || []).push(res.item);
          tx.value = "";
          post.classList.add("all");
          updatePost(post);
          updateBadges(); // 갤러리 정사각형의 💬 숫자도 바로 반영
        })
        .catch(function () { toast("댓글을 남기지 못했어요"); })
        .finally(function () { send.disabled = false; });
    });
    [head, box, act, likes, ul, form].forEach(function (n) { post.appendChild(n); });
    updatePost(post);
    return post;
  }
  function openFeed(idx) {
    store.set("feed-seen", "1");
    feedList.innerHTML = "";
    curIds.forEach(function (id, i) { feedList.appendChild(buildPost(id, i, curIds.length)); });
    feedEl.hidden = false;
    document.body.style.overflow = "hidden";
    var target = feedList.children[idx];
    feedEl.scrollTop = target ? target.offsetTop - $(".feed-bar").offsetHeight : 0;
    if (!feedOpen) { feedOpen = true; try { history.pushState({ feed: 1 }, ""); } catch (e) {} }
    loadFeed();
  }
  function closeFeed() {
    feedEl.hidden = true;
    feedOpen = false;
    document.body.style.overflow = "";
    updateBadges();
    // 하트 기록이 서버에 저장될 시간을 조금 두고, 다른 하객 반응까지 포함한 최신 숫자로 갱신
    setTimeout(loadFeed, 1500);
  }
  $("#feedBack").addEventListener("click", function () { if (history.state && history.state.feed) history.back(); else closeFeed(); });
  // 페이지를 열자마자 하트·댓글 수를 미리 불러와 썸네일에 표시 (서버 응답이 1~2초 걸려서)
  loadFeed();
  // 휴대폰 '뒤로가기'로도 피드가 닫히게
  window.addEventListener("popstate", function () { if (feedOpen) closeFeed(); });

  function openLb(idx) {
    cur = (idx + G.length) % G.length;
    lbImg.src = G[cur];
    $("#lbCount").textContent = (cur + 1) + " / " + G.length;
    lb.hidden = false;
    document.body.style.overflow = "hidden";
  }
  function closeLb() { lb.hidden = true; document.body.style.overflow = ""; }
  lb.querySelector(".lb-close").addEventListener("click", closeLb);
  lb.querySelector(".lb-prev").addEventListener("click", function () { openLb(cur - 1); });
  lb.querySelector(".lb-next").addEventListener("click", function () { openLb(cur + 1); });
  lb.addEventListener("click", function (e) { if (e.target === lb) closeLb(); });
  if (G.length < 2) { lb.querySelector(".lb-prev").hidden = true; lb.querySelector(".lb-next").hidden = true; }
  var touchX = null;
  lb.addEventListener("touchstart", function (e) { touchX = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener("touchend", function (e) {
    if (touchX == null || G.length < 2) return;
    var dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) openLb(cur + (dx < 0 ? 1 : -1));
    touchX = null;
  });

  // ── 오시는 길: 지도 앱 바로 열기 ──
  // 휴대폰: 앱을 연다 (좌표가 있으면 길찾기, 없으면 장소 검색). 앱이 없으면 웹 지도 / 스토어로.
  var v = W.venue, mq = encodeURIComponent(v.mapQuery), nm = encodeURIComponent(v.name);
  var hasXY = v.lat && v.lng;
  var ua = navigator.userAgent, isIOS = /iPhone|iPad|iPod/i.test(ua), isAndroid = /Android/i.test(ua);
  var isMobile = isIOS || isAndroid;
  var app = encodeURIComponent(location.hostname || "wedding");
  var maps = {
    mapNaver: {
      scheme: hasXY ? "nmap://route/public?dlat=" + v.lat + "&dlng=" + v.lng + "&dname=" + nm + "&appname=" + app
                    : "nmap://search?query=" + mq + "&appname=" + app,
      web: "https://map.naver.com/p/search/" + mq,
    },
    mapKakao: {
      scheme: hasXY ? "kakaomap://route?ep=" + v.lat + "," + v.lng + "&by=PUBLICTRANSIT" : "kakaomap://search?q=" + mq,
      web: hasXY ? "https://map.kakao.com/link/to/" + nm + "," + v.lat + "," + v.lng : "https://map.kakao.com/link/search/" + mq,
    },
    mapTmap: {
      scheme: hasXY ? "tmap://route?goalname=" + nm + "&goalx=" + v.lng + "&goaly=" + v.lat : "tmap://search?name=" + mq,
      web: isIOS ? "https://apps.apple.com/kr/app/id431589174"
         : isAndroid ? "https://play.google.com/store/apps/details?id=com.skt.tmap.ku" : null,
    },
  };
  Object.keys(maps).forEach(function (id) {
    var m = maps[id], a = $("#" + id);
    a.href = isMobile ? m.scheme : (m.web || "#");
    if (!isMobile && m.web) { a.target = "_blank"; a.rel = "noopener"; }
    a.addEventListener("click", function (e) {
      if (!isMobile) {
        if (!m.web) { e.preventDefault(); toast("티맵은 휴대폰에서 열어 주세요"); }
        return;
      }
      e.preventDefault();
      var left = false;
      var onHide = function () { if (document.hidden) left = true; };
      document.addEventListener("visibilitychange", onHide);
      location.href = m.scheme;
      setTimeout(function () {
        document.removeEventListener("visibilitychange", onHide);
        if (!left && !document.hidden && m.web) location.href = m.web;
      }, 1600);
    });
  });
  if (v.tel) $("#telLink").href = "tel:" + v.tel.replace(/[^0-9]/g, "");
  else $("#wayTel").hidden = true;
  $("#copyAddr").addEventListener("click", function () { copy(v.address, "주소가 복사되었습니다"); });

  // 약도: 카카오 지도 (kakaoKey 사용. Kakao Developers 앱 설정에서 '카카오맵' 사용을 켜야 함)
  // 불러오기에 실패하면 지도 칸은 숨긴 채로 두고, 아래 지도 앱 버튼만 보임
  var kmapEl = $("#kmap");
  function drawKmap() {
    var km = window.kakao && window.kakao.maps;
    var draw = function (lat, lng) {
      kmapEl.hidden = false;
      var pos = new km.LatLng(lat, lng);
      // 휴대폰: 처음엔 잠겨 있어 스크롤하다 스쳐도 안 움직임. 지도를 '탭'하면 풀려서 끌어 움직일 수 있음
      // 잠긴 동안 "탭하면 지도를 움직일 수 있어요" 안내. 지도가 화면 밖으로 나가면 다시 잠금
      var map = new km.Map(kmapEl, { center: pos, level: 3, draggable: !isMobile, scrollwheel: false });
      map.addControl(new km.ZoomControl(), km.ControlPosition.RIGHT);
      var unlocked = !isMobile;
      km.event.addListener(map, "zoom_changed", function () { if (!unlocked) map.setCenter(pos); });
      if (isMobile) {
        var tip = el("div", "kmap-tip show", "탭하면 지도를 움직일 수 있어요");
        kmapEl.appendChild(tip);
        var lock = function () {
          unlocked = false; map.setDraggable(false); map.setCenter(pos);
          tip.textContent = "탭하면 지도를 움직일 수 있어요"; tip.classList.add("show");
        };
        // 탭 판정: 손가락이 거의 안 움직이고(10px 이내) 짧게 뗐을 때만. 스크롤로 스친 건 제외
        var t0 = null;
        kmapEl.addEventListener("touchstart", function (e) {
          t0 = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() } : null;
        }, { passive: true, capture: true });
        kmapEl.addEventListener("touchend", function (e) {
          if (unlocked || !t0) return;
          var c = e.changedTouches[0], moved = Math.abs(c.clientX - t0.x) + Math.abs(c.clientY - t0.y);
          if (moved > 10 || Date.now() - t0.t > 500) return;
          unlocked = true; map.setDraggable(true);
          tip.textContent = "이제 지도를 움직일 수 있어요";
          setTimeout(function () { if (unlocked) tip.classList.remove("show"); }, 1600);
        }, { passive: true, capture: true });
        if ("IntersectionObserver" in window) {
          new IntersectionObserver(function (es) { if (!es[0].isIntersecting && unlocked) lock(); }).observe(kmapEl);
        }
      }
      new km.Marker({ position: pos, map: map });
      var lab = el("div", "kmap-label", v.name);
      new km.CustomOverlay({ position: pos, content: lab, yAnchor: 0.5, map: map });
      map.relayout(); map.setCenter(pos);
    };
    if (hasXY) return draw(Number(v.lat), Number(v.lng));
    var places = new km.services.Places();
    places.keywordSearch(v.mapQuery, function (r, st) {
      if (st === km.services.Status.OK && r.length) return draw(Number(r[0].y), Number(r[0].x));
      // 이름으로 못 찾으면 도로명 주소(층·동 빼고)로
      var road = (v.address.match(/^.*?\d+(-\d+)?(?=\s|$)/) || [v.address])[0];
      new km.services.Geocoder().addressSearch(road, function (g, st2) {
        if (st2 === km.services.Status.OK && g.length) draw(Number(g[0].y), Number(g[0].x));
      });
    });
  }
  function loadKmap() {
    if (!W.kakaoKey) return;
    var s = document.createElement("script");
    s.src = "https://dapi.kakao.com/v2/maps/sdk.js?appkey=" + W.kakaoKey + "&libraries=services&autoload=false";
    s.onload = function () { try { window.kakao.maps.load(drawKmap); } catch (e) {} };
    document.head.appendChild(s);
  }
  if ("IntersectionObserver" in window) {
    var kio = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { kio.disconnect(); loadKmap(); } }, { rootMargin: "600px" });
    kio.observe(kmapEl.parentNode);
  } else loadKmap();

  // 안내 탭 (오시는 길 / 식사 안내)
  $$(".tabs button").forEach(function (b) {
    b.addEventListener("click", function () {
      $$(".tabs button").forEach(function (x) { x.setAttribute("aria-selected", String(x === b)); });
      $$(".tab-panel").forEach(function (p) { p.hidden = p.dataset.panel !== b.dataset.tab; });
    });
  });
  (W.meal || []).forEach(function (l) { $("#mealBody").appendChild(el("p", null, l)); });

  // 오시는 길 카드 (지하철 / 버스 / 자가용)
  var ICONS = {
    subway: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="14" rx="3"/><path d="M5 11h14M9 14.5h.01M15 14.5h.01M8 21l2-4m6 4-2-4"/></svg>',
    bus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="15" rx="2.5"/><path d="M4 10h16M8 14.5h.01M16 14.5h.01M7 18v2m10-2v2"/></svg>',
    car: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M5 16V11l2-5h10l2 5v5M4 16h16M7 19v-3m10 3v-3M5 11h14"/><path d="M7.5 13.5h.01M16.5 13.5h.01"/></svg>',
  };
  // 노선·출구·버스 색 배지 (서울교통공사·서울시 버스 공식 색)
  var BADGES = {
    "1호선": { cls: "line", text: "1", bg: "#0052A4" },
    "2호선": { cls: "line", text: "2", bg: "#00A84D" },
    "수인분당선": { cls: "line wide", text: "수인분당", bg: "#F5A200" },
    "1번출구": { cls: "exit", text: "1", bg: "#FFC20E", fg: "#222" },
  };
  var BUS = { "간선": "#0068B7", "지선": "#53B332", "광역": "#E60012", "직행": "#E60012", "마을": "#53B332" };
  function badge(key) {
    var d = BADGES[key];
    if (!d) return document.createTextNode(key);
    var s = el("span", "badge " + d.cls, d.text);
    s.style.background = d.bg;
    if (d.fg) s.style.color = d.fg;
    s.setAttribute("aria-label", key);
    s.title = key;
    if (d.cls === "exit") return el("b", "exit-text", d.text + "번 출구"); // 출구는 색 없이 굵게만
    return s;
  }
  // "{{2호선}} 선릉역" → [배지] 선릉역
  function rich(parent, text) {
    text.split(/(\{\{.+?\}\})/).forEach(function (part) {
      var m = /^\{\{(.+)\}\}$/.exec(part);
      if (m) parent.appendChild(badge(m[1]));
      else if (part) parent.append(part);
    });
    return parent;
  }
  (W.transport || []).forEach(function (g) {
    var row = el("div", "way-row"), label = el("p", "way-label"), body = el("div");
    label.innerHTML = ICONS[g.icon] || "";
    label.append(g.title);
    g.blocks.forEach(function (bk) {
      var b = el("div", "way-block");
      b.appendChild(rich(el("p", "way-head"), bk.head));
      var ul = el("ul", "way-items");
      bk.items.forEach(function (it) {
        var li = el("li"), m = /^\[(.+?)\]\s*(.*)$/.exec(it);
        if (m && BUS[m[1]]) {
          li.className = "bus-li";
          var tag = el("span", "bus-tag", m[1]);
          tag.style.background = BUS[m[1]];
          li.appendChild(tag);
          li.appendChild(el("span", null, m[2]));
        } else if (m) { li.appendChild(el("b", null, m[1])); rich(li, " " + m[2]); }
        else rich(li, it);
        ul.appendChild(li);
      });
      b.appendChild(ul);
      body.appendChild(b);
    });
    row.appendChild(label);
    row.appendChild(body);
    $("#wayRows").appendChild(row);
  });

  // ── 계좌 ──
  $$(".acc-card").forEach(function (card) {
    var inner = el("div", "acc-inner");
    // 아직 TEMP 인 계좌는 숨김 (번호를 채우면 자동으로 보임). 한 측이 전부 비면 그 카드도 숨김
    var list = W.accounts[card.dataset.side].filter(function (a) { return a.bank && !/^TEMP/.test(a.bank) && a.number; });
    if (!list.length) { card.hidden = true; return; }
    list.forEach(function (a) {
      var r = el("div", "acc-row"), info = el("div", "acc-info");
      info.appendChild(el("p", "acc-who", a.role + " " + a.name));
      var num = el("p", "acc-num");
      num.appendChild(el("small", null, a.bank));
      num.append(a.number);
      info.appendChild(num);
      var btn = el("button", "copy-btn", "복사");
      btn.type = "button";
      btn.addEventListener("click", function () { copy(a.bank + " " + a.number.replace(/\D/g, "") + " " + a.name, a.role + " " + a.name + "님 계좌번호가 복사되었습니다"); });
      r.appendChild(info);
      r.appendChild(btn);
      inner.appendChild(r);
    });
    card.querySelector(".acc-body").appendChild(inner);
    var hd = card.querySelector(".acc-head");
    hd.addEventListener("click", function () {
      var open = card.classList.toggle("open");
      hd.setAttribute("aria-expanded", String(open));
    });
  });

  // ── 엔딩 크레딧 ──
  var roll = $("#creditsRoll");
  (W.credits || []).forEach(function (c, i) {
    var dt = el("dt", null, c[0]), dd = el("dd", null, c[1]);
    dt.style.setProperty("--i", i);
    dd.style.setProperty("--i", i);
    roll.appendChild(dt);
    roll.appendChild(dd);
  });
  if ("IntersectionObserver" in window) {
    var cio = new IntersectionObserver(function (es) {
      if (es[0].isIntersecting) { $("#credits").classList.add("in"); cio.disconnect(); }
    }, { threshold: 0.35 });
    cio.observe($("#credits"));
  } else $("#credits").classList.add("in");

  // ── 공유: 카카오톡 / 링크 복사 / 예식 정보 이미지 ──
  var shareUrl = location.href.split(/[?#]/)[0];
  var shareTitle = W.groom.name + " & " + W.bride.name + " 결혼합니다";
  var shareText = W.dateKo + "\n" + v.name + " " + v.hall;
  function absUrl(p) { return new URL(p, shareUrl).href; }
  function loadKakao() {
    return new Promise(function (resolve, reject) {
      if (window.Kakao) return resolve(window.Kakao);
      var s = document.createElement("script");
      s.src = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js";
      s.crossOrigin = "anonymous";
      s.onload = function () { resolve(window.Kakao); };
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  $("#shareKakao").addEventListener("click", function () {
    if (W.kakaoKey) {
      loadKakao().then(function (K) {
        if (!K.isInitialized()) K.init(W.kakaoKey);
        K.Share.sendDefault({
          objectType: "feed",
          content: {
            title: shareTitle, description: shareText.replace("\n", " · "),
            imageUrl: absUrl(W.cover), link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
          },
          buttons: [{ title: "청첩장 보기", link: { mobileWebUrl: shareUrl, webUrl: shareUrl } }],
        });
      }).catch(function () { toast("카카오톡 공유를 불러오지 못했어요"); });
    } else if (navigator.share) {
      // 카카오 키가 없으면 휴대폰 기본 공유창 (여기서 카카오톡 선택 가능)
      navigator.share({ title: shareTitle, text: shareText, url: shareUrl }).catch(function () {});
    } else copy(shareUrl, "링크가 복사되었습니다. 카카오톡에 붙여 넣어 주세요");
  });
  $("#shareLink").addEventListener("click", function () { copy(shareUrl, "청첩장 링크가 복사되었습니다"); });

  // 예식 정보 한 장 이미지 (1080×1920, 앨범 저장용)
  function loadImg(src) {
    return new Promise(function (res, rej) { var im = new Image(); im.onload = function () { res(im); }; im.onerror = rej; im.src = src; });
  }
  function buildInfoImage() {
    var cs = getComputedStyle(document.documentElement);
    var accent = cs.getPropertyValue("--rose").trim() || "#8f735c";
    var bg = cs.getPropertyValue("--bg").trim() || "#fcfaf6";
    return Promise.all([
      loadImg(W.infoImage || W.cover),
      document.fonts.load("700 60px Eulyoo1945"), document.fonts.load("400 40px Eulyoo1945"), document.fonts.load("80px Parisienne"),
    ]).then(function (r) {
      var im = r[0], Wd = 1080, Ht = 1920, c = document.createElement("canvas");
      c.width = Wd; c.height = Ht;
      var x = c.getContext("2d");
      x.fillStyle = bg; x.fillRect(0, 0, Wd, Ht);
      // 사진 (위쪽 1100px, 가운데 맞춰 자르기)
      var ph = 1200, s = Math.max(Wd / im.naturalWidth, ph / im.naturalHeight);
      var sw = Wd / s, sh = ph / s;
      // infoImageY: 사진을 위아래 어디서 자를지 (0 = 맨 위, 1 = 맨 아래). 얼굴이 사진 칸 가운데쯤 오게 조절
      var fy = W.infoImageY != null ? W.infoImageY : 0.12;
      x.drawImage(im, (im.naturalWidth - sw) / 2, (im.naturalHeight - sh) * fy, sw, sh, 0, 0, Wd, ph);
      // 사진 아래를 배경색으로 자연스럽게 (투명→배경색, 같은 색이라 회색 띠 없음)
      var hx = /^#?([0-9a-f]{6})$/i.exec(bg), rgb = hx ? [0, 2, 4].map(function (k) { return parseInt(hx[1].substr(k, 2), 16); }).join(",") : "252,250,246";
      var gr = x.createLinearGradient(0, ph - 300, 0, ph);
      gr.addColorStop(0, "rgba(" + rgb + ",0)"); gr.addColorStop(1, "rgba(" + rgb + ",1)");
      x.fillStyle = gr; x.fillRect(0, ph - 300, Wd, 300);
      ph += 60;
      x.textAlign = "center";
      x.fillStyle = accent; x.font = "86px Parisienne";
      x.fillText(W.groom.en + " & " + W.bride.en, Wd / 2, ph + 40);
      x.fillStyle = "#333"; x.font = "700 56px Eulyoo1945";
      x.fillText(W.groom.name + "  ·  " + W.bride.name, Wd / 2, ph + 160);
      x.strokeStyle = accent; x.lineWidth = 2; x.beginPath(); x.moveTo(Wd / 2 - 60, ph + 205); x.lineTo(Wd / 2 + 60, ph + 205); x.stroke();
      x.font = "400 44px Eulyoo1945"; x.fillStyle = "#333";
      x.fillText(W.dateKo, Wd / 2, ph + 290);
      x.font = "700 44px Eulyoo1945"; x.fillText(v.name + " " + v.hall, Wd / 2, ph + 365);
      x.font = "400 34px Eulyoo1945"; x.fillStyle = "#777";
      x.fillText(v.address, Wd / 2, ph + 440);
      x.fillText("2호선 · 수인분당선 선릉역 1번 출구 앞" + (v.tel ? "  |  " + v.tel : ""), Wd / 2, ph + 495);
      x.font = "400 28px Eulyoo1945"; x.fillStyle = accent;
      x.fillText(shareUrl.replace(/^https?:\/\//, ""), Wd / 2, Ht - 70);
      return new Promise(function (res) { c.toBlob(res, "image/jpeg", 0.92); });
    });
  }
  // 미리보기: 공유 섹션 근처에 오면 한 번 만들어 두고, 저장할 때도 그 이미지를 그대로 씀
  var infoBlob = null, infoBuilding = null;
  function getInfoImage() {
    if (infoBlob) return Promise.resolve(infoBlob);
    if (!infoBuilding) infoBuilding = buildInfoImage().then(function (b) { infoBlob = b; return b; });
    return infoBuilding;
  }
  var pv = $("#infoPreview");
  if ("IntersectionObserver" in window) {
    var pio = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return;
      pio.disconnect();
      getInfoImage().then(function (b) { pv.querySelector("img").src = URL.createObjectURL(b); pv.hidden = false; }).catch(function () {});
    }, { rootMargin: "400px" });
    pio.observe(pv.parentNode);
  }
  pv.addEventListener("click", function () { $("#shareImage").click(); });

  var saveModal = $("#saveModal");
  var closeSave = function () { saveModal.hidden = true; document.body.style.overflow = ""; };
  saveModal.querySelector("[data-close]").addEventListener("click", closeSave);
  saveModal.addEventListener("click", function (e) { if (e.target === saveModal) closeSave(); });
  $("#saveBtn").addEventListener("click", function () { setTimeout(function () { toast("갤러리의 'Download' 앨범에 저장됐어요"); }, 400); });
  $("#shareImage").addEventListener("click", function () {
    var btn = this;
    btn.disabled = true;
    getInfoImage().then(function (blob) {
      var name = "wedding_" + Y + pad(M + 1) + pad(D) + ".jpg";
      var file = new File([blob], name, { type: "image/jpeg" });
      // 아이폰: 공유창의 '이미지 저장'으로 앨범에 바로 저장
      if (isIOS && navigator.canShare && navigator.canShare({ files: [file] })) {
        return navigator.share({ files: [file], title: shareTitle }).catch(function () {});
      }
      // 안드로이드: 공유창에 '이미지 저장'이 없어서, 이미지 창을 띄우고 '갤러리에 저장'(다운로드 → 갤러리 Download 앨범)
      // 카톡 브라우저 등에서 다운로드가 막히면 사진을 길게 눌러 저장할 수 있게 data URL 이미지로 보여 줌
      if (isAndroid) {
        return new Promise(function (res) { var r = new FileReader(); r.onload = function () { res(r.result); }; r.readAsDataURL(blob); })
          .then(function (dataUrl) {
            $("#saveImg").src = dataUrl;
            var sb = $("#saveBtn");
            sb.href = dataUrl; sb.download = name;
            saveModal.hidden = false; document.body.style.overflow = "hidden";
          });
      }
      // PC: 파일 다운로드
      var a = el("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
      toast("이미지가 저장되었습니다");
    }).catch(function () { toast("이미지를 만들지 못했어요"); })
      .finally(function () { btn.disabled = false; });
  });

  // ── 배경음악 ──
  // 브라우저는 소리 있는 자동재생을 막기 때문에, 바로 재생을 시도하고
  // 막히면 하객이 화면의 빈 곳을 처음 터치하는 순간 재생을 시작한다 (사진·버튼 등 의도가 있는 누름은 제외).
  var audio = $("#bgm"), bgmBtn = $("#bgmBtn"), userMuted = false;
  var bannerShown = false;
  var bgmHint = $("#bgmHint");
  function setPlaying(on) {
    bgmBtn.classList.toggle("playing", on);
    if (on) bgmHint.hidden = true;
    // 처음 재생될 때 한 번만 위쪽에 안내 띠를 보여 줌
    if (on && !bannerShown) {
      bannerShown = true;
      var bn = $("#bgmBanner");
      bn.classList.add("show");
      setTimeout(function () { bn.classList.remove("show"); }, 3500);
    }
  }
  function tryPlay() {
    if (userMuted || !audio.src) return Promise.resolve(false);
    var pr = audio.play();
    return pr && pr.then ? pr.then(function () { setPlaying(true); return true; }, function () { return false; }) : Promise.resolve(true);
  }
  var unlockEvents = ["pointerdown", "touchend", "click"];
  var INTENT = "a, button, input, textarea, select, label, summary, [role='button'], [role='tab'], #kmap, #gallery, #feed, #lightbox, .modal, .acc-card, .chips";
  function stopUnlock() { unlockEvents.forEach(function (ev) { document.removeEventListener(ev, unlock, true); }); }
  function unlock(e) {
    // 음악 버튼을 누른 경우는 버튼이 직접 처리 (여기서도 재생하면 버튼이 곧바로 다시 꺼 버림)
    if (e && e.target && bgmBtn.contains(e.target)) return;
    // 의도가 있는 누름(사진·버튼·링크·입력칸·지도·팝업 등)에는 음악을 켜지 않음. 빈 곳을 터치했을 때만 켬
    if (e && e.target && e.target.closest && e.target.closest(INTENT)) return;
    tryPlay().then(function (ok) {
      if (ok || userMuted) stopUnlock();
    });
  }
  if (W.bgm) {
    audio.src = W.bgm;
    audio.volume = 0.6;
    audio.addEventListener("error", function () { bgmBtn.hidden = true; });
    audio.addEventListener("canplay", function () { bgmBtn.hidden = false; }, { once: true });
    audio.addEventListener("play", function () { setPlaying(true); });
    audio.addEventListener("pause", function () { setPlaying(false); });
    tryPlay().then(function (ok) {
      if (ok) return;
      unlockEvents.forEach(function (ev) { document.addEventListener(ev, unlock, true); });
      // 자동재생이 막힘 → 음악 버튼 옆에 '♪ 화면을 터치하면 음악이 나와요' 안내 (재생되거나 끄면 사라짐)
      var showHint = function () { if (audio.paused && !userMuted) bgmHint.hidden = false; };
      if (!bgmBtn.hidden) showHint(); else audio.addEventListener("canplay", showHint, { once: true });
    });
    bgmHint.addEventListener("click", function (e) {
      e.stopPropagation();
      userMuted = false; stopUnlock(); bgmHint.hidden = true;
      audio.play().catch(function () {});
    });
    bgmBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      if (audio.paused) { userMuted = false; stopUnlock(); audio.play().catch(function () {}); }
      else { userMuted = true; stopUnlock(); audio.pause(); }
      bgmHint.hidden = true;
    });
    var wasPlaying = false;
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) { wasPlaying = !audio.paused; audio.pause(); }
      else if (wasPlaying && !userMuted) audio.play().catch(function () {});
    });
  }

  // ── Apps Script 호출 (text/plain JSON → CORS preflight 없이 보내고 응답도 읽음) ──
  function callScript(payload) {
    return fetch(W.appsScriptUrl, { method: "POST", body: JSON.stringify(payload) })
      .then(function (r) { return r.json(); })
      .then(function (res) { if (!res || !res.ok) throw new Error((res && res.error) || "failed"); return res; });
  }

  // ── 참석 여부 (구글 시트) ──
  var modal = $("#rsvpModal"), form = $("#rsvpForm"), err = $("#rsvpErr"), count = 1;
  function openRsvp() { modal.hidden = false; document.body.style.overflow = "hidden"; }
  function closeRsvp() { modal.hidden = true; document.body.style.overflow = ""; }
  $("#rsvpOpen").addEventListener("click", openRsvp);
  modal.querySelector("[data-close]").addEventListener("click", closeRsvp);
  modal.addEventListener("click", function (e) { if (e.target === modal) closeRsvp(); });
  $("#rsvpLater").addEventListener("click", function () {
    var t = new Date(); t.setHours(24, 0, 0, 0);
    store.set("rsvp-hide-until", String(t.getTime()));
    closeRsvp();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (!modal.hidden) closeRsvp();
    if (!lb.hidden) closeLb();
  });
  function syncAttend() {
    var a = form.attend.value;
    $$("[data-when-attend]").forEach(function (f) { f.hidden = a === "불참"; });
  }
  $$("input[name=attend]").forEach(function (r) { r.addEventListener("change", syncAttend); });
  $$(".stepper button").forEach(function (b) {
    b.addEventListener("click", function () {
      count = Math.min(10, Math.max(1, count + Number(b.dataset.step)));
      $("#rsvpCount").textContent = count;
    });
  });
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    err.textContent = "";
    var name = form.name.value.trim();
    if (!form.side.value) return (err.textContent = "신랑측 / 신부측을 선택해 주세요.");
    if (!form.attend.value) return (err.textContent = "참석 여부를 선택해 주세요.");
    if (!name) { form.name.focus(); return (err.textContent = "성함을 입력해 주세요."); }
    var attending = form.attend.value === "참석";
    var data = {
      side: form.side.value,
      attend: form.attend.value,
      name: name,
      count: attending ? count : 0,
      meal: attending ? (form.meal.value || "미정") : "",
      phone: form.phone.value.trim(),
      message: form.message.value.trim(),
    };
    if (!W.appsScriptUrl) {
      console.info("[RSVP 미연결] 전송될 데이터:", data);
      return (err.textContent = "아직 구글 시트가 연결되지 않았어요. (config.js 의 appsScriptUrl)");
    }
    var btn = form.querySelector(".modal-submit");
    btn.disabled = true;
    btn.textContent = "전달 중…";
    data.type = "rsvp";
    callScript(data)
      .then(function () {
        store.set("rsvp-done", "1");
        form.reset();
        count = 1;
        $("#rsvpCount").textContent = "1";
        syncAttend();
        closeRsvp();
        toast("참석 의사가 전달되었습니다. 감사합니다 ♥");
      })
      .catch(function () { err.textContent = "전송에 실패했어요. 잠시 후 다시 시도해 주세요."; })
      .finally(function () { btn.disabled = false; btn.textContent = "전달하기"; });
  });
  var hideUntil = Number(store.get("rsvp-hide-until") || 0);
  if (W.rsvpPopup && !/[?&]nopop\b/.test(location.search) && !store.get("rsvp-done") && Date.now() > hideUntil && wd.getTime() > Date.now()) {
    setTimeout(openRsvp, 1800);
  }

  // ── 사진 올리기 (Apps Script → 내 구글 드라이브 폴더) ──
  // 하객은 드라이브 폴더를 보지 못하고, 페이지에서 고른 사진만 전달된다.
  var MAX_FILES = 30, MAX_EDGE = 2400;
  var snapModal = $("#snapModal"), snapInput = $("#snapInput"), snapGrid = $("#snapGrid");
  var snapErr = $("#snapErr"), snapSend = $("#snapSend"), snapBar = $("#snapProgress");
  var picked = [], uploading = false;
  if (W.photoUpload) $("#snapSec").hidden = false;
  $("#snapBtn").addEventListener("click", function () { snapInput.click(); });
  $("#snapAdd").addEventListener("click", function () { snapInput.click(); });
  snapInput.addEventListener("change", function () {
    var files = Array.prototype.slice.call(snapInput.files || []).filter(function (f) { return /^image\//.test(f.type) || /\.(heic|heif|jpe?g|png|webp)$/i.test(f.name); });
    snapInput.value = "";
    if (!files.length) return;
    var room = MAX_FILES - picked.length;
    if (files.length > room) toast("한 번에 " + MAX_FILES + "장까지 올릴 수 있어요");
    files.slice(0, room).forEach(function (f) { picked.push({ file: f, url: URL.createObjectURL(f), state: "" }); });
    renderSnaps();
    snapModal.hidden = false;
    document.body.style.overflow = "hidden";
  });
  function renderSnaps() {
    snapGrid.innerHTML = "";
    picked.forEach(function (p, i) {
      var d = el("div", p.state);
      var im = el("img");
      im.src = p.url;
      d.appendChild(im);
      if (!uploading && p.state !== "done") {
        var x = el("button", null, "×");
        x.type = "button";
        x.setAttribute("aria-label", "빼기");
        x.addEventListener("click", function () { URL.revokeObjectURL(p.url); picked.splice(i, 1); renderSnaps(); });
        d.appendChild(x);
      }
      snapGrid.appendChild(d);
    });
    var left = picked.filter(function (p) { return p.state !== "done"; }).length;
    $("#snapCountText").textContent = picked.length ? "선택한 사진 " + picked.length + "장" : "올릴 사진을 골라 주세요.";
    snapSend.textContent = left ? left + "장 올리기" : "올리기";
    snapSend.disabled = uploading || !left;
    $("#snapAdd").hidden = uploading || picked.length >= MAX_FILES;
  }
  function closeSnap() {
    if (uploading) return;
    snapModal.hidden = true;
    document.body.style.overflow = "";
    picked.forEach(function (p) { URL.revokeObjectURL(p.url); });
    picked = [];
    snapErr.textContent = "";
    snapBar.hidden = true;
  }
  snapModal.querySelector("[data-close]").addEventListener("click", closeSnap);
  snapModal.addEventListener("click", function (e) { if (e.target === snapModal) closeSnap(); });

  // 휴대폰 원본은 5~10MB 라 그대로 보내면 느리고 한도에 걸림 → 긴 변 2400px JPEG 로 줄여서 보냄
  function shrink(file) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(img.src);
        var s = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
        var c = document.createElement("canvas");
        c.width = Math.round(img.naturalWidth * s);
        c.height = Math.round(img.naturalHeight * s);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL("image/jpeg", 0.88).split(",")[1]);
      };
      img.onerror = function () { reject(new Error("decode")); };
      img.src = URL.createObjectURL(file);
    });
  }
  snapSend.addEventListener("click", function () {
    if (!W.appsScriptUrl) { snapErr.textContent = "아직 사진 저장소가 연결되지 않았어요. (config.js 의 appsScriptUrl)"; return; }
    var queue = picked.filter(function (p) { return p.state !== "done"; });
    if (!queue.length) return;
    uploading = true;
    snapErr.textContent = "";
    snapBar.hidden = false;
    var bar = snapBar.querySelector("span"), total = queue.length, n = 0, okCount = 0;
    var uploader = $("#snapName").value.trim();
    bar.style.width = "4%";
    renderSnaps();
    snapSend.textContent = "올리는 중… 0/" + total;
    (function next() {
      if (n >= total) {
        uploading = false;
        var failed = total - okCount;
        renderSnaps();
        if (failed) snapErr.textContent = failed + "장을 올리지 못했어요. 다시 눌러 주세요.";
        else { closeSnap(); toast("사진 " + okCount + "장이 전달되었습니다. 감사합니다 ♥"); }
        return;
      }
      var p = queue[n];
      shrink(p.file)
        .then(function (b64) {
          return callScript({ type: "photo", uploader: uploader, filename: p.file.name, data: b64 })
            .catch(function () { return callScript({ type: "photo", uploader: uploader, filename: p.file.name, data: b64 }); });
        })
        .then(function () { p.state = "done"; okCount++; }, function () { p.state = "fail"; })
        .then(function () {
          n++;
          bar.style.width = Math.round((n / total) * 100) + "%";
          renderSnaps();
          if (n < total) snapSend.textContent = "올리는 중… " + n + "/" + total;
          next();
        });
    })();
  });

  // ── 방명록 (말풍선, 구글 시트 '방명록' 탭) ──
  if (W.appsScriptUrl && W.guestbook !== false) {
    $("#guestbookSec").hidden = false;
    var gbList = $("#gbList"), gbMore = $("#gbMore"), gbErr = $("#gbErr"), gbForm = $("#gbForm");
    var gbItems = [], gbShown = 10, gbLoaded = false;
    var renderGb = function () {
      gbList.innerHTML = "";
      if (!gbItems.length) { gbList.appendChild(el("li", "gb-empty", "첫 번째 축하 메시지를 남겨 주세요 🤍")); gbMore.hidden = true; return; }
      gbItems.slice(0, gbShown).forEach(function (it) {
        var li = el("li");
        li.appendChild(el("p", "gb-name", it.name));
        li.appendChild(el("p", "gb-msg", it.message));
        var del = el("button", "gb-del", "×");
        del.type = "button";
        del.setAttribute("aria-label", it.name + "님 메시지 삭제");
        del.addEventListener("click", function () {
          if (li.querySelector(".gb-delform")) return;
          var df = el("form", "gb-delform"), pw = el("input"), ok = el("button", null, "삭제");
          pw.type = "password"; pw.placeholder = "작성 시 비밀번호"; ok.type = "submit";
          df.appendChild(pw); df.appendChild(ok); li.appendChild(df); pw.focus();
          df.addEventListener("submit", function (e) {
            e.preventDefault();
            ok.disabled = true;
            callScript({ type: "gb_delete", id: it.id, password: pw.value })
              .then(function () {
                gbItems = gbItems.filter(function (x) { return x.id !== it.id; });
                renderGb();
                toast("메시지가 삭제되었습니다");
              })
              .catch(function (er) { toast(/wrong/.test(er.message) ? "비밀번호가 맞지 않아요" : "삭제하지 못했어요"); ok.disabled = false; });
          });
        });
        li.appendChild(del);
        gbList.appendChild(li);
      });
      gbMore.hidden = gbItems.length <= gbShown;
    };
    var loadGb = function () {
      gbLoaded = true;
      gbList.innerHTML = "";
      gbList.appendChild(el("li", "gb-empty", "메시지를 불러오는 중…"));
      callScript({ type: "gb_list" })
        .then(function (res) { gbItems = res.items || []; renderGb(); })
        .catch(function () { gbList.innerHTML = ""; gbList.appendChild(el("li", "gb-empty", "방명록을 불러오지 못했어요.")); });
    };
    // 페이지를 열자마자 미리 불러오기 (내려왔을 때 이미 보이게)
    loadGb();
    gbMore.addEventListener("click", function () { gbShown += 10; renderGb(); });
    gbForm.gbmsg.addEventListener("input", function () { $("#gbLeft").textContent = 40 - Array.from(gbForm.gbmsg.value).length; });
    gbForm.addEventListener("submit", function (e) {
      e.preventDefault();
      gbErr.textContent = "";
      var name = gbForm.gbname.value.trim(), pw = gbForm.gbpw.value, msg = gbForm.gbmsg.value.trim();
      if (!name) return (gbErr.textContent = "이름을 입력해 주세요.");
      if (pw.length < 4) return (gbErr.textContent = "비밀번호를 4자 이상 입력해 주세요. (삭제할 때 필요해요)");
      if (!msg) return (gbErr.textContent = "메시지를 입력해 주세요.");
      var b = gbForm.querySelector(".gb-submit");
      b.disabled = true;
      callScript({ type: "gb_add", name: name, password: pw, message: msg })
        .then(function (res) {
          gbItems.unshift(res.item);
          renderGb();
          gbForm.gbmsg.value = "";
          $("#gbLeft").textContent = "40";
          toast("축하 메시지가 등록되었습니다 💌");
        })
        .catch(function () { gbErr.textContent = "등록에 실패했어요. 잠시 후 다시 시도해 주세요."; })
        .finally(function () { b.disabled = false; });
    });
  }

  // ── 스크롤 등장 ──
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { threshold: 0.1 });
    $$(".reveal").forEach(function (n) { io.observe(n); });
  } else $$(".reveal").forEach(function (n) { n.classList.add("in"); });
})();
