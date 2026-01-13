import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

// Client table
export const clients = sqliteTable('Client', {
    id: text('id').primaryKey(),
    type: text('type').notNull(),

    // Personne Morale fields
    raisonSociale: text('raisonSociale'),
    formeJuridique: text('formeJuridique'),
    numeroRCCM: text('numeroRCCM'),
    representantLegal: text('representantLegal'),

    // Personne Physique fields
    nom: text('nom'),
    prenom: text('prenom'),
    profession: text('profession'),

    // Common fields
    email: text('email'),
    telephone: text('telephone'),
    adresse: text('adresse'),
    ville: text('ville'),
    pays: text('pays').notNull().default('Côte d\'Ivoire'),
    notes: text('notes'),
    createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
})

// Contact table
export const contacts = sqliteTable('Contact', {
    id: text('id').primaryKey(),
    clientId: text('clientId').notNull().references(() => clients.id, { onDelete: 'cascade' }),
    nom: text('nom').notNull(),
    prenom: text('prenom'),
    fonction: text('fonction').notNull(),
    email: text('email'),
    telephone: text('telephone'),
    estPrincipal: integer('estPrincipal', { mode: 'boolean' }).default(false),
    createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
})

// Dossier table
export const dossiers = sqliteTable('Dossier', {
    id: text('id').primaryKey(),
    numero: text('numero').notNull().unique(),
    clientId: text('clientId').notNull().references(() => clients.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    statut: text('statut').notNull().default('EN_COURS'),
    juridiction: text('juridiction'),
    dateOuverture: integer('dateOuverture', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
    dateCloture: integer('dateCloture', { mode: 'timestamp' }),
    description: text('description'),
    createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
})

// Audience table
export const audiences = sqliteTable('Audience', {
    id: text('id').primaryKey(),
    clientId: text('clientId').notNull().references(() => clients.id, { onDelete: 'cascade' }),
    dossierId: text('dossierId').notNull().references(() => dossiers.id, { onDelete: 'cascade' }),
    date: integer('date', { mode: 'timestamp' }).notNull(),
    heure: text('heure'),
    juridiction: text('juridiction'),
    titre: text('titre'),
    avocat: text('avocat'),
    statut: text('statut').notNull().default('A_VENIR'),
    notes: text('notes'),
    createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
})

// FlashCR table
export const flashCRs = sqliteTable('FlashCR', {
    id: text('id').primaryKey(),
    audienceId: text('audienceId').notNull().unique().references(() => audiences.id, { onDelete: 'cascade' }),
    clientId: text('clientId').notNull().references(() => clients.id, { onDelete: 'cascade' }),
    dossierId: text('dossierId').notNull().references(() => dossiers.id, { onDelete: 'cascade' }),
    contenu: text('contenu').notNull(),
    destinataires: text('destinataires').notNull(),
    statut: text('statut').notNull().default('BROUILLON'),
    createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
})

// Invoice table
export const invoices = sqliteTable('Invoice', {
    id: text('id').primaryKey(),
    numero: text('numero').notNull().unique(),
    date: integer('date', { mode: 'timestamp' }).notNull(),
    dateEcheance: integer('dateEcheance', { mode: 'timestamp' }),
    clientId: text('clientId').notNull().references(() => clients.id, { onDelete: 'cascade' }),
    dossierId: text('dossierId').references(() => dossiers.id, { onDelete: 'set null' }),
    audienceId: text('audienceId').references(() => audiences.id, { onDelete: 'set null' }),
    montantHT: real('montantHT').notNull(),
    montantTVA: real('montantTVA').notNull().default(0),
    montantTTC: real('montantTTC').notNull(),
    montantPaye: real('montantPaye').notNull().default(0),
    statut: text('statut').notNull().default('IMPAYEE'),
    methodePaiement: text('methodePaiement'),
    datePaiement: integer('datePaiement', { mode: 'timestamp' }),
    attachmentUrl: text('attachmentUrl'),
    notes: text('notes'),
    createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
})

// DossierFile table
export const dossierFiles = sqliteTable('DossierFile', {
    id: text('id').primaryKey(),
    dossierId: text('dossierId').notNull().references(() => dossiers.id, { onDelete: 'cascade' }),
    parentId: text('parentId'),
    name: text('name').notNull(),
    type: text('type').notNull(),
    url: text('url'),
    mimeType: text('mimeType'),
    size: integer('size'),
    createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
})
