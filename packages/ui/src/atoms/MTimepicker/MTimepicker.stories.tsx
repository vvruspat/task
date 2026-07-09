import { CodeBracketSquareIcon } from "@heroicons/react/24/outline";
import type { ArgTypes, Meta, StoryObj } from "@storybook/react-vite";

import MTimepicker from "./MTimepicker";

const meta: Meta<typeof MTimepicker> = {
	title: "Atoms/Form/MTimepicker",
	component: MTimepicker,
};

export default meta;

type Story = StoryObj<typeof MTimepicker>;

const argTypes: ArgTypes<typeof MTimepicker> = {
	type: {
		control: {
			type: "select",
		},
		options: ["time", "time-local"],
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
		type: "time",
		status: "regular",
		disabled: false,
		before: <CodeBracketSquareIcon width={24} />,
		placeholder: "Choose wakeup time",
	},

	argTypes: argTypes,
};

export const Valid: Story = {
	args: {
		type: "time",
		status: "valid",
		disabled: false,
		before: <CodeBracketSquareIcon width={24} />,
		placeholder: "Choose wakeup time",
	},

	argTypes: argTypes,
};

export const Invalid: Story = {
	args: {
		type: "time",
		status: "invalid",
		disabled: false,
		before: <CodeBracketSquareIcon width={24} />,
		placeholder: "Choose wakeup time",
	},

	argTypes: argTypes,
};

export const Disabled: Story = {
	args: {
		type: "time",
		status: "regular",
		disabled: true,
		before: <CodeBracketSquareIcon width={24} />,
		placeholder: "Choose wakeup time",
	},

	argTypes: argTypes,
};
