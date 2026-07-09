import type { Meta, StoryObj } from "@storybook/react-vite";

import MLabel from "./MLabel";

const meta: Meta<typeof MLabel> = {
	title: "Atoms/Form/MLabel",
	component: MLabel,
};

export default meta;
type Story = StoryObj<typeof MLabel>;

export const Basic: Story = {
	args: {
		children: "Label",
	},

	argTypes: {
		children: {
			control: { type: "text" },
		},
	},
};
