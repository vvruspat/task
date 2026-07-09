"use client";

import { useMediaQuery } from "./useMediaQuery";

export const usePlatform = () => {
	const isMobile = useMediaQuery("(max-width: 768px)");
	const isTablet = useMediaQuery("(min-width: 769px) and (max-width: 1024px)");
	const isDesktop = useMediaQuery("(min-width: 1025px)");

	return isMobile
		? "mobile"
		: isTablet
			? "tablet"
			: isDesktop
				? "desktop"
				: "server";
};

export default usePlatform;
