import { CheckIcon } from "@heroicons/react/24/solid";
import type { Meta, StoryObj } from "@storybook/react-vite";

import MSwitch from "./MSwitch";

const meta: Meta<typeof MSwitch> = {
	title: "Atoms/Form/MSwitch",
	component: MSwitch,
};

export default meta;

const leftIconContent = () => <CheckIcon width={10} />;

const argTypes = {
	borderType: {
		control: { type: "select" },
		options: ["round", "rectangular"],
	},
	disabled: {
		control: { type: "boolean" },
	},
	leftIcon: {
		control: { type: "text" },
	},
	rightIcon: {
		control: { type: "text" },
	},
};

type Story = StoryObj<typeof MSwitch>;

export const AllVariants: Story = {
	name: "All Variants",
	render: () => (
		<div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
			<div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
				<MSwitch borderType="round" leftIcon={leftIconContent()} />
				<span style={{ fontSize: 13, opacity: 0.6 }}>Round — enabled</span>
			</div>
			<div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
				<MSwitch borderType="rectangular" leftIcon={leftIconContent()} />
				<span style={{ fontSize: 13, opacity: 0.6 }}>Rectangular — enabled</span>
			</div>
			<div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
				<MSwitch borderType="round" disabled />
				<span style={{ fontSize: 13, opacity: 0.6 }}>Round — disabled</span>
			</div>
			<div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
				<MSwitch borderType="rectangular" disabled />
				<span style={{ fontSize: 13, opacity: 0.6 }}>Rectangular — disabled</span>
			</div>
		</div>
	),
	parameters: { controls: { disable: true } },
};

export const Regular: Story = {
	args: {
		disabled: false,
		leftIcon: leftIconContent(),
	},
	argTypes,
};

export const Rectangular: Story = {
	args: {
		disabled: false,
		borderType: "rectangular",
		leftIcon: leftIconContent(),
	},
	argTypes,
};

export const Disabled: Story = {
	args: {
		disabled: true,
	},
	argTypes,
};
