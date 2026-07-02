const env = import.meta.env;

const BASE_URL =
  (env.VITE_AMADEUS_BASE_URL as string | undefined)?.replace(/\/$/, "") ||
  "https://test.api.amadeus.com";

let tokenCache: { accessToken: string; expiresAt: number } | null = null;

export function hasAmadeusCredentials() {
  return Boolean(env.VITE_AMADEUS_CLIENT_ID && env.VITE_AMADEUS_CLIENT_SECRET);
}

async function getAccessToken(): Promise<string> {
  const clientId = env.VITE_AMADEUS_CLIENT_ID;
  const clientSecret = env.VITE_AMADEUS_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Faltan credenciales de Amadeus (VITE_AMADEUS_CLIENT_ID / SECRET)");
  }

  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt > now + 60_000) {
    return tokenCache.accessToken;
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch(`${BASE_URL}/v1/security/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    throw new Error(`Amadeus auth ${res.status}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };

  tokenCache = {
    accessToken: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  };

  return data.access_token;
}

export async function amadeusGet<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
): Promise<T> {
  const token = await getAccessToken();
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Amadeus ${path} ${res.status}${text ? `: ${text.slice(0, 120)}` : ""}`);
  }

  return (await res.json()) as T;
}
