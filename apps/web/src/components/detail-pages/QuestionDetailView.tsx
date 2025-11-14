'use client';

import { Button } from "@smartlogbook/ui/button";
import { Badge } from "@smartlogbook/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@smartlogbook/ui/card";
import { Separator } from "@smartlogbook/ui/separator";
import { 
  Edit, 
  Trash2, 
  HelpCircle,
  Tag,
  FileText,
  CheckCircle,
  Clock,
  XCircle
} from "lucide-react";
import Link from "next/link";
import { useDateFormat } from '@smartlogbook/hooks/use-date-format';

interface QuestionDetailViewProps {
  question: any;
  onEdit?: () => void;
  onDelete?: () => void;
  editHref?: string;
  showActions?: boolean;
}

export default function QuestionDetailView({ 
  question, 
  onEdit, 
  onDelete, 
  editHref, 
  showActions = true 
}: QuestionDetailViewProps) {
  const { formatDate } = useDateFormat();

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy": return "bg-green-100 text-green-800";
      case "Medium": return "bg-yellow-100 text-yellow-800";
      case "Hard": return "bg-red-100 text-red-800";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getDifficultyIcon = (difficulty: string) => {
    switch (difficulty) {
      case "Easy": return <CheckCircle className="h-4 w-4" />;
      case "Medium": return <Clock className="h-4 w-4" />;
      case "Hard": return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-3xl font-bold">Question #{question.id}</h1>
            <p className="text-muted-foreground">Question ID: {question.id}</p>
          </div>
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
              <HelpCircle className="h-5 w-5 mr-2" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">ID</label>
                <p className="text-sm">{question.id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Type</label>
                <div className="mt-1">
                  <Badge variant="secondary">
                    {question.type}
                  </Badge>
                </div>
              </div>
            </div>
            <Separator />
            <div>
              <label className="text-sm font-medium text-muted-foreground">Category</label>
              <div className="mt-1">
                <Badge variant="outline">
                  {question.category}
                </Badge>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Difficulty</label>
              <div className="mt-1">
                <Badge className={getDifficultyColor(question.difficulty)}>
                  <span className="flex items-center gap-1">
                    {getDifficultyIcon(question.difficulty)}
                    {question.difficulty}
                  </span>
                </Badge>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Active Status</label>
              <div className="mt-1">
                <Badge className={question.isActive ? 'bg-green-100 text-green-800' : 'bg-secondary text-secondary-foreground'}>
                  {question.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Question Text */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Question Text
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{question.text}</p>
          </CardContent>
        </Card>

        {/* Options */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Tag className="h-5 w-5 mr-2" />
              Answer Options
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {question.options?.map((option: string, idx: number) => (
                <div key={idx} className="flex items-center space-x-2">
                  <Badge variant={option === question.correctAnswer ? "default" : "secondary"}>
                    {String.fromCharCode(65 + idx)}
                  </Badge>
                  <span className="text-sm">{option}</span>
                  {option === question.correctAnswer && (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Explanation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Explanation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{question.explanation}</p>
          </CardContent>
        </Card>

        {/* System Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <HelpCircle className="h-5 w-5 mr-2" />
              System Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Created</label>
              <p className="text-sm">{formatDate(question.createdAt)}</p>
            </div>
            <Separator />
            <div>
              <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
              <p className="text-sm">{formatDate(question.updatedAt)}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
