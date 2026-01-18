# KadriLex - Gestion de Cabinet Juridique

Solution complète de gestion pour cabinets juridiques au Niger.

## 🚀 Déploiement

### Prérequis
- Node.js 20+
- PostgreSQL database
- Compte Vercel (pour le déploiement)

### Installation locale

```bash
# Installer les dépendances
npm install

# Configurer la base de données
# Créer un fichier .env avec DATABASE_URL

# Générer le client Prisma
npx prisma generate

# Exécuter les migrations
npx prisma migrate dev

# Peupler la base de données avec les données Niger/Niamey
npx prisma db seed

# Lancer le serveur de développement
npm run dev
```

L'application sera accessible sur `http://localhost:3000`

### Déploiement sur Vercel

1. Créer un nouveau projet sur Vercel
2. Connecter ce repository GitHub
3. Configurer les variables d'environnement :
   - `DATABASE_URL` : URL de connexion PostgreSQL
4. Déployer

## 📊 Données de démonstration

L'application est pré-remplie avec des données fictives adaptées au contexte nigérien :
- 8 clients (4 entreprises nigériennes + 4 particuliers)
- 18 dossiers juridiques
- 25 audiences
- 15 factures
- Juridictions du Niger (Tribunal de Commerce de Niamey, Cour d'Appel de Niamey, etc.)

## 🏢 Entreprises fictives incluses

- **SONITEL** - Société Nigérienne des Télécommunications
- **Banque Islamique du Niger (BIN)**
- **SONICHAR** - Société Nigérienne du Charbon
- **Niger Lait SARL**

## 📱 Contact

Pour toute question concernant cette application, veuillez contacter l'administrateur.

## 📄 Licence

Propriétaire - Tous droits réservés
