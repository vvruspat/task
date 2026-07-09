import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import MSlider from "./MSlider";

describe("MSlider", () => {
	test("renders slider", () => {
		render(<MSlider aria-label="Volume" />);

		expect(screen.getByRole("slider")).toBeInTheDocument();
	});

	test("renders label and value", () => {
		render(<MSlider label="Volume" defaultValue={25} showValue />);

		expect(screen.getByLabelText("Volume")).toBeInTheDocument();
		expect(screen.getByText("25")).toBeInTheDocument();
	});

	test("calls onValueChange when value changes", () => {
		const handleValueChange = vi.fn();

		render(<MSlider aria-label="Volume" onValueChange={handleValueChange} />);

		fireEvent.change(screen.getByRole("slider"), { target: { value: "40" } });

		expect(handleValueChange).toHaveBeenCalledWith(40, expect.any(Object));
	});

	test("is disabled when disabled is true", () => {
		render(<MSlider aria-label="Volume" disabled />);

		expect(screen.getByRole("slider")).toBeDisabled();
	});
});
