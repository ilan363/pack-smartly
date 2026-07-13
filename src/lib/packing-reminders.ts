import {
  getSavedLists,
  saveList,
  uncheckedCount,
  type SavedList,
} from "./saved-lists";
import type { Locale } from "./i18n/locale-store";
import { translate } from "./i18n/translations";
import { translateItemName } from "./i18n/pack-items";

const REMINDER_MS = 24 * 60 * 60 * 1000; // al día siguiente

export type PackingReminder = {
  listId: string;
  destination: string;
  pendingItems: string[];
};

export function getListsDueForReminder(now = Date.now()): PackingReminder[] {
  const reminders: PackingReminder[] = [];

  for (const list of getSavedLists()) {
    const pending = list.items.filter((i) => !i.checked);
    if (pending.length === 0) continue;

    const created = new Date(list.createdAt).getTime();
    const dueAt = created + REMINDER_MS;
    if (now < dueAt) continue;

    const lastReminder = list.lastReminderAt
      ? new Date(list.lastReminderAt).getTime()
      : 0;
    // Solo recordar una vez por ciclo de 24h tras crear la lista
    if (lastReminder >= dueAt) continue;

    reminders.push({
      listId: list.id,
      destination: list.destination,
      pendingItems: pending.map((i) => i.name),
    });
  }

  return reminders;
}

export function markReminderShown(listId: string) {
  const lists = getSavedLists();
  const list = lists.find((l) => l.id === listId);
  if (!list) return;
  saveList({
    ...list,
    lastReminderAt: new Date().toISOString(),
  });
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return Notification.requestPermission();
}

export function showBrowserNotification(reminder: PackingReminder, locale: Locale = "es") {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const count = reminder.pendingItems.length;
  const preview = reminder.pendingItems
    .slice(0, 3)
    .map((name) => translateItemName(name, locale))
    .join(", ");
  const more =
    count > 3 ? translate(locale, "reminder.more", { count: count - 3 }) : "";

  new Notification(translate(locale, "reminder.title"), {
    body: translate(locale, "reminder.body", { destination: reminder.destination, preview, more }),
    icon: "/favicon.ico",
    tag: `pack-reminder-${reminder.listId}`,
  });
}

export function formatReminderMessage(reminder: PackingReminder, locale: Locale = "es"): string {
  const names = reminder.pendingItems
    .slice(0, 4)
    .map((name) => translateItemName(name, locale))
    .join(", ");
  const extra =
    reminder.pendingItems.length > 4
      ? translate(locale, "reminder.toastExtra", { count: reminder.pendingItems.length - 4 })
      : "";
  return translate(locale, "reminder.toastMessage", { names, extra });
}
