import { render, screen } from "@testing-library/react";
import { MAlert } from "./MAlert";

describe("MAlert", () => {
	it('renders with default "info" mode and displays children', () => {
		render(<MAlert>This is an alert</MAlert>);
		const alert = screen.getByText("This is an alert");
		expect(alert).toBeInTheDocument();
		expect(alert).toHaveClass("alert");
		expect(alert).toHaveClass("alert-mode-info");
	});

	it.each([
		["info"],
		["success"],
		["warning"],
		["error"],
	])('applies the correct mode class for mode="%s"', (mode) => {
		render(
			<MAlert
				mode={mode as "error" | "warning" | "success" | "info" | undefined}
			>
				Alert content
			</MAlert>,
		);
		const alert = screen.getByText("Alert content");
		expect(alert).toHaveClass(`alert-mode-${mode}`);
	});

	it("merges additional className prop", () => {
		render(<MAlert className="custom-class">Alert with extra class</MAlert>);
		const alert = screen.getByText("Alert with extra class");
		expect(alert).toHaveClass("custom-class");
		expect(alert).toHaveClass("alert");
	});

	it("passes additional props to MFlex (e.g., id)", () => {
		// biome-ignore lint/correctness/useUniqueElementIds: id is used for testing
		render(<MAlert id="test-alert">With ID</MAlert>);
		const alert = screen.getByText("With ID");
		expect(alert).toHaveAttribute("id", "test-alert");
	});
});
