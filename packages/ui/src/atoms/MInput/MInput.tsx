"use client";
import clsx from "clsx";
import type { ReactNode } from "react";
import { Input } from "react-aria-components";
import MFlex from "../MFlex/MFlex";

import type { BasicInputProps } from "../../types/BasicInputProps";
import type { TComponentSize } from "../../types/TComponentSize";

import styles from "./MInput.module.css";
import { useClearable } from "./useClearable";

export type InputProps = BasicInputProps & {
	after?: ReactNode;
	before?: ReactNode;
	wrapperClassName?: string;
	containerClassName?: string;
	headingClassName?: string;
	footerClassName?: string;
	inputWidth?: Extract<TComponentSize["size"], "s" | "m" | "l"> | "auto";
};

export const MInput = ({
	status = "regular",
	children,
	className,
	wrapperClassName,
	containerClassName,
	after,
	before,
	id,
	inputWidth = "auto",
	headingClassName,
	footerClassName,
	onClick,
	...restProps
}: InputProps) => {
	const { ClearButton, ...restClearableProps } = useClearable({
		...restProps,
	});

	return (
		<MFlex
			direction="column"
			align="start"
			className={clsx(styles.inputWrapper, styles[status], wrapperClassName)}
			onClick={onClick}
		>
			<MFlex
				className={clsx(
					styles.inputContainer,
					styles[`size-${inputWidth}`],
					containerClassName,
				)}
				justify={inputWidth === "auto" ? "stretch" : "start"}
				direction="row"
				wrap="nowrap"
			>
				{before && <MFlex align="center">{before}</MFlex>}
				<MFlex justify="stretch" direction="row" className={styles.inputField}>
					<Input
						className={clsx(styles.input, className)}
						{...restClearableProps}
					/>
				</MFlex>
				{after && <MFlex align="center">{after}</MFlex>}
				{ClearButton}
			</MFlex>
		</MFlex>
	);
};

export default MInput;
