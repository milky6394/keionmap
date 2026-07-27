// ★ここをRenderでデプロイしたあなたのAPIのURLに変更してください
const BACKEND_URL = 'https://keionbot.onrender.com';

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const password = document.getElementById('password').value;
    const messageEl = document.getElementById('message');
    messageEl.textContent = '送信中...';

    try {
        const response = await fetch(`${BACKEND_URL}/api/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ password: password })
        });

        const data = await response.json();

        if (data.success) {
            messageEl.style.color = 'green';
            messageEl.textContent = 'ログイン成功！';
        } else {
            messageEl.style.color = 'red';
            messageEl.textContent = 'パスワードが違います';
        }
    } catch (error) {
        console.error(error);
        messageEl.style.color = 'red';
        messageEl.textContent = '通信エラーが発生しました';
    }
});