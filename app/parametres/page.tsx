"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useCurrentUser } from "@/lib/auth/current-user-context"
import { patchEntity, showApiError } from "@/lib/api/patch"
import { toast } from "@/components/ui/toaster"
import { AccesCodeSection } from "@/components/equipe/acces-code-section"
import { MembreAvatar } from "@/components/equipe/membre-avatar"
import { FileUploadField, type AttachmentInfo } from "@/components/facturation/file-upload-field"
import { useTheme, type Theme } from "@/components/theme-provider"
import { ROLES, fullName } from "@/lib/constants/team"
import { MODES_PAIEMENT, type ModePaiementKey } from "@/lib/constants/finance"
import { CABINET_INFO } from "@/lib/constants/cabinet"
import type { Membre } from "@prisma/client"

export default function ParametresPage() {
    const router = useRouter()
    const { membre } = useCurrentUser()
    const [current, setCurrent] = useState<Membre>(membre as Membre)
    const [saving, setSaving] = useState(false)

    /* ============================================================
       Édition champs Membre — patch optimiste + rollback
       ============================================================ */
    const patchMe = async (patch: Partial<Membre>) => {
        const prev = current
        setCurrent((p) => ({ ...p, ...patch }))
        try {
            const updated = await patchEntity<Membre>(`/api/membres/${current.id}`, patch as Record<string, unknown>)
            setCurrent(updated)
        } catch (e) {
            setCurrent(prev)
            showApiError("Échec sauvegarde")(e)
        }
    }

    /* ============================================================
       Actions
       ============================================================ */
    async function handleLogout() {
        await fetch("/api/auth/logout", { method: "POST", credentials: "include" })
        router.push("/login")
        router.refresh()
    }

    function clearLocalFilters() {
        if (!confirm("Vider tous tes filtres et préférences d'affichage sauvegardés ?")) return
        try {
            const keys: string[] = []
            for (let i = 0; i < window.localStorage.length; i++) {
                const k = window.localStorage.key(i)
                if (k && k.startsWith("kadrilex:")) keys.push(k)
            }
            keys.forEach((k) => window.localStorage.removeItem(k))
            toast.success(`${keys.length} préférence${keys.length > 1 ? "s" : ""} effacée${keys.length > 1 ? "s" : ""}`)
        } catch {
            toast.error("Impossible d'accéder au stockage local")
        }
    }

    async function handlePhotoUpload(att: AttachmentInfo | null) {
        if (att) {
            await patchMe({ photoUrl: att.url })
        } else {
            await patchMe({ photoUrl: null })
        }
    }

    const role = ROLES[current.role]
    const isGerant = current.role === "ASSOCIE_GERANT"
    const { theme, setTheme } = useTheme()

    return (
        <div className="flex-1 overflow-y-auto scrollbar-thin">
            <div className="max-w-4xl mx-auto px-container-margin py-density-loose space-y-density-loose">
                {/* En-tête page */}
                <header className="space-y-1">
                    <p className="font-label-caps text-label-caps text-outline uppercase tracking-widest">
                        Paramètres
                    </p>
                    <h1 className="font-h1 text-h1 text-primary-container">Configuration</h1>
                    <p className="font-body-md text-body-md text-on-surface-variant">
                        Ton profil, ta sécurité, tes préférences et les informations du cabinet.
                    </p>
                </header>

                {/* ============================================================
                    Section 1 — Mon profil
                    ============================================================ */}
                <Section
                    icon="person"
                    title="Mon profil"
                    description="Informations personnelles visibles par l'équipe."
                >
                    <div className="flex items-start gap-4">
                        <MembreAvatar membre={current} size="lg" ring />
                        <div className="flex-1 space-y-1">
                            <p className="font-h2 text-h2 text-on-surface">
                                {fullName(current)}
                            </p>
                            <p className="font-body-sm text-body-sm text-on-surface-variant">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant font-label-caps text-[10px] uppercase">
                                    {role.label}
                                </span>
                                {current.fonction && <span className="ml-2">{current.fonction}</span>}
                            </p>
                            <p className="font-body-sm text-body-sm text-outline">
                                {current.email} · embauché{" "}
                                {new Date(current.dateEmbauche).toLocaleDateString("fr-FR", {
                                    month: "short",
                                    year: "numeric",
                                })}
                            </p>
                        </div>
                    </div>

                    <div className="mt-density-medium grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <FieldText
                            label="Téléphone"
                            value={current.telephone ?? ""}
                            onSave={(v) => patchMe({ telephone: v || null })}
                            placeholder="+227 90 00 00 00"
                        />
                        <FieldText
                            label="Fonction"
                            value={current.fonction ?? ""}
                            onSave={(v) => patchMe({ fonction: v || null })}
                            placeholder="Avocat collaborateur, juriste…"
                        />
                        <FieldText
                            label="Mobile Money"
                            value={current.mobileMoney ?? ""}
                            onSave={(v) => patchMe({ mobileMoney: v || null })}
                            placeholder="+227 90 00 00 00"
                        />
                        <FieldText
                            label="Banque"
                            value={current.banque ?? ""}
                            onSave={(v) => patchMe({ banque: v || null })}
                            placeholder="Ecobank Niger…"
                        />
                        <FieldText
                            label="RIB / IBAN"
                            value={current.rib ?? ""}
                            onSave={(v) => patchMe({ rib: v || null })}
                            placeholder="NE000 00000…"
                            mono
                            className="sm:col-span-2"
                        />
                        <FieldSelect
                            label="Mode de versement préféré (paie)"
                            value={current.modeVersementParDefaut ?? "VIREMENT"}
                            onSave={(v) => patchMe({ modeVersementParDefaut: v as ModePaiementKey })}
                            options={Object.entries(MODES_PAIEMENT).map(([k, m]) => ({
                                value: k,
                                label: m.label,
                            }))}
                            className="sm:col-span-2"
                        />
                    </div>

                    <div className="mt-density-medium border-t border-outline-variant/40 pt-density-medium">
                        <FileUploadField
                            label="Photo de profil"
                            hint="JPG ou PNG, 2 Mo max. Affichée dans la sidebar et l'équipe."
                            value={
                                current.photoUrl
                                    ? {
                                          name: "Photo actuelle",
                                          size: 0,
                                          url: current.photoUrl,
                                          type: "image/png",
                                      }
                                    : null
                            }
                            onChange={handlePhotoUpload}
                            category="documents"
                            accept="image/png,image/jpeg,image/webp"
                            maxSize={2 * 1024 * 1024}
                        />
                    </div>
                </Section>

                {/* ============================================================
                    Section 2 — Sécurité
                    ============================================================ */}
                <Section
                    icon="lock"
                    title="Sécurité"
                    description="Code d'accès et session active."
                >
                    <AccesCodeSection
                        membre={current}
                        onRegenerate={(newCode, generatedAt) => {
                            setCurrent((m) => ({
                                ...m,
                                codeAccesHash: newCode,
                                codeAccesGeneAt: new Date(generatedAt),
                            }))
                        }}
                    />
                    <div className="mt-density-medium bg-surface-container-low/40 border border-outline-variant rounded-lg p-density-medium space-y-2">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-body-md text-body-md font-medium text-on-surface">
                                    Session courante
                                </p>
                                <p className="font-body-sm text-[11px] text-outline">
                                    Dernière connexion :{" "}
                                    {current.derniereConnexion
                                        ? new Date(current.derniereConnexion).toLocaleString(
                                              "fr-FR",
                                              {
                                                  day: "2-digit",
                                                  month: "short",
                                                  year: "numeric",
                                                  hour: "2-digit",
                                                  minute: "2-digit",
                                              }
                                          )
                                        : "—"}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleLogout}
                                className="px-4 py-1.5 rounded border border-error/40 text-error font-body-sm text-body-sm hover:bg-error-container/30 transition-colors inline-flex items-center gap-1.5"
                            >
                                <span className="material-symbols-outlined text-[16px]">logout</span>
                                Se déconnecter
                            </button>
                        </div>
                    </div>
                </Section>

                {/* ============================================================
                    Section 3 — Apparence (mode clair / sombre)
                    ============================================================ */}
                <Section
                    icon="palette"
                    title="Apparence"
                    description="Choix du thème — utile pour le travail tardif ou les yeux fatigués."
                >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <ThemeOption
                            value="light"
                            current={theme}
                            onSelect={setTheme}
                            label="Mode clair"
                            sub="Sépia crème — par défaut"
                            preview={{
                                bg: "#fff8f4",
                                surface: "#fdf2e7",
                                text: "#201b15",
                                accent: "#c8772f",
                                border: "#d5c3b8",
                            }}
                        />
                        <ThemeOption
                            value="dark"
                            current={theme}
                            onSelect={setTheme}
                            label="Mode sombre"
                            sub="Noir confort — accents doré qui ressortent"
                            preview={{
                                bg: "#0a0a0a",
                                surface: "#1f1f1f",
                                text: "#fafafa",
                                accent: "#f0a040",
                                border: "#2e2e2e",
                            }}
                        />
                    </div>
                    <p className="mt-density-medium text-[11px] text-outline italic">
                        <span className="material-symbols-outlined text-[12px] align-middle">
                            info
                        </span>{" "}
                        Le choix est conservé sur ce navigateur. Toutes les pages s&apos;adaptent
                        instantanément.
                    </p>
                </Section>

                {/* ============================================================
                    Section 4 — Préférences locales
                    ============================================================ */}
                <Section
                    icon="tune"
                    title="Préférences d'affichage"
                    description="Filtres et vues sauvegardés en local sur ce navigateur."
                >
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div>
                            <p className="font-body-md text-body-md text-on-surface">
                                Tes filtres et vues sont sauvegardés automatiquement
                            </p>
                            <p className="font-body-sm text-[12px] text-on-surface-variant mt-0.5">
                                Vues table/galerie, filtres avancés, tris — restaurés à chaque
                                ouverture des modules clients, dossiers, audiences, tâches,
                                bibliothèque.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={clearLocalFilters}
                            className="px-3 py-1.5 rounded border border-outline-variant text-on-surface font-body-sm text-[12px] hover:bg-surface-container-low transition-colors inline-flex items-center gap-1.5 flex-shrink-0"
                        >
                            <span className="material-symbols-outlined text-[16px]">refresh</span>
                            Réinitialiser
                        </button>
                    </div>
                </Section>

                {/* ============================================================
                    Section 4 — Cabinet (lecture seule v1)
                    ============================================================ */}
                <Section
                    icon="account_balance"
                    title="Identité du cabinet"
                    description={
                        isGerant
                            ? "Édition complète à venir — modifiable via le fichier de configuration pour l'instant."
                            : "Informations légales du cabinet — consultation."
                    }
                >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <ReadField label="Nom commercial" value={CABINET_INFO.nomCommercial} />
                        <ReadField label="Forme juridique" value={CABINET_INFO.formeJuridique} />
                        <ReadField
                            label="Adresse"
                            value={`${CABINET_INFO.adresse.ligne1}, ${CABINET_INFO.adresse.ville}, ${CABINET_INFO.adresse.pays}`}
                            className="sm:col-span-2"
                        />
                        <ReadField label="RCCM" value={CABINET_INFO.rccm} mono />
                        <ReadField label="NIF" value={CABINET_INFO.nif} mono />
                        <ReadField
                            label="Téléphones"
                            value={CABINET_INFO.telephones.join(" / ")}
                            className="sm:col-span-2"
                        />
                        <ReadField
                            label="Email principal"
                            value={CABINET_INFO.emails[0] ?? "—"}
                        />
                        <ReadField label="Site web" value={CABINET_INFO.siteWeb} />
                        <ReadField label="Banque" value={CABINET_INFO.banque.nom} />
                        <ReadField label="IBAN" value={CABINET_INFO.banque.iban} mono />
                        <ReadField
                            label={`TVA (${CABINET_INFO.tvaTaux}%)`}
                            value={CABINET_INFO.mentionTVA}
                            className="sm:col-span-2"
                        />
                    </div>
                    {isGerant && (
                        <p className="mt-density-medium text-[11px] text-outline italic">
                            <span className="material-symbols-outlined text-[12px] align-middle">
                                info
                            </span>{" "}
                            En tant qu&apos;Associé Gérant, tu pourras éditer ces infos directement
                            depuis cette page dans une future version (table <code>Cabinet</code>{" "}
                            en cours d&apos;ajout).
                        </p>
                    )}
                </Section>

                {/* ============================================================
                    Section 5 — À propos
                    ============================================================ */}
                <Section
                    icon="info"
                    title="À propos de KadriLex"
                    description="Informations techniques et support."
                >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12px]">
                        <ReadField label="Application" value="KadriLex — gestion de cabinet juridique" />
                        <ReadField label="Version" value="Sprint 4 · interne" />
                        <ReadField label="Environnement" value="VPS dev (Hostinger)" />
                        <ReadField label="Devise" value="Franc CFA (XOF)" />
                        <ReadField label="Juridiction" value="Niger — OHADA" />
                        <ReadField label="Support" value={CABINET_INFO.emails[0] ?? "—"} />
                    </div>
                </Section>
            </div>
        </div>
    )
}

/* ============================================================
   Sub-composants
   ============================================================ */

function Section({
    icon,
    title,
    description,
    children,
}: {
    icon: string
    title: string
    description?: string
    children: React.ReactNode
}) {
    return (
        <section className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
            <header className="px-density-medium py-3 border-b border-outline-variant bg-surface-container flex items-start gap-3">
                <div className="w-9 h-9 rounded-md bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-accent text-[20px]">
                        {icon}
                    </span>
                </div>
                <div className="flex-1 min-w-0">
                    <h2 className="font-h2 text-h2 text-primary leading-tight">{title}</h2>
                    {description && (
                        <p className="font-body-sm text-[12px] text-on-surface-variant mt-0.5">
                            {description}
                        </p>
                    )}
                </div>
            </header>
            <div className="px-density-medium py-density-medium">{children}</div>
        </section>
    )
}

function FieldText({
    label,
    value,
    onSave,
    placeholder,
    mono,
    className,
}: {
    label: string
    value: string
    onSave: (next: string) => void | Promise<void>
    placeholder?: string
    mono?: boolean
    className?: string
}) {
    const [draft, setDraft] = useState(value)
    const isDirty = draft !== value
    return (
        <label className={cn("block", className)}>
            <span className="font-label-caps text-[10px] text-outline uppercase tracking-wider block mb-1">
                {label}
            </span>
            <div className="flex items-center gap-1">
                <input
                    type="text"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={() => isDirty && onSave(draft)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") (e.target as HTMLInputElement).blur()
                        if (e.key === "Escape") setDraft(value)
                    }}
                    placeholder={placeholder}
                    className={cn(
                        "flex-1 border border-outline-variant rounded px-3 py-2 bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40 font-body-md text-body-md",
                        mono && "font-mono-num text-mono-num"
                    )}
                />
                {isDirty && (
                    <button
                        type="button"
                        onClick={() => onSave(draft)}
                        className="p-2 rounded bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
                        title="Enregistrer"
                    >
                        <span className="material-symbols-outlined text-[16px]">check</span>
                    </button>
                )}
            </div>
        </label>
    )
}

function FieldSelect({
    label,
    value,
    onSave,
    options,
    className,
}: {
    label: string
    value: string
    onSave: (next: string) => void | Promise<void>
    options: { value: string; label: string }[]
    className?: string
}) {
    return (
        <label className={cn("block", className)}>
            <span className="font-label-caps text-[10px] text-outline uppercase tracking-wider block mb-1">
                {label}
            </span>
            <select
                value={value}
                onChange={(e) => onSave(e.target.value)}
                className="w-full border border-outline-variant rounded px-3 py-2 bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40 font-body-md text-body-md"
            >
                {options.map((o) => (
                    <option key={o.value} value={o.value}>
                        {o.label}
                    </option>
                ))}
            </select>
        </label>
    )
}

function ThemeOption({
    value,
    current,
    onSelect,
    label,
    sub,
    preview,
}: {
    value: Theme
    current: Theme
    onSelect: (t: Theme) => void
    label: string
    sub: string
    preview: { bg: string; surface: string; text: string; accent: string; border: string }
}) {
    const active = current === value
    return (
        <button
            type="button"
            onClick={() => onSelect(value)}
            className={cn(
                "text-left border rounded-lg p-3 transition-all flex items-start gap-3",
                active
                    ? "border-accent ring-2 ring-accent/40 bg-accent/5"
                    : "border-outline-variant hover:bg-surface-container-low"
            )}
        >
            {/* Mini-mockup du thème */}
            <div
                className="w-16 h-16 rounded-md border flex-shrink-0 overflow-hidden grid grid-cols-3 grid-rows-3 gap-px"
                style={{
                    backgroundColor: preview.bg,
                    borderColor: preview.border,
                }}
            >
                <div
                    className="col-span-1 row-span-3"
                    style={{ backgroundColor: preview.surface }}
                />
                <div
                    className="col-span-2 row-span-1 m-1 rounded-sm"
                    style={{ backgroundColor: preview.accent }}
                />
                <div
                    className="col-span-2 row-span-1 m-1 rounded-sm opacity-60"
                    style={{ backgroundColor: preview.text }}
                />
                <div
                    className="col-span-2 row-span-1 m-1 rounded-sm opacity-30"
                    style={{ backgroundColor: preview.text }}
                />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    <span className="font-body-md text-body-md font-semibold text-on-surface">
                        {label}
                    </span>
                    {active && (
                        <span className="material-symbols-outlined text-[16px] text-accent">
                            check_circle
                        </span>
                    )}
                </div>
                <p className="font-body-sm text-[12px] text-on-surface-variant mt-0.5">{sub}</p>
            </div>
        </button>
    )
}

function ReadField({
    label,
    value,
    mono,
    className,
}: {
    label: string
    value: string | null | undefined
    mono?: boolean
    className?: string
}) {
    return (
        <div className={cn("bg-surface-container-low/40 border border-outline-variant/60 rounded p-2.5", className)}>
            <div className="font-label-caps text-[9px] text-outline uppercase mb-0.5 tracking-wider">
                {label}
            </div>
            <div
                className={cn(
                    "text-[12px] text-on-surface font-medium",
                    mono && "font-mono-num"
                )}
            >
                {value || <span className="text-outline-variant font-normal">—</span>}
            </div>
        </div>
    )
}
