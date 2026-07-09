import clsx from "clsx";
import { type ComponentProps, forwardRef, type ReactNode } from "react";
import type { TComponentSize } from "../../types/TComponentSize";
import MDivider from "../MDivider/MDivider";
import MFlex, { type MFlexProps } from "../MFlex/MFlex";
import MHeading from "../MHeading/MHeading";
import style from "./MCard.module.css";

type CardProps = ComponentProps<"div"> &
	MFlexProps & {
		header?: ReactNode;
		footer?: ReactNode;
		headerClassName?: string;
		contentClassName?: string;
		footerClassName?: string;
		showHeaderDivider?: boolean;
		showFooterDivider?: boolean;
		noPadding?: boolean;
		borderLeftTopRadius?:
			| Extract<
					TComponentSize["size"],
					"s" | "m" | "l" | "xl" | "2xl" | "3xl" | "4xl"
			  >
			| "none";
		borderRightTopRadius?:
			| Extract<
					TComponentSize["size"],
					"s" | "m" | "l" | "xl" | "2xl" | "3xl" | "4xl"
			  >
			| "none";
		borderLeftBottomRadius?:
			| Extract<
					TComponentSize["size"],
					"s" | "m" | "l" | "xl" | "2xl" | "3xl" | "4xl"
			  >
			| "none";
		borderRightBottomRadius?:
			| Extract<
					TComponentSize["size"],
					"s" | "m" | "l" | "xl" | "2xl" | "3xl" | "4xl"
			  >
			| "none";
		onClick?: () => void;
		shadow?: boolean;
		collapsed?: boolean;
	};

export const MCard = forwardRef<HTMLDivElement, CardProps>(
	(
		{
			header,
			footer,
			className,
			children,
			headerClassName,
			contentClassName,
			footerClassName,
			showHeaderDivider = false,
			showFooterDivider = false,
			noPadding = false,
			borderLeftBottomRadius = "l",
			borderLeftTopRadius = "l",
			borderRightBottomRadius = "l",
			borderRightTopRadius = "l",
			shadow = true,
			collapsed = false,
			direction = "column",
			gap,
			justify = "stretch",
			align = "start",
			...htmlProps
		}: CardProps,
		ref,
	) => {
		return (
			<MFlex
				ref={ref}
				direction={direction}
				gap={gap}
				justify={justify}
				align={align}
				wrap="nowrap"
				className={clsx(
					style.card,
					{
						[style.shadow]: shadow,
						[style.noPadding]: noPadding,
					},
					style[`borderLeftBottomRadius_${borderLeftBottomRadius}`],
					style[`borderLeftTopRadius_${borderLeftTopRadius}`],
					style[`borderRightBottomRadius_${borderRightBottomRadius}`],
					style[`borderRightTopRadius_${borderRightTopRadius}`],
					className,
				)}
				{...htmlProps}
			>
				{header && (
					<header className={clsx(style.header, headerClassName)}>
						<MFlex
							direction="column"
							justify="end"
							align="stretch"
							className={style.sectionGap}
						>
							{typeof header === "string" ? (
								<MHeading mode="h3">{header}</MHeading>
							) : (
								header
							)}

							{showHeaderDivider && !collapsed && <MDivider />}
						</MFlex>
					</header>
				)}
				<div
					className={clsx(style.content, contentClassName, {
						[style.collapsed]: collapsed,
					})}
				>
					{children}
				</div>
				{footer && (
					<footer className={clsx(style.footer, footerClassName)}>
						<MFlex
							direction="column"
							justify="end"
							align="stretch"
							className={style.sectionGap}
						>
							{showFooterDivider && <MDivider />}
							{footer}
						</MFlex>
					</footer>
				)}
			</MFlex>
		);
	},
);

export default MCard;
