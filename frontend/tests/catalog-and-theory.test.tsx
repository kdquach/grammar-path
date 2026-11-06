import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CatalogPage from "../src/pages/CatalogPage";
import TheoryViewer from "../src/components/theory/TheoryViewer";
import RuleReferenceModal from "../src/components/theory/RuleReferenceModal";
import api from "../src/api/client";
import type {
  Book,
  UnitSummary,
  TheorySection,
  TextbookExample,
} from "../src/types/api.types";

vi.mock("../src/api/client", () => {
  return {
    default: {
      getBook: vi.fn(),
      getUnits: vi.fn(),
      getTheorySection: vi.fn(),
      getUnitDetail: vi.fn(),
      getUnitTheory: vi.fn(),
      explainTheory: vi.fn(),
    },
    api: {
      getBook: vi.fn(),
      getUnits: vi.fn(),
      getTheorySection: vi.fn(),
      getUnitDetail: vi.fn(),
      getUnitTheory: vi.fn(),
      explainTheory: vi.fn(),
    },
  };
});

const mockBook: Book = {
  id: "book-1",
  title: "English Grammar in Use",
  edition: "4th Edition",
  author: "Raymond Murphy",
  publisher: "Cambridge University Press",
  pdfFilename: "English Grammar In Use - 4th Edition.pdf",
  totalPdfPages: 399,
  totalUnits: 145,
  totalExercises: 549,
  totalQuestions: 4414,
  totalTheorySections: 542,
  totalTextbookExamples: 639,
};

const mockUnits: UnitSummary[] = [
  {
    id: "unit-1",
    unitNumber: 1,
    title: "Present continuous (I am doing)",
    theoryPdfPage: 13,
    exercisePdfPage: 14,
    bookTheoryPage: 2,
    bookExercisePage: 3,
    bookAnswerKeyPage: 336,
    confidenceLevel: "verified_visual",
    counts: {
      theorySections: 5,
      textbookExamples: 14,
      exercises: 4,
      questions: 25,
    },
  },
  {
    id: "unit-2",
    unitNumber: 2,
    title: "Present simple (I do)",
    theoryPdfPage: 15,
    exercisePdfPage: 16,
    bookTheoryPage: 4,
    bookExercisePage: 5,
    bookAnswerKeyPage: 336,
    confidenceLevel: "verified_visual",
    counts: {
      theorySections: 4,
      textbookExamples: 12,
      exercises: 4,
      questions: 28,
    },
  },
];

const mockTheorySections: TheorySection[] = [
  {
    id: "ts-1",
    sectionId: "1A",
    heading: "Study this example situation:",
    sourceContent: "Sarah is in her car. She is driving to work.",
    displayOrder: 1,
    sourcePages: [13],
  },
  {
    id: "ts-2",
    sectionId: "1B",
    heading: "I am doing something = I'm in the middle of doing it:",
    sourceContent: "The action is not finished.",
    displayOrder: 2,
    sourcePages: [13],
    unit: {
      unitNumber: 1,
      title: "Present continuous (I am doing)",
    },
    linkedQuestions: {
      count: 6,
      questionIds: ["1.1-q1", "1.1-q7"],
    },
  },
];

const mockTextbookExamples: TextbookExample[] = [
  {
    id: "ex-1",
    exampleId: "1-ex-01",
    originalText: "Sarah is driving to work.",
    translationVi: "Sarah đang lái xe đi làm.",
    displayOrder: 1,
    sourcePages: [13],
  },
  {
    id: "ex-2",
    exampleId: "1-ex-02",
    originalText: "I am trying to work.",
    translationVi: "Tôi đang cố gắng làm việc.",
    displayOrder: 2,
    sourcePages: [13],
  },
];

describe("CatalogPage Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getBook).mockResolvedValue(mockBook);
    vi.mocked(api.getUnits).mockResolvedValue({
      units: mockUnits,
      meta: {
        page: 1,
        limit: 20,
        totalItems: 2,
        totalPages: 1,
      },
    });
  });

  it("1. Renders book title, curriculum totals, and unit cards", async () => {
    render(
      <MemoryRouter>
        <CatalogPage />
      </MemoryRouter>
    );

    // Verify hero and book metadata
    await waitFor(() => {
      expect(screen.getByText("English Grammar in Use")).toBeInTheDocument();
      expect(
        screen.getByText(/Raymond Murphy/i)
      ).toBeInTheDocument();
      expect(screen.getByText("145")).toBeInTheDocument(); // total units
    });

    // Verify unit cards rendered
    expect(screen.getByText("Present continuous (I am doing)")).toBeInTheDocument();
    expect(screen.getByText("Present simple (I do)")).toBeInTheDocument();
    expect(screen.getByText("Unit 1")).toBeInTheDocument();
    expect(screen.getByText("Unit 2")).toBeInTheDocument();

    // Verify counts badge
    expect(screen.getByText("Theory p.13")).toBeInTheDocument();
  });

  it("2. Triggers search query and range filters", async () => {
    render(
      <MemoryRouter>
        <CatalogPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Search by unit title/i)).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search by unit title/i);
    fireEvent.change(searchInput, { target: { value: "continuous" } });

    await waitFor(() => {
      expect(api.getUnits).toHaveBeenCalledWith(
        expect.objectContaining({
          search: "continuous",
        })
      );
    });

    // Click range filter pill "Units 1–30"
    const rangePill = screen.getByText("Units 1–30");
    fireEvent.click(rangePill);

    await waitFor(() => {
      expect(api.getUnits).toHaveBeenCalledWith(
        expect.objectContaining({
          fromUnit: 1,
          toUnit: 30,
        })
      );
    });
  });
});

describe("TheoryViewer Component", () => {
  it("3. Renders theory sections and textbook examples, and toggles Vietnamese translations", () => {
    render(
      <TheoryViewer
        theorySections={mockTheorySections}
        textbookExamples={mockTextbookExamples}
      />
    );

    // Theory sections check
    expect(screen.getByText("Section 1A")).toBeInTheDocument();
    expect(screen.getByText("Study this example situation:")).toBeInTheDocument();
    expect(
      screen.getByText("Sarah is in her car. She is driving to work.")
    ).toBeInTheDocument();

    expect(screen.getByText("Section 1B")).toBeInTheDocument();

    // Textbook examples check
    expect(screen.getByText("Sarah is driving to work.")).toBeInTheDocument();
    expect(screen.getByText("I am trying to work.")).toBeInTheDocument();

    // Translations are visible initially (default showAllTranslations = true)
    expect(screen.getByText("Sarah đang lái xe đi làm.")).toBeInTheDocument();
    expect(screen.getByText("Tôi đang cố gắng làm việc.")).toBeInTheDocument();

    // Toggle global translations off
    const globalToggleBtn = screen.getByRole("button", {
      name: /Hide all Vietnamese translations/i,
    });
    fireEvent.click(globalToggleBtn);

    // Translations should now be hidden
    expect(
      screen.queryByText("Sarah đang lái xe đi làm.")
    ).not.toBeInTheDocument();

    // Individual reveal toggle
    const revealBtns = screen.getAllByText("Reveal Vietnamese translation");
    expect(revealBtns.length).toBe(2);
    fireEvent.click(revealBtns[0]);

    // Example 1 should be revealed while Example 2 remains hidden
    expect(screen.getByText("Sarah đang lái xe đi làm.")).toBeInTheDocument();
    expect(
      screen.queryByText("Tôi đang cố gắng làm việc.")
    ).not.toBeInTheDocument();
  });
});

describe("RuleReferenceModal Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("4. Fetches and displays theory section details when sectionId is provided", async () => {
    vi.mocked(api.getTheorySection).mockResolvedValue(mockTheorySections[1]);
    const handleClose = vi.fn();

    const { rerender } = render(
      <MemoryRouter>
        <RuleReferenceModal sectionId={null} onClose={handleClose} />
      </MemoryRouter>
    );

    // When sectionId is null, modal should not render
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // Open modal with sectionId "1B"
    rerender(
      <MemoryRouter>
        <RuleReferenceModal sectionId="1B" onClose={handleClose} />
      </MemoryRouter>
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await waitFor(() => {
      expect(api.getTheorySection).toHaveBeenCalledWith("1B");
      expect(
        screen.getByText("I am doing something = I'm in the middle of doing it:")
      ).toBeInTheDocument();
      expect(screen.getByText("The action is not finished.")).toBeInTheDocument();
      expect(
        screen.getByText(/Linked in 6 exercise explanations/i)
      ).toBeInTheDocument();
    });

    // Test close button
    const closeBtn = screen.getByRole("button", { name: "Close" });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
