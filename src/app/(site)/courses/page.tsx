import { CoursesPageContent } from "@/components/courses-page-content";
import { HeroCanvas } from "@/components/three/hero-canvas";
import { HeroIntro } from "@/components/gsap/hero-intro";

export default function CoursesPage() {
  return (
    <div>
      <section className="relative bg-primary text-white overflow-hidden">
        <div className="pointer-events-none absolute -top-20 right-10 w-80 h-80 rounded-full bg-tertiary-container/20 blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-center">
          <HeroIntro className="flex flex-col items-center lg:items-start text-center lg:text-left gap-3">
            <span className="uppercase tracking-widest text-white/60 text-xs font-bold">
              Learn Job-Ready Skills
            </span>
            <h1 className="text-headline-lg font-extrabold">Skill Courses</h1>
            <p className="text-white/80 max-w-2xl">
              Practical, job-ready computer courses taught in small batches — pick a
              course and send us an enquiry.
            </p>
          </HeroIntro>
          <div className="relative hidden lg:block w-48 h-48">
            <HeroCanvas variant="brand" />
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-12">
        <CoursesPageContent />
      </section>
    </div>
  );
}
