# 🎷 Mon Planner

Application tout-en-un (Next.js + PostgreSQL / Drizzle) pour un lycéen musicien :

| Section | Ce que ça fait |
| --- | --- |
| **Accueil** | Planning du jour, habitudes, calories, temps de sax, sport, échéances, bilan sommeil/humeur |
| **Emploi du temps** | Cours récurrents (jours multiples, semaines A/B, période de validité), événements ponctuels, annulation d'un seul jour, duplication |
| **À faire** | Devoirs, contrôles, projets, auditions/concerts avec compte à rebours |
| **Notes** | Moyennes par matière et générale (coefficients) |
| **Habitudes** | Ajout / suppression / modification, check par jour, séries (streaks), calendrier de régularité |
| **Saxophone** | Séances de travail (type, morceau, tempo, qualité), chrono, objectif hebdo, répertoire avec tempo cible et échéance |
| **Partitions** | Photos/scans de partitions (compressés dans le navigateur, stockés en base), lecteur plein écran, tags, recherche |
| **Outils** | Métronome, accordeur micro (transposition sax alto/ténor/soprano/baryton), bourdon, minuteur (Pomodoro, repos muscu) |
| **Musculation** | Séances / exercices / séries, volume, 1RM estimé, records, « refaire une séance » |
| **Course** | Sorties, allure, km par semaine, records, prédiction de temps (5 km → marathon) |
| **Nutrition** | Journal par repas (kcal, protéines, glucides, lipides, fibres, sucres) + **recherche automatique** (base locale + Open Food Facts), suivi du poids |
| **Réglages** | Objectifs, calculateur de besoins, semaines A/B, export JSON |

## Lancer en local

```bash
npm install
cp .env.example .env        # puis renseigne DATABASE_URL
npx drizzle-kit push        # crée les tables
npm run dev
```

## Déployer (GitHub → Vercel + Neon)

1. Pousse le dépôt sur GitHub.
2. Crée une base sur [Neon](https://neon.tech) et copie la *connection string*.
3. Crée les tables dans Neon (une seule fois, depuis ton ordinateur) :
   ```bash
   export DATABASE_URL="postgresql://...neon.tech/neondb?sslmode=require"
   npx drizzle-kit push --dialect=postgresql --schema=./src/db/schema.ts --url="$DATABASE_URL"
   ```
   (à refaire si tu modifies `src/db/schema.ts`)
4. Sur [Vercel](https://vercel.com) : *Add New → Project*, importe le dépôt GitHub, puis dans *Environment Variables* ajoute :
   - `DATABASE_URL` = la connection string Neon
   - `APP_PASSWORD` = le mot de passe pour accéder au site (**important** : sans lui, le site est public)
5. Deploy. Sur téléphone, « Ajouter à l'écran d'accueil » pour l'utiliser comme une app.

## Notes

- Les photos de partitions sont redimensionnées (≈1800 px, JPEG) avant l'envoi puis stockées dans PostgreSQL : l'offre gratuite de Neon (0,5 Go) permet d'en stocker plusieurs centaines.
- La recherche d'aliments utilise l'API gratuite d'[Open Food Facts](https://world.openfoodfacts.org) (sans clé) en plus d'une base locale d'aliments courants et de tes aliments récents.
- Toutes les dates sont calculées au fuseau Europe/Paris.
- Le micro de l'accordeur nécessite HTTPS (OK sur Vercel) et ton autorisation.
