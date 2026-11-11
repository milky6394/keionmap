document.addEventListener('DOMContentLoaded', async () => {
  const bandNameInput = document.getElementById('band-name-input');
  const currentSongsInput = document.getElementById('current-songs-input');
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

    // --- 1行目: 学年絞り込み + 部員選択 + 削除ボタン ---
    const topRow = document.createElement('div');
    topRow.className = 'member-row-top';

    // 学年フィルター（幅固定）
    const gradeSelect = document.createElement('select');
    gradeSelect.className = 'member-grade-select';
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
    delBtn.className = 'member-row-delete';
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
    partRow.className = 'member-part-row';

    const partLabel = document.createElement('span');
    partLabel.textContent = '担当パート:';
    partLabel.className = 'member-part-label';
    partRow.appendChild(partLabel);

    // Otherのテキスト入力フィールド（初期は非表示）
    const otherTextInput = document.createElement('input');
    otherTextInput.type = 'text';
    otherTextInput.placeholder = '楽器名を入力';
    otherTextInput.className = 'other-part-text';

    partsList.forEach(p => {
      const label = document.createElement('label');
      label.className = 'member-part-option';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = p;
      checkbox.className = 'part-checkbox';

      // Otherがチェンジされたときの処理
      if (p === 'Other') {
        checkbox.addEventListener('change', (e) => {
          otherTextInput.classList.toggle('is-visible', e.target.checked);
          if (e.target.checked) {
            otherTextInput.focus();
          } else {
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
      const username = card.querySelector('.member-select')?.value || '';
      const checkedBoxes = card.querySelectorAll('.part-checkbox:checked');
      
      let partString = '';
      checkedBoxes.forEach(box => {
        if (box.value === 'Other') {
          const otherInput = card.querySelector('.other-part-text');
          const otherVal = otherInput ? otherInput.value.trim() : '';
          const customPart = otherVal || 'Other';
          partString += `${customPart} `;
        } else {
          partString += `${box.value} `;
        }
      });

      // ★ 1. trim() で末尾のスペースを消去
      const finalInstrument = partString.trim();

      if (username) {
        membersData.push({
          username: username,
          instrument: finalInstrument, // ★ 2. DB用の 'instrument' を追加（これがキーポイントです）
          part: finalInstrument        // ★ JSチェック用の 'part' も保持
        });
      }
    });

    if (membersData.length === 0) {
      msgDiv.textContent = '部員を少なくとも1名選択してください';
      return;
    }

    // ★ 3. チェック処理も更新コードと同一にして安全化
    const hasEmptyPart = membersData.some(m => !m.part || !m.part.trim());
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
          current_songs: currentSongsInput.value.trim(),
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