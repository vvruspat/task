"use client";

import { MDatepicker } from "../MDatepicker";
import { MFlex } from "../MFlex";
import { MTimepicker } from "../MTimepicker";
import { type ChangeEvent, type ComponentProps, useState } from "react";
import type { InputProps } from "../MInput";
import styles from "./MDatetime.module.css";

type MDatetimeProps = Omit<InputProps, "type"> & {
	name: string;
	datepickerProps?: ComponentProps<typeof MDatepicker>;
	timepickerProps?: ComponentProps<typeof MTimepicker>;
};

export const MDatetime = ({
	name,
	status = "regular",
	disabled = false,
	datepickerProps,
	defaultValue,
	timepickerProps,
	...inputProps
}: MDatetimeProps) => {
	const [value, setValue] = useState(
		defaultValue?.toString().replace("Z", "") ?? new Date().toISOString(),
	);

	const handleDateChange = (event: ChangeEvent<HTMLInputElement>) => {
		const date = event.target.value.split("T")[0];

		setValue((prev) => {
			const [_, timePart] = prev.split("T");
			return `${date}T${timePart ?? "00:00"}`;
		});

		datepickerProps?.onChange?.(event);
	};

	const handleTimeChange = (event: ChangeEvent<HTMLInputElement>) => {
		const time = event.target.value;

		setValue((prev) => {
			const [datePart] = prev.split("T");

			if (!datePart) return `${new Date().toISOString().split("T")[0]}T${time}`;

			return `${datePart}T${time}`;
		});

		timepickerProps?.onChange?.(event);
	};

	return (
		<MFlex
			direction="row"
			justify="start"
			align="start"
			className={styles.datetime}
		>
			<MDatepicker
				status={status}
				disabled={disabled}
				name={`${name}.date`}
				defaultValue={value.split("T")[0]}
				placeholder="Select date"
				onChange={handleDateChange}
			/>
			<MTimepicker
				status={status}
				disabled={disabled}
				name={`${name}.time`}
				defaultValue={value.split("T")[1] || "00:00"}
				placeholder="Select time"
				onChange={handleTimeChange}
			/>
			<input type="hidden" name={name} {...inputProps} value={value} />
		</MFlex>
	);
};

export default MDatetime;
