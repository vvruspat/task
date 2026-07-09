import clsx from "clsx";
import {
	type ComponentProps,
	cloneElement,
	isValidElement,
	type ReactElement,
	type ReactNode,
	useId,
	useMemo,
} from "react";
import { usePlatform } from "../../hooks";
import type { BasicInputProps } from "../../types/BasicInputProps";
import type { TComponentSize } from "../../types/TComponentSize";
import type { TComponentStatus } from "../../types/TComponentStatus";
import { MFieldDescription } from "../MFieldDescription";
import { MLabel } from "../MLabel";
import { MRequired } from "../MRequired";
import styles from "./MFormField.module.css";

type MFormFieldProp = ComponentProps<"input"> &
	Partial<TComponentStatus> & {
		id?: string;
		required?: boolean;
		spacing?:
			| Extract<TComponentSize["size"], "s" | "m" | "l">
			| "auto"
			| "full";
		mobileSpacing?:
			| Extract<TComponentSize["size"], "s" | "m" | "l">
			| "auto"
			| "full";
		label: ReactElement<ComponentProps<typeof MLabel>> | string;
		description?: ReactNode | string;
		control: ReactElement<BasicInputProps>;
		direction?: "row" | "column";
		mobileDirection?: "row" | "column";
	};

export const MFormField = ({
	id,
	required = false,
	direction = "row",
	mobileDirection = "column",
	mobileSpacing = "full",
	spacing = "s",
	label,
	description,
	control,
	status,
	...inputProps
}: MFormFieldProp) => {
	const uuid = useId();
	const fieldId = useMemo(() => id ?? uuid, [uuid, id]);
	const platform = usePlatform();

	const descriptionId = description ? `${fieldId}-description` : undefined;
	const errorId = status === "invalid" ? `${fieldId}-error` : undefined;
	const ariaDescribedBy =
		[descriptionId, errorId].filter(Boolean).join(" ") || undefined;

	const controlElement = cloneElement<BasicInputProps>(control, {
		...inputProps,
		status,
		id: fieldId,
		required,
		"aria-describedby": ariaDescribedBy,
		...inputProps,
		"aria-invalid": status === "invalid",
		"aria-errormessage": status === "invalid" ? errorId : undefined,
	});

	const requiredComponent = useMemo(
		() => (required ? <MRequired aria-hidden="true" /> : null),
		[required],
	);

	const labelComponent = useMemo(() => {
		if (typeof label === "string") {
			return (
				<MLabel htmlFor={fieldId} after={requiredComponent} status={status}>
					{label}
				</MLabel>
			);
		}

		if (isValidElement(label)) {
			return cloneElement(label, {
				htmlFor: fieldId,
				after: requiredComponent,
				status,
			});
		}

		return null;
	}, [label, requiredComponent, status, fieldId]);

	const descriptionProps: ComponentProps<"div"> = useMemo(() => {
		if (status === "invalid") {
			return {
				id: errorId,
				role: "alert",
				"aria-live": "assertive",
			};
		}

		return {
			id: descriptionId,
		};
	}, [status, errorId, descriptionId]);

	return (
		<div
			className={clsx(
				styles.formField,
				styles[platform === "mobile" ? mobileDirection : direction],
				styles[`size-${platform === "mobile" ? mobileSpacing : spacing}`],
			)}
		>
			{labelComponent && <div className={styles.label}>{labelComponent}</div>}

			<div className={styles.control}>{controlElement}</div>

			{description && (
				<div {...descriptionProps} className={styles.description}>
					{typeof description === "string" ? (
						<MFieldDescription status={status}>{description}</MFieldDescription>
					) : (
						description
					)}
				</div>
			)}
		</div>
	);
};

export default MFormField;
