import type { Meta, StoryObj } from "@storybook/react-vite";

import MAlert from "./MAlert";

const meta: Meta<typeof MAlert> = {
	title: "Atoms/Layout/MAlert",
	component: MAlert,
};

export default meta;
type Story = StoryObj<typeof MAlert>;

const argTypes = {
	mode: {
		control: { type: "select" },
		options: ["info", "success", "warning", "error"],
	},
};

export const AllModes: Story = {
	name: "All Modes",
	render: () => (
		<div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
			<MAlert mode="info">Info — informational message for the user</MAlert>
			<MAlert mode="success">Success — action completed successfully</MAlert>
			<MAlert mode="warning">Warning — proceed with caution</MAlert>
			<MAlert mode="error">Error — something went wrong</MAlert>
		</div>
	),
	parameters: { controls: { disable: true } },
};

export const Basic: Story = {
	args: {
		mode: "info",
		children: "This is an alert",
	},
	argTypes,
};

export const Info: Story = {
	args: { mode: "info", children: "Info — informational message for the user" },
	argTypes,
};

export const Success: Story = {
	args: { mode: "success", children: "Success — action completed successfully" },
	argTypes,
};

export const Warning: Story = {
	args: { mode: "warning", children: "Warning — proceed with caution" },
	argTypes,
};

export const Error: Story = {
	args: { mode: "error", children: "Error — something went wrong" },
	argTypes,
};
