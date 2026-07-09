"use client";
import clsx from "clsx";
import {
	type ChangeEvent,
	type ComponentProps,
	useEffect,
	useRef,
	useState,
} from "react";
import { MButton } from "../MButton";
import { MFlex } from "../MFlex";
import styles from "./MFileInput.module.css";

import type { TComponentStatus } from "../../types/TComponentStatus";
import { MFileInputModal } from "./modal";

export type FileInputProps = ComponentProps<typeof MButton> &
	Partial<TComponentStatus> & {
		fileInputProps?: ComponentProps<"input">;
		wrapperClassName?: string;
		modalClassName?: string;
		onSave?: (files: File[]) => void;
		onClose?: () => void;
		resetOnClose?: boolean;
	};

export const MFileInput = ({
	status = "regular",
	children,
	className,
	wrapperClassName,
	modalClassName,
	fileInputProps,
	resetOnClose,
	id,
	onSave,
	onClose,
	...restProps
}: FileInputProps) => {
	const [openModal, setOpenModal] = useState(false);
	const [files, setFiles] = useState<File[]>([]);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (inputRef.current) {
			const dataTransfer = new DataTransfer();
			files.forEach((file) => {
				dataTransfer.items.add(file);
			});

			const currentFiles = inputRef.current.files;
			const areFilesEqual =
				currentFiles &&
				currentFiles.length === dataTransfer.files.length &&
				Array.from(currentFiles).every(
					(file, idx) =>
						file.name === dataTransfer.files[idx]?.name &&
						file.size === dataTransfer.files[idx]?.size &&
						file.type === dataTransfer.files[idx]?.type,
				);

			if (!areFilesEqual) {
				inputRef.current.files = dataTransfer.files;
			}
		}
	}, [files]);

	const reset = () => {
		setFiles([]);
		if (inputRef.current) {
			inputRef.current.value = "";
		}
	};

	const handleButtonClick = () => {
		setOpenModal(true);
	};

	const handleFilesDropped = (dropped: File[]) => {
		setFiles((prev) => [...prev, ...dropped]);
	};

	const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
		const selectedFiles = e.target.files;
		if (selectedFiles) {
			setFiles((prev) => [...prev, ...Array.from(selectedFiles)]);
		}
	};

	const handleFileRemoved = (fileName: File["name"]) => {
		setFiles((prev) => prev.filter((f) => f.name !== fileName));
	};

	const handleFilesReset = () => {
		reset();
	};

	const handleModalClose = () => {
		setOpenModal(false);
		onClose?.();

		if (resetOnClose) {
			reset();
		}
	};

	const handleSaveClick = () => {
		onSave?.(files);
		setOpenModal(false);

		if (resetOnClose) {
			reset();
		}
	};

	return (
		<MFlex
			direction="row"
			align="center"
			justify="start"
			className={clsx(styles.inputWrapper, styles[status], wrapperClassName)}
		>
			<input
				ref={inputRef}
				type="file"
				multiple
				hidden
				onChange={handleFileChange}
				{...fileInputProps}
			/>

			<div className={styles.filesList}>
				{files.map((file) => file.name).join(", ") || "No files selected"}
			</div>

			<MButton mode="primary" onClick={handleButtonClick} {...restProps}>
				{children}
			</MButton>

			<MFileInputModal
				open={openModal}
				onClose={handleModalClose}
				accept={fileInputProps?.accept}
				multiple={fileInputProps?.multiple ?? true}
				files={files}
				onFilesDropped={handleFilesDropped}
				onFileRemoved={handleFileRemoved}
				onFilesReset={handleFilesReset}
				onSave={handleSaveClick}
			/>
		</MFlex>
	);
};

export default MFileInput;
