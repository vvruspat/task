import type { Meta, StoryObj } from "@storybook/react-vite";

import MText from "./MText";

const meta: Meta<typeof MText> = {
	title: "Atoms/Typography/MText",
	component: MText,
};

export default meta;
type Story = StoryObj<typeof MText>;

export const Basic: Story = {
	args: {
		children: "Text",
		placeholder: "Placeholder",
	},

	argTypes: {
		children: {
			control: { type: "text" },
		},
	},
};
