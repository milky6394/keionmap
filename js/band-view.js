document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('band-list-container');
  const searchInput = document.getElementById('search-input');

  let allBandsData = [];

  // データの取得
  try {
    const res = await fetch(`${BACKEND_URL}/api/get-bands`);
    const data = await res.json();

    if (data.success) {
      allBandsData = data.bands;
      renderBands(allBandsData);
    } else {
      container.innerHTML = `<p style="color: red; text-align: center;">${data.message}</p>`;
    }
  } catch (err) {
    console.error('通信エラー:', err);
    container.innerHTML = '<p style="color: red; text-align: center;">データの読み込みに失敗しました。</p>';
  }

  // リアルタイム検索フィルター
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();

    if (!query) {
      renderBands(allBandsData);
      return;
    }

    const filtered = allBandsData.filter(band => {
      // バンド名で検索
      const matchBandName = band.band_name.toLowerCase().includes(query);

      // メンバー名・パート名で検索
      const matchMember = band.members.some(m => 
        m.username.toLowerCase().includes(query) || 
        m.part.toLowerCase().includes(query)
      );

      return matchBandName || matchMember;
    });

    renderBands(filtered);
  });

  // バンドカード描画関数
  function renderBands(bands) {
    container.innerHTML = '';

    if (bands.length === 0) {
      container.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 20px;">該当するバンドが見つかりません。</p>';
      return;
    }

    bands.forEach(band => {
      const card = document.createElement('div');
      card.className = 'band-card';

      // ヘッダー部分（バンド名）
      const header = document.createElement('div');
      header.className = 'band-card-header';
      header.innerHTML = `<h3 class="band-title">🎸 ${escapeHtml(band.band_name)}</h3>`;

      // メンバータグリスト
      const tagList = document.createElement('div');
      tagList.className = 'member-tag-list';

      if (band.members && band.members.length > 0) {
        band.members.forEach(m => {
          const tag = document.createElement('div');
          tag.className = 'member-tag';
          // part（例: "Gt Vo "）をバッジ化、部員名を表示
          tag.innerHTML = `<span class="part-badge">${escapeHtml(m.part.trim())}</span>${escapeHtml(m.username)}`;
          tagList.appendChild(tag);
        });
      } else {
        tagList.innerHTML = '<span style="color: #9ca3af; font-size: 0.85rem;">メンバー未登録</span>';
      }

      card.appendChild(header);
      card.appendChild(tagList);
      container.appendChild(card);
    });
  }

  // XSS対策用エスケープ関数
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});