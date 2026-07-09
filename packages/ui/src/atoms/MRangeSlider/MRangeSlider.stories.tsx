import type { Meta, StoryObj } from "@storybook/react-vite";
import MFlex from "../MFlex/MFlex";
import MRangeSlider from "./MRangeSlider";

const meta: Meta<typeof MRangeSlider> = {
	title: "Atoms/Form/MRangeSlider",
	component: MRangeSlider,
};

export default meta;

type Story = StoryObj<typeof MRangeSlider>;

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
		label: "Price",
		defaultValue: [20, 80],
		showValue: true,
	},
	argTypes,
};

export const AllVariants: Story = {
	name: "All Variants",
	render: () => (
		<MFlex direction="column" align="stretch" gap="l">
			<MRangeSlider label="Regular" defaultValue={[20, 80]} showValue />
			<MRangeSlider label="Valid" status="valid" defaultValue={[30, 90]} showValue />
			<MRangeSlider
				label="Invalid"
				status="invalid"
				defaultValue={[10, 40]}
				showValue
			/>
			<MRangeSlider label="Disabled" defaultValue={[25, 75]} disabled showValue />
		</MFlex>
	),
	parameters: { controls: { disable: true } },
};

export const Disabled: Story = {
	args: {
		label: "Disabled",
		defaultValue: [25, 75],
		disabled: true,
		showValue: true,
	},
	argTypes,
};
