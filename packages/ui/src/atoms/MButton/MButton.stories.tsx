import type { Meta, StoryObj } from "@storybook/react-vite";

import MButton from "./MButton";

const meta: Meta<typeof MButton> = {
	title: "Atoms/Form/MButton",
	component: MButton,
};

export default meta;
type Story = StoryObj<typeof MButton>;

const modes = [
	"primary",
	"secondary",
	"tertiary",
	"outlined",
	"transparent",
	"round",
] as const;

const sizes = ["s", "m", "l"] as const;

export const Basic: Story = {
	args: {
		disabled: false,
		children: "Button",
		mode: "primary",
		before: "",
		after: "",
		size: "m",
	},
	argTypes: {
		disabled: { control: { type: "boolean" } },
		mode: {
			options: ["primary", "secondary", "tertiary", "round", "outlined", "transparent"],
			control: { type: "select" },
		},
		before: { control: { type: "text" } },
		after: { control: { type: "text" } },
		size: {
			options: ["s", "m", "l"],
			control: { type: "select" },
		},
	},
};

export const AllModes: Story = {
	name: "All Modes",
	render: () => (
		<div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
			{modes.map((mode) => (
				<MButton key={mode} mode={mode}>
					{mode === "round" ? "+" : mode}
				</MButton>
			))}
		</div>
	),
	parameters: { controls: { disable: true } },
};

export const AllSizes: Story = {
	name: "All Sizes",
	render: () => (
		<div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
			{sizes.map((size) => (
				<MButton key={size} size={size} mode="primary">
					{size}
				</MButton>
			))}
		</div>
	),
	parameters: { controls: { disable: true } },
};

export const Disabled: Story = {
	name: "Disabled",
	render: () => (
		<div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
			<MButton mode="primary" disabled>Primary</MButton>
			<MButton mode="secondary" disabled>Secondary</MButton>
			<MButton mode="tertiary" disabled>Tertiary</MButton>
			<MButton mode="outlined" disabled>Outlined</MButton>
			<MButton mode="transparent" disabled>Transparent</MButton>
		</div>
	),
	parameters: { controls: { disable: true } },
};
