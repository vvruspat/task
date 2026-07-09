import { render } from "@testing-library/react";
import MListItem from "./MListItem";
import styles from "./MListItem.module.css";

describe("MListItem Component", () => {
	test("renders children correctly", () => {
		const { getByText } = render(<MListItem>Show this content</MListItem>);
		expect(getByText("Show this content")).toBeInTheDocument();
	});
	test("adds itemBorder class when showDivider is true", () => {
		const { container } = render(
			<MListItem showDivider>Test Content</MListItem>,
		);
		expect(container.firstChild).toHaveClass(styles.itemBorder);
	});
	test("does not add itemBorder class when showDivider is false", () => {
		const { container } = render(
			<MListItem showDivider={false}>Test Content</MListItem>,
		);
		expect(container).not.toHaveClass(styles.itemBorder);
	});
});
