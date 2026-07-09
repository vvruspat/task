import { render, screen } from "@testing-library/react";
import MSelect from "./MSelect";

const options = [
	{ key: "1", value: "Option 1" },
	{ key: "2", value: "Option 2" },
	{ key: "3", value: "Option 3" },
];

describe("MSelect Component", () => {
	test("renders with given options", () => {
		render(<MSelect options={options} />);

		options.forEach((option) => {
			expect(screen.getByText(option.value)).toBeInTheDocument();
		});
	});
});
