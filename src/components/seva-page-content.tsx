"use client";

import { useState } from "react";
import { SEVA_SERVICES } from "@/lib/site-data";
import { SevaRequestForm } from "@/components/seva-request-form";
import { Reveal } from "@/components/gsap/reveal";
import { TiltCard } from "@/components/gsap/tilt-card";

export function SevaPageContent() {
  const [selected, setSelected] = useState<string>(SEVA_SERVICES[0].name);
  const [formKey, setFormKey] = useState(0);

  function chooseService(name: string) {
    setSelected(name);
    setFormKey((k) => k + 1);
    document.getElementById("seva-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <>
      <Reveal stagger className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
        {SEVA_SERVICES.map((service) => (
          <TiltCard key={service.id} maxTilt={5}>
            <button
              onClick={() => chooseService(service.name)}
              className="w-full bg-white rounded-xl border border-outline-variant/60 border-l-4 border-l-green-600/70 p-5 flex flex-col items-center text-center gap-3 hover:border-primary hover:shadow-md transition-all"
            >
              <span className="material-symbols-outlined text-primary text-3xl">
                {service.icon}
              </span>
              <span className="text-sm font-semibold text-on-surface">{service.name}</span>
            </button>
          </TiltCard>
        ))}
      </Reveal>

      <Reveal>
        <SevaRequestForm key={formKey} preselected={selected} />
      </Reveal>
    </>
  );
}
