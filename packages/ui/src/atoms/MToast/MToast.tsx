import {
	CheckCircleIcon,
	ExclamationCircleIcon,
	InformationCircleIcon,
	XCircleIcon,
	XMarkIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import type { ComponentProps } from "react";
import { useEffect, useRef, useState } from "react";
import { mergeProps, useFocusRing, useHover, useToastRegion } from "react-aria";
import { useToastQueue } from "react-stately";
import {
	Button as AriaButton,
	Text as AriaText,
	UNSTABLE_Toast as AriaToast,
	UNSTABLE_ToastContent as AriaToastContent,
	UNSTABLE_ToastQueue as ToastQueue,
	UNSTABLE_ToastStateContext as ToastStateContext,
	type QueuedToast,
} from "react-aria-components";
import alertStyles from "../MAlert/MAlert.module.css";
import { MFlex } from "../MFlex";
import textStyles from "../MText/MText.module.css";
import styles from "./MToast.module.css";

export type MToastMode = "info" | "success" | "warning" | "error";

export type MToastContent = {
	mode?: MToastMode;
	title: string;
	description?: string;
};

const modeIcon = {
	info: InformationCircleIcon,
	success: CheckCircleIcon,
	warning: ExclamationCircleIcon,
	error: XCircleIcon,
} satisfies Record<MToastMode, typeof InformationCircleIcon>;

/** Default timeout (ms) before a toast auto-dismisses. Errors stay until closed. */
const AUTO_DISMISS_MS = 5000;

/** Singleton queue — one toast region per app. Trigger toasts via `mToast.*`. */
export const mToastQueue = new ToastQueue<MToastContent>({
	maxVisibleToasts: 5,
});

export const mToast = {
	show: (content: MToastContent) =>
		mToastQueue.add(content, {
			timeout: content.mode === "error" ? undefined : AUTO_DISMISS_MS,
		}),
	info: (title: string, description?: string) =>
		mToast.show({ mode: "info", title, description }),
	success: (title: string, description?: string) =>
		mToast.show({ mode: "success", title, description }),
	warning: (title: string, description?: string) =>
		mToast.show({ mode: "warning", title, description }),
	error: (title: string, description?: string) =>
		mToast.show({ mode: "error", title, description }),
};

const MToastItem = ({ toast }: { toast: QueuedToast<MToastContent> }) => {
	const mode = toast.content.mode ?? "info";
	const Icon = modeIcon[mode];

	return (
		<AriaToast
			toast={toast}
			className={clsx(
				alertStyles.alert,
				alertStyles[`alert-mode-${mode}`],
				styles.toast,
			)}
		>
			<MFlex direction="column" gap="xs" align="stretch" wrap="nowrap" className={styles.body}>
				<MFlex gap="s" align="center" wrap="nowrap" className={styles.headerRow}>
					<Icon width={18} className={styles.icon} />
					<AriaToastContent className={styles.content}>
						<AriaText
							slot="title"
							className={clsx(
								textStyles["size-m"],
								textStyles["mode-inherit"],
								styles.title,
							)}
						>
							{toast.content.title}
						</AriaText>
					</AriaToastContent>
					<AriaButton
						slot="close"
						className={styles.dismiss}
						aria-label="Dismiss notification"
					>
						<XMarkIcon width={14} />
					</AriaButton>
				</MFlex>
				{toast.content.description && (
					<AriaText
						slot="description"
						className={clsx(
							textStyles["size-s"],
							textStyles["mode-inherit"],
							styles.description,
						)}
					>
						{toast.content.description}
					</AriaText>
				)}
			</MFlex>
		</AriaToast>
	);
};

/** Must match the CSS `.exiting` transition duration in MToast.module.css. */
const EXIT_ANIMATION_MS = 200;

type DisplayedToast = { toast: QueuedToast<MToastContent>; exiting: boolean };

/**
 * react-stately removes a closed toast from `state.visibleToasts` immediately,
 * so there's nothing left to animate out by the time React re-renders. This
 * mirrors `visibleToasts` into local state, keeping a just-closed toast around
 * (flagged `exiting`) for one CSS transition before dropping it for real.
 */
const useAnimatedToastList = (
	visibleToasts: QueuedToast<MToastContent>[],
): DisplayedToast[] => {
	const [items, setItems] = useState<DisplayedToast[]>([]);
	const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());

	useEffect(() => {
		const visibleKeys = new Set(visibleToasts.map((toast) => toast.key));

		setItems((prevItems) => {
			const stillThere = prevItems.map((item) => {
				if (visibleKeys.has(item.toast.key)) {
					return { toast: item.toast, exiting: false };
				}
				if (!timersRef.current.has(item.toast.key)) {
					const key = item.toast.key;
					const timer = setTimeout(() => {
						setItems((cur) => cur.filter((i) => i.toast.key !== key));
						timersRef.current.delete(key);
					}, EXIT_ANIMATION_MS);
					timersRef.current.set(key, timer);
				}
				return { ...item, exiting: true };
			});

			const prevKeys = new Set(prevItems.map((item) => item.toast.key));
			const newOnes = visibleToasts
				.filter((toast) => !prevKeys.has(toast.key))
				.map((toast) => ({ toast, exiting: false }));

			return [...newOnes, ...stillThere];
		});
	}, [visibleToasts]);

	useEffect(() => {
		const timers = timersRef.current;
		return () => {
			for (const timer of timers.values()) {
				clearTimeout(timer);
			}
		};
	}, []);

	return items;
};

export type MToastRegionProps = Omit<ComponentProps<"div">, "children">;

/** Mount once near the app root. Trigger toasts from anywhere via `mToast.*`. */
export const MToastRegion = ({ className, ...restProps }: MToastRegionProps) => {
	const state = useToastQueue(mToastQueue);
	const regionRef = useRef<HTMLDivElement>(null);
	const { regionProps } = useToastRegion({}, state, regionRef);
	const { hoverProps, isHovered } = useHover({});
	const { focusProps, isFocused, isFocusVisible } = useFocusRing();
	const items = useAnimatedToastList(state.visibleToasts);

	if (items.length === 0) {
		return null;
	}

	return (
		<ToastStateContext.Provider value={state}>
			<div
				{...mergeProps(regionProps, hoverProps, focusProps, restProps)}
				ref={regionRef}
				className={clsx(styles.region, className)}
				data-hovered={isHovered || undefined}
				data-focused={isFocused || undefined}
				data-focus-visible={isFocusVisible || undefined}
			>
				{items.map(({ toast, exiting }) => (
					<div
						key={toast.key}
						className={clsx(styles.item, exiting && styles.exiting)}
					>
						<MToastItem toast={toast} />
					</div>
				))}
			</div>
		</ToastStateContext.Provider>
	);
};

export default MToastRegion;
