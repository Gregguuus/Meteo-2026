# ⛳ Mon Golf

Application web gratuite pour le golf, hébergée sur **GitHub Pages**. Elle s'installe sur le téléphone comme une vraie application.

## Fonctions
- **Entraînement** : journal des séances (practice, putting, petit jeu…), durée, balles, ressenti, notes, distances par club.
- **Swing** : filmer son swing avec la caméra (ou importer une vidéo), revoir au ralenti (×0.25, ×0.5) et image par image. Les vidéos restent sur le téléphone.
- **Signets Instagram** : ranger les posts golf par catégorie (Swing, Putting, Mental…). Coller le lien, ou sur Android : *Partager → Mon Golf*.
- **Carte de score** : 9 ou 18 trous, par, coups, putts, fairways, score par rapport au par, historique et statistiques.
- **Météo en direct** : température, vent (force, direction, rafales), prévisions heure par heure et conseils de jeu selon le vent.
- **Détection automatique du golf** : à l'ouverture, l'app vérifie si vous êtes sur un parcours ; si oui, elle lance la carte de score et garde l'écran allumé.

Services gratuits sans compte ni clé : [Open-Meteo](https://open-meteo.com) (météo) et [OpenStreetMap](https://www.openstreetmap.org) (parcours de golf).

## Mise en ligne (une seule fois)
1. Sur GitHub : **Settings → Pages**.
2. *Source* : **Deploy from a branch**, branche **main**, dossier **/ (root)** → **Save**.
3. Après 1 à 2 minutes, l'app est en ligne à `https://<votre-pseudo>.github.io/<nom-du-depot>/`.

## Installer sur le téléphone
- **iPhone (Safari)** : ouvrir le lien → bouton Partager → *Sur l'écran d'accueil*.
- **Android (Chrome)** : ouvrir le lien → menu ⋮ → *Installer l'application*.

Autorisez la **localisation** (météo et détection du golf) et la **caméra** (swing).

## Limites à connaître
- Une app web ne peut pas se lancer toute seule en arrière-plan : la détection du golf se fait quand vous **ouvrez** l'app (et toutes les 10 min tant qu'elle est ouverte).
- Instagram ne donne accès à vos « Enregistrements » à aucune application : on ajoute les liens soi-même.
- Les données sont stockées sur le téléphone : pensez à **Réglages → Exporter** de temps en temps.
