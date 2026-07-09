import { fireEvent, render, screen } from "@testing-library/react";
import MTabs from "./MTabs";

describe("MTabs Component", () => {
	const items = [
		{ key: "tab1", label: "Tab 1", content: "Content 1" },
		{ key: "tab2", label: "Tab 2", content: "Content 2" },
		{ key: "tab3", label: "Tab 3", content: "Content 3" },
	];

	test("renders correctly with initial props", () => {
		render(<MTabs items={items} defaultActiveKey="tab1" />);
		expect(screen.getAllByRole("tab")).toHaveLength(3);
		expect(screen.getByText("Content 1").closest("div")).toBeInTheDocument();
	});

	test("displays the correct tab content based on defaultActiveKey", () => {
		render(<MTabs items={items} defaultActiveKey="tab2" />);
		expect(screen.getByText("Content 2").closest("div")).toBeInTheDocument();
	});

	test("changes the active tab and displays corresponding content when a tab is clicked", () => {
		render(<MTabs items={items} defaultActiveKey="tab1" />);
		fireEvent.click(screen.getByText("Tab 2"));
		expect(screen.getByText("Content 2").closest("div")).toBeInTheDocument();
	});
});
