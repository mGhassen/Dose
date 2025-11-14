'use client';

import { useState, useEffect } from 'react';
import { useOperation, useUpdateOperation } from "@kit/hooks";
import { useOperationTypes } from "@kit/hooks";
import { useProcedures } from "@kit/hooks";
import { useRouter } from 'next/navigation';
import { Button } from '@kit/ui/button';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import { Textarea } from '@kit/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@kit/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@kit/ui/card';
import { ArrowLeft } from 'lucide-react';
import { useToast } from '@kit/hooks/use-toast';
import { UnifiedSelector } from '@/components/unified-selector';

export default function EditOperationForm({ 
  operationId,
  procedureId, 
  onSuccessRedirect 
}: { 
  operationId: string;
  procedureId?: number; 
  onSuccessRedirect?: string; 
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { data: operation, isLoading } = useOperation(parseInt(operationId));
  const { data: operationTypes } = useOperationTypes();
  const { data: proceduresResponse } = useProcedures({ pageSize: 1000 });
  const updateMutation = useUpdateOperation();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    operationTypeId: '',
    procedureId: procedureId != null ? String(procedureId) : '',
    sequence: '',
    comments: '',
    from: '',
    to: ''
  });

  useEffect(() => {
    if (operation) {
      setFormData({
        name: operation.name || '',
        description: operation.description || '',
        operationTypeId: operation.operationTypeId != null ? String(operation.operationTypeId) : '',
        procedureId: procedureId != null ? String(procedureId) : (operation.procedureId != null ? String(operation.procedureId) : ''),
        sequence: operation.sequence != null ? String(operation.sequence) : '',
        comments: operation.comments || '',
        from: operation.from ? new Date(operation.from).toISOString().slice(0, 16) : '',
        to: operation.to ? new Date(operation.to).toISOString().slice(0, 16) : ''
      });
    } else if (procedureId != null) {
      // Set procedureId even before operation loads if provided as prop
      setFormData(prev => ({
        ...prev,
        procedureId: String(procedureId)
      }));
    }
  }, [operation, procedureId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast({
        title: "Validation Error",
        description: "Name is required",
        variant: "destructive",
      });
      return;
    }

    const operationIdNum = parseInt(operationId);
    const submitData: any = {
      id: operationIdNum,
      name: formData.name,
      description: formData.description || null,
      comments: formData.comments || null,
    };

    if (formData.operationTypeId) {
      submitData.operationTypeId = parseInt(formData.operationTypeId);
    }

    if (formData.procedureId) {
      submitData.procedureId = parseInt(formData.procedureId);
    }

    if (formData.sequence) {
      submitData.sequence = parseInt(formData.sequence);
    }

    if (formData.from) {
      submitData.from = new Date(formData.from).toISOString();
    }

    if (formData.to) {
      submitData.to = new Date(formData.to).toISOString();
    }

    updateMutation.mutate({
      id: parseInt(operationId),
      data: submitData
    }, {
      onSuccess: () => {
        toast({
          title: "Success",
          description: "Operation updated successfully",
        });
        router.push(onSuccessRedirect || `/operations/${operationId}`);
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: error?.data?.title || error.message || "Failed to update operation",
          variant: "destructive",
        });
      },
    });
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!operation) {
    return (
      <div className="text-center py-8">
        <p>Operation not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Edit Operation</h1>
          <p className="text-muted-foreground">
            Update operation information
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Operation Details</CardTitle>
            <CardDescription>
              Update the details for this operation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Enter operation name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Enter operation description"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <UnifiedSelector
                  mode="single"
                  type="operation-type"
                  items={(operationTypes || []).map((ot: any) => ({
                    id: ot.id,
                    name: ot.name || `Operation Type ${ot.id}`,
                  }))}
                  selectedId={formData.operationTypeId !== '' ? parseInt(formData.operationTypeId) : undefined}
                  onSelect={(item) => {
                    handleChange('operationTypeId', item.id.toString());
                  }}
                  placeholder="Select operation type"
                  searchPlaceholder="Search operation types..."
                  label="Operation Type"
                  required
                  isLoading={false}
                  getDisplayName={(item) => item.name || `Operation Type ${item.id}`}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <UnifiedSelector
                  mode="single"
                  type="procedure"
                  items={(proceduresResponse?.items || []).map((p: any) => ({
                    id: p.id,
                    name: p.name || `Procedure ${p.id}`,
                  }))}
                  selectedId={formData.procedureId ? parseInt(formData.procedureId) : undefined}
                  onSelect={(item) => {
                    handleChange('procedureId', item.id.toString());
                  }}
                  placeholder="Select procedure"
                  searchPlaceholder="Search procedures..."
                  label="Procedure"
                  required={true}
                  disabled={!!procedureId || (operation?.procedureId != null && operation.procedureId > 0)}
                  isLoading={false}
                  getDisplayName={(item) => item.name || `Procedure ${item.id}`}
                />

                <div className="space-y-2">
                  <Label htmlFor="sequence">Sequence</Label>
                  <Input
                    id="sequence"
                    type="number"
                    value={formData.sequence}
                    onChange={(e) => handleChange('sequence', e.target.value)}
                    placeholder="Enter sequence number"
                    min="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="from">From</Label>
                  <Input
                    id="from"
                    type="datetime-local"
                    value={formData.from}
                    onChange={(e) => handleChange('from', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="to">To</Label>
                  <Input
                    id="to"
                    type="datetime-local"
                    value={formData.to}
                    onChange={(e) => handleChange('to', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="comments">Comments</Label>
                <Textarea
                  id="comments"
                  value={formData.comments}
                  onChange={(e) => handleChange('comments', e.target.value)}
                  placeholder="Enter comments"
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Updating...' : 'Update Operation'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
  );
}
