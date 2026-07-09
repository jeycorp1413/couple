/* ============================================================
   우리 캘린더 — 푸시 알림 (모든 등록사항 자동 알림)
   index.html 맨 아래 </body> 앞에 한 줄만 추가하세요:
       <script src="push.js"></script>
   기존 코드는 건드리지 않아도 됩니다.
   ============================================================ */
(function () {
  // 1단계에서 만든 VAPID 공개키 (공개되어도 안전)
  var VAPID_PUBLIC = "BF44yAoEEy2I3mvvE4jgAP6E31CImB3vkqTnf6HBS-moctl8QnDvuMMAPZ4URCgSbS1cz8Lb6Ap7deVSyB-9gMw";

  var ROOT = "couple";
  var loadedAt = Date.now();
  var swReg = null;

  // ── 섹션별 알림 문구 ─────────────────────────────
  function labelFor(path) {
    var p = String(path || "");
    if (p.indexOf("/photos") >= 0) return ["📸 새 사진", "사진이 추가됐어요"];
    if (p.indexOf("/days") >= 0) return ["📝 여행 일정", "일정이 추가됐어요"];
    if (p.indexOf("/foods") >= 0) return ["🍽️ 가고싶은 맛집", "맛집이 추가됐어요"];
    if (p.indexOf("/expenses") >= 0) return ["💸 여행 경비", "지출이 기록됐어요"];
    if (p.indexOf("/prep") >= 0) return ["🎒 준비물", "준비물이 추가됐어요"];
    if (p.indexOf("/issues") >= 0) return ["💡 이슈 · 메모", "메모가 추가됐어요"];
    if (p.indexOf("/events") >= 0) return ["📅 캘린더", "일정이 추가됐어요"];
    if (p.indexOf("/todos") >= 0) return ["✅ 함께 할 일", "할 일이 추가됐어요"];
    if (p.indexOf("/wishes") >= 0) return ["🌟 가고싶은 곳", "위시리스트가 추가됐어요"];
    if (p.indexOf("/annivs") >= 0) return ["🎂 기념일 · 생일", "기념일이 추가됐어요"];
    if (p.indexOf("/memos") >= 0) return ["💌 우리의 한마디", "한마디가 도착했어요"];
    if (p.indexOf("/makeups") >= 0) return ["💗 마음 전하기", "마음이 도착했어요"];
    if (p.indexOf("/comments") >= 0) return ["💬 댓글", "새 댓글이 달렸어요"];
    return ["💗 우리 캘린더", "새 소식이 있어요"];
  }

  function snippet(value) {
    if (!value) return "";
    if (typeof value === "string") return value;
    var t = value.text || value.label || value.review || value.place || value.body || "";
    return String(t).slice(0, 60);
  }

  // ── 새 항목 등록되면 상대 폰으로 푸시 요청 ─────────
  function maybeNotify(path, value) {
    // 페이지 로드 직후 8초는 무시 (초기 시드 데이터 알림 방지)
    if (Date.now() - loadedAt < 8000) return;

    var lab = labelFor(path);
    var body = snippet(value);
    var payload = {
      title: lab[0],
      body: body ? body : lab[1],
      senderKey: localStorage.getItem("pushKey") || "",
    };
    fetch("/.netlify/functions/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(function () {});
  }

  // ── db.ref().push() 를 전역으로 감싸기 ──────────────
  function patchDb() {
    if (!window.firebase || !firebase.apps || !firebase.apps.length) {
      return setTimeout(patchDb, 300);
    }
    var database = firebase.database();
    if (database.__pushPatched) return;
    var origRef = database.ref.bind(database);
    database.ref = function (path) {
      var r = origRef(path);
      var origPush = r.push.bind(r);
      r.push = function (value) {
        var result = origPush(value);
        try { maybeNotify(path, value); } catch (e) {}
        return result;
      };
      return r;
    };
    database.__pushPatched = true;
  }

  // ── 서비스워커 등록 ───────────────────────────────
  function registerSW() {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("sw.js").then(function (reg) {
      swReg = reg;
    }).catch(function () {});
  }

  // ── "알림 켜기" 버튼 만들기 ────────────────────────
  function makeButton() {
    var perm = (typeof Notification !== "undefined") ? Notification.permission : "default";
    var subscribed = (perm === "granted" && localStorage.getItem("pushKey"));
    var btn = document.createElement("button");
    btn.textContent = subscribed ? "🔔 알림 다시 켜기" : "🔔 알림 켜기";
    btn.style.cssText =
      "position:fixed;right:14px;bottom:16px;z-index:9999;border:0;border-radius:24px;" +
      "padding:11px 16px;font-size:14px;font-weight:700;color:#fff;background:#e26d92;" +
      "box-shadow:0 4px 14px rgba(226,109,146,.45);cursor:pointer;font-family:inherit;";
    btn.onclick = function () { enablePush(); };
    document.body.appendChild(btn);
    window.__pushBtn = btn;
  }

  // ── 알림 켜기 (반드시 버튼 탭에서 호출) ─────────────
  function enablePush() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      alert("이 기기는 웹푸시를 지원하지 않아요.\n(iPhone은 사파리 → 공유 → '홈 화면에 추가' 후, 그 아이콘으로 열어서 다시 눌러주세요)");
      return;
    }
    Notification.requestPermission().then(function (perm) {
      if (perm !== "granted") { alert("알림 권한이 필요해요. 설정에서 켜주세요."); return; }
      navigator.serviceWorker.ready.then(function (reg) {
        return reg.pushManager.getSubscription().then(function (sub) {
          return sub || reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlB64ToUint8(VAPID_PUBLIC),
          });
        });
      }).then(function (sub) {
        var json = sub.toJSON();
        return hashKey(json.endpoint).then(function (key) {
          firebase.database().ref(ROOT + "/pushSubscriptions/" + key).set({
            endpoint: json.endpoint,
            keys: json.keys,
            updatedAt: Date.now(),
          });
          localStorage.setItem("pushKey", key);
          if (window.__pushBtn) window.__pushBtn.remove();
          alert("알림이 켜졌어요! 💗 이제 서로 뭔가 등록하면 알림이 가요.");
        });
      }).catch(function (e) {
        alert("알림 설정에 실패했어요: " + (e && e.message ? e.message : e));
      });
    });
  }
  window.enablePush = enablePush; // 직접 호출하고 싶으면 onclick="enablePush()"

  // ── 유틸 ─────────────────────────────────────────
  function urlB64ToUint8(s) {
    var pad = "=".repeat((4 - (s.length % 4)) % 4);
    var b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
    var raw = atob(b64);
    var arr = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
    return arr;
  }
  function hashKey(str) {
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode(str)).then(function (buf) {
      return Array.from(new Uint8Array(buf)).map(function (b) {
        return b.toString(16).padStart(2, "0");
      }).join("").slice(0, 32);
    });
  }

  // ── 시작 ─────────────────────────────────────────
  function start() {
    patchDb();
    registerSW();
    makeButton();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
