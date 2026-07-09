"use client";

import { ChevronDownIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import type { Key, ReactNode } from "react";
import {
	Button,
	ListBox,
	ListBoxItem,
	Popover,
	Select,
	SelectValue,
	type SelectProps,
} from "react-aria-components";
import type { BasicInputProps } from "../../types/BasicInputProps";
import type { ListItemProps } from "../MListItem/MListItem";
import styles from "./MSelect.module.css";

export type MSelectOption = ListItemProps & {
	key: string;
	value?: ReactNode;
};

type SelectComponentProps = Omit<
	SelectProps<MSelectOption>,
	| "children"
	| "className"
	| "defaultSelectedKey"
	| "selectedKey"
	| "onSelectionChange"
> &
	Pick<BasicInputProps, "status" | "name" | "disabled" | "value" | "defaultValue"> & {
		options: MSelectOption[];
		label?: ReactNode;
		description?: ReactNode;
		className?: string;
		justify?: "start" | "center" | "end" | "space-between";
		onValueChange?: (value: string) => void;
	};

const getTextValue = (value: ReactNode): string => {
	if (typeof value === "string" || typeof value === "number") {
		return String(value);
	}

	return "";
};

export const MSelect = ({
	options,
	defaultValue,
	value,
	name,
	disabled,
	className,
	status = "regular",
	onValueChange,
	...selectProps
}: SelectComponentProps) => {
	const selectedKey =
		typeof value === "string" || typeof value === "number"
			? String(value)
			: undefined;
	const defaultSelectedKey =
		typeof defaultValue === "string" || typeof defaultValue === "number"
			? String(defaultValue)
			: undefined;

	const handleSelectionChange = (key: Key | null) => {
		if (key !== null) {
			onValueChange?.(String(key));
		}
	};

	return (
		<Select
			name={name}
			isDisabled={disabled}
			selectedKey={selectedKey}
			defaultSelectedKey={defaultSelectedKey}
			onSelectionChange={handleSelectionChange}
			className={clsx(styles.select, styles[status], className)}
			{...selectProps}
		>
			<Button className={styles.selectButton}>
				<SelectValue<MSelectOption> className={styles.selectValue}>
					{({ selectedItem, selectedText, isPlaceholder }) =>
						isPlaceholder ? selectProps.placeholder : selectedItem?.value ?? selectedText
					}
				</SelectValue>
				<ChevronDownIcon width={20} />
			</Button>
			<Popover className={styles.popover}>
				<ListBox className={styles.listBox}>
					{options.map((option) => (
						<ListBoxItem
							key={option.key}
							id={option.key}
							textValue={getTextValue(option.value)}
							className={styles.option}
						>
							{option.before}
							{option.value}
							{option.after}
						</ListBoxItem>
					))}
				</ListBox>
			</Popover>
		</Select>
	);
};

export default MSelect;
