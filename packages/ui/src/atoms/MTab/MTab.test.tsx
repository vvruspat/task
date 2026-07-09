import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import MTab from "./MTab";

describe("MTab Component", () => {
	test("renders the label passed to it", () => {
		const label = "Tab 1";
		render(<MTab label={label} key={""} />);
		expect(screen.getByText(label)).toBeInTheDocument();
	});

	test("applies the active class when active prop is true", () => {
		const label = "Active Tab";
		const { container } = render(<MTab label={label} active key={""} />);
		expect(container.querySelector("button")).toHaveClass("activeTab");
	});

	test("calls onClick prop when clicked", () => {
		const label = "Clickable Tab";
		const onClickMock = vi.fn();
		render(<MTab label={label} onClick={onClickMock} key={""} />);
		fireEvent.click(screen.getByText(label));
		expect(onClickMock).toHaveBeenCalled();
	});
});
