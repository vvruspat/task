import clsx from "clsx";
import type {
	ComponentProps,
	DetailedHTMLProps,
	HTMLAttributes,
	ReactNode,
} from "react";
import styles from "./MListItem.module.css";
import { MFlex } from "../MFlex";

export type ListItemProps = DetailedHTMLProps<
	HTMLAttributes<HTMLLIElement>,
	HTMLLIElement
> & {
	showDivider?: boolean;
	noPadding?: boolean;
	onAction?: () => void;
	after?: ReactNode;
	before?: ReactNode;
} & Pick<
		ComponentProps<typeof MFlex>,
		"direction" | "align" | "justify" | "wrap" | "gap"
	>;
export const MListItem = ({
	children,
	className,
	showDivider,
	noPadding = false,
	onAction,
	after,
	before,
	direction = "row",
	align = "center",
	justify = "start",
	wrap = "nowrap",
	gap = "m",
	...props
}: ListItemProps) => {
	const content = (
		<MFlex
			direction={direction}
			align={align}
			justify={justify}
			wrap={wrap}
			gap={gap}
			className={styles.itemContent}
		>
			{before && <div>{before}</div>}
			{children}
			{after && <div>{after}</div>}
		</MFlex>
	);

	return (
		<li
			className={clsx(styles.item, className, {
				[styles.itemBorder]: showDivider,
				[styles.noPadding]: noPadding,
			})}
			{...props}
		>
			{onAction ? (
				<button type="button" className={styles.itemButton} onClick={onAction}>
					{content}
				</button>
			) : (
				content
			)}
		</li>
	);
};

export default MListItem;
