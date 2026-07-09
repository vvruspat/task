import clsx from "clsx";
import type { ComponentProps } from "react";
import { MFlex } from "../../atoms/MFlex";
import styles from "./MButton.module.css";
import type { CommonButtonProps } from "./types";

type ButtonProps = ComponentProps<"button"> & CommonButtonProps;

export const MButton = ({
	children,
	className,
	type = "button",
	mode = "primary",
	justify = "center",
	stretch = false,
	size = "m",
	after,
	before,
	noPadding = false,
	...restProps
}: ButtonProps) => {
	return (
		<button
			className={clsx(
				styles.button,
				styles[mode],
				{
					[styles.stretch]: stretch,
					[styles.noPadding]: noPadding,
				},
				styles[size],
				className,
			)}
			type={type}
			{...restProps}
		>
			<MFlex
				justify={justify}
				wrap="nowrap"
				className={clsx(styles.buttonContentWrapper)}
			>
				{before && <span className={styles.before}>{before}</span>}
				<span className={styles.buttonContent}>{children}</span>
				{after && <span className={styles.after}>{after}</span>}
			</MFlex>
		</button>
	);
};

export default MButton;
