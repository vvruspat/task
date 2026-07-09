import { render, screen } from "@testing-library/react";
import MProgressBar from "./MProgressBar";

describe("MProgressBar", () => {
	test("renders progressbar", () => {
		render(<MProgressBar aria-label="Upload progress" value={50} />);

		expect(screen.getByRole("progressbar")).toBeInTheDocument();
	});

	test("renders label and value", () => {
		render(<MProgressBar label="Upload progress" value={25} showValue />);

		expect(screen.getByLabelText("Upload progress")).toBeInTheDocument();
		expect(screen.getByText("25%")).toBeInTheDocument();
	});

	test("renders formatted value", () => {
		render(
			<MProgressBar
				label="Upload progress"
				value={50}
				max={200}
				showValue
				valueFormatter={(value, max) => `${value} of ${max}`}
			/>,
		);

		expect(screen.getByText("50 of 200")).toBeInTheDocument();
	});

	test("can render indeterminate progress", () => {
		render(<MProgressBar aria-label="Loading" />);

		expect(screen.getByRole("progressbar")).not.toHaveAttribute("value");
	});
});
