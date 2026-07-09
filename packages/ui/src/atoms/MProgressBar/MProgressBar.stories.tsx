import type { Meta, StoryObj } from "@storybook/react-vite";
import MFlex from "../MFlex/MFlex";
import MProgressBar from "./MProgressBar";

const meta: Meta<typeof MProgressBar> = {
	title: "Atoms/Feedback/MProgressBar",
	component: MProgressBar,
};

export default meta;

type Story = StoryObj<typeof MProgressBar>;

const argTypes = {
	status: {
		control: { type: "select" },
		options: ["regular", "valid", "invalid"],
	},
	size: {
		control: { type: "select" },
		options: ["s", "m", "l"],
	},
	showValue: {
		control: { type: "boolean" },
	},
};

export const Regular: Story = {
	args: {
		label: "Upload progress",
		value: 64,
		max: 100,
		showValue: true,
	},
	argTypes,
};

export const AllVariants: Story = {
	name: "All Variants",
	render: () => (
		<MFlex direction="column" align="stretch" gap="l">
			<MProgressBar label="Regular" value={40} showValue />
			<MProgressBar label="Valid" status="valid" value={75} showValue />
			<MProgressBar label="Invalid" status="invalid" value={30} showValue />
			<MProgressBar label="Indeterminate" />
		</MFlex>
	),
	parameters: { controls: { disable: true } },
};

export const Sizes: Story = {
	render: () => (
		<MFlex direction="column" align="stretch" gap="l">
			<MProgressBar label="Small" size="s" value={45} showValue />
			<MProgressBar label="Medium" size="m" value={45} showValue />
			<MProgressBar label="Large" size="l" value={45} showValue />
		</MFlex>
	),
	parameters: { controls: { disable: true } },
};
