"use client";

import { ChevronDownIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { type ReactNode, useMemo } from "react";
import {
	Button,
	Disclosure,
	DisclosureGroup,
	DisclosurePanel,
	Heading,
	type Key,
} from "react-aria-components";
import MCard from "../../atoms/MCard/MCard";
import MFlex from "../../atoms/MFlex/MFlex";
import style from "./MAccordion.module.css";

export type AccordionItemProps = {
	key: Key;
	title: ReactNode;
	children: ReactNode;
	collapsed?: boolean;
	disabled?: boolean;
};

export type AccordionProps = {
	items: AccordionItemProps[];
	iconOpen?: ReactNode;
	iconClosed?: ReactNode;
	allowsMultipleExpanded?: boolean;
	defaultExpandedKeys?: Iterable<Key>;
	expandedKeys?: Iterable<Key>;
	onExpandedChange?: (keys: Set<Key>) => void;
	isDisabled?: boolean;
	headingLevel?: number;
	className?: string;
};

const getInitialExpandedKeys = (
	items: AccordionItemProps[],
	allowsMultipleExpanded: boolean,
) => {
	const expandedItems = items
		.filter((item) => item.collapsed === false)
		.map((item) => item.key);

	if (allowsMultipleExpanded) {
		return expandedItems;
	}

	return expandedItems.slice(0, 1);
};

export const MAccordion = ({
	items,
	iconOpen,
	iconClosed,
	allowsMultipleExpanded = false,
	defaultExpandedKeys,
	expandedKeys,
	onExpandedChange,
	isDisabled,
	headingLevel = 3,
	className,
}: AccordionProps) => {
	const initialExpandedKeys = useMemo(
		() => getInitialExpandedKeys(items, allowsMultipleExpanded),
		[allowsMultipleExpanded, items],
	);
	const openIcon = iconOpen ?? <ChevronDownIcon width={20} />;
	const closedIcon = iconClosed ?? <ChevronRightIcon width={20} />;
	const resolvedDefaultExpandedKeys =
		expandedKeys === undefined ? defaultExpandedKeys ?? initialExpandedKeys : undefined;

	return (
		<MCard noPadding className={clsx(style.container, className)}>
			<DisclosureGroup
				allowsMultipleExpanded={allowsMultipleExpanded}
				defaultExpandedKeys={resolvedDefaultExpandedKeys}
				expandedKeys={expandedKeys}
				onExpandedChange={onExpandedChange}
				isDisabled={isDisabled}
				className={style.group}
			>
				{items.map((item) => (
					<Disclosure
						key={item.key}
						id={item.key}
						isDisabled={item.disabled}
						className={style.item}
					>
						{({ isExpanded }) => (
							<>
								<Heading level={headingLevel} className={style.itemHeading}>
									<Button slot="trigger" className={style.itemHeader}>
										<MFlex
											align="center"
											justify="space-between"
											wrap="nowrap"
											className={style.headerContent}
										>
											<span className={style.title}>{item.title}</span>
											<span className={style.icon} aria-hidden="true">
												{isExpanded ? openIcon : closedIcon}
											</span>
										</MFlex>
									</Button>
								</Heading>
								<DisclosurePanel
									className={style.itemPanel}
									role="region"
									inert={!isExpanded}
								>
									<div className={style.itemPanelContent}>{item.children}</div>
								</DisclosurePanel>
							</>
						)}
					</Disclosure>
				))}
			</DisclosureGroup>
		</MCard>
	);
};

export default MAccordion;
