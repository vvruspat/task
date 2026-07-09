import type { Meta, StoryObj } from "@storybook/react-vite";

import MStepProgress from "./MStepProgress";

const meta: Meta<typeof MStepProgress> = {
	title: "Atoms/Feedback/MStepProgress",
	component: MStepProgress,
};

export default meta;
type Story = StoryObj<typeof MStepProgress>;

export const Basic: Story = {
	args: {
		mode: "info",
		children: "This is an step-progress",
	},

	argTypes: {
		showLabel: {
			control: { type: "boolean" },
			description: "Whether to show the label",
			defaultValue: false,
		},

		label: {
			control: { type: "text" },
			description: "Label to display above the progress",
			defaultValue: undefined,
		},

		mode: {
			control: { type: "select" },
			options: ["info", "success", "warning", "error"],
		},

		steps: {
			control: { type: "number" },
			description: "Total number of steps in the progress",
			defaultValue: 10,
		},

		currentStep: {
			control: { type: "number" },
			description: "Current step index",
			defaultValue: 0,
		},
	},
};
