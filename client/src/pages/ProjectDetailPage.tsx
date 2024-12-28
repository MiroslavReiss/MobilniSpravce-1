import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, User, Trash2, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useUser } from "@/hooks/use-user";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Project {
  id: number;
  title: string;
  description: string;
  progress: number;
}

interface Note {
  id: number;
  content: string;
  createdAt: string;
  userId: number;
  username: string;
  displayName?: string;
}

export default function ProjectDetailPage() {
  const [, params] = useRoute("/projects/:id");
  const [, setLocation] = useLocation();
  const projectId = params?.id;
  const [newNote, setNewNote] = useState("");
  const [progressValue, setProgressValue] = useState<number>(0);
  const [isProgressDirty, setIsProgressDirty] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editContent, setEditContent] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useUser();
  const isMadKoala = user?.username === 'madkoala';

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: [`/api/projects/${projectId}`],
  });

  useEffect(() => {
    if (project) {
      setProgressValue(project.progress);
    }
  }, [project]);

  const { data: notes, isLoading: notesLoading } = useQuery<Note[]>({
    queryKey: [`/api/projects/${projectId}/notes`],
  });

  const updateProgressMutation = useMutation({
    mutationFn: async (progress: number) => {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progress }),
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to update progress');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
      setProgressValue(data.progress);
      setIsProgressDirty(false);
      toast({
        title: "Úspěch",
        description: "Progress byl úspěšně uložen",
      });
    },
    onError: (error) => {
      toast({
        title: "Chyba",
        description: error.message || "Nepodařilo se aktualizovat progress",
        variant: "destructive",
      });
      if (project) {
        setProgressValue(project.progress);
      }
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await fetch(`/api/projects/${projectId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to add note');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/notes`] });
      setNewNote("");
    },
    onError: () => {
      toast({
        title: "Chyba",
        description: "Nepodařilo se přidat poznámku",
        variant: "destructive",
      });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: number) => {
      const response = await fetch(`/api/projects/${projectId}/notes/${noteId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete note');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/notes`] });
      toast({
        title: "Úspěch",
        description: "Poznámka byla smazána",
      });
    },
    onError: () => {
      toast({
        title: "Chyba",
        description: "Nepodařilo se smazat poznámku",
        variant: "destructive",
      });
    },
  });

  const editNoteMutation = useMutation({
    mutationFn: async ({ noteId, content }: { noteId: number; content: string }) => {
      const response = await fetch(`/api/projects/${projectId}/notes/${noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to edit note');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/notes`] });
      setEditingNote(null);
      toast({
        title: "Úspěch",
        description: "Poznámka byla upravena",
      });
    },
    onError: () => {
      toast({
        title: "Chyba",
        description: "Nepodařilo se upravit poznámku",
        variant: "destructive",
      });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete project');
    },
    onSuccess: () => {
      setLocation('/projects');
      toast({
        title: "Úspěch",
        description: "Projekt byl smazán",
      });
    },
    onError: () => {
      toast({
        title: "Chyba",
        description: "Nepodařilo se smazat projekt",
        variant: "destructive",
      });
    },
  });

  const handleProgressChange = (value: number[]) => {
    const newValue = value[0];
    if (newValue >= 0 && newValue <= 100) {
      setProgressValue(newValue);
      setIsProgressDirty(true);
    }
  };

  const handleSaveProgress = () => {
    if (progressValue >= 0 && progressValue <= 100) {
      updateProgressMutation.mutate(progressValue);
    } else {
      toast({
        title: "Chyba",
        description: "Progress musí být mezi 0 a 100",
        variant: "destructive",
      });
    }
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (newNote.trim()) {
      addNoteMutation.mutate(newNote.trim());
    }
  };

  const handleEdit = (note: Note) => {
    setEditingNote(note);
    setEditContent(note.content);
  };

  const handleSaveEdit = () => {
    if (editingNote && editContent.trim()) {
      editNoteMutation.mutate({
        noteId: editingNote.id,
        content: editContent.trim(),
      });
    }
  };

  if (projectLoading || notesLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
  }

  if (!project) {
    return <div className="p-4">Projekt nenalezen</div>;
  }

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{project.title}</CardTitle>
            {project.description && (
              <p className="text-sm text-muted-foreground">
                {project.description}
              </p>
            )}
          </div>
          {isMadKoala && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium">Progress: {progressValue}%</label>
                {isProgressDirty && (
                  <Button
                    size="sm"
                    onClick={handleSaveProgress}
                    disabled={updateProgressMutation.isPending}
                  >
                    {updateProgressMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Ukládání...
                      </>
                    ) : (
                      "Uložit"
                    )}
                  </Button>
                )}
              </div>
              <Slider
                value={[progressValue]}
                max={100}
                step={1}
                onValueChange={handleProgressChange}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Poznámky</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddNote} className="space-y-4">
            <Textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Přidat poznámku..."
            />
            <Button type="submit" disabled={addNoteMutation.isPending}>
              {addNoteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Přidávání...
                </>
              ) : (
                "Přidat poznámku"
              )}
            </Button>
          </form>

          <div className="mt-4 space-y-4">
            {notes?.map((note) => (
              <Card key={note.id}>
                <CardContent className="py-3">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {note.displayName?.[0] || note.username[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <span className="font-medium">
                          {note.displayName || note.username}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {new Date(note.createdAt).toLocaleString()}
                          </span>
                          {isMadKoala && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(note)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteNoteMutation.mutate(note.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap">{note.content}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Drawer open={!!editingNote} onOpenChange={(open) => !open && setEditingNote(null)}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Upravit poznámku</DrawerTitle>
          </DrawerHeader>
          <div className="p-4">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder="Text poznámky..."
            />
          </div>
          <DrawerFooter>
            <Button onClick={handleSaveEdit} disabled={editNoteMutation.isPending}>
              {editNoteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Ukládání...
                </>
              ) : (
                "Uložit změny"
              )}
            </Button>
            <DrawerClose asChild>
              <Button variant="outline">Zrušit</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Opravdu chcete smazat tento projekt?</AlertDialogTitle>
            <AlertDialogDescription>
              Tato akce je nevratná. Všechny poznámky a data projektu budou ztraceny.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteProjectMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteProjectMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Mazání...
                </>
              ) : (
                "Smazat projekt"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}