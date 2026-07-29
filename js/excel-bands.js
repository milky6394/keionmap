document.addEventListener('DOMContentLoaded', () => {
  // 未ログインチェック
  if (!sessionStorage.getItem('user')) {
    alert('ログインしてください');
    window.location.href = 'index.html';
    return;
  }

  const downloadBtn = document.getElementById('download-btn');
  const statusMsg = document.getElementById('status-message');

  downloadBtn.addEventListener('click', generateExcel);

  async function generateExcel() {
    try {
      downloadBtn.disabled = true;
      statusMsg.textContent = 'バンドデータを取得中...';

      // バックエンドからバンド全件データを取得
      const res = await fetch(`${BACKEND_URL}/api/get-bands`);
      const data = await res.json();

      if (!data.success || !data.bands || data.bands.length === 0) {
        throw new Error(data.message || '登録されているバンドデータが見つかりませんでした');
      }

      statusMsg.textContent = 'Excelファイルを生成中...';

      const bands = data.bands;

      // 1. ワークブック（Excelファイル本体）の作成
      const workbook = XLSX.utils.book_new();

      // Excelのヘッダー行
      const headers = ["名前", "担当楽器"];

      // 既存シート名との重複防止用カウントマップ
      const usedSheetNames = {};

      // 2. バンドごとにシートを作成して追加
      bands.forEach((band, index) => {
        // バンド名からExcelのシート名で禁止されている記号を除去 & 31文字制限に対応
        let rawName = (band.name || band.band_name || `バンド${index + 1}`).trim();
        let safeName = rawName.replace(/[\\/*?:\[\]]/g, ''); // 禁止記号の削除
        if (!safeName) safeName = `バンド${index + 1}`;
        safeName = safeName.substring(0, 28); // 重複用数字を考慮し最大28文字

        // シート名が重複した場合の対策 (例: "バンド名", "バンド名_2")
        if (usedSheetNames[safeName]) {
          usedSheetNames[safeName]++;
          safeName = `${safeName}_${usedSheetNames[safeName]}`;
        } else {
          usedSheetNames[safeName] = 1;
        }

        // メンバー一覧データの整形
        // メンバーがオブジェクト配列（[{name: '山田', instrument: 'Gt'}, ...]）か
        // または配列 structure の場合に対応
        const members = band.members || [];
        
        const sheetData = members.map(m => {
          // メンバーのデータ形式に応じたフォールバック処理
          const name = m.name || m.username || m.member_name || '';
          
          // 担当楽器（配列の場合はカンマ区切りに変換）
          let inst = m.instrument || m.part || '';
          if (Array.isArray(inst)) {
            inst = inst.join(', ');
          }

          return [name, inst];
        });

        // ヘッダー行を先頭に追加
        sheetData.unshift(headers);

        // 2次元配列からワークシートを生成
        const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

        // ワークシートをブックに追加（シート名: バンド名）
        XLSX.utils.book_append_sheet(workbook, worksheet, safeName);
      });

      // 3. Excelファイルの書き出しとダウンロード実行
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const fileName = `バンド登録一覧_${today}.xlsx`;

      XLSX.writeFile(workbook, fileName);

      statusMsg.textContent = 'ダウンロードが完了しました！';
      downloadBtn.disabled = false;

    } catch (err) {
      console.error(err);
      statusMsg.textContent = `エラーが発生しました: ${err.message}`;
      downloadBtn.disabled = false;
    }
  }
});