import type { Meta, StoryObj } from "@storybook/react-vite";
import MButton from "../MButton/MButton";
import MFlex from "../MFlex/MFlex";
import { mToast, MToastRegion } from "./MToast";

const meta: Meta = {
	title: "Atoms/Feedback/MToast",
};

export default meta;
type Story = StoryObj;

export const AllModes: Story = {
	name: "All Modes",
	render: () => (
		<>
			<MFlex gap="s" wrap="wrap">
				<MButton
					mode="outlined"
					onClick={() => mToast.info("Heads up", "A new version is available.")}
				>
					Info
				</MButton>
				<MButton
					mode="outlined"
					onClick={() =>
						mToast.success("Saved", "Your changes were saved successfully.")
					}
				>
					Success
				</MButton>
				<MButton
					mode="outlined"
					onClick={() =>
						mToast.warning("Low storage", "You're running out of space.")
					}
				>
					Warning
				</MButton>
				<MButton
					mode="outlined"
					onClick={() =>
						mToast.error("Something went wrong", "Please try again.")
					}
				>
					Error
				</MButton>
			</MFlex>
			<MToastRegion />
		</>
	),
	parameters: { controls: { disable: true } },
};

export const Basic: Story = {
	render: () => (
		<>
			<MButton onClick={() => mToast.success("This is a toast")}>
				Show toast
			</MButton>
			<MToastRegion />
		</>
	),
	parameters: { controls: { disable: true } },
};
