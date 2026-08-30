import Link from "next/link";
import type { ApplicationProgress } from "@/lib/applications/progress";
import { ApplicationStageBadge } from "@/components/customer/status-badge";
import { formatRequestedUpdates } from "@/lib/applications/aadhaar-fields";
import { APPOINTMENT_STATUS_CHIP, formatAppointmentDateShort, formatSlotTime, type AppointmentStatus } from "@/lib/applications/appointments";
import { formatDate } from "@/lib/format";

type Application = {
  id: string;
  application_number: string | null;
  answers: unknown;
  created_at: string;
  submitted_at?: string | null;
  services: { name: string | null; slug?: string | null } | null;
};

type AppointmentSummary = {
  appointment_date: string;
  status: AppointmentStatus;
  appointment_slot_templates: { start_time: string } | null;
} | null;

const CTA_LABEL: Record<string, string> = {
  draft: "Continue application →",
  action_required: "Fix application →",
  completed: "View details →",
};

/**
 * The one card used everywhere an application is listed (dashboard,
 * applications list) -- so the language a customer sees never drifts
 * between pages. Status comes entirely from getApplicationProgress() via
 * ApplicationStageBadge; nothing here re-derives "what does this status
 * mean" on its own.
 */
export function ApplicationSummaryCard({
  application,
  progress,
  appointment = null,
}: {
  application: Application;
  progress: ApplicationProgress;
  appointment?: AppointmentSummary;
}) {
  const href = `/customer/applications/${application.application_number ?? application.id}`;
  const isDraft = progress.stage === "draft";
  const needsAction = progress.actionRequired.length > 0;
  const isCompleted = progress.terminal === "completed";
  const cta = needsAction ? CTA_LABEL.action_required : isDraft ? CTA_LABEL.draft : isCompleted ? CTA_LABEL.completed : "View application →";

  const requestedUpdates = formatRequestedUpdates(application.answers as Record<string, unknown> | null);

  return (
    <Link
      href={href}
      className="block rounded-xl bg-surface-container-lowest border border-outline-variant p-4 space-y-2"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-body-lg text-foreground font-medium">{application.services?.name ?? "Service"}</span>
        <ApplicationStageBadge stage={progress.stage} />
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-label-sm text-on-surface-variant">
          {application.application_number ?? "Draft — not yet submitted"}
        </p>
        <p className="text-label-sm text-on-surface-variant whitespace-nowrap">
          {isDraft ? "Created " : "Submitted "}
          {formatDate((isDraft ? application.created_at : application.submitted_at) ?? application.created_at)}
        </p>
      </div>

      {requestedUpdates.length > 0 ? (
        <p className="text-label-sm text-on-surface-variant truncate">{requestedUpdates.join(" · ")}</p>
      ) : null}

      {needsAction ? (
        <p className="text-body-md text-foreground">
          Your {progress.actionRequired[0].documentTypeName} needs to be replaced.
        </p>
      ) : null}

      {appointment && appointment.status === "booked" ? (
        <p className="text-label-sm font-medium text-foreground">
          Appointment · {formatAppointmentDateShort(appointment.appointment_date)}
          {appointment.appointment_slot_templates ? ` · ${formatSlotTime(appointment.appointment_slot_templates.start_time)}` : ""}
        </p>
      ) : appointment ? (
        <p className="text-label-sm text-on-surface-variant">{APPOINTMENT_STATUS_CHIP[appointment.status]}</p>
      ) : null}

      <span className="inline-block text-label-sm font-medium text-primary">{cta}</span>
    </Link>
  );
}
