// 🔑 管理者の合言葉（必要に応じて変更してください）
const ADMIN_PASSCODE = "koara"; 
const ADMIN_AUTH_SESSION_KEY = "adminAuthenticated";

document.addEventListener("DOMContentLoaded", () => {
  if (sessionStorage.getItem(ADMIN_AUTH_SESSION_KEY) === "true") {
    showAdminContent();
    return;
  }

  document.getElementById("auth-modal").classList.remove("is-hidden");
  document.getElementById("admin-content").classList.remove("is-visible");
});

// 合言葉の検証処理
function verifyPasscode(event) {
  event.preventDefault();
  
  const inputPass = document.getElementById("passcode-input").value;
  const errorMsg = document.getElementById("auth-error");

  if (inputPass === ADMIN_PASSCODE) {
    sessionStorage.setItem(ADMIN_AUTH_SESSION_KEY, "true");
    showAdminContent();
  } else {
    // 認証失敗
    errorMsg.classList.add("is-visible");
    document.getElementById("passcode-input").value = "";
  }
}

// 管理者コンテンツを表示
function showAdminContent() {
  document.getElementById("auth-modal").classList.add("is-hidden");
  document.getElementById("admin-content").classList.add("is-visible");
}