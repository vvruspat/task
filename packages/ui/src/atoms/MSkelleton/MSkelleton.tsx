import clsx from "clsx";
import type { ComponentProps } from "react";
import type { TComponentSize } from "../../types/TComponentSize";
import styles from "./MSkelleton.module.css";

export type MSkelletonProps = ComponentProps<"div"> & {
	minSize?: TComponentSize["size"];
};

export const MSkelleton = ({
	className,
	minSize = "inherit",
	children,
	...divProps
}: MSkelletonProps) => {
	return (
		<div
			className={clsx(styles.skelleton, styles[`size-${minSize}`], className)}
			{...divProps}
		>
			{children ?? <>&nbsp;</>}
		</div>
	);
};

export default MSkelleton;
