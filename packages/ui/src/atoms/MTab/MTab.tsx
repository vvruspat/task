import clsx from "clsx";
import type { FC, ReactNode } from "react";
import styles from "./MTab.module.css";

export interface MTabProps {
	key: string;
	label: string;
	active?: boolean;
	onClick?: () => void;
	content?: ReactNode;
	disabled?: boolean;
	before?: ReactNode;
	after?: ReactNode;
}

export const MTab: FC<MTabProps> = ({
	label,
	active,
	onClick,
	disabled,
	before,
	after,
}) => {
	return (
		<button
			type="button"
			aria-selected={active}
			aria-disabled={disabled}
			role="tab"
			tabIndex={disabled ? -1 : 0}
			className={clsx(styles.tab, {
				[styles.activeTab]: active,
				[styles.disabledTab]: disabled,
			})}
			onClick={() => !disabled && onClick && onClick()}
		>
			{before && <span>{before}</span>}
			{label}
			{after && <span>{after}</span>}
		</button>
	);
};

export default MTab;
