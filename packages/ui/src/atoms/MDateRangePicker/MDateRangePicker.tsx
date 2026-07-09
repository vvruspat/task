"use client";

import { type ChangeEvent, type FocusEvent, useId, useState } from "react";
import { MButton } from "../MButton";
import { MDropdown } from "../MDropdown";
import { MFlex } from "../MFlex";
import { MCalendar } from "../MCalendar";
import type { MDateRange } from "../MCalendar";
import { MInput } from "../MInput";
import type { TComponentStatus } from "../../types/TComponentStatus";
import { CalendarIcon } from "./CalendarIcon";
import styles from "./MDateRangePicker.module.css";

export type { MDateRange } from "../MCalendar";

type MDateRangePickerProps = Partial<TComponentStatus> & {
	disabled?: boolean;
	minDate?: Date;
	maxDate?: Date;
	defaultValue?: MDateRange;
	fromPlaceholder?: string;
	toPlaceholder?: string;
	className?: string;
	onChange?: (range: MDateRange) => void;
};

const toInputValue = (date?: Date) => {
	if (!date) {
		return undefined;
	}

	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");

	return `${year}-${month}-${day}`;
};

const parseInputDate = (value: string): Date | undefined => {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

	if (!match) {
		return undefined;
	}

	const [, year, month, day] = match;

	return new Date(Number(year), Number(month) - 1, Number(day));
};

export const MDateRangePicker = ({
	status = "regular",
	disabled,
	minDate,
	maxDate,
	defaultValue,
	fromPlaceholder = "From",
	toPlaceholder = "To",
	className,
	onChange,
}: MDateRangePickerProps) => {
	const [open, setOpen] = useState(false);
	const [range, setRange] = useState<Partial<MDateRange>>({
		start: defaultValue?.start,
		end: defaultValue?.end,
	});
	const [fromValue, setFromValue] = useState(toInputValue(defaultValue?.start));
	const [toValue, setToValue] = useState(toInputValue(defaultValue?.end));

	const id = useId();

	const onRangeChange = (newRange: MDateRange) => {
		setRange(newRange);
		setFromValue(toInputValue(newRange.start));
		setToValue(toInputValue(newRange.end));
		onChange?.(newRange);
		setOpen(false);
	};

	const onFromInputChange = (event: ChangeEvent<HTMLInputElement>) => {
		const value = parseInputDate(event.target.value);

		setFromValue(event.target.value);

		if (value && range.end) {
			const newRange = { start: value, end: range.end };

			setRange(newRange);
			onChange?.(newRange);
		}
	};

	const onToInputChange = (event: ChangeEvent<HTMLInputElement>) => {
		const value = parseInputDate(event.target.value);

		setToValue(event.target.value);

		if (value && range.start) {
			const newRange = { start: range.start, end: value };

			setRange(newRange);
			onChange?.(newRange);
		}
	};

	const onInputFocus = (_event: FocusEvent<HTMLInputElement>) => {
		setOpen(true);
	};

	return (
		<MDropdown
			open={open}
			onClose={() => setOpen(false)}
			dropdownContent={
				<MCalendar
					mode="range"
					onRangeChange={onRangeChange}
					rangeValue={
						range.start && range.end ? (range as MDateRange) : undefined
					}
					minDate={minDate}
					maxDate={maxDate}
				/>
			}
			className={className}
			stretch={false}
			align="left"
			noPadding
			id={`date-range-picker-dropdown-${id}`}
		>
			<MFlex direction="row" align="center" className={styles.inputsRow}>
				<MInput
					type="date"
					status={status}
					disabled={disabled}
					value={fromValue}
					onChange={onFromInputChange}
					onFocus={onInputFocus}
					placeholder={fromPlaceholder}
					wrapperClassName={styles.inputWrapper}
					className={styles.dateRangePickerInput}
					aria-label="From date"
					aria-haspopup="true"
					aria-expanded={open}
					aria-controls={`date-range-picker-dropdown-${id}`}
				/>
				<span className={styles.separator}>–</span>
				<MInput
					type="date"
					status={status}
					disabled={disabled}
					value={toValue}
					onChange={onToInputChange}
					onFocus={onInputFocus}
					placeholder={toPlaceholder}
					wrapperClassName={styles.inputWrapper}
					className={styles.dateRangePickerInput}
					aria-label="To date"
					aria-haspopup="true"
					aria-expanded={open}
					aria-controls={`date-range-picker-dropdown-${id}`}
					after={
						<MButton
							mode="transparent"
							onClick={() => setOpen(true)}
							type="button"
							noPadding
							disabled={disabled}
							aria-label="Open date range picker"
							tabIndex={0}
						>
							<CalendarIcon />
						</MButton>
					}
				/>
			</MFlex>
		</MDropdown>
	);
};

export default MDateRangePicker;
