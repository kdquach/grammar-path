import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import FormattedTheoryContent from "../src/components/theory/FormattedTheoryContent";

describe("FormattedTheoryContent Component", () => {
  it("1. Renders smart formatted view by default and allows toggling to raw monospace view", () => {
    const rawContent = "Sarah is in her car. She is driving to work.";
    const { container } = render(<FormattedTheoryContent content={rawContent} sectionId="1A" />);

    // Default smart view
    expect(screen.getByText("Trình bày dễ đọc")).toBeInTheDocument();
    expect(screen.getByText("Nguyên bản")).toBeInTheDocument();
    expect(screen.getByText(/Sarah is in her car/)).toBeInTheDocument();

    // Toggle to raw view
    fireEvent.click(screen.getByText("Nguyên bản"));
    expect(container.querySelector(".font-mono")).toBeInTheDocument();

    // Toggle back to smart view
    fireEvent.click(screen.getByText("Trình bày dễ đọc"));
    expect(screen.getByText(/Sarah is in her car/)).toBeInTheDocument();
  });

  it("2. Formats common pitfall warnings '(not ...)' with red badge and strikethrough", () => {
    const content = "Gymnastics is my favourite sport. (not Gymnastics are)";
    render(<FormattedTheoryContent content={content} sectionId="79B" />);

    // Should find the pitfall badge with text and 'Sai' label
    expect(screen.getByText("Gymnastics is my favourite sport.")).toBeInTheDocument();
    expect(screen.getByText("not Gymnastics are")).toBeInTheDocument();
    expect(screen.getByText("Sai")).toBeInTheDocument();
  });

  it("3. Formats meaning and equivalence notes '(= ...)' with lightbulb badge", () => {
    const content = "am (=I'm) / he/she/it is (=he's etc.)";
    render(<FormattedTheoryContent content={content} sectionId="1A" />);

    expect(screen.getByText("I'm")).toBeInTheDocument();
    expect(screen.getByText("he's etc.")).toBeInTheDocument();
    const bulbs = screen.getAllByText("💡 =");
    expect(bulbs.length).toBe(2);
  });

  it("4. Renders callouts with themed cards and Vietnamese titles (Remember, Note, Compare, This means)", () => {
    const content = `We use it to say that something happens all the time:
The cafe opens at 7.30 in the morning.

Remember: I work ... but He works ... For spelling, see Appendix 6.`;

    render(<FormattedTheoryContent content={content} sectionId="2B" />);

    expect(screen.getByText("Lưu ý quan trọng (Remember)")).toBeInTheDocument();
    expect(screen.getByText(/I work \.\.\. but He works/)).toBeInTheDocument();
  });

  it("5. Intelligently segments and formats run-on sections like Unit 2A", () => {
    const runOn2A =
      "Alex is a bus driver, but now he is in bed asleep. He is not driving a bus. (He is asleep.) but He drives a bus. (He is a bus driver.) Drive(s)/work(s)/do(es) etc. is the present simple: I/we/you/they drive/work/do etc. / he/she/it drives/works/does etc.";

    render(<FormattedTheoryContent content={runOn2A} sectionId="2A" />);

    // Check that context narrative, contrast, and formula sections are separated
    expect(screen.getByText(/Alex is a bus driver/)).toBeInTheDocument();
    expect(screen.getByText(/but He drives a bus/)).toBeInTheDocument();
    expect(screen.getByText(/Cấu trúc \/ Công thức ngữ pháp/)).toBeInTheDocument();
    expect(screen.getByText(/is the present simple:/)).toBeInTheDocument();
    expect(screen.getByText(/I\/we\/you\/they drive\/work\/do/)).toBeInTheDocument();
  });

  it("6. Renders numbered rule lists with circular sequence badges (e.g. Unit 99B)", () => {
    const factAdjectives = `Usually we put fact adjectives in this order:
1 how big? (large, small, tall)
2 how old? (young, old, new)
3 what colour? (black, white, red)
4 where from? (American, French)
5 what is it made of? (wooden, plastic, metal)`;

    render(<FormattedTheoryContent content={factAdjectives} sectionId="99B" />);

    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText(/how big\?/)).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText(/what is it made of\?/)).toBeInTheDocument();
  });

  it("7. Renders dialogue exchanges with speaker badges (e.g. Unit 8A)", () => {
    const dialogue8A = `DAVE: Have you travelled a lot, Jane?
JANE: Yes, I've been to lots of places.
DAVE: Really? Have you ever been to China?
JANE: Yes, I've been to China twice.`;

    render(<FormattedTheoryContent content={dialogue8A} sectionId="8A" />);

    expect(screen.getByText("Hội thoại mẫu (Dialogue)")).toBeInTheDocument();
    const daves = screen.getAllByText("DAVE");
    const janes = screen.getAllByText("JANE");
    expect(daves.length).toBe(2);
    expect(janes.length).toBe(2);
    expect(screen.getByText(/Have you travelled a lot, Jane\?/)).toBeInTheDocument();
  });

  it("8. Copies content to clipboard on button click", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(<FormattedTheoryContent content="Test grammar rule" sectionId="1A" />);

    const copyBtn = screen.getByText("Sao chép");
    fireEvent.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalledWith("Test grammar rule");
    expect(await screen.findByText("Đã sao chép")).toBeInTheDocument();
  });
});
