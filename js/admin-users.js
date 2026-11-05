document.addEventListener('DOMContentLoaded', () => {
  const userTableBody = document.getElementById('userTableBody');
  const searchInput = document.getElementById('searchInput');
  const gradeFilter = document.getElementById('gradeFilter');

  // モーダル・要素 (編集)
  const editModal = document.getElementById('edit-modal');
  const closeEditModalBtn = document.getElementById('close-edit-modal-btn');
  const targetUsernameInput = document.getElementById('edit-target-username');
  const displayUsername = document.getElementById('display-username');
  const gradeSelect = document.getElementById('edit-grade-select');
  const classGroup = document.getElementById('edit-class-group');
  const classInput = document.getElementById('edit-class-input');
  const courseSelect = document.getElementById('edit-course-select');
  const numberInput = document.getElementById('edit-number-input');
  const genderSelect = document.getElementById('edit-gender-select');
  const dormitorySelect = document.getElementById('edit-dormitory-select');
  const dormOptions = document.getElementById('edit-dorm-options');
  const roomInput = document.getElementById('edit-room-input');
  const singleSelect = document.getElementById('edit-single-select');
  const lineInput = document.getElementById('edit-line-input');
  const multiInput = document.getElementById('edit-multi-input');
  const saveBtn = document.getElementById('save-edit-btn');
  const msgEdit = document.getElementById('msg-edit');

  // モーダル・要素 (削除)
  const deleteModal = document.getElementById('delete-modal');
  const closeDeleteModalBtn = document.getElementById('close-delete-modal-btn');
  const deleteDisplayUsername = document.getElementById('delete-display-username');
  const confirmCheck = document.getElementById('delete-confirm-check');
  const deleteAccountBtn = document.getElementById('delete-account-btn');
  const msgDelete = document.getElementById('msg-delete');

  let allUsers = [];
  let currentTargetUser = null;

  // 1. 全ユーザーの取得
  async function fetchUsers() {
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/users`);
      const data = await res.json();

      if (data.success) {
        allUsers = data.users;
        renderUsers();
      } else {
        alert(data.message || 'ユーザー情報の取得に失敗しました');
      }
    } catch (err) {
      console.error(err);
      alert('通信エラーが発生しました');
    }
  }

  // 2. 一覧描画 (名前・学年/クラス・担当パート・所属バンド・操作)
  function renderUsers() {
    const query = searchInput.value.toLowerCase().trim();
    const selectedGrade = gradeFilter.value;

    const filtered = allUsers.filter(u => {
      const matchQuery = (u.username || '').toLowerCase().includes(query) ||
                         (u.instrument || '').toLowerCase().includes(query);
      const matchGrade = selectedGrade === 'all' || String(u.grade) === selectedGrade;
      return matchQuery && matchGrade;
    });

    if (filtered.length === 0) {
      userTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #6b7280;">該当するユーザーが見つかりません</td></tr>';
      return;
    }

    userTableBody.innerHTML = filtered.map(u => {
      const cls = u.member_class || u.class;
      const classStr = cls ? ` (${cls})` : '';

      return `
        <tr>
          <td><strong>${escapeHtml(u.username)}</strong></td>
          <td>${u.grade ? u.grade + '年' + classStr : '-'}</td>
          <td>${escapeHtml(u.instrument || '-')}</td>
          <td>${escapeHtml(u.band || '-')}</td>
          <td>
            <button class="action-btn btn-edit-user" onclick="openEditModal('${escapeHtml(u.username)}')">編集</button>
            <button class="action-btn btn-delete-user" onclick="openDeleteModal('${escapeHtml(u.username)}')">削除</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  // イベントリスナー設定
  gradeSelect.addEventListener('change', toggleGradeInput);
  dormitorySelect.addEventListener('change', toggleDormInput);
  saveBtn.addEventListener('click', saveAdminUserEdit);

  function toggleGradeInput() {
    const val = gradeSelect.value;
    if (val === '1' || val === '2') {
      classGroup.classList.remove('hidden');
    } else {
      classGroup.classList.add('hidden');
      classInput.value = '';
    }
  }

  function toggleDormInput() {
    if (dormitorySelect.value === 'true') {
      dormOptions.classList.remove('hidden');
    } else {
      dormOptions.classList.add('hidden');
    }
  }

// ★ 編集モーダルを開く処理（既存データを完全に反映）
  window.openEditModal = (username) => {
    // 該当ユーザーを全データから検索
    const user = allUsers.find(u => u.username === username);
    if (!user) return;

    currentTargetUser = user;

    // ユーザー名表示 & 隠し要素セット
    displayUsername.textContent = user.username || '';
    targetUsernameInput.value = user.username || '';

    // 学年
    gradeSelect.value = user.grade ? String(user.grade) : '1';

    // クラス (DB上のキー名 "class" を最優先で取得)
    classInput.value = user.class || user.member_class || '';

    // 学科・学籍番号・性別
    courseSelect.value = user.course || 'M';
    numberInput.value = user.number || '';
    genderSelect.value = user.gender || '男性';

    // 居住形態 (boolean / string の両方に対応)
    const isDorm = user.dormitory === true || user.dormitory === 'true';
    dormitorySelect.value = isDorm ? 'true' : 'false';

    // 部屋番号 (数値なので String 変換)
    roomInput.value = (user.room !== null && user.room !== undefined) ? String(user.room) : '';

    // 部屋タイプ (二人部屋/一人部屋)
    const isSingle = user.single === true || user.single === 'true';
    singleSelect.value = isSingle ? 'true' : 'false';

    // LINE名・兼部先
    lineInput.value = user.line || '';
    multiInput.value = user.multi || 'なし';

    msgEdit.textContent = '';

    // 学年・寮生ステータスに応じた入力欄表示制御を起動
    toggleGradeInput();
    toggleDormInput();

    // モーダルを開く
    editModal.classList.add('active');
  };

  closeEditModalBtn.addEventListener('click', () => {
    editModal.classList.remove('active');
  });

  // ★ 提示いただいた saveMemberEdit のロジックを踏襲した保存処理
  async function saveAdminUserEdit() {
    const isDorm = dormitorySelect.value === 'true';
    const selectedGrade = gradeSelect.value;
    const memberClass = (selectedGrade === '1' || selectedGrade === '2') ? classInput.value.trim() : '';

    const payload = {
      username: targetUsernameInput.value,
      grade: parseInt(selectedGrade, 10),
      member_class: memberClass,
      course: courseSelect.value,
      number: numberInput.value.trim(),
      gender: genderSelect.value,
      dormitory: isDorm,
      room: isDorm && roomInput.value ? parseInt(roomInput.value, 10) : null,
      single: isDorm ? (singleSelect.value === 'true') : false,
      line: lineInput.value.trim(),
      multi: multiInput.value.trim()
    };

    msgEdit.textContent = '';
    msgEdit.style.color = 'red';

    // 保存開始時：ボタンを「保存中…」に変更し、クリック操作をロックする
    saveBtn.disabled = true;
    saveBtn.textContent = '保存中…';
    closeEditModalBtn.style.pointerEvents = 'none';

    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/users/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        msgEdit.style.color = 'green';
        msgEdit.textContent = '登録情報を更新しました！';

        setTimeout(() => {
          editModal.classList.remove('active');
          resetButtons();
          fetchUsers(); // 最新一覧の再取得
        }, 1000);
      } else {
        msgEdit.textContent = data.message || '更新に失敗しました';
        resetButtons();
      }
    } catch (err) {
      console.error(err);
      msgEdit.textContent = '通信エラーが発生しました';
      resetButtons();
    }
  }

  // ボタンの状態を元に戻す共通処理
  function resetButtons() {
    saveBtn.disabled = false;
    saveBtn.textContent = '変更内容を保存';
    closeEditModalBtn.style.pointerEvents = 'auto';
  }

  // ----------------------------------------------------
  // 削除機能のロジック
  // ----------------------------------------------------
  confirmCheck.addEventListener('change', () => {
    deleteAccountBtn.disabled = !confirmCheck.checked;
  });

  window.openDeleteModal = (username) => {
    const user = allUsers.find(u => u.username === username);
    if (!user) return;

    currentTargetUser = user;
    deleteDisplayUsername.textContent = user.username;
    confirmCheck.checked = false;
    deleteAccountBtn.disabled = true;
    msgDelete.textContent = '';

    deleteModal.classList.add('active');
  };

  closeDeleteModalBtn.addEventListener('click', () => {
    deleteModal.classList.remove('active');
  });

  deleteAccountBtn.addEventListener('click', async () => {
    if (!currentTargetUser) return;

    msgDelete.textContent = '';
    deleteAccountBtn.disabled = true;
    deleteAccountBtn.textContent = '削除処理中…';
    closeDeleteModalBtn.style.pointerEvents = 'none';

    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/users/${encodeURIComponent(currentTargetUser.username)}`, {
        method: 'DELETE'
      });
      const data = await res.json();

      if (data.success) {
        alert(data.message);
        deleteModal.classList.remove('active');
        resetDeleteButtons();
        fetchUsers();
      } else {
        msgDelete.textContent = data.message || '削除に失敗しました';
        resetDeleteButtons();
      }
    } catch (err) {
      console.error(err);
      msgDelete.textContent = '通信エラーが発生しました';
      resetDeleteButtons();
    }
  });

  function resetDeleteButtons() {
    deleteAccountBtn.disabled = !confirmCheck.checked;
    deleteAccountBtn.textContent = 'アカウントを削除して退部させる';
    closeDeleteModalBtn.style.pointerEvents = 'auto';
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  searchInput.addEventListener('input', renderUsers);
  gradeFilter.addEventListener('change', renderUsers);

  // 初期読み込み実行
  fetchUsers();
});