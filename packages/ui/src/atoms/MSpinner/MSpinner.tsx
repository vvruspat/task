import type { ComponentProps } from "react";
import clsx from "clsx";
import type { TComponentSize } from "../../types/TComponentSize";
import styles from "./MSpinner.module.css";

type SpinnerProps = ComponentProps<"span"> & {
	size?: Exclude<TComponentSize["size"], "inherit">;
	mode?: "base" | "primary" | "secondary" | "tertiary";
};

export const MSpinner = ({
	size = "xl",
	mode = "primary",
	...props
}: SpinnerProps) => {
	return (
		<span
			className={clsx(
				styles.spinner,
				styles[`spinner-size-${size}`],
				styles[`spinner-mode-${mode}`],
			)}
			{...props}
		/>
	);
};

export default MSpinner;
