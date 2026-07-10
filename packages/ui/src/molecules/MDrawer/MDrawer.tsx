import type { KeyboardEventHandler, ReactNode } from "react";
import { Dialog, Modal, ModalOverlay } from "react-aria-components";
import styles from "./MDrawer.module.css";

export type MDrawerProps = {
  "aria-label": string;
  children: ReactNode;
  isOpen: boolean;
  onClose(): void;
  onKeyDown?: KeyboardEventHandler<HTMLDivElement>;
};

/** A modal side panel with an accessible focus trap and focus restoration. */
export function MDrawer({ children, isOpen, onClose, onKeyDown, ...dialogProps }: MDrawerProps) {
  return (
    <ModalOverlay
      className={styles.overlay}
      isDismissable={false}
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Modal className={styles.modal}>
        <Dialog className={styles.drawer} {...dialogProps}>
          <div onKeyDown={onKeyDown}>{children}</div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
