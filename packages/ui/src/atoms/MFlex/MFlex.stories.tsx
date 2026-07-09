import { RectangleGroupIcon, Squares2X2Icon, TableCellsIcon } from "@heroicons/react/24/outline";
import type { Meta, StoryObj } from "@storybook/react-vite";

import MFlex from "./MFlex";

const meta: Meta<typeof MFlex> = {
	title: "Atoms/Layout/MFlex",
	component: MFlex,
};

export default meta;
type Story = StoryObj<typeof MFlex>;

export const Basic: Story = {
	args: {
		gap: "s",
		direction: "row",
		align: "center",
		justify: "start",
		wrap: "wrap",
		children: (
			<>
				<Squares2X2Icon width={24} />
				<RectangleGroupIcon width={24} />
				<TableCellsIcon width={24} />
			</>
		),
	},

	argTypes: {
		gap: {
			control: { type: "select" },
			options: ["xs", "s", "m", "l", "xl", "3xl", "4xl"],
		},
		direction: {
			control: { type: "select" },
			options: ["row", "column", "row-reverse", "column-reverse"],
		},
		align: {
			control: { type: "select" },
			options: ["start", "center", "end", "stretch"],
		},
		justify: {
			control: { type: "select" },
			options: ["start", "center", "end", "space-between", "space-around"],
		},
		wrap: {
			control: { type: "select" },
			options: ["wrap", "nowrap"],
		},
	},
};
