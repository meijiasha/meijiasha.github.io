import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { collection, getDocs, deleteDoc, doc, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Store } from "@/types/store";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, ExternalLink, Search, X, Files } from "lucide-react";

import { auth } from "@/lib/firebase";

import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";

export default function StoreListPage() {
    const [stores, setStores] = useState<Store[]>([]);
    const [loading, setLoading] = useState(true);

    // Filter state
    const [filterName, setFilterName] = useState("");
    const [filterCity, setFilterCity] = useState("all");
    const [filterDistrict, setFilterDistrict] = useState("all");
    const [filterCategory, setFilterCategory] = useState("all");
    const [showDuplicates, setShowDuplicates] = useState(false);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Derived data for filters
    const uniqueCities = useMemo(() => {
        const cities = new Set(stores.map(s => s.city).filter(Boolean));
        return Array.from(cities).sort();
    }, [stores]);

    const uniqueDistricts = useMemo(() => {
        let filtered = stores;
        if (filterCity !== "all") {
            filtered = stores.filter(s => s.city === filterCity);
        }
        const districts = new Set(filtered.map(s => s.district).filter(Boolean));
        return Array.from(districts).sort();
    }, [stores, filterCity]);

    const uniqueCategories = useMemo(() => {
        const categories = new Set(stores.map(s => s.category).filter(Boolean));
        return Array.from(categories).sort();
    }, [stores]);

    // Filter logic
    const filteredStores = useMemo(() => {
        if (showDuplicates) {
            const nameCounts = new Map<string, number>();
            stores.forEach(s => {
                const name = s.name.trim();
                nameCounts.set(name, (nameCounts.get(name) || 0) + 1);
            });
            return stores.filter(s => (nameCounts.get(s.name.trim()) || 0) > 1)
                .sort((a, b) => a.name.localeCompare(b.name));
        }

        return stores.filter(store => {
            const matchName = store.name.toLowerCase().includes(filterName.toLowerCase());
            const matchCity = filterCity === "all" || store.city === filterCity;
            const matchDistrict = filterDistrict === "all" || store.district === filterDistrict;
            const matchCategory = filterCategory === "all" || store.category === filterCategory;
            return matchName && matchCity && matchDistrict && matchCategory;
        });
    }, [stores, filterName, filterCity, filterDistrict, filterCategory, showDuplicates]);

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [filterName, filterCity, filterDistrict, filterCategory, showDuplicates]);

    // Calculate pagination
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredStores.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredStores.length / itemsPerPage);

    // Fetch stores
    useEffect(() => {
        const fetchStores = async () => {
            setLoading(true);
            try {
                const q = query(collection(db, "stores"), orderBy("lastEditedAt", "desc"));
                const querySnapshot = await getDocs(q);

                const storeData: Store[] = [];
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    // Map coordinates from nested location object or direct fields
                    const lat = data.location?.latitude || data.lat || data.latitude || 0;
                    const lng = data.location?.longitude || data.lng || data.longitude || 0;

                    storeData.push({
                        id: doc.id,
                        ...data,
                        lat,
                        lng
                    } as Store);
                });
                setStores(storeData);
            } catch (error) {
                console.error("Error fetching stores:", error);
                const err = error as { code?: string; message?: string };
                if (err.code === 'permission-denied') {
                    alert("權限不足：您可能沒有 Admin 權限 (permission-denied)。");
                } else {
                    alert(`讀取失敗: ${err.message}`);
                }
            } finally {
                setLoading(false);
            }
        };

        // Wait for auth to be ready
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                fetchStores();
            }
        });
        return () => unsubscribe();
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm("確定要刪除這家店嗎？此動作無法復原。")) return;
        try {
            await deleteDoc(doc(db, "stores_taipei", id));
            setStores(stores.filter((store) => store.id !== id));
        } catch (error) {
            console.error("Error deleting store:", error);
            alert("刪除失敗");
        }
    };

    const clearFilters = () => {
        setFilterName("");
        setFilterCity("all");
        setFilterDistrict("all");
        setFilterCategory("all");
        setShowDuplicates(false);
    };

    if (loading) {
        return <div>Loading stores...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">店家列表</h2>
                <div className="flex gap-2 w-full sm:w-auto">
                    <Button
                        variant={showDuplicates ? "secondary" : "outline"}
                        onClick={() => {
                            if (showDuplicates) {
                                setShowDuplicates(false);
                            } else {
                                clearFilters(); // Clear other filters when showing duplicates
                                setShowDuplicates(true);
                            }
                        }}
                        className="flex-1 sm:flex-none"
                    >
                        <Files className="mr-2 h-4 w-4" />
                        {showDuplicates ? "顯示所有" : "找出重複"}
                    </Button>
                    <Link to="/admin/stores/new" className="flex-1 sm:flex-none">
                        <Button className="w-full">
                            <Plus className="mr-2 h-4 w-4" /> 新增店家
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Filters */}
            {!showDuplicates && (
                <div className="flex flex-col md:flex-row gap-4 p-4 bg-muted/50 rounded-lg border">
                    <div className="relative flex-1 md:max-w-xs">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="搜尋店名..."
                            value={filterName}
                            onChange={(e) => setFilterName(e.target.value)}
                            className="pl-8 bg-background"
                        />
                    </div>

                    <Select value={filterCity} onValueChange={(val) => { setFilterCity(val); setFilterDistrict("all"); }}>
                        <SelectTrigger className="w-full md:w-[140px] bg-background">
                            <SelectValue placeholder="縣市" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">所有縣市</SelectItem>
                            {uniqueCities.map(city => (
                                <SelectItem key={city} value={city}>{city}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={filterDistrict} onValueChange={setFilterDistrict}>
                        <SelectTrigger className="w-full md:w-[140px] bg-background">
                            <SelectValue placeholder="行政區" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">所有行政區</SelectItem>
                            {uniqueDistricts.map(district => (
                                <SelectItem key={district} value={district}>{district}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                        <SelectTrigger className="w-full md:w-[140px] bg-background">
                            <SelectValue placeholder="分類" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">所有分類</SelectItem>
                            {uniqueCategories.map(category => (
                                <SelectItem key={category} value={category}>{category}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {(filterName || filterCity !== "all" || filterDistrict !== "all" || filterCategory !== "all") && (
                        <Button variant="ghost" onClick={clearFilters} className="px-2 lg:px-4">
                            <X className="mr-2 h-4 w-4" /> 清除篩選
                        </Button>
                    )}
                </div>
            )}

            {showDuplicates && (
                <div className="p-4 bg-yellow-50/50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800 text-sm">
                    <p className="font-medium text-yellow-800 dark:text-yellow-200">
                        正在顯示重複店家
                    </p>
                    <p className="text-yellow-700 dark:text-yellow-300 mt-1">
                        以下列出店名完全相同的店家。您可以檢查並刪除多餘的資料。
                        <Button variant="link" className="h-auto p-0 ml-2 text-yellow-800 underline" onClick={() => setShowDuplicates(false)}>
                            返回列表
                        </Button>
                    </p>
                </div>
            )}

            {/* Desktop Table View */}
            <div className="hidden md:block rounded-md border bg-background text-foreground overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[200px]">店名</TableHead>
                            <TableHead className="w-[100px]">縣市</TableHead>
                            <TableHead className="w-[100px]">行政區</TableHead>
                            <TableHead className="w-[100px]">分類</TableHead>
                            <TableHead className="w-[300px]">地址</TableHead>
                            <TableHead className="w-[120px] text-right">操作</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredStores.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center h-24">
                                    {showDuplicates ? "沒有發現重複的店家" : "沒有符合條件的店家"}
                                </TableCell>
                            </TableRow>
                        ) : (
                            currentItems.map((store) => (
                                <TableRow key={store.id} className="h-20">
                                    <TableCell className="font-medium align-middle">
                                        <div className="flex items-center space-x-2 h-full">
                                            <span className="line-clamp-2 break-words leading-tight" title={store.name}>
                                                {store.name}
                                            </span>
                                            {store.google_maps_url && (
                                                <a
                                                    href={store.google_maps_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-gray-400 hover:text-blue-500 shrink-0"
                                                >
                                                    <ExternalLink className="h-3 w-3" />
                                                </a>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>{store.city}</TableCell>
                                    <TableCell>{store.district}</TableCell>
                                    <TableCell>{store.category}</TableCell>
                                    <TableCell className="truncate max-w-[200px]">{store.address}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Link to={`/admin/stores/${store.id}`}>
                                                <Button variant="ghost" size="icon" title="編輯">
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                            </Link>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(store.id)}
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                title="刪除"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
                {filteredStores.length === 0 ? (
                    <div className="text-center p-8 text-muted-foreground border rounded-lg bg-muted/20">
                        {showDuplicates ? "沒有發現重複的店家" : "沒有符合條件的店家"}
                    </div>
                ) : (
                    currentItems.map((store) => (
                        <div key={store.id} className="p-4 border rounded-lg bg-card text-card-foreground shadow-sm space-y-3">
                            <div className="flex justify-between items-start gap-2">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-lg leading-tight">{store.name}</h3>
                                        {store.google_maps_url && (
                                            <a
                                                href={store.google_maps_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-gray-400 hover:text-blue-500 shrink-0"
                                            >
                                                <ExternalLink className="h-4 w-4" />
                                            </a>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-2 text-sm">
                                        <span className="bg-secondary text-secondary-foreground px-2 py-0.5 rounded-md text-xs">
                                            {store.category}
                                        </span>
                                        <span className="text-muted-foreground">
                                            {store.city} {store.district}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="text-sm text-muted-foreground break-words">
                                {store.address}
                            </div>

                            <div className="flex gap-2 pt-2 border-t mt-2">
                                <Link to={`/admin/stores/${store.id}`} className="flex-1">
                                    <Button variant="outline" className="w-full h-9">
                                        <Pencil className="mr-2 h-4 w-4" /> 編輯
                                    </Button>
                                </Link>
                                <Button
                                    variant="outline"
                                    onClick={() => handleDelete(store.id)}
                                    className="flex-1 h-9 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-900"
                                >
                                    <Trash2 className="mr-2 h-4 w-4" /> 刪除
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Pagination */}
            {filteredStores.length > 0 && (
                <Pagination className="mt-4">
                    <PaginationContent>
                        <PaginationItem>
                            <PaginationPrevious
                                href="#"
                                onClick={(e) => {
                                    e.preventDefault();
                                    if (currentPage > 1) setCurrentPage(p => p - 1);
                                }}
                                className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                            />
                        </PaginationItem>

                        {/* Simple page info for now */}
                        <PaginationItem>
                            <span className="px-4 text-sm text-gray-500">
                                第 {currentPage} 頁 / 共 {totalPages} 頁
                            </span>
                        </PaginationItem>

                        <PaginationItem>
                            <PaginationNext
                                href="#"
                                onClick={(e) => {
                                    e.preventDefault();
                                    if (currentPage < totalPages) setCurrentPage(p => p + 1);
                                }}
                                className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                            />
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>
            )}


        </div>
    );
}
