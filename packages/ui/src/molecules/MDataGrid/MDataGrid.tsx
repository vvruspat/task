"use client";

import clsx from "clsx";
import type { ComponentProps, ReactNode } from "react";
import { useCallback, useMemo, useState } from "react";
import { MCheckbox } from "../../atoms";
import styles from "./MDataGrid.module.css";
import { MDataGridHeader } from "./MDataGridHeader";
import { MDataGridPagination } from "./MDataGridPagination";
import { MDataGridRow } from "./MDataGridRow";
import type {
	MDataGridCellValue,
	MDataGridHeaderType,
	MDataGridPaginationConfig,
	MDataGridRowType,
	MDataGridSortDirection,
} from "./types";

type SortConfig = {
	field: string;
	direction: MDataGridSortDirection;
};

export type MDataGridProps = ComponentProps<"table"> & {
	caption?: ReactNode;
	captionClassName?: string;
	emptyMessage?: ReactNode;
	headers: MDataGridHeaderType[];
	rows?: MDataGridRowType[];
	onSelect?: (selected: MDataGridRowType[]) => void;
	onSort?: (field: string, direction: MDataGridSortDirection) => void;
	pagination?: MDataGridPaginationConfig;
};

const getReadableCellValue = (value: MDataGridCellValue | undefined) => {
	if (value === undefined) {
		return "";
	}

	if (
		typeof value === "string" ||
		typeof value === "number" ||
		typeof value === "boolean"
	) {
		return String(value);
	}

	return Object.prototype.toString.call(value);
};

const getComparableCellValue = (value: MDataGridCellValue | undefined) => {
	if (typeof value === "number") {
		return value;
	}

	if (typeof value === "boolean") {
		return Number(value);
	}

	return getReadableCellValue(value).toLocaleLowerCase();
};

const compareCellValues = (
	firstValue: MDataGridCellValue | undefined,
	secondValue: MDataGridCellValue | undefined,
) => {
	const firstComparableValue = getComparableCellValue(firstValue);
	const secondComparableValue = getComparableCellValue(secondValue);

	if (
		typeof firstComparableValue === "number" &&
		typeof secondComparableValue === "number"
	) {
		return firstComparableValue - secondComparableValue;
	}

	return String(firstComparableValue).localeCompare(String(secondComparableValue));
};

const isSkeletonRow = (row: MDataGridRowType) => "__skeleton" in row;

const getRowLabel = (
	row: MDataGridRowType,
	headers: MDataGridHeaderType[],
) => {
	const firstReadableValue = headers
		.map((header) => getReadableCellValue(row[header.field]))
		.find((value) => value.length > 0);

	return firstReadableValue ?? `row ${row.id}`;
};

export const MDataGrid = ({
	caption,
	captionClassName,
	className,
	emptyMessage = "No rows to display",
	headers = [],
	rows,
	onSelect,
	onSort,
	pagination,
	"aria-label": ariaLabel,
	"aria-labelledby": ariaLabelledBy,
	...tableProps
}: MDataGridProps) => {
	const [selectedRows, setSelectedRows] = useState<Set<string | number>>(
		new Set(),
	);
	const [sortConfig, setSortConfig] = useState<SortConfig | undefined>();
	const [filters, setFilters] = useState<Map<string, string>>(new Map());
	const currentRows = useMemo(() => rows ?? [], [rows]);

	const sortedRows = useMemo(() => {
		if (!sortConfig || onSort) {
			return currentRows;
		}

		return [...currentRows].sort((firstRow, secondRow) => {
			const sortResult = compareCellValues(
				firstRow[sortConfig.field],
				secondRow[sortConfig.field],
			);

			return sortConfig.direction === "asc" ? sortResult : -sortResult;
		});
	}, [currentRows, onSort, sortConfig]);

	const filteredRows = useMemo(() => {
		if (filters.size === 0) {
			return sortedRows;
		}

		return sortedRows.filter((row) => {
			for (const [field, filterValue] of filters) {
				const normalizedFilterValue = filterValue.trim().toLocaleLowerCase();

				if (!normalizedFilterValue) {
					continue;
				}

				const cellValue = row[field];

				if (cellValue === undefined) {
					return false;
				}

				const filterFunction = headers.find(
					(header) => header.field === field,
				)?.filterFunction;

				if (filterFunction) {
					if (!filterFunction(cellValue, filterValue, field, row)) {
						return false;
					}

					continue;
				}

				if (
					!getReadableCellValue(cellValue)
						.toLocaleLowerCase()
						.includes(normalizedFilterValue)
				) {
					return false;
				}
			}

			return true;
		});
	}, [filters, headers, sortedRows]);

	const selectableRows = useMemo(
		() => filteredRows.filter((row) => !isSkeletonRow(row)),
		[filteredRows],
	);
	const selectedVisibleRows = useMemo(
		() => selectableRows.filter((row) => selectedRows.has(row.id)),
		[selectableRows, selectedRows],
	);
	const allVisibleRowsSelected =
		selectableRows.length > 0 && selectedVisibleRows.length === selectableRows.length;
	const someVisibleRowsSelected =
		selectedVisibleRows.length > 0 && !allVisibleRowsSelected;
	const columnCount = headers.length + (onSelect ? 1 : 0);
	const resolvedAriaLabel =
		caption || ariaLabel || ariaLabelledBy ? ariaLabel : "Data grid";

	const emitSelectionChange = useCallback(
		(nextSelectedRows: Set<string | number>) => {
			onSelect?.(
				currentRows.filter((row) => nextSelectedRows.has(row.id)),
			);
		},
		[currentRows, onSelect],
	);

	const toggleSelect = useCallback(
		(row: MDataGridRowType, checked: boolean) => {
			setSelectedRows((currentSelectedRows) => {
				const nextSelectedRows = new Set(currentSelectedRows);

				if (checked) {
					nextSelectedRows.add(row.id);
				} else {
					nextSelectedRows.delete(row.id);
				}

				emitSelectionChange(nextSelectedRows);

				return nextSelectedRows;
			});
		},
		[emitSelectionChange],
	);

	const toggleSelectAllVisibleRows = useCallback(
		(checked: boolean) => {
			setSelectedRows((currentSelectedRows) => {
				const nextSelectedRows = new Set(currentSelectedRows);

				for (const row of selectableRows) {
					if (checked) {
						nextSelectedRows.add(row.id);
					} else {
						nextSelectedRows.delete(row.id);
					}
				}

				emitSelectionChange(nextSelectedRows);

				return nextSelectedRows;
			});
		},
		[emitSelectionChange, selectableRows],
	);

	const handleSort = useCallback(
		(field: string) => {
			const direction: MDataGridSortDirection =
				sortConfig?.field === field && sortConfig.direction === "asc"
					? "desc"
					: "asc";

			setSortConfig({ field, direction });
			onSort?.(field, direction);
		},
		[onSort, sortConfig],
	);

	const handleFilter = useCallback((filterValue: string, field: string) => {
		setFilters((currentFilters) => {
			const nextFilters = new Map(currentFilters);
			const normalizedFilterValue = filterValue.trim();

			if (normalizedFilterValue.length === 0) {
				nextFilters.delete(field);
			} else {
				nextFilters.set(field, filterValue);
			}

			return nextFilters;
		});
	}, []);

	return (
		<div className={styles.dataGridContainer}>
			<div className={styles.tableScroll}>
				<table
					className={clsx(styles.dataGridTable, className)}
					aria-label={resolvedAriaLabel}
					aria-labelledby={ariaLabelledBy}
					{...tableProps}
				>
					{caption && (
						<caption className={clsx(styles.caption, captionClassName)}>
							{caption}
						</caption>
					)}
					<colgroup>
						{onSelect && <col className={styles.selectionColumn} />}
						{headers.map((header) => (
							<col key={`${header.key ?? "column"}-${header.field}`} />
						))}
					</colgroup>
					<thead>
						<tr>
							{onSelect && (
								<th scope="col" className={styles.selectionHeaderCell}>
									<MCheckbox
										label={
											<span className={styles.visuallyHidden}>
												Select all visible rows
											</span>
										}
										checked={allVisibleRowsSelected}
										isIndeterminate={someVisibleRowsSelected}
										disabled={selectableRows.length === 0}
										onCheckedChange={toggleSelectAllVisibleRows}
									/>
								</th>
							)}
							{headers.map((header) => (
								<MDataGridHeader
									{...header}
									key={`${header.key ?? "header"}-${header.field}`}
									sortDirection={
										sortConfig?.field === header.field
											? sortConfig.direction
											: undefined
									}
									filterValue={filters.get(header.field) ?? ""}
									onSort={() => handleSort(header.field)}
									onFilter={handleFilter}
								/>
							))}
						</tr>
					</thead>
					<tbody>
						{filteredRows.map((row) => (
							<MDataGridRow
								row={row}
								rowLabel={getRowLabel(row, headers)}
								headers={headers}
								key={row.id}
								onCheckboxChange={onSelect ? toggleSelect : undefined}
								selected={selectedRows.has(row.id)}
							/>
						))}
						{filteredRows.length === 0 && (
							<tr>
								<td className={styles.emptyCell} colSpan={columnCount}>
									{emptyMessage}
								</td>
							</tr>
						)}
					</tbody>
					{pagination && (
						<tfoot>
							<tr>
								<td className={styles.footerCell} colSpan={columnCount}>
									<MDataGridPagination
										total={pagination.total}
										limit={pagination.limit}
										offset={pagination.offset}
										rowsPerPageOptions={pagination.rowsPerPageOptions}
										onNextPage={pagination.onNextPage}
										onPreviousPage={pagination.onPreviousPage}
										onRowsPerPageChange={pagination.onRowsPerPageChange}
									/>
								</td>
							</tr>
						</tfoot>
					)}
				</table>
			</div>
		</div>
	);
};

export default MDataGrid;
