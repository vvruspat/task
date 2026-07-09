import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import MDivider from "./MDivider";

describe("MDivider", () => {
	test("render card", async () => {
		const _handleClick = vi.fn();

		render(<MDivider data-testid="divider" />);
		expect(screen.getByTestId("divider")).toBeInTheDocument();
	});
});
