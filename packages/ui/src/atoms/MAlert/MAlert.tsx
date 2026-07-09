import clsx from "clsx";
import type { ComponentProps } from "react";
import { MFlex } from "../../atoms/MFlex";
import styles from "./MAlert.module.css";

export type MAlertProps = ComponentProps<typeof MFlex> & {
	mode?: "error" | "warning" | "success" | "info";
};

export const MAlert = ({
	mode = "info",
	className,
	children,
	...restProps
}: MAlertProps) => {
	if (!mode) {
		return null;
	}

	const isUrgent = mode === "warning" || mode === "error";

	const tag = isUrgent ? "div" : "output";

	return (
		<MFlex
			as={tag}
			className={clsx(styles.alert, styles[`alert-mode-${mode}`], className)}
			role={isUrgent ? "alert" : undefined}
			aria-live={isUrgent ? "assertive" : "polite"}
			aria-atomic="true"
			{...restProps}
		>
			{children}
		</MFlex>
	);
};

export default MAlert;
