import { UserIcon } from "@heroicons/react/24/solid";
import { MFlex } from "../MFlex";
import styles from "./MAvatarFallback.module.css";

type MAvatarFallbackProps = {
	name: string;
};

export const MAvatarFallback = ({ name }: MAvatarFallbackProps) => {
	const initials = name
		.split(" ")
		.slice(0, 2)
		.map((n) => n[0])
		.join("")
		.toUpperCase();

	return (
		<MFlex align="center" justify="center" className={styles.fallback}>
			{initials || <UserIcon width={32} />}
		</MFlex>
	);
};
