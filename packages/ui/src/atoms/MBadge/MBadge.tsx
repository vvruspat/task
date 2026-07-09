import clsx from "clsx";
import type { DetailedHTMLProps, HTMLAttributes, ReactNode } from "react";
import styles from "./MBadge.module.css";

type BadgeProps = DetailedHTMLProps<
	HTMLAttributes<HTMLDivElement>,
	HTMLDivElement
> & {
	mode: "primary" | "transparent" | "info" | "success" | "warning" | "error";
	before?: ReactNode;
};

export const MBadge = ({
	children,
	mode = "primary",
	...restProps
}: BadgeProps) => {
	return (
		<div className={clsx(styles.badge, styles[mode])} {...restProps}>
			{children}
		</div>
	);
};

export default MBadge;
