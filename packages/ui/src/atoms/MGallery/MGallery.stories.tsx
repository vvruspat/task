import { BookmarkIcon } from "@heroicons/react/24/outline";
import type { Meta, StoryObj } from "@storybook/react-vite";

import MButton from "../MButton/MButton";
import MFlex from "../MFlex/MFlex";
import MGallery from "./MGallery";

const meta: Meta<typeof MGallery> = {
	title: "Atoms/Visual/MGallery",
	component: MGallery,
};

export default meta;

type Story = StoryObj<typeof MGallery>;

const footer = (
	<MFlex direction="row" gap="l" justify="space-between">
		<div>A long long long long text</div>
		<div>@ 4.7</div>
	</MFlex>
);

export const Basic: Story = {
	args: {
		slides: [
			<img src="https://picsum.photos/400?random=1" key="1" />,
			<img src="https://picsum.photos/400?random=2" key="2" />,
			<img src="https://picsum.photos/400?random=3" key="3" />,
			<img src="https://picsum.photos/400?random=4" key="4" />,
			<img src="https://picsum.photos/400?random=5" key="5" />,
			<MButton key="6">Click me</MButton>,
		],
		header: ["Foo ", "Bar ", "Baz "],
		tools: [<BookmarkIcon width={24} key="1" />],
		footer: [footer],
	},
	argTypes: {},
};
