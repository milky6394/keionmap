const WEEKDAY_NAMES = ["", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日"];

let activeSlots = [];
let currentAssignments = {}; // { slot_id: band_name }
let myBands = []; // 自分が所属しているバンド名リスト

document.addEventListener("DOMContentLoaded", async () => {
  await loadSchedule();
});

async function loadSchedule() {
  const loading = document.getElementById("loading");
  const container = document.getElementById("schedule-container");

  try {
    // 1. ログインユーザー情報の取得（自バンド強調用）
    const rawUser = sessionStorage.getItem("user") || localStorage.getItem("username") || localStorage.getItem("user");
    let currentUsername = "";
    if (rawUser) {
      try {
        const parsed = JSON.parse(rawUser);
        currentUsername = typeof parsed === "object" ? (parsed.username || parsed.name || "") : String(parsed);
      } catch (e) {
        currentUsername = String(rawUser);
      }
    }

    // 2. 自分が所属するバンド一覧の取得（ログイン中の場合）
    if (currentUsername) {
      try {
        const myBandRes = await fetch(`${BACKEND_URL}/api/get-user-bands/${encodeURIComponent(currentUsername)}`);
        const myBandData = await myBandRes.json();
        if (myBandData.success) {
          myBands = (myBandData.bands || []).map(b => b.band_name);
        }
      } catch (e) {
        console.warn("自バンドの取得に失敗しました:", e);
      }
    }

    // 3. 常設コマ枠を取得 (20コマ)
    const slotRes = await fetch(`${BACKEND_URL}/api/get-practice-slots`);
    const slotData = await slotRes.json();
    if (!slotData.success) {
      loading.textContent = "コマ枠データの取得に失敗しました。";
      return;
    }
    activeSlots = slotData.slots || [];

    // 4. 確定した割り当てデータを取得
    const assignRes = await fetch(`${BACKEND_URL}/api/get-assignments`);
    const assignData = await assignRes.json();

    currentAssignments = {};
    if (assignData.success && assignData.assignments) {
      assignData.assignments.forEach(a => {
        if (a.band_name) {
          currentAssignments[String(a.slot_id)] = a.band_name;
        }
      });
    }

    // 5. グリッド描画
    renderScheduleGrid();

    loading.style.display = "none";
    container.style.display = "block";

  } catch (err) {
    console.error(err);
    loading.textContent = "通信エラーが発生しました。バックエンドの起動を確認してください。";
  }
}

// 曜日ごとのスケジュールグリッドを描画
function renderScheduleGrid() {
  const container = document.getElementById("weekday-grid-container");
  container.innerHTML = "";

  const slotsByDay = {};
  activeSlots.forEach(slot => {
    if (!slotsByDay[slot.day_of_week]) slotsByDay[slot.day_of_week] = [];
    slotsByDay[slot.day_of_week].push(slot);
  });

  [1, 2, 3, 4, 5].forEach(dayInt => {
    const daySlots = slotsByDay[dayInt] || [];
    const dayName = WEEKDAY_NAMES[dayInt];

    const section = document.createElement("div");
    section.className = "weekday-card";

    let slotsHtml = "";
    daySlots.forEach(slot => {
      const assignedBandName = currentAssignments[String(slot.id)];
      const startTime = slot.start_time ? slot.start_time.slice(0, 5) : "";
      const endTime = slot.end_time ? slot.end_time.slice(0, 5) : "";

      // 自分の所属バンドかどうかの判定
      const isMyBand = assignedBandName && myBands.includes(assignedBandName);

      let bandBadgeHtml = "";
      if (assignedBandName) {
        bandBadgeHtml = `
          <span class="assigned-band-badge ${isMyBand ? 'my-band' : ''}">
            🎸 ${assignedBandName} ${isMyBand ? '★(自バンド)' : ''}
          </span>
        `;
      } else {
        bandBadgeHtml = `<span class="empty-slot-badge">-- 空きコマ --</span>`;
      }

      slotsHtml += `
        <div class="slot-row ${isMyBand ? 'highlight-my-slot' : ''}">
          <div class="slot-title">
            <strong>第 ${slot.slot_number} コマ</strong>
            <span class="slot-time">${startTime}〜${endTime}</span>
          </div>
          <div class="slot-assignment-display">
            ${bandBadgeHtml}
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