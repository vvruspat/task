import { ChevronDownIcon } from "@heroicons/react/24/outline";
import type { CalendarDate } from "@internationalized/date";
import { useMemo } from "react";
import {
	Button,
	ListBox,
	ListBoxItem,
	Popover,
	Select,
	SelectValue,
} from "react-aria-components";
import { MFlex } from "../MFlex";

type FocusableCalendarState = {
	focusedDate: CalendarDate;
	setFocusedDate: (date: CalendarDate) => void;
};

export type MCalendarMonthYearClassNames = {
	container: string;
	button: string;
	value: string;
	popover: string;
	listBox: string;
	option: string;
};

type MCalendarMonthYearControlsProps = {
	state: FocusableCalendarState;
	minDate?: Date;
	maxDate?: Date;
	classNames: MCalendarMonthYearClassNames;
};

const MONTHS = Array.from({ length: 12 }, (_, i) => `${i + 1}`);

export const MCalendarMonthYearControls = ({
	state,
	minDate,
	maxDate,
	classNames,
}: MCalendarMonthYearControlsProps) => {
	const { focusedDate } = state;

	const months = useMemo(
		() =>
			MONTHS.map((key) => ({
				key,
				label: new Date(2000, Number(key) - 1, 1).toLocaleDateString(
					"en-US",
					{ month: "short" },
				),
			})),
		[],
	);

	const years = useMemo(() => {
		const startYear = minDate?.getFullYear() ?? focusedDate.year - 10;
		const endYear = maxDate?.getFullYear() ?? focusedDate.year + 10;

		return Array.from(
			{ length: endYear - startYear + 1 },
			(_, i) => `${startYear + i}`,
		);
	}, [minDate, maxDate, focusedDate]);

	return (
		<MFlex
			direction="row"
			align="center"
			className={classNames.container}
		>
			<Select
				aria-label="Select month"
				selectedKey={`${focusedDate.month}`}
				onSelectionChange={(key) => {
					if (key !== null) {
						state.setFocusedDate(focusedDate.set({ month: Number(key) }));
					}
				}}
			>
				<Button className={classNames.button}>
					<SelectValue className={classNames.value} />
					<ChevronDownIcon width={14} />
				</Button>
				<Popover className={classNames.popover}>
					<ListBox className={classNames.listBox}>
						{months.map((month) => (
							<ListBoxItem
								key={month.key}
								id={month.key}
								textValue={month.label}
								className={classNames.option}
							>
								{month.label}
							</ListBoxItem>
						))}
					</ListBox>
				</Popover>
			</Select>
			<Select
				aria-label="Select year"
				selectedKey={`${focusedDate.year}`}
				onSelectionChange={(key) => {
					if (key !== null) {
						state.setFocusedDate(focusedDate.set({ year: Number(key) }));
					}
				}}
			>
				<Button className={classNames.button}>
					<SelectValue className={classNames.value} />
					<ChevronDownIcon width={14} />
				</Button>
				<Popover className={classNames.popover}>
					<ListBox className={classNames.listBox}>
						{years.map((year) => (
							<ListBoxItem
								key={year}
								id={year}
								textValue={year}
								className={classNames.option}
							>
								{year}
							</ListBoxItem>
						))}
					</ListBox>
				</Popover>
			</Select>
		</MFlex>
	);
};

export default MCalendarMonthYearControls;
