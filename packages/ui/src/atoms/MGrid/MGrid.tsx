import clsx from "clsx";
import type {
	ComponentPropsWithRef,
	CSSProperties,
	ElementType,
	ReactNode,
} from "react";
import styles from "./MGrid.module.css";

export type MGridProps<T extends ElementType = "div"> = {
	tag?: T;
	display?: "grid" | "inline-grid";
	columnTemplate?: string;
	rowTemplate?: string;
	rowGap?: "xs" | "s" | "m" | "l" | "xl" | "2xl" | "3xl" | "4xl" | "none";
	columnGap?: "xs" | "s" | "m" | "l" | "xl" | "2xl" | "3xl" | "4xl" | "none";
	alignItems?: "start" | "center" | "end" | "stretch";
	justifyItems?:
		| "start"
		| "center"
		| "end"
		| "space-between"
		| "space-around"
		| "stretch";
	className?: string;
	style?: CSSProperties;
	children?: ReactNode;
} & Omit<
	ComponentPropsWithRef<T>,
	| "tag"
	| "display"
	| "columnTemplate"
	| "rowTemplate"
	| "rowGap"
	| "columnGap"
	| "alignItems"
	| "justifyItems"
	| "className"
	| "style"
	| "children"
>;

export const MGrid = <T extends ElementType = "div">({
	children,
	className,
	tag,
	style = {},
	display = "grid",
	rowTemplate,
	columnTemplate = "max-content max-content",
	rowGap = "s",
	columnGap = "m",
	alignItems,
	justifyItems,
	...restProps
}: MGridProps<T>) => {
	const Element = tag ?? "div";
	return (
		<Element
			className={clsx(
				styles.grid,
				styles[`grid-row-gap-${rowGap}`],
				styles[`grid-col-gap-${columnGap}`],
				className,
			)}
			style={
				{
					// Props set PRIVATE defaults only (--_grid-*); the public seam
					// (--grid-*) stays free for brand/zone/instance overrides via CSS.
					"--_grid-display": display,
					"--_grid-row-template": rowTemplate ?? "none",
					"--_grid-column-template": columnTemplate,
					"--_grid-justify-items": justifyItems ?? "stretch",
					"--_grid-align-items": alignItems ?? "stretch",
					...style,
				} as CSSProperties
			}
			{...restProps}
		>
			{children}
		</Element>
	);
};

export default MGrid;
