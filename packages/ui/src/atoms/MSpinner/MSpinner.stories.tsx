import type { Meta, StoryObj } from "@storybook/react-vite";

import MFlex from "../MFlex/MFlex";
import MSpinner from "./MSpinner";

const meta: Meta<typeof MSpinner> = {
	title: "Atoms/Layout/MSpinner",
	component: MSpinner,
};

export default meta;
type Story = StoryObj<typeof MSpinner>;

const modes = ["base", "primary", "secondary", "tertiary"] as const;
const sizes = ["xs", "s", "m", "l", "xl", "3xl", "4xl"] as const;

export const Regular: Story = {
	args: {
		size: "xl",
		mode: "primary",
	},
	argTypes: {
		size: {
			control: { type: "select" },
			options: ["xs", "s", "m", "l", "xl", "3xl", "4xl"],
		},
		mode: {
			control: { type: "select" },
			options: ["base", "primary", "secondary", "tertiary"],
		},
	},
};

export const AllModes: Story = {
	name: "All Modes",
	render: () => (
		<MFlex gap="xl" align="center">
			{modes.map((mode) => (
				<MSpinner key={mode} mode={mode} size="xl" />
			))}
		</MFlex>
	),
	parameters: { controls: { disable: true } },
};

export const AllSizes: Story = {
	name: "All Sizes",
	render: () => (
		<MFlex gap="l" align="center">
			{sizes.map((size) => (
				<MSpinner key={size} size={size} mode="primary" />
			))}
		</MFlex>
	),
	parameters: { controls: { disable: true } },
};
