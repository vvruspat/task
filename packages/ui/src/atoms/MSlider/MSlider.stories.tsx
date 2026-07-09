import type { Meta, StoryObj } from "@storybook/react-vite";
import MFlex from "../MFlex/MFlex";
import MSlider from "./MSlider";

const meta: Meta<typeof MSlider> = {
	title: "Atoms/Form/MSlider",
	component: MSlider,
};

export default meta;

type Story = StoryObj<typeof MSlider>;

const argTypes = {
	status: {
		control: { type: "select" },
		options: ["regular", "valid", "invalid"],
	},
	disabled: {
		control: { type: "boolean" },
	},
	showValue: {
		control: { type: "boolean" },
	},
};

export const Regular: Story = {
	args: {
		label: "Volume",
		defaultValue: 40,
		showValue: true,
	},
	argTypes,
};

export const AllVariants: Story = {
	name: "All Variants",
	render: () => (
		<MFlex direction="column" align="stretch" gap="l">
			<MSlider label="Regular" defaultValue={30} showValue />
			<MSlider label="Valid" status="valid" defaultValue={60} showValue />
			<MSlider label="Invalid" status="invalid" defaultValue={20} showValue />
			<MSlider label="Disabled" defaultValue={50} disabled showValue />
		</MFlex>
	),
	parameters: { controls: { disable: true } },
};

export const Disabled: Story = {
	args: {
		label: "Disabled",
		defaultValue: 50,
		disabled: true,
		showValue: true,
	},
	argTypes,
};
