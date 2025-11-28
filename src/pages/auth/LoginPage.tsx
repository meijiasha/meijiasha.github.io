import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setMessage("");
        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            navigate("/admin/stores");
        } catch (err: any) {
            console.error("Login failed:", err);
            // Show detailed error for debugging
            let msg = "登入失敗。";
            if (err.code) {
                msg += ` (錯誤碼: ${err.code})`;
                switch (err.code) {
                    case 'auth/invalid-credential':
                        msg = "帳號或密碼錯誤 (auth/invalid-credential)";
                        break;
                    case 'auth/user-not-found':
                        msg = "找不到此帳號 (auth/user-not-found)";
                        break;
                    case 'auth/wrong-password':
                        msg = "密碼錯誤 (auth/wrong-password)";
                        break;
                    case 'auth/too-many-requests':
                        msg = "嘗試次數過多，請稍後再試 (auth/too-many-requests)";
                        break;
                }
            } else {
                msg += ` ${err.message}`;
            }
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if (!email) {
            setError("請先輸入 Email 以重設密碼。");
            return;
        }
        setError("");
        setMessage("");
        setLoading(true);
        try {
            await sendPasswordResetEmail(auth, email);
            setMessage("密碼重設信件已發送，請檢查您的信箱。");
        } catch (err: any) {
            console.error("Reset password failed:", err);
            setError("發送失敗，請確認 Email 是否正確。");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative flex h-screen items-center justify-center bg-gray-100 overflow-hidden">
            {/* Background Pattern */}
            <div
                className="absolute inset-0 z-0 opacity-10 pointer-events-none"
                style={{
                    backgroundImage: "url('/bowl.svg')",
                    backgroundRepeat: "repeat",
                    backgroundSize: "60px 60px",
                    backgroundPosition: "center"
                }}
            />

            <div className="z-10 relative flex flex-col items-center gap-6">
                <div className="bg-white p-4 rounded-full shadow-lg">
                    <img src="/LOGO.svg" alt="Logo" className="w-20 h-20 rounded-full object-cover" />
                </div>
                <Card className="w-[400px] shadow-xl bg-white/90 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-center">後台登入</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="admin@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password">密碼</Label>
                                    <Button
                                        type="button"
                                        variant="link"
                                        className="px-0 font-normal text-xs"
                                        onClick={handleResetPassword}
                                        disabled={loading}
                                    >
                                        忘記密碼？
                                    </Button>
                                </div>
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                            {error && <p className="text-sm text-red-500">{error}</p>}
                            {message && <p className="text-sm text-green-500">{message}</p>}
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? "處理中..." : "登入"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
