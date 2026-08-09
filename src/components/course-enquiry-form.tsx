"use client";

import { useState } from "react";
import { COURSES } from "@/lib/site-data";

export function CourseEnquiryForm({ preselected }: { preselected?: string }) {
  const [courseName, setCourseName] = useState(preselected ?? COURSES[0].name);
  const [studentName, setStudentName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentName, phone, courseName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ ok: false, message: data.error ?? "Something went wrong" });
      } else {
        setResult({
          ok: true,
          message: "Enquiry received! Our team will call you with batch timings and fee details.",
        });
        setStudentName("");
        setPhone("");
      }
    } catch {
      setResult({ ok: false, message: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      id="course-form"
      onSubmit={handleSubmit}
      className="bg-white rounded-xl border border-outline-variant shadow-sm p-6 space-y-4 max-w-xl mx-auto"
    >
      <h3 className="text-headline-md text-primary">Enquire About a Course</h3>

      <div>
        <label className="block text-sm font-bold text-primary mb-2">Course</label>
        <select
          value={courseName}
          onChange={(e) => setCourseName(e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg border border-outline-variant focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-white"
        >
          {COURSES.map((course) => (
            <option key={course.id} value={course.name}>
              {course.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-bold text-primary mb-2">Your Name</label>
        <input
          required
          value={studentName}
          onChange={(e) => setStudentName(e.target.value)}
          placeholder="Full name"
          className="w-full px-4 py-2.5 rounded-lg border border-outline-variant focus:ring-2 focus:ring-primary focus:border-primary outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-primary mb-2">Phone Number</label>
        <input
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+91 98765 43210"
          className="w-full px-4 py-2.5 rounded-lg border border-outline-variant focus:ring-2 focus:ring-primary focus:border-primary outline-none"
        />
      </div>

      {result && (
        <div
          className={`rounded-lg px-4 py-3 text-sm font-medium ${
            result.ok
              ? "bg-tertiary-container/10 text-tertiary-container"
              : "bg-error-container text-on-error-container"
          }`}
        >
          {result.message}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3.5 bg-primary text-white font-bold rounded-lg shadow-md hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
      >
        {submitting ? "Submitting…" : "Send Enquiry"}
      </button>
    </form>
  );
}
