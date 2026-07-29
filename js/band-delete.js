document.addEventListener('DOMContentLoaded', async () => {
  // 1. ログインユーザー情報の取得・ガード
  const currentUserJson = sessionStorage.getItem('user');
  if (!currentUserJson) {
    alert('ログインしてください');
    window.location.href = 'index.html';
    return;
  }
  const currentUser = JSON.parse(currentUserJson);
  // セッションの保持形式に合わせて username や name を取得
  const currentUsername = currentUser.username || currentUser.name || currentUser;

  const selectBand = document.getElementById('select-band-to-delete');
  const confirmArea = document.getElementById('delete-confirm-area');
  const previewName = document.getElementById('preview-band-name');
  const previewMembers = document.getElementById('preview-members-text');
  const deleteBtn = document.getElementById('delete-btn');
  const msgDiv = document.getElementById('msg-delete');

  let allBands = [];

  // バンド一覧の初期読み込み
  async function loadBands() {
    try {
      const res = await fetch(`${BACKEND_URL}/api/get-bands`);
      const data = await res.json();

      if (data.success) {
        allBands = data.bands;

        // ★ 自分がメンバーに含まれているバンドのみ抽出 ★
        const myBands = allBands.filter(b => {
          if (!b.members || !Array.isArray(b.members)) return false;
          return b.members.some(m => (m.username || m.name || m.member_name) === currentUsername);
        });

        let options = '<option value="">-- バンドを選択してください --</option>';

        if (myBands.length === 0) {
          options = '<option value="">削除できる所属バンドがありません</option>';
        } else {
          myBands.forEach(b => {
            options += `<option value="${b.id}">${b.band_name}</option>`;
          });
        }

        selectBand.innerHTML = options;
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error('通信エラー:', err);
    }
  }

  await loadBands();

  // バンド選択時のプレビュー表示
  selectBand.addEventListener('change', () => {
    const bandId = parseInt(selectBand.value, 10);
    if (!bandId) {
      confirmArea.style.display = 'none';
      return;
    }

    const selectedBand = allBands.find(b => b.id === bandId);
    if (selectedBand) {
      previewName.textContent = `🎸 ${selectedBand.band_name}`;

      if (selectedBand.members && selectedBand.members.length > 0) {
        const memberNames = selectedBand.members.map(m => {
          const name = m.username || m.name || '';
          const part = (m.part || m.instrument || '').trim();
          return `${name}${part ? ` (${part})` : ''}`;
        }).join(', ');
        previewMembers.textContent = `メンバー: ${memberNames}`;
      } else {
        previewMembers.textContent = 'メンバー: (未登録)';
      }

      confirmArea.style.display = 'block';
    }
  });

  // 削除ボタン押下時の処理
  deleteBtn.addEventListener('click', async () => {
    const bandId = parseInt(selectBand.value, 10);
    if (!bandId) return;

    const selectedBand = allBands.find(b => b.id === bandId);
    const bandName = selectedBand ? selectedBand.band_name : '';

    if (!confirm(`本当に「${bandName}」を削除してもよろしいですか？`)) {
      return;
    }

    deleteBtn.disabled = true;
    deleteBtn.textContent = '削除処理中…';
    msgDiv.textContent = '';

    try {
      const res = await fetch(`${BACKEND_URL}/api/delete-band`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ band_id: bandId })
      });

      const data = await res.json();

      if (data.success) {
        alert(data.message);
        window.location.href = 'bands.html';
      } else {
        msgDiv.textContent = data.message;
        deleteBtn.disabled = false;
        deleteBtn.textContent = 'このバンドを削除する';
      }
    } catch (err) {
      console.error('通信エラー:', err);
      msgDiv.textContent = '通信エラーが発生しました';
      deleteBtn.disabled = false;
      deleteBtn.textContent = 'このバンドを削除する';
    }
  });
});