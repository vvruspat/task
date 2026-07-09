import type { Meta, StoryObj } from "@storybook/react-vite";

import MTheme from "./MTheme";

const meta: Meta<typeof MTheme> = {
	title: "Atoms/Utils/MTheme",
	component: MTheme,
};

export default meta;
type Story = StoryObj<typeof MTheme>;

export const Basic: Story = {
	args: {
		theme: "",
		brand: "",
		platform: "",
	},

	argTypes: {
		theme: {
			control: { type: "text" },
		},
	},
};
