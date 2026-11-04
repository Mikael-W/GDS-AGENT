"""Secrets des produits : coffre OpenBao <-> fichiers .env des VMs.

    python3 scripts/coffre/coffre.py importer  <hôte> <fichier> <chemin>  [--remplacer]
    python3 scripts/coffre/coffre.py deposer   <chemin> <hôte> <fichier>
    python3 scripts/coffre/coffre.py comparer  <chemin> <hôte> <fichier>
    python3 scripts/coffre/coffre.py valeur    <chemin> <clé>

<chemin> est relatif au moteur `secret/` (ex. `aria/prod`), <hôte> un alias SSH.
Les valeurs ne s'affichent jamais : seuls les noms de variables apparaissent,
sauf `valeur`, qui écrit une seule valeur pour un programme (lookup Ansible
en no_log), jamais pour un écran.

Jeton : BAO_TOKEN, sinon le jeton opérateur du trousseau macOS
(`openbao-operateur`), sinon celui laissé par `bao login -method=oidc`.
Voir aisisters-infra, docs/runbooks/secrets.md.
"""

from __future__ import annotations

import json
import os
import re
import shlex
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

ADRESSE = os.environ.get("COFFRE_ADDR", "https://coffre.outils.aisisters.ai")
LIGNE = re.compile(r"^([A-Za-z_][A-Za-z0-9_]*)=(.*)$")


def jeton() -> str:
    if os.environ.get("BAO_TOKEN"):
        return os.environ["BAO_TOKEN"]
    trousseau = subprocess.run(
        ["security", "find-generic-password", "-s", "openbao-operateur", "-w"],
        capture_output=True,
        text=True,
    )
    if trousseau.returncode == 0 and trousseau.stdout.strip():
        return trousseau.stdout.strip()
    for nom in (".bao-token", ".vault-token"):
        fichier = Path.home() / nom
        if fichier.exists():
            return fichier.read_text().strip()
    sys.exit("Aucun jeton : BAO_TOKEN, trousseau openbao-operateur ou `bao login -method=oidc`.")


def api(methode: str, chemin: str, corps: dict | None = None) -> dict | None:
    requete = urllib.request.Request(
        f"{ADRESSE}/v1/secret/data/{chemin}",
        method=methode,
        data=json.dumps(corps).encode() if corps is not None else None,
        headers={"X-Vault-Token": jeton(), "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(requete, timeout=20) as reponse:
            contenu = reponse.read()
            return json.loads(contenu) if contenu else None
    except urllib.error.HTTPError as err:
        if err.code == 404:
            return None
        sys.exit(f"Coffre : {methode} secret/{chemin} a répondu {err.code}")


def lire_coffre(chemin: str) -> dict[str, str]:
    reponse = api("GET", chemin)
    if reponse is None:
        sys.exit(f"secret/{chemin} n'existe pas dans le coffre")
    return reponse["data"]["data"]


def parser(contenu: str) -> dict[str, str]:
    variables: dict[str, str] = {}
    for ligne in contenu.splitlines():
        if m := LIGNE.match(ligne):
            variables[m.group(1)] = m.group(2)
    return variables


def ssh(hote: str, commande: str, entree: str | None = None) -> str:
    # Sans entrée explicite, ssh ne doit pas lire celle du script appelant.
    resultat = subprocess.run(
        ["ssh", hote, commande],
        input=entree,
        stdin=None if entree is not None else subprocess.DEVNULL,
        capture_output=True,
        text=True,
    )
    if resultat.returncode != 0:
        sys.exit(f"{hote} : échec de « {commande.split()[0]} … » ({resultat.stderr.strip()[:200]})")
    return resultat.stdout


def lire_vm(hote: str, fichier: str) -> dict[str, str]:
    return parser(ssh(hote, f"sudo cat {shlex.quote(fichier)}"))


def ecarts(a: dict[str, str], b: dict[str, str]) -> list[str]:
    noms = sorted(a.keys() | b.keys())
    return [n for n in noms if a.get(n) != b.get(n)]


def importer(hote: str, fichier: str, chemin: str, remplacer: bool) -> None:
    if api("GET", chemin) is not None and not remplacer:
        sys.exit(f"secret/{chemin} existe déjà (--remplacer pour l'écraser)")
    variables = lire_vm(hote, fichier)
    api("POST", chemin, {"data": variables})
    print(f"secret/{chemin} : {len(variables)} variables importées depuis {hote}:{fichier}")


def deposer(chemin: str, hote: str, fichier: str) -> None:
    variables = lire_coffre(chemin)
    contenu = "".join(f"{nom}={valeur}\n" for nom, valeur in sorted(variables.items()))
    cible = shlex.quote(fichier)
    # Écriture atomique ; droits et propriétaire repris du fichier existant,
    # 600 root sinon.
    ssh(
        hote,
        f"sudo sh -c 'umask 077; cat > {cible}.coffre"
        f" && if [ -f {cible} ]; then chown --reference={cible} {cible}.coffre"
        f" && chmod --reference={cible} {cible}.coffre; fi && mv {cible}.coffre {cible}'",
        entree=contenu,
    )
    restant = ecarts(variables, lire_vm(hote, fichier))
    if restant:
        sys.exit(f"{hote}:{fichier} diffère du coffre après écriture : {', '.join(restant)}")
    print(f"{hote}:{fichier} écrit depuis secret/{chemin} ({len(variables)} variables)")


def comparer(chemin: str, hote: str, fichier: str) -> None:
    differences = ecarts(lire_coffre(chemin), lire_vm(hote, fichier))
    if differences:
        print(f"Différences entre secret/{chemin} et {hote}:{fichier} : {', '.join(differences)}")
        sys.exit(1)
    print(f"secret/{chemin} et {hote}:{fichier} sont identiques")


def valeur(chemin: str, cle: str) -> None:
    variables = lire_coffre(chemin)
    if cle not in variables:
        sys.exit(f"secret/{chemin} n'a pas de clé {cle}")
    sys.stdout.write(variables[cle])


def main() -> None:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args:
        sys.exit(__doc__)
    commande, reste = args[0], args[1:]
    if commande == "importer" and len(reste) == 3:
        importer(*reste, remplacer="--remplacer" in sys.argv)
    elif commande == "deposer" and len(reste) == 3:
        deposer(*reste)
    elif commande == "comparer" and len(reste) == 3:
        comparer(*reste)
    elif commande == "valeur" and len(reste) == 2:
        valeur(*reste)
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()
