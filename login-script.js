// login-script.js
console.log("login-script.js: Script loaded.");

// DOM 元素引用 (在 DOMContentLoaded 中獲取)
let loginForm, loginEmailInput, loginPasswordInput, loginErrorDiv, loginButton;

// Firebase 實例 (假設已在 HTML 中定義並賦值給全域 var auth)

document.addEventListener('DOMContentLoaded', () => {
    console.log("login-script.js: DOMContentLoaded event fired.");

    loginForm = document.getElementById('loginForm');
    loginEmailInput = document.getElementById('loginEmail');
    loginPasswordInput = document.getElementById('loginPassword');
    loginErrorDiv = document.getElementById('loginError');
    loginButton = loginForm ? loginForm.querySelector('button[type="submit"]') : null;

    console.log("login-script.js: DOM elements obtained.");
    console.log("  loginForm exists:", !!loginForm);

    // 檢查 Firebase auth 是否已在 HTML 中成功初始化
    if (typeof auth === 'undefined' || !auth) {
        console.error("login-script.js (DOMContentLoaded): Firebase 'auth' instance is not available from HTML. Login form will be disabled.");
        if (loginErrorDiv) {
            loginErrorDiv.textContent = "Firebase 初始化失敗，無法登入。";
            loginErrorDiv.style.display = 'block';
        }
        if (loginButton) loginButton.disabled = true;
        return; // 阻止後續 Firebase 相關操作
    }
    console.log("login-script.js (DOMContentLoaded): Firebase 'auth' instance confirmed available.");


    auth.onAuthStateChanged(user => {
        console.log("login-script.js: onAuthStateChanged triggered. User:", user ? user.email : 'No user');
        if (user) {
            // 如果用戶已登入，並且當前頁面確實是 login.html (或其變體)，才考慮跳轉
            // 這有助於防止從 admin.html 被踢回 login.html 後立即又跳回去的循環
            const currentPath = window.location.pathname.toLowerCase();
            if (currentPath.endsWith('login.html') || currentPath.endsWith('login.html/')) {
                console.log("  User is logged in and currently on login.html. Redirecting to admin.html...");
                window.location.href = 'admin.html';
            } else {
                // 理論上，如果 onAuthStateChanged 在非 login.html 頁面被這個 login-script.js 觸發，
                // 說明腳本可能被錯誤地包含在了其他頁面。
                // 但主要目的是防止 login.html -> admin.html -> login.html 的快速循環。
                console.log("  User is logged in, but current page is not login.html. No redirect from login-script's onAuthStateChanged.");
            }
        } else {
            console.log("  User is not logged in (checked in login-script.js onAuthStateChanged). Login form should be active.");
            // 確保在未登入時，如果意外禁用了按鈕，則重新啟用
            if (loginButton && loginButton.disabled) {
                // loginButton.disabled = false; // 只有在非提交過程中才啟用
                // loginButton.innerHTML = '登入';
            }
        }
    });

    if (loginForm) { // 確保 loginForm 存在才綁定事件
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            console.log("Login form submitted.");

            if (!auth) {
                console.error("Login form submit: Firebase 'auth' is not available.");
                if (loginErrorDiv) {
                    loginErrorDiv.textContent = '登入服務暫不可用，請稍後再試。';
                    loginErrorDiv.style.display = 'block';
                }
                return;
            }

            const email = loginEmailInput ? loginEmailInput.value : '';
            const password = loginPasswordInput ? loginPasswordInput.value : '';

            if (loginErrorDiv) {
                loginErrorDiv.style.display = 'none';
                loginErrorDiv.textContent = '';
            }
            if (loginButton) {
                loginButton.disabled = true;
                loginButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 登入中...';
            }

            try {
                console.log(`Attempting to sign in as ${email}...`);
                const userCredential = await auth.signInWithEmailAndPassword(email, password);
                console.log("Sign in successful (signInWithEmailAndPassword):", userCredential.user.email);

                // **登入成功後立即跳轉，而不是等待 onAuthStateChanged**
                // 這樣可以更快地離開 login.html，減少 onAuthStateChanged 再次觸發並跳轉的機會
                if (loginButton) { // 雖然馬上要跳轉，還是恢復一下按鈕狀態以防萬一
                    loginButton.disabled = false;
                    loginButton.textContent = '登入';
                }
                console.log("Redirecting to admin.html after successful sign-in...");
                window.location.href = 'admin.html';

            } catch (error) {
                console.error("Sign in failed:", error);
                if (loginButton) {
                    loginButton.disabled = false;
                    loginButton.textContent = '登入';
                }

                let errorMessage = "登入失敗，請檢查您的帳號或密碼。";
                if (error.code) { // Firebase 錯誤通常有 code
                    switch (error.code) {
                        case 'auth/user-not-found':
                            errorMessage = "找不到此用戶，請確認電子郵件是否正確。";
                            break;
                        case 'auth/wrong-password':
                            errorMessage = "密碼錯誤，請重試。";
                            break;
                        case 'auth/invalid-email':
                            errorMessage = "電子郵件格式無效。";
                            break;
                        case 'auth/too-many-requests':
                            errorMessage = "您的帳號因多次嘗試登入失敗已被暫時鎖定，請稍後再試或重設密碼。";
                            break;
                        case 'auth/invalid-credential':
                             errorMessage = "提供的憑證無效或已過期。";
                             break;
                        default:
                            errorMessage = `登入失敗：${error.message} (錯誤碼: ${error.code})`;
                    }
                } else {
                    errorMessage = `登入時發生未知錯誤: ${error.message || error}`;
                }


                if (loginErrorDiv) {
                    loginErrorDiv.textContent = errorMessage;
                    loginErrorDiv.style.display = 'block';
                }
            }
        });
    } else {
        console.error("login-script.js: loginForm element not found, cannot add submit listener.");
    }
    console.log("login-script.js: DOMContentLoaded setup finished.");
});

console.log("login-script.js: Script parsed completely.");