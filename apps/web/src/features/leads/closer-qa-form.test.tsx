import { describe, expect, it, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import CloserQAForm from "./closer-qa-form";

afterEach(() => {
  cleanup();
});

describe("CloserQAForm — sin botón propio", () => {
  it("renders the form with the expected id for the drawer's submit button to attach", () => {
    render(<CloserQAForm initialAnswers={{}} />);

    const form = screen.getByTestId("closer-qa-form");
    expect(form).toBeInTheDocument();
    expect(form.tagName).toBe("FORM");
    expect(form).toHaveAttribute("id", "closer-qa-form");
  });

  it("does NOT render any submit button of its own (el padre controla el submit)", () => {
    render(<CloserQAForm initialAnswers={{}} />);

    // El form no debe contener ningún <button type="submit">.
    const form = screen.getByTestId("closer-qa-form");
    const submitButtons = form.querySelectorAll('button[type="submit"]');
    expect(submitButtons).toHaveLength(0);
  });

  it("renders one input per closer question, prefilled from initialAnswers", () => {
    render(
      <CloserQAForm
        initialAnswers={{
          "¿De dónde sale su capacidad económica?": "USD 5000",
          "Información extra": "En 2 semanas",
        }}
      />,
    );

    expect(screen.getByDisplayValue("USD 5000")).toBeInTheDocument();
    expect(screen.getByDisplayValue("En 2 semanas")).toBeInTheDocument();
  });
});
