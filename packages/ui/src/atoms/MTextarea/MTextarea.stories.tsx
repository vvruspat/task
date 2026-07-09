import { CameraIcon } from "@heroicons/react/24/outline";
import type { Meta, StoryObj } from "@storybook/react-vite";

import MFlex from "../MFlex/MFlex";
import MTextarea from "./MTextarea";

const meta: Meta<typeof MTextarea> = {
	title: "Atoms/Form/MTextarea",
	component: MTextarea,
};

export default meta;

type Story = StoryObj<typeof MTextarea>;

const textareaDesc = () => (
	<MFlex>
		<CameraIcon width={20} /> Assistive text
	</MFlex>
);

const argTypes = {
	status: {
		control: { type: "select" },
		options: ["regular", "valid", "invalid"],
	},
	disabled: { control: { type: "boolean" } },
	maxWidth: { control: { type: "number" } },
};

export const AllStatuses: Story = {
	name: "All Statuses",
	render: () => (
		<div style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: 400 }}>
			<MTextarea
				status="regular"
				placeholder="Regular"
				label="Regular"
				counter
				maxLength={200}
				description={textareaDesc()}
				caption="Caption"
			/>
			<MTextarea
				status="valid"
				placeholder="Valid"
				label="Valid"
				counter
				maxLength={200}
				description={textareaDesc()}
				caption="Caption"
			/>
			<MTextarea
				status="invalid"
				placeholder="Invalid"
				label="Invalid"
				counter
				maxLength={200}
				description={textareaDesc()}
				caption="Caption"
			/>
			<MTextarea
				status="regular"
				disabled
				placeholder="Disabled"
				label="Disabled"
				counter
				maxLength={200}
				description={textareaDesc()}
				caption="Caption"
			/>
		</div>
	),
	parameters: { controls: { disable: true } },
};

export const Regular: Story = {
	args: {
		status: "regular",
		disabled: false,
		counter: true,
		maxLength: 200,
		placeholder: "Text area",
		description: textareaDesc(),
		label: "Textarea label",
		caption: "Textarea caption",
	},
	argTypes: argTypes,
};

export const Valid: Story = {
	args: {
		status: "valid",
		disabled: false,
		counter: true,
		maxLength: 200,
		placeholder: "Text area",
		description: textareaDesc(),
		label: "Textarea label",
		caption: "Textarea caption",
	},
	argTypes: argTypes,
};

export const Invalid: Story = {
	args: {
		status: "invalid",
		disabled: false,
		counter: true,
		maxLength: 200,
		placeholder: "Text area",
		description: textareaDesc(),
		label: "Textarea label",
		caption: "Textarea caption",
	},
	argTypes: argTypes,
};

export const Disabled: Story = {
	args: {
		status: "regular",
		disabled: true,
		counter: true,
		maxLength: 200,
		placeholder: "Text area",
		description: textareaDesc(),
		label: "Textarea label",
		caption: "Textarea caption",
	},
	argTypes: argTypes,
};
