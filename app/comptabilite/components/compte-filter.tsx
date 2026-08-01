"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

export function CompteFilter({
  comptes,
}: {
  comptes: { id: string; numero: string; libelle: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentCompte = searchParams.get("compte") || "";

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams);
    if (e.target.value) {
      params.set("compte", e.target.value);
    } else {
      params.delete("compte");
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div>
      <label className="font-label-caps text-label-caps text-outline uppercase tracking-wider block mb-2">Compte Comptable</label>
      <select
        className="w-full bg-surface border border-outline-variant rounded-md px-3 py-2 text-body-sm font-medium text-on-surface focus:ring-1 focus:ring-primary outline-none"
        value={currentCompte}
        onChange={handleChange}
      >
        <option value="">Tous les comptes</option>
        {comptes.map((c) => (
          <option key={c.id} value={c.id}>{c.numero} - {c.libelle}</option>
        ))}
      </select>
    </div>
  );
}
