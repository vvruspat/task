import clsx from "clsx";
import { useCallback } from "react";
import { MCheckbox } from "../../atoms/MCheckbox";
import { MFlex } from "../../atoms/MFlex";
import styles from "./MDataGridRow.module.css";
import type {
	MDataGridCellValue,
	MDataGridHeaderType,
	MDataGridRowType,
} from "./types";

type MDataGridRowProps = {
	row: MDataGridRowType;
	rowLabel: string;
	headers: MDataGridHeaderType[];
	selected: boolean;
	onCheckboxChange?: (row: MDataGridRowType, checked: boolean) => void;
};

const renderDefaultCell = (cell: MDataGridCellValue | undefined) => {
	if (cell === undefined) {
		return "";
	}

	if (
		typeof cell === "string" ||
		typeof cell === "number" ||
		typeof cell === "boolean"
	) {
		return String(cell);
	}

	return Object.prototype.toString.call(cell);
};

export const MDataGridRow = ({
	row,
	rowLabel,
	headers,
	selected,
	onCheckboxChange,
}: MDataGridRowProps) => {
	const renderCellContent = useCallback(
		(header: MDataGridHeaderType, cell?: MDataGridCellValue) => {
			return cell !== undefined
				? (header.renderCell?.(cell, row) ?? renderDefaultCell(cell))
				: "";
		},
		[row],
	);

	const isSkeletonRow = "__skeleton" in row;

	return (
		<tr data-selected={selected || undefined}>
			{onCheckboxChange && (
				<td className={styles.selectionCell}>
					<MFlex
						align="center"
						justify="center"
						className={styles.checkboxCell}
					>
						{isSkeletonRow ? null : (
							<MCheckbox
								label={
									<span className={styles.visuallyHidden}>
										Select {rowLabel}
									</span>
								}
								checked={selected}
								onCheckedChange={(checked) => onCheckboxChange(row, checked)}
							/>
						)}
					</MFlex>
				</td>
			)}
			{headers.map((header, index) => {
				const key = `${header.key ?? "cell"}-${header.field}-${row.id}`;
				const className = clsx(styles.cell, {
					[styles.rowHeaderCell]: index === 0,
				});
				const content = renderCellContent(header, row[header.field]);

				if (index === 0) {
					return (
						<th key={key} scope="row" className={className}>
							{content}
						</th>
					);
				}

				return (
					<td key={key} className={className}>
						{content}
					</td>
				);
			})}
		</tr>
	);
};
