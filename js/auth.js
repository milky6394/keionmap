// 要素取得
const stepPassword = document.getElementById('step-password');
const stepName = document.getElementById('step-name');
const stepRegister = document.getElementById('step-register');

const passwordInput = document.getElementById('password-input');
const usernameInput = document.getElementById('username-input');

const gradeSelect = document.getElementById('grade-select');
const classGroup = document.getElementById('class-group');
const classSelect = document.getElementById('class-select');
const courseSelect = document.getElementById('course-select');
const numberInput = document.getElementById('number-input');
const genderSelect = document.getElementById('gender-select');
const dormitorySelect = document.getElementById('dormitory-select');
const roomInput = document.getElementById('room-input');
const singleSelect = document.getElementById('single-select');
const lineInput = document.getElementById('line-input');
const multiInput = document.getElementById('multi-input');

const dormOptions = document.getElementById('dorm-options');

const verifyPasswordBtn = document.getElementById('verify-password-btn');
const checkMemberBtn = document.getElementById('check-member-btn');
const registerBtn = document.getElementById('register-btn');

const msgPassword = document.getElementById('msg-password');
const msgName = document.getElementById('msg-name');
const msgRegister = document.getElementById('msg-register');
const displayNewName = document.getElementById('display-new-name');

// イベント
verifyPasswordBtn.addEventListener('click', verifyPassword);
checkMemberBtn.addEventListener('click', checkMember);
registerBtn.addEventListener('click', registerMember);

gradeSelect.addEventListener('change', () => {
  const selectedGrade = gradeSelect.value;
  if (selectedGrade === '1' || selectedGrade === '2') {
    classGroup.classList.remove('hidden');
  } else {
    classGroup.classList.add('hidden');
    classInput.value = '';
  }
});

dormitorySelect.addEventListener('change', () => {
  if (dormitorySelect.value === 'true') {
    dormOptions.classList.remove('hidden');
  } else {
    dormOptions.classList.add('hidden');
  }
});

// 1. パスワード認証
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

// 2. 名前チェック ＆ ダッシュボード遷移
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
        // ★既存ユーザー：セッションに保存してトップ画面(dashboard.html)へ遷移
        sessionStorage.setItem('user', JSON.stringify(data.user_data));
        window.location.href = 'dashboard.html';
      }
    } else {
      msgName.textContent = data.message;
    }
  } catch (err) {
    msgName.textContent = '通信エラーが発生しました';
  }
}

// 3. 新規登録 ＆ ダッシュボード遷移
async function registerMember() {
  const isDorm = dormitorySelect.value === 'true';
  const selectedGrade = gradeSelect.value;
  const memberClass = (selectedGrade === '1' || selectedGrade === '2') ? classSelect.value.trim() : '';

  const payload = {
    username: usernameInput.value.trim(),
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

  msgRegister.textContent = '';

  try {
    const res = await fetch(`${BACKEND_URL}/api/register-member`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (data.success) {
      // ★登録成功時：登録したデータを保存してトップ画面へ
      sessionStorage.setItem('user', JSON.stringify(data.user_data));
      window.location.href = 'dashboard.html';
    } else {
      msgRegister.textContent = data.message;
    }
  } catch (err) {
    msgRegister.textContent = '登録処理中にエラーが発生しました';
  }
}