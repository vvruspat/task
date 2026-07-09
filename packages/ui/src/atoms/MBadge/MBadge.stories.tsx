import { StarIcon } from "@heroicons/react/24/outline";
import type { Meta, StoryObj } from "@storybook/react-vite";

import MBadge from "./MBadge";

const meta: Meta<typeof MBadge> = {
	title: "Atoms/Visual/MBadge",
	component: MBadge,
};

export default meta;
type Story = StoryObj<typeof MBadge>;

const allModes = ["primary", "transparent", "info", "success", "warning", "error"] as const;

const sharedArgTypes = {
	mode: {
		options: ["primary", "transparent", "info", "success", "warning", "error"],
		control: { type: "select" },
	},
};

export const AllModes: Story = {
	name: "All Modes",
	render: () => (
		<div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
			{allModes.map((mode) => (
				<MBadge key={mode} mode={mode}>
					<StarIcon width={14} />
					{mode}
				</MBadge>
			))}
		</div>
	),
	parameters: { controls: { disable: true } },
};

export const Primary: Story = {
	args: {
		children: (
			<>
				<StarIcon width={20} />
				4.8
			</>
		),
		mode: "primary",
	},
	argTypes: sharedArgTypes,
};

export const Transparent: Story = {
	args: {
		children: (
			<>
				<StarIcon width={16} />
				4.8
			</>
		),
		mode: "transparent",
	},
	argTypes: sharedArgTypes,
};

export const Info: Story = {
	args: { children: "Info", mode: "info" },
	argTypes: sharedArgTypes,
};

export const Success: Story = {
	args: { children: "Success", mode: "success" },
	argTypes: sharedArgTypes,
};

export const Warning: Story = {
	args: { children: "Warning", mode: "warning" },
	argTypes: sharedArgTypes,
};

export const Error: Story = {
	args: { children: "Error", mode: "error" },
	argTypes: sharedArgTypes,
};
