document.addEventListener('DOMContentLoaded', () => {
  // セッションストレージからログイン情報を取得
  const userDataStr = sessionStorage.getItem('user');

  // ログインしていない場合はログイン画面に戻す（ガード機能）
  if (!userDataStr) {
    alert('ログインしてください');
    window.location.href = 'index.html';
    return;
  }

  const user = JSON.parse(userDataStr);

  // 画面要素の設定
  document.getElementById('welcome-title').textContent = `${user.username} さんのマイページ`;

  const userInfoBox = document.getElementById('user-info-box');
  userInfoBox.innerHTML = `
    <div class="info-grid">
      <div><b>学年:</b> ${user.grade}年</div>
      <div><b>クラス:</b> ${user.class || '-'}</div>
      <div><b>学科:</b> ${user.course || '-'}</div>
      <div><b>学籍番号:</b> ${user.number || '-'}</div>
      <div><b>性別:</b> ${user.gender || '-'}</div>
      <div><b>住居:</b> ${user.dormitory ? `寮生 (${user.room || ''}号室)` : '自宅生'}</div>
      <div><b>LINE:</b> ${user.line || '-'}</div>
      <div><b>兼部先:</b> ${user.multi || 'なし'}</div>
    </div>
  `;

  // ログアウト処理
  document.getElementById('logout-btn').addEventListener('click', () => {
    sessionStorage.removeItem('user');
    window.location.href = 'index.html';
  });
});