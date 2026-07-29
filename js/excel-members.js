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
      statusMsg.textContent = 'データを取得中...';

      // バックエンドから部員全件データを取得
      const res = await fetch(`${BACKEND_URL}/api/get-members`);
      const data = await res.json();

      if (!data.success || !data.members) {
        throw new Error(data.message || '部員データの取得に失敗しました');
      }

      statusMsg.textContent = 'Excelファイルを生成中...';

      const members = data.members;

      // 1. 学年ごとにデータをグループ化
      const membersByGrade = {};
      
      members.forEach(m => {
        // 学年が未設定の場合は 'その他' シートへ
        const gradeKey = m.grade ? `${m.grade}年` : 'その他';
        if (!membersByGrade[gradeKey]) {
          membersByGrade[gradeKey] = [];
        }
        membersByGrade[gradeKey].push(m);
      });

      // 学年順（1年, 2年, 3年...）に並び替えるためのシート名ソート
      const sortedGrades = Object.keys(membersByGrade).sort((a, b) => {
        const numA = parseInt(a) || 99;
        const numB = parseInt(b) || 99;
        return numA - numB;
      });

      // 2. ワークブック（Excelファイル本体）の作成
      const workbook = XLSX.utils.book_new();

      // Excelのヘッダー行（指定の14項目）
      const headers = [
        "名前", "学年", "クラス", "学科", "学籍番号", 
        "女子学生", "通学方法", "部屋番号", "個室", 
        "LINE", "兼部先", "所属バンド", "担当楽器", "最終変更日"
      ];

      // 3. 学年ごとにシートを作成してワークブックに追加
      sortedGrades.forEach(gradeName => {
        const gradeMembers = membersByGrade[gradeName];

        // 各行のデータを指定されたフォーマットに変換
        const sheetData = gradeMembers.map(m => {
          // --- データ変換ロジック ---

          // 女子学生: 女性なら〇、男性なら×
          const isFemale = (m.gender === '女性') ? '〇' : '×';

          // 通学方法: TRUE(true)なら寮生、FALSE(false)なら通生
          const isDorm = (m.dormitory === true || m.dormitory === 'true') ? '寮生' : '通生';

          // 個室: TRUE(true)なら〇、FALSE(false)なら×
          const isSingle = (m.single === true || m.single === 'true') ? '〇' : '×';

          // 所属バンド: 配列の場合はカンマ区切り文字列に変換
          let bandsStr = 'なし';
          if (Array.isArray(m.bands)) {
            bandsStr = m.bands.join(', ') || 'なし';
          } else if (m.bands || m.band) {
            bandsStr = m.bands || m.band;
          }

          // 担当楽器: 配列の場合はカンマ区切り文字列に変換
          let instStr = m.instrument || '未設定';
          if (Array.isArray(m.instrument)) {
            instStr = m.instrument.join(', ');
          }

          // 最終変更日（更新日時）
          const updatedAt = m.updated_at || m.updatedAt || m.created_at || '-';

          return [
            m.username || '',
            m.grade || '',
            m.class || '',
            m.course || '',
            m.number || '',
            isFemale,
            isDorm,
            m.room || '',
            isSingle,
            m.line || '',
            m.multi || 'なし',
            bandsStr,
            instStr,
            updatedAt
          ];
        });

        // ヘッダー行を先頭に追加
        sheetData.unshift(headers);

        // 2次元配列からワークシートを生成
        const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

        // ワークシートをブックに追加（シート名: 例「1年」「2年」）
        XLSX.utils.book_append_sheet(workbook, worksheet, gradeName);
      });

      // 4. Excelファイルの書き出しとダウンロード実行
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const fileName = `部員名簿_${today}.xlsx`;

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