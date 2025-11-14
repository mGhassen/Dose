// React 19 compatibility fix for component libraries
// This patches ReactNode to be compatible with Radix UI and other libraries

// Global type augmentation to fix React 19 ReactNode compatibility
declare global {
  namespace React {
    // Override ReactNode to exclude Promise for compatibility with component libraries
    type ReactNode =
      | React.ReactElement
      | string
      | number
      | bigint
      | boolean
      | null
      | undefined
      | React.ReactFragment
      | React.ReactPortal;
  }
}

export {};

