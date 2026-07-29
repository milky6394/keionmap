// 🔑 管理者の合言葉（必要に応じて変更してください）
const ADMIN_PASSCODE = "koara"; 

document.addEventListener("DOMContentLoaded", () => {
  // ページ読み込み時は常にモーダルを表示し、管理者コンテンツを非表示にする
  document.getElementById("auth-modal").style.display = "flex";
  document.getElementById("admin-content").style.display = "none";
});

// 合言葉の検証処理
function verifyPasscode(event) {
  event.preventDefault();
  
  const inputPass = document.getElementById("passcode-input").value;
  const errorMsg = document.getElementById("auth-error");

  if (inputPass === ADMIN_PASSCODE) {
    // 認証成功：コンテンツを表示してモーダルを閉じる（保存はしない）
    showAdminContent();
  } else {
    // 認証失敗
    errorMsg.style.display = "block";
    document.getElementById("passcode-input").value = "";
  }
}

// 管理者コンテンツを表示
function showAdminContent() {
  document.getElementById("auth-modal").style.display = "none";
  document.getElementById("admin-content").style.display = "block";
}