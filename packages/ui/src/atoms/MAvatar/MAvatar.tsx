"use client";

import clsx from "clsx";
import { type ComponentProps, useState } from "react";
import { MFlex } from "../../atoms/MFlex";
import type { TComponentSize } from "../../types/TComponentSize";
import { MSkelleton } from "../MSkelleton";
import styles from "./MAvatar.module.css";
import { MAvatarFallback } from "./MAvatarFallback";

export type MAvatarProps = ComponentProps<"img"> & {
	size?: Exclude<TComponentSize["size"], "inherit">;
	pending?: boolean;
};

export const MAvatar = ({
	size = "2xl",
	pending = false,
	className,
	...imgProps
}: MAvatarProps) => {
	const [showFallback, setShowFallback] = useState(false);

	return (
		<MFlex className={clsx(styles.avatar, styles[`avatar-size-${size}`])}>
			{pending ? (
				<div className={clsx(styles.image, className)}>
					<MSkelleton />
				</div>
			) : showFallback || !imgProps.src ? (
				<div className={clsx(styles.image, className)}>
					<MAvatarFallback name={imgProps.alt ?? ""} />
				</div>
			) : (
				<img
					{...imgProps}
					className={clsx(styles.image, className)}
					onError={() => setShowFallback(true)}
				/>
			)}
		</MFlex>
	);
};

export default MAvatar;
