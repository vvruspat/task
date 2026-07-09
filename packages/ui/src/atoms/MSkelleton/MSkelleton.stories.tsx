import type { Meta, StoryObj } from "@storybook/react-vite";

import MSkelleton from "./MSkelleton";

const meta: Meta<typeof MSkelleton> = {
	title: "Atoms/Visual/MSkelleton",
	component: MSkelleton,
};

export default meta;
type Story = StoryObj<typeof MSkelleton>;

export const Basic: Story = {
	args: {
		minSize: "inherit",
	},

	argTypes: {
		minSize: {
			control: { type: "select" },
			options: ["inherit", "xs", "s", "m", "l", "xl", "3xl", "4xl"],
		},
	},
};
