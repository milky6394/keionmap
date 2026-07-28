document.addEventListener('DOMContentLoaded', async () => {
  const selectBand = document.getElementById('select-band-to-edit');
  const editFormArea = document.getElementById('edit-form-area');
  const bandNameInput = document.getElementById('band-name-input');
  const memberListDiv = document.getElementById('member-list');
  const addRowBtn = document.getElementById('add-member-row-btn');
  const saveBtn = document.getElementById('save-band-btn');
  const msgDiv = document.getElementById('msg-band');

  let allMembers = [];
  let allBands = [];
  const partsList = ['Vo', 'Gt', 'Ba', 'Dr', 'Key', 'Other'];

  // 初期化：全部員データおよび全バンドデータの取得
  try {
    const [memRes, bandRes] = await Promise.all([
      fetch(`${BACKEND_URL}/api/get-members`),
      fetch(`${BACKEND_URL}/api/get-bands`)
    ]);

    const memData = await memRes.json();
    const bandData = await bandRes.json();

    if (memData.success) allMembers = memData.members;
    if (bandData.success) {
      allBands = bandData.bands;
      let options = '<option value="">-- バンドを選択してください --</option>';
      allBands.forEach(b => {
        options += `<option value="${b.id}">${b.band_name}</option>`;
      });
      selectBand.innerHTML = options;
    }
  } catch (e) {
    console.error('データの取得に失敗しました', e);
  }

  // バンドが選択された時の処理
  selectBand.addEventListener('change', async () => {
    const bandId = selectBand.value;
    if (!bandId) {
      editFormArea.style.display = 'none';
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/get-band/${bandId}`);
      const data = await res.json();

      if (data.success) {
        populateForm(data.band);
        editFormArea.style.display = 'block';
      } else {
        alert(data.message);
      }
    } catch (e) {
      alert('バンド詳細データの取得に失敗しました');
    }
  });

  // フォームへの既存データのセット処理
  function populateForm(band) {
    bandNameInput.value = band.band_name;
    memberListDiv.innerHTML = '';

    if (band.members && band.members.length > 0) {
      band.members.forEach(m => {
        addMemberRow(m.username, m.part);
      });
    } else {
      addMemberRow();
    }
  }

  // 行追加ボタン
  addRowBtn.addEventListener('click', () => addMemberRow());

  // メンバー行を追加・初期化する関数
  function addMemberRow(initialUsername = '', initialPart = '') {
    const card = document.createElement('div');
    card.className = 'member-card-row';
    card.style.cssText = `
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 12px;
    `;

    // 1行目：学年・部員選択・削除ボタン
    const topRow = document.createElement('div');
    topRow.style.cssText = 'display: flex; gap: 8px; align-items: center; margin-bottom: 10px;';

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

    const userSelect = document.createElement('select');
    userSelect.className = 'member-select';
    userSelect.style.cssText = 'flex: 1; min-width: 0; padding: 8px; font-size: 0.95rem; border-radius: 6px; border: 1px solid #ccc;';

    const updateMemberList = () => {
      const selectedGrade = gradeSelect.value;
      let filtered = allMembers;
      if (selectedGrade !== 'all') {
        filtered = allMembers.filter(m => String(m.grade) === selectedGrade);
      }

      let options = '<option value="">-- 部員を選択 --</option>';
      filtered.forEach(m => {
        const isSelected = m.username === initialUsername ? 'selected' : '';
        options += `<option value="${m.username}" ${isSelected}>${m.username} (${m.grade}年)</option>`;
      });
      userSelect.innerHTML = options;
    };

    // 初期表示時に指定ユーザーの学年に絞り込めるか判定
    if (initialUsername) {
      const targetUser = allMembers.find(m => m.username === initialUsername);
      if (targetUser) {
        gradeSelect.value = String(targetUser.grade);
      }
    }

    updateMemberList();
    gradeSelect.addEventListener('change', updateMemberList);

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

    // 2行目：担当パート（既存のパート文字列をパースして再現）
    const partRow = document.createElement('div');
    partRow.style.cssText = 'display: flex; align-items: center; gap: 10px; flex-wrap: wrap; background: #fff; padding: 8px 10px; border-radius: 6px; border: 1px solid #eee;';

    const partLabel = document.createElement('span');
    partLabel.textContent = '担当パート:';
    partLabel.style.cssText = 'font-weight: bold; font-size: 0.85rem; color: #4b5563;';
    partRow.appendChild(partLabel);

    const existingParts = initialPart.trim().split(/\s+/);

    const otherTextInput = document.createElement('input');
    otherTextInput.type = 'text';
    otherTextInput.placeholder = '楽器名を入力';
    otherTextInput.className = 'other-part-text';
    otherTextInput.style.cssText = 'display: none; width: 120px; padding: 4px 8px; font-size: 0.85rem; border: 1px solid #ccc; border-radius: 4px;';

    // 既存パートの中で標準以外のものがあればOtherテキスト欄にセット
    let customOtherValue = '';
    existingParts.forEach(p => {
      if (p && !partsList.includes(p)) {
        customOtherValue = p;
      }
    });

    partsList.forEach(p => {
      const label = document.createElement('label');
      label.style.cssText = 'display: inline-flex; align-items: center; gap: 4px; font-size: 0.9rem; cursor: pointer;';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = p;
      checkbox.className = 'part-checkbox';

      // 初期値の判定とチェック入れ
      if (p === 'Other') {
        if (existingParts.includes('Other') || customOtherValue) {
          checkbox.checked = true;
          otherTextInput.style.display = 'inline-block';
          otherTextInput.value = customOtherValue;
        }

        checkbox.addEventListener('change', (e) => {
          if (e.target.checked) {
            otherTextInput.style.display = 'inline-block';
            otherTextInput.focus();
          } else {
            otherTextInput.style.display = 'none';
            otherTextInput.value = '';
          }
        });
      } else {
        if (existingParts.includes(p)) {
          checkbox.checked = true;
        }
      }

      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(p));

      if (p === 'Other') {
        label.appendChild(otherTextInput);
      }

      partRow.appendChild(label);
    });

    card.appendChild(topRow);
    card.appendChild(partRow);
    memberListDiv.appendChild(card);
  }

  // 保存（更新）処理
  saveBtn.addEventListener('click', async () => {
    const bandId = parseInt(selectBand.value, 10);
    const bandName = bandNameInput.value.trim();

    if (!bandId || !bandName) {
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
          const customPart = otherVal || 'Other';
          partString += `${customPart} `;
        } else {
          partString += `${box.value} `;
        }
      });

      if (username) {
        membersData.push({
          username: username,
          part: partString
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
    saveBtn.textContent = '保存中…';

    try {
      const res = await fetch(`${BACKEND_URL}/api/update-band`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          band_id: bandId,
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
        saveBtn.textContent = '更新内容を保存する';
      }
    } catch (err) {
      msgDiv.textContent = '通信エラーが発生しました';
      saveBtn.disabled = false;
      saveBtn.textContent = '更新内容を保存する';
    }
  });
});