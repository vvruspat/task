import type { Meta, StoryObj } from "@storybook/react-vite";

import MFlex from "../MFlex/MFlex";
import MAvatar from "./MAvatar";

const meta: Meta<typeof MAvatar> = {
	title: "Atoms/Layout/MAvatar",
	component: MAvatar,
};

export default meta;
type Story = StoryObj<typeof MAvatar>;

const sizes = ["xs", "s", "m", "l", "xl", "3xl", "4xl"] as const;
const sampleSrc =
	"https://cdn.pixabay.com/photo/2014/06/03/19/38/board-361516_1280.jpg";

export const Basic: Story = {
	args: {
		size: "2xl",
		src: sampleSrc,
	},
	argTypes: {
		size: {
			control: { type: "select" },
			options: ["xs", "s", "m", "l", "xl", "3xl", "4xl"],
		},
	},
};

export const AllSizes: Story = {
	name: "All Sizes",
	render: () => (
		<MFlex gap="l" align="flex-end">
			{sizes.map((size) => (
				<MAvatar key={size} size={size} src={sampleSrc} alt={size} />
			))}
		</MFlex>
	),
	parameters: { controls: { disable: true } },
};

export const Pending: Story = {
	args: {
		size: "xl",
		pending: true,
		src: sampleSrc,
	},
};

export const WithFallback: Story = {
	name: "With Fallback",
	args: {
		size: "xl",
		alt: "JD",
	},
};
