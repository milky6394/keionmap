document.addEventListener('DOMContentLoaded', () => {
  if (!sessionStorage.getItem('user')) {
    alert('ログインしてください');
    window.location.href = 'index.html';
    return;
  }

  let allMembers = [];

  // 1. 要素取得（filterDormitory を filterInstrument に変更）
  const searchName = document.getElementById('search-name');
  const filterGrade = document.getElementById('filter-grade');
  const filterCourse = document.getElementById('filter-course');
  const filterInstrument = document.getElementById('filter-instrument'); // ★変更
  const memberList = document.getElementById('member-list');
  const countNumber = document.getElementById('count-number');

  fetchMembers();

  // 2. イベント登録（filterInstrument に変更）
  searchName.addEventListener('input', applyFilters);
  filterGrade.addEventListener('change', applyFilters);
  filterCourse.addEventListener('change', applyFilters);
  filterInstrument.addEventListener('change', applyFilters); // ★変更

  async function fetchMembers() {
    try {
      const res = await fetch(`${BACKEND_URL}/api/get-members`);
      const data = await res.json();

      if (data.success) {
        allMembers = data.members;
        applyFilters();
      } else {
        memberList.innerHTML = `<p class="error">${data.message}</p>`;
      }
    } catch (err) {
      memberList.innerHTML = '<p class="error">通信エラーが発生しました</p>';
    }
  }

  // 3. 検索・絞り込みの適用（楽器のチェックロジックへ変更）
  function applyFilters() {
    const nameQuery = searchName.value.trim().toLowerCase();
    const selectedGrade = filterGrade.value;
    const selectedCourse = filterCourse.value;
    const selectedInst = filterInstrument.value; // 選択されたフィルター ('Vo', 'Gt', 'Ba', 'Dr', 'Key', 'Other')

    const filtered = allMembers.filter(member => {
      // 名前検索
      if (nameQuery && !member.username.toLowerCase().includes(nameQuery)) {
        return false;
      }
      // 学年フィルター
      if (selectedGrade && String(member.grade) !== selectedGrade) {
        return false;
      }
      // 学科フィルター
      if (selectedCourse && member.course !== selectedCourse) {
        return false;
      }

      // ★ 担当楽器フィルター（複数選択 & その他対応）
      if (selectedInst) {
        // DBから取得した楽器データ（配列なら結合、文字列ならそのまま使用）
        const instData = Array.isArray(member.instrument) 
          ? member.instrument.join(',') 
          : (member.instrument || '');

        if (selectedInst === 'Other') {
          // 「その他」が選ばれた場合：
          // 基本5パート（Vo, Gt, Ba, Dr, Key）以外の文字が含まれているか判定
          const standardParts = ['Vo', 'Gt', 'Ba', 'Dr', 'Key'];
          
          // カンマなどで分割して個別のパーツチェック
          const parts = instData.split(',').map(p => p.trim()).filter(Boolean);
          
          // 基本パート以外（その他入力された楽器）が1つでも含まれているか？
          const hasOther = parts.some(part => !standardParts.includes(part));

          if (!hasOther) {
            return false;
          }
        } else {
          // 通常のパート（Vo, Gt, Ba, Dr, Key）が選ばれた場合：
          // そのパート文字列が含まれているかチェック
          if (!instData.includes(selectedInst)) {
            return false;
          }
        }
      }

      return true;
    });

    renderMemberList(filtered);
  }

  function renderMemberList(members) {
    countNumber.textContent = members.length;

    if (members.length === 0) {
      memberList.innerHTML = '<p class="no-data">該当する部員が見つかりません</p>';
      return;
    }

    const courseMap = { M: '機械', E: '電気', S: '制御', C: '建設' };

    memberList.innerHTML = members.map(m => `
      <div class="member-item-card">
        <div class="member-header">
          <span class="member-name">${escapeHtml(m.username)}</span>
          <span class="member-badge">${m.grade}年 ${escapeHtml(m.class || '')} (${courseMap[m.course] || m.course})</span>
        </div>
        <div class="member-details">
          <div><b>パート:</b> ${escapeHtml(m.instrument || '未設定')}</div>
          <div><b>性別:</b> ${escapeHtml(m.gender || '-')}</div>
          <div><b>学籍番号:</b> ${escapeHtml(m.number || '-')}</div>
          <div><b>LINE:</b> ${escapeHtml(m.line || '-')}</div>
          <div class="full-row"><b>兼部先:</b> ${escapeHtml(m.multi || 'なし')}</div>
        </div>
      </div>
    `).join('');
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
});