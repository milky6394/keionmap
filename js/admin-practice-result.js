const WEEKDAY_NAMES = ["", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日"];

let activeSlots = [];
let allBands = [];
let draftAssignments = {}; // { slot_id: band_id } （編集中の割当案）
let isModified = false;    // 変更があったかのフラグ

document.addEventListener("DOMContentLoaded", async () => {
  await loadAdminData();
});

// コマ枠・バンド一覧・現在の確定済割当を取得
async function loadAdminData() {
  const loading = document.getElementById("loading");
  const container = document.getElementById("result-container");

  try {
    // 1. 常設コマ枠を取得
    const slotRes = await fetch(`${BACKEND_URL}/api/get-practice-slots`);
    if (!slotRes.ok) throw new Error(`コマ枠取得失敗: ${slotRes.status}`);
    const slotData = await slotRes.json();
    
    if (!slotData.success) {
      loading.innerHTML = `<p style="color: red;">⚠️ コマ枠データの取得に失敗しました: ${slotData.message || ''}</p>`;
      return;
    }
    activeSlots = slotData.slots || [];

    // 2. バンド一覧を取得
    const bandRes = await fetch(`${BACKEND_URL}/api/get-bands`);
    if (!bandRes.ok) throw new Error(`バンド一覧取得失敗: ${bandRes.status}`);
    const bandData = await bandRes.json();
    allBands = bandData.bands || [];

    // 3. 現在確定している割当データを取得
    await fetchAssignments();

    loading.style.display = "none";
    container.style.display = "block";
  } catch (err) {
    console.error("初期ロードエラー:", err);
    loading.innerHTML = `
      <p style="color: red; font-weight: bold;">⚠️ データの読み込みに失敗しました。</p>
      <p style="font-size: 0.9rem; color: #666;">詳細: ${err.message}</p>
      <button onclick="location.reload()" class="btn btn-sm btn-secondary" style="margin-top: 10px;">🔄 ページを再読み込み</button>
    `;
  }
}

// 確定済み割り当てデータ取得 & 初期化
async function fetchAssignments() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/get-assignments`);
    if (!res.ok) return;
    const data = await res.json();

    draftAssignments = {};
    if (data.success && data.assignments) {
      data.assignments.forEach(a => {
        if (a.band_id) {
          draftAssignments[String(a.slot_id)] = String(a.band_id);
        }
      });
    }
    isModified = false;
    updateDraftStatusUI();
    renderGrid();
  } catch (e) {
    console.error("割当データ取得エラー:", e);
  }
}

// 曜日ごとの割当グリッドを描画
function renderGrid() {
  const container = document.getElementById("weekday-grid-container");
  if (!container) return;
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
      const assignedBandId = draftAssignments[String(slot.id)];

      // バンド選択ドロップダウンの作成
      let bandOptionsHtml = `<option value="">-- 未割り当て --</option>`;
      allBands.forEach(b => {
        const isSelected = String(b.id) === String(assignedBandId) ? "selected" : "";
        bandOptionsHtml += `<option value="${b.id}" ${isSelected}>🎸 ${b.band_name}</option>`;
      });

      const startTime = slot.start_time ? slot.start_time.slice(0, 5) : "";
      const endTime = slot.end_time ? slot.end_time.slice(0, 5) : "";

      slotsHtml += `
        <div class="slot-row ${assignedBandId ? 'has-assignment' : ''}" style="margin-bottom: 10px; padding: 8px; border-bottom: 1px solid #eee;">
          <div class="slot-title">
            <strong>第 ${slot.slot_number} コマ</strong>
            <span class="slot-time" style="margin-left: 8px; color: #666; font-size: 0.9rem;">${startTime}〜${endTime}</span>
          </div>
          <div class="assignment-selector" style="margin-top: 5px;">
            <select class="band-select" onchange="handleManualChange(${slot.id}, this.value)" style="padding: 5px; width: 100%; max-width: 250px;">
              ${bandOptionsHtml}
            </select>
          </div>
        </div>
      `;
    });

    section.innerHTML = `
      <h3 class="weekday-title" style="border-bottom: 2px solid #007bff; padding-bottom: 5px; margin-top: 20px;">📅 ${dayName}</h3>
      <div class="slot-list">${slotsHtml || '<p style="color: #999;">コマ枠がありません</p>'}</div>
    `;
    container.appendChild(section);
  });
}

// ⚡ 「割当案を作成（自動計算）」ボタン処理（画面上のみに反映）
async function runCreateAssignments() {
  if (isModified && !confirm("編集中の変更内容が上書きされます。希望データから新しい割当案を作成しますか？")) return;

  const btn = document.getElementById("btn-calculate");
  btn.disabled = true;
  btn.textContent = "⏳ 割当案を作成中...";

  try {
    const res = await fetch(`${BACKEND_URL}/api/admin/calculate-assignments-draft`, {
      method: "POST"
    });
    const result = await res.json();

    if (result.success) {
      draftAssignments = {};
      if (result.assignments) {
        result.assignments.forEach(a => {
          if (a.band_id) draftAssignments[String(a.slot_id)] = String(a.band_id);
        });
      }
      isModified = true;
      updateDraftStatusUI();
      renderGrid();
      alert("割り当て案を作成しました！手動で微調整後、下部の「確定ボタン」を押すと全体公開されます。");
    } else {
      alert(result.message || "割り当て案の作成に失敗しました。");
    }
  } catch (err) {
    console.error(err);
    alert("通信エラーが発生しました。");
  } finally {
    btn.disabled = false;
    btn.textContent = "⚡ 現時点の希望から割当案を作成する";
  }
}

// ✋ 手動で個別にバンドを変更した場合の処理
function handleManualChange(slotId, bandId) {
  if (bandId) {
    draftAssignments[String(slotId)] = String(bandId);
  } else {
    delete draftAssignments[String(slotId)];
  }
  isModified = true;
  updateDraftStatusUI();
  renderGrid();
}

// 未確定変更バッジの表示制御
function updateDraftStatusUI() {
  const badge = document.getElementById("draft-status-badge");
  if (badge) {
    badge.style.display = isModified ? "inline-block" : "none";
  }
}

// ✅ 「割当を確定して全員に公開する」ボタン処理
async function saveAndConfirmAssignments() {
  if (!confirm("現在の割り当て内容で確定し、メンバー全員に公開しますか？")) return;

  const btn = document.getElementById("btn-confirm");
  btn.disabled = true;
  btn.textContent = "⏳ 保存・公開中...";

  const payloadAssignments = activeSlots.map(slot => {
    const slotIdNum = parseInt(slot.id, 10);
    const rawBandId = draftAssignments[String(slot.id)];

    let bandIdNum = null;
    if (rawBandId !== null && rawBandId !== undefined && rawBandId !== "") {
      const parsed = parseInt(rawBandId, 10);
      if (!isNaN(parsed)) bandIdNum = parsed;
    }

    return {
      slot_id: slotIdNum,
      band_id: bandIdNum
    };
  });

  try {
    const res = await fetch(`${BACKEND_URL}/api/admin/confirm-assignments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({ assignments: payloadAssignments })
    });

    if (!res.ok) {
      const errText = await res.text();
      alert(`サーバーエラーが発生しました (${res.status}): ${errText}`);
      return;
    }

    const result = await res.json();
    if (result.success) {
      alert("🎉 割り当てを確定し、全体へ公開しました！");
      isModified = false;
      updateDraftStatusUI();
    } else {
      alert("保存に失敗しました: " + (result.message || ""));
    }
  } catch (err) {
    console.error("通信エラー詳細:", err);
    alert("通信エラーが発生しました。");
  } finally {
    btn.disabled = false;
    btn.textContent = "✅ 割り当てを確定して全員に公開する";
  }
}