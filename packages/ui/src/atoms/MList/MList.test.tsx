import { render } from "@testing-library/react";
import { screen } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import MList from "./MList";

const mockData = [
	{ key: "1", value: "Item 1" },
	{ key: "2", value: "Item 2" },
];
describe("MList Component", () => {
	test("renders list items from options", () => {
		const { getByText } = render(<MList options={mockData} showDivider />);
		expect(getByText("Item 1")).toBeInTheDocument();
		expect(getByText("Item 2")).toBeInTheDocument();
	});

	test("supports arrow navigation and enter activation for actionable options", async () => {
		const user = userEvent.setup();
		const onChoose = vi.fn();

		render(
			<MList aria-label="Actions" options={mockData} onChoose={onChoose} />,
		);

		await user.tab();
		expect(screen.getByRole("option", { name: "Item 1" })).toHaveFocus();

		await user.keyboard("{ArrowDown}");
		expect(screen.getByRole("option", { name: "Item 2" })).toHaveFocus();

		await user.keyboard("{Enter}");
		expect(onChoose).toHaveBeenCalledWith(
			expect.objectContaining({ key: "2" }),
		);
	});

	test("supports enter activation for option actions", async () => {
		const user = userEvent.setup();
		const onAction = vi.fn();

		render(
			<MList
				aria-label="Actions"
				options={[{ key: "1", value: "Item 1", onAction }]}
			/>,
		);

		await user.tab();
		await user.keyboard("{Enter}");

		expect(onAction).toHaveBeenCalledTimes(1);
	});
});
