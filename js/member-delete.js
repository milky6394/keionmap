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
  const confirmCheck = document.getElementById('delete-confirm-check');
  const deleteBtn = document.getElementById('delete-account-btn');
  const backBtn = document.getElementById('back-btn');
  const msgDelete = document.getElementById('msg-delete');

  // 初期表示セット
  displayUsername.textContent = user.username;

  // チェックボックスのON/OFFでボタンの有効化を切替
  confirmCheck.addEventListener('change', () => {
    deleteBtn.disabled = !confirmCheck.checked;
  });

  // 削除ボタンクリックイベント
  deleteBtn.addEventListener('click', deleteAccount);

  async function deleteAccount() {
    if (!confirm('本当にアカウントを削除（退部）しますか？')) {
      return;
    }

    msgDelete.textContent = '';
    
    // 削除処理開始：ボタンを「削除処理中…」に変更し、操作をロック
    deleteBtn.disabled = true;
    deleteBtn.textContent = '削除処理中…';

    if (backBtn) {
      backBtn.style.pointerEvents = 'none';
      backBtn.style.opacity = '0.6';
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/delete-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: user.username
        })
      });

      const data = await res.json();

      if (data.success) {
        alert(data.message);
        // セッションを削除してログイン画面へ
        sessionStorage.clear();
        window.location.href = 'index.html';
      } else {
        msgDelete.textContent = data.message;
        resetButtons(); // エラー時はボタンを元に戻す
      }
    } catch (err) {
      msgDelete.textContent = '通信エラーが発生しました';
      resetButtons(); // 通信エラー時もボタンを元に戻す
    }
  }

  // ボタン状態の復元処理
  function resetButtons() {
    deleteBtn.disabled = !confirmCheck.checked;
    deleteBtn.textContent = 'アカウントを削除して退部する';

    if (backBtn) {
      backBtn.style.pointerEvents = 'auto';
      backBtn.style.opacity = '1';
    }
  }
});