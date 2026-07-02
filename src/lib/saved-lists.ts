export type SavedListItem = {
  id: string;
  name: string;
  category: string;
  weight: number;
  checked: boolean;
};

export type SavedList = {
  id: string;
  destination: string;
  dateFrom?: string;
  dateTo?: string;
  weather?: string;
  totalWeight: number;
  luggageCapacityKg?: number;
  items: SavedListItem[];
  createdAt: string;
  updatedAt: string;
  /** Timestamp cuando mostramos el recordatorio de ítems pendientes */
  lastReminderAt?: string;
};

let savedLists: SavedList[] = [];

function readAll(): SavedList[] {
  return savedLists;
}

function writeAll(lists: SavedList[]) {
  savedLists = lists;
}

export function getSavedLists(): SavedList[] {
  return readAll().sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function getSavedList(id: string): SavedList | undefined {
  return readAll().find((l) => l.id === id);
}

export function saveList(list: SavedList) {
  const all = readAll();
  const idx = all.findIndex((l) => l.id === list.id);
  if (idx >= 0) all[idx] = list;
  else all.push(list);
  writeAll(all);
}

export function deleteSavedList(id: string) {
  writeAll(readAll().filter((l) => l.id !== id));
}

export function clearAllSavedLists() {
  writeAll([]);
}

export function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createSavedList(input: {
  destination: string;
  dateFrom?: string;
  dateTo?: string;
  weather?: string;
  totalWeight: number;
  luggageCapacityKg?: number;
  items: { name: string; category: string; weight: number }[];
}): SavedList {
  const now = new Date().toISOString();
  return {
    id: createId(),
    destination: input.destination,
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
    weather: input.weather,
    totalWeight: input.totalWeight,
    luggageCapacityKg: input.luggageCapacityKg,
    items: input.items.map((item) => ({
      id: createId(),
      name: item.name,
      category: item.category,
      weight: item.weight,
      checked: false,
    })),
    createdAt: now,
    updatedAt: now,
  };
}

export function uncheckedCount(list: SavedList): number {
  return list.items.filter((i) => !i.checked).length;
}

export function packedWeight(list: SavedList): number {
  return list.items
    .filter((i) => i.checked)
    .reduce((sum, i) => sum + i.weight, 0);
}
