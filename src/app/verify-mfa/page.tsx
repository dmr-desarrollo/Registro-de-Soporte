
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  getMultiFactorResolver,
  TotpMultiFactorGenerator,
  MultiFactorAssertion,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Icons } from "@/components/icons";

export default function VerifyMfaPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [verificationCode, setVerificationCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const resolverJson = sessionStorage.getItem('mfaResolver');
      if (!resolverJson) {
        throw new Error("No MFA session found. Please log in again.");
      }
      
      const storedResolver = JSON.parse(resolverJson);
      const resolver = getMultiFactorResolver(auth, storedResolver);

      const assertion: MultiFactorAssertion =
        TotpMultiFactorGenerator.assertionForSignIn(
          resolver.hints[0].uid,
          verificationCode
        );

      await resolver.resolveSignIn(assertion);
      sessionStorage.removeItem('mfaResolver');
      router.push("/dashboard");

    } catch (error: any) {
      toast({
        title: "Error de Verificación",
        description: "El código no es válido o la sesión ha expirado. Por favor, intente iniciar sesión de nuevo.",
        variant: "destructive",
      });
      console.error("MFA verification error:", error);
      router.push("/");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="mx-auto max-w-sm">
        <CardHeader>
           <div className="flex justify-center mb-4">
             <Icons.logo className="w-12 h-12 text-primary" />
           </div>
          <CardTitle className="text-2xl text-center">Verificación de Dos Pasos</CardTitle>
          <CardDescription className="text-center">
            Ingrese el código de su aplicación de autenticación.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerifyMfa}>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="mfa-code">Código de 6 dígitos</Label>
                <Input
                  id="mfa-code"
                  type="text"
                  placeholder="123456"
                  required
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  disabled={isLoading}
                  maxLength={6}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                Verificar e Iniciar Sesión
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
