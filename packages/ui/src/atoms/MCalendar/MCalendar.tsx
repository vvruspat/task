import { CalendarDate } from "@internationalized/date";
import clsx from "clsx";
import { useContext } from "react";
import {
	Button,
	Calendar,
	CalendarCell,
	CalendarGrid,
	CalendarStateContext,
	RangeCalendar,
	RangeCalendarStateContext,
} from "react-aria-components";
import { MFlex } from "../MFlex";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { MCalendarMonthYearControls } from "./MCalendarMonthYearControls";
import styles from "./MCalendar.module.css";

export type MDateRange = {
	start: Date;
	end: Date;
};

type MCalendarProps = {
	mode?: "single" | "range";
	minDate?: Date;
	maxDate?: Date;
	defaultValue?: Date;
	date?: Date;
	onChange?: (date: Date) => void;
	defaultRangeValue?: MDateRange;
	rangeValue?: MDateRange;
	onRangeChange?: (range: MDateRange) => void;
};

const dateToCalendarDate = (date: Date) => {
	return new CalendarDate(
		date.getFullYear(),
		date.getMonth() + 1,
		date.getDate(),
	);
};

const calendarDateToDate = (date: CalendarDate) => {
	return new Date(date.year, date.month - 1, date.day);
};

const monthYearClassNames = {
	container: styles.calendarMonthYear,
	button: styles.monthYearButton,
	value: styles.monthYearValue,
	popover: styles.monthYearPopover,
	listBox: styles.monthYearListBox,
	option: styles.monthYearOption,
};

type MCalendarHeaderProps = {
	minDate?: Date;
	maxDate?: Date;
};

const MCalendarHeader = ({ minDate, maxDate }: MCalendarHeaderProps) => {
	const state = useContext(CalendarStateContext);

	if (!state) {
		return null;
	}

	return (
		<MFlex
			direction="row"
			align="center"
			justify="space-between"
			className={styles.calendarHeader}
		>
			<Button slot="previous" className={styles.calendarNavButton}>
				<ChevronLeftIcon width={20} />
			</Button>
			<MCalendarMonthYearControls
				state={state}
				minDate={minDate}
				maxDate={maxDate}
				classNames={monthYearClassNames}
			/>
			<Button slot="next" className={styles.calendarNavButton}>
				<ChevronRightIcon width={20} />
			</Button>
		</MFlex>
	);
};

const MRangeCalendarHeader = ({ minDate, maxDate }: MCalendarHeaderProps) => {
	const state = useContext(RangeCalendarStateContext);

	if (!state) {
		return null;
	}

	return (
		<MFlex
			direction="row"
			align="center"
			justify="space-between"
			className={styles.calendarHeader}
		>
			<Button slot="previous" className={styles.calendarNavButton}>
				<ChevronLeftIcon width={20} />
			</Button>
			<MCalendarMonthYearControls
				state={state}
				minDate={minDate}
				maxDate={maxDate}
				classNames={monthYearClassNames}
			/>
			<Button slot="next" className={styles.calendarNavButton}>
				<ChevronRightIcon width={20} />
			</Button>
		</MFlex>
	);
};

export const MCalendar = ({
	mode = "single",
	minDate,
	maxDate,
	defaultValue = new Date(),
	date: currentDate,
	onChange,
	defaultRangeValue,
	rangeValue,
	onRangeChange,
}: MCalendarProps) => {
	const minValue = minDate ? dateToCalendarDate(minDate) : undefined;
	const maxValue = maxDate ? dateToCalendarDate(maxDate) : undefined;

	if (mode === "range") {
		return (
			<RangeCalendar
				className={styles.calendar}
				value={
					rangeValue
						? {
								start: dateToCalendarDate(rangeValue.start),
								end: dateToCalendarDate(rangeValue.end),
							}
						: undefined
				}
				defaultValue={
					defaultRangeValue
						? {
								start: dateToCalendarDate(defaultRangeValue.start),
								end: dateToCalendarDate(defaultRangeValue.end),
							}
						: undefined
				}
				minValue={minValue}
				maxValue={maxValue}
				onChange={(range) =>
					onRangeChange?.({
						start: calendarDateToDate(range.start),
						end: calendarDateToDate(range.end),
					})
				}
			>
				<MRangeCalendarHeader minDate={minDate} maxDate={maxDate} />

				<CalendarGrid
					className={clsx(styles.calendarGrid, styles.calendarGridRange)}
					weekdayStyle="short"
				>
					{(date) => (
						<CalendarCell date={date} className={styles.calendarCell} />
					)}
				</CalendarGrid>
			</RangeCalendar>
		);
	}

	return (
		<Calendar
			className={styles.calendar}
			value={currentDate ? dateToCalendarDate(currentDate) : undefined}
			defaultValue={dateToCalendarDate(defaultValue)}
			minValue={minValue}
			maxValue={maxValue}
			onChange={(value) => onChange?.(calendarDateToDate(value))}
		>
			<MCalendarHeader minDate={minDate} maxDate={maxDate} />

			<CalendarGrid className={styles.calendarGrid} weekdayStyle="short">
				{(date) => (
					<CalendarCell date={date} className={styles.calendarCell} />
				)}
			</CalendarGrid>
		</Calendar>
	);
};

export default MCalendar;
