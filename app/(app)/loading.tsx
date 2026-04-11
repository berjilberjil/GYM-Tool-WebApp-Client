import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-dvh bg-gray-50 flex flex-col">
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 min-h-14 py-2 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <Skeleton className="size-8 rounded-lg" />
          <div className="min-w-0 space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
        <Skeleton className="size-8 rounded-full" />
      </div>

      <main className="flex-1 w-full max-w-120 mx-auto px-4 pt-4 pb-24">
        <div className="space-y-4">
          <Skeleton className="h-10 w-48 rounded-xl" />
          <Skeleton className="h-5 w-64 rounded-xl" />
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </div>
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200">
        <div className="max-w-120 mx-auto flex items-center justify-around h-16 px-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="flex flex-col items-center gap-1 py-1.5">
              <Skeleton className="size-5 rounded-full" />
              <Skeleton className="h-2.5 w-8 rounded-full" />
            </div>
          ))}
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>
    </div>
  );
}