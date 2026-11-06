import { z } from "zod";

/**
 * Client CIRIL minimal (SOAP 1.1, style rpc/encoded). Les URL et credentials
 * viennent de l'environnement : la sandbox vit dans .env, la prod dans le
 * coffre. Les secrets ne passent jamais dans les journaux (l'enveloppe
 * tracée par CIRIL_TRACE masque le mot de passe et la clé de session).
 */
export class CirilError extends Error {}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function envelope(namespace: string, operation: string, parameters: [string, string][]): string {
  const body = parameters.map(([name, value]) => `<${name}>${escapeXml(value)}</${name}>`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <SOAP-ENV:Body>
    <m:${operation} xmlns:m="${namespace}">${body}</m:${operation}>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`;
}

async function call(
  url: string,
  namespace: string,
  operation: string,
  parameters: [string, string][],
  soapAction = `${namespace}#${operation}`,
  secrets: string[] = [],
) {
  const body = envelope(namespace, operation, parameters);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: soapAction,
    },
    body: body,
  });
  const text = await response.text();
  if (process.env.CIRIL_TRACE) {
    let maskedBody = body;
    for (const secret of secrets) {
      if (secret) maskedBody = maskedBody.split(secret).join("***");
    }
    console.log(
      `\n--- CIRIL ${operation} requête ---\n${maskedBody}\n--- réponse (${response.status}) ---\n${text.slice(0, 4000)}\n--- fin ---\n`,
    );
  }
  if (!response.ok) {
    const details = text.match(/<detail[^>]*>([\s\S]*?)<\/detail>/)?.[1];
    const message = text.match(/<faultstring[^>]*>([\s\S]*?)<\/faultstring>/)?.[1];
    throw new CirilError(
      `CIRIL ${operation} ${response.status} : ${message ?? ""} ${details ?? text.slice(0, 800)}`,
    );
  }
  const fault = text.match(/<faultstring[^>]*>([^<]+)<\/faultstring>/);
  if (fault) throw new CirilError(`CIRIL ${operation} fault : ${fault[1]}`);
  return text;
}

function decodeEntities(text: string): string {
  return text.replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)));
}

function extractItems(xml: string): Record<string, string>[] {
  const items: Record<string, string>[] = [];
  for (const block of xml.matchAll(/<item[^>]*>([\s\S]*?)<\/item>/g)) {
    const body = block[1] ?? "";
    const fields: Record<string, string> = {};
    for (const field of body.matchAll(/<([a-zA-Z]+)[^>]*>([^<]*)<\/\1>/g)) {
      const name = field[1];
      const value = field[2];
      if (name !== undefined && value !== undefined) fields[name] = decodeEntities(value);
    }
    items.push(fields);
  }
  return items;
}

const RawAccessPoint = z.object({
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
  absoluteUrl: string;
  key: string;
};

/**
 * Points d'accès ouverts à l'utilisateur. L'URL rendue par CIRIL est relative
 * (`/cgi-bin/web2java.exe?<cle>`) : on la ramène à une URL absolue sur le
 * même hôte que l'appel d'authentification.
 */
export async function getAccessList(opts: {
  url: string;
  user: string;
  password: string;
}): Promise<AccessPoint[]> {
  const namespace = "Ciril:Ciril:AccessInfo";
  const text = await call(
    opts.url,
    namespace,
    "getAccessList",
    [
      ["param-1", opts.user],
      ["param-2", opts.password],
      ["param-3", ""],
      ["param-4", ""],
    ],
    `${namespace}#getAccessList`,
    [opts.password],
  );
  return extractItems(text).map((fields) => {
    const raw = RawAccessPoint.parse(fields);
    const absoluteUrl = new URL(raw.URL, opts.url).toString();
    const key = new URL(absoluteUrl).search.replace(/^\?/, "");
    return {
      client: raw.client,
      database: raw.database,
      application: raw.application,
      netApplication: raw.netApplication,
      schema: raw.schema,
      label: raw.label,
      absoluteUrl,
      key,
    };
  });
}

const RawContract = z.object({
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

export type CirilContract = z.infer<typeof RawContract>;

/**
 * Liste des contrats visibles depuis le point d'accès. `acces` est l'URL
 * absolue du point d'accès rendue par getAccessList (le serveur cherche la
 * clé de session dans la query string de cette URL). `requete` est un filtre
 * texte CIRIL ; vide = tout. Les montants et dates restent en string, le
 * mapping métier est côté `ciril-marches.ts`.
 */
export async function getContrats(opts: {
  financeUrl: string;
  access: string;
  query?: string;
}): Promise<CirilContract[]> {
  const namespace = "Ciril:Finances:ExportFinances";
  const text = await call(
    opts.financeUrl,
    namespace,
    "getContrats",
    [
      ["acces", opts.access],
      ["requete", opts.query ?? ""],
    ],
    "",
    [opts.access, new URL(opts.access).search.replace(/^\?/, "")],
  );
  return extractItems(text).map((fields) => RawContract.parse(fields));
}

/** Depuis une URL d'accès web (web2java.exe), construit l'URL du webservice
 * `fin_export_finances.exe?ws` sur le même hôte. */
export function financeUrlFromAccess(absoluteAccessUrl: string): string {
  const u = new URL(absoluteAccessUrl);
  return `${u.protocol}//${u.host}/cgi-bin/ws.exe/cgi-bin/fin_export_finances.exe?ws`;
}
