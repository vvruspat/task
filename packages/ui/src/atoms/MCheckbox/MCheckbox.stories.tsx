import { CodeBracketSquareIcon } from "@heroicons/react/24/outline";
import type { Meta, StoryObj } from "@storybook/react-vite";
import MFlex from "../MFlex/MFlex";
import MText from "../MText/MText";
import MCheckbox from "./MCheckbox";

const meta: Meta<typeof MCheckbox> = {
	title: "Atoms/Form/MCheckbox",
	component: MCheckbox,
};

export default meta;

const labelComponentContent = () => (
	<MFlex gap="s">
		<CodeBracketSquareIcon width={24} />
		<MText>Label</MText>
	</MFlex>
);

const descriptionComponentContent = () => (
	<MFlex gap="s">
		<CodeBracketSquareIcon width={16} />
		<MText>Description</MText>
	</MFlex>
);

const errorComponentContent = () => (
	<MFlex gap="s">
		<CodeBracketSquareIcon width={16} />
		<MText>Error</MText>
	</MFlex>
);

type Story = StoryObj<typeof MCheckbox>;

const argTypes = {
	status: {
		control: { type: "select" },
		options: ["regular", "invalid"],
	},
	disabled: { control: { type: "boolean" } },
	label: { control: { type: "text" } },
	description: { control: { type: "text" } },
	icon: { control: { type: "text" } },
};

export const AllStatuses: Story = {
	name: "All Statuses",
	render: () => (
		<div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
			<MCheckbox label="Regular" description="Helper text" status="regular" />
			<MCheckbox label="Regular (checked)" description="Helper text" status="regular" defaultChecked />
			<MCheckbox label="Invalid" description="Error message" status="invalid" />
			<MCheckbox label="Disabled" description="Helper text" status="regular" disabled />
			<MCheckbox label="Disabled (checked)" description="Helper text" status="regular" disabled defaultChecked />
		</div>
	),
	parameters: { controls: { disable: true } },
};

export const Regular: Story = {
	args: {
		disabled: false,
		label: labelComponentContent(),
		description: descriptionComponentContent(),
		status: "regular",
	},
	argTypes: argTypes,
};

export const Valid: Story = {
	args: {
		disabled: false,
		label: labelComponentContent(),
		description: descriptionComponentContent(),
		status: "valid",
	},
	argTypes: argTypes,
};

export const Invalid: Story = {
	args: {
		disabled: false,
		label: labelComponentContent(),
		description: errorComponentContent(),
		status: "invalid",
	},
	argTypes: argTypes,
};

export const Disabled: Story = {
	args: {
		disabled: true,
		label: labelComponentContent(),
		description: descriptionComponentContent(),
		status: "regular",
		checked: true,
	},
	argTypes: argTypes,
};
