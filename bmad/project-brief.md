# Project Brief — Application de gestion éducative (V2)

## 1. Vision du produit

Fournir à une association culturelle (apprentissage religieux, linguistique, informatique, etc.) une application tout-en-un permettant de :

- Gérer les élèves, les cours, les présences et les retards.
- Suivre la progression pédagogique individuelle (apprentissage par cœur, niveaux).
- Gérer les paiements (abonnements, gratuités, relances).
- Offrir un espace de consultation pour les parents et les élèves.
- Piloter les réunions de bureau et le suivi des décisions.

L'objectif est de remplacer les outils actuels (papier + Excel) par un système centralisé, accessible sur mobile et sur le web, multilingue (français, anglais, turc, arabe, kurde).

---

## 2. Utilisateurs cibles (personas)

| Rôle | Accès | Besoins principaux |
|------|-------|-------------------|
| **Responsable éducatif (Admin)** | Web + Mobile | Tableau de bord complet, statistiques, gestion des paiements, relances impayés, suivi réunions de bureau, supervision globale, exports, gestion des professeurs et des salles |
| **Professeur titulaire** | Mobile (principal) | Pointer les présences/retards, renseigner le cours effectué, évaluer le niveau de l'élève, gérer la liste d'apprentissage par cœur |
| **Professeur remplaçant** | Mobile (principal) | Mêmes droits qu'un titulaire lorsqu'il est affecté à un cours par l'admin |
| **Parent** | Mobile | Consulter la progression de ses enfants, voir les devoirs à faire, recevoir des notifications, créer les comptes enfants |
| **Élève** | Mobile | Voir sa progression, ses cours suivis, ses devoirs, son compteur de cours, recevoir des rappels avant le cours |

---

## 3. Organisation des classes et groupes

### 3.1 Structure des classes

- Les classes sont organisées **selon deux critères possibles** : par matière (ex : cours d'informatique) ou par tranche d'âge (ex : 8-10 ans).
- Le critère d'organisation dépend de la classe et est défini par l'admin à la création de la classe.
- Chaque classe est rattachée à une **discipline** (religieux, linguistique, informatique, etc.).

### 3.2 Affectation des élèves

- Un élève appartient à **une seule classe** à la fois.
- Exception : les **cours collectifs** (créés par l'admin) concernent tous les élèves, toutes classes confondues.

### 3.3 Disciplines

- L'application gère une liste de disciplines configurable par l'admin (ex : apprentissage religieux, langue arabe, langue turque, informatique, etc.).
- Chaque classe est rattachée à une discipline.
- Cela permet de filtrer et d'organiser les statistiques et les rapports par discipline.

---

## 4. Fonctionnalités clés

### 4.1 Inscription et onboarding

- **Création de compte parent** : le parent s'inscrit seul via un formulaire en ligne.
- **Inscription des enfants** : lors de l'inscription, le parent remplit un formulaire par enfant contenant les informations personnelles (nom, prénom, genre, date de naissance) et les identifiants de connexion (email, mot de passe).
- **Rattachement** : les enfants sont rattachés au compte du parent. Un parent peut inscrire plusieurs enfants.
- **Affectation à une classe** : l'admin affecte chaque élève inscrit à une classe.
- **Réinscription annuelle** : en début d'année scolaire (septembre), les parents confirment la réinscription de leurs enfants. Les données de l'année précédente sont archivées et les compteurs remis à zéro.

### 4.2 Gestion des présences, retards et absences

- Le professeur pointe la présence de chaque élève au début du cours.
- Le **retard** est calculé automatiquement : différence entre l'heure de début du cours et l'heure de pointage.
- Historique des retards par élève (en minutes).
- **Suivi des absences** : au bout de **3 absences consécutives** d'un élève, une alerte automatique est envoyée aux parents :
  > « Votre enfant a été absent plusieurs fois de suite, veuillez nous en informer de la raison. »

### 4.3 Gestion des cours

- Planning hebdomadaire récurrent sur l'année scolaire (septembre → fin juin).
- Chaque cours est associé à une **classe**, un **professeur titulaire** et une **salle**.
- Possibilité d'annuler un cours ponctuellement (indisponibilité enseignant).
- L'admin peut créer un **cours collectif** concernant tous les élèves (toutes classes confondues).
- Pour chaque cours effectué : le professeur note le contenu abordé et le niveau de l'élève.
- Devoirs pour la semaine suivante (visibles par parents et élèves).

### 4.4 Gestion des professeurs

- Deux types de professeurs : **titulaire** et **remplaçant**.
- Un professeur titulaire est affecté à un cours par l'admin.
- En cas d'indisponibilité du titulaire, l'admin peut affecter un **remplaçant** de manière ponctuelle pour assurer le cours.
- Tous les professeurs (titulaires et remplaçants) ont les mêmes droits fonctionnels dans l'application.

### 4.5 Gestion des salles

- L'admin gère une liste de salles disponibles.
- Chaque cours doit être associé à une salle.
- **Contrainte d'exclusivité** : une salle ne peut pas accueillir deux cours simultanément.
- L'application empêche la planification d'un cours dans une salle déjà occupée sur le même créneau.

### 4.6 Suivi de la progression / apprentissage par cœur

- Liste d'éléments à apprendre par cœur, par élève.
- Trois niveaux d'évaluation : **Acquis** / **En cours d'acquisition** / **En apprentissage**.
- Validation d'un élément → passage au suivant.
- Visualisation graphique de la progression (barres ou graphique).

### 4.7 Compteur de cours et récompense

- Compteur du nombre de cours suivis depuis le début de l'année scolaire.
- Objectif : **70 cours** → récompense.
- Affichage du nombre de cours restants avant la récompense.
- L'élève peut suivre sa progression en temps réel.
- Le compteur est **remis à zéro** en début de chaque année scolaire.

### 4.8 Gestion des paiements

- Types de tarification : **normal**, **réduit**, **gratuit** (0 €).
- Saisie de chaque règlement avec sa date.
- Alerte automatique envoyée à l'admin après **2 mois d'impayé** (liste de relance).

### 4.9 Notifications

- Canaux disponibles : **push** et **email** (paramétrables par utilisateur).
- Rappel de cours à J-1 ou J-2 (configurable) pour inciter l'élève à réviser.
- Alertes impayés pour l'admin.
- Alerte absence (3 absences consécutives) envoyée aux parents.
- Notifications diverses (annulation de cours, remplacement de professeur, nouvelles décisions, etc.).

### 4.10 Réunions de bureau

- Suivi de la présence des **9 membres dirigeants** aux réunions bimensuelles.
- Bloc-notes pour consigner les décisions prises.
- Chaque décision est revue à **3 mois** : appliquée ou non ? Si non, pourquoi ?

### 4.11 Espace parent (type Pronote)

- Niveau actuel de l'enfant.
- Ce qui a été appris cette semaine.
- Devoirs / travail à la maison pour la semaine suivante.
- Compteur de cours et progression vers la récompense.

### 4.12 Exports et rapports (admin uniquement)

#### Export Excel
- Extraction des données brutes (élèves, présences, paiements, etc.).

#### Rapport PowerPoint
- **Fréquentation du centre** : nombre d'élèves présents par cours, par semaine, par mois.
- **Tableau par élève** : nombre de cours suivis et nombre d'heures effectuées sur l'année scolaire.
- **Heures par professeur** : total des heures de cours effectuées chaque mois, par professeur.

### 4.13 Gestion de l'année scolaire

- L'année scolaire s'étend de **début septembre** à **fin juin**.
- À la clôture d'une année scolaire :
  - Les données (présences, progression, paiements) sont **archivées**.
  - Les compteurs de cours sont **remis à zéro**.
  - L'historique des années précédentes est consultable **uniquement par l'admin**.
- En début de nouvelle année : réinscription des élèves, reconfiguration des classes et plannings.

---

## 5. Parcours utilisateurs

### 5.1 Parcours Parent — Inscription

1. Le parent accède au formulaire d'inscription en ligne.
2. Il crée son compte (email, mot de passe, nom, prénom, téléphone).
3. Il ajoute un ou plusieurs enfants en remplissant pour chacun : nom, prénom, genre, date de naissance, email, mot de passe.
4. L'inscription est soumise.
5. L'admin reçoit une notification de nouvelle inscription.
6. L'admin valide l'inscription et affecte chaque élève à une classe.
7. Le parent et l'élève reçoivent une confirmation et peuvent se connecter.

### 5.2 Parcours Professeur — Déroulement d'un cours

1. Le professeur ouvre l'application et accède à son cours du jour.
2. Il pointe la présence de chaque élève (l'heure est enregistrée automatiquement, le retard calculé).
3. Il note le contenu du cours abordé.
4. Il évalue le niveau de chaque élève et met à jour la liste d'apprentissage par cœur si nécessaire.
5. Il saisit les devoirs pour la semaine suivante.
6. Il valide et ferme le cours.

### 5.3 Parcours Admin — Gestion quotidienne

1. L'admin consulte le tableau de bord : fréquentation du jour, alertes impayés, absences répétées.
2. Il consulte la liste de relance des paiements en retard et contacte les familles concernées.
3. Il vérifie les inscriptions en attente et les valide.
4. Si un professeur titulaire est indisponible, il affecte un remplaçant au cours concerné.
5. Il peut à tout moment générer un rapport Excel ou PowerPoint.

### 5.4 Parcours Élève — Consultation

1. L'élève ouvre l'application et voit son tableau de bord personnel.
2. Il consulte ses devoirs pour la semaine.
3. Il vérifie son compteur de cours et le nombre restant avant la récompense.
4. Il consulte sa progression sur la liste d'apprentissage par cœur.

### 5.5 Parcours Parent — Suivi de son enfant

1. Le parent ouvre l'application et sélectionne l'enfant concerné (si multi-enfants).
2. Il consulte le niveau actuel de l'enfant.
3. Il voit ce qui a été appris cette semaine.
4. Il prend connaissance des devoirs à préparer.
5. Il peut consulter le compteur de cours et la progression vers la récompense.

### 5.6 Parcours Admin — Réunion de bureau

1. L'admin crée une nouvelle séance de réunion de bureau.
2. Il pointe la présence des 9 membres dirigeants.
3. Il consigne les décisions prises dans le bloc-notes.
4. Tous les 3 mois, le système signale les décisions arrivées à échéance de revue.
5. L'admin note si chaque décision a été appliquée, et si non, la raison.

---

## 6. Contraintes et préférences techniques

| Élément | Choix |
|---------|-------|
| Plateforme | Application mobile (iOS + Android) + interface web pour l'administration |
| Authentification | Email + mot de passe |
| Langues | Français, anglais, turc, arabe, kurde (interface multilingue + support RTL pour l'arabe et le kurde sorani) |
| Notifications | Push + email — paramétrables par utilisateur |
| Échelle actuelle | ~130 élèves, 10 professeurs, 9 membres du bureau |
| Année scolaire | Début septembre → fin juin |

---

## 7. Sécurité, RGPD et sauvegarde

### 7.1 Sécurité des données

- **Chiffrement en transit** : toutes les communications entre l'application et le serveur passent par HTTPS/TLS.
- **Chiffrement au repos** : les données sensibles (mots de passe, données personnelles) sont chiffrées dans la base de données. Les mots de passe sont hashés avec un algorithme sécurisé (bcrypt ou Argon2).
- **Politique de mots de passe** : minimum 8 caractères, avec au moins une majuscule, un chiffre et un caractère spécial.
- **Sessions sécurisées** : tokens JWT avec expiration (ex : 24h), refresh token pour le renouvellement.
- **Protection contre les attaques courantes** : rate limiting sur les endpoints d'authentification, protection CSRF, validation des entrées côté serveur.

### 7.2 Conformité RGPD

- **Consentement** : lors de l'inscription, le parent donne son consentement explicite au traitement des données de ses enfants (case à cocher obligatoire + lien vers la politique de confidentialité).
- **Minimisation des données** : seules les données nécessaires au fonctionnement de l'application sont collectées.
- **Droit d'accès et de rectification** : le parent peut consulter et modifier les données personnelles de ses enfants à tout moment.
- **Droit à l'effacement** : le parent peut demander la suppression du compte de ses enfants. La demande est traitée par l'admin sous 30 jours. Les données sont anonymisées dans les archives statistiques.
- **Durée de conservation** : les données actives sont conservées pendant l'année scolaire en cours. Les données archivées sont conservées 3 ans, puis supprimées automatiquement.
- **Registre de traitement** : un registre des traitements de données est tenu par le responsable de l'association.
- **Données des mineurs** : le traitement repose sur le consentement du parent/tuteur légal (conformément à l'article 8 du RGPD, seuil de 15 ans en France).

### 7.3 Sauvegarde et reprise

- **Sauvegarde automatique quotidienne** de la base de données.
- **Rétention** : 30 jours de sauvegardes glissantes.
- **Sauvegarde géographiquement distincte** : les sauvegardes sont stockées dans une zone/région différente du serveur principal.
- **Test de restauration** : une procédure de restauration est testée au moins une fois par an.
- **RPO (perte de données max)** : 24 heures.
- **RTO (temps de reprise max)** : 4 heures.

---

## 8. Périmètre général (in-scope)

- Gestion multi-rôles (admin, professeur titulaire, professeur remplaçant, parent, élève).
- Multi-admin : un admin peut accorder les droits d'administration à un autre utilisateur.
- Inscription en ligne par les parents + création des comptes enfants.
- Organisation en classes (par matière ou par tranche d'âge), rattachées à des disciplines.
- Tableau de bord avec statistiques pour l'admin.
- Gestion présences, retards, absences (alerte à 3 absences consécutives), cours, devoirs.
- Gestion des professeurs (titulaires et remplaçants, remplacement ponctuel par l'admin).
- Gestion des salles (liste, affectation, contrainte d'exclusivité).
- Suivi pédagogique individuel (apprentissage par cœur + niveaux).
- Compteur de cours + système de récompense (identique pour tous, seuil 70 cours).
- Gestion financière simplifiée (paiements + relances à 2 mois).
- Notifications push et email, paramétrables.
- Réunions de bureau + suivi des décisions (revue à 3 mois).
- Compte parent multi-enfants.
- Exports : données en Excel + rapport PowerPoint (fréquentation, heures par élève, heures par professeur).
- Gestion de l'année scolaire (archivage, réinitialisation, historique admin).
- Support multilingue (FR, EN, TR, AR, KU) avec support RTL.
- Sécurité (chiffrement, authentification sécurisée), conformité RGPD, sauvegardes automatiques.

---

## 9. Hors périmètre (out-of-scope — pour la V1)

- Messagerie interne entre utilisateurs.
- Paiement en ligne intégré (passerelle de paiement).
- Gestion de la comptabilité avancée (bilan, charges, etc.).
- Visioconférence ou cours en ligne.
- Génération automatique de certificats ou diplômes.
- Notifications SMS et WhatsApp (envisageables en V2).
- Mode hors-ligne.

---

## 10. Décisions validées

- **Mode hors-ligne** : reporté hors V1.
- **Récompense** : identique pour tous les élèves (pas de personnalisation par groupe/niveau). Seuil fixé à 70 cours.
- **Compte parent** : un parent peut rattacher plusieurs enfants à un même compte. C'est le parent qui crée les comptes enfants.
- **Professeurs** : deux types (titulaire et remplaçant), mêmes droits fonctionnels. Le remplacement est géré ponctuellement par l'admin.
- **Classes** : un élève appartient à une seule classe (sauf cours collectifs). Les classes sont organisées par matière ou par tranche d'âge, selon la classe.
- **Exports** : Excel (données brutes) + PowerPoint (fréquentation par cours/semaine/mois, heures par élève, heures par professeur). Réservé aux admins.
- **Gestion des admins** : un admin peut accorder les droits d'administration à un autre utilisateur (multi-admin).
- **Année scolaire** : septembre → juin. Archivage des données, remise à zéro des compteurs. Historique consultable uniquement par l'admin.
- **Absences** : alerte automatique aux parents après 3 absences consécutives.
- **Notifications V1** : push + email uniquement.
- **Salles** : liste gérée par l'admin, affectation obligatoire à chaque cours, pas de double attribution.
- **Sécurité et RGPD** : chiffrement, hachage des mots de passe, consentement parental explicite, droit à l'effacement, sauvegarde quotidienne.
