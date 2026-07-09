import { CodeBracketSquareIcon } from "@heroicons/react/24/outline";
import type { ArgTypes, Meta, StoryObj } from "@storybook/react-vite";

import MDatepicker from "./MDatepicker";

const meta: Meta<typeof MDatepicker> = {
	title: "Atoms/Form/MDatepicker",
	component: MDatepicker,
};

export default meta;

type Story = StoryObj<typeof MDatepicker>;

const argTypes: ArgTypes<typeof MDatepicker> = {
	type: {
		control: {
			type: "select",
		},
		options: ["date", "time", "datetime-local", "month", "week"],
	},
	status: {
		control: {
			type: "select",
		},
		options: ["regular", "valid", "invalid"],
	},
	disabled: { control: { type: "boolean" } },
	before: {
		control: { type: "text" },
	},
	placeholder: {
		control: { type: "text" },
	},
};

export const Regular: Story = {
	args: {
		type: "date",
		status: "regular",
		disabled: false,
		before: <CodeBracketSquareIcon width={24} />,
		placeholder: "Choose your birthday",
	},

	argTypes: argTypes,
};

export const Valid: Story = {
	args: {
		status: "valid",
		disabled: false,
		before: <CodeBracketSquareIcon width={24} />,
		placeholder: "Choose your birthday",
	},

	argTypes: argTypes,
};

export const Invalid: Story = {
	args: {
		status: "invalid",
		disabled: false,
		before: <CodeBracketSquareIcon width={24} />,
		placeholder: "Choose your birthday",
	},

	argTypes: argTypes,
};

export const Disabled: Story = {
	args: {
		status: "regular",
		disabled: true,
		before: <CodeBracketSquareIcon width={24} />,
		placeholder: "Choose your birthday",
	},

	argTypes: argTypes,
};
