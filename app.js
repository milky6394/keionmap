// ★ここをRenderでデプロイしたあなたのAPIのURLに変更してください
const BACKEND_URL = "https://keionbot.onrender.com";

// ステップ要素
const stepPassword = document.getElementById('step-password');
const stepName = document.getElementById('step-name');
const stepRegister = document.getElementById('step-register');
const stepComplete = document.getElementById('step-complete');

// 入力要素
const passwordInput = document.getElementById('password-input');
const usernameInput = document.getElementById('username-input');

const gradeSelect = document.getElementById('grade-select');
const classGroup = document.getElementById('class-group');
const classInput = document.getElementById('class-input');
const courseSelect = document.getElementById('course-select');
const numberInput = document.getElementById('number-input');
const genderSelect = document.getElementById('gender-select');
const dormitorySelect = document.getElementById('dormitory-select');
const roomInput = document.getElementById('room-input');
const singleSelect = document.getElementById('single-select');
const lineInput = document.getElementById('line-input');
const multiInput = document.getElementById('multi-input');

const dormOptions = document.getElementById('dorm-options');

// ボタン要素
const verifyPasswordBtn = document.getElementById('verify-password-btn');
const checkMemberBtn = document.getElementById('check-member-btn');
const registerBtn = document.getElementById('register-btn');

// メッセージ表示要素
const msgPassword = document.getElementById('msg-password');
const msgName = document.getElementById('msg-name');
const msgRegister = document.getElementById('msg-register');
const displayNewName = document.getElementById('display-new-name');
const welcomeTitle = document.getElementById('welcome-title');
const welcomeMsg = document.getElementById('welcome-msg');
const userInfoBox = document.getElementById('user-info-box');

// イベント設定
verifyPasswordBtn.addEventListener('click', verifyPassword);
checkMemberBtn.addEventListener('click', checkMember);
registerBtn.addEventListener('click', registerMember);

// 学年変更時に「クラス」欄の表示/非表示切替 (1年・2年のみ表示)
gradeSelect.addEventListener('change', () => {
  const selectedGrade = gradeSelect.value;
  if (selectedGrade === '1' || selectedGrade === '2') {
    classGroup.classList.remove('hidden');
  } else {
    classGroup.classList.add('hidden');
    classInput.value = ''; // 3年以上を選択した場合は入力内容をクリア
  }
});

// 寮生選択時に部屋入力欄を表示/非表示切り替え
dormitorySelect.addEventListener('change', () => {
  if (dormitorySelect.value === 'true') {
    dormOptions.classList.remove('hidden');
  } else {
    dormOptions.classList.add('hidden');
  }
});

// 1. 共通パスワード認証
async function verifyPassword() {
  const password = passwordInput.value;
  msgPassword.textContent = '';

  try {
    const res = await fetch(`${BACKEND_URL}/api/verify-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: password })
    });
    const data = await res.json();

    if (data.success) {
      stepPassword.classList.add('hidden');
      stepName.classList.remove('hidden');
    } else {
      msgPassword.textContent = data.message;
    }
  } catch (err) {
    msgPassword.textContent = '通信エラーが発生しました';
  }
}

// 2. 名前チェック & 画面分岐
async function checkMember() {
  const username = usernameInput.value.trim();
  msgName.textContent = '';

  if (!username) {
    msgName.textContent = '名前を入力してください';
    return;
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/check-member`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username })
    });
    const data = await res.json();

    if (data.success) {
      if (data.is_new_user) {
        displayNewName.textContent = username;
        stepName.classList.add('hidden');
        stepRegister.classList.remove('hidden');
      } else {
        stepName.classList.add('hidden');
        stepComplete.classList.remove('hidden');
        welcomeTitle.textContent = 'おかえりなさい！';
        welcomeMsg.textContent = data.message;
        
        // 既存データの表示
        const u = data.user_data;
        if (u) {
          userInfoBox.innerHTML = `
            <hr>
            <div class="info-grid">
              <div><b>学年:</b> ${u.grade}年</div>
              <div><b>クラス:</b> ${u.class || '-'}</div>
              <div><b>学科:</b> ${u.course || '-'}</div>
              <div><b>番号:</b> ${u.number || '-'}</div>
              <div><b>性別:</b> ${u.gender || '-'}</div>
              <div><b>住居:</b> ${u.dormitory ? `寮生 (${u.room || ''}号室)` : '自宅生'}</div>
              <div><b>LINE:</b> ${u.line || '-'}</div>
            </div>
          `;
        }
      }
    } else {
      msgName.textContent = data.message;
    }
  } catch (err) {
    msgName.textContent = '通信エラーが発生しました';
  }
}

// 3. 新規部員登録の実行
async function registerMember() {
  const isDorm = dormitorySelect.value === 'true';
  const selectedGrade = gradeSelect.value;
  
  // 1年・2年のみクラスの値を取得し、それ以外は空文字にする
  const memberClass = (selectedGrade === '1' || selectedGrade === '2') ? classInput.value.trim() : '';

  const payload = {
    username: usernameInput.value.trim(),
    grade: parseInt(selectedGrade, 10),
    member_class: memberClass,
    course: courseSelect.value, // M, E, S, C が送信される
    number: numberInput.value.trim(),
    gender: genderSelect.value,
    dormitory: isDorm,
    room: isDorm && roomInput.value ? parseInt(roomInput.value, 10) : null,
    single: isDorm ? (singleSelect.value === 'true') : false,
    line: lineInput.value.trim(),
    multi: multiInput.value.trim()
  };

  msgRegister.textContent = '';

  try {
    const res = await fetch(`${BACKEND_URL}/api/register-member`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (data.success) {
      stepRegister.classList.add('hidden');
      stepComplete.classList.remove('hidden');
      welcomeTitle.textContent = '登録完了！';
      welcomeMsg.textContent = data.message;
      
      userInfoBox.innerHTML = `
        <hr>
        <p>プロフィール情報が正常に更新されました。</p>
      `;
    } else {
      msgRegister.textContent = data.message;
    }
  } catch (err) {
    msgRegister.textContent = '登録処理中にエラーが発生しました';
  }
}