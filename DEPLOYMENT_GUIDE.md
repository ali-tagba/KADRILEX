# Guide de Déploiement - KadriLex

## 📋 Étapes de Déploiement

### 1. Créer une base de données PostgreSQL

Vous avez plusieurs options :

**Option A - Vercel Postgres (Recommandé)**
1. Aller sur https://vercel.com/dashboard
2. Créer un nouveau projet
3. Aller dans l'onglet "Storage"
4. Créer une base de données Postgres
5. Copier le `DATABASE_URL`

**Option B - Neon.tech (Gratuit)**
1. Aller sur https://neon.tech
2. Créer un compte gratuit
3. Créer un nouveau projet
4. Copier la `Connection String`

**Option C - Supabase (Gratuit)**
1. Aller sur https://supabase.com
2. Créer un nouveau projet
3. Aller dans "Project Settings" > "Database"
4. Copier la `Connection String` (mode "Session")

### 2. Configurer le projet localement

```bash
# Naviguer vers le projet
cd kadrilex

# Installer les dépendances
npm install

# Créer le fichier .env
echo "DATABASE_URL=votre_url_de_base_de_données" > .env

# Générer le client Prisma
npx prisma generate

# Exécuter les migrations
npx prisma migrate dev --name init

# Peupler la base de données
npx prisma db seed
```

### 3. Tester localement

```bash
# Lancer le serveur de développement
npm run dev
```

Ouvrir http://localhost:3000 et vérifier que :
- ✅ L'application affiche "KadriLex" (pas "Dedalys")
- ✅ Les clients affichent des noms nigériens
- ✅ Les numéros de téléphone commencent par +227
- ✅ Les adresses mentionnent Niamey
- ✅ Les juridictions sont celles du Niger

### 4. Créer un repository GitHub

```bash
# Initialiser Git (si pas déjà fait)
git init

# Ajouter tous les fichiers
git add .

# Créer le premier commit
git commit -m "Initial commit - KadriLex Niger"

# Créer un nouveau repository sur GitHub
# Puis lier le repository local

git remote add origin https://github.com/votre-username/kadrilex.git
git branch -M main
git push -u origin main
```

### 5. Déployer sur Vercel

**Via l'interface web :**
1. Aller sur https://vercel.com
2. Cliquer sur "New Project"
3. Importer le repository GitHub `kadrilex`
4. Configurer les variables d'environnement :
   - `DATABASE_URL` : Votre URL de base de données PostgreSQL
5. Cliquer sur "Deploy"

**Via la CLI :**
```bash
# Installer Vercel CLI
npm i -g vercel

# Se connecter
vercel login

# Déployer
vercel

# Configurer les variables d'environnement
vercel env add DATABASE_URL

# Déployer en production
vercel --prod
```

### 6. Vérification post-déploiement

Une fois déployé, vérifier :
- ✅ L'application est accessible via l'URL Vercel
- ✅ Les données Niger/Niamey s'affichent correctement
- ✅ Tous les modules fonctionnent (Clients, Dossiers, Audiences, Flash CR, Facturation)
- ✅ Les formulaires de création fonctionnent
- ✅ La navigation est fluide

## 🔧 Variables d'environnement requises

```env
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"
```

## 📊 Structure de la base de données

La base de données sera automatiquement créée avec :
- 1 utilisateur (Maître Abdoulaye Kadri)
- 8 clients (4 entreprises + 4 particuliers)
- 18 dossiers
- 25 audiences
- 15 factures
- 10 Flash CR
- 100+ fichiers et dossiers

## 🚨 Dépannage

**Erreur : "Can't reach database server"**
- Vérifier que le `DATABASE_URL` est correct
- Vérifier que la base de données est accessible depuis Vercel
- S'assurer que `?sslmode=require` est ajouté à l'URL

**Erreur : "Prisma Client not generated"**
```bash
npx prisma generate
```

**Les données ne s'affichent pas**
```bash
# Réinitialiser et repeupler la base
npx prisma migrate reset
npx prisma db seed
```

## 📞 Support

Pour toute question, contacter l'administrateur du projet.
