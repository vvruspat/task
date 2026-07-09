import type { ButtonHTMLAttributes, HTMLAttributes, ReactElement, ReactNode } from "react";
import { createElement } from "react";

type LayoutElement =
  | "aside"
  | "div"
  | "header"
  | "label"
  | "li"
  | "main"
  | "nav"
  | "section"
  | "ul";
type TextElement = "p" | "span";
type HeadingElement = "h1" | "h2" | "h3" | "h4";

type UiTone = "default" | "muted" | "inverse" | "accent" | "danger" | "success";
type UiSize = "sm" | "md" | "lg";
type UiGap = "none" | "xs" | "sm" | "md" | "lg" | "xl";

export type BoxProps = HTMLAttributes<HTMLElement> & {
  as?: LayoutElement;
};

export function Box({ as = "div", className, ...props }: BoxProps): ReactElement {
  return createElement(as, {
    ...props,
    className: joinClassNames("ui-box", className),
  });
}

export type StackProps = BoxProps & {
  gap?: UiGap;
};

export function Stack({ className, gap = "md", ...props }: StackProps): ReactElement {
  return <Box className={joinClassNames("ui-stack", `ui-gap-${gap}`, className)} {...props} />;
}

export type InlineProps = BoxProps & {
  align?: "start" | "center" | "end" | "stretch";
  gap?: UiGap;
  justify?: "start" | "center" | "end" | "space-between";
  wrap?: "nowrap" | "wrap";
};

export function Inline({
  align = "center",
  className,
  gap = "sm",
  justify = "start",
  wrap = "wrap",
  ...props
}: InlineProps): ReactElement {
  return (
    <Box
      className={joinClassNames(
        "ui-inline",
        `ui-align-${align}`,
        `ui-gap-${gap}`,
        `ui-justify-${justify}`,
        `ui-wrap-${wrap}`,
        className,
      )}
      {...props}
    />
  );
}

export type SurfaceProps = BoxProps & {
  tone?: "default" | "subtle" | "inverse" | "warning";
};

export function Surface({ className, tone = "default", ...props }: SurfaceProps): ReactElement {
  return (
    <Box className={joinClassNames("ui-surface", `ui-surface-${tone}`, className)} {...props} />
  );
}

export type TextProps = HTMLAttributes<HTMLElement> & {
  as?: TextElement;
  size?: UiSize;
  tone?: UiTone;
  weight?: "regular" | "strong";
};

export function Text({
  as = "p",
  className,
  size = "md",
  tone = "default",
  weight = "regular",
  ...props
}: TextProps): ReactElement {
  return createElement(as, {
    ...props,
    className: joinClassNames(
      "ui-text",
      `ui-text-${size}`,
      `ui-tone-${tone}`,
      `ui-weight-${weight}`,
      className,
    ),
  });
}

export type HeadingProps = HTMLAttributes<HTMLHeadingElement> & {
  as?: HeadingElement;
  size?: UiSize;
  tone?: UiTone;
};

export function Heading({
  as = "h2",
  className,
  size = "md",
  tone = "default",
  ...props
}: HeadingProps): ReactElement {
  return createElement(as, {
    ...props,
    className: joinClassNames("ui-heading", `ui-heading-${size}`, `ui-tone-${tone}`, className),
  });
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  before?: ReactNode;
  size?: UiSize;
  variant?: "primary" | "secondary" | "ghost";
};

export function Button({
  before,
  children,
  className,
  size = "md",
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps): ReactElement {
  return (
    <button
      className={joinClassNames(
        "ui-button",
        `ui-button-${variant}`,
        `ui-button-${size}`,
        className,
      )}
      type={type}
      {...props}
    >
      {before === undefined ? null : <span className="ui-button-icon">{before}</span>}
      <span className="ui-button-label">{children}</span>
    </button>
  );
}

export type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  label: string;
};

export function IconButton({
  children,
  className,
  label,
  title = label,
  type = "button",
  ...props
}: IconButtonProps): ReactElement {
  return (
    <button
      aria-label={label}
      className={joinClassNames("ui-icon-button", className)}
      title={title}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}

export type BadgeProps = HTMLAttributes<HTMLElement> & {
  as?: "li" | "span";
  before?: ReactNode;
};

export function Badge({
  as = "span",
  before,
  children,
  className,
  ...props
}: BadgeProps): ReactElement {
  return createElement(
    as,
    {
      ...props,
      className: joinClassNames("ui-badge", className),
    },
    <>
      {before === undefined ? null : <span className="ui-badge-icon">{before}</span>}
      {children}
    </>,
  );
}

function joinClassNames(
  ...classNames: Array<string | false | null | undefined>
): string | undefined {
  const joined = classNames
    .filter((className) => typeof className === "string" && className.length > 0)
    .join(" ");

  return joined.length > 0 ? joined : undefined;
}
