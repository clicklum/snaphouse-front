import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { FileText, Paperclip, History, Send } from "lucide-react";
import type { Task } from "@/lib/types";

const priorityLabel: Record<string, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

const priorityVariant: Record<string, "destructive" | "default" | "secondary"> = {
  high: "destructive",
  medium: "default",
  low: "secondary",
};

const getInitials = (name: string) =>
  name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
};

interface TaskDetailDrawerProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TaskDetailDrawer = ({ task, open, onOpenChange }: TaskDetailDrawerProps) => {
  const [newNote, setNewNote] = useState("");

  if (!task) return null;

  const isOverdue = new Date(task.deadline) < new Date();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="font-display text-lg">{task.episodeTitle}</SheetTitle>
          <SheetDescription>{task.showName}</SheetDescription>
        </SheetHeader>

        {/* Meta info */}
        <div className="grid grid-cols-2 gap-4 text-sm mb-6">
          <div>
            <p className="text-muted-foreground text-xs mb-1">Assignee</p>
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-[10px] bg-secondary text-secondary-foreground">
                  {getInitials(task.assignee.name)}
                </AvatarFallback>
              </Avatar>
              <span className="text-foreground">{task.assignee.name}</span>
            </div>
          </div>
          <div>
            <p className="text-muted-foreground text-xs mb-1">Priority</p>
            <Badge variant={priorityVariant[task.priority]} className="capitalize">
              {priorityLabel[task.priority]}
            </Badge>
          </div>
          <div>
            <p className="text-muted-foreground text-xs mb-1">Stage</p>
            <span className="text-foreground capitalize">{task.stage.replace(/_/g, " ")}</span>
          </div>
          <div>
            <p className="text-muted-foreground text-xs mb-1">Deadline</p>
            <span className={isOverdue ? "text-destructive font-medium" : "text-foreground"}>
              {new Date(task.deadline).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
              {isOverdue && " (Overdue)"}
            </span>
          </div>
        </div>

        {task.description && (
          <>
            <p className="text-sm text-muted-foreground mb-6">{task.description}</p>
          </>
        )}

        <Separator className="mb-4" />

        <Tabs defaultValue="notes" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="notes" className="flex-1 gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Notes
            </TabsTrigger>
            <TabsTrigger value="attachments" className="flex-1 gap-1.5">
              <Paperclip className="h-3.5 w-3.5" />
              Files
            </TabsTrigger>
            <TabsTrigger value="history" className="flex-1 gap-1.5">
              <History className="h-3.5 w-3.5" />
              History
            </TabsTrigger>
          </TabsList>

          {/* Notes */}
          <TabsContent value="notes" className="mt-4 space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Add a note..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newNote.trim()) {
                    setNewNote("");
                  }
                }}
              />
              <Button
                size="icon"
                variant="ghost"
                disabled={!newNote.trim()}
                onClick={() => setNewNote("")}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            {task.notes && task.notes.length > 0 ? (
              <div className="space-y-3">
                {task.notes.map((note) => (
                  <div key={note.id} className="rounded-lg bg-muted p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-foreground">{note.author}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(note.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{note.text}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">No notes yet.</p>
            )}
          </TabsContent>

          {/* Attachments */}
          <TabsContent value="attachments" className="mt-4">
            {task.attachments && task.attachments.length > 0 ? (
              <div className="space-y-2">
                {task.attachments.map((file) => (
                  <a
                    key={file.id}
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatBytes(file.size)} ·{" "}
                        {new Date(file.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">No attachments.</p>
            )}
          </TabsContent>

          {/* Revision History */}
          <TabsContent value="history" className="mt-4">
            {task.revisions && task.revisions.length > 0 ? (
              <div className="space-y-3">
                {task.revisions.map((rev) => (
                  <div key={rev.id} className="flex gap-3 text-sm">
                    <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-muted-foreground" />
                    <div>
                      <p className="text-foreground">
                        <span className="font-medium">{rev.changedBy}</span> changed{" "}
                        <span className="text-muted-foreground">{rev.field}</span> from{" "}
                        <span className="line-through text-muted-foreground">{rev.oldValue}</span>{" "}
                        to <span className="font-medium">{rev.newValue}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(rev.changedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">No revision history.</p>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};

export default TaskDetailDrawer;
