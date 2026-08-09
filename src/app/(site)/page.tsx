import Link from "next/link";
import { COURSES, SEVA_SERVICES, SITE_NAME } from "@/lib/site-data";
import { HeroCanvas } from "@/components/three/hero-canvas";
import { HeroIntro } from "@/components/gsap/hero-intro";
import { Reveal } from "@/components/gsap/reveal";
import { TiltCard } from "@/components/gsap/tilt-card";

const HIGHLIGHTS = [
  {
    href: "/gaming",
    icon: "sports_esports",
    title: "Gaming House",
    description:
      "High-end gaming PCs and PS5 consoles. Book your seat and time slot online, skip the wait.",
    cta: "Book a Seat",
    accent: "bg-secondary-container",
  },
  {
    href: "/seva",
    icon: "description",
    title: "Online Seva",
    description:
      "Aadhar, PAN, certificates and more government services handled for you, digitally.",
    cta: "Request Service",
    accent: "bg-primary-container",
  },
  {
    href: "/courses",
    icon: "school",
    title: "Skill Courses",
    description:
      "Tally, MS Office, Python, Digital Marketing and more — learn job-ready skills nearby.",
    cta: "Explore Courses",
    accent: "bg-tertiary-container",
  },
];

export default function HomePage() {
  return (
    <div className="overflow-x-clip">
      {/* Hero */}
      <section className="relative bg-primary text-white overflow-hidden">
        {/* Decorative gradient orbs */}
        <div className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 rounded-full bg-secondary-container/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 right-0 w-md h-112 rounded-full bg-blue-500/20 blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-6 py-20 md:py-28 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <HeroIntro className="flex flex-col items-center lg:items-start text-center lg:text-left gap-6">
            <span className="uppercase tracking-widest text-white/60 text-xs font-bold">
              Cyber Cafe · Gaming · Digital Seva · Skill Courses
            </span>
            <h1 className="text-headline-lg md:text-display-lg font-extrabold max-w-xl">
              Welcome to {SITE_NAME}
            </h1>
            <p className="text-white/80 text-body-lg max-w-xl">
              Book a gaming PC or console, get your government paperwork done online,
              or pick up a new computer skill — all under one roof.
            </p>
            <div className="flex flex-wrap justify-center lg:justify-start gap-4 mt-2">
              <Link
                href="/gaming"
                className="flex items-center gap-2 bg-secondary-container text-white px-6 py-3 rounded-lg font-bold shadow-md hover:brightness-110 active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined">event_available</span>
                Book a Gaming Seat
              </Link>
              <Link
                href="/seva"
                className="flex items-center gap-2 bg-white text-primary px-6 py-3 rounded-lg font-bold shadow-md hover:bg-white/90 active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined">description</span>
                Request Online Seva
              </Link>
            </div>
          </HeroIntro>

          {/* 3D scene — desktop only, drag to look around */}
          <div className="relative hidden lg:block h-105">
            <HeroCanvas variant="brand" interactive />
            <p className="absolute bottom-2 inset-x-0 text-center text-white/30 text-xs font-medium">
              Drag to look around
            </p>
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <Reveal stagger className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {HIGHLIGHTS.map((item) => (
            <TiltCard key={item.href} maxTilt={8}>
              <div className="bg-white rounded-xl border border-outline-variant/60 shadow-sm hover:shadow-xl transition-shadow p-8 flex flex-col gap-4 h-full">
                <div
                  className={`w-14 h-14 rounded-xl ${item.accent} flex items-center justify-center text-white`}
                >
                  <span className="material-symbols-outlined text-3xl">{item.icon}</span>
                </div>
                <h3 className="text-headline-md text-primary">{item.title}</h3>
                <p className="text-on-surface-variant text-body-md flex-1">
                  {item.description}
                </p>
                <Link
                  href={item.href}
                  className="text-secondary font-bold text-sm inline-flex items-center gap-1 hover:underline"
                >
                  {item.cta}
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </Link>
              </div>
            </TiltCard>
          ))}
        </Reveal>
      </section>

      {/* Seva preview */}
      <section className="bg-surface-container-low py-16">
        <div className="max-w-7xl mx-auto px-6">
          <Reveal className="flex items-end justify-between mb-8">
            <h2 className="text-headline-md text-primary">Popular Online Seva Services</h2>
            <Link href="/seva" className="text-secondary font-bold text-sm hover:underline">
              View All
            </Link>
          </Reveal>
          <Reveal stagger className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {SEVA_SERVICES.slice(0, 4).map((service) => (
              <div
                key={service.id}
                className="bg-white rounded-xl border border-outline-variant/60 p-5 flex flex-col items-center text-center gap-3"
              >
                <span className="material-symbols-outlined text-primary text-3xl">
                  {service.icon}
                </span>
                <span className="text-sm font-semibold text-on-surface">{service.name}</span>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* Courses preview */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <Reveal className="flex items-end justify-between mb-8">
          <h2 className="text-headline-md text-primary">Skill Courses</h2>
          <Link href="/courses" className="text-secondary font-bold text-sm hover:underline">
            View All
          </Link>
        </Reveal>
        <Reveal stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {COURSES.slice(0, 3).map((course) => (
            <div
              key={course.id}
              className="bg-white rounded-xl border border-outline-variant/60 p-6 flex flex-col gap-3 shadow-sm"
            >
              <span className="material-symbols-outlined text-primary-container text-3xl">
                {course.icon}
              </span>
              <h3 className="font-bold text-primary">{course.name}</h3>
              <p className="text-on-surface-variant text-sm">{course.duration}</p>
              <p className="text-secondary font-bold">₹{course.fee.toLocaleString("en-IN")}</p>
            </div>
          ))}
        </Reveal>
      </section>
    </div>
  );
}
