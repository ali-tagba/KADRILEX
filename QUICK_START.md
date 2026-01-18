# 🚀 Guide Rapide de Déploiement - KadriLex

## ⚡ Déploiement en 5 Étapes (20 minutes)

---

## 📍 ÉTAPE 1 : GitHub (5 min)

### 1.1 Créer le Repository
```
1. Aller sur : https://github.com/new
2. Repository name : kadrilex
3. Description : Solution de gestion pour cabinets juridiques au Niger
4. Visibility : Private (recommandé)
5. ⚠️ NE PAS cocher "Initialize with README"
6. Cliquer "Create repository"
```

### 1.2 Pousser le Code
```bash
cd "C:\Users\USER\Downloads\Dedalys (1).1-4515678458973055887\kadrilex"

git remote add origin https://github.com/VOTRE-USERNAME/kadrilex.git
git push -u origin main
```

✅ **Vérification** : Le code doit apparaître sur GitHub

---

## 📍 ÉTAPE 2 : Base de Données (5 min)

### Option A : Vercel Postgres (Recommandé)
```
1. Aller sur : https://vercel.com/dashboard
2. Cliquer "Storage" → "Create Database"
3. Sélectionner "Postgres"
4. Nom : kadrilex-db
5. Région : Europe West
6. Cliquer "Create"
7. Copier le DATABASE_URL
```

### Option B : Neon.tech (Gratuit)
```
1. Aller sur : https://neon.tech
2. Sign up / Login
3. "Create Project" → Nom : KadriLex
4. Copier la "Connection String"
```

✅ **Vérification** : Vous avez copié le `DATABASE_URL`

---

## 📍 ÉTAPE 3 : Déploiement Vercel (5 min)

### 3.1 Importer le Projet
```
1. Aller sur : https://vercel.com/new
2. Cliquer "Import Git Repository"
3. Sélectionner le repo "kadrilex"
4. Framework : Next.js (auto-détecté)
5. Root Directory : . (par défaut)
```

### 3.2 Configurer les Variables
```
1. Cliquer "Environment Variables"
2. Name : DATABASE_URL
3. Value : [Coller votre URL PostgreSQL]
4. Cliquer "Add"
5. Cliquer "Deploy"
```

✅ **Vérification** : Le déploiement démarre (barre de progression)

---

## 📍 ÉTAPE 4 : Initialiser la Base de Données (3 min)

### 4.1 Créer le fichier .env.local
```bash
# Dans le dossier kadrilex local
echo "DATABASE_URL=votre_url_postgres_ici" > .env.local
```

### 4.2 Exécuter les Migrations
```bash
npx prisma migrate deploy
```

### 4.3 Peupler la Base
```bash
npx prisma db seed
```

✅ **Vérification** : Vous devez voir "✅ Created 20 documents for bibliotheque"

---

## 📍 ÉTAPE 5 : Vérification (2 min)

### 5.1 Ouvrir l'Application
```
URL : https://kadrilex.vercel.app (ou votre URL Vercel)
```

### 5.2 Checklist Rapide
- [ ] ✅ Logo affiche "K" (pas "D")
- [ ] ✅ Titre "KadriLex" dans le navigateur
- [ ] ✅ Menu contient "Bibliothèque"
- [ ] ✅ Page Clients affiche 8 clients
- [ ] ✅ Téléphones commencent par +227
- [ ] ✅ Adresses mentionnent Niamey
- [ ] ✅ Page Bibliothèque affiche 20 documents

---

## 🎯 Commandes Essentielles

### Si les données ne s'affichent pas
```bash
npx prisma db seed
```

### Si erreur Prisma Client
```bash
npx prisma generate
vercel --prod
```

### Voir les logs Vercel
```
1. Aller sur vercel.com/dashboard
2. Sélectionner le projet kadrilex
3. Onglet "Deployments"
4. Cliquer sur le dernier déploiement
5. Voir "Function Logs"
```

---

## 📊 Données Incluses

Après le seed, vous aurez :
- ✅ 1 utilisateur (Maître Abdoulaye Kadri)
- ✅ 8 clients Niger (SONITEL, BIN, SONICHAR, Niger Lait + 4 particuliers)
- ✅ 18 dossiers juridiques
- ✅ 25 audiences
- ✅ 15 factures
- ✅ 10 Flash CR
- ✅ 20 documents (bibliothèque)

---

## 🆘 Problèmes Courants

### "Can't reach database server"
**Solution** : Vérifier que DATABASE_URL est bien dans Vercel et contient `?sslmode=require`

### "Table does not exist"
**Solution** : 
```bash
npx prisma migrate deploy
```

### "No data showing"
**Solution** :
```bash
npx prisma db seed
```

---

## ✅ C'est Terminé !

Votre application KadriLex est maintenant :
- ✅ Déployée sur Vercel
- ✅ Connectée à PostgreSQL
- ✅ Peuplée avec des données Niger/Niamey
- ✅ Prête pour présentation client

**URL de l'application** : `https://kadrilex.vercel.app`

---

## 📞 Besoin d'Aide ?

1. Consulter `DEPLOYMENT_INSTRUCTIONS.md` (guide détaillé)
2. Consulter `PROJECT_SUMMARY.md` (vue d'ensemble)
3. Vérifier les logs Vercel
4. Vérifier la documentation Prisma

---

**Temps total : ~20 minutes**  
**Difficulté : Facile** 🟢

🎉 **Félicitations ! KadriLex est en ligne !**
