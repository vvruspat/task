import clsx from "clsx";
import type { ComponentProps } from "react";
import { MFlex } from "../../atoms/MFlex";
import styles from "./MButton.module.css";
import type { CommonButtonProps } from "./types";

type LinkButtonProps = ComponentProps<"a"> &
	CommonButtonProps & {
		disabled?: boolean;
	};

export const MLinkButton = ({
	children,
	className,
	mode = "primary",
	justify = "center",
	stretch = false,
	size = "m",
	disabled,
	after,
	before,
	noPadding = false,
	...restProps
}: LinkButtonProps) => {
	return (
		<a
			aria-disabled={disabled}
			tabIndex={disabled ? -1 : 0}
			className={clsx(
				styles.button,
				styles.linkButton,
				styles[mode],
				{
					[styles.stretch]: stretch,
					[styles.disabled]: disabled,
					[styles.noPadding]: noPadding,
				},
				styles[size],
				className,
			)}
			{...restProps}
		>
			<MFlex justify={justify} className={clsx(styles.buttonContentWrapper)}>
				{before && <span className={styles.before}>{before}</span>}
				<span className={styles.buttonContent}>{children}</span>
				{after && <span className={styles.after}>{after}</span>}
			</MFlex>
		</a>
	);
};

export default MLinkButton;
