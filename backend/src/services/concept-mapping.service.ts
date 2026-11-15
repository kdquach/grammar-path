import prisma from "../lib/prisma";
import {
  TOEIC_GOAL_TRACKS,
  TOEIC_PART_MATRIX,
  DAILY_STUDY_STEPS,
  normalizeToeicPartLabel,
} from "../data/toeic-roadmap-data";

export interface RoadmapQueryFilter {
  part?: string;
  priority?: "core" | "recommended" | "advanced";
  goalBand?: "450+" | "600+" | "750+";
  unitNumber?: number;
}

export async function getNormalizedToeicRoadmap(filter: RoadmapQueryFilter = {}) {
  const stages = await prisma.toeicRoadmapStage.findMany({
    orderBy: { stageNumber: "asc" },
    include: {
      modules: {
        orderBy: { displayOrder: "asc" },
        include: {
          units: {
            orderBy: { displayOrder: "asc" },
            include: {
              unit: {
                select: {
                  unitNumber: true,
                  title: true,
                },
              },
              concept: {
                select: {
                  code: true,
                  name: true,
                  category: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const normalizedPartFilter = filter.part
    ? normalizeToeicPartLabel(filter.part).toLowerCase()
    : null;

  const filteredStages = stages
    .filter((stage) => {
      if (!filter.goalBand) return true;
      const track = TOEIC_GOAL_TRACKS.find((t) => t.id === filter.goalBand);
      return track ? track.includedStages.includes(stage.stageNumber) : true;
    })
    .map((stage) => {
      const mappedModules = stage.modules
        .map((mod) => {
          const moduleParts = Array.isArray(mod.toeicParts)
            ? (mod.toeicParts as string[])
            : [];

          const mappedUnits = mod.units
            .map((meta) => {
              const unitParts = Array.isArray(meta.toeicParts)
                ? (meta.toeicParts as string[])
                : [];
              return {
                unitNumber: meta.unit.unitNumber,
                unitTitle: meta.unit.title,
                priority: meta.priority,
                toeicTag: meta.toeicTag,
                toeicParts: unitParts,
                grammarFocus: meta.grammarFocus,
                noteVi: meta.noteVi,
                isOfficialToeic: meta.isOfficialToeic,
                conceptCode: meta.concept?.code ?? null,
                conceptCategory: meta.concept?.category ?? null,
              };
            })
            .filter((u) => {
              if (filter.unitNumber !== undefined && u.unitNumber !== filter.unitNumber) {
                return false;
              }
              if (filter.priority && u.priority !== filter.priority) {
                return false;
              }
              if (normalizedPartFilter) {
                return u.toeicParts.some((p) =>
                  p.toLowerCase().includes(normalizedPartFilter)
                );
              }
              return true;
            });

          return {
            id: mod.moduleKey,
            code: mod.code,
            titleVi: mod.titleVi,
            subtitleEn: mod.subtitleEn,
            toeicParts: moduleParts,
            descriptionVi: mod.descriptionVi,
            trapTipVi: mod.trapTipVi,
            units: mappedUnits,
          };
        })
        .filter((mod) => mod.units.length > 0);

      return {
        id: stage.stageKey,
        stageNumber: stage.stageNumber,
        titleVi: stage.titleVi,
        targetBand: stage.targetBand,
        goalBandKey: stage.goalBandKey,
        durationEstimate: stage.durationEstimate,
        accent: stage.accent,
        summaryVi: stage.summaryVi,
        whyForBeginnersVi: stage.whyForBeginnersVi,
        outcomeVi: stage.outcomeVi,
        modules: mappedModules,
      };
    })
    .filter((stage) => stage.modules.length > 0);

  const totalMatchedUnits = filteredStages.reduce(
    (sum, s) => sum + s.modules.reduce((mSum, m) => mSum + m.units.length, 0),
    0
  );

  return {
    stages: filteredStages,
    goalTracks: TOEIC_GOAL_TRACKS,
    partMatrix: TOEIC_PART_MATRIX,
    dailyStudySteps: DAILY_STUDY_STEPS,
    totalStages: filteredStages.length,
    totalUnitsMatched: totalMatchedUnits,
    isOfficialToeic: false,
    scopeNotice:
      "GrammarPath TOEIC roadmap aligns textbook grammar units with TOEIC Part 1–7 patterns for study planning; items are adapted and not official ETS materials.",
  };
}

export async function getGrammarConceptsCatalog(options?: {
  category?: string;
  includeTheoryLinks?: boolean;
}) {
  const concepts = await prisma.grammarConcept.findMany({
    where: options?.category ? { category: options.category } : undefined,
    orderBy: [{ parentConceptId: "asc" }, { displayOrder: "asc" }],
    include: {
      parentConcept: {
        select: {
          code: true,
          name: true,
        },
      },
      _count: {
        select: {
          childConcepts: true,
          theoryLinks: true,
        },
      },
      ...(options?.includeTheoryLinks
        ? {
            theoryLinks: {
              include: {
                theorySection: {
                  select: {
                    sectionId: true,
                    heading: true,
                    unit: {
                      select: {
                        unitNumber: true,
                      },
                    },
                  },
                },
              },
            },
          }
        : {}),
    },
  });

  const confidenceRows = await prisma.conceptTheoryLink.groupBy({
    by: ["confidence"],
    _count: { id: true },
  });

  const confidenceBreakdown: Record<string, number> = {
    high: 0,
    medium: 0,
    low: 0,
    needs_review: 0,
  };
  for (const row of confidenceRows) {
    confidenceBreakdown[row.confidence] = row._count.id;
  }

  return {
    totalConcepts: concepts.length,
    confidenceBreakdown,
    concepts: concepts.map((c: any) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      description: c.description,
      category: c.category,
      parentCode: c.parentConcept?.code ?? null,
      parentName: c.parentConcept?.name ?? null,
      childCount: c._count.childConcepts,
      theoryLinkCount: c._count.theoryLinks,
      ...(options?.includeTheoryLinks && c.theoryLinks
        ? {
            theoryLinks: c.theoryLinks.map((link: any) => ({
              sectionId: link.theorySection.sectionId,
              heading: link.theorySection.heading,
              unitNumber: link.theorySection.unit.unitNumber,
              role: link.role,
              confidence: link.confidence,
              provenance: link.provenance,
            })),
          }
        : {}),
    })),
  };
}

