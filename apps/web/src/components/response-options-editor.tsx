'use client';

import { useState } from 'react';
import { Button } from '@kit/ui/button';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import { Badge } from '@kit/ui/badge';
import { RadioGroup, RadioGroupItem } from '@kit/ui/radio-group';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@kit/ui/table';
import { X, Plus, Edit2, Trash2, Type, CheckSquare, List, Upload, Star, FileText, Image as ImageIcon } from 'lucide-react';

interface ResponseOptionsEditorProps {
  responseTypeName: string;
  responseTypeId: number | undefined;
  options: string[];
  onOptionsChange: (options: string[]) => void;
  fieldErrors?: Record<string, string>;
}

export function ResponseOptionsEditor({
  responseTypeName,
  responseTypeId,
  options,
  onOptionsChange,
  fieldErrors
}: ResponseOptionsEditorProps) {
  const [newOption, setNewOption] = useState('');
  const [editingOptionIndex, setEditingOptionIndex] = useState<number | null>(null);
  const [editingOptionValue, setEditingOptionValue] = useState('');

  // Rating specific state
  const [ratingMax, setRatingMax] = useState(options[0] || '5');

  const handleAddOption = () => {
    if (newOption.trim()) {
      onOptionsChange([...options, newOption.trim()]);
      setNewOption('');
    }
  };

  const handleEditOption = (index: number) => {
    setEditingOptionIndex(index);
    setEditingOptionValue(options[index]);
  };

  const handleSaveEdit = () => {
    if (editingOptionIndex !== null && editingOptionValue.trim()) {
      onOptionsChange(options.map((opt, idx) => idx === editingOptionIndex ? editingOptionValue.trim() : opt));
      setEditingOptionIndex(null);
      setEditingOptionValue('');
    }
  };

  const handleCancelEdit = () => {
    setEditingOptionIndex(null);
    setEditingOptionValue('');
  };

  const handleRemoveOption = (index: number) => {
    onOptionsChange(options.filter((_, i) => i !== index));
  };

  const handleBooleanOptionChange = (value: string) => {
    onOptionsChange(value === 'true' ? ['True', 'False'] : ['False', 'True']);
  };

  const handleRatingConfigChange = (value: string) => {
    setRatingMax(value);
    onOptionsChange([value]);
  };

  // No options needed types
  if (['TEXT', 'TEXTAREA', 'DATETIME', 'CHECKBOX'].includes(responseTypeName)) {
    return (
      <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
        <p className="text-sm text-muted-foreground">
          {responseTypeName === 'TEXT' && 'Text input does not require predefined options.'}
          {responseTypeName === 'TEXTAREA' && 'Textarea input does not require predefined options.'}
          {responseTypeName === 'DATETIME' && 'Date and time picker does not require predefined options.'}
          {responseTypeName === 'CHECKBOX' && 'Checkbox does not require predefined options.'}
        </p>
        <div className="flex gap-2">
          <Input
            value={newOption}
            onChange={(e) => setNewOption(e.target.value)}
            placeholder="Optional: Enter default value or example"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddOption();
              }
            }}
          />
          <Button type="button" onClick={handleAddOption} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
        {options.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {options.map((option, index) => (
              <Badge key={index} variant="secondary" className="flex items-center gap-1">
                {option}
                <button
                  type="button"
                  onClick={() => handleRemoveOption(index)}
                  className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Boolean - Auto-populated True/False
  if (responseTypeName === 'BOOLEAN') {
    return (
      <div className="space-y-3 p-4 border rounded-lg">
        <Label className="text-sm font-medium">Select default value:</Label>
        <RadioGroup
          value={options[0] === 'True' ? 'true' : 'false'}
          onValueChange={handleBooleanOptionChange}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="true" id="true" />
            <Label htmlFor="true" className="font-normal cursor-pointer">True (default)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="false" id="false" />
            <Label htmlFor="false" className="font-normal cursor-pointer">False (default)</Label>
          </div>
        </RadioGroup>
        <div className="mt-2 p-2 bg-muted rounded text-sm">
          <p className="font-medium mb-1">Preview:</p>
          <div className="flex gap-2">
            {options.map((opt, idx) => (
              <Badge key={idx} variant={idx === 0 ? "default" : "outline"}>
                {opt}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    );
  }


  // Rating - Requires max value
  if (responseTypeName === 'RATING') {
    return (
      <div className="space-y-3 p-4 border rounded-lg">
        <Label className="text-sm font-medium">Rating Configuration *</Label>
        <div className="space-y-2">
          <Label htmlFor="rating-max" className="text-xs">Maximum Rating *</Label>
          <Input
            id="rating-max"
            type="number"
            value={ratingMax}
            onChange={(e) => handleRatingConfigChange(e.target.value)}
            placeholder="5"
            min="1"
            max="10"
            required
          />
          <p className="text-xs text-muted-foreground">
            Enter the maximum rating value (e.g., 5 for 5-star rating)
          </p>
        </div>
        {fieldErrors?.options && (
          <p className="text-sm text-red-500">{fieldErrors.options}</p>
        )}
        {ratingMax && (
          <div className="mt-2 p-2 bg-muted rounded text-sm">
            <p className="font-medium mb-1">Preview:</p>
            <div className="flex gap-1">
              {Array.from({ length: parseInt(ratingMax) || 5 }).map((_, i) => (
                <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {ratingMax}-star rating system
            </p>
          </div>
        )}
      </div>
    );
  }

  // Radio, Select, Multi-Select - Require options list
  if (['RADIO', 'SELECT', 'MULTISELECT'].includes(responseTypeName)) {
    return (
      <div className="space-y-3 p-4 border rounded-lg">
        <div className="flex gap-2">
          <Input
            value={newOption}
            onChange={(e) => setNewOption(e.target.value)}
            placeholder="Enter option value"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddOption();
              }
            }}
          />
          <Button type="button" onClick={handleAddOption} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
        {fieldErrors?.options && (
          <p className="text-sm text-red-500">{fieldErrors.options}</p>
        )}
        {options.length > 0 && (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Option Value</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {options.map((option, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>
                      {editingOptionIndex === index ? (
                        <Input
                          value={editingOptionValue}
                          onChange={(e) => setEditingOptionValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSaveEdit();
                            } else if (e.key === 'Escape') {
                              handleCancelEdit();
                            }
                          }}
                          autoFocus
                        />
                      ) : (
                        <span>{option}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingOptionIndex === index ? (
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleSaveEdit}
                          >
                            Save
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleCancelEdit}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditOption(index)}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveOption(index)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    );
  }

  // File Upload, Image Upload - Optional file types
  if (['FILE_UPLOAD', 'IMAGE_UPLOAD'].includes(responseTypeName)) {
    return (
      <div className="space-y-3 p-4 border rounded-lg">
        <p className="text-sm text-muted-foreground">
          Optional: Specify accepted file types/extensions (e.g., pdf, doc, jpg, png)
        </p>
        <div className="flex gap-2">
          <Input
            value={newOption}
            onChange={(e) => setNewOption(e.target.value)}
            placeholder={responseTypeName === 'IMAGE_UPLOAD' ? 'e.g., jpg, png, gif' : 'e.g., pdf, doc, docx'}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddOption();
              }
            }}
          />
          <Button type="button" onClick={handleAddOption} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add Type
          </Button>
        </div>
        {options.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {options.map((option, index) => (
              <Badge key={index} variant="secondary" className="flex items-center gap-1">
                .{option}
                <button
                  type="button"
                  onClick={() => handleRemoveOption(index)}
                  className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>
    );
  }


  // Default fallback
  return (
    <div className="p-4 border rounded-lg bg-muted/30">
      <p className="text-sm text-muted-foreground">
        No specific options configuration needed for this response type.
      </p>
    </div>
  );
}

