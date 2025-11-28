import { useEffect, useState } from "react";
import { Outlet, useNavigate, Link } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { LogOut, Store } from "lucide-react";

export default function AdminLayout() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);

    // const { setTheme } = useTheme(); // Theme is handled by ThemeProvider

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (!user) {
                navigate("/login");
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [navigate]);

    // Removed force light mode logic to support dark mode properly

    const handleLogout = async () => {
        await signOut(auth);
        navigate("/login");
    };

    if (loading) {
        return <div className="flex h-screen items-center justify-center">Loading...</div>;
    }

    return (
        <div className="flex flex-col h-screen bg-muted/40">
            {/* Header */}
            <header className="flex h-16 items-center gap-4 border-b bg-background px-6 shadow-sm">
                <Link to="/admin/stores" className="flex items-center gap-2 font-semibold md:text-lg">
                    <Store className="h-6 w-6" />
                    <span className="">咩呷啥 Admin</span>
                </Link>
                <div className="ml-auto flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        登出
                    </Button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-4 md:p-8">
                <Outlet />
            </main>
        </div>
    );
}
