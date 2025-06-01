// setAdmin.js
const admin = require("firebase-admin");

// 將 'path/to/your/serviceAccountKey.json' 替換為您的金鑰檔案的實際路徑
const serviceAccount = require("./firebase-admin-keys/serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const emailToMakeAdmin = "seraphwu@gmail.com"; // 或從命令行參數讀取

async function setAdminClaim() {
  if (!emailToMakeAdmin) {
    console.error("請提供 Email 地址。");
    return;
  }
  try {
    const userRecord = await admin.auth().getUserByEmail(emailToMakeAdmin);
    if (userRecord.uid) {
      const existingClaims = userRecord.customClaims || {};
      const newClaims = { ...existingClaims, admin: true };

      await admin.auth().setCustomUserClaims(userRecord.uid, newClaims);
      console.log(`成功為 ${emailToMakeAdmin} (UID: ${userRecord.uid}) 設定自訂宣告:`, newClaims);
      console.log("請該使用者重新登入以使宣告生效。");
    } else {
      console.error(`找不到 Email 為 ${emailToMakeAdmin} 的用戶 (userRecord is falsy)。`);
    }
  } catch (error) {
    console.error(`設定管理員宣告時發生錯誤 (Email: ${emailToMakeAdmin}):`, error);
  }
}

setAdminClaim().then(() => process.exit(0)).catch(() => process.exit(1));