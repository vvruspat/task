import type { ArgTypes, Meta, StoryObj } from "@storybook/react-vite";

import MDatetime from "./MDatetime";

const meta: Meta<typeof MDatetime> = {
	title: "Atoms/Form/MDatetime",
	component: MDatetime,
};

export default meta;

type Story = StoryObj<typeof MDatetime>;

const argTypes: ArgTypes<typeof MDatetime> = {
	status: {
		control: {
			type: "select",
		},
		options: ["regular", "valid", "invalid"],
	},
	disabled: { control: { type: "boolean" } },
};

export const Regular: Story = {
	args: {
		status: "regular",
		disabled: false,
		name: "datetime",
	},

	argTypes: argTypes,
};

export const Valid: Story = {
	args: {
		status: "valid",
		disabled: false,
		name: "datetime",
	},

	argTypes: argTypes,
};

export const Invalid: Story = {
	args: {
		status: "invalid",
		disabled: false,
		name: "datetime",
	},

	argTypes: argTypes,
};

export const Disabled: Story = {
	args: {
		status: "regular",
		disabled: true,
		name: "datetime",
	},

	argTypes: argTypes,
};
