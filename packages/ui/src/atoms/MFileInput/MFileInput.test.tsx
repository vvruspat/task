import { fireEvent, render, screen } from "@testing-library/react";
import MFileInput from "./MFileInput";

class DataTransferMock {
	files: File[] = [];
	items = {
		add: (file: File) => {
			this.files.push(file);
		},
	};
	constructor() {
		// emulate DataTransfer.files as a FileList
		Object.defineProperty(this, "files", {
			get: () => {
				const list: File[] = [];
				this.items.add = (file: File) => list.push(file);
				return list as unknown as FileList;
			},
			set: (files: File[]) => {
				this.files = files;
			},
		});
	}
}
// biome-ignore lint/suspicious/noExplicitAny: global is used for mocking
(global as any).DataTransfer = DataTransferMock;

describe("MFileInput", () => {
	it("renders button and empty-list placeholder", () => {
		render(<MFileInput>Upload</MFileInput>);

		// button
		const btn = screen.getByRole("button", { name: /upload/i });
		expect(btn).toBeInTheDocument();

		// no files yet
		expect(screen.getByText("No files selected")).toBeInTheDocument();
	});

	it("opens modal on button click", () => {
		render(<MFileInput>Upload</MFileInput>);
		const btn = screen.getByRole("button", { name: /upload/i });
		fireEvent.click(btn);

		expect(screen.getByRole("dialog", { name: /upload files/i })).toBeVisible();
	});
});
