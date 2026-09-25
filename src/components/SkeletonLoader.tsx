import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const SkeletonBone: React.FC<SkeletonProps> = ({ className = '' }) => (
  <div
    className={`bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded-md ${className}`}
  />
);

/**
 * Full page skeleton matching the actual app layout:
 * Navbar, Subheader with room code pill, section tabs, and main cards
 */
export const AppSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans">
      {/* Mock Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-zinc-900/95 border-b border-zinc-200 dark:border-zinc-800 px-4 sm:px-6 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          {/* Logo & title */}
          <div className="flex items-center gap-3">
            <SkeletonBone className="w-8 h-8 rounded-xl bg-red-900/40" />
            <div className="space-y-1">
              <SkeletonBone className="w-32 h-4" />
              <SkeletonBone className="w-20 h-2.5" />
            </div>
          </div>

          {/* Right navbar controls */}
          <div className="flex items-center gap-2">
            <SkeletonBone className="w-24 h-8 rounded-xl hidden sm:block" />
            <SkeletonBone className="w-16 h-8 rounded-xl hidden sm:block" />
            <SkeletonBone className="w-8 h-8 rounded-xl" />
            <SkeletonBone className="w-8 h-8 rounded-xl" />
            <SkeletonBone className="w-8 h-8 rounded-full" />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Sub-header skeleton */}
        <div className="pb-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-2">
            <SkeletonBone className="w-64 h-6 rounded-lg" />
            <div className="flex items-center gap-2">
              <SkeletonBone className="w-24 h-3.5" />
              <SkeletonBone className="w-20 h-3.5" />
              <SkeletonBone className="w-32 h-3.5" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <SkeletonBone className="w-20 h-6 rounded-md" />
            <SkeletonBone className="w-24 h-7 rounded-lg" />
          </div>
        </div>

        {/* Section tabs skeleton */}
        <div className="flex items-center gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-2">
          <SkeletonBone className="w-28 h-6 rounded-md" />
          <SkeletonBone className="w-28 h-6 rounded-md" />
          <SkeletonBone className="w-36 h-6 rounded-md" />
        </div>

        {/* Deadline alert banner skeleton */}
        <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <SkeletonBone className="w-9 h-9 rounded-xl shrink-0" />
            <div className="space-y-1.5">
              <SkeletonBone className="w-48 h-4 rounded" />
              <SkeletonBone className="w-72 h-3 rounded" />
            </div>
          </div>
          <SkeletonBone className="w-28 h-8 rounded-xl shrink-0 hidden sm:block" />
        </div>

        {/* Wishlist 2-column layout skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (Items) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Add item input form skeleton */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-3">
              <SkeletonBone className="w-28 h-3.5" />
              <SkeletonBone className="w-full h-8 rounded-xl" />
              <div className="grid grid-cols-2 gap-3">
                <SkeletonBone className="w-full h-8 rounded-xl" />
                <SkeletonBone className="w-full h-8 rounded-xl" />
              </div>
              <SkeletonBone className="w-full h-8 rounded-xl" />
              <div className="flex justify-end pt-1">
                <SkeletonBone className="w-24 h-7 rounded-xl" />
              </div>
            </div>

            {/* List item cards skeleton */}
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <SkeletonBone className="w-4 h-4 rounded" />
                    <SkeletonBone className="w-40 h-4 rounded" />
                    <SkeletonBone className="w-16 h-4 rounded-full" />
                  </div>
                  <SkeletonBone className="w-5 h-5 rounded" />
                </div>
              ))}
            </div>
          </div>

          {/* Right Column (Helper Profile) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4">
              <div className="space-y-1">
                <SkeletonBone className="w-32 h-4" />
                <SkeletonBone className="w-48 h-3" />
              </div>

              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-1.5">
                  <SkeletonBone className="w-24 h-3" />
                  <SkeletonBone className="w-full h-8 rounded-xl" />
                </div>
              ))}

              <div className="space-y-1.5">
                <SkeletonBone className="w-36 h-3" />
                <SkeletonBone className="w-full h-16 rounded-xl" />
              </div>

              <div className="flex justify-end pt-2">
                <SkeletonBone className="w-32 h-7 rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

/**
 * Skeleton loader for the Participants Roster Table
 */
export const ParticipantsSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 flex items-center justify-between">
        <div className="space-y-1.5">
          <SkeletonBone className="w-32 h-5 rounded" />
          <SkeletonBone className="w-56 h-3 rounded" />
        </div>
        <SkeletonBone className="w-36 h-8 rounded-xl" />
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 flex justify-between">
          <SkeletonBone className="w-24 h-3" />
          <SkeletonBone className="w-16 h-3" />
          <SkeletonBone className="w-16 h-3" />
          <SkeletonBone className="w-16 h-3" />
        </div>
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1">
                <SkeletonBone className="w-8 h-8 rounded-full" />
                <div className="space-y-1">
                  <SkeletonBone className="w-32 h-3.5" />
                  <SkeletonBone className="w-20 h-2.5" />
                </div>
              </div>
              <SkeletonBone className="w-20 h-4 rounded-full" />
              <SkeletonBone className="w-24 h-5 rounded-full" />
              <SkeletonBone className="w-16 h-6 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Skeleton for the Invite Banner on Login screen
 */
export const InviteBannerSkeleton: React.FC = () => {
  return (
    <div className="mb-6 p-4 rounded-xl bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 space-y-2">
      <SkeletonBone className="w-24 h-3 rounded" />
      <SkeletonBone className="w-48 h-4 rounded" />
      <SkeletonBone className="w-64 h-3 rounded" />
    </div>
  );
};

/**
 * Skeleton for WishlistEditor while participant data is being resolved
 */
export const WishlistSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Deadline alert banner skeleton */}
      <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <SkeletonBone className="w-9 h-9 rounded-xl shrink-0" />
          <div className="space-y-1.5">
            <SkeletonBone className="w-48 h-4 rounded" />
            <SkeletonBone className="w-72 h-3 rounded" />
          </div>
        </div>
        <SkeletonBone className="w-28 h-8 rounded-xl shrink-0 hidden sm:block" />
      </div>

      {/* Status Bar skeleton */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 flex items-center justify-between">
        <div className="space-y-1.5">
          <SkeletonBone className="w-44 h-5 rounded" />
          <SkeletonBone className="w-64 h-3 rounded" />
        </div>
        <SkeletonBone className="w-36 h-8 rounded-xl" />
      </div>

      {/* Grid skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-3">
            <SkeletonBone className="w-28 h-3.5" />
            <SkeletonBone className="w-full h-8 rounded-xl" />
            <div className="grid grid-cols-2 gap-3">
              <SkeletonBone className="w-full h-8 rounded-xl" />
              <SkeletonBone className="w-full h-8 rounded-xl" />
            </div>
            <SkeletonBone className="w-full h-8 rounded-xl" />
            <div className="flex justify-end pt-1">
              <SkeletonBone className="w-24 h-7 rounded-xl" />
            </div>
          </div>

          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 flex-1">
                  <SkeletonBone className="w-4 h-4 rounded" />
                  <SkeletonBone className="w-40 h-4 rounded" />
                  <SkeletonBone className="w-16 h-4 rounded-full" />
                </div>
                <SkeletonBone className="w-5 h-5 rounded" />
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4">
            <div className="space-y-1">
              <SkeletonBone className="w-32 h-4" />
              <SkeletonBone className="w-48 h-3" />
            </div>

            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-1.5">
                <SkeletonBone className="w-24 h-3" />
                <SkeletonBone className="w-full h-8 rounded-xl" />
              </div>
            ))}

            <div className="space-y-1.5">
              <SkeletonBone className="w-36 h-3" />
              <SkeletonBone className="w-full h-16 rounded-xl" />
            </div>

            <div className="flex justify-end pt-2">
              <SkeletonBone className="w-32 h-7 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
