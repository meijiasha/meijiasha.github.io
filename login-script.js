// login-script.js

// DOM 元素引用
const loginForm = document.getElementById('loginForm');
const loginEmailInput = document.getElementById('loginEmail');
const loginPasswordInput = document.getElementById('loginPassword');
const loginErrorDiv = document.getElementById('loginError');
const loginButton = loginForm.querySelector('button[type="submit"]'); // 獲取登入按鈕

// 檢查 Firebase auth 是否已在 HTML 中成功初始化
if (typeof auth === 'undefined' || !auth) {
    console.error("login-script.js: Firebase 'auth' instance is not available from HTML.");
    if (loginErrorDiv) loginErrorDiv.textContent = "Firebase 初始化失敗，無法登入。";
    if (loginErrorDiv) loginErrorDiv.style.display = 'block';
    if (loginButton) loginButton.disabled = true; // 禁用登入按鈕
    // throw new Error("Firebase Auth not initialized in HTML.");
} else {
    console.log("login-script.js: 'auth' instance is available.");

    // 檢查使用者是否已經登入，如果是，直接導向到後台
    auth.onAuthStateChanged(user => {
        if (user) {
            console.log("使用者已登入，導向到 admin.html");
            window.location.href = 'admin.html'; // 假設後台管理頁面是 admin.html
        }
    });
}

// 監聽表單提交事件
loginForm.addEventListener('submit', async (event) => {
    event.preventDefault(); // 防止表單的預設提交行為

    if (!auth) {
        console.error("無法執行登入，Firebase Auth 未初始化。");
        loginErrorDiv.textContent = '登入服務暫不可用，請稍後再試。';
        loginErrorDiv.style.display = 'block';
        return;
    }

    const email = loginEmailInput.value;
    const password = loginPasswordInput.value;

    loginErrorDiv.style.display = 'none'; // 隱藏之前的錯誤訊息
    loginErrorDiv.textContent = '';
    loginButton.disabled = true; // 禁用按鈕，防止重複提交
    loginButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 登入中...';


    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        // 登入成功
        console.log("登入成功:", userCredential.user);
        loginButton.disabled = false;
        loginButton.textContent = '登入';
        // 登入成功後，onAuthStateChanged 會自動處理跳轉到 admin.html
        // 或者你可以在這裡直接跳轉：
        // window.location.href = 'admin.html';
    } catch (error) {
        console.error("登入失敗:", error);
        loginButton.disabled = false;
        loginButton.textContent = '登入';

        // 顯示更友好的錯誤訊息
        let errorMessage = "登入失敗，請檢查您的帳號或密碼。";
        if (error.code === 'auth/user-not-found') {
            errorMessage = "找不到此用戶，請確認電子郵件是否正確。";
        } else if (error.code === 'auth/wrong-password') {
            errorMessage = "密碼錯誤，請重試。";
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = "電子郵件格式無效。";
        } else if (error.code === 'auth/too-many-requests') {
            errorMessage = "嘗試次數過多，請稍後再試。";
        }
        // 可以根據需要添加更多錯誤代碼的處理

        loginErrorDiv.textContent = errorMessage;
        loginErrorDiv.style.display = 'block';
    }
});