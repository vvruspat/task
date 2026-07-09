import type { Meta, StoryObj } from "@storybook/react-vite";

import { MInput } from "../MInput";
import MFormField from "./MFormField";

const meta: Meta<typeof MFormField> = {
	title: "Atoms/Form/MFormField",
	component: MFormField,
};

export default meta;
type Story = StoryObj<typeof MFormField>;

export const Basic: Story = {
	args: {
		status: "regular",
		spacing: "m",
		required: true,
		control: <MInput />,
		label: "Input field",
		description: "Field description",
	},

	argTypes: {
		status: {
			control: {
				type: "select",
			},
			options: ["regular", "valid", "invalid"],
		},
		spacing: {
			control: {
				type: "select",
			},
			options: ["s", "m", "l", "auto"],
		},
		disabled: { control: { type: "boolean" } },
		required: { control: { type: "boolean" } },
		direction: {
			control: { type: "select" },
			options: ["row", "column", "row-reverse", "column-reverse"],
		},
		label: {
			control: { type: "text" },
		},
		description: {
			control: { type: "text" },
		},
	},
};
