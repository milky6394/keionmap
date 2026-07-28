const WEEKDAY_NAMES = ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"];

let activeEvent = null;
let activeSlots = [];
let allBands = [];
let currentAssignments = {}; // { slot_id: band_id }

document.addEventListener("DOMContentLoaded", async () => {
  await loadEventAndAssignments();
});

// 1. イベント・コマ枠・バンド・現在の割り当てデータを取得
async function loadEventAndAssignments() {
  const loading = document.getElementById("loading");
  const container = document.getElementById("result-container");

  try {
    // アクティブイベントの取得
    const eventRes = await fetch(`${BACKEND_URL}/api/get-active-event`);
    const eventData = await eventRes.json();

    if (!eventData.success || !eventData.event) {
      loading.textContent = "対象の練習イベントが見つかりません。";
      return;
    }

    activeEvent = eventData.event;
    activeSlots = eventData.slots || [];

    document.getElementById("event-title").textContent = `${activeEvent.title} - 割り当て管理`;
    document.getElementById("event-status-info").textContent = `ステータス: ${
      activeEvent.status === "published" ? "🟢 確定・公開中" : "🟡 調整中（未公開）"
    }`;

    // 全バンド一覧の取得（ドロップダウン用）
    const bandRes = await fetch(`${BACKEND_URL}/api/get-bands`);
    const bandData = await bandRes.json();
    if (bandData.success) {
      allBands = bandData.bands || [];
    }

    // 現在の割り当て結果を取得して描画
    await fetchAssignments();

    loading.style.display = "none";
    container.style.display = "block";

  } catch (err) {
    console.error(err);
    loading.textContent = "通信エラーが発生しました。";
  }
  // admin-practice-result.js の loadEventAndAssignments 内でステータスチェック
if (activeEvent.status === "published") {
  const btn = document.getElementById("btn-publish");
  if (btn) {
    btn.textContent = "✅ 確定済み";
    btn.disabled = true;
    btn.style.backgroundColor = "#6c757d";
  }
}
}

// 2. 割り当てデータ取得 API 呼び出し & データマップ作成
async function fetchAssignments() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/get-assignments/${activeEvent.id}`);
    const data = await res.json();

    currentAssignments = {}; // マップのクリア

    if (data.success && data.assignments && data.assignments.length > 0) {
      data.assignments.forEach(a => {
        // 数値・文字列どちらでも一致するように Number 型に揃えて保持
        if (a.slot_id !== undefined && a.band_id !== undefined) {
          currentAssignments[Number(a.slot_id)] = Number(a.band_id);
        }
      });
      const count = Object.keys(currentAssignments).length;
      document.getElementById("assignment-summary").textContent = `割り当て済み: ${count}コマ`;
    } else {
      document.getElementById("assignment-summary").textContent = "未計算";
    }

    // 最新状態にUIをレンダリング
    renderGrid();
  } catch (e) {
    console.error("割り当てデータ取得エラー:", e);
  }
}

// 3. 曜日ごとの結果グリッドを描画
function renderGrid() {
  const container = document.getElementById("weekday-grid-container");
  container.innerHTML = "";

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
      const assignedBandId = currentAssignments[Number(slot.id)];

      // バンド選択ドロップダウンの作成
      let bandOptionsHtml = `<option value="">-- 未割り当て --</option>`;
      allBands.forEach(b => {
        // String 比較にすることで '1' と 1 の型の不一致を確実に防ぐ
        const isSelected = String(b.id) === String(assignedBandId) ? "selected" : "";
        bandOptionsHtml += `<option value="${b.id}" ${isSelected}>🎸 ${b.band_name}</option>`;
      });

      const isAssigned = assignedBandId !== undefined && assignedBandId !== null;

      slotsHtml += `
        <div id="slot-card-${slot.id}" class="slot-item-card ${isAssigned ? 'assigned' : 'unassigned'}">
          <div class="slot-info">
            <span class="slot-number">第 ${slot.slot_number} コマ</span>
            <span class="slot-time">${slot.start_time.slice(0, 5)} - ${slot.end_time.slice(0, 5)}</span>
          </div>
          <div class="assignment-selector">
            <select onchange="handleManualAssignmentChange(${slot.id}, this.value)">
              ${bandOptionsHtml}
            </select>
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

// 4. 自動割り当てボタン実行処理
async function runAutoAssignment() {
  const btn = document.getElementById("btn-calculate");
  const errorMsg = document.getElementById("error-message");
  errorMsg.style.display = "none";

  if (!confirm("自動割り当てを実行しますか？（現在の割り当ては上書きされます）")) {
    return;
  }

  btn.disabled = true;
  btn.textContent = "⏳ 計算中...";

  try {
    const res = await fetch(`${BACKEND_URL}/api/admin/calculate-and-save-assignments/${activeEvent.id}`, {
      method: "POST"
    });
    const result = await res.json();

    if (result.success) {
      alert(result.message);
      
      // POSTのレスポンス自体に割り当て結果が含まれている場合はそれを使って直接描画
      if (result.assignments && result.assignments.length > 0) {
        currentAssignments = {};
        result.assignments.forEach(a => {
          currentAssignments[Number(a.slot_id)] = Number(a.band_id);
        });
        const count = Object.keys(currentAssignments).length;
        document.getElementById("assignment-summary").textContent = `割り当て済み: ${count}コマ`;
        renderGrid();
      } else {
        // なければ GET で再取得
        await fetchAssignments();
      }
    } else {
      errorMsg.textContent = result.message || "計算処理に失敗しました。";
      errorMsg.style.display = "block";
    }
  } catch (err) {
    console.error(err);
    errorMsg.textContent = "通信エラーが発生しました。";
    errorMsg.style.display = "block";
  } finally {
    btn.disabled = false;
    btn.textContent = "⚡ 自動割り当てを実行する";
  }
}

// 5. ドロップダウンで手動で割り当てを変更した場合の見た目更新
function handleManualAssignmentChange(slotId, bandId) {
  const cardElem = document.getElementById(`slot-card-${slotId}`);

  if (bandId) {
    currentAssignments[Number(slotId)] = Number(bandId);
    if (cardElem) {
      cardElem.classList.remove("unassigned");
      cardElem.classList.add("assigned");
    }
  } else {
    delete currentAssignments[Number(slotId)];
    if (cardElem) {
      cardElem.classList.remove("assigned");
      cardElem.classList.add("unassigned");
    }
  }

  // カウントサマリーの更新
  const count = Object.keys(currentAssignments).length;
  document.getElementById("assignment-summary").textContent = `割り当て済み: ${count}コマ`;
}

// 割り当ての確定・公開処理
async function publishAssignments() {
  if (!activeEvent) return;

  const confirmMsg = "この内容で割り当てを確定・公開しますか？\n（確定すると部員が自分の練習コマを確認できるようになります）";
  if (!confirm(confirmMsg)) {
    return;
  }

  const btn = document.getElementById("btn-publish");
  btn.disabled = true;
  btn.textContent = "処理中...";

  try {
    const res = await fetch(`${BACKEND_URL}/api/admin/publish-event/${activeEvent.id}`, {
      method: "POST"
    });
    const result = await res.json();

    if (result.success) {
      alert(result.message);
      // ステータス表示を更新
      activeEvent.status = "published";
      document.getElementById("event-status-info").textContent = "ステータス: 🟢 確定・公開中";
      btn.textContent = "✅ 確定済み";
      btn.style.backgroundColor = "#6c757d"; // グレーアウト
    } else {
      alert("エラー: " + result.message);
      btn.disabled = false;
      btn.textContent = "🎉 この内容で割当を確定・公開する";
    }
  } catch (err) {
    console.error(err);
    alert("通信エラーが発生しました。");
    btn.disabled = false;
    btn.textContent = "🎉 この内容で割当を確定・公開する";
  }
}