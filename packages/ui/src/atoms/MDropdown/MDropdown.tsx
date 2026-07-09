"use client";

import clsx from "clsx";
import {
	type DetailedHTMLProps,
	type HTMLAttributes,
	type ReactNode,
	useRef,
} from "react";
import { Dialog, Popover } from "react-aria-components";
import styles from "./MDropdown.module.css";
import "./MDropdown.vars.css";
import { MCard } from "../MCard";

export type MDropdownProps = DetailedHTMLProps<
	HTMLAttributes<HTMLDivElement>,
	HTMLDivElement
> & {
	open: boolean;
	onClose?: () => void;
	dropdownContent: ReactNode;
	position?: "top" | "bottom";
	align?: "left" | "right";
	stretch: boolean;
	noPadding?: boolean;
	dropdownContentClassName?: string;
};

const getPlacement = (
	position: NonNullable<MDropdownProps["position"]>,
	align: NonNullable<MDropdownProps["align"]>,
) => {
	const crossAxis = align === "left" ? "start" : "end";
	return `${position} ${crossAxis}` as const;
};

export const MDropdown = ({
	children,
	open,
	onClose = () => {},
	position = "bottom",
	align = "left",
	stretch = false,
	dropdownContent,
	className,
	noPadding = false,
	dropdownContentClassName,
	...props
}: MDropdownProps) => {
	const triggerRef = useRef<HTMLDivElement>(null);

	return (
		<div
			ref={triggerRef}
			className={clsx(styles.dropdownContainer, className)}
			{...props}
		>
			{children}

			<Popover
				isOpen={open}
				onOpenChange={(isOpen) => {
					if (!isOpen) {
						onClose();
					}
				}}
				placement={getPlacement(position, align)}
				triggerRef={triggerRef}
				className={clsx(styles.dropdown, styles[position], styles[align])}
			>
				<Dialog className={styles.dialog}>
					<MCard
						noPadding={noPadding}
						className={clsx(
							{ [styles.stretch]: stretch },
							dropdownContentClassName,
						)}
					>
						{dropdownContent}
					</MCard>
				</Dialog>
			</Popover>
		</div>
	);
};

export default MDropdown;
