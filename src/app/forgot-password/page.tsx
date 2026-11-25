
"use client";

import Link from "next/link"
import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Icons } from "@/components/icons"
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast({
        title: "Correo Enviado",
        description: "Se han enviado las instrucciones para restablecer tu contraseña a tu correo.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo enviar el correo de restablecimiento. Verifica que la dirección sea correcta.",
        variant: "destructive",
      });
      console.error("Error sending password reset email: ", error.code, error.message);
    } finally {
        setIsLoading(false);
    }
  };

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
          <CardTitle className="text-2xl text-center">Recuperar Contraseña</CardTitle>
          <CardDescription className="text-center">
            Ingrese su email para recibir instrucciones de recuperación
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword}>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="usuario@ejemplo.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                 {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                Enviar Instrucciones
              </Button>
            </div>
          </form>
          <div className="mt-4 text-center text-sm">
            <Link href="/" className="underline">
              Volver a Iniciar Sesión
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
