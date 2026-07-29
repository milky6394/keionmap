const WEEKDAY_NAMES = ["", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日"];

let activeSlots = [];
let allBands = [];
let currentAssignments = {}; // { slot_id: band_id }

document.addEventListener("DOMContentLoaded", async () => {
  await loadAdminData();
});

// コマ枠・バンド一覧・現在の割当を一括取得
async function loadAdminData() {
  const loading = document.getElementById("loading");
  const container = document.getElementById("result-container");

  try {
    // 1. 常設コマ枠を取得 (20コマ)
    const slotRes = await fetch(`${BACKEND_URL}/api/get-practice-slots`);
    const slotData = await slotRes.json();
    if (!slotData.success) {
      loading.textContent = "コマ枠データの取得に失敗しました。";
      return;
    }
    activeSlots = slotData.slots || [];

    // 2. バンド一覧を取得
    const bandRes = await fetch(`${BACKEND_URL}/api/get-bands`);
    const bandData = await bandRes.json();
    allBands = bandData.bands || [];

    // 3. 現在の割当データを取得
    await fetchAssignments();

    loading.style.display = "none";
    container.style.display = "block";
  } catch (err) {
    console.error(err);
    loading.textContent = "通信エラーが発生しました。バックエンドの起動を確認してください。";
  }
}

// 割り当てデータ取得 & 再描画
async function fetchAssignments() {
  const res = await fetch(`${BACKEND_URL}/api/get-assignments`);
  const data = await res.json();

  currentAssignments = {};
  if (data.success && data.assignments) {
    data.assignments.forEach(a => {
      if (a.band_id) {
        currentAssignments[String(a.slot_id)] = String(a.band_id);
      }
    });
  }
  renderGrid();
}

// 曜日ごとの割当グリッドを描画
function renderGrid() {
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
      const assignedBandId = currentAssignments[String(slot.id)];

      // バンド選択ドロップダウンの作成
      let bandOptionsHtml = `<option value="">-- 未割り当て --</option>`;
      allBands.forEach(b => {
        const isSelected = String(b.id) === String(assignedBandId) ? "selected" : "";
        bandOptionsHtml += `<option value="${b.id}" ${isSelected}>🎸 ${b.band_name}</option>`;
      });

      const startTime = slot.start_time ? slot.start_time.slice(0, 5) : "";
      const endTime = slot.end_time ? slot.end_time.slice(0, 5) : "";

      slotsHtml += `
        <div class="slot-row ${assignedBandId ? 'has-assignment' : ''}">
          <div class="slot-title">
            <strong>第 ${slot.slot_number} コマ</strong>
            <span class="slot-time">${startTime}〜${endTime}</span>
          </div>
          <div class="assignment-selector">
            <select class="band-select" onchange="handleManualChange(${slot.id}, this.value)">
              ${bandOptionsHtml}
            </select>
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

// ⚡ 「作成（自動割り当て実行）」ボタン処理
async function runCreateAssignments() {
  if (!confirm("現時点の練習希望データを元に割当を自動計算・更新しますか？\n（現在の手動変更内容は上書きされます）")) return;

  const btn = document.getElementById("btn-calculate");
  btn.disabled = true;
  btn.textContent = "⏳ 割り当て作成中...";

  try {
    const res = await fetch(`${BACKEND_URL}/api/admin/calculate-assignments`, {
      method: "POST"
    });
    const result = await res.json();

    if (result.success) {
      alert("割当の更新が完了しました！");
      await fetchAssignments(); // 再読み込み
    } else {
      alert(result.message || "割り当て作成に失敗しました。");
    }
  } catch (err) {
    console.error(err);
    alert("通信エラーが発生しました。");
  } finally {
    btn.disabled = false;
    btn.textContent = "⚡ 現時点の希望から割当を作成・更新する";
  }
}

// ✋ 手動で個別にバンドを変更した場合の処理
async function handleManualChange(slotId, bandId) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/admin/update-assignment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slot_id: slotId, band_id: bandId ? parseInt(bandId) : null })
    });
    const result = await res.json();

    if (result.success) {
      if (bandId) {
        currentAssignments[String(slotId)] = String(bandId);
      } else {
        delete currentAssignments[String(slotId)];
      }
      renderGrid(); // 画面ハイライト更新
    } else {
      alert("変更の保存に失敗しました: " + result.message);
      await fetchAssignments(); // 元に戻す
    }
  } catch (err) {
    console.error(err);
    alert("通信エラーが発生しました。");
    await fetchAssignments();
  }
}