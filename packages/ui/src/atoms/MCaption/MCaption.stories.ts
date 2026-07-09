import type { Meta, StoryObj } from "@storybook/react-vite";

import MCaption from "./MCaption";

const meta: Meta<typeof MCaption> = {
	title: "Atoms/Typography/MCaption",
	component: MCaption,
};

export default meta;
type Story = StoryObj<typeof MCaption>;

export const Basic: Story = {
	args: {
		children: "Caption",
		placeholder: "Placeholder",
	},

	argTypes: {
		children: {
			control: { type: "text" },
		},
	},
};
