import { TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";

import { extension } from "mime-types";
import {
	Button as AriaButton,
	Dialog,
	DropZone,
	FileTrigger,
	Modal,
	ModalOverlay,
} from "react-aria-components";
import { MButton } from "../../MButton";
import { MCard } from "../../MCard";
import { MFlex } from "../../MFlex";
import { MList } from "../../MList";
import { MText } from "../../MText";

import styles from "./MFileInputModal.module.css";
import "./MFileInputModal.vars.css";
import { MCaption } from "../../MCaption";

const getAcceptPatterns = (accept = "") => {
	return accept
		.split(",")
		.map((pattern) => pattern.trim().toLowerCase())
		.filter(Boolean);
};

const fileAccepted = (file: File, accept = "") => {
	const patterns = getAcceptPatterns(accept);

	if (patterns.length === 0) return true;

	const name = file.name.toLowerCase();
	const type = file.type.toLowerCase();

	return patterns.some((pattern) => {
		if (pattern.startsWith(".")) {
			return name.endsWith(pattern);
		}

		if (pattern.endsWith("/*")) {
			const main = pattern.replace("/*", "");
			return type.startsWith(`${main}/`);
		}

		return type === pattern;
	});
};

const limitFiles = (files: File[], multiple: boolean) => {
	if (multiple) return files;

	const firstFile = files[0];
	return firstFile ? [firstFile] : [];
};

export const MFileInputModal = ({
	open,
	files = [],
	accept = "",
	multiple = true,
	onFilesDropped,
	onFileRemoved,
	onFilesReset,
	onClose,
	onSave,
}: {
	onClose?: () => void;
	onSave?: () => void;
	files?: File[];
	accept?: string;
	multiple?: boolean;
	onFilesDropped: (files: File[]) => void;
	onFileRemoved: (fileName: File["name"]) => void;
	onFilesReset?: () => void;
	open: boolean;
}) => {
	const addFiles = (selectedFiles: File[]) => {
		onFilesDropped(
			limitFiles(selectedFiles.filter((file) => fileAccepted(file, accept)), multiple),
		);
	};

	return (
		<ModalOverlay
			isOpen={open}
			onOpenChange={(isOpen) => {
				if (!isOpen) {
					onClose?.();
				}
			}}
			isDismissable
			className={clsx(styles.overlay, open && styles.open)}
		>
			<Modal>
				<Dialog aria-label="Upload files">
					<MCard
						className={styles.modal}
						header={
							<MFlex justify="space-between">
								{files.length > 0 && (
									<MButton mode="tertiary" onClick={onFilesReset}>
										Reset
									</MButton>
								)}

								<MButton
									mode="round"
									onClick={() => onClose?.()}
									aria-label="Close file upload"
								>
									<XMarkIcon width={16} />
								</MButton>
							</MFlex>
						}
						footer={
							<MFlex justify="end">
								<MButton
									mode="primary"
									disabled={files.length === 0}
									onClick={() => onSave?.() || onClose?.()}
								>
									Save
								</MButton>
								<MButton mode="tertiary" onClick={() => onClose?.()}>
									Cancel
								</MButton>
							</MFlex>
						}
						gap="2xl"
					>
						<DropZone
							className={styles.dropArea}
							getDropOperation={(types) =>
								types.has("Files") ? "copy" : "cancel"
							}
							onDrop={async (event) => {
								const droppedFiles = await Promise.all(
									event.items
										.filter((item) => item.kind === "file")
										.map((item) => item.getFile()),
								);

								addFiles(droppedFiles);
							}}
							data-testid="drop-area"
						>
							<FileTrigger
								acceptedFileTypes={getAcceptPatterns(accept)}
								allowsMultiple={multiple}
								onSelect={(fileList) => {
									if (fileList) {
										addFiles(Array.from(fileList));
									}
								}}
							>
								<AriaButton type="button" className={styles.dropButton}>
									<MFlex direction="column" align="center" justify="center">
										<MText>Drag & drop files here, or choose files</MText>
										{accept && (
											<MCaption>
												Accepted file types:{" "}
												{accept
													.split(",")
													.map((mime) => extension(mime.trim()) || mime.trim())
													.join(", ")}
											</MCaption>
										)}
									</MFlex>
								</AriaButton>
							</FileTrigger>
						</DropZone>

						<MList
							options={files.map((file) => ({
								key: file.name,
								value: (
									<MFlex align="center" justify="space-between">
										<MText>{file.name}</MText>
										<MButton
											mode="round"
											aria-label={`Remove ${file.name}`}
											onClick={() => onFileRemoved(file.name)}
										>
											<TrashIcon width={16} />
										</MButton>
									</MFlex>
								),
							}))}
						/>
					</MCard>
				</Dialog>
			</Modal>
		</ModalOverlay>
	);
};
