import { prisma } from "@/lib/prisma";
import { GamingBookingWidget } from "@/components/gaming-booking-widget";
import { HeroCanvas } from "@/components/three/hero-canvas";
import { HeroIntro } from "@/components/gsap/hero-intro";

export const dynamic = "force-dynamic";

export default async function GamingPage() {
  const stations = await prisma.station.findMany({
    where: { isActive: true },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });

  return (
    <div
      className="bg-[#050b16]"
      style={{
        backgroundImage:
          "linear-gradient(rgba(34,211,238,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.06) 1px, transparent 1px)",
        backgroundSize: "42px 42px",
      }}
    >
      <section className="relative overflow-hidden border-b border-cyan-500/10">
        <div className="pointer-events-none absolute -top-20 left-1/4 w-96 h-96 rounded-full bg-secondary-container/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-1/4 w-96 h-96 rounded-full bg-cyan-500/15 blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-6 py-20 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <HeroIntro className="flex flex-col items-center lg:items-start text-center lg:text-left gap-4">
            <span className="uppercase tracking-[0.2em] text-cyan-300/70 text-xs font-bold">
              Gaming Parlor
            </span>
            <h1
              className="text-headline-lg md:text-display-lg font-extrabold text-white"
              style={{ textShadow: "0 0 24px rgba(255,122,26,0.45), 0 0 48px rgba(34,211,238,0.25)" }}
            >
              Gaming House
            </h1>
            <p className="text-white/60 max-w-xl">
              High-end gaming PCs and PS5 consoles. Pick your station, pick your slot,
              and walk straight in.
            </p>
          </HeroIntro>

          <div className="relative hidden lg:block h-96">
            <HeroCanvas variant="gaming" interactive />
          </div>
        </div>
      </section>

      <section className="relative max-w-7xl mx-auto px-6 py-12">
        {stations.length === 0 ? (
          <p className="text-white/60">No gaming stations are set up yet. Please check back soon.</p>
        ) : (
          <GamingBookingWidget stations={stations} />
        )}
      </section>
    </div>
  );
}
