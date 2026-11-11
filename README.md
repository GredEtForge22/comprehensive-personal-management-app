# 🎷 Ma Vie — EDT, sport, sax, nutrition, cours

Application Next.js (App Router) + PostgreSQL (Drizzle ORM), pensée pour un lycéen musicien (saxophone) qui fait du street workout.

## Fonctionnalités

- **Accueil** : planning du jour, habitudes à cocher, calories, temps de sax, sport de la semaine, échéances, bilan sommeil / humeur / énergie.
- **EDT** : vue semaine (PC) / un jour à la fois (téléphone). Cours répétés sur plusieurs jours, semaine A/B, période de validité, événements ponctuels, duplication, annulation d'un seul jour.
- **Cours** : devoirs / contrôles / auditions / concerts avec compte à rebours, matières et chapitres (statut + fiches), notes avec moyennes pondérées, comptes rendus de cours de musique avec tâches, fiches de révision (répétition espacée).
- **Sport** : street workout au poids du corps (tractions, tractions australiennes, pompes, dips + skills), records, 1RM estimé, force relative, bouton « Refaire » ; course (allure, km/semaine, records, prédictions 5 km → marathon).
- **Saxophone** : séances (chrono, type de travail, gammes, morceaux, tempo, satisfaction), objectif hebdo **8h30** par défaut, carte des gammes (12 tonalités × 18 gammes/arpèges), répertoire avec tempo cible et échéance, calendrier de régularité, idées de séance.
- **Partitions** : photos réduites dans le navigateur puis stockées en base, lecture plein écran avec zoom/pan/pinch, réordonnancement, tags, recherche.
- **Nutrition** : journal par repas (kcal, protéines, glucides, lipides, fibres, sucres), recherche automatique (base locale + Open Food Facts sans clé + aliments récents), saisie manuelle, suivi du poids.
- **Habitudes** : ajout / modification / suppression, cases par jour, séries, calendriers de régularité.
- **Outils** : métronome, accordeur au micro (note écrite pour sax soprano/alto/ténor/baryton), bourdon, minuteurs (Pomodoro, repos de muscu).
- **Réglages** : profil (61 kg / 186 cm par défaut), calculateur de besoins caloriques, objectifs, semaine A/B, export JSON.

## Lancer en local

```bash
npm install
# DATABASE_URL dans .env, puis :
npx drizzle-kit push
npm run dev
```

## Déploiement GitHub → Vercel + Neon

1. Pousse le projet sur GitHub.
2. Crée une base sur [Neon](https://neon.tech) et copie l'URL de connexion (`postgresql://...?sslmode=require`).
3. **Crée les tables une seule fois**, depuis ton ordinateur :

   ```bash
   DATABASE_URL="postgresql://..." npx drizzle-kit push --config=drizzle.neon.config.ts
   ```

4. Sur [Vercel](https://vercel.com), importe le dépôt et ajoute deux variables d'environnement :
   - `DATABASE_URL` : l'adresse de connexion Neon.
   - `APP_PASSWORD` : **sans elle, ton site est public.** Avec elle, une page de connexion apparaît (cookie de 90 jours).
5. Déploie.

## Détails techniques

- Les données (cours, séances, repas, habitudes…) sont stockées dans une table `items` (colonne `kind` + `data` JSONB + `date` indexée) ; les réglages dans `settings` ; les partitions dans `scores` (miniature + image JPEG réduite à 1600 px, en base64). Quelques centaines de pages tiennent largement dans l'offre gratuite de Neon.
- Les dates suivent le fuseau **Europe/Paris**.
- L'accordeur et le métronome utilisent l'API Web Audio ; le micro nécessite HTTPS (Vercel ou `localhost`).
- La recherche d'aliments passe par `/api/food-search` (proxy vers Open Food Facts, sans clé).
