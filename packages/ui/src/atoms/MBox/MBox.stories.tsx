import type { Meta, StoryObj } from "@storybook/react-vite";
import MBox from "./MBox";

const meta: Meta<typeof MBox> = {
	title: "Atoms/Layout/MBox",
	component: MBox,
};

export default meta;
type Story = StoryObj<typeof MBox>;

const spaceOptions = [
	"none",
	"xs",
	"s",
	"m",
	"l",
	"xl",
	"2xl",
	"3xl",
	"4xl",
];

export const Basic: Story = {
	args: {
		padding: "l",
		margin: "none",
		style: { background: "var(--color-action-subtle-hover)" },
		children: "Content",
	},

	argTypes: {
		padding: { control: { type: "select" }, options: spaceOptions },
		paddingTop: { control: { type: "select" }, options: spaceOptions },
		paddingRight: { control: { type: "select" }, options: spaceOptions },
		paddingBottom: { control: { type: "select" }, options: spaceOptions },
		paddingLeft: { control: { type: "select" }, options: spaceOptions },
		paddingX: { control: { type: "select" }, options: spaceOptions },
		paddingY: { control: { type: "select" }, options: spaceOptions },
		margin: { control: { type: "select" }, options: spaceOptions },
		marginTop: { control: { type: "select" }, options: spaceOptions },
		marginRight: { control: { type: "select" }, options: spaceOptions },
		marginBottom: { control: { type: "select" }, options: spaceOptions },
		marginLeft: { control: { type: "select" }, options: spaceOptions },
		marginX: { control: { type: "select" }, options: spaceOptions },
		marginY: { control: { type: "select" }, options: spaceOptions },
	},
};
