import type { ComponentProps } from "react";
import type { TComponentStatus } from "./TComponentStatus";

export type BasicInputProps = ComponentProps<"input"> &
	Partial<TComponentStatus>;
