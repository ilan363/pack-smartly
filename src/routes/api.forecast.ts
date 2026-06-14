import { createFileRoute } from "@tanstack/react-router";
import { fetchWindguruForecast } from "@/lib/windguru";

export const Route = createFileRoute("/api/forecast")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const destination = url.searchParams.get("destination")?.trim();
        const dateFrom = url.searchParams.get("dateFrom")?.trim();
        const dateTo = url.searchParams.get("dateTo")?.trim();

        if (!destination || !dateFrom || !dateTo) {
          return Response.json(
            { error: "Faltan parámetros: destination, dateFrom, dateTo" },
            { status: 400 },
          );
        }

        if (dateTo < dateFrom) {
          return Response.json(
            { error: "La fecha de vuelta debe ser posterior a la de ida" },
            { status: 400 },
          );
        }

        try {
          const forecast = await fetchWindguruForecast({
            destination,
            dateFrom,
            dateTo,
            proUser: process.env.WINDGURU_USER,
            proPassword: process.env.WINDGURU_PASSWORD,
            lat: url.searchParams.get("lat")
              ? parseFloat(url.searchParams.get("lat")!)
              : undefined,
            lon: url.searchParams.get("lon")
              ? parseFloat(url.searchParams.get("lon")!)
              : undefined,
          });

          return Response.json(forecast, {
            headers: { "Cache-Control": "public, max-age=1800" },
          });
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Error al consultar Windguru";
          return Response.json({ error: message }, { status: 502 });
        }
      },
    },
  },
});
