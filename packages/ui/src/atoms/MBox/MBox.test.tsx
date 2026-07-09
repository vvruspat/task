import { render, screen } from "@testing-library/react";
import MBox from "./MBox";

describe("MBox", () => {
	it("renders children", () => {
		render(
			<MBox>
				<span data-testid="child">Child</span>
			</MBox>,
		);
		expect(screen.getByTestId("child")).toBeInTheDocument();
	});

	it("renders with the correct tag", () => {
		render(
			<MBox as="section" data-testid="box-section">
				Section content
			</MBox>,
		);
		const el = screen.getByTestId("box-section");
		expect(el.tagName.toLowerCase()).toBe("section");
	});

	it("defaults to div if as is not provided", () => {
		render(<MBox data-testid="box-default" />);
		const el = screen.getByTestId("box-default");
		expect(el.tagName.toLowerCase()).toBe("div");
	});

	it("applies custom className", () => {
		render(
			<MBox className="custom-class" data-testid="box-custom">
				Content
			</MBox>,
		);
		expect(screen.getByTestId("box-custom")).toHaveClass("custom-class");
	});

	it("applies the padding shorthand to all sides", () => {
		render(
			<MBox padding="m" data-testid="box-padding">
				Content
			</MBox>,
		);
		const el = screen.getByTestId("box-padding");
		expect(el).toHaveStyle({
			paddingTop: "var(--space-6)",
			paddingRight: "var(--space-6)",
			paddingBottom: "var(--space-6)",
			paddingLeft: "var(--space-6)",
		});
	});

	it("lets an individual side override the padding shorthand", () => {
		render(
			<MBox padding="m" paddingTop="xl" data-testid="box-padding-override">
				Content
			</MBox>,
		);
		const el = screen.getByTestId("box-padding-override");
		expect(el).toHaveStyle({
			paddingTop: "var(--space-10)",
			paddingRight: "var(--space-6)",
			paddingBottom: "var(--space-6)",
			paddingLeft: "var(--space-6)",
		});
	});

	it("lets paddingX/paddingY apply to their respective axis", () => {
		render(
			<MBox paddingX="l" paddingY="s" data-testid="box-padding-axis">
				Content
			</MBox>,
		);
		const el = screen.getByTestId("box-padding-axis");
		expect(el).toHaveStyle({
			paddingTop: "var(--space-4)",
			paddingBottom: "var(--space-4)",
			paddingLeft: "var(--space-8)",
			paddingRight: "var(--space-8)",
		});
	});

	it("lets a side override take priority over the axis prop", () => {
		render(
			<MBox
				paddingX="l"
				paddingLeft="4xl"
				data-testid="box-padding-axis-override"
			>
				Content
			</MBox>,
		);
		const el = screen.getByTestId("box-padding-axis-override");
		expect(el).toHaveStyle({
			paddingRight: "var(--space-8)",
			paddingLeft: "var(--space-16)",
		});
	});

	it("applies margin the same way as padding", () => {
		render(
			<MBox margin="xs" marginLeft="4xl" data-testid="box-margin">
				Content
			</MBox>,
		);
		const el = screen.getByTestId("box-margin");
		expect(el).toHaveStyle({
			marginTop: "var(--space-2)",
			marginRight: "var(--space-2)",
			marginBottom: "var(--space-2)",
			marginLeft: "var(--space-16)",
		});
	});

	it("resolves 'none' to 0", () => {
		render(
			<MBox padding="none" data-testid="box-none">
				Content
			</MBox>,
		);
		const el = screen.getByTestId("box-none");
		expect(el).toHaveStyle({
			paddingTop: "0",
			paddingRight: "0",
			paddingBottom: "0",
			paddingLeft: "0",
		});
	});

	it("leaves spacing untouched when no props are given", () => {
		render(<MBox data-testid="box-untouched">Content</MBox>);
		const el = screen.getByTestId("box-untouched");
		expect(el.getAttribute("style")).toBeNull();
	});
});
