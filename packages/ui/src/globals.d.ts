interface CSSModule {
	/**
	 * Returns the specific selector from imported stylesheet as string.
	 */
	[key: string]: string;
}

declare module "*.css";

declare module "*.module.css" {
	const styles: CSSModule;
	export default styles;
}
