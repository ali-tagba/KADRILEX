"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

export function ExerciceFilter({ 
  exercices 
}: { 
  exercices: { id: string, libelle: string }[] 
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentExerciceId = searchParams.get("exerciceId") || "";

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams);
    if (e.target.value) {
      params.set("exerciceId", e.target.value);
    } else {
      params.delete("exerciceId");
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div>
      <label className="font-label-caps text-label-caps text-outline uppercase tracking-wider block mb-2">Exercice Comptable</label>
      <select 
        className="w-full bg-surface border border-outline-variant rounded-md px-3 py-2 text-body-sm font-medium text-on-surface focus:ring-1 focus:ring-primary outline-none"
        value={currentExerciceId}
        onChange={handleChange}
      >
        <option value="">Tous les exercices</option>
        {exercices.map(e => (
          <option key={e.id} value={e.id}>{e.libelle}</option>
        ))}
      </select>
    </div>
  );
}
