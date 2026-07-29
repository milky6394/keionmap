const WEEKDAY_NAMES = ["", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日"];

let activeSlots = [];
let userWishes = {};
let currentUsername = "";

document.addEventListener("DOMContentLoaded", async () => {
  // 1. ログインユーザーの取得
  const rawUser = sessionStorage.getItem("user") || localStorage.getItem("username") || localStorage.getItem("user");
  if (!rawUser) {
    alert("ログインが必要です。");
    window.location.href = "index.html";
    return;
  }

  try {
    const parsed = JSON.parse(rawUser);
    currentUsername = typeof parsed === "object" ? (parsed.username || parsed.name || "") : String(parsed);
  } catch (e) {
    currentUsername = String(rawUser);
  }

  if (!currentUsername) {
    alert("ユーザー情報が見つかりません。");
    window.location.href = "index.html";
    return;
  }

  await loadSlotsAndWishes();
});

// コマ枠と自分の希望を取得
async function loadSlotsAndWishes() {
  const loading = document.getElementById("loading");
  const form = document.getElementById("wish-form");

  try {
    // 1. 常設コマ枠を取得 (計20コマ)
    const slotRes = await fetch(`${BACKEND_URL}/api/get-practice-slots`);
    const slotData = await slotRes.json();
    if (!slotData.success) {
      loading.textContent = "コマ枠データの取得に失敗しました。";
      return;
    }
    activeSlots = slotData.slots || [];

    // 2. 自分の希望状況を取得
    const wishRes = await fetch(`${BACKEND_URL}/api/get-user-wishes/${encodeURIComponent(currentUsername)}`);
    const wishData = await wishRes.json();
    
    userWishes = {};
    if (wishData.success && wishData.wishes) {
      wishData.wishes.forEach(w => {
        userWishes[w.slot_id] = w.wish_level;
      });
    }

    // デフォルト（未設定）のコマは「1 (◯ 行ける)」にする
    activeSlots.forEach(slot => {
      if (userWishes[slot.id] === undefined) {
        userWishes[slot.id] = 1;
      }
    });

    // 3. 画面レンダリング
    renderWeekdaySections();
    loading.style.display = "none";
    form.style.display = "block";

  } catch (err) {
    console.error(err);
    loading.textContent = "通信エラーが発生しました。バックエンドが起動しているか確認してください。";
  }
}

// 曜日ごとにコマ枠を描画
function renderWeekdaySections() {
  const container = document.getElementById("weekday-container");
  container.innerHTML = "";

  const slotsByDay = {};
  activeSlots.forEach(slot => {
    if (!slotsByDay[slot.day_of_week]) slotsByDay[slot.day_of_week] = [];
    slotsByDay[slot.day_of_week].push(slot);
  });

  // 月(1) 〜 金(5)
  [1, 2, 3, 4, 5].forEach(dayInt => {
    const daySlots = slotsByDay[dayInt] || [];
    const dayName = WEEKDAY_NAMES[dayInt];

    const section = document.createElement("div");
    section.className = "weekday-card";

    let slotsHtml = "";
    daySlots.forEach(slot => {
      const currentVal = userWishes[slot.id];
      const startTime = slot.start_time ? slot.start_time.slice(0, 5) : "";
      const endTime = slot.end_time ? slot.end_time.slice(0, 5) : "";

      slotsHtml += `
        <div class="slot-row">
          <div class="slot-title">
            <strong>第 ${slot.slot_number} コマ</strong>
            <span class="slot-time">${startTime}〜${endTime}</span>
          </div>
          <div class="wish-options">
            <label class="opt-btn opt-ng ${currentVal === 0 ? 'active' : ''}">
              <input type="radio" name="slot_${slot.id}" value="0" ${currentVal === 0 ? 'checked' : ''} onchange="setWish(${slot.id}, 0, this)">
              ✕ 行けない
            </label>
            <label class="opt-btn opt-ok ${currentVal === 1 ? 'active' : ''}">
              <input type="radio" name="slot_${slot.id}" value="1" ${currentVal === 1 ? 'checked' : ''} onchange="setWish(${slot.id}, 1, this)">
              ◯ 行ける
            </label>
            <label class="opt-btn opt-best ${currentVal === 2 ? 'active' : ''}">
              <input type="radio" name="slot_${slot.id}" value="2" ${currentVal === 2 ? 'checked' : ''} onchange="setWish(${slot.id}, 2, this)">
              ◎ ありがたい
            </label>
          </div>
        </div>
      `;
    });

    section.innerHTML = `
      <h3 class="weekday-title">📅 ${dayName}</h3>
      <div class="slot-list">${slotsHtml}</div>
    `;
    container.appendChild(section);
  });
}

// 選択変更時
function setWish(slotId, level, inputElem) {
  userWishes[slotId] = level;
  const parentContainer = inputElem.closest('.wish-options');
  const labels = parentContainer.querySelectorAll('.opt-btn');
  labels.forEach(lbl => lbl.classList.remove('active'));
  inputElem.closest('.opt-btn').classList.add('active');
}

// 送信（保存）処理
async function handleSubmitWishes(e) {
  e.preventDefault();
  const submitBtn = document.getElementById("submit-btn");
  submitBtn.disabled = true;
  submitBtn.textContent = "保存中...";

  const wishesArray = Object.keys(userWishes).map(slotId => ({
    slot_id: parseInt(slotId),
    wish_level: userWishes[slotId]
  }));

  try {
    const res = await fetch(`${BACKEND_URL}/api/submit-wishes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: currentUsername, wishes: wishesArray })
    });
    const result = await res.json();

    if (result.success) {
      alert("練習希望を保存・更新しました！");
    } else {
      alert(result.message || "保存に失敗しました。");
    }
  } catch (err) {
    console.error(err);
    alert("通信エラーが発生しました。");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "💾 練習希望を保存・更新する";
  }
}