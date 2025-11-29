
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
import { ArrowLeft, Save, MapPin } from "lucide-react";
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
});

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

    const form = useForm<z.infer<typeof formSchema>>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            name: "",
            city: DEFAULT_CITY,
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
    useEffect(() => {
        const district = form.getValues("district");
        if (district && !currentDistricts.includes(district)) {
            form.setValue("district", "");
        }
    }, [selectedCity, currentDistricts, form]);

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
                });
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
                form.setValue("address", place.formatted_address || "");
                form.setValue("place_id", place.place_id || "");
                if (place.formatted_phone_number) {
                    form.setValue("phone_number", place.formatted_phone_number);
                }
                if (place.geometry?.location) {
                    form.setValue("latitude", place.geometry.location.lat());
                    form.setValue("longitude", place.geometry.location.lng());
                }

                // Improved City/District detection using address_components
                let foundCity = false;
                let foundDistrict = false;

                if (place.address_components) {
                    // 1. Try to find City
                    for (const component of place.address_components) {
                        const componentName = component.long_name;
                        // Check against CITIES values
                        for (const cityValue of Object.values(CITIES)) {
                            // Google often returns "Taipei City" but our value is "台北市"
                            // We need to match loosely or check if component contains our city name
                            // Actually, Google API in Taiwan usually returns Chinese "台北市" if language is zh-TW.
                            // Assuming the environment is zh-TW. If not, this might be tricky.
                            // Let's try exact match or "contains" match.
                            if (componentName.includes(cityValue) || cityValue.includes(componentName)) {
                                form.setValue("city", cityValue);
                                foundCity = true;

                                // 2. Try to find District within this City
                                const cityDistricts = DISTRICTS[cityValue as CityName];
                                for (const comp of place.address_components) {
                                    const distName = comp.long_name;
                                    if (cityDistricts.includes(distName)) {
                                        form.setValue("district", distName);
                                        foundDistrict = true;
                                        break;
                                    }
                                }
                                break;
                            }
                        }
                        if (foundCity) break;
                    }
                }

                // Fallback to formatted_address if address_components didn't work (or weren't available)
                if (!foundCity && place.formatted_address) {
                    console.log("Fallback to formatted_address parsing");
                    for (const city of Object.values(CITIES)) {
                        if (place.formatted_address.includes(city)) {
                            form.setValue("city", city);
                            foundCity = true;

                            // Check for District within that City
                            const cityDistricts = DISTRICTS[city as CityName];
                            for (const dist of cityDistricts) {
                                if (place.formatted_address.includes(dist)) {
                                    form.setValue("district", dist);
                                    foundDistrict = true;
                                    break;
                                }
                            }
                            break;
                        }
                    }
                }

                // Final fallback for District if City found but District not found (check all districts for that city in address string)
                if (foundCity && !foundDistrict && place.formatted_address) {
                    const currentCity = form.getValues("city") as CityName;
                    if (currentCity && DISTRICTS[currentCity]) {
                        for (const dist of DISTRICTS[currentCity]) {
                            if (place.formatted_address.includes(dist)) {
                                form.setValue("district", dist);
                                break;
                            }
                        }
                    }
                }

                alert("已自動填入店家資訊！");
            }
        };

        const performTextSearch = (searchQuery: string) => {
            console.log("Falling back to textSearch for:", searchQuery);
            const request: google.maps.places.TextSearchRequest = {
                query: searchQuery,
            };
            service.textSearch(request, (results, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
                    const firstResult = results[0];
                    if (firstResult.place_id) {
                        service.getDetails({
                            placeId: firstResult.place_id,
                            fields: ['name', 'formatted_address', 'place_id', 'geometry', 'formatted_phone_number', 'address_components']
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

        const fields = ['name', 'formatted_address', 'place_id', 'geometry', 'formatted_phone_number', 'address_components'];

        if (placeId) {
            service.getDetails({ placeId: placeId, fields: fields }, (place: google.maps.places.PlaceResult | null, status: google.maps.places.PlacesServiceStatus) => {
                if (status === google.maps.places.PlacesServiceStatus.OK && place) {
                    handlePlaceResult(place);
                } else {
                    // Fallback to text search if ID fails
                    if (query) {
                        console.log("ID lookup failed, trying findPlaceFromQuery for:", query);
                        service.findPlaceFromQuery({ query: query, fields: fields }, (results: google.maps.places.PlaceResult[] | null, status: google.maps.places.PlacesServiceStatus) => {
                            if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
                                // findPlaceFromQuery results might not have address_components, so getDetails again
                                const res = results[0];
                                if (res.place_id) {
                                    service.getDetails({ placeId: res.place_id, fields: fields }, (detailedPlace, detailedStatus) => {
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
            service.findPlaceFromQuery({ query: query, fields: fields }, (results: google.maps.places.PlaceResult[] | null, status: google.maps.places.PlacesServiceStatus) => {
                if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
                    const res = results[0];
                    if (res.place_id) {
                        service.getDetails({ placeId: res.place_id, fields: fields }, (detailedPlace, detailedStatus) => {
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

