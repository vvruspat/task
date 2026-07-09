"use client";

import { XMarkIcon } from "@heroicons/react/24/outline";
import type { ChangeEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { BasicInputProps } from "../../types/BasicInputProps";

import { MButton } from "../MButton";

type ClearableProps = BasicInputProps & {
	clearable?: boolean;
};

export const useClearable = ({
	clearable,
	defaultValue,
	value,
	onChange,
	...resProps
}: ClearableProps) => {
	const inputRef = useRef<HTMLInputElement>(null);
	const [localValue, setLocalValue] = useState(defaultValue ?? "");

	useEffect(() => {
		setLocalValue(value ?? defaultValue ?? "");
	}, [defaultValue, value]);

	const onClear = useCallback(() => {
		const event = {
			target: { value: "" },
		} as ChangeEvent<HTMLInputElement>;

		if (inputRef.current) {
			inputRef.current.value = "";
		}

		setLocalValue("");
		onChange?.(event);
	}, [onChange]);

	const onLocalChange = useCallback(
		(event: ChangeEvent<HTMLInputElement>) => {
			setLocalValue(event.target.value);
			onChange?.(event);
		},
		[onChange],
	);

	const ClearButton = (
		<>
			{localValue && clearable && (
				<MButton mode="transparent" onClick={onClear} noPadding>
					<XMarkIcon width={16} />
				</MButton>
			)}
		</>
	);

	return {
		ClearButton,
		onChange: onLocalChange,
		value: localValue,
		defaultValue,
		ref: inputRef,
		...resProps,
	};
};

export default useClearable;
