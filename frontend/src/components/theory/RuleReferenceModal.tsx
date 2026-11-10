import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, BookOpen, ExternalLink, HelpCircle, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../../api/client";
import type { TheorySection } from "../../types/api.types";
import { FormattedTheoryContent } from "./FormattedTheoryContent";

interface RuleReferenceModalProps {
  sectionId: string | null;
  onClose: () => void;
}

export const RuleReferenceModal: React.FC<RuleReferenceModalProps> = ({
  sectionId,
  onClose,
}) => {
  const [section, setSection] = useState<TheorySection | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sectionId) {
      setSection(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    api
      .getTheorySection(sectionId)
      .then((data) => {
        if (isMounted) {
          setSection(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || "Failed to load rule reference");
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [sectionId]);

  if (!sectionId) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[60] m-0 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rule-modal-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[85vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center space-x-3">
            <span className="inline-flex items-center justify-center px-2.5 py-1 text-sm font-bold text-brand-700 bg-brand-100 rounded-md">
              Section {sectionId}
            </span>
            <h3
              id="rule-modal-title"
              className="text-base font-semibold text-slate-800"
            >
              Grammar Rule Reference
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
              <p className="text-sm">Loading rule details...</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm">
              {error}
            </div>
          )}

          {section && !loading && (
            <>
              {/* Unit link / provenance */}
              {section.unit && (
                <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-100">
                  <div className="flex items-center space-x-1.5">
                    <BookOpen className="w-4 h-4 text-slate-400" />
                    <span>Belongs to</span>
                    <Link
                      to={`/units/${section.unit.unitNumber}`}
                      onClick={onClose}
                      className="font-medium text-brand-600 hover:text-brand-700 underline inline-flex items-center space-x-0.5"
                    >
                      <span>Unit {section.unit.unitNumber}: {section.unit.title}</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                  {section.sourcePages?.length > 0 && (
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                      PDF Page {section.sourcePages.join(", ")}
                    </span>
                  )}
                </div>
              )}

              {/* Section Heading */}
              <div>
                <h4 className="text-lg font-bold text-slate-900 leading-snug">
                  {section.heading}
                </h4>
              </div>

              {/* Source Content */}
              <FormattedTheoryContent
                content={section.sourceContent}
                sectionId={section.sectionId}
              />

              {/* Linked Questions Footer */}
              {section.linkedQuestions && section.linkedQuestions.count > 0 && (
                <div className="flex items-center space-x-2 text-xs text-slate-500 pt-2">
                  <HelpCircle className="w-4 h-4 text-slate-400" />
                  <span>
                    Linked in {section.linkedQuestions.count} exercise explanation
                    {section.linkedQuestions.count > 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end px-6 py-3 border-t border-slate-100 bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(modalContent, document.body)
    : modalContent;
};

export default RuleReferenceModal;

