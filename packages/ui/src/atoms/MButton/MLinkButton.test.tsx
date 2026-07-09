import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MLinkButton from "./MLinkButton";

describe("MLinkButton", () => {
	test("render link button", async () => {
		render(
			<MLinkButton mode="primary" href="https://google.com" target="_blank">
				Link Button Text
			</MLinkButton>,
		);

		expect(screen.getByText("Link Button Text")).toBeInTheDocument();

		expect(screen.getByRole("link")).toHaveAttribute(
			"href",
			"https://google.com",
		);
		expect(screen.getByRole("link")).toHaveAttribute("target", "_blank");
		expect(screen.getByRole("link")).not.toBeDisabled();

		await userEvent.click(screen.getByRole("link"));
	});

	test("disabled link button", async () => {
		render(
			<MLinkButton
				disabled={true}
				mode="primary"
				href="https://google.com"
				target="_blank"
			>
				Link Button Text
			</MLinkButton>,
		);

		await userEvent.click(screen.getByRole("link"));

		expect(screen.getByRole("link")).toHaveAttribute("aria-disabled", "true");
	});
});
