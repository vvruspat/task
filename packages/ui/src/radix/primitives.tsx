import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import * as SelectPrimitive from "@radix-ui/react-select";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import clsx from "clsx";
import type { ButtonHTMLAttributes, ComponentPropsWithoutRef, HTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import styles from "./primitives.module.css";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
	variant?: ButtonVariant;
	size?: ButtonSize;
};

export function Button({ className, size = "md", type = "button", variant = "primary", ...props }: ButtonProps): ReactNode {
	return <button className={clsx(styles.button, styles[`button${size}`], styles[`button${variant}`], className)} type={type} {...props} />;
}

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps): ReactNode {
	return <input className={clsx(styles.input, className)} {...props} />;
}

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;
export function Textarea({ className, ...props }: TextareaProps): ReactNode {
	return <textarea className={clsx(styles.textarea, className)} {...props} />;
}

export type RadixSelectOption = { label: string; value: string; disabled?: boolean };
export type SelectProps = Omit<ComponentPropsWithoutRef<typeof SelectPrimitive.Root>, "children"> & {
	options: readonly RadixSelectOption[];
	placeholder?: string;
	className?: string;
	"aria-label"?: string;
};

export function Select({ "aria-label": ariaLabel, className, options, placeholder = "Select an option", ...props }: SelectProps): ReactNode {
	return (
		<SelectPrimitive.Root {...props}>
			<SelectPrimitive.Trigger className={clsx(styles.selectTrigger, className)} aria-label={ariaLabel}>
				<SelectPrimitive.Value placeholder={placeholder} />
				<SelectPrimitive.Icon aria-hidden>⌄</SelectPrimitive.Icon>
			</SelectPrimitive.Trigger>
			<SelectPrimitive.Portal>
				<SelectPrimitive.Content className={styles.selectContent} position="popper">
					<SelectPrimitive.Viewport>
						{options.map((option) => (
							<SelectPrimitive.Item className={styles.selectItem} disabled={option.disabled} key={option.value} value={option.value}>
								<SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
							</SelectPrimitive.Item>
						))}
					</SelectPrimitive.Viewport>
				</SelectPrimitive.Content>
			</SelectPrimitive.Portal>
		</SelectPrimitive.Root>
	);
}

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export const DialogTitle = DialogPrimitive.Title;
export const DialogDescription = DialogPrimitive.Description;
export type DialogContentProps = ComponentPropsWithoutRef<typeof DialogPrimitive.Content>;

export function DialogContent({ className, ...props }: DialogContentProps): ReactNode {
	return (
		<DialogPrimitive.Portal>
			<DialogPrimitive.Overlay className={styles.overlay} />
			<DialogPrimitive.Content className={clsx(styles.dialogContent, className)} {...props} />
		</DialogPrimitive.Portal>
	);
}

export const Drawer = Dialog;
export const DrawerTrigger = DialogTrigger;
export const DrawerClose = DialogClose;
export const DrawerTitle = DialogTitle;
export const DrawerDescription = DialogDescription;
export type DrawerContentProps = DialogContentProps;

export function DrawerContent({ className, ...props }: DrawerContentProps): ReactNode {
	return (
		<DialogPrimitive.Portal>
			<DialogPrimitive.Overlay className={styles.overlay} />
			<DialogPrimitive.Content className={clsx(styles.drawerContent, className)} {...props} />
		</DialogPrimitive.Portal>
	);
}

export const Tabs = TabsPrimitive.Root;
export const TabsList = TabsPrimitive.List;
export const TabsContent = TabsPrimitive.Content;
export type TabsTriggerProps = ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>;

export function TabsTrigger({ className, ...props }: TabsTriggerProps): ReactNode {
	return <TabsPrimitive.Trigger className={clsx(styles.tabsTrigger, className)} {...props} />;
}

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;
export type TooltipContentProps = ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>;

export function TooltipContent({ className, sideOffset = 6, ...props }: TooltipContentProps): ReactNode {
	return (
		<TooltipPrimitive.Portal>
			<TooltipPrimitive.Content className={clsx(styles.tooltipContent, className)} sideOffset={sideOffset} {...props} />
		</TooltipPrimitive.Portal>
	);
}

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
export const DropdownMenuItem = DropdownMenuPrimitive.Item;
export const DropdownMenuSeparator = DropdownMenuPrimitive.Separator;
export type DropdownMenuContentProps = ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>;

export function DropdownMenuContent({ className, sideOffset = 6, ...props }: DropdownMenuContentProps): ReactNode {
	return (
		<DropdownMenuPrimitive.Portal>
			<DropdownMenuPrimitive.Content className={clsx(styles.menuContent, className)} sideOffset={sideOffset} {...props} />
		</DropdownMenuPrimitive.Portal>
	);
}

export type CheckboxProps = ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> & { label?: ReactNode };

export function Checkbox({ children, className, label, ...props }: CheckboxProps): ReactNode {
	return (
		<label className={styles.controlLabel}>
			<CheckboxPrimitive.Root className={clsx(styles.checkbox, className)} {...props}>
				<CheckboxPrimitive.Indicator className={styles.checkboxIndicator}>✓</CheckboxPrimitive.Indicator>
			</CheckboxPrimitive.Root>
			{label ?? children}
		</label>
	);
}

export type SwitchProps = ComponentPropsWithoutRef<typeof SwitchPrimitive.Root> & { label?: ReactNode };

export function Switch({ children, className, label, ...props }: SwitchProps): ReactNode {
	return (
		<label className={styles.controlLabel}>
			<SwitchPrimitive.Root className={clsx(styles.switch, className)} {...props}>
				<SwitchPrimitive.Thumb className={styles.switchThumb} />
			</SwitchPrimitive.Root>
			{label ?? children}
		</label>
	);
}

export type BoxProps = HTMLAttributes<HTMLDivElement>;
export function Box({ className, ...props }: BoxProps): ReactNode {
	return <div className={clsx(styles.box, className)} {...props} />;
}

type FlexDirection = "row" | "column";
type FlexAlign = "start" | "center" | "end" | "stretch";
type FlexJustify = "start" | "center" | "end" | "between";
export type FlexProps = BoxProps & { align?: FlexAlign; direction?: FlexDirection; gap?: "xs" | "sm" | "md" | "lg" | "xl"; justify?: FlexJustify };

export function Flex({ align = "stretch", className, direction = "row", gap = "md", justify = "start", ...props }: FlexProps): ReactNode {
	return <div className={clsx(styles.flex, styles[`flex${align}`], styles[`flex${direction}`], styles[`flex${gap}`], styles[`flex${justify}`], className)} {...props} />;
}

export type StackProps = Omit<FlexProps, "direction">;
export function Stack(props: StackProps): ReactNode {
	return <Flex {...props} direction="column" />;
}

export type GridProps = BoxProps & { columns?: number; gap?: "xs" | "sm" | "md" | "lg" | "xl" };
export function Grid({ className, columns = 1, gap = "md", ...props }: GridProps): ReactNode {
	return <div className={clsx(styles.grid, styles[`grid${columns}`], styles[`grid${gap}`], className)} {...props} />;
}

export type TextProps = HTMLAttributes<HTMLParagraphElement> & { tone?: "muted" | "default" | "danger" };
export function Text({ className, tone = "default", ...props }: TextProps): ReactNode {
	return <p className={clsx(styles.text, styles[`text${tone}`], className)} {...props} />;
}

export type HeadingProps = HTMLAttributes<HTMLHeadingElement> & { level?: 1 | 2 | 3 | 4 };
export function Heading({ className, level = 2, ...props }: HeadingProps): ReactNode {
	const Tag = `h${level}` as "h1" | "h2" | "h3" | "h4";
	return <Tag className={clsx(styles.heading, className)} {...props} />;
}

export type CardProps = HTMLAttributes<HTMLDivElement> & { tone?: "default" | "muted" };
export function Card({ className, tone = "default", ...props }: CardProps): ReactNode {
	return <section className={clsx(styles.card, styles[`card${tone}`], className)} {...props} />;
}

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
	tone?: "neutral" | "accent" | "success" | "warning" | "danger";
};
export function Badge({ className, tone = "neutral", ...props }: BadgeProps): ReactNode {
	return <span className={clsx(styles.badge, styles[`badge${tone}`], className)} {...props} />;
}

export type DescriptionListItem = {
	label: ReactNode;
	value: ReactNode;
};
export type DescriptionListProps = Omit<HTMLAttributes<HTMLDListElement>, "children"> & {
	items: readonly DescriptionListItem[];
};
export function DescriptionList({ className, items, ...props }: DescriptionListProps): ReactNode {
	return (
		<dl className={clsx(styles.descriptionList, className)} {...props}>
			{items.map((item, index) => (
				<div className={styles.descriptionItem} key={index}>
					<dt className={styles.descriptionLabel}>{item.label}</dt>
					<dd className={styles.descriptionValue}>{item.value}</dd>
				</div>
			))}
		</dl>
	);
}

export type ContentGridProps = BoxProps & {
	columns?: 1 | 2 | 3 | 4;
	gap?: "sm" | "md" | "lg" | "xl";
};
export function ContentGrid({ className, columns = 2, gap = "lg", ...props }: ContentGridProps): ReactNode {
	return <div className={clsx(styles.contentGrid, styles[`contentGrid${columns}`], styles[`contentGrid${gap}`], className)} {...props} />;
}

export type AppShellProps = HTMLAttributes<HTMLDivElement> & {
	header?: ReactNode;
	sidebar?: ReactNode;
};
export function AppShell({ children, className, header, sidebar, ...props }: AppShellProps): ReactNode {
	return (
		<div className={clsx(styles.appShell, className)} {...props}>
			{sidebar}
			<div className={styles.appFrame}>
				{header}
				<main className={styles.appMain}>{children}</main>
			</div>
		</div>
	);
}

export type SidebarProps = ComponentPropsWithoutRef<"aside"> & {
	collapsible?: boolean;
};
export function Sidebar({ className, collapsible = true, ...props }: SidebarProps): ReactNode {
	return <aside className={clsx(styles.sidebar, collapsible && styles.sidebarCollapsible, className)} {...props} />;
}

export type AppHeaderProps = ComponentPropsWithoutRef<"header">;
export function AppHeader({ className, ...props }: AppHeaderProps): ReactNode {
	return <header className={clsx(styles.appHeader, className)} {...props} />;
}

export type ToolbarProps = HTMLAttributes<HTMLDivElement> & {
	density?: "compact" | "comfortable";
};
export function Toolbar({ className, density = "comfortable", ...props }: ToolbarProps): ReactNode {
	return <div className={clsx(styles.toolbar, styles[`toolbar${density}`], className)} {...props} />;
}

export type AlertProps = HTMLAttributes<HTMLDivElement> & {
	tone?: "info" | "success" | "warning" | "danger";
};
export function Alert({ className, role = "status", tone = "info", ...props }: AlertProps): ReactNode {
	return <div className={clsx(styles.alert, styles[`alert${tone}`], className)} role={role} {...props} />;
}

export type BoardProps = HTMLAttributes<HTMLDivElement>;
export function Board({ className, ...props }: BoardProps): ReactNode {
	return <section className={clsx(styles.board, className)} {...props} />;
}

export type BoardColumnProps = HTMLAttributes<HTMLDivElement> & {
	header?: ReactNode;
	actions?: ReactNode;
};
export function BoardColumn({ actions, children, className, header, ...props }: BoardColumnProps): ReactNode {
	return (
		<section className={clsx(styles.boardColumn, className)} {...props}>
			{(header || actions) && <div className={styles.boardColumnHeader}><div>{header}</div>{actions}</div>}
			<div className={styles.boardColumnContent}>{children}</div>
		</section>
	);
}

export type BoardCardProps = HTMLAttributes<HTMLDivElement> & {
	actions?: ReactNode;
	footer?: ReactNode;
};
export function BoardCard({ actions, children, className, footer, ...props }: BoardCardProps): ReactNode {
	return (
		<article className={clsx(styles.boardCard, className)} {...props}>
			{actions && <div className={styles.boardCardActions}>{actions}</div>}
			{children}
			{footer && <footer className={styles.boardCardFooter}>{footer}</footer>}
		</article>
	);
}

export type StatusDotProps = HTMLAttributes<HTMLSpanElement> & {
	tone?: "neutral" | "accent" | "success" | "warning" | "danger";
};
export function StatusDot({ className, tone = "neutral", ...props }: StatusDotProps): ReactNode {
	return <span aria-hidden className={clsx(styles.statusDot, styles[`statusDot${tone}`], className)} {...props} />;
}

export type DataTableColumn<TRow> = {
	id: string;
	header: ReactNode;
	cell(row: TRow): ReactNode;
	align?: "start" | "center" | "end";
	width?: string;
};
export type DataTableProps<TRow> = Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
	columns: readonly DataTableColumn<TRow>[];
	rows: readonly TRow[];
	getRowId(row: TRow): string;
	selectedRowIds?: ReadonlySet<string>;
	onRowClick?(row: TRow): void;
	rowActions?(row: TRow): ReactNode;
	emptyState?: ReactNode;
	caption?: string;
};
export function DataTable<TRow>({
	caption,
	className,
	columns,
	emptyState = "No items found.",
	getRowId,
	onRowClick,
	rowActions,
	rows,
	selectedRowIds,
	...props
}: DataTableProps<TRow>): ReactNode {
	const hasActions = rowActions !== undefined;
	return (
		<div className={clsx(styles.dataTableContainer, className)} {...props}>
			<table className={styles.dataTable}>
				{caption && <caption className={styles.dataTableCaption}>{caption}</caption>}
				<thead>
					<tr>
						{columns.map((column) => <th className={styles[`dataTable${column.align ?? "start"}`]} key={column.id} scope="col" style={column.width ? { width: column.width } : undefined}>{column.header}</th>)}
						{hasActions && <th className={styles.dataTableend} scope="col"><span className={styles.visuallyHidden}>Actions</span></th>}
					</tr>
				</thead>
				<tbody>
					{rows.length === 0 ? (
						<tr><td className={styles.dataTableEmpty} colSpan={columns.length + (hasActions ? 1 : 0)}>{emptyState}</td></tr>
					) : rows.map((row) => {
						const rowId = getRowId(row);
						const isSelected = selectedRowIds?.has(rowId) ?? false;
						return (
							<tr className={clsx(isSelected && styles.dataTableRowSelected, onRowClick && styles.dataTableRowInteractive)} data-selected={isSelected || undefined} key={rowId} onClick={onRowClick ? () => onRowClick(row) : undefined}>
								{columns.map((column) => <td className={styles[`dataTable${column.align ?? "start"}`]} key={column.id}>{column.cell(row)}</td>)}
								{hasActions && <td className={styles.dataTableend} onClick={(event) => event.stopPropagation()}>{rowActions(row)}</td>}
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}
