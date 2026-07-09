import clsx from "clsx";
import { type ComponentProps, Fragment, type ReactNode } from "react";
import styles from "./MDescriptionList.module.css";

type MDescriptionListProps = Omit<ComponentProps<"dl">, "children"> & {
	options: MDescriptionListItem[];
	size?: "s" | "m" | "l";
};

type MDescriptionListItem = {
	title: ReactNode;
	titleProps?: Omit<ComponentProps<"dt">, "children">;
	description: ReactNode;
	descriptionProps?: Omit<ComponentProps<"dd">, "children">;
};

export const MDescriptionList = ({
	options,
	size = "m",
	className,
	...dlProps
}: MDescriptionListProps) => {
	return (
		<dl
			{...dlProps}
			className={clsx(
				styles.descriptionList,
				styles[`size-${size}`],
				className,
			)}
		>
			{options.map((option, index) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: no id provided
				<Fragment key={index}>
					<dt {...option.titleProps}>{option.title}</dt>
					<dd {...option.descriptionProps}>{option.description}</dd>
				</Fragment>
			))}
		</dl>
	);
};

export default MDescriptionList;
