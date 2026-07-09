"use client";

import { MoonIcon, SunIcon } from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import { MSelect, type MSelectOption } from "../MSelect";
import styles from "./MThemeSelector.module.css";

type MThemeSelectorProps = {
	onSelectedTheme?: (theme: string) => void;
	defaultTheme?: string;
};

const themeOptions: MSelectOption[] = [
	{
		key: "light",
		value: "Light",
	},
	{
		key: "dark",
		value: "Dark",
	},
];

export const MThemeSelector = ({
	onSelectedTheme,
	defaultTheme = "light",
}: MThemeSelectorProps) => {
	const [selectedTheme, setSelectedTheme] = useState(defaultTheme);

	useEffect(() => {
		const element = document.getElementsByTagName("html")[0];

		if (element) {
			element.dataset["theme"] = selectedTheme;
		}
	}, [selectedTheme]);

	const onThemeChoose = (theme: string) => {
		setSelectedTheme(theme);
		onSelectedTheme?.(theme);
	};

	return (
		<MSelect
			aria-label="Select theme"
			className={styles.themeSelector}
			defaultValue={defaultTheme}
			options={themeOptions.map((option) => ({
				...option,
				before:
					option.key === "light" ? (
						<SunIcon width={24} />
					) : (
						<MoonIcon width={24} />
					),
			}))}
			onValueChange={onThemeChoose}
		/>
	);
};

export default MThemeSelector;
