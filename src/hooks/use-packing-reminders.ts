import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useLocaleStore } from "@/lib/i18n/locale-store";
import { translate } from "@/lib/i18n/translations";
import {
  getListsDueForReminder,
  markReminderShown,
  requestNotificationPermission,
  showBrowserNotification,
  formatReminderMessage,
} from "@/lib/packing-reminders";

/** Revisa recordatorios al cargar la app (ítems sin tachar después de 24 h). */
export function usePackingReminders() {
  const ran = useRef(false);
  const locale = useLocaleStore((s) => s.locale);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const run = async () => {
      await requestNotificationPermission();
      const due = getListsDueForReminder();
      if (due.length === 0) return;

      for (const reminder of due) {
        toast.warning(translate(locale, "reminder.toastTitle", { destination: reminder.destination }), {
          description: formatReminderMessage(reminder, locale),
          duration: 12000,
          action: {
            label: translate(locale, "reminder.viewList"),
            onClick: () => {
              window.location.href = `/saved-suitcases?id=${reminder.listId}`;
            },
          },
        });
        showBrowserNotification(reminder, locale);
        markReminderShown(reminder.listId);
      }
    };

    run();
  }, [locale]);
}
