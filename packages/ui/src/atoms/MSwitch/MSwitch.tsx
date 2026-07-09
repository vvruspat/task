import clsx from "clsx";
import { type ReactNode, useId, useMemo } from "react";
import {
	Switch,
	type SwitchProps as AriaSwitchProps,
} from "react-aria-components";
import type { TComponentStatus } from "../../types/TComponentStatus";
import MFlex from "../MFlex/MFlex";
import styles from "./MSwitch.module.css";

type SwitchProps = Omit<
	AriaSwitchProps,
	"children" | "className" | "isDisabled" | "isSelected" | "defaultSelected"
> &
	Partial<TComponentStatus> & {
	leftIcon?: ReactNode;
	rightIcon?: ReactNode;
	borderType?: "round" | "rectangular";
	className?: string;
	checked?: boolean;
	defaultChecked?: boolean;
	disabled?: boolean;
	onCheckedChange?: (checked: boolean) => void;
};

export const MSwitch = ({
	disabled,
	id,
	name,
	leftIcon,
	rightIcon,
	className,
	borderType = "round",
	onCheckedChange,
	checked,
	defaultChecked,
	...restProps
}: SwitchProps) => {
	const uuid = useId();
	const fieldId = useMemo(() => id ?? uuid, [uuid, id]);

	return (
		<MFlex className={clsx(styles.switchWrapper, className)}>
			<Switch
				className={styles.switch}
				id={fieldId}
				name={name}
				isSelected={checked}
				defaultSelected={defaultChecked}
				isDisabled={disabled}
				onChange={onCheckedChange}
				{...restProps}
			>
				<span className={clsx(styles.slider, styles[borderType])}>
					<span className={clsx(styles.control)}>
						{leftIcon && (
							<span className={clsx(styles.customSwitchIconLeft)}>
								{leftIcon}
							</span>
						)}

						{rightIcon && (
							<span className={clsx(styles.customSwitchIconRight)}>
								{rightIcon}
							</span>
						)}
					</span>
				</span>
			</Switch>
		</MFlex>
	);
};

export default MSwitch;
