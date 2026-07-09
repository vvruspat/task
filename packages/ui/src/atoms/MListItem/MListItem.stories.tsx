import { CodeBracketSquareIcon } from "@heroicons/react/24/outline";
import type { Meta, StoryObj } from "@storybook/react-vite";
import MFlex from "../MFlex/MFlex";
import MText from "../MText/MText";
import MListItem from "./MListItem";

const meta: Meta<typeof MListItem> = {
	title: "Atoms/Form/MListItem",
	component: MListItem,
};

export default meta;
type Story = StoryObj<typeof MListItem>;
const item = () => (
	<MFlex gap="s">
		<CodeBracketSquareIcon width={20} />
		<MText>List Item</MText>
	</MFlex>
);
export const Basic: Story = {
	args: {
		children: item(),
	},

	argTypes: {
		children: {
			control: { type: "text" },
		},
	},
};
