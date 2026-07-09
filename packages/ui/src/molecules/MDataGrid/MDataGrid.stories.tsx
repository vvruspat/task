import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { MInput, MText } from "../../atoms";
import { MDataGrid, type MDataGridProps } from "./MDataGrid";
import type { MDataGridHeaderType, MDataGridRowType } from "./types";

const meta: Meta<typeof MDataGrid> = {
	title: "Molecules/Data Display/MDataGrid",
	component: MDataGrid,
};

export default meta;
type Story = StoryObj<typeof MDataGrid>;

const dateFormatter = new Intl.DateTimeFormat("en", {
	year: "numeric",
	month: "short",
	day: "numeric",
});

const headers: MDataGridHeaderType[] = [
	{
		field: "name",
		label: "Customer",
		sortable: true,
		renderFilter: (props) => (
			<MInput placeholder="Search customer" {...props} />
		),
	},
	{
		field: "status",
		label: "Status",
		sortable: true,
		renderFilter: (props) => <MInput placeholder="Filter status" {...props} />,
		renderCell: (value) => (
			<MText mode={value === "Active" ? "primary" : "secondary"}>
				{String(value)}
			</MText>
		),
	},
	{
		field: "plan",
		label: "Plan",
		sortable: true,
	},
	{
		field: "revenue",
		label: "Revenue",
		sortable: true,
		renderCell: (value) =>
			typeof value === "number" ? `$${value.toLocaleString("en")}` : "",
	},
	{
		field: "renewalDate",
		label: "Renewal",
		sortable: true,
		renderCell: (value) =>
			typeof value === "number" ? dateFormatter.format(new Date(value)) : "",
	},
];

const initialRows: MDataGridRowType[] = Array.from(
	{ length: 32 },
	(_, index) => {
		const plan = index % 3 === 0 ? "Enterprise" : index % 3 === 1 ? "Team" : "Pro";
		const status = index % 5 === 0 ? "Paused" : "Active";

		return {
			id: index,
			name: `Northwind account ${index + 1}`,
			status,
			plan,
			revenue: 2400 + index * 375,
			renewalDate: Date.now() + (index + 4) * 1000 * 60 * 60 * 24 * 14,
		};
	},
);

const StatefulDataGrid = (args: MDataGridProps) => {
	const rows = args.rows ?? initialRows;
	const [offset, setOffset] = useState(0);
	const [limit, setLimit] = useState(10);
	const pageRows = rows.slice(offset, offset + limit);

	return (
		<MDataGrid
			{...args}
			rows={pageRows}
			pagination={{
				total: rows.length,
				limit,
				offset,
				rowsPerPageOptions: [5, 10, 25],
				onNextPage: (nextOffset) => setOffset(nextOffset),
				onPreviousPage: (nextOffset) => setOffset(nextOffset),
				onRowsPerPageChange: (nextLimit) => {
					setLimit(nextLimit);
					setOffset(0);
				},
			}}
		/>
	);
};

export const Default: Story = {
	args: {
		caption: "Customer accounts",
		headers,
		rows: initialRows,
		emptyMessage: "No customer accounts match the current filters.",
		onSelect: () => {},
	},
	render: (args) => <StatefulDataGrid {...args} />,
};

export const Empty: Story = {
	args: {
		caption: "Customer accounts",
		headers,
		rows: [],
		emptyMessage: "No customer accounts match the current filters.",
	},
	render: (args) => <StatefulDataGrid {...args} />,
};
