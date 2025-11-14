"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { cn } from "@smartlogbook/lib/utils";
import { ExternalLink } from "lucide-react";
import { Badge } from "@smartlogbook/ui/badge";

interface RelatedDataLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  showIcon?: boolean;
}

export default function RelatedDataLink({ 
  href, 
  children, 
  className,
  onClick,
  showIcon = true
}: RelatedDataLinkProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click when clicking on link
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <Link 
      href={href}
      className={cn(
        "text-foreground hover:text-primary hover:underline transition-colors inline-flex items-center gap-1",
        className
      )}
      onClick={handleClick}
    >
      {children}
      {showIcon && (
        <ExternalLink className="h-3 w-3 opacity-50 hover:opacity-100 transition-opacity" />
      )}
    </Link>
  );
}

// Helper function to create links for common related data patterns
export function createRelatedDataLink(
  value: any,
  entityType: string,
  basePath: string,
  displayField?: string,
  showIcon?: boolean
): ReactNode {
  if (!value) return <span className="text-muted-foreground">N/A</span>;

  // Handle object values (e.g., { id: 1, name: "Location A" })
  if (typeof value === 'object' && value.id) {
    const displayText = displayField ? value[displayField] : (value.name || value.code || value.id);
    return (
      <RelatedDataLink href={`${basePath}/${value.id}`} showIcon={showIcon}>
        {displayText}
      </RelatedDataLink>
    );
  }

  // Handle primitive values (e.g., just the ID)
  if (typeof value === 'number' || typeof value === 'string') {
    return (
      <RelatedDataLink href={`${basePath}/${value}`} showIcon={showIcon}>
        {value}
      </RelatedDataLink>
    );
  }

  // If it's an object without id, try to extract a meaningful value
  if (typeof value === 'object') {
    const displayText = displayField ? value[displayField] : (value.name || value.code || 'N/A');
    return <span className="text-muted-foreground">{displayText}</span>;
  }

  // Fallback for any other type
  return <span className="text-muted-foreground">N/A</span>;
}

// Predefined link creators for common entities
export const RelatedDataLinks = {
  user: (userId: any, showIcon?: boolean) => {
    if (!userId) return <span className="text-muted-foreground">N/A</span>;
    
    if (typeof userId === 'object' && userId.id) {
      return (
        <RelatedDataLink href={`/users/${userId.id}`} showIcon={showIcon}>
          {userId.firstName} {userId.lastName}
        </RelatedDataLink>
      );
    }
    
    // For primitive values, assume it's an ID
    if (typeof userId === 'number' || typeof userId === 'string') {
      return (
        <RelatedDataLink href={`/users/${userId}`} showIcon={showIcon}>
          User {userId}
        </RelatedDataLink>
      );
    }
    
    // If it's an object without id, try to extract a meaningful value
    if (typeof userId === 'object') {
      const displayValue = userId.name || userId.email || userId.firstName || 'N/A';
      return <span className="text-muted-foreground">{displayValue}</span>;
    }
    
    // Fallback for any other type
    return <span className="text-muted-foreground">N/A</span>;
  },
  location: (location: any, showIcon?: boolean) => {
    if (!location) return <span className="text-muted-foreground">N/A</span>;
    
    if (typeof location === 'object' && location.id) {
      return (
        <RelatedDataLink href={`/locations/${location.id}`} showIcon={showIcon}>
          {location.name || location.code || location.id}
        </RelatedDataLink>
      );
    }
    
    // For primitive values, check if it's a number (ID) or string
    if (typeof location === 'number') {
      return (
        <RelatedDataLink href={`/locations/${location}`} showIcon={showIcon}>
          {location}
        </RelatedDataLink>
      );
    }
    
    if (typeof location === 'string') {
      // Check if it's a numeric string (ID) or a name
      const numericValue = parseInt(location);
      if (!isNaN(numericValue)) {
        // It's a numeric ID
        return (
          <RelatedDataLink href={`/locations/${location}`} showIcon={showIcon}>
            {location}
          </RelatedDataLink>
        );
      } else {
        // It's a name, we can't create a proper link without the ID
        return <span className="text-muted-foreground">{location}</span>;
      }
    }
    
    // If it's an object without id, try to extract a meaningful value or show N/A
    if (typeof location === 'object') {
      const displayValue = location.name || location.code || location.current_location_id || 'N/A';
      return <span className="text-muted-foreground">{displayValue}</span>;
    }
    
    // Fallback for any other type
    return <span className="text-muted-foreground">N/A</span>;
  },
  question: (questionId: any, showIcon?: boolean) => createRelatedDataLink(questionId, 'question', '/questions', undefined, showIcon),
  action: (actionId: any, showIcon?: boolean) => createRelatedDataLink(actionId, 'action', '/actions', undefined, showIcon),
  operation: (operationId: any, showIcon?: boolean) => createRelatedDataLink(operationId, 'operation', '/operations', undefined, showIcon),
  assetItem: (assetItem: any, showIcon?: boolean) => createRelatedDataLink(assetItem, 'asset-item', '/asset-items', 'name', showIcon),
  operationType: (operationType: any, showIcon?: boolean) => createRelatedDataLink(operationType, 'operation-type', '/operation-types', 'name', showIcon),
  checklist: (checklist: any, showIcon?: boolean) => {
    if (!checklist) return <span className="text-muted-foreground">N/A</span>;
    
    if (typeof checklist === 'object' && checklist.id) {
      return (
        <RelatedDataLink href={`/checklists/${checklist.id}`} showIcon={showIcon}>
          {checklist.name || checklist.title || checklist.id}
        </RelatedDataLink>
      );
    }
    
    // For primitive values, assume it's an ID
    if (typeof checklist === 'number' || typeof checklist === 'string') {
      return (
        <RelatedDataLink href={`/checklists/${checklist}`} showIcon={showIcon}>
          Checklist {checklist}
        </RelatedDataLink>
      );
    }
    
    // If it's an object without id, try to extract a meaningful value
    if (typeof checklist === 'object') {
      const displayValue = checklist.name || checklist.title || 'N/A';
      return <span className="text-muted-foreground">{displayValue}</span>;
    }
    
    // Fallback for any other type
    return <span className="text-muted-foreground">N/A</span>;
  },
  event: (event: any, showIcon?: boolean) => {
    if (!event) return <span className="text-muted-foreground">N/A</span>;
    
    if (typeof event === 'object' && event.id) {
      return (
        <RelatedDataLink href={`/events/${event.id}`} showIcon={showIcon}>
          {event.name || event.title || event.id}
        </RelatedDataLink>
      );
    }
    
    // For primitive values, assume it's an ID
    if (typeof event === 'number' || typeof event === 'string') {
      return (
        <RelatedDataLink href={`/events/${event}`} showIcon={showIcon}>
          Event {event}
        </RelatedDataLink>
      );
    }
    
    // If it's an object without id, try to extract a meaningful value
    if (typeof event === 'object') {
      const displayValue = event.name || event.title || event.type || 'N/A';
      return <span className="text-muted-foreground">{displayValue}</span>;
    }
    
    // Fallback for any other type
    return <span className="text-muted-foreground">N/A</span>;
  },
  procedure: (procedure: any, showIcon?: boolean) => createRelatedDataLink(procedure, 'procedure', '/procedures', 'name', showIcon),
  act: (act: any, showIcon?: boolean) => {
    if (!act) return <span className="text-muted-foreground">N/A</span>;
    
    if (typeof act === 'object' && act.id) {
      return (
        <RelatedDataLink href={`/acts/${act.id}`} showIcon={showIcon}>
          {act.id}
        </RelatedDataLink>
      );
    }
    
    // For primitive values, assume it's an ID
    if (typeof act === 'number' || typeof act === 'string') {
      return (
        <RelatedDataLink href={`/acts/${act}`} showIcon={showIcon}>
          {act}
        </RelatedDataLink>
      );
    }
    
    // If it's an object without id, try to extract a meaningful value
    if (typeof act === 'object') {
      const displayValue = act.name || act.title || act.type || 'N/A';
      return <span className="text-muted-foreground">{displayValue}</span>;
    }
    
    // Fallback for any other type
    return <span className="text-muted-foreground">N/A</span>;
  },
  actionType: (actionType: any, showIcon?: boolean) => {
    // ActionTypes are enums, not entities with pages - just display as text/badge
    if (!actionType) return <span className="text-muted-foreground">N/A</span>;
    
    if (typeof actionType === 'object' && actionType.name) {
      return <Badge variant="secondary">{actionType.name}</Badge>;
    }
    
    if (typeof actionType === 'object' && actionType.label) {
      return <Badge variant="secondary">{actionType.label}</Badge>;
    }
    
    // For primitive values (ID), display as badge
    if (typeof actionType === 'number' || typeof actionType === 'string') {
      return <Badge variant="secondary">Action Type {actionType}</Badge>;
    }
    
    // If it's an object without id, try to extract a meaningful value
    if (typeof actionType === 'object') {
      const displayValue = actionType.name || actionType.type || actionType.label || 'N/A';
      return <Badge variant="secondary">{displayValue}</Badge>;
    }
    
    // Fallback for any other type
    return <span className="text-muted-foreground">N/A</span>;
  },
};

// Clickable Badge component for related data
interface ClickableBadgeProps {
  href: string;
  children: ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  showIcon?: boolean;
}

export function ClickableBadge({ 
  href, 
  children, 
  className,
  onClick,
  showIcon = true
}: ClickableBadgeProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click when clicking on badge
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <Link 
      href={href}
      className="inline-flex items-center gap-1 hover:opacity-80 transition-opacity"
      onClick={handleClick}
    >
      <Badge className={cn("cursor-pointer", className)}>
        {children}
        {showIcon && (
          <ExternalLink className="h-3 w-3 ml-1 opacity-50 hover:opacity-100 transition-opacity" />
        )}
      </Badge>
    </Link>
  );
}

// Helper functions for clickable badges
export const ClickableBadges = {
  actionType: (actionType: any, className?: string) => {
    // ActionTypes are enums, not entities with pages - just display as badge
    if (!actionType) return <span className="text-muted-foreground">N/A</span>;
    
    if (typeof actionType === 'object' && actionType.name) {
      return <Badge className={className}>{actionType.name}</Badge>;
    }
    
    if (typeof actionType === 'object' && actionType.label) {
      return <Badge className={className}>{actionType.label}</Badge>;
    }
    
    // For primitive values, display as badge
    return (
      <Badge className={className}>
        {actionType}
      </Badge>
    );
  },
  operationType: (operationType: any, className?: string) => {
    if (!operationType) return <span className="text-muted-foreground">N/A</span>;
    
    if (typeof operationType === 'object' && operationType.id) {
      return (
        <ClickableBadge href={`/operation-types/${operationType.id}`} className={className}>
          {operationType.id}
        </ClickableBadge>
      );
    }
    
    // For primitive values, assume it's an ID
    return (
      <ClickableBadge href={`/operation-types/${operationType}`} className={className}>
        {operationType}
      </ClickableBadge>
    );
  },
  status: (status: any, className?: string) => {
    if (!status) return <span className="text-muted-foreground">N/A</span>;
    
    // Status is not a relational entity, just show as badge
    return (
      <Badge className={className}>
        {status}
      </Badge>
    );
  },
  severity: (severity: any, className?: string) => {
    if (!severity) return <span className="text-muted-foreground">N/A</span>;
    
    // Severity is not a relational entity, just show as badge
    return (
      <Badge className={className}>
        {severity}
      </Badge>
    );
  },
  priority: (priority: any, className?: string) => {
    if (!priority) return <span className="text-muted-foreground">N/A</span>;
    
    // Priority is not a relational entity, just show as badge
    return (
      <Badge className={className}>
        {priority}
      </Badge>
    );
  },
  type: (type: any, className?: string) => {
    if (!type) return <span className="text-muted-foreground">N/A</span>;
    
    // Most types don't have detail pages, just show as badge
    // Only create links for types that actually have detail pages
    return (
      <Badge className={className}>
        {type}
      </Badge>
    );
  },
  category: (category: any, className?: string) => {
    if (!category) return <span className="text-muted-foreground">N/A</span>;
    
    // Category is not a relational entity, just show as badge
    return (
      <Badge className={className}>
        {category}
      </Badge>
    );
  }
};
