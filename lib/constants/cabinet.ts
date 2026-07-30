/**
 * Identité légale du cabinet — utilisée pour la génération des factures PDF,
 * en-têtes de documents, signatures email, etc.
 *
 * IMPORTANT : remplir les NIF / RCCM / coordonnées bancaires réelles avant prod.
 */

export const CABINET_INFO = {
    // Identité
    nomCommercial: "SCPA KADRI LEGAL",
    formeJuridique: "Société Civile Professionnelle d'Avocats",
    tagline: "Cabinet d'Avocats — Law Firm",

    // Coordonnées
    adresse: {
        ligne1: "Boulevard Mali Béro",
        ligne2: "Quartier Plateau",
        ville: "Niamey",
        codePostal: "BP 12345",
        pays: "Niger",
    },
    telephones: ["+227 20 35 00 00", "+227 96 00 00 00"],
    emails: ["contact@kadrilegal.net"],
    siteWeb: "www.kadrilegal.net",

    // Mentions légales obligatoires Niger
    rccm: "NI-NIA-2018-B-XXXX",
    nif: "20XXX-XXXX",
    armp: "ARMP-NI-XXXX", // Autorité de Régulation des Marchés Publics — si applicable
    cnaa: "Inscrit au Barreau du Niger", // Conseil National des Avocats du Niger

    // Banque
    banque: {
        nom: "Ecobank Niger",
        agence: "Agence Plateau",
        iban: "NE000 00000 00000 00000 00",
        swift: "ECOCNENI",
    },

    // TVA — Niger : 19% par défaut. Les honoraires d'avocats peuvent être exonérés
    // selon l'article 24 CGI Niger pour les prestations de services juridiques internes.
    tvaTaux: 19,
    mentionTVA: "TVA en sus si applicable selon l'article 24 du CGI",

    // Logo : chemin public dans public/ — fallback sur le nom serif si absent
    logoPath: "/cabinet-logo.png",
} as const

export type CabinetInfo = typeof CABINET_INFO
