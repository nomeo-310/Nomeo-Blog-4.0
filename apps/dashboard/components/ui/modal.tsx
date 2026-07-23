"use client";

import React from 'react'
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

type ModalSize    = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
type ModalVariant = 'default' | 'action' | 'danger' | 'success' | 'warning'

interface EnhancedModalProps {
  title?: string
  description?: string
  children: React.ReactNode
  isOpen: boolean
  onClose: () => void
  size?: ModalSize
  variant?: ModalVariant
  closeOnOutsideClick?: boolean
  closeOnEscape?: boolean
  showCloseButton?: boolean
  useSeparator?: boolean
  maxHeight?: boolean
  stickyActions?: 'top' | 'bottom' | 'none'
  actions?: React.ReactNode
  primaryAction?: { label: string; onClick: () => void; disabled?: boolean; loading?: boolean }
  secondaryAction?: { label: string; onClick: () => void; disabled?: boolean }
  customHeaderClassName?: string
  customBodyClassName?: string
  customFooterClassName?: string
  customOverlayClassName?: string
  isLoading?: boolean
}

const Modal: React.FC<EnhancedModalProps> = ({
  title,
  description,
  children,
  isOpen,
  onClose,
  size = 'md',
  variant = 'default',
  closeOnOutsideClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  useSeparator = false,
  maxHeight = false,
  stickyActions = 'bottom',
  actions,
  primaryAction,
  secondaryAction,
  customHeaderClassName,
  customBodyClassName,
  customFooterClassName,
  customOverlayClassName,
  isLoading = false,
}) => {
  const [showModal, setShowModal] = React.useState(isOpen);
  const [isClosing, setIsClosing] = React.useState(false);
  const modalRef = React.useRef<HTMLDivElement>(null);

  const sizeClasses = {
    sm:   'max-w-sm',
    md:   'max-w-md',
    lg:   'max-w-xl',
    xl:   'max-w-4xl',
    '2xl':'max-w-5xl',
    full: 'max-w-[95vw]',
  }

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          primary:   'bg-destructive text-destructive-foreground hover:bg-destructive/90',
          secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        }
      case 'success':
        return {
          primary:   'bg-green-600 text-white hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600',
          secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        }
      case 'warning':
        return {
          primary:   'bg-yellow-500 text-black hover:bg-yellow-600 dark:bg-yellow-600 dark:text-white dark:hover:bg-yellow-700',
          secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        }
      default:
        return {
          primary:   'bg-primary text-primary-foreground hover:bg-primary/90',
          secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        }
    }
  }

  React.useEffect(() => {
    if (isOpen) {
      setShowModal(true);
      setIsClosing(false);
      document.body.style.overflow = 'hidden';
    } else {
      setIsClosing(true);
      const timer = setTimeout(() => {
        setShowModal(false);
        document.body.style.overflow = 'unset';
      }, 300);
      return () => clearTimeout(timer);
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === 'Escape' && isOpen && !isLoading) handleClose();
    };
    if (isOpen) document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [closeOnEscape, isOpen, isLoading]);

  const handleClose = React.useCallback(() => {
    if (isLoading) return;
    setIsClosing(true);
    setTimeout(() => { onClose(); setShowModal(false); }, 300);
  }, [onClose, isLoading]);

  const handleOutsideClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnOutsideClick && e.target === e.currentTarget && !isLoading) handleClose();
  };

  if (!isOpen && !showModal) return null;

  const variantStyles = getVariantStyles();

  const renderActions = () => {
    if (actions) return actions;
    if (primaryAction || secondaryAction) {
      return (
        <div className="flex justify-end gap-3">
          {secondaryAction && (
            <button
              type="button"
              onClick={() => !secondaryAction.disabled && secondaryAction.onClick()}
              disabled={secondaryAction.disabled}
              className={cn(
                "px-4 py-2 rounded-lg font-medium transition-all duration-200",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                variantStyles.secondary
              )}
            >
              {secondaryAction.label}
            </button>
          )}
          {primaryAction && (
            <button
              type="button"
              onClick={() => !primaryAction.disabled && !primaryAction.loading && primaryAction.onClick()}
              disabled={primaryAction.disabled || primaryAction.loading}
              className={cn(
                "px-4 py-2 rounded-lg font-medium transition-all duration-200",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                variant === 'danger' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : variantStyles.primary
              )}
            >
              {primaryAction.loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>Loading...</span>
                </div>
              ) : primaryAction.label}
            </button>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div
      className={cn(
        'fixed inset-0 z-[80000] flex items-center justify-center transition-colors duration-300 backdrop-blur-[1px]',
        isClosing ? 'bg-transparent' : 'bg-black/50 dark:bg-black/70',
        customOverlayClassName
      )}
      onClick={handleOutsideClick}
    >
      {/*
        Sizing strategy:
        - The wrapper uses `p-4` on smaller screens and `p-6` on md+ for breathing room.
        - w-full + sizeClasses constrain width.
        - When maxHeight is true (e.g. AuthModal), the card itself must fill the
          available vertical space rather than shrink-wrapping its content.
          We achieve this with h-[90vh] on the card so it takes up 90% of the
          viewport height — the same value AuthModal's inner grid uses — and
          the outer p-4 only eats 8px top+bottom which is negligible.
        - When maxHeight is false the card is just auto-height (shrink-wraps content).
        - overflow-hidden on the card clips child rounding correctly.
      */}
      <div className="w-full px-4 py-4 md:px-6">
        <div
          className={cn(
            "mx-auto transition-all duration-300 transform",
            sizeClasses[size],
            showModal && !isClosing ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          )}
        >
          <div
            ref={modalRef}
            className={cn(
              "bg-card border border-border rounded-2xl shadow-lg flex flex-col overflow-hidden",
              maxHeight ? "h-[90vh]" : "max-h-[90vh]"
            )}
          >
            {/* Header */}
            {(title || showCloseButton) && (
              <div className={cn(
                "flex justify-between items-start p-5 border-b border-border shrink-0",
                stickyActions === 'top' && "sticky top-0 bg-card z-10",
                customHeaderClassName
              )}>
                <div className="flex-1">
                  {title && (
                    <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-card-foreground">
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
                  )}
                </div>
                {showCloseButton && (
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isLoading}
                    className={cn(
                      "ml-4 p-1 rounded-md transition-colors",
                      "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                      "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    <X className="size-6" />
                  </button>
                )}
              </div>
            )}

            {/* Body — scrollable, fills remaining height */}
            <div className={cn(
              "flex-1 min-h-0 overflow-y-auto",
              customBodyClassName
            )}>
              <div className="p-5">
                {useSeparator && <hr className="mb-5 border-border" />}
                {children}
              </div>
            </div>

            {/* Footer */}
            {(primaryAction || secondaryAction || actions) && (
              <div className={cn(
                "p-5 border-t border-border shrink-0",
                stickyActions === 'bottom' && "sticky bottom-0 bg-card",
                customFooterClassName
              )}>
                {renderActions()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;