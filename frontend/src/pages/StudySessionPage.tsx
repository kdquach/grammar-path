import React from "react";
import { useSearchParams, Navigate } from "react-router-dom";

/**
 * Unified Study Session Router:
 * Redirects legacy study session queries (e.g. `/study-session?unit=3&exercise=3.1`)
 * to the modern Unit learning experience with TOEIC Part 5 Checkpoint.
 */
export const StudySessionPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const unitParam = parseInt(searchParams.get("unit") || "1", 10);
  const exerciseParam = searchParams.get("exercise");
  const targetUnit = isNaN(unitParam) || unitParam < 1 || unitParam > 145 ? 1 : unitParam;

  // When an exercise/practice is requested, open the TOEIC Part 5 Checkpoint tab
  const tabQuery = exerciseParam ? "?tab=toeic_checkpoint" : "";

  return <Navigate to={`/units/${targetUnit}${tabQuery}`} replace />;
};

export default StudySessionPage;
