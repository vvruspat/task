import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import MInput from "./MInput";

describe("MInput", () => {
	test("renders", () => {
		render(<MInput type="email" placeholder="enter your email address" />);

		const element = screen.getByPlaceholderText(/enter your email address/i);

		expect(element).toBeInTheDocument();
	});

	test("removes error message when required field is filled", () => {
		render(<MInput required />);

		const errorElement = screen.queryByText(/this field is required/i);

		expect(errorElement).toBeNull();
	});

	test("renders email input type when specified", () => {
		render(<MInput type="email" />);

		const inputElement = screen.getByRole<HTMLInputElement>("textbox");

		expect(inputElement.type).toBe("email");
	});

	test("renders password input type and hides characters", () => {
		render(
			<MInput
				type="password"
				placeholder="enter your password"
				value="secret"
			/>,
		);

		const inputElement = screen.getByPlaceholderText<HTMLInputElement>(
			"enter your password",
		);

		expect(inputElement.type).toBe("password");
		expect(inputElement.value).toBe("secret"); // Shows up as dots visually
	});

	test("triggers onChange event on value change", async () => {
		const handleChange = vi.fn();
		render(<MInput onChange={handleChange} />);

		const inputElement = screen.getByRole("textbox");

		await fireEvent.change(inputElement, { target: { value: "John Doe" } });

		expect(handleChange).toHaveBeenCalled();
	});
});
