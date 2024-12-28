import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Loader2, Pencil, Trash2 } from "lucide-react";
import { useUser } from "@/hooks/use-user";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

interface Todo {
  id: number;
  title: string;
  completed: boolean;
}

export default function TodoPage() {
  const [newTodo, setNewTodo] = useState("");
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [pendingTodos, setPendingTodos] = useState<number[]>([]);
  const { user } = useUser();
  const isMadKoala = user?.username === 'madkoala';

  const { data: todos, isLoading } = useQuery<Todo[]>({
    queryKey: ['/api/todos'],
  });

  const addTodoMutation = useMutation({
    mutationFn: async (title: string) => {
      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to add todo');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/todos'] });
      setNewTodo("");
    },
    onError: () => {
      toast({
        title: "Chyba",
        description: "Nepodařilo se přidat úkol",
        variant: "destructive",
      });
    },
  });

  const toggleTodoMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: number; completed: boolean }) => {
      setPendingTodos(prev => [...prev, id]);
      try {
        const response = await fetch(`/api/todos/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ completed }),
          credentials: 'include',
        });
        if (!response.ok) throw new Error('Failed to update todo');
        return response.json();
      } finally {
        setPendingTodos(prev => prev.filter(todoId => todoId !== id));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/todos'] });
    },
    onError: () => {
      toast({
        title: "Chyba",
        description: "Nepodařilo se upravit úkol",
        variant: "destructive",
      });
    },
  });

  const deleteTodoMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/todos/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete todo');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/todos'] });
      toast({
        title: "Úspěch",
        description: "Úkol byl smazán",
      });
    },
    onError: () => {
      toast({
        title: "Chyba",
        description: "Nepodařilo se smazat úkol",
        variant: "destructive",
      });
    },
  });

  const editTodoMutation = useMutation({
    mutationFn: async ({ id, title }: { id: number; title: string }) => {
      const response = await fetch(`/api/todos/${id}/edit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to edit todo');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/todos'] });
      setEditingTodo(null);
      toast({
        title: "Úspěch",
        description: "Úkol byl upraven",
      });
    },
    onError: () => {
      toast({
        title: "Chyba",
        description: "Nepodařilo se upravit úkol",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTodo.trim()) {
      addTodoMutation.mutate(newTodo.trim());
    }
  };

  const handleEdit = (todo: Todo) => {
    setEditingTodo(todo);
    setEditTitle(todo.title);
  };

  const handleSaveEdit = () => {
    if (editingTodo && editTitle.trim()) {
      editTodoMutation.mutate({
        id: editingTodo.id,
        title: editTitle.trim(),
      });
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="p-4 space-y-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          placeholder="Nový úkol..."
          disabled={addTodoMutation.isPending}
        />
        <Button type="submit" disabled={addTodoMutation.isPending}>
          <Plus className="h-4 w-4" />
        </Button>
      </form>

      <div className="space-y-2">
        {todos?.map((todo) => (
          <Card key={todo.id} className="p-4">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Checkbox
                  checked={todo.completed}
                  disabled={pendingTodos.includes(todo.id)}
                  onCheckedChange={(checked) => {
                    toggleTodoMutation.mutate({
                      id: todo.id,
                      completed: checked as boolean,
                    });
                  }}
                />
                {pendingTodos.includes(todo.id) && (
                  <Loader2 className="absolute inset-0 h-4 w-4 animate-spin" />
                )}
              </div>
              <span className={`flex-1 ${todo.completed ? "line-through text-muted-foreground" : ""}`}>
                {todo.title}
              </span>
              {isMadKoala && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(todo)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteTodoMutation.mutate(todo.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Drawer open={!!editingTodo} onOpenChange={(open) => !open && setEditingTodo(null)}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Upravit úkol</DrawerTitle>
          </DrawerHeader>
          <div className="p-4">
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Text úkolu..."
            />
          </div>
          <DrawerFooter>
            <Button onClick={handleSaveEdit} disabled={editTodoMutation.isPending}>
              {editTodoMutation.isPending ? (
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
    </div>
  );
}