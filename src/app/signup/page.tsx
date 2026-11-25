
"use client";

import Link from "next/link"
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, updateProfile } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Icons } from "@/components/icons"
import { useToast } from "@/hooks/use-toast";
import { addUser } from "@/lib/firestore";
import Image from "next/image";

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Update Firebase Auth profile
      await updateProfile(user, { displayName: username });

      // Add user to Firestore collection
      await addUser({
        id: user.uid,
        name: username,
        email: user.email!,
        // Assign 'admin' role if it's the specific admin email, otherwise 'usuario'
        role: user.email === 'desarrollo@dmr.com.uy' ? 'admin' : 'usuario',
        activo: true,
      });

      toast({
        title: "Cuenta Creada",
        description: "Tu cuenta ha sido creada exitosamente. Serás redirigido.",
      });
      router.push("/");
    } catch (error: any) {
      let description = "Ocurrió un error inesperado. Por favor, inténtelo de nuevo.";
      if (error.code === 'auth/email-already-in-use') {
        description = "El correo electrónico ya está en uso por otra cuenta.";
      } else if (error.code === 'auth/weak-password') {
        description = "La contraseña es demasiado débil. Debe tener al menos 6 caracteres.";
      }
       toast({
        title: "Error al crear la cuenta",
        description: description,
        variant: "destructive",
      });
      console.error("Error signing up: ", error.code, error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Add user to Firestore collection
       await addUser({
        id: user.uid,
        name: user.displayName || 'Usuario Google',
        email: user.email!,
        role: user.email === 'desarrollo@dmr.com.uy' ? 'admin' : 'usuario',
        activo: true,
      });

      toast({
        title: "Cuenta Creada",
        description: "Tu cuenta ha sido creada con Google. Serás redirigido.",
      });
      router.push("/dashboard");
    } catch (error: any) {
      console.error("Error signing up with Google:", error);
      toast({
        title: "Error de autenticación",
        description: "No se pudo iniciar sesión con Google. Por favor, intente de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsGoogleLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="mx-auto max-w-sm">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <Image
                src="https://firebasestorage.googleapis.com/v0/b/tech-support-tracker.firebasestorage.app/o/logo_dmr_transparente.png?alt=media&token=a529839f-5e58-438d-aaa1-3c36ecbf401e"
                alt="Logo DMR"
                width={120}
                height={60}
             />
          </div>
          <CardTitle className="text-2xl text-center">Crear una Cuenta</CardTitle>
          <CardDescription className="text-center">
            Ingrese sus datos para registrarse en el sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup}>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="username">Nombre de Usuario</Label>
                <Input 
                  id="username" 
                  placeholder="juan.perez" 
                  required 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading || isGoogleLoading}
                  />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="usuario@ejemplo.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading || isGoogleLoading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input 
                  id="password" 
                  type="password" 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                   disabled={isLoading || isGoogleLoading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading || isGoogleLoading}>
                 {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                Crear Cuenta
              </Button>
            </div>
          </form>
           <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                    O continuar con
                    </span>
                </div>
            </div>
            <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isLoading || isGoogleLoading}>
                {isGoogleLoading ? (
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <Icons.google className="mr-2 h-4 w-4" />
                )}
                Google
            </Button>
          <div className="mt-4 text-center text-sm">
            ¿Ya tiene una cuenta?{" "}
            <Link href="/" className="underline">
              Iniciar Sesión
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
