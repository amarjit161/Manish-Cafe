import { SevaPageContent } from "@/components/seva-page-content";
import { HeroCanvas } from "@/components/three/hero-canvas";
import { HeroIntro } from "@/components/gsap/hero-intro";

const TRUST_POINTS = [
  { icon: "verified_user", label: "Govt-format documentation" },
  { icon: "lock", label: "Your details kept confidential" },
  { icon: "bolt", label: "Fast, in-person turnaround" },
];

export default function SevaPage() {
  return (
    <div>
      {/* Tricolor trust strip */}
      <div className="h-1.5 w-full flex">
        <div className="flex-1 bg-orange-500" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-green-600" />
      </div>

      <section className="bg-primary text-white">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="relative w-28 h-28">
              <HeroCanvas variant="seva" />
            </div>
            <HeroIntro className="flex flex-col items-center gap-4">
              <span className="inline-flex items-center gap-2 uppercase tracking-[0.2em] text-white/60 text-xs font-bold">
                <span className="material-symbols-outlined text-[16px]">workspace_premium</span>
                Authorized Digital Seva Center
              </span>
              <h1 className="text-headline-lg font-extrabold">Online Seva</h1>
              <p className="text-white/75 max-w-2xl">
                Aadhar, PAN, certificates and other government services — pick a service
                and our staff will take care of the paperwork for you.
              </p>
            </HeroIntro>
          </div>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {TRUST_POINTS.map((point) => (
              <div
                key={point.label}
                className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-lg px-4 py-3"
              >
                <span className="material-symbols-outlined text-green-400">{point.icon}</span>
                <span className="text-sm text-white/80 font-medium">{point.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-12">
        <SevaPageContent />
      </section>
    </div>
  );
}
