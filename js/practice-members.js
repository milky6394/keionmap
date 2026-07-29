const WEEKDAY_NAMES = ["", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日"];
const WISH_LEVEL_LABELS = {
  2: { label: "◎ 第一希望", class: "wish-2" },
  1: { label: "◯ 参加可能", class: "wish-1" },
  0: { label: "✕ 参加不可", class: "wish-0" }
};

let activeSlots = [];
let myBands = [];
let currentBandMembers = [];
let membersWishMap = {}; // { username: { slot_id: wish_level } }

document.addEventListener("DOMContentLoaded", async () => {
  await initPage();
});

async function initPage() {
  const loading = document.getElementById("loading");
  loading.style.display = "block";

  try {
    // 1. ログインユーザー名取得
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

    if (!currentUsername) {
      alert("ログイン情報が見つかりません。ログインし直してください。");
      return;
    }

    // 2. 常設コマ枠を取得 (20コマ)
    const slotRes = await fetch(`${BACKEND_URL}/api/get-practice-slots`);
    const slotData = await slotRes.json();
    if (slotData.success) {
      activeSlots = slotData.slots || [];
    }

    // 3. 自分の所属バンド一覧を取得
    const bandRes = await fetch(`${BACKEND_URL}/api/get-user-bands/${encodeURIComponent(currentUsername)}`);
    const bandData = await bandRes.json();
    
    if (bandData.success && bandData.bands.length > 0) {
      myBands = bandData.bands;
      const select = document.getElementById("band-select");
      select.innerHTML = "";
      
      myBands.forEach(b => {
        const opt = document.createElement("option");
        opt.value = b.id;
        opt.textContent = `🎸 ${b.band_name}`;
        select.appendChild(opt);
      });

      // 最初のバンドのデータを読み込み
      await loadBandMembersWish(myBands[0].id);
    } else {
      loading.textContent = "所属しているバンドがありません。";
    }

  } catch (err) {
    console.error(err);
    loading.textContent = "通信エラーが発生しました。";
  }
}

// ドロップダウン変更時
async function onBandChange(bandId) {
  if (!bandId) return;
  await loadBandMembersWish(bandId);
}

// 選択されたバンドのメンバーと希望データを取得
async function loadBandMembersWish(bandId) {
  const loading = document.getElementById("loading");
  const container = document.getElementById("members-wish-container");

  loading.style.display = "block";
  container.style.display = "none";

  try {
    const res = await fetch(`${BACKEND_URL}/api/get-band-members-wishes/${bandId}`);
    const data = await res.json();

    if (!data.success) {
      loading.textContent = "データの取得に失敗しました。";
      return;
    }

    currentBandMembers = data.members || [];
    membersWishMap = data.wishes_map || {}; // { username: { slot_id: level } }

    renderGrid();

    loading.style.display = "none";
    container.style.display = "block";
  } catch (err) {
    console.error(err);
    loading.textContent = "通信エラーが発生しました。";
  }
}

// 曜日ごと・コマごとのメンバー全員の希望一覧を描画
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
      const startTime = slot.start_time ? slot.start_time.slice(0, 5) : "";
      const endTime = slot.end_time ? slot.end_time.slice(0, 5) : "";

      // 各メンバーのこのコマに対する希望を収集
      let membersStatusHtml = "";
      let allCanJoin = true; // 全員参加可能フラグ

      currentBandMembers.forEach(mem => {
        const userWish = membersWishMap[mem.username]?.[slot.id];
        const level = (userWish !== undefined && userWish !== null) ? userWish : 1; // 未回答は◯扱い
        const wishInfo = WISH_LEVEL_LABELS[level] || WISH_LEVEL_LABELS[1];

        if (level === 0) allCanJoin = false;

        membersStatusHtml += `
          <div class="member-wish-item">
            <span class="member-name">${mem.username}</span>
            <span class="wish-tag ${wishInfo.class}">${wishInfo.label}</span>
          </div>
        `;
      });

      slotsHtml += `
        <div class="slot-row ${allCanJoin ? 'slot-all-ok' : ''}">
          <div class="slot-title">
            <strong>第 ${slot.slot_number} コマ</strong> (${startTime}〜${endTime})
            ${allCanJoin ? '<span class="all-ok-badge">✨ 全員OK</span>' : ''}
          </div>
          <div class="members-wish-list">
            ${membersStatusHtml}
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