import { AlertTriangle, MapPin, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { GuardianMapLoader } from "@/components/guardian-map-loader";
import { PageHeader } from "@/components/page-header";

export default function MapPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Guardian Map"
        title="Live location alerts without Google Maps billing."
        description="Click once to share browser location, then Guardian checks nearby weather and emergency-style alerts."
      />

      <section className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <GuardianMapLoader />

        <aside className="space-y-4">
          <article className="rounded-md border border-line bg-white p-5 shadow-soft">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-teal" />
              <h2 className="font-semibold">Map Source</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-ink/65">
              OpenStreetMap tiles render the map. Weather and emergency alerts can come from the free National Weather
              Service API for US coordinates, with mock alerts available for traffic and demos.
            </p>
          </article>

          <article className="rounded-md border border-coral/60 bg-white p-5 shadow-soft">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-coral" />
              <h2 className="font-semibold">Urgent</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-ink/65">
              Traffic accident near the route to your next meeting. Guardian would suggest leaving earlier or drafting a
              delay note.
            </p>
          </article>

          <article className="rounded-md border border-line bg-white p-5 shadow-soft">
            <div className="flex items-center gap-2">
              <MapPin size={18} className="text-gold" />
              <h2 className="font-semibold">Next Step</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-ink/65">
              Live location is opt-in. Next we can save the user's preferred city and add route checks from Calendar.
            </p>
          </article>
        </aside>
      </section>
    </AppShell>
  );
}
