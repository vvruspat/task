import type { ArgTypes, Meta, StoryObj } from "@storybook/react-vite";
import MDateRangePicker from "./MDateRangePicker";

const meta: Meta<typeof MDateRangePicker> = {
	title: "Atoms/Form/MDateRangePicker",
	component: MDateRangePicker,
};

export default meta;

type Story = StoryObj<typeof MDateRangePicker>;

const argTypes: ArgTypes<typeof MDateRangePicker> = {
	status: {
		control: {
			type: "select",
		},
		options: ["regular", "valid", "invalid"],
	},
	disabled: { control: { type: "boolean" } },
	fromPlaceholder: {
		control: { type: "text" },
	},
	toPlaceholder: {
		control: { type: "text" },
	},
};

export const Regular: Story = {
	args: {
		status: "regular",
		disabled: false,
		fromPlaceholder: "Check-in",
		toPlaceholder: "Check-out",
	},

	argTypes: argTypes,
};

export const WithMinMaxDate: Story = {
	args: {
		status: "regular",
		disabled: false,
		fromPlaceholder: "Check-in",
		toPlaceholder: "Check-out",
		minDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
		maxDate: new Date(new Date().getFullYear(), new Date().getMonth() + 2, 0),
	},

	argTypes: argTypes,
};

export const Disabled: Story = {
	args: {
		status: "regular",
		disabled: true,
		fromPlaceholder: "Check-in",
		toPlaceholder: "Check-out",
	},

	argTypes: argTypes,
};
