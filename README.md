# Essais cliniques — Service d'Hématologie

Site statique de présentation des essais cliniques du service. Recherche plein texte, filtres combinables (pathologie, phase, statut, promoteur), tri par colonne, vues tableau / cartes, mode sombre, export CSV.

Aucun backend : tout tourne côté navigateur. Déploiement via GitHub Pages.

---

## Structure

```
.
├── index.html              # Page principale
├── assets/
│   ├── style.css           # Feuille de style
│   └── app.js              # Logique applicative (vanilla JS)
├── data/
│   └── essais.json         # Données (généré depuis l'Excel)
├── update_data.py          # Script de mise à jour des données
├── .nojekyll               # Désactive Jekyll sur GitHub Pages
└── README.md
```

---

## Mettre à jour les données

Le fichier `data/essais.json` est généré à partir de votre fichier Excel.

### Prérequis (une seule fois)

```bash
pip install pandas openpyxl xlrd
```

### Mise à jour

1. Placer votre fichier Excel (`essais.xlsx` ou `essais.xls`) à la racine du projet.
2. Lancer :

```bash
python update_data.py
```

ou, en spécifiant le chemin :

```bash
python update_data.py /chemin/vers/mon_fichier.xlsx
```

3. Le fichier `data/essais.json` est régénéré. Commiter et pousser :

```bash
git add data/essais.json
git commit -m "Mise à jour des essais"
git push
```

GitHub Pages se redéploiera automatiquement (en général sous 1 à 2 minutes).

### Colonnes attendues dans l'Excel

| Colonne | Description |
|---|---|
| `id` | Identifiant interne (court, unique, sans espace) |
| `nom` | Nom de l'essai |
| `sponsor` | Promoteur |
| `phase` | Phase (I, I/II, II, III, Cohorte, etc.) |
| `categorie` | Pathologie / aire thérapeutique |
| `statut` | `open`, `intermittent`, `planned`, `closed` |
| `interventions` | Traitements étudiés |
| `population` | Population cible |
| `exigences` | Exigences particulières (logistique, screening…) |
| `notes` | Notes opérationnelles libres |
| `contact_name` | Investigateur principal |
| `contact_email` | Email du contact |
| `contact_phone` | Téléphone (optionnel) |
| `maj` | Date de mise à jour (format Excel ou ISO) |

Les valeurs vides sont gérées automatiquement.

---

## Déploiement sur GitHub Pages

1. Créer un repository GitHub (par exemple `essais-clinques-hemato`).
2. Pousser le contenu de ce dossier :

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin git@github.com:VOTRE-COMPTE/VOTRE-REPO.git
git push -u origin main
```

3. Dans **Settings → Pages** du repository :
   - Source : `Deploy from a branch`
   - Branch : `main` / `/ (root)`
4. Attendre 1 à 2 minutes. Le site est accessible à `https://VOTRE-COMPTE.github.io/VOTRE-REPO/`.

---

## Tester localement

Ouvrir simplement `index.html` ne suffit pas (le navigateur bloque `fetch()` sur `file://`). Lancer un serveur local :

```bash
# Avec Python
python -m http.server 8000

# Puis ouvrir http://localhost:8000
```

---

## Personnalisation rapide

- **Nom du service / logo** : `index.html`, balise `<header class="topbar">`.
- **Couleur d'accent** : variable `--accent` dans `assets/style.css` (par défaut un vert médical).
- **Colonnes du tableau** : section `<thead>` dans `index.html` + fonction `renderTable()` dans `assets/app.js`.
- **Mentions légales / pied de page** : `<footer>` dans `index.html`.

---

## Confidentialité

Le site est entièrement statique. Aucune donnée n'est envoyée à un serveur tiers. **Attention cependant** : si le repository est public, le fichier `data/essais.json` sera consultable par toute personne accédant à l'URL du site (ou au repository). Pour un usage strictement interne, créer un **repository privé** et utiliser **GitHub Pages avec restriction d'accès** (option payante GitHub Pro/Team/Enterprise), ou héberger ailleurs (Netlify avec mot de passe, intranet, etc.).
