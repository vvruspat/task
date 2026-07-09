import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import type { ComponentProps } from "react";
import { MButton } from "../../atoms/MButton";
import { MFlex } from "../../atoms/MFlex";
import { MSelect } from "../../atoms/MSelect";
import { MText } from "../../atoms/MText";
import type { MSelectOption } from "../../atoms/MSelect/MSelect";
import styles from "./MDataGridPagination.module.css";

export interface MDataGridPaginationProps extends ComponentProps<"nav"> {
	total: number;
	limit: number;
	offset: number;
	rowsPerPageOptions?: number[];
	onNextPage: (offset: number, limit: number) => void;
	onPreviousPage: (offset: number, limit: number) => void;
	onRowsPerPageChange: (limit: number) => void;
}

export const MDataGridPagination = ({
	className,
	total,
	limit,
	offset,
	rowsPerPageOptions = [5, 10, 25, 50],
	onNextPage,
	onPreviousPage,
	onRowsPerPageChange,
	...restProps
}: MDataGridPaginationProps) => {
	const isPreviousDisabled = offset - limit < 0;
	const isNextDisabled = offset + limit >= total;
	const pageStart = total === 0 ? 0 : offset + 1;
	const pageEnd = Math.min(offset + limit, total);

	const onNextPageClick = () => {
		onNextPage(offset + limit, limit);
	};

	const onPrevPageClick = () => {
		onPreviousPage(Math.max(offset - limit, 0), limit);
	};

	const normalizedRowsPerPageOptions = Array.from(
		new Set([...rowsPerPageOptions, limit]),
	).sort((firstOption, secondOption) => firstOption - secondOption);
	const selectOptions: MSelectOption[] = normalizedRowsPerPageOptions.map(
		(option) => ({
			key: option.toString(),
			value: option.toString(),
		}),
	);

	return (
		<nav
			aria-label="Table pagination"
			className={clsx(styles.pagination, className)}
			{...restProps}
		>
			<MFlex
				align="center"
				justify="space-between"
				className={styles.paginationContent}
			>
				<MFlex align="center" className={styles.rowsPerPage}>
					<MText as="span" mode="secondary" className={styles.rowsPerPageLabel}>
						Rows per page
					</MText>
					<MSelect
						aria-label="Rows per page"
						onValueChange={(value) => onRowsPerPageChange(Number(value))}
						options={selectOptions}
						value={limit.toString()}
						className={styles.rowsPerPageSelect}
					/>
				</MFlex>

				<MFlex align="center" className={styles.pageControls}>
					<MText
						as="span"
						mode="secondary"
						aria-live="polite"
						className={styles.pages}
					>
						{pageStart}&ndash;{pageEnd} of {total}
					</MText>

					<MFlex align="center" wrap="nowrap" className={styles.pageNav}>
						<MButton
							mode="round"
							size="s"
							aria-label="Previous page"
							onClick={onPrevPageClick}
							disabled={isPreviousDisabled}
						>
							<ChevronLeftIcon width={18} />
						</MButton>
						<MButton
							mode="round"
							size="s"
							aria-label="Next page"
							onClick={onNextPageClick}
							disabled={isNextDisabled}
						>
							<ChevronRightIcon width={18} />
						</MButton>
					</MFlex>
				</MFlex>
			</MFlex>
		</nav>
	);
};
