// ★ここをRenderでデプロイしたあなたのAPIのURLに変更してください
const BACKEND_URL = "https://keionbot.onrender.com";

// DOM要素の取得
const stepPassword = document.getElementById('step-password');
const stepName = document.getElementById('step-name');
const stepComplete = document.getElementById('step-complete');

const passwordInput = document.getElementById('password-input');
const usernameInput = document.getElementById('username-input');

const verifyPasswordBtn = document.getElementById('verify-password-btn');
const checkMemberBtn = document.getElementById('check-member-btn');

const msgPassword = document.getElementById('msg-password');
const msgName = document.getElementById('msg-name');
const welcomeTitle = document.getElementById('welcome-title');
const welcomeMsg = document.getElementById('welcome-msg');

// イベントリスナーの設定
verifyPasswordBtn.addEventListener('click', verifyPassword);
checkMemberBtn.addEventListener('click', checkMember);

// Enterキーでも送信できるように設定
passwordInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') verifyPassword();
});
usernameInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') checkMember();
});

// 1. パスワード認証（STEP 1）
async function verifyPassword() {
  const password = passwordInput.value;
  msgPassword.textContent = '';

  if (!password) {
    msgPassword.textContent = 'パスワードを入力してください';
    return;
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/verify-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: password })
    });
    const data = await res.json();

    if (data.success) {
      // パスワード成功 ➔ 名前入力画面へ切り替え
      stepPassword.classList.add('hidden');
      stepName.classList.remove('hidden');
    } else {
      msgPassword.textContent = data.message;
    }
  } catch (err) {
    msgPassword.textContent = '通信エラーが発生しました';
  }
}

// 2. 名前チェック ＆ ログイン/登録（STEP 2）
async function checkMember() {
  const username = usernameInput.value.trim();
  msgName.textContent = '';

  if (!username) {
    msgName.textContent = '名前を入力してください';
    msgName.className = 'message error';
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
      // 成功 ➔ 完了画面へ切り替え
      stepName.classList.add('hidden');
      stepComplete.classList.remove('hidden');

      welcomeTitle.textContent = data.is_new_user ? '登録完了！' : 'おかえりなさい！';
      welcomeMsg.textContent = data.message;
    } else {
      msgName.textContent = data.message;
      msgName.className = 'message error';
    }
  } catch (err) {
    msgName.textContent = '通信エラーが発生しました';
    msgName.className = 'message error';
  }
}