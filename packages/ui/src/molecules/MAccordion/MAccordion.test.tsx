import { screen } from "@testing-library/dom";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import MAccordion, { type AccordionItemProps } from "./MAccordion";

const sampleItems: AccordionItemProps[] = [
	{ key: 1, title: "First Title", children: "First Content" },
	{ key: 2, title: "Second Title", children: "Second Content" },
];

describe("MAccordion", () => {
	test("renders item triggers", () => {
		render(<MAccordion items={sampleItems} />);

		expect(
			screen.getByRole("button", { name: "First Title" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Second Title" }),
		).toBeInTheDocument();
	});

	test("opens and closes an item with the trigger", async () => {
		const user = userEvent.setup();

		render(<MAccordion items={sampleItems} />);

		const firstTrigger = screen.getByRole("button", { name: "First Title" });

		expect(firstTrigger).toHaveAttribute("aria-expanded", "false");

		await user.click(firstTrigger);
		expect(firstTrigger).toHaveAttribute("aria-expanded", "true");
		expect(screen.getByText("First Content")).toBeVisible();

		await user.click(firstTrigger);
		expect(firstTrigger).toHaveAttribute("aria-expanded", "false");
		expect(screen.getByText("First Content")).not.toBeVisible();
	});

	test("keeps one item open by default", async () => {
		const user = userEvent.setup();

		render(<MAccordion items={sampleItems} />);

		const firstTrigger = screen.getByRole("button", { name: "First Title" });
		const secondTrigger = screen.getByRole("button", { name: "Second Title" });

		await user.click(firstTrigger);
		await user.click(secondTrigger);

		expect(firstTrigger).toHaveAttribute("aria-expanded", "false");
		expect(secondTrigger).toHaveAttribute("aria-expanded", "true");
		expect(screen.getByText("First Content")).not.toBeVisible();
		expect(screen.getByText("Second Content")).toBeVisible();
	});

	test("honors initially expanded items", () => {
		render(
			<MAccordion
				items={[
					{ key: 1, title: "First Title", children: "First Content" },
					{
						key: 2,
						title: "Second Title",
						children: "Second Content",
						collapsed: false,
					},
				]}
			/>,
		);

		expect(
			screen.getByRole("button", { name: "Second Title" }),
		).toHaveAttribute("aria-expanded", "true");
		expect(screen.getByText("Second Content")).toBeVisible();
	});

	test("supports keyboard activation and expanded change callbacks", async () => {
		const user = userEvent.setup();
		const handleExpandedChange = vi.fn();

		render(
			<MAccordion
				items={sampleItems}
				onExpandedChange={handleExpandedChange}
			/>,
		);

		await user.tab();
		expect(screen.getByRole("button", { name: "First Title" })).toHaveFocus();

		await user.keyboard("{Enter}");
		expect(screen.getByRole("button", { name: "First Title" })).toHaveAttribute(
			"aria-expanded",
			"true",
		);
		expect(handleExpandedChange).toHaveBeenCalledWith(new Set([1]));
	});
});
