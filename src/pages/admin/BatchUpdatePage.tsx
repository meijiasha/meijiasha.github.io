
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMapsLibrary, useMap } from "@vis.gl/react-google-maps";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Play, Loader2, CheckCircle, XCircle } from "lucide-react";
import { fetchStoreDataFromUrl } from "@/lib/googleMapsStoreFetcher";
import { collection, addDoc, updateDoc, doc, serverTimestamp, GeoPoint, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface LogEntry {
    url: string;
    status: "pending" | "success" | "error";
    message: string;
    storeName?: string;
}

export default function BatchUpdatePage() {
    const navigate = useNavigate();
    const placesLib = useMapsLibrary('places');
    const map = useMap();

    const [urls, setUrls] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [progress, setProgress] = useState({ current: 0, total: 0 });

    const [activeTab, setActiveTab] = useState<"add" | "enrich">("add");
    const [enrichLogs, setEnrichLogs] = useState<LogEntry[]>([]);

    const handleProcess = async () => {
        if (!placesLib) {
            alert("地圖服務尚未載入，請稍候再試");
            return;
        }

        const urlList = urls.split('\n').map(u => u.trim()).filter(u => u.length > 0);
        if (urlList.length === 0) {
            alert("請輸入至少一個網址");
            return;
        }

        setIsProcessing(true);
        setLogs([]);
        setProgress({ current: 0, total: urlList.length });

        // Create a dummy div for PlacesService if map is not available (though it should be in AdminLayout)
        const service = new placesLib.PlacesService(map || document.createElement('div'));

        for (let i = 0; i < urlList.length; i++) {
            const url = urlList[i];
            setProgress(prev => ({ ...prev, current: i + 1 }));

            try {
                // 1. Fetch Data
                const data = await fetchStoreDataFromUrl(url, service);

                // 2. Check for existing store
                const storesRef = collection(db, "stores");
                const q = query(storesRef, where("place_id", "==", data.place_id));
                const querySnapshot = await getDocs(q);

                let location = null;
                if (data.latitude && data.longitude) {
                    location = new GeoPoint(data.latitude, data.longitude);
                }

                const storeData = {
                    name: data.name,
                    city: data.city,
                    district: data.district,
                    // Only set category if it's a new store, or maybe we want to keep existing category?
                    // Let's keep existing category if updating, default to "未分類" if new.
                    // Actually, for simplicity in this object, we'll handle it below.
                    address: data.address,
                    google_maps_url: data.google_maps_url,
                    // description: "", // Don't overwrite description on update
                    // price_level: "", // Don't overwrite price_level
                    // dishes: "", // Don't overwrite dishes
                    latitude: data.latitude,
                    longitude: data.longitude,
                    location: location,
                    lat: data.latitude,
                    lng: data.longitude,
                    place_id: data.place_id,
                    phone_number: data.phone_number,
                    // instagram_url: "", // Don't overwrite
                    opening_hours_periods: data.opening_hours_periods,
                    lastEditedAt: serverTimestamp(),
                };

                if (!querySnapshot.empty) {
                    // Update existing store
                    const docId = querySnapshot.docs[0].id;
                    const existingData = querySnapshot.docs[0].data();

                    await updateDoc(doc(db, "stores", docId), {
                        ...storeData,
                        // Preserve fields that shouldn't be overwritten if they exist
                        category: existingData.category || "未分類",
                        description: existingData.description || "",
                        price_level: existingData.price_level || "",
                        dishes: existingData.dishes || "",
                        instagram_url: existingData.instagram_url || "",
                    });

                    setLogs(prev => [...prev, {
                        url,
                        status: "success",
                        message: "成功更新",
                        storeName: data.name
                    }]);
                } else {
                    // Create new store
                    await addDoc(collection(db, "stores"), {
                        ...storeData,
                        category: "未分類",
                        description: "",
                        price_level: "",
                        dishes: "",
                        instagram_url: "",
                        createdAt: serverTimestamp(),
                    });

                    setLogs(prev => [...prev, {
                        url,
                        status: "success",
                        message: "成功新增",
                        storeName: data.name
                    }]);
                }

            } catch (error) {
                console.error(`Error processing ${url}:`, error);
                setLogs(prev => [...prev, {
                    url,
                    status: "error",
                    message: (error as Error).message
                }]);
            }

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        setIsProcessing(false);
        alert("批次處理完成！");
    };

    const handleEnrich = async () => {
        if (!placesLib) {
            alert("地圖服務尚未載入，請稍候再試");
            return;
        }

        setIsProcessing(true);
        setEnrichLogs([]);

        try {
            // 1. Fetch stores without Google Maps URL
            // Firestore doesn't support "where field is missing" easily, so we fetch all and filter client-side
            // Or we can query where google_maps_url == "" if we stored it as empty string
            const storesRef = collection(db, "stores");
            const snapshot = await getDocs(storesRef);
            const targetStores = snapshot.docs
                .map(d => ({ id: d.id, ...d.data() } as any))
                .filter(s => !s.google_maps_url || s.google_maps_url === "");

            if (targetStores.length === 0) {
                alert("沒有發現缺少 Google Maps 網址的店家");
                setIsProcessing(false);
                return;
            }

            setProgress({ current: 0, total: targetStores.length });
            const service = new placesLib.PlacesService(map || document.createElement('div'));

            for (let i = 0; i < targetStores.length; i++) {
                const store = targetStores[i];
                setProgress(prev => ({ ...prev, current: i + 1 }));

                const searchQuery = `${store.name} ${store.city || ""} ${store.district || ""}`.trim();

                try {
                    // Use TextSearch to find the place
                    const request: google.maps.places.TextSearchRequest = {
                        query: searchQuery,
                    };

                    await new Promise<void>((resolve, reject) => {
                        service.textSearch(request, async (results, status) => {
                            if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
                                const place = results[0];

                                // Get full details to get the URL
                                service.getDetails({
                                    placeId: place.place_id!,
                                    fields: ['url', 'place_id', 'geometry', 'formatted_phone_number', 'opening_hours']
                                }, async (details, detailStatus) => {
                                    if (detailStatus === google.maps.places.PlacesServiceStatus.OK && details) {
                                        // Update store
                                        await updateDoc(doc(db, "stores", store.id), {
                                            google_maps_url: details.url,
                                            place_id: details.place_id,
                                            phone_number: details.formatted_phone_number || store.phone_number,
                                            latitude: details.geometry?.location?.lat() || store.latitude,
                                            longitude: details.geometry?.location?.lng() || store.longitude,
                                            // Optional: update opening hours if missing
                                            opening_hours_periods: store.opening_hours_periods || details.opening_hours?.periods || [],
                                            lastEditedAt: serverTimestamp(),
                                        });

                                        setEnrichLogs(prev => [...prev, {
                                            url: details.url || "",
                                            status: "success",
                                            message: "成功補全",
                                            storeName: store.name
                                        }]);
                                        resolve();
                                    } else {
                                        setEnrichLogs(prev => [...prev, {
                                            url: "",
                                            status: "error",
                                            message: "無法取得詳細資料",
                                            storeName: store.name
                                        }]);
                                        resolve(); // Resolve anyway to continue
                                    }
                                });
                            } else {
                                setEnrichLogs(prev => [...prev, {
                                    url: "",
                                    status: "error",
                                    message: "找不到對應店家",
                                    storeName: store.name
                                }]);
                                resolve();
                            }
                        });
                    });

                } catch (error) {
                    console.error(`Error enriching ${store.name}:`, error);
                    setEnrichLogs(prev => [...prev, {
                        url: "",
                        status: "error",
                        message: (error as Error).message,
                        storeName: store.name
                    }]);
                }

                // Delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 1500));
            }

            alert("批次補全完成！");

        } catch (error) {
            console.error("Batch enrich error:", error);
            alert("批次補全發生錯誤");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center">
                    <Button variant="ghost" onClick={() => navigate("/admin/stores")} className="mr-4">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        返回列表
                    </Button>
                    <h1 className="text-2xl font-bold">批次處理中心</h1>
                </div>
            </div>

            {/* Custom Tabs */}
            <div className="flex space-x-1 rounded-lg bg-muted p-1">
                <button
                    onClick={() => setActiveTab("add")}
                    className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all ${activeTab === "add"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                        }`}
                >
                    批次新增 (網址)
                </button>
                <button
                    onClick={() => setActiveTab("enrich")}
                    className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all ${activeTab === "enrich"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                        }`}
                >
                    批次補全 (自動搜尋)
                </button>
            </div>

            {activeTab === "add" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Input Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle>輸入 Google Maps 網址</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                請將 Google Maps 網址貼在下方，每行一個網址。<br />
                                系統將自動抓取店家資訊並新增至資料庫。
                            </p>
                            <Textarea
                                placeholder="https://www.google.com/maps/place/...\nhttps://www.google.com/maps/place/..."
                                className="min-h-[300px] font-mono text-sm"
                                value={urls}
                                onChange={(e) => setUrls(e.target.value)}
                                disabled={isProcessing}
                            />
                            <Button
                                className="w-full"
                                onClick={handleProcess}
                                disabled={isProcessing || !placesLib}
                            >
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        處理中 ({progress.current}/{progress.total})
                                    </>
                                ) : (
                                    <>
                                        <Play className="mr-2 h-4 w-4" />
                                        開始批次處理
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Log Section */}
                    <Card className="h-full flex flex-col">
                        <CardHeader>
                            <CardTitle>處理紀錄</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-y-auto max-h-[500px] space-y-2">
                            {logs.length === 0 && (
                                <div className="text-center text-muted-foreground py-8">
                                    尚未開始處理
                                </div>
                            )}
                            {logs.map((log, index) => (
                                <div key={index} className={`p-3 rounded-md border text-sm ${log.status === "success" ? "bg-green-50 border-green-200 dark:bg-green-900/20" : "bg-red-50 border-red-200 dark:bg-red-900/20"
                                    }`}>
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2 font-medium">
                                            {log.status === "success" ? (
                                                <CheckCircle className="h-4 w-4 text-green-600" />
                                            ) : (
                                                <XCircle className="h-4 w-4 text-red-600" />
                                            )}
                                            {log.storeName || "未知店家"}
                                        </div>
                                        <span className="text-xs text-muted-foreground">{log.status === "success" ? "成功" : "失敗"}</span>
                                    </div>
                                    <div className="mt-1 text-xs text-muted-foreground truncate" title={log.url}>
                                        {log.url}
                                    </div>
                                    {log.status === "error" && (
                                        <div className="mt-1 text-xs text-red-600">
                                            錯誤: {log.message}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Enrich Info Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle>自動補全店家資訊</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                系統將自動搜尋資料庫中「缺少 Google Maps 網址」的店家。<br />
                                使用「店名 + 縣市 + 行政區」進行搜尋，並自動補填網址、座標與 Place ID。
                            </p>
                            <div className="bg-muted p-4 rounded-md text-sm">
                                <h4 className="font-medium mb-2">注意事項：</h4>
                                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                                    <li>搜尋結果可能不完全準確，建議補全後人工檢查。</li>
                                    <li>為避免超過 API 限制，每筆資料間隔 1.5 秒。</li>
                                    <li>若店名過於通用（如「7-11」），可能會對應到錯誤分店。</li>
                                </ul>
                            </div>
                            <Button
                                className="w-full"
                                onClick={handleEnrich}
                                disabled={isProcessing || !placesLib}
                            >
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        補全中 ({progress.current}/{progress.total})
                                    </>
                                ) : (
                                    <>
                                        <Play className="mr-2 h-4 w-4" />
                                        開始自動補全
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Enrich Log Section */}
                    <Card className="h-full flex flex-col">
                        <CardHeader>
                            <CardTitle>補全紀錄</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-y-auto max-h-[500px] space-y-2">
                            {enrichLogs.length === 0 && (
                                <div className="text-center text-muted-foreground py-8">
                                    尚未開始補全
                                </div>
                            )}
                            {enrichLogs.map((log, index) => (
                                <div key={index} className={`p-3 rounded-md border text-sm ${log.status === "success" ? "bg-green-50 border-green-200 dark:bg-green-900/20" : "bg-red-50 border-red-200 dark:bg-red-900/20"
                                    }`}>
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2 font-medium">
                                            {log.status === "success" ? (
                                                <CheckCircle className="h-4 w-4 text-green-600" />
                                            ) : (
                                                <XCircle className="h-4 w-4 text-red-600" />
                                            )}
                                            {log.storeName || "未知店家"}
                                        </div>
                                        <span className="text-xs text-muted-foreground">{log.status === "success" ? "成功" : "失敗"}</span>
                                    </div>
                                    {log.url && (
                                        <div className="mt-1 text-xs text-blue-600 truncate">
                                            <a href={log.url} target="_blank" rel="noreferrer" className="hover:underline">
                                                {log.url}
                                            </a>
                                        </div>
                                    )}
                                    {log.status === "error" && (
                                        <div className="mt-1 text-xs text-red-600">
                                            錯誤: {log.message}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
