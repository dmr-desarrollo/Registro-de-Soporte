
"use client";

import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, multiFactor, TotpMultiFactorGenerator, TotpSecret } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import type { User as FirebaseUser } from 'firebase/auth';

export default function MfaSetupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [mfaSecret, setMfaSecret] = useState<TotpSecret | null>(null);
  const [qrCodeUri, setQrCodeUri] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        if (!currentUser) {
          router.push('/');
          return;
        }
        setUser(currentUser);
        setIsEnrolled(currentUser.multiFactor.enrolledFactors.length > 0);
        setIsLoading(false);
      },
      (error) => {
        console.error("Auth state listener error in MFA setup:", error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleStartEnrollment = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const multiFactorSession = await multiFactor(user).getSession();
      const secret = await TotpMultiFactorGenerator.generateSecret(multiFactorSession);
      setMfaSecret(secret);
      const uri = secret.toUri('Soporte App', user.email || undefined);
      setQrCodeUri(uri);
    } catch (error) {
      console.error("Error starting MFA enrollment:", error);
      toast({ title: "Error", description: "No se pudo iniciar la configuración de MFA.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalizeEnrollment = async () => {
    if (!user || !mfaSecret) return;
    setIsLoading(true);
    try {
      const multiFactorAssertion = TotpMultiFactorGenerator.assertionForEnrollment(mfaSecret, verificationCode);
      await multiFactor(user).enroll(multiFactorAssertion, 'Mi Autenticador');
      
      toast({ title: "Éxito", description: "MFA ha sido configurado correctamente." });
      setQrCodeUri('');
      setVerificationCode('');
      setMfaSecret(null);
      setIsEnrolled(true);
    } catch (error) {
      console.error("Error finalizing MFA enrollment:", error);
      toast({ title: "Error", description: "El código de verificación no es válido.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnenroll = async () => {
    if (!user || !isEnrolled) return;
    setIsLoading(true);
    try {
      const mfaUid = user.multiFactor.enrolledFactors[0].uid;
      await multiFactor(user).unenroll(mfaUid);
      toast({ title: "Éxito", description: "MFA ha sido desactivado." });
      setIsEnrolled(false);
    } catch (error) {
      console.error("Error unenrolling MFA:", error);
      toast({ title: "Error", description: "No se pudo desactivar MFA. Por favor, inténtelo de nuevo.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !user) {
    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-2xl font-bold">Configuración de MFA</h1>
            <Card>
                <CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader>
                <CardContent><Skeleton className="h-24 w-full" /></CardContent>
            </Card>
        </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Autenticación de Múltiples Factores (MFA)</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Estado de MFA</CardTitle>
          <CardDescription>
            {isEnrolled
              ? "La autenticación de múltiples factores está activa en su cuenta."
              : "Añada una capa extra de seguridad a su cuenta."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isEnrolled ? (
            <Button onClick={handleUnenroll} disabled={isLoading} variant="destructive">
              Desactivar MFA
            </Button>
          ) : (
            <Button onClick={handleStartEnrollment} disabled={isLoading || !!qrCodeUri}>
              Activar MFA
            </Button>
          )}
        </CardContent>
      </Card>

      {qrCodeUri && (
        <Card>
          <CardHeader>
            <CardTitle>Paso 2: Escanear y Verificar</CardTitle>
            <CardDescription>
              Escanee este código QR con su aplicación de autenticación (ej. Google Authenticator) y luego ingrese el código de 6 dígitos.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div className="p-4 bg-white rounded-lg">
                <Image
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeUri)}`}
                    alt="MFA QR Code"
                    width={200}
                    height={200}
                />
            </div>
            <div className="grid gap-2 w-full max-w-sm">
                <Label htmlFor="verificationCode">Código de Verificación</Label>
                <Input
                    id="verificationCode"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="123456"
                    maxLength={6}
                />
            </div>
            <Button onClick={handleFinalizeEnrollment} disabled={isLoading || verificationCode.length !== 6}>
              Verificar y Finalizar
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
