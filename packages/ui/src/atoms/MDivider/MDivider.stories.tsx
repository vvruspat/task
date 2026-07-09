import type { Meta, StoryObj } from "@storybook/react-vite";

import MDivider from "./MDivider";

const meta: Meta<typeof MDivider> = {
	title: "Atoms/Layout/MDivider",
	component: MDivider,
};

export default meta;
type Story = StoryObj<typeof MDivider>;

export const Basic: Story = {
	args: {},

	argTypes: {},
};
