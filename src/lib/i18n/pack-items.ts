import type { Locale } from "./locale-store";

type Localized = Record<Locale, string>;

const normalizeKey = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const ITEM_NAMES: Record<string, Localized> = {
  "anteojos de sol": { es: "Anteojos de sol", en: "Sunglasses", pt: "Óculos de sol" },
  "anteojos recetados": { es: "Anteojos recetados", en: "Prescription glasses", pt: "Óculos de grau" },
  "mate y yerba": { es: "Mate y yerba", en: "Mate and yerba", pt: "Mate e erva" },
  libro: { es: "Libro", en: "Book", pt: "Livro" },
  laptop: { es: "Laptop", en: "Laptop", pt: "Notebook" },
  auriculares: { es: "Auriculares", en: "Headphones", pt: "Fones de ouvido" },
  camara: { es: "Cámara", en: "Camera", pt: "Câmera" },
  "paraguas plegable": { es: "Paraguas plegable", en: "Folding umbrella", pt: "Guarda-chuva dobrável" },
  "medicacion personal": { es: "Medicación personal", en: "Personal medication", pt: "Medicação pessoal" },
  toalla: { es: "Toalla", en: "Towel", pt: "Toalha" },
  "gorra o sombrero": { es: "Gorra o sombrero", en: "Cap or hat", pt: "Boné ou chapéu" },
  "zapatillas extra": { es: "Zapatillas extra", en: "Extra sneakers", pt: "Tênis extra" },
  "vestido o falda": { es: "Vestido o falda", en: "Dress or skirt", pt: "Vestido ou saia" },
  "remera deportiva": { es: "Remera deportiva", en: "Sports shirt", pt: "Camiseta esportiva" },
  pijama: { es: "Pijama", en: "Pajamas", pt: "Pijama" },
  "buzo o sweater": { es: "Buzo o sweater", en: "Hoodie or sweater", pt: "Moletom ou suéter" },
  "remeras o tops comodos": { es: "Remeras o tops cómodos", en: "Comfortable shirts or tops", pt: "Camisetas ou tops confortáveis" },
  "pantalon o jean versatil": { es: "Pantalón o jean versátil", en: "Versatile pants or jeans", pt: "Calça ou jeans versátil" },
  "short o bermuda": { es: "Short o bermuda", en: "Shorts or bermudas", pt: "Short ou bermuda" },
  "ropa interior": { es: "Ropa interior", en: "Underwear", pt: "Roupa íntima" },
  medias: { es: "Medias", en: "Socks", pt: "Meias" },
  "neceser de higiene personal": { es: "Neceser de higiene personal", en: "Personal toiletry kit", pt: "Kit de higiene pessoal" },
  "cargador de celular": { es: "Cargador de celular", en: "Phone charger", pt: "Carregador de celular" },
  "documento, pasaporte y reservas": { es: "Documento, pasaporte y reservas", en: "Documents, passport and reservations", pt: "Documentos, passaporte e reservas" },
  "conjunto formal para el casamiento": { es: "Conjunto formal para el casamiento", en: "Formal outfit for the wedding", pt: "Roupa formal para o casamento" },
  "accesorios formales": { es: "Accesorios formales", en: "Formal accessories", pt: "Acessórios formais" },
  "traje de bano": { es: "Traje de baño", en: "Swimsuit", pt: "Roupa de banho" },
  "protector solar": { es: "Protector solar", en: "Sunscreen", pt: "Protetor solar" },
  "campera de abrigo": { es: "Campera de abrigo", en: "Warm jacket", pt: "Jaqueta de abrigo" },
  "buzo o sweater termico": { es: "Buzo o sweater térmico", en: "Thermal hoodie or sweater", pt: "Moletom ou suéter térmico" },
  "gorro y guantes": { es: "Gorro y guantes", en: "Hat and gloves", pt: "Gorro e luvas" },
  "campera liviana": { es: "Campera liviana", en: "Light jacket", pt: "Jaqueta leve" },
  "zapatos formales": { es: "Zapatos formales", en: "Formal shoes", pt: "Sapatos formais" },
  "sandalias u ojotas": { es: "Sandalias u ojotas", en: "Sandals or flip-flops", pt: "Sandálias ou chinelos" },
  "botas o zapatillas de trekking": { es: "Botas o zapatillas de trekking", en: "Trekking boots or shoes", pt: "Botas ou tênis de trekking" },
  "zapatillas comodas": { es: "Zapatillas cómodas", en: "Comfortable sneakers", pt: "Tênis confortáveis" },
};

const OCCASIONS: Record<string, Localized> = {
  casamiento: { es: "Casamiento", en: "Wedding", pt: "Casamento" },
  playa: { es: "Playa", en: "Beach", pt: "Praia" },
  trabajo: { es: "Trabajo", en: "Work", pt: "Trabalho" },
  trekking: { es: "Trekking", en: "Trekking", pt: "Trekking" },
  "frio / nieve": { es: "Frío / nieve", en: "Cold / snow", pt: "Frio / neve" },
  "viaje urbano": { es: "Viaje urbano", en: "City trip", pt: "Viagem urbana" },
  "destino indicado": { es: "Destino indicado", en: "Specified destination", pt: "Destino indicado" },
};

const FORECAST_CONDITIONS: Record<string, Localized> = {
  "soleado y humedo": { es: "Soleado y húmedo", en: "Sunny and humid", pt: "Ensolarado e úmido" },
  soleado: { es: "Soleado", en: "Sunny", pt: "Ensolarado" },
  "parcialmente nublado": { es: "Parcialmente nublado", en: "Partly cloudy", pt: "Parcialmente nublado" },
  "lluvias breves": { es: "Lluvias breves", en: "Brief showers", pt: "Chuvas breves" },
  "tormenta tropical": { es: "Tormenta tropical", en: "Tropical storm", pt: "Tempestade tropical" },
  llovizna: { es: "Llovizna", en: "Drizzle", pt: "Garoa" },
  chubascos: { es: "Chubascos", en: "Showers", pt: "Pancadas de chuva" },
  nublado: { es: "Nublado", en: "Cloudy", pt: "Nublado" },
  lluvia: { es: "Lluvia", en: "Rain", pt: "Chuva" },
  lluvias: { es: "Lluvias", en: "Rain", pt: "Chuvas" },
  "lluvias dispersas": { es: "Lluvias dispersas", en: "Scattered showers", pt: "Chuvas dispersas" },
  nieve: { es: "Nieve", en: "Snow", pt: "Neve" },
  variable: { es: "Variable", en: "Variable", pt: "Variável" },
  "nublado y ventoso": { es: "Nublado y ventoso", en: "Cloudy and windy", pt: "Nublado e ventoso" },
  "lluvia fria": { es: "Lluvia fría", en: "Cold rain", pt: "Chuva fria" },
  "viento intenso": { es: "Viento intenso", en: "Strong wind", pt: "Vento forte" },
  "nieve temprana": { es: "Nieve temprana", en: "Early snow", pt: "Neve precoce" },
  "soleado extremo": { es: "Soleado extremo", en: "Extremely sunny", pt: "Extremamente ensolarado" },
  "viento con polvo": { es: "Viento con polvo", en: "Dusty wind", pt: "Vento com poeira" },
};

function lookup(map: Record<string, Localized>, value: string, locale: Locale): string {
  const entry = map[normalizeKey(value)];
  return entry?.[locale] ?? value;
}

export function translateItemName(name: string, locale: Locale): string {
  return lookup(ITEM_NAMES, name, locale);
}

export function translateOccasion(occasion: string, locale: Locale): string {
  return lookup(OCCASIONS, occasion, locale);
}

export function translateForecastCondition(condition: string, locale: Locale): string {
  return lookup(FORECAST_CONDITIONS, condition, locale);
}

export function localizePackItems<T extends { name: string }>(items: T[], locale: Locale): T[] {
  if (locale === "es") return items;
  return items.map((item) => ({ ...item, name: translateItemName(item.name, locale) }));
}
