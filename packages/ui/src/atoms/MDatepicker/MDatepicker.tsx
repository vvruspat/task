"use client";

import clsx from "clsx";
import {
	type ChangeEvent,
	type FocusEvent,
	useId,
	useRef,
	useState,
} from "react";
import { MButton } from "../MButton";
import { MCalendar } from "../MCalendar";
import { MDropdown } from "../MDropdown";
import { type InputProps, MInput } from "../MInput";
import { CalendarIcon } from "./CalendarIcon";
import styles from "./MDatepicker.module.css";

type MDatepickerProps = InputProps & {
	type?: Extract<
		InputProps["type"],
		"date" | "datetime-local" | "month" | "week"
	>;
	minDate?: Date;
	maxDate?: Date;
};

export const MDatepicker = ({
	type = "date",
	className,
	defaultValue,
	onChange,
	onFocus,
	minDate,
	maxDate,
	...inputProps
}: MDatepickerProps) => {
	const [open, setOpen] = useState(false);
	const [date, setDate] = useState(
		defaultValue ? new Date(defaultValue.toString()) : new Date(),
	);
	const [dateValue, setDateValue] = useState(
		defaultValue?.toString()?.split("T")[0],
	);

	const id = useId();

	const inputRef = useRef<HTMLInputElement | null>(null);

	const triggerOnChange = (value: Date) => {
		if (inputRef.current) {
			inputRef.current.value =
				value.toISOString().split("T")[0] ?? inputRef.current.value ?? "";

			onChange?.({
				target: inputRef.current,
				currentTarget: inputRef.current,
				type: "change",
			} as ChangeEvent<HTMLInputElement>);
		}
	};

	const onDateChange = (date: Date) => {
		try {
			setDateValue(date.toISOString().split("T")[0]);
			triggerOnChange(date);
			setOpen(false);
		} catch (e) {
			console.error("Invalid date format", e);
		}
	};

	const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
		try {
			const d = new Date(event.target.value);

			setDate(d);
			setDateValue(d.toISOString().split("T")[0]);
			onChange?.(event);
		} catch (_e) {}
	};

	const onInputFocus = (event: FocusEvent<HTMLInputElement>) => {
		setOpen(true);
		onFocus?.(event);
	};

	return (
		<MDropdown
			open={open}
			onClose={() => setOpen(false)}
			dropdownContent={
				<MCalendar
					onChange={onDateChange}
					date={date}
					minDate={minDate}
					maxDate={maxDate}
				/>
			}
			className={styles.datepicker}
			stretch={false}
			align="right"
			noPadding
			id={`datepicker-dropdown-${id}`}
		>
			<MInput
				type={type}
				{...inputProps}
				ref={inputRef}
				value={dateValue}
				onChange={onInputChange}
				defaultValue={defaultValue}
				className={clsx(className, styles.datepickerInput)}
				onFocus={onInputFocus}
				after={
					<MButton
						mode="transparent"
						onClick={() => setOpen(true)}
						type="button"
						noPadding
						aria-label="Open datepicker"
						aria-haspopup="true"
						aria-expanded={open}
						aria-controls={`datepicker-dropdown-${id}`}
						tabIndex={0}
					>
						<CalendarIcon />
					</MButton>
				}
			/>
		</MDropdown>
	);
};

export default MDatepicker;
