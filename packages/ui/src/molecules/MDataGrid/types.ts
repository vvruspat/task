import type { ComponentProps, ReactElement, ReactNode } from "react";

export type MDataGridSortDirection = "asc" | "desc";

export type MDataGridHeaderType = ComponentProps<"th"> & {
	key?: string;
	field: string;
	label: ReactNode;
	sortable?: boolean;
	editable?: boolean;
	filterFunction?: (
		value: MDataGridCellValue,
		filterValue: string | number,
		field: string,
		row: MDataGridRowType,
	) => boolean;
	renderFilter?: (
		props: ComponentProps<"input">,
	) => ReactElement<ComponentProps<"input">>;
	renderCell?: (value: MDataGridCellValue, row: MDataGridRowType) => ReactNode;
};

export type MDataGridCellValue = string | number | boolean | object;

export type MDataGridRowType = Record<string, MDataGridCellValue> & {
	id: string | number;
};

export type MDataGridPaginationConfig = {
	total: number;
	limit: number;
	offset: number;
	rowsPerPageOptions?: number[];
	onNextPage: (offset: number, limit: number) => void;
	onPreviousPage: (offset: number, limit: number) => void;
	onRowsPerPageChange: (limit: number) => void;
};
