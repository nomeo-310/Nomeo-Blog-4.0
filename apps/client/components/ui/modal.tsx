"use client";

import React from 'react'
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

// Extended types for the enhanced modal
type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
type ModalVariant = 'default' | 'action' | 'danger' | 'success' | 'warning'

interface EnhancedModalProps {
  // Basic props
  title?: string
  description?: string
  children: React.ReactNode
  isOpen: boolean
  onClose: () => void
  
  // Size variants
  size?: ModalSize
  variant?: ModalVariant
  
  // Behavior options
  closeOnOutsideClick?: boolean
  closeOnEscape?: boolean
  showCloseButton?: boolean
  useSeparator?: boolean
  
  // Layout options
  maxHeight?: boolean
  stickyActions?: 'top' | 'bottom' | 'none'
  
  // Action buttons
  actions?: React.ReactNode
  primaryAction?: {
    label: string
    onClick: () => void
    disabled?: boolean
    loading?: boolean
  }
  secondaryAction?: {
    label: string
    onClick: () => void
    disabled?: boolean
  }
  
  // Additional styling
  customHeaderClassName?: string
  customBodyClassName?: string
  customFooterClassName?: string
  customOverlayClassName?: string
  
  // Loading state
  isLoading?: boolean
}

const Modal: React.FC<EnhancedModalProps> = ({
  // Basic props
  title,
  description,
  children,
  isOpen,
  onClose,
  
  // New props with defaults
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

  // Size mappings using Tailwind's max-width utilities
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-4xl',
    '2xl': 'max-w-5xl',
    full: 'max-w-[95vw]'
  }

  // Variant styling using your CSS variables
  const getVariantStyles = (type: 'primary' | 'secondary' | 'danger') => {
    switch (variant) {
      case 'danger':
        return {
          primary: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
          secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
          danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
        }
      case 'success':
        return {
          primary: 'bg-green-600 text-white hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600',
          secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
          danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
        }
      case 'warning':
        return {
          primary: 'bg-yellow-500 text-black hover:bg-yellow-600 dark:bg-yellow-600 dark:text-white dark:hover:bg-yellow-700',
          secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
          danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
        }
      default: // default and action
        return {
          primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
          secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
          danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
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

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === 'Escape' && isOpen && !isLoading) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [closeOnEscape, isOpen, isLoading]);

  const handleClose = React.useCallback(() => {
    if (isLoading) return;
    
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setShowModal(false);
    }, 300);
  }, [onClose, isLoading]);

  const handleOutsideClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnOutsideClick && e.target === e.currentTarget && !isLoading) {
      handleClose();
    }
  };

  const handlePrimaryAction = () => {
    if (primaryAction && !primaryAction.disabled && !primaryAction.loading) {
      primaryAction.onClick();
    }
  };

  const handleSecondaryAction = () => {
    if (secondaryAction && !secondaryAction.disabled) {
      secondaryAction.onClick();
    }
  };

  if (!isOpen && !showModal) return null;

  const variantStyles = getVariantStyles('primary');

  // Render action buttons (REVERTED BACK TO ORIGINAL FLOW)
  const renderActions = () => {
    if (actions) return actions;

    if (primaryAction || secondaryAction) {
      return (
        <div className="flex justify-end gap-3">
          {secondaryAction && (
            <button
              type="button"
              onClick={handleSecondaryAction}
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
              onClick={handlePrimaryAction}
              disabled={primaryAction.disabled || primaryAction.loading}
              className={cn(
                "px-4 py-2 rounded-lg font-medium transition-all duration-200",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                variant === 'danger' ? variantStyles.danger : variantStyles.primary
              )}
            >
              {primaryAction.loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>Loading...</span>
                </div>
              ) : (
                primaryAction.label
              )}
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
      <div className="p-4 w-full">
        <div className={cn(
          "mx-auto transition-all duration-300 transform",
          sizeClasses[size],
          showModal && !isClosing ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        )}>
          <div className={cn(
            "bg-card border border-border rounded-lg shadow-lg flex flex-col",
            maxHeight && "max-h-[90vh]"
          )}>
            {/* Header */}
            <div className={cn(
              "flex justify-between items-start p-5 border-b border-border",
              stickyActions === 'top' && "sticky top-0 bg-card z-10 rounded-t-lg",
              customHeaderClassName
            )}>
              <div className="flex-1">
                {title && (
                  <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-card-foreground">
                    {title}
                  </h2>
                )}
                {description && (
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    {description}
                  </p>
                )}
              </div>
              {showCloseButton && (
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isLoading}
                  className={cn(
                    "ml-4 p-1 rounded-md transition-colors",
                    "text-muted-foreground hover:text-foreground",
                    "hover:bg-accent hover:bg-accent/50",
                    "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  <X className="size-7" />
                </button>
              )}
            </div>

            {/* Body */}
            <div className={cn(
              "flex-1 overflow-y-auto",
              maxHeight && "max-h-[calc(90vh-200px)]",
              customBodyClassName
            )}>
              <div className="p-5">
                {useSeparator && (
                  <hr className="mb-5 border-border" />
                )}
                {children}
              </div>
            </div>

            {/* Footer with Actions */}
            {(primaryAction || secondaryAction || actions) && (
              <div className={cn(
                "p-5 border-t border-border rounded-b-lg",
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