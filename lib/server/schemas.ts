/**
 * Schémas Zod partagés (validation payloads API).
 *
 * Convention : `XxxCreateSchema` (POST) et `XxxUpdateSchema` (PATCH partial).
 */

import { z } from "zod"

/* ============================================================
   Enums Prisma — recopiés en Zod pour validation côté serveur
   ============================================================ */

const ClientTypeEnum = z.enum(["PERSONNE_MORALE", "PERSONNE_PHYSIQUE"])
const DossierKindEnum = z.enum(["CLIENT", "ADMIN"])
const DossierTypeEnum = z.enum([
    "CIVIL", "COMMERCIAL", "PENAL", "ADMINISTRATIF", "SOCIAL", "COUTUMIERE", "AUTRE",
])
const DossierStatutEnum = z.enum([
    "EN_COURS", "EN_ATTENTE", "URGENT", "CLOTURE", "TERMINE", "ARCHIVE",
])
const FileTypeEnum = z.enum(["FOLDER", "FILE"])

/* ============================================================
   CLIENT
   ============================================================ */

const ClientBaseShape = z.object({
    type: ClientTypeEnum,
    // PM
    raisonSociale: z.string().min(1).max(200).optional().nullable(),
    formeJuridique: z.string().max(50).optional().nullable(),
    numeroRCCM: z.string().max(50).optional().nullable(),
    nif: z.string().max(50).optional().nullable(),
    conventionnee: z.boolean().optional().nullable(),
    siegeSocial: z.string().max(300).optional().nullable(),
    representantLegal: z.string().max(200).optional().nullable(),
    // PP
    nom: z.string().min(1).max(100).optional().nullable(),
    prenom: z.string().min(1).max(100).optional().nullable(),
    profession: z.string().max(100).optional().nullable(),
    pieceIdentite: z.string().max(50).optional().nullable(),
    nationalite: z.string().max(100).optional().nullable(),
    dateNaissance: z.string().datetime().optional().nullable(),
    lieuNaissance: z.string().max(100).optional().nullable(),
    whatsapp: z.string().max(30).optional().nullable(),
    // Communs
    email: z.string().email().optional().nullable(),
    telephone: z.string().max(30).optional().nullable(),
    adresse: z.string().max(300).optional().nullable(),
    ville: z.string().max(100).optional().nullable(),
    pays: z.string().max(50).default("Niger"),
    notes: z.string().optional().nullable(),
    iconHint: z.string().max(50).optional(),
    honorairesConvenus: z.string().max(100).optional().nullable(),
    actif: z.boolean().default(true),
    responsableId: z.string().optional().nullable(),
    equipeIds: z.array(z.string()).default([]),
    /** Permet de corriger la date d'entrée du client (ex : correction après import) */
    createdAt: z.string().datetime().optional().nullable(),
})

export const ClientCreateSchema = ClientBaseShape.refine(
    (d) =>
        (d.type === "PERSONNE_MORALE" && d.raisonSociale) ||
        (d.type === "PERSONNE_PHYSIQUE" && d.nom),
    { message: "raisonSociale requis pour PM, nom requis pour PP" }
)

export const ClientUpdateSchema = ClientBaseShape.partial()

export const ContactCreateSchema = z.object({
    nom: z.string().min(1).max(100),
    prenom: z.string().max(100).optional().nullable(),
    fonction: z.string().max(100).optional().nullable(),
    email: z.string().email().optional().nullable(),
    telephone: z.string().max(30).optional().nullable(),
})

export const ContactUpdateSchema = ContactCreateSchema.partial()

/* ============================================================
   DOSSIER
   ============================================================ */

const DossierBaseShape = z.object({
    kind: DossierKindEnum.default("CLIENT"),
    type: DossierTypeEnum,
    nature: z.string().min(1).max(100),
    titre: z.string().min(1).max(300),
    statut: DossierStatutEnum.default("EN_COURS"),
    etatProcedure: z.string().max(200).optional().nullable(),
    juridiction: z.string().max(200).optional().nullable(),
    clientId: z.string().optional().nullable(),
    partiesAdverses: z.array(z.string()).default([]),
    dateOuverture: z.string().datetime().optional(),
    description: z.string().optional().nullable(),
    honoraires: z.array(z.any()).optional().nullable(),
    provisionsVersees: z.array(z.any()).optional().nullable(),
    retrocession: z.any().optional().nullable(),
    responsableId: z.string().optional().nullable(),
    equipeIds: z.array(z.string()).default([]),
})

export const DossierCreateSchema = DossierBaseShape.refine(
    (d) => d.kind === "ADMIN" || !!d.clientId,
    { message: "clientId requis si kind=CLIENT" }
)

export const DossierUpdateSchema = z
    .object({
        type: DossierTypeEnum,
        nature: z.string().min(1).max(100),
        titre: z.string().min(1).max(300),
        statut: DossierStatutEnum,
        etatProcedure: z.string().max(200).nullable(),
        juridiction: z.string().max(200).nullable(),
        partiesAdverses: z.array(z.string()),
        dateOuverture: z.string().datetime(),
        dateCloture: z.string().datetime().nullable(),
        description: z.string().nullable(),
        honoraires: z.array(z.any()).nullable(),
        provisionsVersees: z.array(z.any()).nullable(),
        retrocession: z.any().nullable(),
        responsableId: z.string().nullable(),
        equipeIds: z.array(z.string()),
    })
    .partial()

export const DossierNoteCreateSchema = z.object({
    contenu: z.string().min(1).max(5000),
})

/* ============================================================
   AUDIENCE
   ============================================================ */

const AudienceNatureEnum = z.enum([
    "PLAIDOIRIE", "MISE_EN_ETAT", "REFERE", "CONCILIATION", "DELIBERE", "RENVOI", "AUTRE",
])
const AudienceStatutEnum = z.enum(["A_VENIR", "TERMINEE", "REPORTEE", "ANNULEE"])
const ResultatAudienceEnum = z.enum([
    "RENVOI", "PLAIDOIRIE", "DELIBERE", "DELIBERE_RABATTU", "DELIBERE_PROROGE", "DECISION_RENDUE",
])

export const AudienceCreateSchema = z.object({
    titre: z.string().min(1).max(300),
    nature: AudienceNatureEnum,
    statut: AudienceStatutEnum.default("A_VENIR"),
    dateDebut: z.string().datetime(),
    dureeMinutes: z.number().int().positive().default(60),
    juridiction: z.string().max(200).optional().nullable(),
    salleAudience: z.string().max(100).optional().nullable(),
    // Dossier ET client optionnels : audience « sèche » possible.
    dossierId: z.string().optional().nullable(),
    clientId: z.string().optional().nullable(),
    responsableId: z.string().optional().nullable(),
    equipeIds: z.array(z.string()).default([]),
    notes: z.string().optional().nullable(),
})

const AudienceBaseUpdate = z.object({
    titre: z.string().min(1).max(300),
    nature: AudienceNatureEnum,
    statut: AudienceStatutEnum,
    dateDebut: z.string().datetime(),
    dureeMinutes: z.number().int().positive(),
    juridiction: z.string().max(200).nullable(),
    salleAudience: z.string().max(100).nullable(),
    dossierId: z.string().nullable(),
    clientId: z.string().nullable(),
    responsableId: z.string().nullable(),
    equipeIds: z.array(z.string()),
    notes: z.string().nullable(),
    compteRendu: z.string().nullable(),
    resultat: ResultatAudienceEnum.nullable(),
})

/** PATCH partial. La transition A_VENIR → TERMINEE est validée dans la route handler. */
export const AudienceUpdateSchema = AudienceBaseUpdate.partial()

/* ============================================================
   TÂCHE
   ============================================================ */

const TacheStatutEnum = z.enum(["A_FAIRE", "EN_COURS", "FAIT", "ANNULE"])
const TachePrioriteEnum = z.enum(["BASSE", "MOYENNE", "HAUTE", "URGENTE"])

export const TacheCreateSchema = z.object({
    titre: z.string().min(1).max(300),
    description: z.string().optional().nullable(),
    statut: TacheStatutEnum.default("A_FAIRE"),
    priorite: TachePrioriteEnum.default("MOYENNE"),
    echeance: z.string().datetime().optional().nullable(),
    responsableId: z.string().optional().nullable(),
    equipeIds: z.array(z.string()).default([]),
    clientId: z.string().optional().nullable(),
    dossierId: z.string().optional().nullable(),
    audienceId: z.string().optional().nullable(),
})

export const TacheUpdateSchema = z.object({
    titre: z.string().min(1).max(300),
    description: z.string().nullable(),
    statut: TacheStatutEnum,
    priorite: TachePrioriteEnum,
    echeance: z.string().datetime().nullable(),
    responsableId: z.string().nullable(),
    equipeIds: z.array(z.string()),
    clientId: z.string().nullable(),
    dossierId: z.string().nullable(),
    audienceId: z.string().nullable(),
}).partial()

/* ============================================================
   DILIGENCE
   ============================================================ */

const DiligenceTypeEnum = z.enum([
    "CONCLUSIONS", "ASSIGNATION", "ACTE_APPEL", "POURVOI_CASSATION",
    "SIGNIFICATION", "REQUETE", "CONSTITUTION", "DEPOT_PIECES", "SOMMATION",
    "RELANCE", "CONSULTATION", "PREPARATION_PLAIDOIRIE", "RDV_CLIENT", "AUTRE",
])
const DiligenceStatutEnum = z.enum(["A_FAIRE", "EN_COURS", "ACCOMPLIE", "ANNULEE"])

export const DiligenceCreateSchema = z.object({
    titre: z.string().min(1).max(300),
    description: z.string().optional().nullable(),
    type: DiligenceTypeEnum.default("AUTRE"),
    statut: DiligenceStatutEnum.default("A_FAIRE"),
    priorite: TachePrioriteEnum.default("MOYENNE"),
    dateEcheance: z.string().datetime().optional().nullable(),
    responsableId: z.string().optional().nullable(),
    equipeIds: z.array(z.string()).default([]),
    clientId: z.string().optional().nullable(),
    dossierId: z.string().optional().nullable(),
    audienceId: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
})

export const DiligenceUpdateSchema = z.object({
    titre: z.string().min(1).max(300),
    description: z.string().nullable(),
    type: DiligenceTypeEnum,
    statut: DiligenceStatutEnum,
    priorite: TachePrioriteEnum,
    dateEcheance: z.string().datetime().nullable(),
    dateAccomplie: z.string().datetime().nullable(),
    responsableId: z.string().nullable(),
    equipeIds: z.array(z.string()),
    clientId: z.string().nullable(),
    dossierId: z.string().nullable(),
    audienceId: z.string().nullable(),
    notes: z.string().nullable(),
}).partial()

/* ============================================================
   DOCUMENT (Bibliothèque)
   ============================================================ */

const DocCategorieEnum = z.enum([
    "JURISPRUDENCE", "DECISION_JUSTICE", "DOCTRINE", "MODELE", "INTERNE", "AUTRE",
])
const DocTypeEnum = z.enum([
    "ARRET", "JUGEMENT", "ORDONNANCE", "AVIS", "DECRET", "LOI", "ARTICLE",
    "OUVRAGE", "THESE", "MEMOIRE", "NOTE", "COMMENTAIRE", "CHRONIQUE",
    "CONTRAT", "PROCEDURE", "FORMULAIRE", "AUTRE",
])
const DomaineJuridiqueEnum = z.enum([
    "AFFAIRES", "SOCIAL", "ADMINISTRATIF", "INVESTISSEMENT", "TIC", "FISCAL",
    "BANCAIRE", "RECOUVREMENT", "OHADA", "CIVIL", "COMMERCIAL", "PENAL",
    "TRAVAIL", "PROPRIETE_INTELLECTUELLE", "MINIER_PETROLIER", "FONCIER",
    "COUTUMIER", "CONSTITUTIONNEL", "INTL", "AUTRE",
])
const NiveauJuridictionEnum = z.enum([
    "INSTANCE", "GRANDE_INSTANCE", "COMMERCE", "ADMIN", "APPEL",
    "ETAT", "SUPREME", "CCJA", "ARBITRAL", "AUTRE",
])
const IssueJurisEnum = z.enum(["FAVORABLE", "DEFAVORABLE", "MIXTE", "NA"])
const DocStatutEnum = z.enum(["ACTIF", "ARCHIVE"])

export const DocumentCreateSchema = z.object({
    titre: z.string().min(1).max(300),
    categorie: DocCategorieEnum,
    type: DocTypeEnum.optional().nullable(),
    domaineJuridique: DomaineJuridiqueEnum.optional().nullable(),
    juridiction: z.string().max(200).optional().nullable(),
    niveauJuridiction: NiveauJuridictionEnum.optional().nullable(),
    reference: z.string().max(100).optional().nullable(),
    dateDocument: z.string().datetime().optional().nullable(),
    description: z.string().optional().nullable(),
    /** Accepte string CSV ou array. Normalisé en array côté route. */
    tags: z
        .union([z.array(z.string()), z.string()])
        .transform((v) =>
            typeof v === "string"
                ? v.split(",").map((s) => s.trim()).filter(Boolean)
                : v
        )
        .default([]),
    auteur: z.string().max(200).optional().nullable(),
    source: z.string().max(300).optional().nullable(),
    notes: z.string().optional().nullable(),
    fileName: z.string().max(300).optional().nullable(),
    fileSize: z.number().int().nonnegative().optional().nullable(),
    fileUrl: z.string().optional().nullable(),
    articlesCites: z.string().optional().nullable(),
    issue: IssueJurisEnum.optional().nullable(),
    estFavori: z.boolean().default(false),
    statut: DocStatutEnum.optional(),
})

export const DocumentUpdateSchema = DocumentCreateSchema.partial()

export const DocumentLinkDossierSchema = z.object({
    dossierId: z.string(),
})

/* ============================================================
   MEMBRE (Équipe)
   ============================================================ */

const RoleEnum = z.enum([
    "ASSOCIE_GERANT", "ASSOCIE", "AVOCAT", "JURISTE", "STAGIAIRE", "SECRETAIRE",
])
const StatutContratEnum = z.enum([
    "ASSOCIE", "COLLABORATEUR_CDI", "COLLABORATEUR_CDD",
    "STAGIAIRE", "SECRETAIRE_CDI", "FREELANCE",
])
const InvitationStatutEnum = z.enum(["ACTIF", "INVITE", "JAMAIS_CONNECTE", "DESACTIVE"])
const ModePaiementEnum = z.enum([
    "VIREMENT", "MOBILE_MONEY", "ESPECES", "CHEQUE", "CARTE", "PRELEVEMENT", "AUTRE",
])

export const MembreCreateSchema = z.object({
    prenom: z.string().min(1).max(100),
    nom: z.string().min(1).max(100),
    email: z.string().email().max(200),
    role: RoleEnum,
    telephone: z.string().max(30).optional().nullable(),
    photoUrl: z.string().optional().nullable(),
    dateEmbauche: z.string().datetime(),
    statutContrat: StatutContratEnum,
    fonction: z.string().max(200).optional().nullable(),
    salaireBaseBrut: z.number().int().nonnegative().default(0),
    rib: z.string().max(100).optional().nullable(),
    banque: z.string().max(100).optional().nullable(),
    mobileMoney: z.string().max(30).optional().nullable(),
    modeVersementParDefaut: ModePaiementEnum.default("VIREMENT"),
    notes: z.string().optional().nullable(),
    permissionsOverrides: z.record(z.string(), z.enum(["ALL", "OWN", "NONE"])).optional().nullable(),
})

export const MembreUpdateSchema = MembreCreateSchema.partial().extend({
    actif: z.boolean().optional(),
    invitationStatut: InvitationStatutEnum.optional(),
})

export const MembreDeactivateSchema = z.object({
    /** Membre vers qui transférer les entités (Client/Dossier/Audience/Tache) dont
     *  le désactivé est responsable. */
    transfertVers: z.string(),
    motifSortie: z.string().max(500).optional().nullable(),
})

/* ============================================================
   FACTURE
   ============================================================ */

const FactureDirectionEnum = z.enum(["EMISE", "RECUE"])
const FactureStatutEnum = z.enum([
    "BROUILLON", "EMISE", "PARTIELLE", "PAYEE", "EN_RETARD", "ANNULEE",
])
const FactureTypeEnum = z.enum(["HONORAIRES", "PROVISION", "FRAIS", "AUTRE"])

export const FactureLigneSchema = z.object({
    libelle: z.string().min(1).max(300),
    quantite: z.number().positive().default(1),
    prixUnitaire: z.number().int().nonnegative(),
    total: z.number().int().nonnegative().optional(),
    audienceId: z.string().optional().nullable(),
})

export const FactureCreateSchema = z.object({
    direction: FactureDirectionEnum,
    type: FactureTypeEnum.default("HONORAIRES"),
    date: z.string().datetime(),
    dateEcheance: z.string().datetime().optional().nullable(),
    clientId: z.string().optional().nullable(),
    dossierId: z.string().optional().nullable(),
    audienceId: z.string().optional().nullable(),
    fournisseurId: z.string().optional().nullable(),
    fournisseurNomLibre: z.string().max(200).optional().nullable(),
    montantHT: z.number().nonnegative(),
    tvaRate: z.number().nonnegative().default(19),
    description: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    statut: FactureStatutEnum.default("EMISE"),
    refacturable: z.boolean().default(false),
    lignes: z.array(FactureLigneSchema).default([]),
    /** Path Supabase Storage de la pièce jointe (PDF facture, devis…) */
    attachmentUrl: z.string().optional().nullable(),
})

export const FactureUpdateSchema = FactureCreateSchema.partial()

export const PaiementCreateSchema = z.object({
    date: z.string().datetime(),
    montant: z.number().int().positive(),
    mode: z.enum(["VIREMENT", "MOBILE_MONEY", "ESPECES", "CHEQUE", "CARTE", "PRELEVEMENT", "AUTRE"]),
    reference: z.string().max(100).optional().nullable(),
    notes: z.string().optional().nullable(),
    /** Preuve uploadée (path Supabase Storage) — optionnel */
    preuveUrl: z.string().optional().nullable(),
})

export const RefactureBatchSchema = z.object({
    /** Liste de Factures RECUE avec refacturable=true et pas encore refacturées. */
    factureIds: z.array(z.string()).min(1),
    /** Client cible (souvent celui du dossier). */
    clientId: z.string(),
    /** Dossier cible — optionnel mais habituel. */
    dossierId: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
})

/* ============================================================
   DEPENSE
   ============================================================ */

const CategorieDepenseEnum = z.enum([
    "LOYER", "ELECTRICITE", "EAU", "INTERNET", "TELEPHONE", "FOURNITURES", 
    "CARBURANT", "REPARATION", "ENTRETIEN", "HOTEL", "VOYAGE", "RESTAURATION",
    "FOURNISSEURS", "ABONNEMENT_SOFTWARE", "FORMATION", "COTISATIONS",
    "ASSURANCE", "SALAIRES", "TAXES", "IMPOTS", "FRAIS_BANCAIRES", "DIVERS", "AUTRE", "MAINTENANCE", "SOUS_TRAITANCE", "HONORAIRES"
])
const FrequenceRecurrenceEnum = z.enum(["MENSUEL", "TRIMESTRIEL", "SEMESTRIEL", "ANNUEL"])

export const DepenseCreateSchema = z.object({
    libelle: z.string().min(1).max(300),
    categorie: CategorieDepenseEnum,
    date: z.string().datetime(),
    montantHT: z.number().nonnegative(),
    tvaRate: z.number().nonnegative().default(0),
    mode: z.enum(["VIREMENT", "MOBILE_MONEY", "ESPECES", "CHEQUE", "CARTE", "PRELEVEMENT", "AUTRE"]),
    reference: z.string().max(100).optional().nullable(),
    recurrent: z.boolean().default(false),
    recurrenceFrequence: FrequenceRecurrenceEnum.optional().nullable(),
    fournisseurId: z.string().optional().nullable(),
    fournisseurNomLibre: z.string().max(200).optional().nullable(),
    employeId: z.string().optional().nullable(),
    dossierId: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    statut: z.enum(["PAYEE", "A_PAYER"]).default("PAYEE"),
    /** Path Supabase Storage du justificatif (reçu, facture…) */
    attachmentUrl: z.string().optional().nullable(),
})

export const DepenseUpdateSchema = DepenseCreateSchema.partial()

/* ============================================================
   BULLETIN
   ============================================================ */

const BulletinStatutEnum = z.enum(["BROUILLON", "VALIDE", "VERSE"])

export const BulletinCreateSchema = z.object({
    employeId: z.string(),
    annee: z.number().int().min(2000).max(2100),
    mois: z.number().int().min(1).max(12),
    salaireBrut: z.number().int().nonnegative(),
    primes: z.number().int().nonnegative().default(0),
    retenues: z.number().int().nonnegative().default(0),
    statut: BulletinStatutEnum.default("BROUILLON"),
    notes: z.string().optional().nullable(),
})

export const BulletinUpdateSchema = z.object({
    salaireBrut: z.number().int().nonnegative(),
    primes: z.number().int().nonnegative(),
    retenues: z.number().int().nonnegative(),
    statut: BulletinStatutEnum,
    dateVersement: z.string().datetime().nullable(),
    modeVersement: z.enum(["VIREMENT", "MOBILE_MONEY", "ESPECES", "CHEQUE", "CARTE", "PRELEVEMENT", "AUTRE"]).nullable(),
    reference: z.string().max(100).nullable(),
    notes: z.string().nullable(),
}).partial()

/* ============================================================
   PARTAGE
   ============================================================ */

export const PartageCreateSchema = z.object({
    toMembreId: z.string().min(1),
    entityType: z.enum([
        "CLIENT", "DOSSIER", "AUDIENCE", "TACHE",
        "DOCUMENT", "FACTURE", "BULLETIN", "DEPENSE",
    ]),
    entityId: z.string().min(1),
    entityNumero: z.string().max(50).optional().nullable(),
    entityLabel: z.string().max(300).optional().nullable(),
    message: z.string().max(2000).optional().nullable(),
})

/* ============================================================
   DOSSIER FILE
   ============================================================ */

export const DossierFileCreateSchema = z.object({
    parentId: z.string().nullable().optional(),
    name: z.string().min(1).max(200),
    type: FileTypeEnum,
    mimeType: z.string().max(100).optional().nullable(),
    size: z.number().int().nonnegative().optional().nullable(),
    url: z.string().optional().nullable(),
    couleur: z.string().max(20).optional().nullable(),
})

export const DossierFileUpdateSchema = z.object({
    name: z.string().min(1).max(200).optional(),
    parentId: z.string().nullable().optional(),
    couleur: z.string().max(20).nullable().optional(),
})
