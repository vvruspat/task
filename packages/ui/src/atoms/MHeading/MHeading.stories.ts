import type { Meta, StoryObj } from "@storybook/react-vite";

import MHeading from "./MHeading";

const meta: Meta<typeof MHeading> = {
	title: "Atoms/Typography/MHeading",
	component: MHeading,
};

export default meta;
type Story = StoryObj<typeof MHeading>;

export const Basic: Story = {
	args: {
		children: "Heading",
		mode: "h1",
	},

	argTypes: {
		children: {
			control: { type: "text" },
		},
		mode: {
			options: ["h1", "h2", "h3", "h4", "h5", "h6"],
			control: { type: "select" },
		},
	},
};
