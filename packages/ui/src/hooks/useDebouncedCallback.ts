"use client";

import { useEffect, useRef } from "react";

export const useDebouncedCallback = (
	callback: (...args: unknown[]) => void,
	delay: number,
) => {
	const timerRef = useRef<number>(null);

	useEffect(() => {
		return () => {
			if (timerRef.current) {
				clearTimeout(timerRef.current);
			}
		};
	}, []);

	return (...args: unknown[]) => {
		if (timerRef.current) {
			clearTimeout(timerRef.current);
		}

		timerRef.current = window.setTimeout(() => {
			callback(...args);
			timerRef.current = null;
		}, delay);
	};
};

export default useDebouncedCallback;
