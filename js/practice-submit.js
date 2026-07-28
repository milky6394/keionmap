const WEEKDAY_NAMES = ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"];

let activeEvent = null;
let activeSlots = [];
// ユーザの希望選択状態 { slot_id: wish_level (0, 1, 2) }
let userWishes = {};
let currentUsername = "";

document.addEventListener("DOMContentLoaded", async () => {
  // 1. ストレージから生の文字列を取得
  const rawUser = sessionStorage.getItem("user") || localStorage.getItem("username") || localStorage.getItem("user");
  
  if (!rawUser) {
    alert("ログインが必要です。");
    window.location.href = "index.html";
    return;
  }

  // 2. JSON オブジェクトであれば username プロパティを取り出し、文字列ならそのまま使う
  try {
    const parsed = JSON.parse(rawUser);
    if (typeof parsed === "object" && parsed !== null) {
      currentUsername = parsed.username || parsed.name || "";
    } else {
      currentUsername = String(parsed);
    }
  } catch (e) {
    // JSON パースに失敗した場合はそのまま文字列として扱う
    currentUsername = rawUser;
  }

  // 万が一空文字や "undefined" などの文字列になってしまった場合の安全策
  if (!currentUsername || currentUsername === "undefined" || currentUsername === "null") {
    alert("ログイン情報が正しく取得できませんでした。再ログインしてください。");
    window.location.href = "index.html";
    return;
  }

  await loadActiveEventAndWishes();
});

// イベント情報・コマ枠・既存回答の読み込み
async function loadActiveEventAndWishes() {
  const loading = document.getElementById("loading");
  const form = document.getElementById("wish-submit-form");
  const errorMsg = document.getElementById("error-message");

  try {
    // 1. アクティブなイベントとコマ枠を取得
    const eventRes = await fetch(`${BACKEND_URL}/api/get-active-event`);
    const eventData = await eventRes.json();

    if (!eventData.success || !eventData.event) {
      loading.textContent = eventData.message || "現在募集中の練習イベントはありません。";
      return;
    }

    activeEvent = eventData.event;
    activeSlots = eventData.slots || [];

    // イベント基本情報のセット
    document.getElementById("event-title").textContent = activeEvent.title;
    
    // 締め切り日時のフォーマット
    const deadline = new Date(activeEvent.deadline);
    document.getElementById("event-deadline-info").innerHTML = 
      `⏰ 提出締め切り: <strong>${deadline.getFullYear()}年${deadline.getMonth()+1}月${deadline.getDate()}日 ${String(deadline.getHours()).padStart(2, '0')}:${String(deadline.getMinutes()).padStart(2, '0')}</strong>`;

    if (activeSlots.length === 0) {
      loading.textContent = "設定されているコマ枠がありません。";
      return;
    }

    // 2. 既存の自分の回答を取得（再編集用）
    try {
      const wishRes = await fetch(`${BACKEND_URL}/api/get-user-wishes/${activeEvent.id}/${currentUsername}`);
      const wishData = await wishRes.json();
      if (wishData.success && wishData.wishes) {
        wishData.wishes.forEach(w => {
          userWishes[w.slot_id] = w.wish_level;
        });
      }
    } catch (e) {
      console.log("既存の希望データなし（新規回答）");
    }

    // デフォルト値のセット: 回答未設定のコマはすべて「1: ◯行ける」をデフォルトに
    activeSlots.forEach(slot => {
      if (userWishes[slot.id] === undefined) {
        userWishes[slot.id] = 1; // デフォルト OK
      }
    });

    // 3. UIのレンダリング
    renderWeekdaySections();

    loading.style.display = "none";
    form.style.display = "block";

  } catch (err) {
    console.error(err);
    loading.textContent = "通信エラーが発生しました。接続状況を確認してください。";
  }
}

// 曜日ごとにグループ化してUIを描画
function renderWeekdaySections() {
  const container = document.getElementById("weekday-sections-container");
  container.innerHTML = "";

  // 曜日でコマをグループ分け { 1: [slots...], 2: [slots...] }
  const slotsByDay = {};
  activeSlots.forEach(slot => {
    if (!slotsByDay[slot.day_of_week]) {
      slotsByDay[slot.day_of_week] = [];
    }
    slotsByDay[slot.day_of_week].push(slot);
  });

  // 曜日順 (月->日) に表示したい場合は並び替え
  const sortedDays = Object.keys(slotsByDay).sort((a, b) => {
    // 1(月)〜6(土), 0(日) の順にソート調整
    const orderA = a == 0 ? 7 : parseInt(a);
    const orderB = b == 0 ? 7 : parseInt(b);
    return orderA - orderB;
  });

  sortedDays.forEach(dayInt => {
    const daySlots = slotsByDay[dayInt];
    const dayName = WEEKDAY_NAMES[dayInt];

    const section = document.createElement("div");
    section.className = "weekday-section";

    let slotsHtml = "";
    daySlots.forEach(slot => {
      const currentVal = userWishes[slot.id];

      slotsHtml += `
        <div class="slot-item-card">
          <div class="slot-info">
            <span class="slot-number">第 ${slot.slot_number} コマ</span>
            <span class="slot-time">${slot.start_time.slice(0, 5)} - ${slot.end_time.slice(0, 5)}</span>
          </div>
          <div class="wish-options">
            <label class="option-label opt-ng ${currentVal === 0 ? 'selected' : ''}">
              <input type="radio" name="slot_${slot.id}" value="0" ${currentVal === 0 ? 'checked' : ''} onchange="setWish(${slot.id}, 0, this)">
              <span>✕ 行けない</span>
            </label>
            <label class="option-label opt-ok ${currentVal === 1 ? 'selected' : ''}">
              <input type="radio" name="slot_${slot.id}" value="1" ${currentVal === 1 ? 'checked' : ''} onchange="setWish(${slot.id}, 1, this)">
              <span>◯ 行ける</span>
            </label>
            <label class="option-label opt-best ${currentVal === 2 ? 'selected' : ''}">
              <input type="radio" name="slot_${slot.id}" value="2" ${currentVal === 2 ? 'checked' : ''} onchange="setWish(${slot.id}, 2, this)">
              <span>◎ ありがたい</span>
            </label>
          </div>
        </div>
      `;
    });

    section.innerHTML = `
      <h3 class="weekday-header">📅 ${dayName}</h3>
      <div class="slot-list">${slotsHtml}</div>
    `;

    container.appendChild(section);
  });
}

// ラジオボタンの選択変更時
function setWish(slotId, level, inputElem) {
  userWishes[slotId] = level;

  // ボタンの見た目のクラス付け替え
  const parentContainer = inputElem.closest('.wish-options');
  const labels = parentContainer.querySelectorAll('.option-label');
  labels.forEach(lbl => lbl.classList.remove('selected'));
  inputElem.closest('.option-label').classList.add('selected');
}

// 希望提出の送信処理
async function handleSubmitWishes(e) {
  e.preventDefault();

  const submitBtn = document.getElementById("submit-btn");
  const errorMsg = document.getElementById("error-message");
  errorMsg.style.display = "none";

  submitBtn.disabled = true;
  submitBtn.textContent = "送信中...";

  // API送信用データ整形 [{ slot_id: 1, wish_level: 2 }, ...]
  const wishesArray = Object.keys(userWishes).map(slotId => ({
    slot_id: parseInt(slotId),
    wish_level: userWishes[slotId]
  }));

  try {
    const response = await fetch(`${BACKEND_URL}/api/submit-wishes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_id: activeEvent.id,
        username: currentUsername,
        wishes: wishesArray
      })
    });

    const result = await response.json();

    if (result.success) {
      alert("練習希望を正常に保存しました！");
      window.location.href = "practice.html";
    } else {
      errorMsg.textContent = result.message || "送信に失敗しました。";
      errorMsg.style.display = "block";
      submitBtn.disabled = false;
      submitBtn.textContent = "💾 練習希望を送信・更新する";
    }
  } catch (err) {
    console.error(err);
    errorMsg.textContent = "通信エラーが発生しました。接続状況を確認してください。";
    errorMsg.style.display = "block";
    submitBtn.disabled = false;
    submitBtn.textContent = "💾 練習希望を送信・更新する";
  }
}