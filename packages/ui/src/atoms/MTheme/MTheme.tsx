"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

type ThemeProps = {
	theme: string;
	brand: string;
	platform: string;
};

export const MTheme = ({ theme, brand, platform }: ThemeProps) => {
	const elementRef = useRef<HTMLHtmlElement>(undefined);

	useLayoutEffect(() => {
		if (document) {
			elementRef.current = document.getElementsByTagName("html")[0];
		}
	});

	useEffect(() => {
		if (elementRef.current) {
			elementRef.current.dataset["theme"] = theme;
		}
	}, [theme]);

	useEffect(() => {
		if (elementRef.current) {
			elementRef.current.dataset["brand"] = brand;
		}
	}, [brand]);

	useEffect(() => {
		if (elementRef.current) {
			elementRef.current.dataset["platform"] = platform;
		}
	}, [platform]);

	return null;
};

export default MTheme;
