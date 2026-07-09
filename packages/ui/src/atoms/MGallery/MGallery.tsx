import clsx from "clsx";
import {
	type KeyboardEvent,
	type ReactNode,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { MButton } from "../MButton/MButton";
import MFlex from "../MFlex/MFlex";
import styles from "./MGallery.module.css";

type MGalleryProps = {
	slides: ReactNode[];
	prevButtonClassName?: string;
	prevButton?: ReactNode;
	nextButtonClassName?: string;
	nextButton?: ReactNode;
	header?: ReactNode[];
	footer?: ReactNode[];
	tools?: ReactNode[];
	currentSlide?: number;
	className?: string;
	onSlideChange?: (index: number) => void;
};

export const MGallery = ({
	slides,
	prevButtonClassName,
	prevButton = "<",
	nextButtonClassName,
	nextButton = ">",
	header,
	footer,
	tools,
	currentSlide = 0,
	className,
	onSlideChange,
}: MGalleryProps) => {
	const [currentIndex, setCurrentIndex] = useState(
		Math.max(0, Math.min(slides.length - 1, currentSlide)),
	);
	const [touchStart, setTouchStart] = useState(0);
	const [touchEnd, setTouchEnd] = useState(0);
	const sliderRef = useRef<HTMLDivElement>(null);

	const nextSlide = useCallback((): void => {
		if (currentIndex === slides.length - 1) return;
		setCurrentIndex((index: number) => (index + 1) % slides.length);
	}, [currentIndex, slides]);

	const prevSlide = useCallback((): void => {
		if (currentIndex === 0) return;
		setCurrentIndex((index: number) =>
			index === 0 ? slides.length - 1 : index - 1,
		);
	}, [currentIndex, slides]);

	const handleTouchStart = useCallback((e: TouchEvent): void => {
		const target = e.targetTouches[0];
		target && setTouchStart(target.clientX);
	}, []);

	const handleTouchMove = useCallback((e: TouchEvent): void => {
		const target = e.targetTouches[0];
		target && setTouchEnd(target.clientX);
	}, []);

	const handleTouchEnd = useCallback((): void => {
		if (touchStart - touchEnd > 75) {
			nextSlide();
		}

		if (touchStart - touchEnd < -75) {
			prevSlide();
		}
	}, [touchStart, touchEnd, nextSlide, prevSlide]);

	useEffect(() => {
		setCurrentIndex(Math.max(0, Math.min(slides.length - 1, currentSlide)));
	}, [currentSlide, slides]);

	useEffect(() => {
		onSlideChange?.(currentIndex);
	}, [currentIndex, onSlideChange]);

	useEffect(() => {
		const slider = sliderRef.current;
		if (!slider) {
			return undefined;
		}

		slider.addEventListener("touchstart", handleTouchStart);
		slider.addEventListener("touchmove", handleTouchMove);
		slider.addEventListener("touchend", handleTouchEnd);

		return () => {
			slider.removeEventListener("touchstart", handleTouchStart);
			slider.removeEventListener("touchmove", handleTouchMove);
			slider.removeEventListener("touchend", handleTouchEnd);
		};
	}, [handleTouchStart, handleTouchMove, handleTouchEnd]);

	const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		if (event.key === "ArrowLeft") {
			event.preventDefault();
			prevSlide();
		}

		if (event.key === "ArrowRight") {
			event.preventDefault();
			nextSlide();
		}

		if (event.key === "Home") {
			event.preventDefault();
			setCurrentIndex(0);
		}

		if (event.key === "End") {
			event.preventDefault();
			setCurrentIndex(slides.length - 1);
		}
	};

	return (
		<MFlex
			direction="column"
			align="start"
			className={clsx(styles.wrapper, className)}
			role="region"
			aria-roledescription="carousel"
			aria-label="Gallery"
		>
			{header && <div className={clsx(styles.header)}>{header}</div>}

			<div className={clsx(styles.slider__container)}>
				<div
					ref={sliderRef}
					className={clsx(styles.slider)}
					style={{ transform: `translateX(calc(-1 * ${currentIndex} * 100%))` }}
					tabIndex={0}
					onKeyDown={handleKeyDown}
					aria-live="polite"
				>
					{slides.map((slide, index) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: index is the only unique identifier here
						<div
							key={index}
							className={clsx(styles.slider__slide)}
							aria-hidden={index !== currentIndex}
						>
							{slide}
						</div>
					))}
				</div>
				{currentIndex > 0 && (
					<MButton
						className={clsx(
							[styles.slider__button, styles.slider__button_left],
							prevButtonClassName,
						)}
						disabled={currentIndex === 0}
						mode="round"
						onClick={prevSlide}
						aria-label="Previous slide"
					>
						{prevButton}
					</MButton>
				)}
				{currentIndex < slides.length - 1 && (
					<MButton
						className={clsx(
							[styles.slider__button, styles.slider__button_right],
							nextButtonClassName,
						)}
						mode="round"
						onClick={nextSlide}
						aria-label="Next slide"
					>
						{nextButton}
					</MButton>
				)}
				{tools && <div className={clsx(styles.tools)}>{tools}</div>}
			</div>

			{footer && <div className={clsx(styles.footer)}>{footer}</div>}
		</MFlex>
	);
};

export default MGallery;
