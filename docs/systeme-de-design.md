# Système de design

Direction visuelle retenue par le client le 05/11/2026 : « application claire » (piste 2 sur les trois proposées). Décision : [ADR 0005](adr/0005-direction-visuelle-application-claire.md).

Maquettes de référence, quatorze écrans : <https://claude.ai/artifact/DThmvw9QV3zV9cALLSyJbi> (privées tant qu'elles ne sont pas partagées depuis le menu Partager de la page).

Les jetons vivent dans `apps/web/app/globals.css` et nulle part ailleurs. Une couleur écrite en dur dans un composant est un défaut, au même titre qu'un `TODO` laissé en place.

## Intention

Un outil de bureau pour des agents instructeurs qui travaillent avec lui toute la journée. Il doit se lire vite, à plat, sans décoration : des chiffres alignés, des libellés courts, une seule couleur d'accent. L'application signale et explique, elle ne décide pas, et sa mise en forme le montre : chaque alerte porte sa raison en toutes lettres, chaque calcul est montré, aucun bouton ne déclenche une écriture dans CIRIL.

## Couleurs

Fonds et texte.

| Jeton | Valeur | Usage |
|---|---|---|
| `--background` | `#F7F8FA` | Fond de l'application |
| `--surface` | `#FFFFFF` | Cartes, tableaux, barre latérale |
| `--foreground` | `#15201C` | Texte courant, titres |
| `--foreground-doux` | `#4C5A54` | Texte secondaire dans un tableau |
| `--muted-foreground` | `#68736E` | Libellés, légendes, intitulés de colonne |
| `--foreground-tenu` | `#96A09B` | Valeur absente, « Aucune » |

Accent. Une seule couleur, le vert profond. Pas de deuxième accent.

| Jeton | Valeur | Usage |
|---|---|---|
| `--primary` | `#14564A` | Bouton principal, lien, pastille de compteur, barre de progression |
| `--primary-foreground` | `#FFFFFF` | Texte sur `--primary` |
| `--primary-survol` | `#0C3A31` | Survol d'un lien |
| `--primary-tenu` | `#F1F6F4` | Fond de l'élément de navigation actif, encart d'information |

Traits.

| Jeton | Valeur | Usage |
|---|---|---|
| `--border` | `#E8EBEF` | Contour des cartes et des tableaux |
| `--border-interne` | `#EEF1F4` | Séparateur entre deux lignes d'un tableau |
| `--input` | `#DDE2E7` | Contour d'un champ et d'un bouton secondaire |
| `--ring` | `#14564A` | Anneau de focus |

États. Toujours par paire, fond et texte. Chaque paire passe 4,5:1, et les états se distinguent aussi par la clarté, pas seulement par la teinte : un daltonien lit la différence.

| État | Fond | Texte | Quand |
|---|---|---|---|
| Retard | `#FCEBE9` | `#8C241C` | Échéance dépassée, écart de montant |
| Attention | `#FBF2E4` | `#75470A` | Échéance sous 30 jours, valeur provisoire, donnée manquante |
| Information | `#EDF3F8` | `#1F4E72` | Échéance lointaine, brique non encore livrée |
| Conforme | `#F1F6F4` | `#14564A` | À jour, soldé, enregistré |
| Neutre | `#EEF1F4` | `#4C5A54` | Catégorie sans valeur de gravité |

Le rouge ne sert qu'au retard et à l'écart constaté. Il ne sert jamais à un bouton : rien dans cette application n'est destructeur.

## Typographie

Figtree, chargée par `next/font/google` dans `apps/web/app/layout.tsx` et servie avec le site : le navigateur du poste n'appelle aucun domaine tiers.

| Rôle | Taille | Graisse | Approche |
|---|---|---|---|
| Titre de page | 27 px | 700 | -0,025 em |
| Chiffre d'une tuile | 31 px | 700 | -0,03 em |
| Chiffre d'une tuile dense | 25 px | 700 | -0,03 em |
| Titre de carte | 16 px | 600 | normale |
| Texte courant | 14 px | 400 | normale |
| Texte de tableau | 14 px | 400 ou 500 | normale |
| Légende, libellé | 13 px | 400 | normale |
| Intitulé de colonne, pastille | 12 px | 600 | normale |

Tout chiffre lu en colonne est en `font-variant-numeric: tabular-nums`, appliqué par défaut aux `th`, `td`, `time` et `output` dans `globals.css`. Les montants et les écarts sont alignés à droite, le reste à gauche.

## Formes et espacement

| Jeton | Valeur | Usage |
|---|---|---|
| `--radius-petit` | 9 px | Élément de navigation, bouton carré d'icône |
| `--radius` | 10 px | Champ, bouton |
| `--radius-carte` | 13 px | Carte, tableau, encart |
| pastille | 999 px | Pastille d'état, compteur, filtre |

Hauteurs : champ et bouton principal 40 px, filtre en pastille 34 px, bouton d'icône 34 px, bouton dans une ligne de tableau 32 px. Toute cible cliquable fait au moins 44 px de haut ou dispose de 44 px avec son interligne.

Espacement : 22 px entre deux blocs d'une page, 16 à 18 px entre deux cartes d'une grille, 20 px de marge intérieure de carte, 14 px de marge verticale dans une ligne de tableau.

Barre latérale 240 px, contenu au maximum 1180 px, marge de page 30 px et 16 px au téléphone.

## Composants

**Barre latérale.** Identité en haut (pastille carrée verte, « Marchés », « CC Golfe de Saint-Tropez »), navigation au milieu, état de la synchronisation en bas. L'élément actif a un fond `--primary-tenu`, un texte `--primary`, une graisse 600 et une puce pleine ; les autres ont une puce `#C3CCC8`. Un compteur se pose en pastille verte à droite du libellé. La barre n'est jamais collante et passe au-dessus du contenu au téléphone.

**Tuile de chiffre.** Libellé 13 px gris, chiffre 31 px, et une pastille d'état de 12 px en dessous. Chaque tuile est un lien vers la liste qui la compose : un chiffre que l'on ne peut pas ouvrir n'a pas sa place.

**Tableau.** En-tête 12 px gris sans fond, lignes séparées par `--border-interne`, première colonne en 600 avec la référence CIRIL en 12 px gris dessous. Les filtres sont des `select` en pastille dans l'en-tête de la carte. Un tableau large est placé dans une boîte `overflow-x: auto` : il défile, la page non.

**Pastille d'état.** 12 px, graisse 600, rayon plein, paire de couleurs de la table des états. Elle porte un mot, pas une abréviation.

**Encart d'explication.** Fond et contour d'un état, icône à gauche, une seule phrase. Sert à rappeler ce que l'agent ne fait pas, ou à signaler qu'une brique n'est pas encore livrée.

**Barre de progression.** Piste `--muted`, barre pleine de la couleur de l'état, 8 px, rayon plein. Toujours accompagnée du pourcentage en chiffres.

**Relecture d'un champ extrait.** Deux colonnes : à gauche le libellé, la pastille d'état et le champ pré-rempli ; à droite la page du document et l'extrait en citation. Un champ non trouvé reste vide, avec un texte indicatif qui le dit. L'agent ne devine jamais.

## Écriture

Français courant, sans vocabulaire technique. Une erreur parle du produit, pas de l'infrastructure : « CIRIL ne répond pas » et non « timeout du client SOAP ». Pas d'emoji, pas de tiret cadratin ni demi-cadratin, nulle part.

Les dates s'écrivent en toutes lettres de chiffres, `JJ/MM/AAAA`, et l'échéance est doublée d'un délai relatif : « 01/11/2026 », puis « Dépassée de 4 jours ». Les montants portent l'euro et un espace insécable avant le symbole.

Une alerte dit ce qui a été constaté, pas ce qu'il faut faire : « Reconduction tacite au 09/01/2027 : sans décision contraire, le marché repart. »

## Accessibilité

Un vrai `<button>`, un vrai `<a href>`, un vrai `<input>` associé à son `<label>`, même dans une maquette. Jamais de `role` ni de gestionnaire de clic sur un `div`. Un bouton d'icône porte un `aria-label`. Un SVG décoratif porte `aria-hidden="true"`. Les libellés de filtre masqués visuellement restent dans le document pour les lecteurs d'écran. Chaque tableau porte un `<caption>` masqué qui dit ce qu'il contient.

## Écrans

Treize écrans sont maquettés. Les fichiers portent le nom de l'artboard sur le canvas.

| Écran | Brique | Ce qu'il montre |
|---|---|---|
| Connexion | Socle | Entrée par le portail de la collectivité, sans mot de passe saisi dans l'application |
| Tableau de bord | Toutes | Quatre chiffres cliquables, les marchés suivis, la charge par service |
| Alertes | 1 | Liste par urgence, les cinq familles retenues, statut à traiter ou traité |
| Détail d'une alerte | 1 | La donnée et la clause qui ont déclenché, les éléments de décision, le traitement, l'historique |
| Marchés | Socle | Le portefeuille, typologie, forme des prix, état de la formule de variation |
| Fiche marché | Socle | Identité au sens CIRIL, montants, avenants, alertes ouvertes, factures rattachées |
| Échéancier | 1 | Six mois à venir, mois par mois, relances comprises |
| Récupération d'avance | 2 | Taux, seuils de début et de fin, base de l'avancement, détail des mandats comptés |
| Index et révisions | 3 | Index INSEE suivis, révisions à venir, coefficient du titulaire et coefficient recalculé |
| Vérification d'une révision | 3 | La clause, le calcul pas à pas avec décalage et arrondi, la concordance avec le titulaire |
| Dépôt d'un CCAP | 4 | Dépôt du document, état de la lecture, avancement de la reprise du stock |
| Relecture de la fiche | 4 | Champ par champ dans l'ordre de saisie CIRIL, avec l'extrait source en regard |
| Contrôles des factures | 5 | Écarts entre facture, engagement et marché (livraison janvier 2027) |
| Synchronisation CIRIL | Socle | Journal des synchronisations, état des accès |

Les cinq familles d'alerte sont celles retenues en atelier : reconduction, réception manquante, retenue de garantie, absence de bon de commande, point à six mois. Les écrans n'en inventent pas d'autres, et la révision de prix, qui a son propre écran, n'en fait pas partie.

Les données affichées dans les maquettes sont illustratives : les codes de marché sont réels (MA 26045, AO 25075, MA 24036), les titulaires sont anonymisés et les montants inventés.

## Ce qui n'est pas dans le système

Pas de variante sombre : aucune n'a été validée, et un thème non utilisé serait du code mort. Pas de deuxième police. Pas de dégradé, pas d'ombre portée, pas d'icône pleine : uniquement des icônes au trait de 2 px. Pas de graphique tant qu'un besoin précis ne le demande pas ; une barre de progression et un tableau suffisent à tout ce qui est maquetté.
