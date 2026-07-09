import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import MRangeSlider from "./MRangeSlider";

describe("MRangeSlider", () => {
	test("renders range slider thumbs", () => {
		render(<MRangeSlider label="Price" />);

		expect(screen.getByLabelText("Minimum value")).toBeInTheDocument();
		expect(screen.getByLabelText("Maximum value")).toBeInTheDocument();
	});

	test("renders current range value", () => {
		render(<MRangeSlider label="Price" defaultValue={[10, 90]} showValue />);

		expect(screen.getByText("10 - 90")).toBeInTheDocument();
	});

	test("calls onValueChange when lower value changes", () => {
		const handleValueChange = vi.fn();

		render(
			<MRangeSlider
				label="Price"
				defaultValue={[10, 90]}
				onValueChange={handleValueChange}
			/>,
		);

		fireEvent.change(screen.getByLabelText("Minimum value"), {
			target: { value: "20" },
		});

		expect(handleValueChange).toHaveBeenCalledWith([20, 90], expect.any(Object));
	});

	test("keeps lower value from moving above upper value", () => {
		const handleValueChange = vi.fn();

		render(
			<MRangeSlider
				label="Price"
				defaultValue={[10, 50]}
				onValueChange={handleValueChange}
			/>,
		);

		fireEvent.change(screen.getByLabelText("Minimum value"), {
			target: { value: "80" },
		});

		expect(handleValueChange).toHaveBeenCalledWith([50, 50], expect.any(Object));
	});

	test("disables both thumbs", () => {
		render(<MRangeSlider label="Price" disabled />);

		expect(screen.getByLabelText("Minimum value")).toBeDisabled();
		expect(screen.getByLabelText("Maximum value")).toBeDisabled();
	});
});
