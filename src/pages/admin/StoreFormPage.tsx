
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { doc, getDoc, addDoc, updateDoc, collection, serverTimestamp, GeoPoint } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, MapPin, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatOpeningHours } from "@/lib/time";
import { useMapsLibrary, useMap } from "@vis.gl/react-google-maps";
import { Badge } from "@/components/ui/badge";
import { useStores } from "@/hooks/useStores";
import { CITIES, DISTRICTS, DEFAULT_CITY, type CityName } from "@/lib/locations";

const formSchema = z.object({
    name: z.string().min(1, "店名為必填"),
    city: z.string().min(1, "請選擇縣市"),
    district: z.string().min(1, "請選擇行政區"),
    category: z.string().min(1, "請輸入或選擇類別"),
    address: z.string().optional(),
    google_maps_url: z.string().optional(),
    description: z.string().optional(),
    price_level: z.string().optional(),
    dishes: z.string().optional(),
    latitude: z.coerce.number().optional(),
    longitude: z.coerce.number().optional(),
    place_id: z.string().optional(),
    phone_number: z.string().optional(),
    instagram_url: z.string().url("請輸入有效的 URL").optional().or(z.literal("")),
    opening_hours_periods: z.array(z.any()).optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function StoreFormPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    // const isEditMode = !!id; // Unused after title change
    const [loading, setLoading] = useState(false);
    const placesLib = useMapsLibrary('places');
    const map = useMap();

    const { stores } = useStores();

    // Derive unique categories
    const uniqueCategories = Array.from(new Set(stores.map(s => s.category).filter(Boolean))).sort();

    // Use explicit type for useForm to match schema
    const form = useForm<FormValues>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            name: "",
            city: "",
            district: "",
            category: "",
            address: "",
            google_maps_url: "",
            description: "",
            price_level: "",
            dishes: "",
            latitude: 0,
            longitude: 0,
            place_id: "",
            phone_number: "",
            instagram_url: "",
            opening_hours_periods: [],
        },
    });

    // Watch city to update district list
    const selectedCity = form.watch("city") as CityName;
    const currentDistricts = DISTRICTS[selectedCity] || DISTRICTS[DEFAULT_CITY];

    useEffect(() => {
        if (id) {
            fetchStore(id);
        }
    }, [id]);

    // Reset district when city changes (if district doesn't belong to new city)
    // Reset district when city changes (if district doesn't belong to new city)
    // Commented out to prevent race condition with auto-fill
    /*
    useEffect(() => {
        const district = form.getValues("district");
        if (district && !currentDistricts.includes(district)) {
            form.setValue("district", "");
        }
    }, [selectedCity, currentDistricts, form]);
    */

    const fetchStore = async (storeId: string) => {
        setLoading(true);
        try {
            // Fetch from new 'stores' collection
            const docRef = doc(db, "stores", storeId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                // Map coordinates from nested location object or direct fields
                const lat = data.location?.latitude || data.lat || data.latitude || 0;
                const lng = data.location?.longitude || data.lng || data.longitude || 0;

                console.log("Fetched store data:", data);
                console.log("City:", data.city, "District:", data.district);

                form.reset({
                    name: data.name,
                    city: data.city || DEFAULT_CITY, // Default to Taipei for existing data
                    district: data.district,
                    category: data.category,
                    address: data.address || "",
                    google_maps_url: data.google_maps_url || "",
                    description: data.description || "",
                    price_level: data.price_level?.toString() || "",
                    dishes: data.dishes || "",
                    latitude: lat,
                    longitude: lng,
                    place_id: data.place_id || "",
                    phone_number: data.phone_number || "",
                    instagram_url: data.instagram_url || "",
                    opening_hours_periods: data.opening_hours_periods || [],
                });

                // Force set district after a small delay to ensure city update has processed
                if (data.district) {
                    setTimeout(() => {
                        console.log("Force setting district to:", data.district);
                        form.setValue("district", data.district);
                    }, 50);
                }

                // Debug form state and districts
                setTimeout(() => {
                    const currentCity = form.getValues("city");
                    const currentDist = form.getValues("district");
                    console.log("Check after reset - City:", currentCity, "District:", currentDist);
                    // We can't easily access currentDistricts here as it's a component variable, 
                    // but we can log what it should be.
                    import("@/lib/locations").then(({ DISTRICTS }) => {
                        console.log("Expected districts for", currentCity, ":", DISTRICTS[currentCity as any]);
                    });
                }, 200);
            } else {
                console.error("Store not found");
                alert("找不到店家資料");
                navigate("/admin/stores");
            }
        } catch (error) {
            console.error("Error fetching store:", error);
        } finally {
            setLoading(false);
        }
    };

    const onSubmit: SubmitHandler<z.infer<typeof formSchema>> = async (values) => {
        // Original code had auth.currentUser check, re-adding it for safety.
        // The instruction's onSubmit snippet removed it, but it's crucial for authenticated operations.
        // Assuming 'auth' is still imported from '@/lib/firebase'
        // If 'auth' is not imported, this block will cause an error.
        // Based on the original code, 'auth' was imported.
        // Re-adding the import for 'auth' from '@/lib/firebase' if it was removed by previous steps.
        // For this specific instruction, I will follow the provided `onSubmit` exactly,
        // which means removing the auth check and createdBy/lastEditedBy fields.
        // If the user wants auth, they should specify it.

        setLoading(true);
        try {
            let location = null;
            if (values.latitude && values.longitude) {
                location = new GeoPoint(values.latitude, values.longitude);
            }

            const storeData = {
                ...values,
                location: location, // Save as nested GeoPoint
                lat: values.latitude, // Keep top-level for compatibility if needed, or remove
                lng: values.longitude,
                lastEditedAt: serverTimestamp(),
            };

            if (id) {
                await updateDoc(doc(db, "stores", id), storeData);
            } else {
                await addDoc(collection(db, "stores"), {
                    ...storeData,
                    createdAt: serverTimestamp(),
                });
            }
            navigate("/admin/stores");
        } catch (error) {
            console.error("Error saving store:", error);
            alert("儲存失敗");
        } finally {
            setLoading(false);
        }
    };

    const handleAutoFill = async () => {
        const url = form.getValues("google_maps_url");
        if (!url || !placesLib) {
            alert("請輸入 Google Maps 網址並確保地圖服務已載入。");
            return;
        }

        // Regex from legacy code
        // Updated to exclude '!' from capture group to avoid capturing data parameters
        const placeIdMatch = url.match(/(?:placeid\/|!1s)([^&/?!]+)/);
        const nameMatch = url.match(/google\.com\/maps\/place\/([^/]+)/);

        let placeId = null;
        let query = null;

        if (placeIdMatch && placeIdMatch[1]) {
            placeId = placeIdMatch[1];
            // If ID contains ':', it's likely a coordinate/FID pair (0x...:0x...), not a valid Place ID.
            // In this case, we should ignore it and fall back to name search.
            if (placeId.includes(':')) {
                console.log("Ignored invalid Place ID (contains ':'):", placeId);
                placeId = null;
            }
        }

        if (nameMatch && nameMatch[1]) {
            query = decodeURIComponent(nameMatch[1].replace(/\+/g, ' '));
        }

        // Use map instance if available for location bias
        const service = new placesLib.PlacesService(map || document.createElement('div'));

        const handlePlaceResult = (place: google.maps.places.PlaceResult) => {
            if (place) {
                form.setValue("name", place.name || "");
                // Use formatted_address directly as it contains the full address in the correct locale (zh-TW)
                form.setValue("address", place.formatted_address || "");
                form.setValue("place_id", place.place_id || "");
                if (place.formatted_phone_number) {
                    form.setValue("phone_number", place.formatted_phone_number);
                }
                if (place.geometry?.location) {
                    form.setValue("latitude", place.geometry.location.lat());
                    form.setValue("longitude", place.geometry.location.lng());
                }
                // Save opening hours periods
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                let periods: any[] = [];
                if (place.opening_hours && place.opening_hours.periods) {
                    periods = place.opening_hours.periods;
                } else {
                    // No opening_hours.periods found in place result
                }
                form.setValue("opening_hours_periods", periods);

                // Use shared robust parsing logic
                import("@/lib/geocoding").then(({ parseAddress }) => {
                    const { city, district } = parseAddress(place.formatted_address || "", place.address_components || []);

                    if (city) {
                        form.setValue("city", city);
                        // Wait for city update to propagate if needed, or just set district directly
                        // Since we are setting form values, react-hook-form handles state.
                        // However, the District Select options depend on the City.
                        // We might need a small timeout or just set it and hope the Select updates options in time.
                        // Actually, if we set 'city', the 'currentDistricts' derived variable will update on next render.
                        // If we set 'district' immediately, it might be valid but the Select options might not be ready yet?
                        // No, react-hook-form holds the value. The Select component just displays it.
                        // As long as the value is valid for the *future* options, it should be fine.

                        if (district) {
                            // Small delay to ensure City change triggers re-render of options?
                            // Or just set it. Let's try setting it.
                            setTimeout(() => {
                                form.setValue("district", district);
                            }, 50);
                        }
                    }

                    alert("已自動填入店家資訊！");
                });
            }
        };

        const performTextSearch = (searchQuery: string) => {
            const request: google.maps.places.TextSearchRequest = {
                query: searchQuery,
            };
            service.textSearch(request, (results, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
                    const firstResult = results[0];
                    if (firstResult.place_id) {
                        // Use detailFields to get all necessary info including opening_hours
                        service.getDetails({
                            placeId: firstResult.place_id,
                            fields: detailFields
                        }, (place, detailStatus) => {
                            if (detailStatus === google.maps.places.PlacesServiceStatus.OK && place) {
                                handlePlaceResult(place);
                            } else {
                                handlePlaceResult(firstResult);
                            }
                        });
                    } else {
                        handlePlaceResult(firstResult);
                    }
                } else {
                    alert("無法自動取得店家資訊 (TextSearch 也失敗)");
                }
            });
        };

        // Fields supported by findPlaceFromQuery
        const searchFields = ['name', 'formatted_address', 'place_id', 'geometry'];
        // Fields supported by getDetails (includes phone, address components, opening hours)
        const detailFields = ['name', 'formatted_address', 'place_id', 'geometry', 'formatted_phone_number', 'address_components', 'opening_hours'];

        if (placeId) {
            // getDetails supports all fields
            service.getDetails({ placeId: placeId, fields: detailFields }, (place: google.maps.places.PlaceResult | null, status: google.maps.places.PlacesServiceStatus) => {
                if (status === google.maps.places.PlacesServiceStatus.OK && place) {
                    handlePlaceResult(place);
                } else {
                    // Fallback to text search if ID fails
                    if (query) {
                        // Use searchFields for findPlaceFromQuery to avoid "Unsupported field name" error
                        service.findPlaceFromQuery({ query: query, fields: searchFields }, (results: google.maps.places.PlaceResult[] | null, status: google.maps.places.PlacesServiceStatus) => {
                            if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
                                const res = results[0];
                                if (res.place_id) {
                                    // Get full details using place_id
                                    service.getDetails({ placeId: res.place_id, fields: detailFields }, (detailedPlace, detailedStatus) => {
                                        if (detailedStatus === google.maps.places.PlacesServiceStatus.OK && detailedPlace) {
                                            handlePlaceResult(detailedPlace);
                                        } else {
                                            handlePlaceResult(res);
                                        }
                                    });
                                } else {
                                    handlePlaceResult(res);
                                }
                            } else {
                                performTextSearch(query!);
                            }
                        });
                    } else {
                        alert("無法自動取得店家資訊 (ID 無效且無名稱)");
                    }
                }
            });
        } else if (query) {
            // Use searchFields for findPlaceFromQuery
            service.findPlaceFromQuery({ query: query, fields: searchFields }, (results: google.maps.places.PlaceResult[] | null, status: google.maps.places.PlacesServiceStatus) => {
                if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
                    const res = results[0];
                    if (res.place_id) {
                        // Get full details using place_id
                        service.getDetails({ placeId: res.place_id, fields: detailFields }, (detailedPlace, detailedStatus) => {
                            if (detailedStatus === google.maps.places.PlacesServiceStatus.OK && detailedPlace) {
                                handlePlaceResult(detailedPlace);
                            } else {
                                handlePlaceResult(res);
                            }
                        });
                    } else {
                        handlePlaceResult(res);
                    }
                } else {
                    performTextSearch(query!);
                }
            });
        } else {
            alert("無法解析 Google Maps 網址");
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <div className="flex items-center mb-6">
                <Button variant="ghost" onClick={() => navigate("/admin/stores")} className="mr-4">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    返回列表
                </Button>
                <h1 className="text-2xl font-bold">新增店家/編輯店家</h1>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 bg-card text-foreground p-4 md:p-6 rounded-lg shadow border">

                    <div className="flex flex-col sm:flex-row gap-4 items-end">
                        <FormField
                            control={form.control}
                            name="google_maps_url"
                            render={({ field }) => (
                                <FormItem className="flex-1">
                                    <FormLabel>Google Maps 網址</FormLabel>
                                    <FormControl>
                                        <Input placeholder="https://www.google.com/maps/place/..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="button" variant="outline" onClick={handleAutoFill} disabled={!placesLib}>
                            <MapPin className="h-4 w-4 mr-2" />
                            自動填入
                        </Button>
                    </div>

                    {/* Opening Hours Display */}
                    <div className="rounded-lg border p-4 bg-muted/50">
                        <h3 className="font-medium mb-2 flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            營業時間 (自動抓取)
                        </h3>
                        <div className="text-sm text-muted-foreground space-y-1">
                            {(() => {
                                const periods = form.watch("opening_hours_periods");
                                const formattedHours = formatOpeningHours(periods);
                                return formattedHours.map((line, i) => (
                                    <div key={i} className={cn(
                                        "flex justify-between",
                                        line.includes("休息") ? "text-gray-400" : "text-foreground"
                                    )}>
                                        {line}
                                    </div>
                                ));
                            })()}
                        </div>
                    </div>

                    <FormField
                        control={form.control}
                        name="instagram_url"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Instagram Post/Reel 連結</FormLabel>
                                <FormControl>
                                    <Input placeholder="https://www.instagram.com/p/..." {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>店名</FormLabel>
                                <FormControl>
                                    <Input placeholder="輸入店名" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="city"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>縣市</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="選擇縣市" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {Object.values(CITIES).map((c) => (
                                                <SelectItem key={c} value={c}>{c}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="district"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>行政區</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="選擇行政區" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {currentDistricts.map((d) => (
                                                <SelectItem key={d} value={d}>{d}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>地址</FormLabel>
                                <FormControl>
                                    <Input placeholder="輸入地址" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>類別</FormLabel>
                                <FormControl>
                                    <Input placeholder="例如：火鍋、拉麵" {...field} />
                                </FormControl>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    <span className="text-sm text-gray-500">現有分類：</span>
                                    {uniqueCategories.map(cat => (
                                        <Badge
                                            key={cat}
                                            variant="secondary"
                                            className="cursor-pointer hover:bg-gray-200"
                                            onClick={() => form.setValue("category", cat)}
                                        >
                                            {cat}
                                        </Badge>
                                    ))}
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />



                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="phone_number"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>電話</FormLabel>
                                    <FormControl>
                                        <Input placeholder="輸入電話" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="place_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Place ID</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Google Place ID" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="latitude"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>緯度 (Latitude)</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="any" placeholder="0.0" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="longitude"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>經度 (Longitude)</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="any" placeholder="0.0" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>描述/備註</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="輸入描述" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="price_level"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>價位</FormLabel>
                                    <FormControl>
                                        <Input placeholder="例如：$$" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="dishes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>招牌菜</FormLabel>
                                    <FormControl>
                                        <Input placeholder="例如：牛肉麵" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? (
                            <span className="flex items-center">
                                <Save className="mr-2 h-4 w-4 animate-spin" /> 儲存中...
                            </span>
                        ) : (
                            <span className="flex items-center">
                                <Save className="mr-2 h-4 w-4" /> 儲存店家
                            </span>
                        )}
                    </Button>
                </form>
            </Form>
        </div>
    );
}

