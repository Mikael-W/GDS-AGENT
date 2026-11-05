# 0005 : direction visuelle « application claire »

## Contexte

Trois directions visuelles ont été présentées au client le 04/11/2026, sur le même écran et avec le même contenu, pour que le choix porte sur la forme et non sur la fonction : « institutionnel » (sobre, proche d'un site de collectivité), « application claire » (outil de bureau, barre latérale, cartes blanches sur fond gris) et « tableur augmenté » (dense, proche d'un tableur).

Les utilisateurs finaux sont des agents instructeurs qui passeront des journées entières dans l'outil, aux côtés de CIRIL. La lisibilité à la journée pèse plus que l'effet au premier regard.

## Décision

La direction « application claire » est retenue par le client le 05/11/2026.

Elle est décrite dans `docs/systeme-de-design.md` et maquettée sur treize écrans. Ses jetons vivent dans `apps/web/app/globals.css` ; la police Figtree est chargée par `next/font/google` dans `apps/web/app/layout.tsx` et servie avec le site, sans appel à un domaine tiers depuis le poste.

Deux choix écartés, à l'intérieur de cette direction :

- Pas de variante sombre. Aucune n'a été présentée ni validée. Le bloc de thème sombre venu du template est supprimé plutôt que laissé en place : zéro legacy vaut aussi pour les feuilles de style.
- Pas de deuxième couleur d'accent. Les cinq paires d'état suffisent à porter la gravité, et une seule couleur d'accent garde l'interface lisible quand un tableau en affiche vingt lignes.

## Conséquences

- Une couleur écrite en dur dans un composant devient un défaut : tout passe par les jetons.
- Les écrans à construire sont connus et nommés. Le front cesse d'être volontairement nu : la coquille minimale posée en attendant cette validation peut s'étoffer écran par écran.
- Un changement de direction visuelle après ce point remettrait en cause les treize maquettes. Il ferait l'objet d'un nouvel ADR qui remplacerait celui-ci.

## Point ouvert

Cet ADR décrit les jetons tels qu'ils sont posés sur la base Next du template (`apps/web/app/globals.css`, police chargée dans `app/layout.tsx`). Une branche `feat/front-nuxt` propose par ailleurs de passer le front à Nuxt 4. Les valeurs ci-dessus ne dépendent d'aucun framework, mais leur emplacement et le chargement de la police devront suivre la décision prise sur ce point.
