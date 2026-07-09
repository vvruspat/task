import { render, screen } from "@testing-library/react";
import MCard from "./MCard";

describe("MCard", () => {
	test("render card", async () => {
		render(
			<MCard footer="Footer" header="Header">
				Content
			</MCard>,
		);

		expect(screen.getByText("Content")).toBeInTheDocument();
		expect(screen.getByText("Footer")).toBeInTheDocument();
		expect(screen.getByText("Header")).toBeInTheDocument();
	});
});
