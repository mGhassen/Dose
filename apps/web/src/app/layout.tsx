import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from '@kit/ui/tooltip';
import { AuthProvider } from '@kit/hooks/use-auth';
import Providers from "./providers";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SmartLogBook - Railway Locomotive Inspection System",
  description: "Railway locomotive inspection and maintenance management system",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const messages = await getMessages();
  // Build migration config on server and expose to window for MSW runtime
  const migrationConfig = {
    events: process.env.MIGRATION_USE_API_EVENTS === 'true',
    users: process.env.MIGRATION_USE_API_USERS === 'true',
    actiontypes: process.env.MIGRATION_USE_API_ACTIONTYPES === 'true',
    actionreftypes: process.env.MIGRATION_USE_API_ACTIONREFTYPES === 'true',
    actionreferences: process.env.MIGRATION_USE_API_ACTIONREFERENCES === 'true',
    actions: process.env.MIGRATION_USE_API_ACTIONS === 'true',
    acts: process.env.MIGRATION_USE_API_ACTS === 'true',
    anomalies: process.env.MIGRATION_USE_API_ANOMALIES === 'true',
    checklists: process.env.MIGRATION_USE_API_CHECKLISTS === 'true',
    locomotives: process.env.MIGRATION_USE_API_LOCOMOTIVES === 'true',
    locomotivemodels: process.env.MIGRATION_USE_API_LOCOMOTIVEMODELS === 'true',
    locations: process.env.MIGRATION_USE_API_LOCATIONS === 'true',
    locationlevels: process.env.MIGRATION_USE_API_LOCATIONLEVELS === 'true',
    objects: process.env.MIGRATION_USE_API_OBJECTS === 'true',
    operationtypes: process.env.MIGRATION_USE_API_OPERATIONTYPES === 'true',
    operations: process.env.MIGRATION_USE_API_OPERATIONS === 'true',
    procedures: process.env.MIGRATION_USE_API_PROCEDURES === 'true',
    questions: process.env.MIGRATION_USE_API_QUESTIONS === 'true',
    responses: process.env.MIGRATION_USE_API_RESPONSES === 'true',
    issues: process.env.MIGRATION_USE_API_ISSUES === 'true',
    assetitems: process.env.MIGRATION_USE_API_ASSETITEMS === 'true',
    assetmodels: process.env.MIGRATION_USE_API_ASSETMODELS === 'true',
    metadataEnums: process.env.MIGRATION_USE_API_METADATAENUMS === 'true',
    profiles: process.env.MIGRATION_USE_API_PROFILES === 'true',
    settings: process.env.MIGRATION_USE_API_SETTINGS === 'true',
    auth: process.env.MIGRATION_USE_API_AUTH === 'true',
  } as const;
  
  return (
    <html suppressHydrationWarning>
      <body className={`${outfit.variable} antialiased`}>
        {/* Expose migration config to client runtime for MSW */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__MIGRATION__=${JSON.stringify(migrationConfig)};`,
          }}
        />
        <NextIntlClientProvider messages={messages}>
          <TooltipProvider>
            <Providers>
              <AuthProvider>
                {children}
              </AuthProvider>
            </Providers>
          </TooltipProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}