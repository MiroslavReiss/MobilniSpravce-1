import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

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
  const projectId = params?.id;
  const [newNote, setNewNote] = useState("");
  const [progressValue, setProgressValue] = useState<number>(0);
  const [isProgressDirty, setIsProgressDirty] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
      if (!response.ok) throw new Error('Failed to update progress');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
      setIsProgressDirty(false);
      toast({
        title: "Úspěch",
        description: "Progress byl úspěšně uložen",
      });
    },
    onError: () => {
      toast({
        title: "Chyba",
        description: "Nepodařilo se aktualizovat progress",
        variant: "destructive",
      });
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

  const handleProgressChange = (value: number[]) => {
    setProgressValue(value[0]);
    setIsProgressDirty(true);
  };

  const handleSaveProgress = () => {
    updateProgressMutation.mutate(progressValue);
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (newNote.trim()) {
      addNoteMutation.mutate(newNote.trim());
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
        <CardHeader>
          <CardTitle>{project.title}</CardTitle>
          {project.description && (
            <p className="text-sm text-muted-foreground">
              {project.description}
            </p>
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
                        <span className="text-xs text-muted-foreground">
                          {new Date(note.createdAt).toLocaleString()}
                        </span>
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
    </div>
  );
}