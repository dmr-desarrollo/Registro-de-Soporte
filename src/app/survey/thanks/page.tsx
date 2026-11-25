
"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { updateTicketRating } from '@/lib/firestore';
import Image from 'next/image';

function SurveyProcessor() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Registrando su respuesta...');

  useEffect(() => {
    const saveRating = async () => {
      const rating = searchParams.get('rating');
      const ticketId = searchParams.get('ticket');

      if (!rating || !ticketId) {
        console.error("Missing survey URL parameters:", { rating, ticketId });
        setStatus('error');
        setMessage('Faltan parámetros en la URL. No se pudo registrar su respuesta.');
        return;
      }

      try {
        const numericRating = parseInt(rating, 10);
        const result = await updateTicketRating(ticketId, numericRating);
        if (result.success) {
          setStatus('success');
          setMessage('¡Gracias por su opinión! Su respuesta ha sido registrada.');
        } else {
          console.error("Failed to save survey rating:", result.error);
          setStatus('error');
          setMessage(result.error || 'Ocurrió un error al registrar su respuesta.');
        }
      } catch (error) {
        console.error("Error saving survey rating:", error);
        setStatus('error');
        const errorMessage = error instanceof Error ? error.message : "Ocurrió un error desconocido.";
        setMessage(`Error: ${errorMessage}`);
      }
    };

    saveRating();
  }, [searchParams]);

  switch (status) {
    case 'loading':
      return (
        <>
          <Loader2 className="w-16 h-16 text-primary animate-spin" />
          <CardTitle className="text-3xl font-bold mt-4">Procesando...</CardTitle>
          <CardDescription className="text-lg text-muted-foreground">{message}</CardDescription>
        </>
      );
    case 'success':
      return (
        <>
          <CheckCircle className="w-16 h-16 text-green-500" />
          <CardTitle className="text-3xl font-bold mt-4">¡Gracias por su opinión!</CardTitle>
          <CardDescription className="text-lg text-muted-foreground">
            Su feedback es muy valioso y nos ayuda a mejorar nuestro servicio cada día.
          </CardDescription>
          <CardContent className="pt-6">
            <p className="mb-6">
              Hemos registrado su respuesta. No se requiere ninguna otra acción de su parte.
            </p>
            <Button asChild>
              <Link href="https://dmr.com.uy">Volver a nuestro sitio web</Link>
            </Button>
          </CardContent>
        </>
      );
    case 'error':
      return (
        <>
          <AlertTriangle className="w-16 h-16 text-destructive" />
          <CardTitle className="text-3xl font-bold mt-4">Error al Registrar</CardTitle>
          <CardDescription className="text-lg text-muted-foreground">
            {message}
          </CardDescription>
           <CardContent className="pt-6">
               <Button asChild>
                  <Link href="https://dmr.com.uy">Volver a nuestro sitio web</Link>
              </Button>
           </CardContent>
        </>
      );
  }
}

export default function ThanksPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="mx-auto max-w-md text-center p-6">
        <CardHeader>
          <div className="flex justify-center mb-4">
             <Image
                src="https://firebasestorage.googleapis.com/v0/b/tech-support-tracker.firebasestorage.app/o/logo_dmr_transparente.png?alt=media&token=a529839f-5e58-438d-aaa1-3c36ecbf401e"
                alt="Logo DMR"
                width={120}
                height={60}
             />
          </div>
          <Suspense fallback={
             <div className="flex flex-col items-center justify-center">
                <Loader2 className="w-16 h-16 text-primary animate-spin" />
                <CardTitle className="text-3xl font-bold mt-4">Cargando...</CardTitle>
             </div>
          }>
            <SurveyProcessor />
          </Suspense>
        </CardHeader>
      </Card>
    </div>
  );
}
