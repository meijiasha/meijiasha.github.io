import { useEffect, useState } from "react";
import { Outlet, useNavigate, Link } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { LogOut, Store } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

export default function AdminLayout() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);

    const { theme } = useTheme();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (!user) {
                navigate("/login");
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [navigate]);

    // Force light mode in Admin
    useEffect(() => {
        const root = window.document.documentElement;
        // Save current class list to restore later? 
        // Actually we can just rely on theme state to restore.

        // Force light
        root.classList.remove("dark");
        root.classList.add("light");

        return () => {
            // Restore based on theme state
            root.classList.remove("light", "dark");
            if (theme === "system") {
                const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
                    ? "dark"
                    : "light";
                root.classList.add(systemTheme);
            } else {
                root.classList.add(theme);
            }
        };
    }, [theme]);

    const handleLogout = async () => {
        await signOut(auth);
        navigate("/login");
    };

    if (loading) {
        return <div className="flex h-screen items-center justify-center">Loading...</div>;
    }

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Sidebar */}
            <aside className="w-64 bg-white shadow-md">
                <div className="p-6">
                    <h1 className="text-2xl font-bold text-gray-800">咩呷啥 Admin</h1>
                </div>
                <nav className="mt-6 px-4 space-y-2">
                    <Link to="/admin/stores">
                        <Button variant="ghost" className="w-full justify-start">
                            <Store className="mr-2 h-4 w-4" />
                            店家管理
                        </Button>
                    </Link>
                    {/* Add more links here */}
                </nav>
                <div className="absolute bottom-0 w-64 p-4 border-t">
                    <Button variant="outline" className="w-full" onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        登出
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-8">
                <Outlet />
            </main>
        </div>
    );
}
