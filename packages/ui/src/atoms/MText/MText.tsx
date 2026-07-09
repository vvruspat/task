import clsx from "clsx";
import { type ComponentProps, createElement } from "react";
import type { TComponentSize } from "../../types/TComponentSize";
import styles from "./MText.module.css";

export type TextProps = ComponentProps<"span"> &
	Partial<TComponentSize> & {
		as?: "span" | "p" | "div";
		mode?: "primary" | "secondary" | "tertiary" | "inherit";
	};

export const MText = ({
	children,
	className,
	size = "inherit",
	as = "span",
	mode = "inherit",
	...restProps
}: TextProps) => {
	return createElement(
		as,
		{
			className: clsx(
				styles[`size-${size}`],
				styles[`mode-${mode}`],
				className,
			),
			...restProps,
		},
		children,
	);
};

export default MText;
