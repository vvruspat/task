import clsx from "clsx";
import type { ComponentProps, ReactElement, ReactNode } from "react";
import { MBox } from "../../atoms/MBox";
import { MCard } from "../../atoms/MCard";
import { MFlex } from "../../atoms/MFlex";
import { MGrid } from "../../atoms/MGrid";
import styles from "./MOperationalLayout.module.css";

type ShellProps = ComponentProps<typeof MGrid> & {
	sidebar: ReactNode;
	children: ReactNode;
};

export function MOperationalShell({
	sidebar,
	children,
	className,
	...props
}: ShellProps): ReactElement {
	return (
		<MGrid
			tag="main"
			className={clsx(styles.shell, className)}
			columnTemplate="272px minmax(0, 1fr)"
			columnGap="none"
			rowGap="none"
			{...props}
		>
			{sidebar}
			{children}
		</MGrid>
	);
}

export function MOperationalSidebar({
	children,
	className,
	...props
}: ComponentProps<typeof MFlex>): ReactElement {
	return (
		<MFlex
			as="aside"
			className={clsx(styles.sidebar, className)}
			direction="column"
			gap="xl"
			align="stretch"
			{...props}
		>
			{children}
		</MFlex>
	);
}

export function MOperationalWorkspace({
	children,
	className,
	...props
}: ComponentProps<typeof MBox>): ReactElement {
	return (
		<MBox as="section" className={clsx(styles.workspace, className)} {...props}>
			{children}
		</MBox>
	);
}

export function MOperationalToolbar({
	children,
	className,
	...props
}: ComponentProps<typeof MFlex>): ReactElement {
	return (
		<MFlex
			as="header"
			className={clsx(styles.toolbar, className)}
			gap="m"
			wrap="nowrap"
			align="center"
			{...props}
		>
			{children}
		</MFlex>
	);
}

export function MOperationalHeader({
	children,
	className,
	...props
}: ComponentProps<typeof MFlex>): ReactElement {
	return (
		<MFlex
			as="section"
			className={clsx(styles.header, className)}
			align="start"
			justify="space-between"
			gap="xl"
			{...props}
		>
			{children}
		</MFlex>
	);
}

export function MOperationalContentGrid({
	children,
	className,
	wide = false,
	...props
}: ComponentProps<typeof MGrid> & { wide?: boolean }): ReactElement {
	return (
		<MGrid
			className={clsx(styles.contentGrid, wide && styles.contentGridWide, className)}
			columnTemplate={wide ? "minmax(0, 1fr)" : "minmax(0, 1.4fr) minmax(280px, 0.6fr)"}
			rowGap="l"
			columnGap="l"
			{...props}
		>
			{children}
		</MGrid>
	);
}

export function MOperationalLane({
	children,
	className,
	...props
}: ComponentProps<typeof MGrid>): ReactElement {
	return (
		<MGrid
			className={clsx(styles.lane, className)}
			columnTemplate="none"
			rowGap="none"
			columnGap="m"
			{...props}
		>
			{children}
		</MGrid>
	);
}

export function MOperationalRecordList({
	children,
	className,
	...props
}: ComponentProps<typeof MFlex>): ReactElement {
	return (
		<MFlex
			className={clsx(styles.recordList, className)}
			direction="column"
			align="stretch"
			gap="none"
			{...props}
		>
			{children}
		</MFlex>
	);
}

export function MOperationalRecordRow({
	children,
	className,
	columns = "minmax(220px, 1fr) auto",
	...props
}: ComponentProps<typeof MGrid> & { columns?: string }): ReactElement {
	return (
		<MGrid
			tag="article"
			className={clsx(styles.recordRow, className)}
			columnTemplate={columns}
			rowGap="s"
			columnGap="l"
			alignItems="center"
			{...props}
		>
			{children}
		</MGrid>
	);
}

export function MOperationalSurface({
	children,
	className,
	...props
}: ComponentProps<typeof MCard>): ReactElement {
	return (
		<MCard className={clsx(styles.surface, className)} shadow={false} {...props}>
			{children}
		</MCard>
	);
}

type BoardColumnProps = ComponentProps<"section"> & {
	children: ReactNode;
};

export function MOperationalBoardColumn({
	children,
	className,
	...props
}: BoardColumnProps): ReactElement {
	return (
		<MFlex
			as="section"
			align="stretch"
			direction="column"
			gap="m"
			className={clsx(styles.boardColumn, className)}
			{...props}
		>
			{children}
		</MFlex>
	);
}

type BoardCardProps = ComponentProps<"article"> & {
	children: ReactNode;
};

export function MOperationalBoardCard({
	children,
	className,
	...props
}: BoardCardProps): ReactElement {
	return (
		<MFlex
			as="article"
			align="stretch"
			direction="column"
			gap="xs"
			className={clsx(styles.boardCard, className)}
			{...props}
		>
			{children}
		</MFlex>
	);
}

export function MOperationalStatusDot({
	color,
	className,
	...props
}: ComponentProps<"span"> & { color: string }): ReactElement {
	return (
		<span
			className={clsx(styles.statusDot, className)}
			style={{ backgroundColor: color }}
			{...props}
		/>
	);
}
