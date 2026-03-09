"use client";

import TaxRulesLayoutClient from "./tax-rules-layout-client";

export default function TaxRulesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <TaxRulesLayoutClient>{children}</TaxRulesLayoutClient>;
}
