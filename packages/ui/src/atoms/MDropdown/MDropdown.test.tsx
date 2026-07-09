import { render, screen } from "@testing-library/react";
import MDropdown from "./MDropdown";

describe("MDropdown", () => {
	test("render opened dropdown", async () => {
		render(
			<MDropdown open={true} dropdownContent="Text" stretch align={"left"}>
				<button type="button">Open dropdown</button>
			</MDropdown>,
		);

		expect(screen.getByText("Text")).toBeInTheDocument();
		expect(screen.getByText("Text")).toBeVisible();
	});
	test("render closed dropdown", async () => {
		render(
			<MDropdown open={false} dropdownContent="Text" stretch align={"left"}>
				<button type="button">Open dropdown</button>
			</MDropdown>,
		);

		expect(screen.queryByText("Text")).not.toBeInTheDocument();
	});
});
