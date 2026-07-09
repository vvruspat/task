import clsx from "clsx";
import {
	type ChangeEvent,
	type ComponentProps,
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
import MLabel from "../MLabel/MLabel";
import styles from "./MSlider.module.css";

export type SliderProps = Omit<
	ComponentProps<"input">,
	"type" | "value" | "defaultValue" | "min" | "max" | "step" | "onChange"
> &
	Partial<TComponentStatus> & {
		label?: ReactNode;
		description?: ReactNode;
		wrapperClassName?: string;
		trackClassName?: string;
		footerClassName?: string;
		value?: number;
		defaultValue?: number;
		min?: number;
		max?: number;
		step?: number;
		showValue?: boolean;
		outputFormatter?: (value: number) => ReactNode;
		onChange?: ComponentProps<"input">["onChange"];
		onValueChange?: (
			value: number,
			event: ChangeEvent<HTMLInputElement>,
		) => void;
	};

export const MSlider = forwardRef<HTMLInputElement, SliderProps>(
	(
		{
			className,
			wrapperClassName,
			trackClassName,
			footerClassName,
			status = "regular",
			label,
			description,
			id,
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
			...restProps
		},
		ref,
	) => {
		const uuid = useId();
		const fieldId = useMemo(() => id ?? uuid, [id, uuid]);
		const [localValue, setLocalValue] = useState(defaultValue ?? min);
		const currentValue = value ?? localValue;

		const handleChange = useCallback(
			(event: ChangeEvent<HTMLInputElement>) => {
				const nextValue = Number(event.currentTarget.value);

				setLocalValue(nextValue);
				onValueChange?.(nextValue, event);
				onChange?.(event);
			},
			[onChange, onValueChange],
		);

		return (
			<MFlex
				direction="column"
				align="stretch"
				className={clsx(
					styles.sliderWrapper,
					styles[status],
					{ [styles.disabled]: disabled },
					wrapperClassName,
				)}
			>
				{(label || showValue) && (
					<MFlex
						justify="space-between"
						align="center"
						className={styles.sliderHeader}
					>
						{label && <MLabel htmlFor={fieldId}>{label}</MLabel>}
						{showValue && (
							<output htmlFor={fieldId} className={styles.value}>
								{outputFormatter ? outputFormatter(currentValue) : currentValue}
							</output>
						)}
					</MFlex>
				)}
				<MFlex align="center" className={clsx(styles.track, trackClassName)}>
					<input
						ref={ref}
						id={fieldId}
						type="range"
						className={clsx(styles.slider, className)}
						min={min}
						max={max}
						step={step}
						value={currentValue}
						disabled={disabled}
						onChange={handleChange}
						{...restProps}
					/>
				</MFlex>
				{description && (
					<div className={footerClassName}>
						<MFieldDescription status={status}>{description}</MFieldDescription>
					</div>
				)}
			</MFlex>
		);
	},
);

MSlider.displayName = "MSlider";

export default MSlider;
