import clsx from "clsx";
import {
	type ChangeEvent,
	type CSSProperties,
	type ReactNode,
	forwardRef,
	useCallback,
	useId,
	useMemo,
	useState,
} from "react";
import type { TComponentStatus } from "../../types/TComponentStatus";
import MFieldDescription from "../MFieldDescription/MFieldDescription";
import MFlex from "../MFlex/MFlex";
import MText from "../MText/MText";
import { MSlider, type SliderProps } from "../MSlider";
import styles from "./MRangeSlider.module.css";

export type RangeSliderValue = readonly [number, number];

export type RangeSliderProps = Omit<
	SliderProps,
	| "value"
	| "defaultValue"
	| "onChange"
	| "onValueChange"
	| "outputFormatter"
	| "trackClassName"
> &
	Partial<TComponentStatus> & {
		label?: ReactNode;
		description?: ReactNode;
		value?: RangeSliderValue;
		defaultValue?: RangeSliderValue;
		minName?: string;
		maxName?: string;
		minLabel?: string;
		maxLabel?: string;
		outputFormatter?: (value: RangeSliderValue) => ReactNode;
		onChange?: (
			value: RangeSliderValue,
			event: ChangeEvent<HTMLInputElement>,
		) => void;
		onValueChange?: (
			value: RangeSliderValue,
			event: ChangeEvent<HTMLInputElement>,
		) => void;
	};

const clamp = (value: number, min: number, max: number) => {
	return Math.min(Math.max(value, min), max);
};

const getPercent = (value: number, min: number, max: number) => {
	if (min === max) {
		return 0;
	}

	return ((value - min) / (max - min)) * 100;
};

export const MRangeSlider = forwardRef<HTMLDivElement, RangeSliderProps>(
	(
		{
			className,
			wrapperClassName,
			footerClassName,
			status = "regular",
			label,
			description,
			id,
			name,
			minName,
			maxName,
			minLabel = "Minimum value",
			maxLabel = "Maximum value",
			min = 0,
			max = 100,
			step = 1,
			value,
			defaultValue,
			showValue = false,
			outputFormatter,
			onChange,
			onValueChange,
			disabled,
			style,
			"aria-label": ariaLabel,
			"aria-labelledby": ariaLabelledBy,
			...restProps
		},
		ref,
	) => {
		const uuid = useId();
		const fieldId = useMemo(() => id ?? uuid, [id, uuid]);
		const labelId = `${fieldId}-label`;
		const [localValue, setLocalValue] = useState<RangeSliderValue>(
			defaultValue ?? [min, max],
		);
		const currentValue = value ?? localValue;
		const lowerValue = clamp(Math.min(currentValue[0], currentValue[1]), min, max);
		const upperValue = clamp(Math.max(currentValue[0], currentValue[1]), min, max);
		const rangeValue: RangeSliderValue = [lowerValue, upperValue];
		const lowerPercent = getPercent(lowerValue, min, max);
		const upperPercent = getPercent(upperValue, min, max);
		const inputSplitPercent = (lowerPercent + upperPercent) / 2;
		const selectionStyle: CSSProperties = {
			left: `${lowerPercent}%`,
			width: `${upperPercent - lowerPercent}%`,
		};
		const lowerInputStyle: CSSProperties = {
			...style,
			clipPath: `inset(0 ${100 - inputSplitPercent}% 0 0)`,
		};
		const upperInputStyle: CSSProperties = {
			...style,
			clipPath: `inset(0 0 0 ${inputSplitPercent}%)`,
		};

		const emitValueChange = useCallback(
			(nextValue: RangeSliderValue, event: ChangeEvent<HTMLInputElement>) => {
				setLocalValue(nextValue);
				onValueChange?.(nextValue, event);
				onChange?.(nextValue, event);
			},
			[onChange, onValueChange],
		);

		const handleLowerChange = useCallback(
			(nextValue: number, event: ChangeEvent<HTMLInputElement>) => {
				emitValueChange([Math.min(nextValue, upperValue), upperValue], event);
			},
			[emitValueChange, upperValue],
		);

		const handleUpperChange = useCallback(
			(nextValue: number, event: ChangeEvent<HTMLInputElement>) => {
				emitValueChange([lowerValue, Math.max(nextValue, lowerValue)], event);
			},
			[emitValueChange, lowerValue],
		);

		return (
			<MFlex
				direction="column"
				align="stretch"
				ref={ref}
				className={clsx(
					styles.rangeSliderWrapper,
					styles[status],
					{ [styles.disabled]: disabled },
					wrapperClassName,
				)}
				role="group"
				aria-label={ariaLabel}
				aria-labelledby={label ? labelId : ariaLabelledBy}
			>
				{(label || showValue) && (
					<MFlex
						justify="space-between"
						align="center"
						className={styles.rangeHeader}
					>
						{label && (
							<MText as="div" id={labelId}>
								{label}
							</MText>
						)}
						{showValue && (
							<output className={styles.value}>
								{outputFormatter
									? outputFormatter(rangeValue)
									: `${lowerValue} - ${upperValue}`}
								</output>
							)}
					</MFlex>
				)}
				<div className={clsx(styles.rangeControl, className)}>
					<div className={styles.rangeTrack} />
					<div className={styles.rangeSelection} style={selectionStyle} />
					<div className={styles.rangeInputs}>
						<MSlider
							wrapperClassName={styles.sliderControl}
							trackClassName={styles.sliderTrack}
							className={clsx(styles.rangeInput, styles.lowerInput)}
							id={`${fieldId}-min`}
							name={minName ?? (name ? `${name}-min` : undefined)}
							min={min}
							max={max}
							step={step}
							value={lowerValue}
							disabled={disabled}
							style={lowerInputStyle}
							aria-label={minLabel}
							onValueChange={handleLowerChange}
							{...restProps}
						/>
						<MSlider
							wrapperClassName={styles.sliderControl}
							trackClassName={styles.sliderTrack}
							className={clsx(styles.rangeInput, styles.upperInput)}
							id={`${fieldId}-max`}
							name={maxName ?? (name ? `${name}-max` : undefined)}
							min={min}
							max={max}
							step={step}
							value={upperValue}
							disabled={disabled}
							style={upperInputStyle}
							aria-label={maxLabel}
							onValueChange={handleUpperChange}
							{...restProps}
						/>
					</div>
				</div>
				{description && (
					<div className={footerClassName}>
						<MFieldDescription status={status}>{description}</MFieldDescription>
					</div>
				)}
			</MFlex>
		);
	},
);

MRangeSlider.displayName = "MRangeSlider";

export default MRangeSlider;
