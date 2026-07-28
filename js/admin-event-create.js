// 生成されたコマのリストデータ
let generatedSlots = [];
const WEEKDAY_NAMES = ["日", "月", "火", "水", "木", "金", "土"];

// 画面ロード時の初期化
document.addEventListener("DOMContentLoaded", () => {
  const today = new Date();
  
  // 締め切りデフォルト（1週間後の23:59）
  const deadlineDate = new Date(today);
  deadlineDate.setDate(deadlineDate.getDate() + 7);
  
  const deadlineElem = document.getElementById("event-deadline");
  if (deadlineElem) {
    deadlineElem.value = `${formatDate(deadlineDate)}T23:59`;
  }
});

// YYYY-MM-DD フォーマット
function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// 時刻文字列 "10:00" -> 分換算
function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

// 分換算 -> 時刻文字列 "10:00"
function minutesToTime(mins) {
  const h = String(Math.floor(mins / 60)).padStart(2, '0');
  const m = String(mins % 60).padStart(2, '0');
  return `${h}:${m}`;
}

// 曜日ベースでコマ枠を生成
function generateSlotList() {
  const slotsPerDay = parseInt(document.getElementById("slots-per-day").value) || 4;
  const duration = parseInt(document.getElementById("slot-duration").value) || 60;
  const startTimeStr = document.getElementById("first-slot-start").value || "10:00";

  // 選択された曜日を取得
  const selectedDays = Array.from(document.querySelectorAll('.weekday-checkboxes input:checked'))
    .map(cb => parseInt(cb.value));

  if (selectedDays.length === 0) {
    alert("少なくとも1つの曜日を選択してください。");
    return;
  }

  generatedSlots = [];

  // 選択された各曜日についてコマを生成
  selectedDays.forEach(dayInt => {
    let currentStartMinutes = timeToMinutes(startTimeStr);

    for (let i = 1; i <= slotsPerDay; i++) {
      const startMinutes = currentStartMinutes;
      const endMinutes = startMinutes + duration;

      generatedSlots.push({
        day_of_week: dayInt,
        slot_number: i,
        start_time: minutesToTime(startMinutes),
        end_time: minutesToTime(endMinutes)
      });

      currentStartMinutes = endMinutes;
    }
  });

  renderSlotTable();
}

// テーブル描画
function renderSlotTable() {
  const tbody = document.getElementById("slot-table-body");
  const countSpan = document.getElementById("slot-count");
  tbody.innerHTML = "";
  countSpan.textContent = generatedSlots.length;

  if (generatedSlots.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-msg">生成されたコマ枠がありません</td></tr>';
    return;
  }

  generatedSlots.forEach((slot, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${WEEKDAY_NAMES[slot.day_of_week]}曜日</strong></td>
      <td>第 ${slot.slot_number} コマ</td>
      <td><input type="time" value="${slot.start_time}" onchange="updateSlot(${index}, 'start_time', this.value)"></td>
      <td><input type="time" value="${slot.end_time}" onchange="updateSlot(${index}, 'end_time', this.value)"></td>
      <td><button type="button" class="btn-danger-icon" onclick="removeSlot(${index})">✕</button></td>
    `;
    tbody.appendChild(tr);
  });
}

function updateSlot(index, field, value) {
  generatedSlots[index][field] = value;
}

function removeSlot(index) {
  generatedSlots.splice(index, 1);
  renderSlotTable();
}

// フォーム送信処理（API呼び出し）
async function handleCreateEvent(e) {
  e.preventDefault();

  const title = document.getElementById("event-title").value.trim();
  const deadline = document.getElementById("event-deadline").value;
  const errorMsg = document.getElementById("error-message");
  const submitBtn = document.getElementById("submit-btn");

  errorMsg.style.display = "none";

  if (generatedSlots.length === 0) {
    errorMsg.textContent = "コマ枠が一つも生成されていません。「曜日別コマ枠を一括生成」を実行してください。";
    errorMsg.style.display = "block";
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "作成処理中...";

  try {
    // config.js の BACKEND_URL を使用
    const response = await fetch(`${BACKEND_URL}/api/admin/create-event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title,
        deadline: deadline,
        slots: generatedSlots
      })
    });

    const result = await response.json();

    if (result.success) {
      alert("練習割り当てイベントを正常に作成しました！");
      window.location.href = "practice.html";
    } else {
      errorMsg.textContent = result.message || "イベントの作成に失敗しました。";
      errorMsg.style.display = "block";
      submitBtn.disabled = false;
      submitBtn.textContent = "🚀 練習イベントを発行する";
    }
  } catch (err) {
    console.error(err);
    errorMsg.textContent = "通信エラーが発生しました。バックエンドサーバーの接続状況を確認してください。";
    errorMsg.style.display = "block";
    submitBtn.disabled = false;
    submitBtn.textContent = "🚀 練習イベントを発行する";
  }
}