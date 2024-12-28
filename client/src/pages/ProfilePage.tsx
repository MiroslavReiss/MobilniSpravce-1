import { useUser } from "@/hooks/use-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, LogOut, Upload, UserCog, Key, UserX, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

export default function ProfilePage() {
  const { user, logout } = useUser();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [editUserDialog, setEditUserDialog] = useState<{ open: boolean; userId: number | null }>({ open: false, userId: null });

  // Admin queries
  const { data: users = [] } = useQuery({
    queryKey: ['/api/admin/users'],
    enabled: user?.isAdmin
  });

  const { data: registrationSettings } = useQuery({
    queryKey: ['/api/admin/registrations'],
    enabled: user?.isAdmin
  });

  const uploadAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append('avatar', file);

        const response = await fetch('/api/user/avatar', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(error || 'Failed to upload avatar');
        }

        return response.json();
      } finally {
        setIsUploading(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
      toast({
        title: "Úspěch",
        description: "Avatar byl úspěšně nahrán",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba",
        description: error.message || "Nepodařilo se nahrát avatar",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "Úspěch",
        description: "Uživatel byl smazán",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: number; data: any }) => {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setEditUserDialog({ open: false, userId: null });
      toast({
        title: "Úspěch",
        description: "Uživatel byl aktualizován",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleRegistrationsMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const response = await fetch('/api/admin/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/registrations'] });
      toast({
        title: "Úspěch",
        description: "Nastavení registrací bylo aktualizováno",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleLogout = async () => {
    try {
      const result = await logout();
      if (!result.ok) {
        toast({
          title: "Chyba",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Chyba",
        description: "Nepodařilo se odhlásit",
        variant: "destructive",
      });
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "Chyba",
          description: "Soubor je příliš velký. Maximální velikost je 5MB.",
          variant: "destructive",
        });
        return;
      }

      if (!file.type.startsWith('image/')) {
        toast({
          title: "Chyba",
          description: "Prosím vyberte obrázek.",
          variant: "destructive",
        });
        return;
      }

      uploadAvatarMutation.mutate(file);
    }
  };

  const handleEditUser = (userId: number, data: any) => {
    updateUserMutation.mutate({ userId, data });
  };

  const handleDeleteUser = (userId: number) => {
    if (window.confirm('Opravdu chcete smazat tohoto uživatele?')) {
      deleteUserMutation.mutate(userId);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Profil uživatele</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <Avatar className="h-20 w-20 cursor-pointer transition-opacity group-hover:opacity-75" onClick={handleAvatarClick}>
                <AvatarImage src={user?.avatar} alt={user?.username} />
                <AvatarFallback>
                  <User className="h-10 w-10" />
                </AvatarFallback>
                {isUploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <Upload className="h-6 w-6 text-white" />
                </div>
              </Avatar>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
            <div>
              <h2 className="text-xl font-semibold">
                {user?.displayName || user?.username}
              </h2>
              <p className="text-sm text-muted-foreground">
                @{user?.username}
              </p>
            </div>
          </div>

          <Button 
            variant="destructive" 
            className="w-full"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Odhlásit se
          </Button>
        </CardContent>
      </Card>

      {/* Admin sekce */}
      {user?.isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Administrace</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Povolení/zakázání registrací */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Povolit registrace</Label>
                <p className="text-sm text-muted-foreground">
                  Povolí nebo zakáže možnost registrace nových uživatelů
                </p>
              </div>
              <Switch
                checked={registrationSettings?.registrationsEnabled}
                onCheckedChange={(checked) => toggleRegistrationsMutation.mutate(checked)}
              />
            </div>

            {/* Seznam uživatelů */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Správa uživatelů</h3>
              <div className="space-y-2">
                {users.map((u: any) => (
                  <div key={u.id} className="flex items-center justify-between p-2 border rounded-lg">
                    <div>
                      <p className="font-medium">{u.displayName || u.username}</p>
                      <p className="text-sm text-muted-foreground">@{u.username}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditUserDialog({ open: true, userId: u.id })}
                      >
                        <UserCog className="h-4 w-4" />
                      </Button>
                      {u.id !== user.id && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteUser(u.id)}
                        >
                          <UserX className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog pro editaci uživatele */}
      <Dialog open={editUserDialog.open} onOpenChange={(open) => setEditUserDialog({ open, userId: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upravit uživatele</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const data: any = {};
              formData.forEach((value, key) => {
                if (value) data[key] = value;
              });
              if (editUserDialog.userId) {
                handleEditUser(editUserDialog.userId, data);
              }
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="username">Uživatelské jméno</Label>
              <Input id="username" name="username" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayName">Zobrazované jméno</Label>
              <Input id="displayName" name="displayName" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Nové heslo</Label>
              <Input id="password" name="password" type="password" />
            </div>
            <Button type="submit">Uložit změny</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}