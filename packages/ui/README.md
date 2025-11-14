# @kit/ui

Shared UI components and Tailwind CSS configuration for SmartLogBook.

## Usage

### Importing Components

Components can be imported individually:
```typescript
import { Button } from '@kit/ui/button';
import { Card } from '@kit/ui/card';
import { cn } from '@kit/ui/utils';
```

Or from the main export:
```typescript
import { Button, Card } from '@kit/ui';
```

### Using Tailwind Config

In your app's `tailwind.config.js`:

```js
const baseConfig = require('@kit/ui/tailwind.config.js');

module.exports = {
  ...baseConfig,
  content: [
    // Your app-specific content paths
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    // Include UI package
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
};
```

Or extend it:

```js
const baseConfig = require('@kit/ui/tailwind.config.js');

module.exports = {
  ...baseConfig,
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    ...baseConfig.theme,
    extend: {
      ...baseConfig.theme.extend,
      // Your custom theme extensions
    },
  },
};
```

## Installing Shadcn UI Components

To install a Shadcn UI component:

```bash
npx shadcn@latest add <component> -c packages/ui
```

For example:
```bash
npx shadcn@latest add button -c packages/ui
```

