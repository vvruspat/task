import clsx from "clsx";
import { type ReactNode, forwardRef, useId, useMemo } from "react";
import {
	ProgressBar,
	type ProgressBarProps as AriaProgressBarProps,
} from "react-aria-components";
import type { TComponentSize } from "../../types/TComponentSize";
import type { TComponentStatus } from "../../types/TComponentStatus";
import MFieldDescription from "../MFieldDescription/MFieldDescription";
import MFlex from "../MFlex/MFlex";
import MLabel from "../MLabel/MLabel";
import styles from "./MProgressBar.module.css";

export type ProgressBarProps = Omit<
	AriaProgressBarProps,
	"children" | "className" | "value" | "maxValue"
> &
	Partial<TComponentStatus> & {
		label?: ReactNode;
		description?: ReactNode;
		wrapperClassName?: string;
		footerClassName?: string;
		className?: string;
		value?: number;
		max?: number;
		size?: Extract<TComponentSize["size"], "s" | "m" | "l">;
		showValue?: boolean;
		valueFormatter?: (value: number, max: number) => ReactNode;
	};

const getPercent = (value: number, max: number) => {
	if (max <= 0) {
		return 0;
	}

	return Math.min(Math.max((value / max) * 100, 0), 100);
};

export const MProgressBar = forwardRef<HTMLDivElement, ProgressBarProps>(
	(
		{
			className,
			wrapperClassName,
			footerClassName,
			status = "regular",
			label,
			description,
			id,
			value,
			max = 100,
			size = "m",
			showValue = false,
			valueFormatter,
			...restProps
		},
		ref,
	) => {
		const uuid = useId();
		const fieldId = useMemo(() => id ?? uuid, [id, uuid]);
		const numericValue = typeof value === "number" ? value : undefined;
		const percent =
			typeof numericValue === "number" ? getPercent(numericValue, max) : undefined;
		const roundedPercent =
			typeof percent === "number" ? Math.round(percent) : undefined;
		const valueStyle =
			typeof percent === "number" ? { width: `${percent}%` } : undefined;

		return (
			<MFlex
				direction="column"
				align="stretch"
				className={clsx(
					styles.progressBarWrapper,
					styles[status],
					wrapperClassName,
				)}
			>
				{(label || showValue) && (
					<MFlex
						align="center"
						justify="space-between"
						className={styles.progressBarHeader}
					>
						{label && <MLabel htmlFor={fieldId}>{label}</MLabel>}
						{showValue &&
							typeof numericValue === "number" &&
							typeof percent === "number" && (
							<output htmlFor={fieldId} className={styles.value}>
								{valueFormatter
									? valueFormatter(numericValue, max)
									: `${roundedPercent}%`}
							</output>
						)}
					</MFlex>
				)}
				<ProgressBar
					ref={ref}
					id={fieldId}
					className={clsx(styles.progressBar, styles[`size-${size}`], className)}
					value={value}
					maxValue={max}
					aria-label={typeof label === "string" ? label : restProps["aria-label"]}
					{...restProps}
				>
					<div className={styles.progressTrack}>
						{typeof percent === "number" && (
							<div className={styles.progressValue} style={valueStyle} />
						)}
					</div>
				</ProgressBar>
				{description && (
					<div className={footerClassName}>
						<MFieldDescription status={status}>{description}</MFieldDescription>
					</div>
				)}
			</MFlex>
		);
	},
);

MProgressBar.displayName = "MProgressBar";

export default MProgressBar;
