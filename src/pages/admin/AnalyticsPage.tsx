import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, BarChart3 } from "lucide-react";

export default function AnalyticsPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">瀏覽分析</h2>
                <Button variant="outline" onClick={() => window.open("https://analytics.google.com/", "_blank")}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    前往 Google Analytics
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            總瀏覽量 (範例)
                        </CardTitle>
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">--</div>
                        <p className="text-xs text-muted-foreground">
                            請至 GA4 查看詳細數據
                        </p>
                    </CardContent>
                </Card>
                {/* Add more placeholder cards if needed */}
            </div>

            <Card className="h-[600px]">
                <CardHeader>
                    <CardTitle>Looker Studio 報表</CardTitle>
                    <CardDescription>
                        您可以在此嵌入 Looker Studio 的報表 iframe。
                        <br />
                        由於安全性限制，靜態網站不建議直接串接 GA4 Data API，建議使用 Looker Studio 建立報表後嵌入。
                    </CardDescription>
                </CardHeader>
                <CardContent className="h-full pb-12">
                    <div className="w-full h-full bg-muted/20 rounded-lg border-2 border-dashed border-muted flex items-center justify-center flex-col gap-4 text-muted-foreground">
                        <BarChart3 className="h-12 w-12 opacity-50" />
                        <p>在此處嵌入 Looker Studio iframe</p>
                        <div className="text-sm max-w-md text-center">
                            請至 Looker Studio 建立報表，選擇 "檔案" &gt; "嵌入報表"，複製 iframe 代碼並貼入程式碼中。
                        </div>
                    </div>
                    {/* 
                    Example Embed Code:
                    <iframe 
                        width="100%" 
                        height="100%" 
                        src="https://lookerstudio.google.com/embed/reporting/YOUR_REPORT_ID/page/YOUR_PAGE_ID" 
                        frameBorder="0" 
                        style={{ border: 0 }} 
                        allowFullScreen
                    ></iframe> 
                    */}
                </CardContent>
            </Card>
        </div>
    );
}
