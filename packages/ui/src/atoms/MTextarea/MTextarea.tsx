"use client";

import clsx from "clsx";
import {
	type ComponentProps,
	type ReactNode,
	useCallback,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from "react";
import { TextArea } from "react-aria-components";
import MCaption from "../MCaption/MCaption";
import MFieldDescription from "../MFieldDescription/MFieldDescription";
import MFlex from "../MFlex/MFlex";
import MLabel from "../MLabel/MLabel";

import styles from "./MTextarea.module.css";
import type { BasicInputProps } from "../../types/BasicInputProps";

type TextareaProps = ComponentProps<"textarea"> &
	BasicInputProps & {
		id?: string;
		maxLength?: number;
		label?: ReactNode;
		caption?: ReactNode;
		counter?: boolean;
		description?: ReactNode;
		wrapperClassName?: string;
		containerClassName?: string;
		headerClassName?: string;
		textareaClassName?: string;
		descriptionClassName?: string;
	};

export const MTextarea = ({
	status = "regular",
	children,
	label,
	caption,
	counter,
	description,
	wrapperClassName,
	containerClassName,
	headerClassName,
	textareaClassName,
	descriptionClassName,
	maxLength = 200,
	value,
	id,
	rows = 3,
	...restProps
}: TextareaProps) => {
	const uuid = useId();
	const textareaId = useMemo(() => id ?? uuid, [uuid, id]);
	const [count, setCount] = useState(0);
	const charCounter = useRef<HTMLSpanElement>(null);
	const textarea = useRef<HTMLTextAreaElement>(null);

	const updateCount = useCallback(() => {
		if (textarea.current) {
			setCount(textarea.current.value.length);
		}
	}, []);

	useEffect(() => {
		updateCount();
	}, [updateCount]);

	return (
		<MFlex
			direction="column"
			align="start"
			className={clsx(styles.textareaWrapper, styles[status], wrapperClassName)}
		>
			{(label || caption) && (
				<div className={clsx(styles.textareaLabel)}>
					<MFlex justify="space-between">
						{label && (
							<MLabel htmlFor={textareaId} status={status}>
								{label}
							</MLabel>
						)}
						{caption && <MCaption status={status}>{caption}</MCaption>}
					</MFlex>
				</div>
			)}
			<MFlex
				className={clsx(
					styles.textareaContainer,
					counter && styles.hasCounter,
					containerClassName,
				)}
			>
				<TextArea
					ref={textarea}
					onInput={updateCount}
					id={textareaId}
					rows={rows}
					className={clsx(styles.textarea, textareaClassName)}
					maxLength={maxLength}
					{...restProps}
					value={value}
				/>
				{counter && (
					<span ref={charCounter} className={clsx(styles.counter)}>
						{count}/{maxLength}
					</span>
				)}
			</MFlex>
			{description && (
				<div className={clsx(descriptionClassName)}>
					<MFieldDescription status={status}>{description}</MFieldDescription>
				</div>
			)}
		</MFlex>
	);
};

export default MTextarea;
