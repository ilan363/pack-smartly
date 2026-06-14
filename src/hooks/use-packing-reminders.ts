import { useEffect, useRef } from "react";
import { toast } from "sonner";
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

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const run = async () => {
      await requestNotificationPermission();
      const due = getListsDueForReminder();
      if (due.length === 0) return;

      for (const reminder of due) {
        toast.warning(`Valija: ${reminder.destination}`, {
          description: formatReminderMessage(reminder),
          duration: 12000,
          action: {
            label: "Ver lista",
            onClick: () => {
              window.location.href = `/saved-suitcases?id=${reminder.listId}`;
            },
          },
        });
        showBrowserNotification(reminder);
        markReminderShown(reminder.listId);
      }
    };

    run();
  }, []);
}
