import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function SkeletonPulse({ className }: { className?: string }) {
    return (
        <div
            className={cn(
                "animate-pulse bg-muted/50 rounded-lg",
                className
            )}
        />
    );
}

function SkeletonCard({
    className,
    contentHeight = "h-20"
}: {
    className?: string;
    contentHeight?: string;
}) {
    return (
        <Card className={cn(
            "border-0 shadow-sm bg-card/50 backdrop-blur-xl rounded-3xl overflow-hidden",
            className
        )}>
            <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <SkeletonPulse className="h-4 w-24" />
                    <SkeletonPulse className="h-8 w-8 rounded-full" />
                </div>
                <SkeletonPulse className="h-8 w-32 mb-2" />
                <SkeletonPulse className="h-3 w-20" />
            </CardContent>
        </Card>
    );
}

function SkeletonChart({
    className,
    height = "h-[350px]"
}: {
    className?: string;
    height?: string;
}) {
    return (
        <Card className={cn(
            "border-0 shadow-sm bg-card/50 backdrop-blur-xl rounded-3xl overflow-hidden",
            className
        )}>
            <CardHeader className="p-8 pb-2">
                <div className="flex items-center gap-2">
                    <SkeletonPulse className="h-8 w-8 rounded-full" />
                    <SkeletonPulse className="h-5 w-32" />
                </div>
                <SkeletonPulse className="h-3 w-48 mt-2" />
            </CardHeader>
            <CardContent className={cn("p-8 pt-4", height)}>
                <SkeletonPulse className="w-full h-full rounded-lg" />
            </CardContent>
        </Card>
    );
}

function SkeletonTable({ className }: { className?: string }) {
    return (
        <Card className={cn(
            "border-0 shadow-sm bg-card/50 backdrop-blur-xl rounded-3xl overflow-hidden",
            className
        )}>
            <CardHeader className="p-8 pb-4">
                <SkeletonPulse className="h-5 w-40" />
                <SkeletonPulse className="h-3 w-32 mt-2" />
            </CardHeader>
            <CardContent className="p-0">
                <div className="space-y-4 p-8">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex items-center gap-4">
                            <SkeletonPulse className="h-10 flex-1" />
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

export function AIUsageSkeleton() {
    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
            {/* Time Range Selector Skeleton */}
            <div className="flex items-center gap-2 p-1 bg-secondary/30 rounded-2xl w-fit">
                <SkeletonPulse className="h-9 w-16 rounded-xl" />
                <SkeletonPulse className="h-9 w-16 rounded-xl" />
                <SkeletonPulse className="h-9 w-16 rounded-xl" />
            </div>

            {/* Bento Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Main Stats - Top Row */}
                {[...Array(4)].map((_, i) => (
                    <SkeletonCard key={i} />
                ))}

                {/* Usage Trends Chart - Large Block */}
                <SkeletonChart className="col-span-1 md:col-span-2 lg:col-span-3 row-span-2" />

                {/* Status Breakdown - Side Block */}
                <SkeletonChart
                    className="col-span-1 lg:col-span-1 row-span-2"
                    height="h-[400px]"
                />

                {/* Action Breakdown - Wide Block */}
                <SkeletonChart
                    className="col-span-1 md:col-span-2"
                    height="h-[200px]"
                />

                {/* Token Usage - Wide Block */}
                <SkeletonChart
                    className="col-span-1 md:col-span-2"
                    height="h-[300px]"
                />

                {/* Hourly Pattern - Wide Block */}
                <SkeletonChart
                    className="col-span-1 md:col-span-2"
                    height="h-[300px]"
                />

                {/* Latency Distribution - Wide Block */}
                <SkeletonChart
                    className="col-span-1 md:col-span-2"
                    height="h-[200px]"
                />

                {/* Model Efficiency Table - Full Width */}
                <SkeletonTable className="col-span-1 md:col-span-2 lg:col-span-4" />
            </div>

            {/* Recent Logs Table - Full Width */}
            <SkeletonTable />
        </div>
    );
}
