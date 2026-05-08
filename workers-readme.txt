---

### 1. Le Worker `gemini` (Le Rédacteur)

C'est ton **interface avec l'Intelligence Artificielle**.

* **Rôle :** Il reçoit un prompt (contenant probablement les scores récupérés) et contacte l'API Google Gemini (modèle `2.5-flash`).
* **Fonctionnement :**
* Il extrait la clé API de ton environnement (`env.GEMINI_KEY`).
* Il formate la requête selon la structure attendue par Google (`contents.parts.text`).
* Il renvoie uniquement le texte généré (l'article) proprement nettoyé.


* **Bonus :** Ton code contient des versions prêtes pour Mistral, OpenRouter ou Groq (en commentaire), ce qui te permet de changer de "cerveau" en 2 secondes si Gemini est hors ligne.

---

### 2. Le Worker `scrap` (La Source de Données)

C'est ton **extracteur de données brutes**.

* **Rôle :** Il sert de proxy entre ton projet et l'API d'ESPN.
* **Fonctionnement :**
* Il exige une clé secrète (`nba_sync_2026`) pour éviter que n'importe qui n'utilise ton worker.
* Il appelle l'API d'ESPN pour une date précise (`start`).
* **Nettoyage :** Il ne renvoie pas tout le désordre d'ESPN. Il simplifie la donnée en un objet propre : `match_id`, `date`, noms des équipes (`abbreviation`), `score` et `status`.



---

### 3. Le Worker `syncnba` (Le Cerveau / Orchestrateur)

C'est le plus complexe. C'est lui qui gère la logique métier et le stockage **KV (Key-Value)**. Il a trois routes principales :

#### A. La gestion des Articles (`/article` et `/articles`)

* **POST :** Reçoit le texte de l'article généré par `gemini` et le stocke dans KV avec une clé liée à la date (`article:2026-05-08`).
* **GET :** Récupère l'article du jour. Si rien n'a été publié aujourd'hui, il est intelligent : il va chercher automatiquement l'article d'hier pour ne pas renvoyer une page vide.
* **LIST (`/articles`) :** Affiche la liste de tous les articles stockés.

#### B. La récupération automatique des scores (`/`)

Quand tu appelles la racine du worker, il déclenche une boucle de synchronisation :

1. Il regarde dans KV (`state`) quelle est la dernière date traitée (ex: 18 avril 2026).
2. Il compare cette date avec "Aujourd'hui".
3. **Boucle de rattrapage :** Tant qu'il n'est pas à jour, il appelle ton worker `scrap` (via `env.SCRAP.fetch`), récupère les matchs, et les ajoute à son objet `matches`.
4. Il sauvegarde le tout dans KV sous la clé `state`.

#### C. L'état actuel (`/state`)

* Renvoie simplement la liste de tous les matchs stockés en mémoire (KV) pour alimenter ton interface front-end.

---

### Schéma de flux résumé :

1. **Utilisateur/Cron** appelle `syncnba`.
2. `syncnba` appelle `scrap` pour avoir les scores.
3. `syncnba` enregistre les scores dans **KV**.
4. *Étape suivante (à automatiser) :* Tu envoies ces scores à `gemini` pour créer l'article.
5. `syncnba` enregistre l'article dans **KV**.
6. Ton site web vient lire `/state` (pour les scores) et `/article` (pour l'analyse IA).

### Une petite remarque sur ton code :

Dans `syncnba`, tu as défini la route `if (path === "/article")` **deux fois** avec le même code. Tu peux supprimer la deuxième version pour alléger le worker, car elle fait exactement la même chose que la première.

Est-ce que tu veux que je t'aide à créer un script pour automatiser l'envoi des scores de `syncnba` vers `gemini` pour que l'article se crée tout seul ?
