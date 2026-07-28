const WEEKDAY_NAMES = ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"];

let activeEvent = null;
let activeSlots = [];
let currentAssignments = []; // [{ slot_id, band_id, band_name }]
let myBandIds = []; // 自分が所属しているバンドのIDリスト
let currentUsername = "";

document.addEventListener("DOMContentLoaded", async () => {
  // 1. ユーザー情報取得 (安全パース)
  const rawUser = sessionStorage.getItem("user") || localStorage.getItem("username") || localStorage.getItem("user");
  if (rawUser) {
    try {
      const parsed = JSON.parse(rawUser);
      currentUsername = typeof parsed === "object" ? (parsed.username || parsed.name || "") : String(parsed);
    } catch (e) {
      currentUsername = String(rawUser);
    }
  }

  await loadAssignmentsData();
});

async function loadAssignmentsData() {
  const loading = document.getElementById("loading");
  const container = document.getElementById("assignment-container");

  try {
    // 2. アクティブなイベント情報を取得
    const eventRes = await fetch(`${BACKEND_URL}/api/get-active-event`);
    const eventData = await eventRes.json();

    if (!eventData.success || !eventData.event) {
      loading.textContent = "現在確定している練習イベントはありません。";
      return;
    }

    activeEvent = eventData.event;
    activeSlots = eventData.slots || [];

    document.getElementById("event-title").textContent = `${activeEvent.title} - 割り当て結果`;

    // 未公開（調整中）の場合はメッセージ表示
    if (activeEvent.status !== "published") {
      loading.innerHTML = `
        <div style="text-align: center; padding: 20px;">
          <h3>🟡 現在日程を調整中です</h3>
          <p>管理者による確定・公開までしばらくお待ちください。</p>
          <a href="practice.html" class="btn-secondary" style="margin-top:10px; display:inline-block;">希望入力へ戻る</a>
        </div>
      `;
      return;
    }

    // 3. 自分の所属バンドを取得（エラーが起きても全体描画を止めない）
    if (currentUsername) {
      try {
        const bandsRes = await fetch(`${BACKEND_URL}/api/get-bands`);
        const bandsData = await bandsRes.json();
        if (bandsData.success && bandsData.bands) {
          const targetUser = currentUsername.trim();
          // .strip() を .trim() に修正
          myBandIds = bandsData.bands
            .filter(b => b.members && b.members.some(m => String(m.username || m.name || '').trim() === targetUser))
            .map(b => Number(b.id));
        }
      } catch (e) {
        console.warn("所属バンド取得エラー（全体表示は続行します）:", e);
      }
    }

    // 4. 割当結果を取得
    const assignRes = await fetch(`${BACKEND_URL}/api/get-assignments/${activeEvent.id}`);
    const assignData = await assignRes.json();
console.log("取得した割り当てデータ:", assignData);
console.log("取得した自分のバンドID:", myBandIds);
    if (assignData.success && assignData.assignments) {
      currentAssignments = assignData.assignments;
    }

    // 5. 画面描画
    renderMySummary();
    renderGrid();

    loading.style.display = "none";
    container.style.display = "block";

  } catch (err) {
    console.error("データ読み込みエラー:", err);
    loading.textContent = "通信エラーが発生しました。接続状況を確認してください。";
  }
}

// 自分のバンドの割当サマリーを描画
function renderMySummary() {
  const summaryBox = document.getElementById("my-schedule-summary");
  const myList = document.getElementById("my-slot-list");
  myList.innerHTML = "";

  if (myBandIds.length === 0) return;

  // 自分のバンドが割り当てられているコマを抽出
  const myAssignments = currentAssignments.filter(a => myBandIds.includes(Number(a.band_id)));

  if (myAssignments.length === 0) {
    myList.innerHTML = "<li>あなたの所属バンドの練習コマはありません。</li>";
  } else {
    myAssignments.forEach(a => {
      const slot = activeSlots.find(s => Number(s.id) === Number(a.slot_id));
      if (slot) {
        const dayName = WEEKDAY_NAMES[slot.day_of_week];
        const timeStr = `${slot.start_time.slice(0, 5)} - ${slot.end_time.slice(0, 5)}`;
        myList.innerHTML += `
          <li>
            <strong>📅 ${dayName} 第${slot.slot_number}コマ (${timeStr})</strong> 
            ： 🎸 <span>${a.band_name}</span>
          </li>
        `;
      }
    });
  }

  summaryBox.style.display = "block";
}

// 全体スケジュールのグリッド描画
function renderGrid() {
  const container = document.getElementById("weekday-grid-container");
  container.innerHTML = "";

  // 曜日ごとのグループ化
  const slotsByDay = {};
  activeSlots.forEach(slot => {
    if (!slotsByDay[slot.day_of_week]) {
      slotsByDay[slot.day_of_week] = [];
    }
    slotsByDay[slot.day_of_week].push(slot);
  });

  const sortedDays = Object.keys(slotsByDay).sort((a, b) => {
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
      const assignment = currentAssignments.find(a => Number(a.slot_id) === Number(slot.id));
      const bandName = assignment ? assignment.band_name : null;
      const bandId = assignment ? Number(assignment.band_id) : null;

      const isMySlot = bandId && myBandIds.includes(bandId);

      slotsHtml += `
        <div class="slot-item-card ${isMySlot ? 'my-slot' : (bandName ? '' : 'unassigned')}">
          <div class="slot-info">
            <span class="slot-number">第 ${slot.slot_number} コマ</span>
            <span class="slot-time">${slot.start_time.slice(0, 5)} - ${slot.end_time.slice(0, 5)}</span>
          </div>
          <div class="band-name-label">
            ${bandName ? `🎸 ${bandName} ${isMySlot ? '✨(自バンド)' : ''}` : '<span style="color:#adb5bd;">-- 練習なし --</span>'}
          </div>
        </div>
      `;
    });

    section.innerHTML = `
      <h3 class="weekday-header">📅 ${dayName}</h3>
      <div class="slot-list-grid">${slotsHtml}</div>
    `;

    container.appendChild(section);
  });
}