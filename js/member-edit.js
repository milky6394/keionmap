document.addEventListener('DOMContentLoaded', () => {
  const userDataStr = sessionStorage.getItem('user');

  if (!userDataStr) {
    alert('ログインしてください');
    window.location.href = 'index.html';
    return;
  }

  const user = JSON.parse(userDataStr);

  // 要素取得
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

  // ★「部員名簿メニューへ戻る」ボタンも取得
  const backBtn = document.querySelector('a[href="members.html"]');

  // 初期値のセット
  displayUsername.textContent = user.username;
  gradeSelect.value = user.grade || 1;
  classInput.value = user.class || '';
  courseSelect.value = user.course || 'M';
  numberInput.value = user.number || '';
  genderSelect.value = user.gender || '男性';
  dormitorySelect.value = user.dormitory ? 'true' : 'false';
  roomInput.value = user.room || '';
  singleSelect.value = user.single ? 'true' : 'false';
  lineInput.value = user.line || '';
  multiInput.value = user.multi || 'なし';

  // 初期表示の制御関数の実行
  toggleGradeInput();
  toggleDormInput();

  // イベントリスナー設定
  gradeSelect.addEventListener('change', toggleGradeInput);
  dormitorySelect.addEventListener('change', toggleDormInput);
  saveBtn.addEventListener('click', saveMemberEdit);

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

  async function saveMemberEdit() {
    const isDorm = dormitorySelect.value === 'true';
    const selectedGrade = gradeSelect.value;
    const memberClass = (selectedGrade === '1' || selectedGrade === '2') ? classInput.value.trim() : '';

    const payload = {
      username: user.username,
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

    // ★ 1. 保存開始時：ボタンを「保存中…」に変更し、クリック操作をロックする
    saveBtn.disabled = true;
    saveBtn.textContent = '保存中…';

    if (backBtn) {
      backBtn.style.pointerEvents = 'none'; // 戻るリンクをクリック不可に
      backBtn.style.opacity = '0.6';       // 見た目も無効化っぽく薄くする
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/update-member`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        // セッションのユーザーデータを最新化
        sessionStorage.setItem('user', JSON.stringify(data.user_data));
        
        msgEdit.style.color = 'green';
        msgEdit.textContent = '登録情報を更新しました！';
        
        // 成功時はそのまま画面遷移
        setTimeout(() => {
          window.location.href = 'members.html';
        }, 1000);
      } else {
        msgEdit.textContent = data.message;
        resetButtons(); // エラー時はボタンを元に戻す
      }
    } catch (err) {
      msgEdit.textContent = '通信エラーが発生しました';
      resetButtons(); // 通信エラー時もボタンを元に戻す
    }
  }

  // ★ ボタンの状態を元に戻す共通処理
  function resetButtons() {
    saveBtn.disabled = false;
    saveBtn.textContent = '変更内容を保存';

    if (backBtn) {
      backBtn.style.pointerEvents = 'auto';
      backBtn.style.opacity = '1';
    }
  }
});