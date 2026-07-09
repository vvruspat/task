import clsx from "clsx";
import type {
	ComponentPropsWithRef,
	CSSProperties,
	ElementType,
	ReactNode,
} from "react";
import styles from "./MBox.module.css";

export type MBoxSpace =
	| "none"
	| "xs"
	| "s"
	| "m"
	| "l"
	| "xl"
	| "2xl"
	| "3xl"
	| "4xl";

const SPACE_VAR: Record<MBoxSpace, string> = {
	none: "0",
	xs: "var(--space-2)",
	s: "var(--space-4)",
	m: "var(--space-6)",
	l: "var(--space-8)",
	xl: "var(--space-10)",
	"2xl": "var(--space-12)",
	"3xl": "var(--space-14)",
	"4xl": "var(--space-16)",
};

type LonghandProperty =
	| "paddingTop"
	| "paddingRight"
	| "paddingBottom"
	| "paddingLeft"
	| "marginTop"
	| "marginRight"
	| "marginBottom"
	| "marginLeft";

export type MBoxProps<T extends ElementType = "div"> = {
	as?: T;
	padding?: MBoxSpace;
	paddingTop?: MBoxSpace;
	paddingRight?: MBoxSpace;
	paddingBottom?: MBoxSpace;
	paddingLeft?: MBoxSpace;
	paddingX?: MBoxSpace;
	paddingY?: MBoxSpace;
	margin?: MBoxSpace;
	marginTop?: MBoxSpace;
	marginRight?: MBoxSpace;
	marginBottom?: MBoxSpace;
	marginLeft?: MBoxSpace;
	marginX?: MBoxSpace;
	marginY?: MBoxSpace;
	className?: string;
	style?: CSSProperties;
	children?: ReactNode;
} & Omit<
	ComponentPropsWithRef<T>,
	| "as"
	| "padding"
	| "paddingTop"
	| "paddingRight"
	| "paddingBottom"
	| "paddingLeft"
	| "paddingX"
	| "paddingY"
	| "margin"
	| "marginTop"
	| "marginRight"
	| "marginBottom"
	| "marginLeft"
	| "marginX"
	| "marginY"
	| "className"
	| "style"
	| "children"
>;

// Each side is always resolved to its own longhand CSS property (side
// override > axis override > shorthand) instead of ever emitting the
// `padding`/`margin` shorthand. Mixing a shorthand with a longhand
// override in the same style object is unreliable to serialize, so every
// side is computed independently up front.
const resolveSpacing = (
	props: Pick<
		MBoxProps,
		| "padding"
		| "paddingTop"
		| "paddingRight"
		| "paddingBottom"
		| "paddingLeft"
		| "paddingX"
		| "paddingY"
		| "margin"
		| "marginTop"
		| "marginRight"
		| "marginBottom"
		| "marginLeft"
		| "marginX"
		| "marginY"
	>,
): CSSProperties => {
	const style: CSSProperties = {};

	const set = (property: LonghandProperty, token?: MBoxSpace) => {
		if (token) {
			style[property] = SPACE_VAR[token];
		}
	};

	set("paddingTop", props.paddingTop ?? props.paddingY ?? props.padding);
	set("paddingRight", props.paddingRight ?? props.paddingX ?? props.padding);
	set(
		"paddingBottom",
		props.paddingBottom ?? props.paddingY ?? props.padding,
	);
	set("paddingLeft", props.paddingLeft ?? props.paddingX ?? props.padding);
	set("marginTop", props.marginTop ?? props.marginY ?? props.margin);
	set("marginRight", props.marginRight ?? props.marginX ?? props.margin);
	set("marginBottom", props.marginBottom ?? props.marginY ?? props.margin);
	set("marginLeft", props.marginLeft ?? props.marginX ?? props.margin);

	return style;
};

export const MBox = <T extends ElementType = "div">({
	as,
	children,
	className,
	style,
	padding,
	paddingTop,
	paddingRight,
	paddingBottom,
	paddingLeft,
	paddingX,
	paddingY,
	margin,
	marginTop,
	marginRight,
	marginBottom,
	marginLeft,
	marginX,
	marginY,
	...restProps
}: MBoxProps<T>) => {
	const Element = as ?? "div";

	return (
		<Element
			className={clsx(styles.box, className)}
			style={{
				...resolveSpacing({
					padding,
					paddingTop,
					paddingRight,
					paddingBottom,
					paddingLeft,
					paddingX,
					paddingY,
					margin,
					marginTop,
					marginRight,
					marginBottom,
					marginLeft,
					marginX,
					marginY,
				}),
				...style,
			}}
			{...restProps}
		>
			{children}
		</Element>
	);
};

export default MBox;
