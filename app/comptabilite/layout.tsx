export const dynamic = "force-dynamic";

import { ComptabiliteNav } from "./comptabilite-nav";

export default function ComptabiliteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      <ComptabiliteNav />
      <div className="flex-1 overflow-y-auto px-container-margin scrollbar-thin">
        {children}
      </div>
    </div>
  );
}
