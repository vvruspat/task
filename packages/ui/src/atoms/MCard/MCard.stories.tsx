import type { Meta, StoryObj } from "@storybook/react-vite";

import MButton from "../MButton/MButton";
import MFlex from "../MFlex/MFlex";
import MText from "../MText/MText";
import MCard from "./MCard";

const meta: Meta<typeof MCard> = {
	title: "Atoms/Layout/MCard",
	component: MCard,
};

export default meta;
type Story = StoryObj<typeof MCard>;

const cardFooter = (
	<MFlex justify="space-between">
		<MText>Footer content</MText>
		<MFlex gap="xl" justify="end">
			<MButton mode="primary">Confirm</MButton>
			<MButton mode="secondary">Cancel</MButton>
		</MFlex>
	</MFlex>
);

const defaultRadius = {
	borderLeftBottomRadius: "l" as const,
	borderLeftTopRadius: "l" as const,
	borderRightBottomRadius: "l" as const,
	borderRightTopRadius: "l" as const,
};

const argTypes = {
	children: { control: { type: "text" } },
	header: { control: { type: "text" } },
	footer: { control: { type: "text" } },
	collapsed: { control: { type: "boolean" } },
	shadow: { control: { type: "boolean" } },
	noPadding: { control: { type: "boolean" } },
	showHeaderDivider: { control: { type: "boolean" } },
	showFooterDivider: { control: { type: "boolean" } },
	borderLeftBottomRadius: {
		control: { type: "select" },
		options: ["none", "s", "m", "l", "xl", "2xl", "3xl", "4xl"],
	},
	borderLeftTopRadius: {
		control: { type: "select" },
		options: ["none", "s", "m", "l", "xl", "2xl", "3xl", "4xl"],
	},
	borderRightBottomRadius: {
		control: { type: "select" },
		options: ["none", "s", "m", "l", "xl", "2xl", "3xl", "4xl"],
	},
	borderRightTopRadius: {
		control: { type: "select" },
		options: ["none", "s", "m", "l", "xl", "2xl", "3xl", "4xl"],
	},
};

export const Basic: Story = {
	args: {
		children: <MText>Card content goes here.</MText>,
		header: "Title",
		showHeaderDivider: false,
		showFooterDivider: true,
		shadow: true,
		noPadding: false,
		collapsed: false,
		footer: cardFooter,
		...defaultRadius,
	},
	argTypes,
};

export const WithDividers: Story = {
	name: "With Dividers",
	args: {
		children: <MText>Card content goes here.</MText>,
		header: "Card Title",
		footer: cardFooter,
		showHeaderDivider: true,
		showFooterDivider: true,
		shadow: true,
		...defaultRadius,
	},
};

export const Collapsed: Story = {
	args: {
		children: <MText>This content is hidden when collapsed.</MText>,
		header: "Collapsible Card",
		collapsed: true,
		shadow: true,
		...defaultRadius,
	},
};

export const NoPadding: Story = {
	name: "No Padding",
	args: {
		children: (
			<div style={{ background: "#f0f0f0", padding: "24px" }}>
				<MText>Content with custom padding</MText>
			</div>
		),
		header: "No Padding Card",
		noPadding: true,
		shadow: true,
		...defaultRadius,
	},
};

export const ContentOnly: Story = {
	name: "Content Only",
	args: {
		children: <MText>A minimal card with no header or footer.</MText>,
		shadow: true,
		...defaultRadius,
	},
};
