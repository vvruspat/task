import { CodeBracketSquareIcon } from "@heroicons/react/24/outline";
import type { ArgTypes, Meta, StoryObj } from "@storybook/react-vite";

import MInput from "./MInput";

const meta: Meta<typeof MInput> = {
	title: "Atoms/Form/MInput",
	component: MInput,
};

export default meta;

type Story = StoryObj<typeof MInput>;

const argTypes: ArgTypes<typeof MInput> = {
	type: {
		control: { type: "select" },
		options: ["text", "email", "password", "number", "tel"],
	},
	status: {
		control: { type: "select" },
		options: ["regular", "valid", "invalid"],
	},
	disabled: { control: { type: "boolean" } },
	before: { control: { type: "text" } },
	placeholder: { control: { type: "text" } },
	after: { control: { type: "text" } },
	label: { control: { type: "text" } },
	caption: { control: { type: "text" } },
	description: { control: { type: "text" } },
};

const icon = <CodeBracketSquareIcon width={24} />;

export const AllStatuses: Story = {
	name: "All Statuses",
	render: () => (
		<div style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: 360 }}>
			<MInput status="regular" placeholder="Placeholder" label="Regular" before={icon} after={icon} />
			<MInput status="valid" placeholder="Placeholder" label="Valid" before={icon} after={icon} />
			<MInput status="invalid" placeholder="Placeholder" label="Invalid" before={icon} after={icon} />
			<MInput status="regular" disabled placeholder="Placeholder" label="Disabled" before={icon} after={icon} />
		</div>
	),
	parameters: { controls: { disable: true } },
};

export const Regular: Story = {
	args: {
		status: "regular",
		disabled: false,
		before: <CodeBracketSquareIcon width={24} />,
		after: <CodeBracketSquareIcon width={24} />,
		placeholder: "Placeholder",
	},
	argTypes: argTypes,
};

export const Valid: Story = {
	args: {
		status: "valid",
		disabled: false,
		before: <CodeBracketSquareIcon width={24} />,
		after: <CodeBracketSquareIcon width={24} />,
		placeholder: "Placeholder",
	},
	argTypes: argTypes,
};

export const Invalid: Story = {
	args: {
		status: "invalid",
		disabled: false,
		before: <CodeBracketSquareIcon width={24} />,
		after: <CodeBracketSquareIcon width={24} />,
		placeholder: "Placeholder",
	},
	argTypes: argTypes,
};

export const Disabled: Story = {
	args: {
		status: "regular",
		disabled: true,
		before: <CodeBracketSquareIcon width={24} />,
		after: <CodeBracketSquareIcon width={24} />,
		placeholder: "Placeholder",
	},
	argTypes: argTypes,
};
