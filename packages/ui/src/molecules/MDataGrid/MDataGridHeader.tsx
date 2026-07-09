import { ChevronDownIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { MButton } from "../../atoms/MButton";
import { MFlex } from "../../atoms/MFlex";
import { MText } from "../../atoms/MText";
import styles from "./MDataGridHeader.module.css";
import type { MDataGridHeaderType, MDataGridSortDirection } from "./types";

type MDataGridHeaderProps = MDataGridHeaderType & {
	sortDirection?: MDataGridSortDirection;
	filterValue: string;
	onSort: () => void;
	onFilter: (filterValue: string, field: string) => void;
};

const getHeaderLabel = (label: MDataGridHeaderType["label"], field: string) => {
	if (typeof label === "string" || typeof label === "number") {
		return String(label);
	}

	return field;
};

export const MDataGridHeader = ({
	field,
	label,
	sortable,
	editable: _editable,
	sortDirection,
	filterValue,
	onFilter,
	renderFilter,
	renderCell: _renderCell,
	onSort,
	className,
	...thProps
}: MDataGridHeaderProps) => {
	const headerLabel = getHeaderLabel(label, field);
	const nextSortDirection =
		sortDirection === "asc" ? "descending" : "ascending";

	return (
		<th
			{...thProps}
			scope="col"
			className={clsx(styles.headerCell, className)}
			aria-sort={
				sortDirection
					? sortDirection === "asc"
						? "ascending"
						: "descending"
					: undefined
			}
		>
			<MFlex
				direction="column"
				justify="start"
				align="stretch"
				className={styles.headerContent}
			>
				{sortable ? (
					<MButton
						mode="transparent"
						size="s"
						onClick={onSort}
						className={styles.sortButton}
						stretch
						justify="space-between"
						aria-label={`Sort ${headerLabel} ${nextSortDirection}`}
						after={
							<ChevronDownIcon
								width={16}
								aria-hidden="true"
								className={clsx(
									styles.sort,
									sortDirection && styles[`sort-${sortDirection}`],
									{
										[styles.sorting]: Boolean(sortDirection),
									},
								)}
							/>
						}
					>
						<span className={styles.headerTitle}>{label}</span>
					</MButton>
				) : (
					<MText as="span" className={styles.headerTitle}>
						{label}
					</MText>
				)}
				{renderFilter && (
					<div className={styles.filterWrapper}>
						{renderFilter({
							value: filterValue,
							"aria-label": `Filter ${headerLabel}`,
							onChange: (event) => onFilter(event.target.value, field),
						})}
					</div>
				)}
			</MFlex>
		</th>
	);
};
