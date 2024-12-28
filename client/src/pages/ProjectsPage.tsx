import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Plus, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { m, LazyMotion, domAnimation } from "framer-motion";

interface Project {
  id: number;
  title: string;
  description: string;
  progress: number;
  noteCount: number;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 25
    }
  }
};

export default function ProjectsPage() {
  const [newProject, setNewProject] = useState({ title: "", description: "" });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: projects, isLoading } = useQuery<Array<Project>>({
    queryKey: ['/api/projects'],
  });

  const addProjectMutation = useMutation({
    mutationFn: async (project: Omit<Project, "id" | "progress" | "noteCount">) => {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(project),
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to add project');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      setNewProject({ title: "", description: "" });
      setIsDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Chyba",
        description: "Nepodařilo se vytvořit projekt",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newProject.title.trim()) {
      addProjectMutation.mutate(newProject);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <m.h1 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-2xl font-bold"
        >
          Projekty
        </m.h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <m.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nový projekt
              </Button>
            </m.div>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Vytvořit nový projekt</DialogTitle>
              <DialogDescription>
                Vyplňte informace o novém projektu.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Název</Label>
                <Input
                  id="title"
                  value={newProject.title}
                  onChange={(e) => setNewProject(prev => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Popis</Label>
                <Textarea
                  id="description"
                  value={newProject.description}
                  onChange={(e) => setNewProject(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <Button type="submit" className="w-full" disabled={addProjectMutation.isPending}>
                {addProjectMutation.isPending ? "Vytváření..." : "Vytvořit projekt"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <m.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid gap-4"
      >
        {projects?.map((project) => (
          <m.div
            key={project.id}
            variants={item}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Link href={`/projects/${project.id}`}>
              <a>
                <Card className="transform transition-all hover:shadow-lg">
                  <CardHeader>
                    <h2 className="text-xl font-semibold">{project.title}</h2>
                  </CardHeader>
                  <CardContent>
                    {project.description && (
                      <p className="text-sm text-muted-foreground mb-4">
                        {project.description}
                      </p>
                    )}
                    <Progress value={project.progress} className="h-2" />
                    <div className="flex justify-between items-center mt-2">
                      <p className="text-sm text-muted-foreground">
                        Progress: {project.progress}%
                      </p>
                      <m.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 25 }}
                      >
                        <Badge variant="secondary">
                          {project.noteCount} poznámek
                        </Badge>
                      </m.div>
                    </div>
                  </CardContent>
                </Card>
              </a>
            </Link>
          </m.div>
        ))}
      </m.div>
    </div>
  );
}