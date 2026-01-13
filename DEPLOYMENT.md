# Guide de Déploiement pour Dedalys 🚀

Puisque vous souhaitez partager l'application avec 4-5 personnes et qu'elle doit être accessible même lorsque votre ordinateur est éteint, nous devons l'héberger sur le cloud.

La solution la plus simple, performante et **100% gratuite** pour votre application (Next.js + Base de données) est **Vercel** couplé avec **Vercel Postgres**.

## ⚠️ Important : Base de données
Actuellement, l'application utilise une base de données locale (`SQLite`). Cela fonctionne parfaitement sur votre ordinateur, mais sur le cloud (Vercel), les fichiers locaux ne sont pas sauvegardés définitivement.
Pour que vos futurs utilisateurs puissent créer des dossiers et que les données soient sauvegardées, nous devons passer à une base de données Cloud (PostgreSQL).

Voici la marche à suivre pas à pas :

## Étape 1 : Préparer le code sur GitHub
1. Créez un compte sur [GitHub](https://github.com) si vous n'en avez pas.
2. Créez un nouveau "Repository" (Dépôt) appelé `dedalys-app`.
3. Poussez votre code actuel vers ce dépôt.

## Étape 2 : Créer le projet sur Vercel
1. Allez sur [Vercel](https://vercel.com) et connectez-vous avec GitHub.
2. Cliquez sur **"Add New..."** > **"Project"**.
3. Importez le dépôt `dedalys-app`.
4. **NE DÉPLOYEZ PAS TOUT DE SUITE.** (Ou si vous le faites, le déploiement échouera ou sera incomplet, ce n'est pas grave).

## Étape 3 : Ajouter la Base de Données (Gratuite)
1. Dans votre projet Vercel, allez dans l'onglet **"Storage"**.
2. Cliquez sur **"Create Database"** > **"Postgres"**.
3. Acceptez les conditions (Free tier).
4. Une fois créée, allez dans la section **".env.local"** de la base de données sur Vercel, cliquez sur **"Show Secret"** et copiez les variables.
5. Vercel ajoute automatiquement ces variables d'environnement à votre projet (`POSTGRES_PRISMA_URL`, etc.).

## Étape 4 : Mettre à jour Prisma pour Postgres
C'est la seule modification de code nécessaire.

1. Ouvrez le fichier `prisma/schema.prisma`.
2. Modifiez le bloc `datasource` comme suit :

```prisma
// AVANT (SQLite)
// datasource db {
//   provider = "sqlite"
//   url      = env("DATABASE_URL")
// }

// APRÈS (PostgreSQL)
datasource db {
  provider = "postgresql"
  url = env("POSTGRES_PRISMA_URL") // Utilise l'URL de Vercel Postgres
  directUrl = env("POSTGRES_URL_NON_POOLING") // Requis pour certaines migrations
}
```

3. Commitez et poussez ce changement sur GitHub. Vercel va lancer un nouveau déploiement automatiquement.

## Étape 5 : Initialiser les données (Seed) sur le Cloud
Pour que vos utilisateurs voient les données fictives (Clients, Dossiers...) que j'ai créées :

1. Sur votre ordinateur (localement), créez un fichier `.env` avec les identifiants de Vercel Postgres (que vous avez copiés à l'étape 3).
   ```env
   POSTGRES_PRISMA_URL="...votre_url_vercel..."
   POSTGRES_URL_NON_POOLING="...votre_url_direct..."
   ```
2. Ouvrez votre terminal dans le dossier du projet.
3. Lancez la commande pour créer les tables sur le cloud :
   `npx prisma db push`
4. Lancez la commande pour remplir la base avec les données fictives :
   `npx prisma db seed`

## Résultat
Une fois ces étapes terminées :
1. Vercel va redéployer l'application (onglet "Deployments").
2. Vous aurez une URL du type `https://dedalys-app.vercel.app`.
3. Vous pourrez l'envoyer à vos 4-5 testeurs.
4. Ils pourront créer des clients, des dossiers, etc., et tout sera sauvegardé en temps réel, même si votre PC est éteint ! 🎉
