import { useState } from "react";
import { collection, getDocs, setDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

export default function MigrationPage() {
    const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
    const [progress, setProgress] = useState(0);
    const [total, setTotal] = useState(0);
    const [logs, setLogs] = useState<string[]>([]);

    const addLog = (msg: string) => setLogs(prev => [...prev, msg]);

    const handleMigration = async () => {
        if (!confirm("確定要執行遷移嗎？這將會把 stores_taipei 的資料複製到 stores 集合。")) return;

        setStatus("running");
        setLogs([]);
        setProgress(0);
        setTotal(0);

        try {
            addLog("開始讀取 stores_taipei...");
            const sourceRef = collection(db, "stores_taipei");
            const snapshot = await getDocs(sourceRef);

            setTotal(snapshot.size);
            addLog(`共找到 ${snapshot.size} 筆資料。`);

            let count = 0;
            for (const docSnap of snapshot.docs) {
                const data = docSnap.data();
                const targetRef = doc(db, "stores", docSnap.id); // Use same ID

                // Prepare new data
                // Ensure city is set to "台北市" if missing (legacy data)
                const newData = {
                    ...data,
                    city: data.city || "台北市",
                    migratedAt: serverTimestamp(),
                };

                await setDoc(targetRef, newData);
                count++;
                setProgress(count);
                addLog(`[${count}/${snapshot.size}] 已遷移: ${data.name}`);
            }

            addLog("遷移完成！");
            setStatus("done");
        } catch (error) {
            console.error("Migration error:", error);
            addLog(`錯誤: ${error}`);
            setStatus("error");
        }
    };

    return (
        <div className="max-w-3xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">資料庫遷移工具</h1>

            <Card>
                <CardHeader>
                    <CardTitle>stores_taipei &rarr; stores</CardTitle>
                    <CardDescription>
                        將舊的 stores_taipei 集合資料複製到新的 stores 集合，並補上 city 欄位。
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Alert>
                        <AlertTitle>注意</AlertTitle>
                        <AlertDescription>
                            此操作是不可逆的（雖然不會刪除舊資料，但會覆寫新集合中相同 ID 的資料）。
                            請確保您知道自己在做什麼。
                        </AlertDescription>
                    </Alert>

                    <div className="flex items-center gap-4">
                        <Button onClick={handleMigration} disabled={status === "running"}>
                            {status === "running" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            開始遷移
                        </Button>
                        {status === "done" && <span className="text-green-600 flex items-center"><CheckCircle className="mr-1 h-4 w-4" /> 完成</span>}
                        {status === "error" && <span className="text-red-600 flex items-center"><XCircle className="mr-1 h-4 w-4" /> 失敗</span>}
                    </div>

                    {status !== "idle" && (
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>進度: {progress} / {total}</span>
                                <span>{total > 0 ? Math.round((progress / total) * 100) : 0}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${total > 0 ? (progress / total) * 100 : 0}%` }}></div>
                            </div>
                        </div>
                    )}

                    <div className="bg-gray-100 p-4 rounded-md h-64 overflow-y-auto text-xs font-mono">
                        {logs.length === 0 ? <span className="text-gray-400">等待執行...</span> : logs.map((log, i) => (
                            <div key={i}>{log}</div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
