"use client";

import { daysUntil, formatDate, useApi, type Company, type Member } from "@/lib/api-client";
import { hasRole } from "@/lib/roles";
import { useMe } from "@/components/me-provider";
import { ButtonLink, PageHeader, Panel, Tile } from "@/components/ui";

export function DashboardView() {
  const { company } = useMe();
  const details = useApi<{ company: Company }>("/api/companies/current");
  const members = useApi<{ members: Member[] }>("/api/members");
  const canManage = hasRole(company.role, "ADMIN");

  const trialEnd = details.data?.company.trialEndsAt;
  const profileDone = Boolean(details.data?.company.address && details.data?.company.taxId);
  const teamDone = (members.data?.members.length ?? 0) > 1;

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={
          trialEnd ? `${company.name} · trial ends ${formatDate(trialEnd)} (${daysUntil(trialEnd)} days left)` : company.name
        }
        action={
          canManage && (
            <ButtonLink href="/team?invite=1" variant="primary">
              Invite your team
            </ButtonLink>
          )
        }
      />

      <Panel className="px-6 py-2">
        <h2 className="mt-4 mb-1 text-lg font-semibold">Get {company.name} ready</h2>
        <ol>
          <Step done title="Create the company" text={`You're a ${company.role.toLowerCase()} here.`} />
          <Step
            done={teamDone}
            title="Invite your team"
            text={
              canManage
                ? "Admins manage people and settings; members see the company and its work."
                : "Only admins and owners can invite people."
            }
            action={canManage && !teamDone ? { href: "/team?invite=1", label: "Invite" } : undefined}
          />
          <Step
            done={profileDone}
            title="Add your invoice details"
            text="Address, tax ID and logo appear on every invoice."
            action={canManage && !profileDone ? { href: "/settings", label: "Open settings" } : undefined}
          />
        </ol>
      </Panel>

      <section className="flex flex-col gap-2 rounded-lg border border-dashed border-line-strong p-6">
        <h2 className="text-lg font-semibold">Your numbers will live here</h2>
        <p className="max-w-[60ch] text-[15px] leading-relaxed text-muted">
          Unpaid and overdue invoices, active projects and tasks due this week show up once contacts, projects and
          invoices are added.
        </p>
      </section>
    </>
  );
}

function Step({
  done,
  title,
  text,
  action,
}: {
  done: boolean;
  title: string;
  text: string;
  action?: { href: string; label: string };
}) {
  return (
    <li className="flex items-start gap-3.5 border-t border-line-soft py-4 first:border-t-0">
      <Tile tone={done ? "live" : "dim"} className="mt-0.5 min-w-[52px] justify-center">
        {done ? "Done" : "Next"}
      </Tile>
      <div className="flex flex-1 flex-col gap-1">
        <strong className="text-[15px]">{title}</strong>
        <span className="text-sm text-muted">{text}</span>
      </div>
      {action && (
        <ButtonLink href={action.href} size="sm">
          {action.label}
        </ButtonLink>
      )}
    </li>
  );
}
