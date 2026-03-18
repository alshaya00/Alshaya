// Design System - UI Components
// Tree-shakeable named exports

// Button
export { Button } from './Button';
export type { ButtonProps } from './Button';

// Card
export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './Card';

// Input
export { Input } from './Input';
export type { InputProps } from './Input';

// Select
export { Select } from './Select';
export type { SelectProps, SelectOption } from './Select';

// Dialog (Modal)
export {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from './Dialog';
export type { DialogProps, DialogContentProps } from './Dialog';

// Toast
export { ToastProvider, useToast } from './Toast';

// Badge
export { Badge } from './Badge';
export type { BadgeProps } from './Badge';

// Avatar
export { Avatar, AvatarImage, AvatarFallback, getInitials } from './Avatar';
export type { AvatarProps, AvatarImageProps, AvatarFallbackProps } from './Avatar';

// Skeleton
export { Skeleton, SkeletonCard, SkeletonTable, SkeletonAvatar } from './Skeleton';
export type { SkeletonProps } from './Skeleton';

// Table
export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from './Table';

// Tabs
export { Tabs, TabsList, TabsTrigger, TabsContent } from './Tabs';
export type { TabsProps, TabsTriggerProps, TabsContentProps } from './Tabs';

// DropdownMenu
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from './DropdownMenu';
export type { DropdownMenuContentProps, DropdownMenuItemProps } from './DropdownMenu';

// Separator
export { Separator } from './Separator';
export type { SeparatorProps } from './Separator';

// Alert
export { Alert, AlertTitle, AlertDescription } from './Alert';
export type { AlertProps } from './Alert';

// Spinner
export { Spinner, LoadingOverlay } from './Spinner';
export type { SpinnerProps, LoadingOverlayProps } from './Spinner';

// EmptyState (preserve existing)
export { EmptyState } from './EmptyState';
