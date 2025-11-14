'use client';

import { Button } from "@smartlogbook/ui/button";
import { Badge } from "@smartlogbook/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@smartlogbook/ui/card";
import { Separator } from "@smartlogbook/ui/separator";
import { 
  Edit, 
  Trash2, 
  Zap,
  Tag,
  FileText,
  AlertTriangle,
  CheckCircle,
  Settings
} from "lucide-react";
import Link from "next/link";
import { RelatedDataLinks } from "@/components/related-data-link";
import RelatedDataLink from "@/components/related-data-link";
import { useDateFormat } from '@smartlogbook/hooks/use-date-format';

interface ActionDetailViewProps {
  action: any;
  onEdit?: () => void;
  onDelete?: () => void;
  editHref?: string;
  showActions?: boolean;
}

export default function ActionDetailView({ 
  action, 
  onEdit, 
  onDelete, 
  editHref, 
  showActions = true 
}: ActionDetailViewProps) {
  const { formatDate } = useDateFormat();

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{action.description}</h1>
          <p className="text-muted-foreground">Action ID: {action.action_id}</p>
        </div>
        {showActions && (
          <div className="flex items-center space-x-2">
            {editHref ? (
              <Button asChild>
                <Link href={editHref}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Link>
              </Button>
            ) : onEdit ? (
              <Button onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            ) : null}
            {onDelete && (
              <Button variant="destructive" onClick={onDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Zap className="h-5 w-5 mr-2" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">ID</label>
                <p className="text-sm">{action.id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Action ID</label>
                <p className="text-sm">{action.action_id}</p>
              </div>
            </div>
            <Separator />
            <div>
              <label className="text-sm font-medium text-muted-foreground">Type</label>
              <div className="mt-1">
                <Badge variant="secondary">
                  {(action as any).action_type_name || action.action_type_id || 'N/A'}
                </Badge>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Act</label>
              <p className="text-sm">{action.act}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Response Type</label>
              <p className="text-sm">{action.type_response}</p>
            </div>
          </CardContent>
        </Card>

        {/* Description */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Description
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{action.description}</p>
          </CardContent>
        </Card>

        {/* Object IDs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Tag className="h-5 w-5 mr-2" />
              Related Objects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {action.object_ids?.map((id: number, idx: number) => (
                <div key={idx}>
                  {RelatedDataLinks.assetItem(id, true)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Defect Codes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Defect Codes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {action.defect_codes?.map((code: string, idx: number) => (
                <Badge key={idx} variant="destructive">
                  {code}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Used in Checklists */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="h-5 w-5 mr-2" />
              Used in Checklists
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {action.used_in_checklists?.map((checklist: string, idx: number) => (
                <div key={idx}>
                  <span className="bg-muted text-muted-foreground px-2 py-1 rounded text-xs">
                    {checklist}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* System Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="h-5 w-5 mr-2" />
              System Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Created</label>
              <p className="text-sm">{formatDate(action.created_at)}</p>
            </div>
            <Separator />
            <div>
              <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
              <p className="text-sm">{formatDate(action.updated_at)}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
