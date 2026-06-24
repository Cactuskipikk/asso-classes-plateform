# Mustafa Edu — Application de gestion éducative

Application tout-en-un pour une association culturelle : gestion des élèves, cours, présences, paiements, progression pédagogique, réunions de bureau.

## Stack technique

- **Next.js 15** (App Router, full-stack)
- **Prisma** + **SQLite** (base de données locale, zéro-config)
- **TailwindCSS** + **shadcn/ui** (UI moderne)
- **NextAuth v5** (authentification JWT)
- **next-intl** (multilingue : FR, EN, TR, AR, KU avec support RTL)
- **Recharts** (graphiques)
- **ExcelJS** + **PptxGenJS** (exports)
- **Zod** (validation)

## Installation et lancement

```bash
# 1. Installer les dépendances
npm install

# 2. Initialiser la base de données et insérer les données de test
npm run db:setup

# 3. Lancer le serveur de développement
npm run dev
```

L'application sera accessible sur **http://localhost:3000**

## Comptes de test

| Rôle | Email | Mot de passe |
|------|-------|-------------|
| Admin | admin@mustafa.edu | Admin123! |
| Professeur titulaire | teacher1@mustafa.edu | Teacher123! |
| Professeur remplaçant | teacher2@mustafa.edu | Teacher123! |
| Parent | parent@mustafa.edu | Parent123! |
| Élève | student1@mustafa.edu | Student123! |
| Élève | student2@mustafa.edu | Student123! |

## Structure du projet

```
implementation/
├── prisma/
│   ├── schema.prisma          # Schéma de la base de données
│   ├── seed.ts                # Données de test
│   └── dev.db                 # Base SQLite (générée)
├── messages/                  # Traductions i18n
│   ├── fr.json, en.json, tr.json, ar.json, ku.json
├── src/
│   ├── app/
│   │   ├── [locale]/
│   │   │   ├── login/         # Page de connexion
│   │   │   ├── register/      # Inscription parent + enfants
│   │   │   └── dashboard/     # Tableau de bord (14 pages)
│   │   │       ├── page.tsx           # Dashboard principal
│   │   │       ├── students/          # Gestion élèves
│   │   │       ├── teachers/          # Gestion professeurs
│   │   │       ├── classes/           # Gestion classes
│   │   │       ├── courses/           # Planning des cours
│   │   │       ├── attendance/        # Pointage présences
│   │   │       ├── payments/          # Gestion paiements
│   │   │       ├── progress/          # Suivi progression
│   │   │       ├── rooms/             # Gestion salles
│   │   │       ├── meetings/          # Réunions de bureau
│   │   │       ├── reports/           # Exports Excel/PPT
│   │   │       ├── settings/          # Paramètres
│   │   │       └── children/          # Vue parent
│   │   └── api/                       # 30 routes API REST
│   ├── components/
│   │   ├── ui/                # 20 composants shadcn/ui
│   │   ├── layout/            # Sidebar, Header
│   │   └── dashboard/         # Composants partagés
│   ├── lib/                   # Auth, Prisma, validations, utils
│   └── i18n/                  # Configuration next-intl
```

## Fonctionnalités implémentées

### Gestion des utilisateurs
- Multi-rôles : Admin, Professeur (titulaire/remplaçant), Parent, Élève
- Inscription en ligne par les parents avec création des comptes enfants
- Authentification sécurisée (JWT, bcrypt)
- Consentement RGPD

### Gestion pédagogique
- Classes organisées par matière ou tranche d'âge
- Planning hebdomadaire récurrent
- Cours collectifs (toutes classes)
- Remplacement ponctuel de professeurs
- Gestion des salles avec contrainte d'exclusivité

### Suivi des élèves
- Pointage des présences avec calcul automatique des retards
- Alerte après 3 absences consécutives
- Suivi de progression (Acquis / En cours / En apprentissage)
- Compteur de cours (objectif : 70 cours → récompense)
- Devoirs visibles par parents et élèves

### Gestion financière
- Paiements : normal / réduit / gratuit
- Alerte impayés après 2 mois

### Administration
- Tableau de bord avec statistiques
- Réunions de bureau (présence des 9 membres, décisions, revue à 3 mois)
- Exports Excel (données brutes) et PowerPoint (rapports de fréquentation)
- Gestion de l'année scolaire (archivage, réinitialisation)

### Multilingue
- 5 langues : Français, English, Türkçe, العربية, کوردی
- Support RTL pour l'arabe et le kurde sorani

## Commandes utiles

```bash
npm run dev          # Serveur de développement
npm run build        # Build production
npm run db:studio    # Interface visuelle Prisma Studio
npm run db:seed      # Réinitialiser les données de test
```
