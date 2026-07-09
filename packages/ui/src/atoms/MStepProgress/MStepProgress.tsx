import clsx from "clsx";
import type { ComponentProps } from "react";
import { MFlex } from "../MFlex";
import { MGrid } from "../MGrid";
import styles from "./MStepProgress.module.css";

export type MStepProgressProps = ComponentProps<typeof MFlex> & {
	mode?: "error" | "warning" | "success" | "info";
	steps?: number;
	currentStep?: number;
	showLabel?: boolean;
	label?: string;
};

export const MStepProgress = ({
	mode = "info",
	steps = 10,
	currentStep = 0,
	label,
	showLabel = false,
	className,
	children,
	...restProps
}: MStepProgressProps) => {
	if (!mode) {
		return null;
	}
	return (
		<MFlex
			direction="column"
			justify="center"
			align="stretch"
			{...restProps}
			role="progressbar"
			aria-valuenow={currentStep}
			aria-valuemin={0}
			aria-valuemax={steps}
		>
			{(showLabel || label) && (
				<div
					role="presentation"
					className={clsx(
						styles["step-progress-label"],
						styles[`step-progress-label-mode-${mode}`],
					)}
				>
					{label || `Step ${currentStep} of ${steps}`}
				</div>
			)}
			<MGrid
				columnTemplate={`repeat(${steps}, 1fr)`}
				tag="ul"
				className={styles["step-progress-list"]}
			>
				{Array.from({ length: steps }, (_, index) => (
					<li
						// biome-ignore lint/suspicious/noArrayIndexKey: index is the only unique identifier here
						key={index}
						aria-current={currentStep === index ? "step" : undefined}
						className={clsx(
							styles["step-progress-item"],
							index < currentStep
								? styles[`step-progress-mode-${mode}`]
								: styles["step-progress-mode-pending"],
						)}
					/>
				))}
			</MGrid>
		</MFlex>
	);
};

export default MStepProgress;
