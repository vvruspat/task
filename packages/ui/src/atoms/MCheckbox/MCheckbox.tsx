"use client";

import { CheckIcon } from "@heroicons/react/24/solid";
import clsx from "clsx";
import { type ReactNode, useId, useMemo } from "react";
import {
	Checkbox,
	type CheckboxProps as AriaCheckboxProps,
} from "react-aria-components";
import type { TComponentStatus } from "../../types/TComponentStatus";
import MFieldDescription from "../MFieldDescription/MFieldDescription";
import MFlex from "../MFlex/MFlex";

import styles from "./MCheckbox.module.css";

type CheckboxProps = Omit<
	AriaCheckboxProps,
	"children" | "className" | "isDisabled" | "isSelected" | "defaultSelected"
> &
	Partial<TComponentStatus> & {
	label: ReactNode;
	description?: ReactNode;
	wrapperClassName?: string;
	footerClassName?: string;
	icon?: ReactNode;
	className?: string;
	checked?: boolean;
	defaultChecked?: boolean;
	disabled?: boolean;
	onCheckedChange?: (checked: boolean) => void;
};

export const MCheckbox = ({
	id,
	name,
	status = "regular",
	label,
	disabled = false,
	description,
	wrapperClassName,
	footerClassName,
	icon,
	className,
	onCheckedChange,
	checked,
	defaultChecked,
	...restProps
}: CheckboxProps) => {
	const uuid = useId();
	const fieldId = useMemo(() => id ?? uuid, [uuid, id]);

	return (
		<MFlex
			direction="column"
			align="start"
			className={clsx(styles.checkboxWrapper, styles[status], wrapperClassName)}
		>
			<MFlex className={clsx(styles.checkboxContainer)}>
				<Checkbox
					id={fieldId}
					name={name}
					isSelected={checked}
					defaultSelected={defaultChecked}
					isDisabled={disabled}
					className={clsx(styles.Checkbox, className)}
					onChange={onCheckedChange}
					{...restProps}
				>
					<span className={clsx(styles.customCheckboxBox)}>
						<span className={clsx(styles.customCheckboxIcon)}>
							{icon ? icon : <CheckIcon width={10} />}
						</span>
					</span>
					<span>{label}</span>
				</Checkbox>
			</MFlex>
			<div className={footerClassName}>
				{description && (
					<MFieldDescription status={status}>{description}</MFieldDescription>
				)}
			</div>
		</MFlex>
	);
};

export default MCheckbox;
