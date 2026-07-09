import type { Meta, StoryObj } from "@storybook/react-vite";

import MLinkButton from "./MLinkButton";

const meta: Meta<typeof MLinkButton> = {
	title: "Atoms/Form/MButton",
	component: MLinkButton,
};

export default meta;
type Story = StoryObj<typeof MLinkButton>;

export const LinkButton: Story = {
	args: {
		href: "https://google.com",
		target: "_blank",
		disabled: false,
		children: "Link Button",
		mode: "primary",
		before: "+",
		after: "",
		size: "m",
	},

	argTypes: {
		href: {
			control: { type: "text" },
		},
		target: {
			control: { type: "text" },
		},
		disabled: { control: { type: "boolean" } },
		mode: {
			options: [
				"primary",
				"secondary",
				"tertiary",
				"round",
				"outlined",
				"transparent",
			],
			control: { type: "select" },
		},
		before: {
			control: { type: "text" },
		},
		after: {
			control: { type: "text" },
		},
		size: {
			options: ["s", "m", "l"],
			control: { type: "select" },
		},
	},
};
