import clsx from "clsx";
import type { TComponentStatus } from "../../types/TComponentStatus";
import MText, { type TextProps } from "../MText/MText";
import styles from "./MFieldDescription.module.css";

type MFieldDescriptionProps = Omit<TextProps, "size"> &
	Partial<TComponentStatus>;

export const MFieldDescription = ({
	children,
	className,
	status = "regular",
	...restProps
}: MFieldDescriptionProps) => {
	return (
		<MText
			as="div"
			className={clsx(styles.fieldDescription, styles[status], className)}
			size="m"
			{...restProps}
		>
			{children}
		</MText>
	);
};

export default MFieldDescription;
