"use client";

import { useState } from "react";
import { COURSES } from "@/lib/site-data";
import { CourseEnquiryForm } from "@/components/course-enquiry-form";
import { Reveal } from "@/components/gsap/reveal";
import { TiltCard } from "@/components/gsap/tilt-card";

export function CoursesPageContent() {
  const [selected, setSelected] = useState<string>(COURSES[0].name);
  const [formKey, setFormKey] = useState(0);

  function chooseCourse(name: string) {
    setSelected(name);
    setFormKey((k) => k + 1);
    document.getElementById("course-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <>
      <Reveal stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
        {COURSES.map((course) => (
          <TiltCard key={course.id} maxTilt={6}>
            <button
              onClick={() => chooseCourse(course.name)}
              className="w-full h-full text-left bg-white rounded-xl border border-outline-variant/60 p-6 flex flex-col gap-3 shadow-sm hover:border-primary hover:shadow-lg transition-shadow"
            >
              <span className="material-symbols-outlined text-primary-container text-3xl">
                {course.icon}
              </span>
              <h3 className="font-bold text-primary">{course.name}</h3>
              <p className="text-on-surface-variant text-sm">{course.duration}</p>
              <p className="text-secondary font-bold">₹{course.fee.toLocaleString("en-IN")}</p>
            </button>
          </TiltCard>
        ))}
      </Reveal>

      <Reveal>
        <CourseEnquiryForm key={formKey} preselected={selected} />
      </Reveal>
    </>
  );
}
