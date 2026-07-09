import type { ReactNode } from "react";
import { ListBox, ListBoxItem } from "react-aria-components";
import clsx from "clsx";
import { MFlex } from "../MFlex";
import MListItem, { type ListItemProps } from "../MListItem/MListItem";
import itemStyles from "../MListItem/MListItem.module.css";
import styles from "./MList.module.css";

export type SelectOption = ListItemProps & {
	key: string;
	value?: ReactNode;
};

type ListComponentProps = {
	options?: SelectOption[];
	showDivider?: boolean;
	noPadding?: boolean;
	onChoose?: (option: SelectOption) => void;
	"aria-label"?: string;
};
export const MList = ({
	options = [],
	showDivider = false,
	onChoose,
	noPadding = false,
	"aria-label": ariaLabel = "List",
}: ListComponentProps) => {
	const hasActions = Boolean(onChoose) || options.some((option) => option.onAction);

	if (hasActions) {
		return (
			<ListBox aria-label={ariaLabel} className={styles.listItems}>
				{options.map(({ key, ...option }) => {
					const {
						after,
						before,
						children,
						className,
						direction = "row",
						align = "center",
						justify = "start",
						wrap = "nowrap",
						gap = "m",
						onAction,
						value,
					} = option;
					const isActionable = Boolean(onChoose) || Boolean(onAction);

					return (
						<ListBoxItem
							id={key}
							key={key}
							isDisabled={!isActionable}
							textValue={
								typeof value === "string" || typeof value === "number"
									? String(value)
									: undefined
							}
							className={clsx(itemStyles.item, className, {
								[itemStyles.itemBorder]: showDivider,
								[itemStyles.noPadding]: noPadding,
							})}
							onAction={
								isActionable
									? () => {
											onAction?.();
											onChoose?.({ key, ...option });
										}
									: undefined
							}
						>
							<MFlex
								direction={direction}
								align={align}
								justify={justify}
								wrap={wrap}
								gap={gap}
							>
								{before && <div>{before}</div>}
								{value}
								{children}
								{after && <div>{after}</div>}
							</MFlex>
						</ListBoxItem>
					);
				})}
			</ListBox>
		);
	}

	return (
		<ul className={styles.listItems}>
			{options.map(({ key, ...option }) => (
				<MListItem
					noPadding={noPadding}
					key={key}
					onAction={
						onChoose ? () => onChoose({ key, ...option }) : undefined
					}
					{...option}
					showDivider={showDivider}
				>
					{option.value}
					{option.children}
				</MListItem>
			))}
		</ul>
	);
};

export default MList;
