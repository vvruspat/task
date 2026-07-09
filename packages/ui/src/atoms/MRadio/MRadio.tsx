import clsx from "clsx";
import { type ReactNode, useId, useMemo } from "react";
import MFieldDescription from "../MFieldDescription/MFieldDescription";
import MFlex from "../MFlex/MFlex";

import type { BasicInputProps } from "../../types/BasicInputProps";
import MLabel from "../MLabel/MLabel";
import styles from "./MRadio.module.css";

type RadioProps = BasicInputProps & {
	wrapperClassName?: string;
	containerClassName?: string;
	label?: ReactNode;
	description?: ReactNode;
	footerClassName?: string;
};

export const MRadio = ({
	status = "regular",
	children,
	className,
	wrapperClassName,
	containerClassName,
	id,
	label,
	description,
	footerClassName,
	...restProps
}: RadioProps) => {
	const uuid = useId();
	const fieldId = useMemo(() => id ?? uuid, [uuid, id]);

	return (
		<MFlex direction="column" align="start">
			<MLabel
				className={clsx(
					styles.inputContainer,
					styles[status],
					containerClassName,
				)}
			>
				<MFlex align="start">
					<input
						type="radio"
						id={fieldId}
						className={clsx(styles[status], className)}
						{...restProps}
					/>
					<MFlex direction="column" align="start">
						{label}
						<div className={footerClassName}>
							{description && (
								<MFieldDescription status={status}>
									{description}
								</MFieldDescription>
							)}
						</div>
					</MFlex>
				</MFlex>
			</MLabel>
		</MFlex>
	);
};

export default MRadio;
