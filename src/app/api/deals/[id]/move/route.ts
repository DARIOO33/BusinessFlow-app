import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { api, json, oneOf, readBody, wholeNumber } from "@/lib/http";
import { requireCompany } from "@/lib/tenant";
import { CLOSED_STAGES, DEAL_STAGES, dealSelect, findDealOr404 } from "@/lib/crm";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/deals/:id/move { stage, index } (any member)
// Drag and drop: puts the deal in column `stage` at position `index` (0 = top).
// An index past the end puts it at the bottom. Moving to WON/LOST sets closedAt.
export const POST = api(async (req: NextRequest, { params }: Ctx) => {
  const { companyId } = await requireCompany("MEMBER");
  const { id } = await params;
  const deal = await findDealOr404(companyId, id);
  const body = await readBody(req);

  const stage = oneOf(body.stage, DEAL_STAGES, "stage");
  const index = wholeNumber(body, "index", { required: true })!;

  const wasClosed = CLOSED_STAGES.includes(deal.stage);
  const isClosed = CLOSED_STAGES.includes(stage);
  const closedAt = !isClosed ? null : wasClosed && deal.stage === stage ? deal.closedAt : new Date();

  await prisma.$transaction(async (tx) => {
    // New order of the target column, with the deal inserted at `index`
    const others = await tx.deal.findMany({
      where: { companyId, stage, NOT: { id } },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      select: { id: true, position: true },
    });
    const order = others.map((d) => d.id);
    order.splice(Math.min(index, order.length), 0, id);

    for (const [position, dealId] of order.entries()) {
      if (dealId === id) {
        await tx.deal.update({ where: { id }, data: { stage, position, closedAt } });
      } else if (others.find((d) => d.id === dealId)!.position !== position) {
        await tx.deal.update({ where: { id: dealId }, data: { position } });
      }
    }

    // Close the gap in the column it left
    if (deal.stage !== stage) {
      await tx.deal.updateMany({
        where: { companyId, stage: deal.stage, position: { gt: deal.position } },
        data: { position: { decrement: 1 } },
      });
    }
  });

  const moved = await prisma.deal.findUniqueOrThrow({ where: { id }, select: dealSelect });
  return json({ deal: moved });
});
