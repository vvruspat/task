import { fireEvent, render, screen } from "@testing-library/react";
import MRadio from "./MRadio";

describe("MRadio", () => {
	test("renders without crashing", () => {
		render(<MRadio />);
		const radioElement = screen.getByRole("radio");
		expect(radioElement).toBeInTheDocument();
	});

	test("renders with a label", () => {
		const testLabel = "Test Label";
		render(<MRadio label={testLabel} />);
		expect(screen.getByText(testLabel)).toBeInTheDocument();
	});

	test("renders with a description", () => {
		const testDescription = "Test Description";
		render(<MRadio description={testDescription} />);
		expect(screen.getByText(testDescription)).toBeInTheDocument();
	});

	test("renders as disabled when the disabled prop is true", () => {
		render(<MRadio disabled={true} />);
		const radioElement = screen.getByRole("radio");
		expect(radioElement).toBeDisabled();
	});

	test("should change checked state from false to true on click", () => {
		const { getByRole } = render(<MRadio />);
		const radio = getByRole("radio");
		expect(radio).not.toBeChecked();

		fireEvent.click(radio);
		expect(radio).toBeChecked();
	});
});
