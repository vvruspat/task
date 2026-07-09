import { render, screen } from "@testing-library/react";
import MStepProgress from "./MStepProgress";

describe("MStepProgress", () => {
	it("renders the correct number of steps", () => {
		render(<MStepProgress steps={5} currentStep={2} />);
		expect(screen.getAllByRole("listitem").length).toBe(5);
	});

	it("shows the default label if showLabel is true", () => {
		render(<MStepProgress steps={4} currentStep={2} showLabel />);
		expect(screen.getByText("Step 2 of 4")).toBeInTheDocument();
	});

	it("shows a custom label if provided", () => {
		render(<MStepProgress label="Custom Label" showLabel />);
		expect(screen.getByText("Custom Label")).toBeInTheDocument();
	});

	it("applies the correct mode class to completed steps", () => {
		render(<MStepProgress steps={3} currentStep={2} mode="success" />);
		const steps = screen.getAllByRole("listitem");
		// The first two steps should have the success class
		expect(steps[0]?.className).toMatch(/.*step-progress-mode-success.*/);
		expect(steps[1]?.className).toMatch(/.*step-progress-mode-success.*/);
		// The last step should be pending
		expect(steps[2]?.className).toMatch(/.*step-progress-mode-pending.*/);
	});
});
