export default function WorkspaceLoading() {
    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-pulse">
            {/* Header Skeleton */}
            <div className="h-28 bg-white border border-gray-200 rounded-xl p-6 flex items-center justify-between">
                <div className="space-y-2.5 w-1/3">
                    <div className="h-3 w-32 bg-gray-200 rounded" />
                    <div className="h-6 w-48 bg-gray-300 rounded" />
                </div>
                <div className="h-10 w-64 bg-gray-100 rounded-lg" />
            </div>

            {/* Grid Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-7 space-y-4">
                    <div className="h-24 bg-white border border-gray-200 rounded-xl" />
                    <div className="h-24 bg-white border border-gray-200 rounded-xl" />
                    <div className="h-24 bg-white border border-gray-200 rounded-xl" />
                </div>
                <div className="lg:col-span-5">
                    <div className="h-80 bg-white border border-gray-200 rounded-xl" />
                </div>
            </div>
        </div>
    );
}
