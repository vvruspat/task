import type { ReactNode } from "react";
import type { TComponentSize } from "../../types/TComponentSize";

export type CommonButtonProps = {
	mode?:
		| "primary"
		| "secondary"
		| "tertiary"
		| "round"
		| "outlined"
		| "transparent";
	after?: ReactNode;
	before?: ReactNode;
	stretch?: boolean;
	justify?: "center" | "end" | "start" | "space-between";
	size?: Extract<TComponentSize["size"], "l" | "m" | "s">;
	noPadding?: boolean;
};
