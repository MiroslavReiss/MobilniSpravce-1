import { useUser } from "@/hooks/use-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, LogOut, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";

export default function ProfilePage() {
  const { user, logout } = useUser();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);

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
    </div>
  );
}