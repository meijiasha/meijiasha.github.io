import { useEffect, useState } from "react";
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
import { Plus, Pencil, Trash2, ExternalLink } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { auth } from "@/lib/firebase"; // Added auth import

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

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Calculate pagination
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = stores.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(stores.length / itemsPerPage);

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

    if (loading) {
        return <div>Loading stores...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">店家列表</h2>
                <Link to="/admin/stores/new">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" /> 新增店家
                    </Button>
                </Link>
            </div>

            <div className="rounded-md border bg-white">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>店名</TableHead>
                            <TableHead>縣市</TableHead>
                            <TableHead>行政區</TableHead>
                            <TableHead>分類</TableHead>
                            <TableHead>地址</TableHead>
                            <TableHead className="text-right">操作</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {stores.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center h-24">
                                    沒有店家資料
                                </TableCell>
                            </TableRow>
                        ) : (
                            currentItems.map((store) => (
                                <TableRow key={store.id}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center space-x-2">
                                            <span>{store.name}</span>
                                            {store.google_maps_url && (
                                                <a
                                                    href={store.google_maps_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-gray-400 hover:text-blue-500"
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
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <span className="sr-only">Open menu</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                <Link to={`/admin/stores/${store.id}`}>
                                                    <DropdownMenuItem>
                                                        <Pencil className="mr-2 h-4 w-4" /> 編輯
                                                    </DropdownMenuItem>
                                                </Link>
                                                <DropdownMenuItem
                                                    onClick={() => handleDelete(store.id)}
                                                    className="text-red-600"
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" /> 刪除
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            {stores.length > 0 && (
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
