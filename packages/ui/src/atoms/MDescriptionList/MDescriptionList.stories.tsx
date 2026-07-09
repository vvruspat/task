import type { Meta, StoryObj } from "@storybook/react-vite";

import MDescriptionList from "./MDescriptionList";

const meta: Meta<typeof MDescriptionList> = {
	title: "Atoms/Layout/MDescriptionList",
	component: MDescriptionList,
};

export default meta;
type Story = StoryObj<typeof MDescriptionList>;

export const Basic: Story = {
	args: {
		options: [
			{
				title: "Title",
				description: "Description",
			},
			{
				title: "Title second",
				description: "Description second",
			},
			{
				title: "Title third",
				description: "Description third",
			},
			{
				title: "Title fourth",
				description: "Description fourth",
			},
			{
				title: "Title fifth",
				description: "Description fifth",
			},
			{
				title: "Title sixth",
				description: "Description sixth",
			},
		],

		size: "m",
	},

	argTypes: {
		size: {
			options: ["s", "m", "l"],
			control: { type: "select" },
		},
	},
};
