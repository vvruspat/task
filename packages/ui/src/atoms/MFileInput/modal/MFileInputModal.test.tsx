import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { MFileInputModal } from "./MFileInputModal";

describe("MFileInputModal", () => {
	const files = [
		new File(["1"], "one.txt", { type: "text/plain" }),
		new File(["2"], "two.png", { type: "image/png" }),
	];
	const onDropped = vi.fn();
	const onRemoved = vi.fn();
	const onReset = vi.fn();
	const onClose = vi.fn();
	it("is hidden when open=false", () => {
		render(
			<MFileInputModal
				open={false}
				files={files}
				onFilesDropped={onDropped}
				onFileRemoved={onRemoved}
				onFilesReset={onReset}
				onClose={onClose}
			/>,
		);
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
	});

	it("shows files and calls onFileRemoved", () => {
		render(
			<MFileInputModal
				open
				files={files}
				onFilesDropped={onDropped}
				onFileRemoved={onRemoved}
				onFilesReset={onReset}
				onClose={onClose}
				accept="text/plain,image/png"
			/>,
		);

		// each filename should be rendered
		expect(screen.getByText("one.txt")).toBeInTheDocument();
		expect(screen.getByText("two.png")).toBeInTheDocument();
	});

	it("calls onFilesDropped when files are dropped", async () => {
		render(
			<MFileInputModal
				open
				files={[]}
				onFilesDropped={onDropped}
				onFileRemoved={onRemoved}
				onFilesReset={onReset}
				onClose={onClose}
				accept="text/plain,image/png"
			/>,
		);
		const dropArea = screen.getByTestId("drop-area");
		const dt = {
			dataTransfer: {
				files: [files[0]],
				types: ["Files"],
				items: [
					{
						kind: "file",
						type: files[0].type,
						getAsFile: () => files[0],
					},
				],
				getData: () => "",
			},
		};
		fireEvent.drop(dropArea, dt);
		await waitFor(() => expect(onDropped).toHaveBeenCalledWith([files[0]]));
	});

	it("calls onFileRemoved when its remove button is clicked", () => {
		render(
			<MFileInputModal
				open
				files={files}
				onFilesDropped={onDropped}
				onFileRemoved={onRemoved}
				onFilesReset={onReset}
				onClose={onClose}
			/>,
		);

		const removeOne = screen.getByLabelText("Remove one.txt");
		fireEvent.click(removeOne);

		expect(onRemoved).toHaveBeenCalledWith("one.txt");
	});
});
