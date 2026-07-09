import { fireEvent, render, screen } from "@testing-library/react";
import MCheckbox from "./MCheckbox";

describe("MCheckbox", () => {
	const labelText = "label";
	const descriptionText = "description";

	test("should render checkbox with label", () => {
		render(<MCheckbox label={labelText} description={descriptionText} />);

		expect(screen.getByLabelText(labelText)).toBeInTheDocument();
		expect(screen.getByText(descriptionText)).toBeInTheDocument();
	});

	test("should be disabled when disabled is true", () => {
		render(<MCheckbox label={labelText} disabled={true} />);

		const checkboxElement = screen.getByRole("checkbox");

		expect(checkboxElement).toBeDisabled();
	});

	test("should change checked state from false to true on click", () => {
		render(<MCheckbox label={labelText} />);

		const checkboxElement = screen.getByRole("checkbox");

		expect(checkboxElement).not.toBeChecked();

		fireEvent.click(checkboxElement);
		expect(checkboxElement).toBeChecked();
	});
});
