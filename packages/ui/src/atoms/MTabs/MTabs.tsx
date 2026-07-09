"use client";

import { type FC, useState } from "react";
import {
	Tab,
	TabList,
	TabPanel,
	TabPanels,
	Tabs,
} from "react-aria-components";
import MFlex from "../MFlex/MFlex";
import type { MTabProps } from "../MTab/MTab";
import styles from "./MTabs.module.css";

interface MTabsProps {
	items?: MTabProps[];
	defaultActiveKey: string;
}

export const MTabs: FC<MTabsProps> = ({
	items = [],
	defaultActiveKey,
	...restProps
}) => {
	const [activeKey, setActiveKey] = useState(defaultActiveKey);

	const handleTabClick = (key: string) => {
		setActiveKey(key);
	};

	return (
		<Tabs
			selectedKey={activeKey}
			onSelectionChange={(key) => setActiveKey(String(key))}
			disabledKeys={items
				.filter((item) => item.disabled)
				.map((item) => item.key)}
			className={styles.tabs}
		>
			<TabList className={styles.tabHeaders}>
				{items.map((item) => (
					<Tab
						key={item.key}
						id={item.key}
						isDisabled={item.disabled}
						className={styles.tab}
						onPress={() => handleTabClick(item.key)}
						{...restProps}
					>
						{item.before && <span>{item.before}</span>}
						{item.label}
						{item.after && <span>{item.after}</span>}
					</Tab>
				))}
			</TabList>

			<TabPanels>
				{items.map((item) => (
					<TabPanel key={item.key} id={item.key} className={styles.tabContent}>
						<MFlex>{item.content}</MFlex>
					</TabPanel>
				))}
			</TabPanels>
		</Tabs>
	);
};

export default MTabs;
