import { z } from "zod";

/**
 * Client CIRIL minimal (SOAP 1.1, style rpc/encoded). Les URL et credentials
 * viennent de l'environnement : la sandbox vit dans .env, la prod dans le
 * coffre. Les secrets ne passent jamais dans les journaux (l'enveloppe
 * tracée par CIRIL_TRACE masque le mot de passe et la clé de session).
 */
export class ErreurCiril extends Error {}

function echapper(valeur: string): string {
  return valeur
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function enveloppe(namespace: string, operation: string, parametres: [string, string][]): string {
  const corps = parametres.map(([nom, valeur]) => `<${nom}>${echapper(valeur)}</${nom}>`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <SOAP-ENV:Body>
    <m:${operation} xmlns:m="${namespace}">${corps}</m:${operation}>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`;
}

async function appel(
  url: string,
  namespace: string,
  operation: string,
  parametres: [string, string][],
  soapAction = `${namespace}#${operation}`,
  secrets: string[] = [],
) {
  const corps = enveloppe(namespace, operation, parametres);
  const reponse = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: soapAction,
    },
    body: corps,
  });
  const texte = await reponse.text();
  if (process.env.CIRIL_TRACE) {
    let corpsMasque = corps;
    for (const secret of secrets) {
      if (secret) corpsMasque = corpsMasque.split(secret).join("***");
    }
    console.log(
      `\n--- CIRIL ${operation} requête ---\n${corpsMasque}\n--- réponse (${reponse.status}) ---\n${texte.slice(0, 4000)}\n--- fin ---\n`,
    );
  }
  if (!reponse.ok) {
    const detail = texte.match(/<detail[^>]*>([\s\S]*?)<\/detail>/)?.[1];
    const message = texte.match(/<faultstring[^>]*>([\s\S]*?)<\/faultstring>/)?.[1];
    throw new ErreurCiril(
      `CIRIL ${operation} ${reponse.status} : ${message ?? ""} ${detail ?? texte.slice(0, 800)}`,
    );
  }
  const fault = texte.match(/<faultstring[^>]*>([^<]+)<\/faultstring>/);
  if (fault) throw new ErreurCiril(`CIRIL ${operation} fault : ${fault[1]}`);
  return texte;
}

function decoderEntites(texte: string): string {
  return texte.replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)));
}

function extraireItems(xml: string): Record<string, string>[] {
  const items: Record<string, string>[] = [];
  for (const bloc of xml.matchAll(/<item[^>]*>([\s\S]*?)<\/item>/g)) {
    const corps = bloc[1] ?? "";
    const champs: Record<string, string> = {};
    for (const champ of corps.matchAll(/<([a-zA-Z]+)[^>]*>([^<]*)<\/\1>/g)) {
      const nom = champ[1];
      const valeur = champ[2];
      if (nom !== undefined && valeur !== undefined) champs[nom] = decoderEntites(valeur);
    }
    items.push(champs);
  }
  return items;
}

const AccessPointBrut = z.object({
  client: z.string().optional(),
  database: z.string().optional(),
  application: z.string().optional(),
  netApplication: z.string().optional(),
  schema: z.string().optional(),
  user: z.string().optional(),
  URL: z.string(),
  label: z.string().optional(),
});

export type AccessPoint = {
  client?: string;
  database?: string;
  application?: string;
  netApplication?: string;
  schema?: string;
  label?: string;
  urlAbsolue: string;
  cle: string;
};

/**
 * Points d'accès ouverts à l'utilisateur. L'URL rendue par CIRIL est relative
 * (`/cgi-bin/web2java.exe?<cle>`) : on la ramène à une URL absolue sur le
 * même hôte que l'appel d'authentification.
 */
export async function getAccessList(opts: {
  url: string;
  utilisateur: string;
  motDePasse: string;
}): Promise<AccessPoint[]> {
  const namespace = "Ciril:Ciril:AccessInfo";
  const texte = await appel(
    opts.url,
    namespace,
    "getAccessList",
    [
      ["param-1", opts.utilisateur],
      ["param-2", opts.motDePasse],
      ["param-3", ""],
      ["param-4", ""],
    ],
    `${namespace}#getAccessList`,
    [opts.motDePasse],
  );
  return extraireItems(texte).map((champs) => {
    const brut = AccessPointBrut.parse(champs);
    const urlAbsolue = new URL(brut.URL, opts.url).toString();
    const cle = new URL(urlAbsolue).search.replace(/^\?/, "");
    return {
      client: brut.client,
      database: brut.database,
      application: brut.application,
      netApplication: brut.netApplication,
      schema: brut.schema,
      label: brut.label,
      urlAbsolue,
      cle,
    };
  });
}

const ContratBrut = z.object({
  numeroContrat: z.string().optional(),
  libelleContrat: z.string().optional(),
  objetContrat: z.string().optional(),
  numeroTiers: z.string().optional(),
  nomTiers: z.string().optional(),
  dateDebut: z.string().optional(),
  dateFin: z.string().optional(),
  dateSouscription: z.string().optional(),
  dateSolde: z.string().optional(),
  montantHT: z.string().optional(),
  montantTVA: z.string().optional(),
  montantTTC: z.string().optional(),
  modeRenouvellement: z.string().optional(),
  codeNomenclature: z.string().optional(),
  libelleNomenclature: z.string().optional(),
});

export type ContratCiril = z.infer<typeof ContratBrut>;

/**
 * Liste des contrats visibles depuis le point d'accès. `acces` est l'URL
 * absolue du point d'accès rendue par getAccessList (le serveur cherche la
 * clé de session dans la query string de cette URL). `requete` est un filtre
 * texte CIRIL ; vide = tout. Les montants et dates restent en string, le
 * mapping métier est côté `ciril-marches.ts`.
 */
export async function getContrats(opts: {
  urlFinances: string;
  acces: string;
  requete?: string;
}): Promise<ContratCiril[]> {
  const namespace = "Ciril:Finances:ExportFinances";
  const texte = await appel(
    opts.urlFinances,
    namespace,
    "getContrats",
    [
      ["acces", opts.acces],
      ["requete", opts.requete ?? ""],
    ],
    "",
    [opts.acces, new URL(opts.acces).search.replace(/^\?/, "")],
  );
  return extraireItems(texte).map((champs) => ContratBrut.parse(champs));
}

/** Depuis une URL d'accès web (web2java.exe), construit l'URL du webservice
 * `fin_export_finances.exe?ws` sur le même hôte. */
export function urlFinancesDepuisAcces(urlAbsolueAcces: string): string {
  const u = new URL(urlAbsolueAcces);
  return `${u.protocol}//${u.host}/cgi-bin/ws.exe/cgi-bin/fin_export_finances.exe?ws`;
}
