import { CodeBracketSquareIcon } from "@heroicons/react/24/outline";
import type { StoryObj } from "@storybook/react-vite";

import MFileInput from "./MFileInput";

const argTypes = {
	status: {
		control: { type: "select" },
		options: ["regular", "valid", "invalid"],
	},
	disabled: { control: { type: "boolean" } },
	before: {
		control: false,
	},
	after: {
		control: false,
	},
	accept: {
		control: { type: "select" },
		options: ["image/png, image/jpeg", "video/*", "audio/*", "application/pdf"],
	},
	multiple: {
		control: { type: "boolean" },
	},
};

const meta = {
	title: "Atoms/Form/MFileInput",
	component: MFileInput,
	argTypes,
	args: {
		status: "regular",
		disabled: false,
		accept: "image/png, image/jpeg",
		multiple: true,
		children: "BUTTON",
		before: <CodeBracketSquareIcon width={24} />,
		after: <CodeBracketSquareIcon width={24} />,
	},
	// Custom render to map flat props to fileInputProps
	render: ({ accept, multiple, ...rest }) => (
		<MFileInput {...rest} fileInputProps={{ accept, multiple }} />
	),
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Regular: Story = {};

export const Valid: Story = {
	args: {
		status: "valid",
	},
};

export const Invalid: Story = {
	args: {
		status: "invalid",
	},
};

export const Disabled: Story = {
	args: {
		disabled: true,
	},
};
