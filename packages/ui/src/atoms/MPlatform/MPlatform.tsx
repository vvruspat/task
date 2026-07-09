"use client";

import type { PropsWithChildren } from "react";
import usePlatform from "../../hooks/usePlatform";
import type { PlatformType } from "../../types";

type MPlatformProps = PropsWithChildren<{
	platform?: PlatformType | "mobile-and-tablet" | "desktop-and-tablet";
}>;

export const MPlatform = ({
	children,
	platform = "desktop",
}: MPlatformProps) => {
	const currentPlatform = usePlatform();

	if (
		platform === currentPlatform ||
		(platform === "mobile-and-tablet" &&
			currentPlatform !== "desktop" &&
			currentPlatform !== "server") ||
		(platform === "desktop-and-tablet" &&
			currentPlatform !== "mobile" &&
			currentPlatform !== "server")
	) {
		return <>{children}</>;
	}

	return null;
};
