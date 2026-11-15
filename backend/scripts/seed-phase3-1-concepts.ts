import { createHash } from "node:crypto";
import prisma from "../src/lib/prisma";
import {
  TOEIC_ROADMAP_STAGES,
  MODULE_GRAMMAR_CATEGORY,
  normalizeToeicParts,
} from "../src/data/toeic-roadmap-data";

function deterministicUuid(seed: string): string {
  const hex = createHash("sha256").update(seed).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(
    17,
    20
  )}-${hex.slice(20, 32)}`;
}

async function runInBatches<T>(
  items: T[],
  batchSize: number,
  fn: (item: T) => Promise<unknown>
): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    const slice = items.slice(i, i + batchSize);
    await Promise.all(slice.map(fn));
  }
}

async function main() {
  const units = await prisma.unit.findMany({
    orderBy: { unitNumber: "asc" },
    select: {
      id: true,
      unitNumber: true,
      title: true,
      theorySections: {
        orderBy: { displayOrder: "asc" },
        select: {
          id: true,
          sectionId: true,
          heading: true,
          _count: {
            select: { explanations: true },
          },
        },
      },
    },
  });

  if (units.length !== 145) {
    throw new Error(`Expected 145 canonical units, found ${units.length}`);
  }

  const unitByNumber = new Map(units.map((u) => [u.unitNumber, u]));

  const stagesPayload: Array<{
    id: string;
    stageKey: string;
    stageNumber: number;
    titleVi: string;
    targetBand: string;
    goalBandKey: string;
    durationEstimate: string;
    accent: string;
    summaryVi: string;
    whyForBeginnersVi: string;
    outcomeVi: string;
  }> = [];

  const modulesPayload: Array<{
    id: string;
    stageId: string;
    moduleKey: string;
    code: string;
    titleVi: string;
    subtitleEn: string;
    toeicParts: string[];
    descriptionVi: string;
    trapTipVi: string;
    displayOrder: number;
  }> = [];

  const parentConceptsPayload: Array<{
    id: string;
    code: string;
    name: string;
    description: string;
    category: string;
    displayOrder: number;
  }> = [];

  const unitConceptsPayload: Array<{
    id: string;
    code: string;
    name: string;
    description: string;
    category: string;
    parentConceptId: string;
    displayOrder: number;
  }> = [];

  const linksPayload: Array<{
    id: string;
    conceptId: string;
    theorySectionId: string;
    role: "primary";
    confidence: "high" | "medium" | "low" | "needs_review";
    provenance: string;
    notes: string;
  }> = [];

  const unitMetaPayload: Array<{
    id: string;
    unitId: string;
    moduleId: string;
    conceptId: string;
    priority: "core" | "recommended" | "advanced";
    toeicTag: string;
    toeicParts: string[];
    grammarFocus: string;
    noteVi: string;
    isOfficialToeic: boolean;
    displayOrder: number;
  }> = [];

  const confidenceCounts: Record<string, number> = {
    high: 0,
    medium: 0,
    low: 0,
    needs_review: 0,
  };

  let moduleGlobalOrder = 0;

  for (const stage of TOEIC_ROADMAP_STAGES) {
    const stageId = deterministicUuid(`toeic_stage:${stage.id}`);
    stagesPayload.push({
      id: stageId,
      stageKey: stage.id,
      stageNumber: stage.stageNumber,
      titleVi: stage.titleVi,
      targetBand: stage.targetBand,
      goalBandKey: stage.goalBandKey,
      durationEstimate: stage.durationEstimate,
      accent: stage.accent,
      summaryVi: stage.summaryVi,
      whyForBeginnersVi: stage.whyForBeginnersVi,
      outcomeVi: stage.outcomeVi,
    });

    for (let mIdx = 0; mIdx < stage.modules.length; mIdx += 1) {
      const mod = stage.modules[mIdx];
      moduleGlobalOrder += 1;
      const catInfo = MODULE_GRAMMAR_CATEGORY[mod.code] || {
        category: "general_grammar",
        categoryLabel: mod.subtitleEn,
      };
      const normalizedModuleParts = normalizeToeicParts(mod.toeicParts);

      const parentCode = `module.${mod.code}`;
      const parentConceptId = deterministicUuid(`grammar_concept:${parentCode}`);
      parentConceptsPayload.push({
        id: parentConceptId,
        code: parentCode,
        name: mod.subtitleEn,
        description: `${mod.titleVi} — ${mod.descriptionVi}`,
        category: catInfo.category,
        displayOrder: moduleGlobalOrder,
      });

      const moduleId = deterministicUuid(`toeic_module:${mod.id}`);
      modulesPayload.push({
        id: moduleId,
        stageId,
        moduleKey: mod.id,
        code: mod.code,
        titleVi: mod.titleVi,
        subtitleEn: mod.subtitleEn,
        toeicParts: normalizedModuleParts,
        descriptionVi: mod.descriptionVi,
        trapTipVi: mod.trapTipVi,
        displayOrder: mIdx + 1,
      });

      for (let uIdx = 0; uIdx < mod.units.length; uIdx += 1) {
        const entry = mod.units[uIdx];
        const unit = unitByNumber.get(entry.unitNumber);
        if (!unit) {
          throw new Error(`Missing canonical unit ${entry.unitNumber}`);
        }

        const unitCode = `unit.${String(unit.unitNumber).padStart(3, "0")}`;
        const unitConceptId = deterministicUuid(`grammar_concept:${unitCode}`);
        unitConceptsPayload.push({
          id: unitConceptId,
          code: unitCode,
          name: unit.title,
          description: `${catInfo.categoryLabel} — Unit ${unit.unitNumber}: ${entry.noteVi}`,
          category: catInfo.category,
          parentConceptId,
          displayOrder: unit.unitNumber,
        });

        for (const section of unit.theorySections) {
          const expCount = section._count.explanations;
          let confidence: "high" | "medium" | "low" | "needs_review";
          let provenance: string;
          let notes: string;

          if (expCount > 0) {
            confidence = "high";
            provenance = "explanation_rule_reference_and_unit_curriculum";
            notes = `Verified by ${expCount} canonical Explanation link(s) to section ${section.sectionId} within Unit ${unit.unitNumber}.`;
          } else if (
            /^(study this example situation|compare\b)/i.test(section.heading.trim())
          ) {
            confidence = "needs_review";
            provenance = "unit_theory_unreferenced_intro_or_contrast";
            notes = `Section ${section.sectionId} ('${section.heading}') has 0 direct Explanation citations; flagged needs_review for sub-concept review.`;
          } else {
            confidence = "medium";
            provenance = "unit_theory_heading_without_explanation_ref";
            notes = `Section ${section.sectionId} ('${section.heading}') has 0 direct Explanation citations; mapped via canonical Unit ${unit.unitNumber} containment.`;
          }

          confidenceCounts[confidence] += 1;
          linksPayload.push({
            id: deterministicUuid(`concept_theory_link:${unitCode}:${section.sectionId}`),
            conceptId: unitConceptId,
            theorySectionId: section.id,
            role: "primary",
            confidence,
            provenance,
            notes,
          });
        }

        const normalizedUnitParts = normalizeToeicParts(entry.toeicParts);
        unitMetaPayload.push({
          id: deterministicUuid(`unit_toeic_metadata:${unit.unitNumber}`),
          unitId: unit.id,
          moduleId,
          conceptId: unitConceptId,
          priority: entry.priority,
          toeicTag: entry.toeicTag,
          toeicParts: normalizedUnitParts,
          grammarFocus: catInfo.categoryLabel,
          noteVi: entry.noteVi,
          isOfficialToeic: false,
          displayOrder: uIdx + 1,
        });
      }
    }
  }

  // Upsert sequentially by hierarchy level with bounded concurrency
  await runInBatches(stagesPayload, 10, (s) =>
    prisma.toeicRoadmapStage.upsert({
      where: { stageKey: s.stageKey },
      create: s,
      update: {
        stageNumber: s.stageNumber,
        titleVi: s.titleVi,
        targetBand: s.targetBand,
        goalBandKey: s.goalBandKey,
        durationEstimate: s.durationEstimate,
        accent: s.accent,
        summaryVi: s.summaryVi,
        whyForBeginnersVi: s.whyForBeginnersVi,
        outcomeVi: s.outcomeVi,
      },
    })
  );

  await runInBatches(parentConceptsPayload, 10, (p) =>
    prisma.grammarConcept.upsert({
      where: { code: p.code },
      create: {
        ...p,
        parentConceptId: null,
      },
      update: {
        name: p.name,
        description: p.description,
        category: p.category,
        parentConceptId: null,
        displayOrder: p.displayOrder,
      },
    })
  );

  await runInBatches(modulesPayload, 10, (m) =>
    prisma.toeicRoadmapModule.upsert({
      where: { moduleKey: m.moduleKey },
      create: m,
      update: {
        stageId: m.stageId,
        code: m.code,
        titleVi: m.titleVi,
        subtitleEn: m.subtitleEn,
        toeicParts: m.toeicParts,
        descriptionVi: m.descriptionVi,
        trapTipVi: m.trapTipVi,
        displayOrder: m.displayOrder,
      },
    })
  );

  await runInBatches(unitConceptsPayload, 20, (c) =>
    prisma.grammarConcept.upsert({
      where: { code: c.code },
      create: c,
      update: {
        name: c.name,
        description: c.description,
        category: c.category,
        parentConceptId: c.parentConceptId,
        displayOrder: c.displayOrder,
      },
    })
  );

  await runInBatches(linksPayload, 25, (l) =>
    prisma.conceptTheoryLink.upsert({
      where: {
        conceptId_theorySectionId: {
          conceptId: l.conceptId,
          theorySectionId: l.theorySectionId,
        },
      },
      create: l,
      update: {
        role: l.role,
        confidence: l.confidence,
        provenance: l.provenance,
        notes: l.notes,
      },
    })
  );

  await runInBatches(unitMetaPayload, 20, (u) =>
    prisma.unitToeicMetadata.upsert({
      where: { unitId: u.unitId },
      create: u,
      update: {
        moduleId: u.moduleId,
        conceptId: u.conceptId,
        priority: u.priority,
        toeicTag: u.toeicTag,
        toeicParts: u.toeicParts,
        grammarFocus: u.grammarFocus,
        noteVi: u.noteVi,
        isOfficialToeic: u.isOfficialToeic,
        displayOrder: u.displayOrder,
      },
    })
  );

  const [
    totalStages,
    totalModules,
    totalUnitMeta,
    totalConcepts,
    totalLinks,
    unlinkedSections,
  ] = await Promise.all([
    prisma.toeicRoadmapStage.count(),
    prisma.toeicRoadmapModule.count(),
    prisma.unitToeicMetadata.count(),
    prisma.grammarConcept.count(),
    prisma.conceptTheoryLink.count(),
    prisma.theorySection.count({
      where: {
        conceptLinks: {
          none: {},
        },
      },
    }),
  ]);

  console.log("[Phase 3.1 Seed Summary]", {
    parentConceptCount: parentConceptsPayload.length,
    unitConceptCount: unitConceptsPayload.length,
    totalConcepts,
    linkCount: linksPayload.length,
    totalLinks,
    confidenceCounts,
    unlinkedSections,
    totalStages,
    totalModules,
    totalUnitMeta,
  });

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
