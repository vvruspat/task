import clsx from "clsx";
import type { ComponentProps, ReactNode } from "react";
import MText from "../MText/MText";
import type { TComponentStatus } from "../../types/TComponentStatus";
import { MFlex } from "../MFlex";
import styles from "./MLabel.module.css";

type LabelProps = ComponentProps<"label"> &
	Partial<TComponentStatus> & {
		after?: ReactNode;
		before?: ReactNode;
	};

export const MLabel = ({
	children,
	className,
	before,
	after,
	status = "regular",
	...restProps
}: LabelProps) => {
	return (
		<label
			htmlFor={restProps.htmlFor}
			className={clsx(styles.label, styles[status], className)}
			{...restProps}
		>
			<MFlex direction="row" gap="xs" align="start" justify="start">
				{before}
				<MText as="div" size="l">
					{children}
				</MText>
				{after}
			</MFlex>
		</label>
	);
};

export default MLabel;
