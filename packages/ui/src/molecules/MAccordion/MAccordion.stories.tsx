import { ChevronDownIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import type { Meta, StoryObj } from "@storybook/react-vite";
import MButton from "../../atoms/MButton/MButton";
import MCaption from "../../atoms/MCaption/MCaption";
import MFlex from "../../atoms/MFlex/MFlex";
import MText from "../../atoms/MText/MText";
import MAccordion from "./MAccordion";

const meta: Meta<typeof MAccordion> = {
	title: "Molecules/Data Display/Accordion",
	component: MAccordion,
};

export default meta;
type Story = StoryObj<typeof MAccordion>;

const iconClosed = <ChevronRightIcon width={20} />;
const iconOpen = <ChevronDownIcon width={20} />;

const LongTextContent = () => (
	<MFlex direction="column" align="stretch" gap="m">
		<MText as="p" mode="secondary">
			The deployment workflow runs through a longer review cycle when release
			candidates include schema changes, billing updates, or any migration that
			affects customer-visible data. Each step should remain readable when the
			content wraps across several lines, and the animated panel should preserve
			the rhythm of the surrounding accordion items.
		</MText>
		<MText as="p" mode="secondary">
			When the panel opens, users should be able to scan the copy without the
			header jumping or the content clipping awkwardly. When it closes, the
			transition should feel calm and predictable, especially when adjacent items
			are also expanded in multiple-open mode.
		</MText>
	</MFlex>
);

const ComplexContent = () => (
	<MFlex direction="column" align="stretch" gap="l">
		<MFlex direction="column" align="stretch" gap="xs">
			<MText as="div" mode="primary">
				Release checklist
			</MText>
			<MCaption>
				Use this to validate nested text, actions, and multi-line rows inside an
				animated panel.
			</MCaption>
		</MFlex>
		<MFlex as="ul" direction="column" align="stretch" gap="s">
			<li>
				<MText mode="secondary">Confirm keyboard focus remains visible.</MText>
			</li>
			<li>
				<MText mode="secondary">Verify collapsed content is not interactive.</MText>
			</li>
			<li>
				<MText mode="secondary">
					Check that long labels wrap without pushing the caret out of place.
				</MText>
			</li>
		</MFlex>
		<MFlex gap="s">
			<MButton size="s" mode="primary">
				Approve
			</MButton>
			<MButton size="s" mode="outlined">
				Review later
			</MButton>
		</MFlex>
	</MFlex>
);

export const Basic: Story = {
	args: {
		items: [
			{
				key: 1,
				title: "item 1",
				children: "accordion item 1",
			},
			{
				key: 2,
				title: "title 2",
				children: "accordion item 2",
			},
			{
				key: 3,
				title: "title 3",
				children: "accordion item 3",
			},
			{
				key: 4,
				title: "title 4",
				children: "accordion item 4",
			},
			{
				key: 5,
				title: "title 5",
				children: "accordion item 5",
			},
		],
		iconClosed,
		iconOpen,
	},

	argTypes: {
		iconClosed: { type: "string" },
		iconOpen: { type: "string" },
	},
};

export const DefaultIcons: Story = {
	args: {
		items: [
			{
				key: 1,
				title: "Account details",
				children: "Name, email, and profile settings.",
			},
			{
				key: 2,
				title: "Notifications",
				children: "Email and product update preferences.",
			},
			{
				key: 3,
				title: "Billing",
				children: "Invoices, payment methods, and tax details.",
			},
		],
	},
};

export const InitiallyExpanded: Story = {
	args: {
		items: [
			{
				key: 1,
				title: "Collapsed by default",
				children: "This item starts closed.",
			},
			{
				key: 2,
				title: "Open by default",
				children: "This item starts open because collapsed is false.",
				collapsed: false,
			},
		],
	},
};

export const MultipleExpanded: Story = {
	args: {
		allowsMultipleExpanded: true,
		items: [
			{
				key: 1,
				title: "First section",
				children: "Multiple sections can stay open.",
				collapsed: false,
			},
			{
				key: 2,
				title: "Second section",
				children: "This one can stay open at the same time.",
				collapsed: false,
			},
			{
				key: 3,
				title: "Third section",
				children: "This one starts closed.",
			},
		],
	},
};

export const ComplexContentStory: Story = {
	name: "Complex content",
	args: {
		items: [
			{
				key: 1,
				title: "Release readiness with actions",
				children: <ComplexContent />,
				collapsed: false,
			},
			{
				key: 2,
				title: "Long operational notes",
				children: <LongTextContent />,
			},
			{
				key: 3,
				title:
					"Very long accordion title that should wrap cleanly without overlapping the caret icon",
				children: (
					<MText as="p" mode="secondary">
						This item checks that the trigger layout remains stable when the
						title is much longer than usual. The icon should stay aligned at the
						end while the text takes the available horizontal space.
					</MText>
				),
			},
		],
	},
};
