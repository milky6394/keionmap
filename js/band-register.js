document.addEventListener('DOMContentLoaded', async () => {
  const bandNameInput = document.getElementById('band-name-input');
  const memberListDiv = document.getElementById('member-list');
  const addRowBtn = document.getElementById('add-member-row-btn');
  const saveBtn = document.getElementById('save-band-btn');
  const msgDiv = document.getElementById('msg-band');

  let allMembers = [];

  // 選択肢となる基本パート一覧
  const partsList = ['Vo', 'Gt', 'Ba', 'Dr', 'Key', 'Other'];

  // 初期化：全メンバーデータを取得
  try {
    const res = await fetch(`${BACKEND_URL}/api/get-members`);
    const data = await res.json();
    if (data.success) {
      allMembers = data.members;
    }
  } catch (e) {
    console.error('部員一覧の取得に失敗しました', e);
  }

  // 最初から1行目を追加
  addMemberRow();

  // メンバー追加ボタン
  addRowBtn.addEventListener('click', () => addMemberRow());

  // メンバー行を追加する関数
  function addMemberRow() {
    const card = document.createElement('div');
    card.className = 'member-card-row';
    card.style.cssText = `
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 12px;
    `;

    // --- 1行目: 学年絞り込み + 部員選択 + 削除ボタン ---
    const topRow = document.createElement('div');
    topRow.style.cssText = 'display: flex; gap: 8px; align-items: center; margin-bottom: 10px;';

    // 学年フィルター（幅固定）
    const gradeSelect = document.createElement('select');
    gradeSelect.style.cssText = 'width: 80px; padding: 8px 4px; border-radius: 6px; border: 1px solid #ccc; font-size: 0.9rem;';
    gradeSelect.innerHTML = `
      <option value="all">全学年</option>
      <option value="1">1年</option>
      <option value="2">2年</option>
      <option value="3">3年</option>
      <option value="4">4年</option>
      <option value="5">5年</option>
    `;

    // 部員選択（flex: 1 で最大の幅を確保）
    const userSelect = document.createElement('select');
    userSelect.className = 'member-select';
    userSelect.style.cssText = 'flex: 1; min-width: 0; padding: 8px; font-size: 0.95rem; border-radius: 6px; border: 1px solid #ccc;';

    // 部員リスト更新関数
    const updateMemberList = () => {
      const selectedGrade = gradeSelect.value;
      let filtered = allMembers;
      if (selectedGrade !== 'all') {
        filtered = allMembers.filter(m => String(m.grade) === selectedGrade);
      }

      let options = '<option value="">-- 部員を選択 --</option>';
      filtered.forEach(m => {
        options += `<option value="${m.username}">${m.username} (${m.grade}年)</option>`;
      });
      userSelect.innerHTML = options;
    };

    updateMemberList();
    gradeSelect.addEventListener('change', updateMemberList);

    // 削除ボタン（アイコン表示でコンパクトに）
    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.textContent = '✕';
    delBtn.title = '行を削除';
    delBtn.style.cssText = 'width: 36px; height: 36px; padding: 0; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 1rem; flex-shrink: 0; font-weight: bold;';
    delBtn.addEventListener('click', () => {
      if (memberListDiv.children.length > 1) {
        card.remove();
      } else {
        alert('最低1人のメンバーが必要です');
      }
    });

    topRow.appendChild(gradeSelect);
    topRow.appendChild(userSelect);
    topRow.appendChild(delBtn);

    // --- 2行目: 担当パート（複数チェックボックス & Other自由入力） ---
    const partRow = document.createElement('div');
    partRow.style.cssText = 'display: flex; align-items: center; gap: 10px; flex-wrap: wrap; background: #fff; padding: 8px 10px; border-radius: 6px; border: 1px solid #eee;';

    const partLabel = document.createElement('span');
    partLabel.textContent = '担当パート:';
    partLabel.style.cssText = 'font-weight: bold; font-size: 0.85rem; color: #4b5563;';
    partRow.appendChild(partLabel);

    // Otherのテキスト入力フィールド（初期は非表示）
    const otherTextInput = document.createElement('input');
    otherTextInput.type = 'text';
    otherTextInput.placeholder = '楽器名を入力';
    otherTextInput.className = 'other-part-text';
    otherTextInput.style.cssText = 'display: none; width: 120px; padding: 4px 8px; font-size: 0.85rem; border: 1px solid #ccc; border-radius: 4px;';

    partsList.forEach(p => {
      const label = document.createElement('label');
      label.style.cssText = 'display: inline-flex; align-items: center; gap: 4px; font-size: 0.9rem; cursor: pointer;';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = p;
      checkbox.className = 'part-checkbox';

      // Otherがチェンジされたときの処理
      if (p === 'Other') {
        checkbox.addEventListener('change', (e) => {
          if (e.target.checked) {
            otherTextInput.style.display = 'inline-block';
            otherTextInput.focus();
          } else {
            otherTextInput.style.display = 'none';
            otherTextInput.value = '';
          }
        });
      }

      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(p));
      
      if (p === 'Other') {
        // Otherの直後にテキスト入力欄を追加
        label.appendChild(otherTextInput);
      }

      partRow.appendChild(label);
    });

    card.appendChild(topRow);
    card.appendChild(partRow);

    memberListDiv.appendChild(card);
  }

  // 保存処理
  saveBtn.addEventListener('click', async () => {
    const bandName = bandNameInput.value.trim();
    if (!bandName) {
      msgDiv.textContent = 'バンド名を入力してください';
      return;
    }

    const cards = memberListDiv.querySelectorAll('.member-card-row');
    const membersData = [];

    cards.forEach(card => {
      const username = card.querySelector('.member-select').value;
      const checkedBoxes = card.querySelectorAll('.part-checkbox:checked');
      
      let partString = '';
      checkedBoxes.forEach(box => {
        if (box.value === 'Other') {
          const otherVal = card.querySelector('.other-part-text').value.trim();
          // 入力された文字があればそれを使用、空なら"Other"
          const customPart = otherVal || 'Other';
          partString += `${customPart} `;
        } else {
          partString += `${box.value} `;
        }
      });

      if (username) {
        membersData.push({
          username: username,
          part: partString // 例: "Gt Vo Sax " など
        });
      }
    });

    if (membersData.length === 0) {
      msgDiv.textContent = '部員を少なくとも1名選択してください';
      return;
    }

    const hasEmptyPart = membersData.some(m => !m.part.trim());
    if (hasEmptyPart) {
      msgDiv.textContent = '選択したメンバーの担当パートを少なくとも1つチェックしてください';
      return;
    }

    msgDiv.textContent = '';
    saveBtn.disabled = true;
    saveBtn.textContent = '登録中…';

    try {
      const res = await fetch(`${BACKEND_URL}/api/register-band`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          band_name: bandName,
          members: membersData
        })
      });

      const data = await res.json();

      if (data.success) {
        alert(data.message);
        window.location.href = 'bands.html';
      } else {
        msgDiv.textContent = data.message;
        saveBtn.disabled = false;
        saveBtn.textContent = 'バンドを登録する';
      }
    } catch (err) {
      msgDiv.textContent = '通信エラーが発生しました';
      saveBtn.disabled = false;
      saveBtn.textContent = 'バンドを登録する';
    }
  });
});