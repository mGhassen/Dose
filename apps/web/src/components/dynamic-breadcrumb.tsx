"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useTranslations } from 'next-intl';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@kit/ui/breadcrumb";

// Function to generate breadcrumb items from pathname
function generateBreadcrumbs(pathname: string, t: any) {
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs: Array<{ href: string; label: string }> = [];

  // Remove locale from pathname if present
  const pathWithoutLocale = segments[0] && ['en', 'fr'].includes(segments[0]) 
    ? segments.slice(1) 
    : segments;

  let currentPath = "";
  pathWithoutLocale.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const isLast = index === pathWithoutLocale.length - 1;
    
    // Handle dynamic routes like [id]
    if (segment.match(/^\d+$/)) {
      // This is likely an ID, try to get the parent route label
      const parentPath = currentPath.replace(`/${segment}`, "");
      const parentLabel = getRouteLabel(parentPath, t);
      if (parentLabel) {
        breadcrumbs.push({
          href: currentPath,
          label: `${parentLabel} #${segment}`,
        });
      } else {
        breadcrumbs.push({
          href: currentPath,
          label: `Item #${segment}`,
        });
      }
    } else if (['edit', 'view', 'details'].includes(segment)) {
      // Handle edit/view/details pages
      const parentPath = currentPath.replace(`/${segment}`, "");
      const parentLabel = getRouteLabel(parentPath, t);
      const actionLabel = getActionLabel(segment, t);
      if (parentLabel) {
        breadcrumbs.push({
          href: currentPath,
          label: `${actionLabel} ${parentLabel}`,
        });
      } else {
        breadcrumbs.push({
          href: currentPath,
          label: actionLabel,
        });
      }
    } else {
      // Regular route segment
      const label = getRouteLabel(currentPath, t) || segment.charAt(0).toUpperCase() + segment.slice(1);
      breadcrumbs.push({
        href: currentPath,
        label,
      });
    }
  });

  return breadcrumbs;
}

function getRouteLabel(path: string, t: any): string {
  const routeMap: Record<string, string> = {
    "/": t('breadcrumbs.home'),
    "/dashboard": t('breadcrumbs.dashboard'),
    "/checklists": t('breadcrumbs.checklists'),
    "/checklists/list": t('breadcrumbs.checklistList'),
    "/checklists/create": t('breadcrumbs.createChecklist'),
    "/objects": t('breadcrumbs.objects'),
    "/objects/create": t('breadcrumbs.createObject'),
    "/actions": t('breadcrumbs.actions'),
    "/actions/create": t('breadcrumbs.createAction'),
    "/action-ref-types": t('breadcrumbs.actionReferences'),
    "/action-ref-types/create": t('breadcrumbs.createActionReference'),
    "/locations": t('breadcrumbs.locations'),
    "/locations/create": t('breadcrumbs.createLocation'),
    "/events": t('breadcrumbs.events'),
    "/events/create": t('breadcrumbs.createEvent'),
    "/operation-types": t('breadcrumbs.operationTypes'),
    "/operation-types/create": t('breadcrumbs.createOperationType'),
    "/users": t('breadcrumbs.users'),
    "/users/create": t('breadcrumbs.createUser'),
  };
  
  return routeMap[path] || '';
}

function getActionLabel(action: string, t: any): string {
  const actionMap: Record<string, string> = {
    "edit": t('breadcrumbs.edit'),
    "view": t('breadcrumbs.view'),
    "details": t('breadcrumbs.details'),
  };
  
  return actionMap[action] || action;
}

export function DynamicBreadcrumb() {
  const pathname = usePathname();
  const t = useTranslations('breadcrumbs');
  const breadcrumbs = generateBreadcrumbs(pathname, t);

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbs.map((breadcrumb, index) => {
          const isLast = index === breadcrumbs.length - 1;
          
          return (
            <div key={breadcrumb.href} className="flex items-center">
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{breadcrumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={breadcrumb.href}>{breadcrumb.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </div>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
