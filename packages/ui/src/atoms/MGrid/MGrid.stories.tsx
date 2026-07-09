import { RectangleGroupIcon, Squares2X2Icon, TableCellsIcon } from "@heroicons/react/24/outline";
import type { Meta, StoryObj } from "@storybook/react-vite";

import MGrid from "./MGrid";

const meta: Meta<typeof MGrid> = {
	title: "Atoms/Layout/MGrid",
	component: MGrid,
};

export default meta;
type Story = StoryObj<typeof MGrid>;

export const Basic: Story = {
	args: {
		tag: "div",
		rowGap: "s",
		columnGap: "s",
		alignItems: "center",
		justifyItems: "center",
		columnTemplate: "repeat(7, 1fr)",
		rowTemplate: "repeat(3, 1fr)",
		display: "inline-grid",
		children: (
			<>
				<Squares2X2Icon width={24} />
				<RectangleGroupIcon width={24} />
				<TableCellsIcon width={24} />
				<Squares2X2Icon width={24} />
				<RectangleGroupIcon width={24} />
				<TableCellsIcon width={24} />
				<Squares2X2Icon width={24} />
				<RectangleGroupIcon width={24} />
				<TableCellsIcon width={24} />
				<Squares2X2Icon width={24} />
				<RectangleGroupIcon width={24} />
				<TableCellsIcon width={24} />
			</>
		),
	},

	argTypes: {
		tag: {
			control: { type: "select" },
			options: ["div", "section", "article", "aside", "nav"],
			description: "HTML tag to use for the grid container",
			defaultValue: "div",
		},
		rowGap: {
			control: { type: "select" },
			options: ["xs", "s", "m", "l", "xl", "3xl", "4xl"],
		},
		columnGap: {
			control: { type: "select" },
			options: ["xs", "s", "m", "l", "xl", "3xl", "4xl"],
		},
		alignItems: {
			control: { type: "select" },
			options: ["start", "center", "end", "stretch"],
		},
		justifyItems: {
			control: { type: "select" },
			options: ["start", "center", "end", "space-between", "space-around"],
		},
		display: {
			control: { type: "select" },
			options: ["grid", "inline-grid"],
		},
	},
};
