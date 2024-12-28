import { useState } from "react";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AuthFormData {
  username: string;
  password: string;
}

export default function AuthPage() {
  const { login, register } = useUser();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<AuthFormData>({
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (data: AuthFormData, mode: 'login' | 'register') => {
    setIsLoading(true);
    try {
      const result = mode === 'login' 
        ? await login(data)
        : await register(data);
      
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
        description: "Něco se pokazilo",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container max-w-lg min-h-screen flex items-center justify-center p-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            Mobilní aplikace
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Přihlášení</TabsTrigger>
              <TabsTrigger value="register">Registrace</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={form.handleSubmit((data) => onSubmit(data, 'login'))}>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Uživatelské jméno</Label>
                    <Input
                      id="username"
                      {...form.register("username")}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Heslo</Label>
                    <Input
                      id="password"
                      type="password"
                      {...form.register("password")}
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? "Načítání..." : "Přihlásit se"}
                  </Button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={form.handleSubmit((data) => onSubmit(data, 'register'))}>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Uživatelské jméno</Label>
                    <Input
                      id="username"
                      {...form.register("username")}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Heslo</Label>
                    <Input
                      id="password"
                      type="password"
                      {...form.register("password")}
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? "Načítání..." : "Registrovat se"}
                  </Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
