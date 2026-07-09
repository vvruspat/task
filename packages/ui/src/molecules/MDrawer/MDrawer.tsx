import type { ReactNode } from "react";
import { Dialog, Modal, ModalOverlay } from "react-aria-components";
import styles from "./MDrawer.module.css";

export type MDrawerProps = {
  "aria-label": string;
  children: ReactNode;
  isOpen: boolean;
  onClose(): void;
};

/** A modal side panel with an accessible focus trap and focus restoration. */
export function MDrawer({ children, isOpen, onClose, ...dialogProps }: MDrawerProps) {
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
          {children}
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
