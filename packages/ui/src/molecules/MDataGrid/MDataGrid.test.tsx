import { screen, within } from "@testing-library/dom";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { MInput } from "../../atoms";
import MDataGrid from "./MDataGrid";
import type { MDataGridHeaderType, MDataGridRowType } from "./types";

const headers: MDataGridHeaderType[] = [
	{
		field: "name",
		label: "Customer",
		sortable: true,
		renderFilter: (props) => <MInput placeholder="Search customer" {...props} />,
	},
	{
		field: "status",
		label: "Status",
		sortable: true,
	},
];

const rows: MDataGridRowType[] = [
	{ id: 1, name: "Bravo", status: "Paused" },
	{ id: 2, name: "Alpha", status: "Active" },
];

describe("MDataGrid", () => {
	test("renders an accessible table with caption, headers, and row headers", () => {
		render(<MDataGrid caption="Customers" headers={headers} rows={rows} />);

		expect(
			screen.getByRole("table", { name: "Customers" }),
		).toBeInTheDocument();
		expect(screen.getByRole("columnheader", { name: /Customer/ })).toBeInTheDocument();
		expect(screen.getByRole("rowheader", { name: "Bravo" })).toBeInTheDocument();
		expect(screen.getByRole("cell", { name: "Active" })).toBeInTheDocument();
	});

	test("sorts rows with a column header button", async () => {
		const user = userEvent.setup();

		render(<MDataGrid caption="Customers" headers={headers} rows={rows} />);

		await user.click(
			screen.getByRole("button", { name: "Sort Customer ascending" }),
		);

		const rowHeaders = screen.getAllByRole("rowheader");
		expect(rowHeaders[0]).toHaveTextContent("Alpha");
		expect(rowHeaders[1]).toHaveTextContent("Bravo");
		expect(screen.getByRole("columnheader", { name: /Customer/ })).toHaveAttribute(
			"aria-sort",
			"ascending",
		);
	});

	test("filters rows with a column filter", async () => {
		const user = userEvent.setup();

		render(<MDataGrid caption="Customers" headers={headers} rows={rows} />);

		await user.type(screen.getByLabelText("Filter Customer"), "Alpha");

		expect(screen.getByRole("rowheader", { name: "Alpha" })).toBeVisible();
		expect(screen.queryByRole("rowheader", { name: "Bravo" })).not.toBeInTheDocument();
	});

	test("selects one row and all visible rows with labeled checkboxes", async () => {
		const user = userEvent.setup();
		const handleSelect = vi.fn();

		render(
			<MDataGrid
				caption="Customers"
				headers={headers}
				rows={rows}
				onSelect={handleSelect}
			/>,
		);

		await user.click(screen.getByLabelText("Select Alpha"));
		expect(handleSelect).toHaveBeenLastCalledWith([
			expect.objectContaining({ id: 2 }),
		]);

		await user.click(screen.getByLabelText("Select all visible rows"));
		expect(handleSelect).toHaveBeenLastCalledWith([
			expect.objectContaining({ id: 1 }),
			expect.objectContaining({ id: 2 }),
		]);
	});

	test("renders pagination controls", async () => {
		const user = userEvent.setup();
		const handleNextPage = vi.fn();
		const handlePreviousPage = vi.fn();
		const handleRowsPerPageChange = vi.fn();

		render(
			<MDataGrid
				caption="Customers"
				headers={headers}
				rows={rows}
				pagination={{
					total: 20,
					limit: 10,
					offset: 0,
					onNextPage: handleNextPage,
					onPreviousPage: handlePreviousPage,
					onRowsPerPageChange: handleRowsPerPageChange,
				}}
			/>,
		);

		const pagination = screen.getByRole("navigation", {
			name: "Table pagination",
		});

		expect(within(pagination).getByText("1–10 of 20")).toBeInTheDocument();

		await user.click(within(pagination).getByRole("button", { name: "Next page" }));
		expect(handleNextPage).toHaveBeenCalledWith(10, 10);
		expect(
			within(pagination).getByRole("button", { name: "Previous page" }),
		).toBeDisabled();
	});
});
