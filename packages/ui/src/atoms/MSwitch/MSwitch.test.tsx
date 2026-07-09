import { fireEvent, render, screen } from "@testing-library/react";
import MSwitch from "./MSwitch";

describe("MSwitch", () => {
	test("should render switch", () => {
		render(<MSwitch />);

		expect(screen.getByRole("switch")).toBeInTheDocument();
	});

	test("should be disabled when disabled is true", () => {
		render(<MSwitch disabled={true} />);

		const switchElement = screen.getByRole("switch");

		expect(switchElement).toBeDisabled();
	});

	test("should change checked state from false to true on click", () => {
		render(<MSwitch />);

		const switchElement = screen.getByRole("switch");

		expect(switchElement).not.toBeChecked();

		fireEvent.click(switchElement);
		expect(switchElement).toBeChecked();
	});
});
