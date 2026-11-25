
"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { updateTicketRating } from '@/lib/firestore';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';

export default function SurveyTestPage() {
    const { toast } = useToast();
    const [ticketId, setTicketId] = useState('');
    const [rating, setRating] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!ticketId || !rating) {
            toast({
                title: "Campos incompletos",
                description: "Por favor, ingrese un ID de ticket y una calificación.",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);
        setResult(null);

        try {
            const numericRating = parseInt(rating, 10);
            const updateResult = await updateTicketRating(ticketId, numericRating);

            if (updateResult.success) {
                setResult({ success: true, message: `Éxito: La calificación '${rating}' fue guardada para el ticket con ID ${ticketId}.` });
                 toast({
                    title: "Calificación Guardada",
                    description: `El ticket con ID ${ticketId} ha sido actualizado.`,
                });
            } else {
                 console.error("Failed to save test survey rating:", updateResult.error);
                 setResult({ success: false, message: `Error: ${updateResult.error || 'Ocurrió un error desconocido.'}` });
                 toast({
                    title: "Error al guardar",
                    description: updateResult.error,
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("Error submitting test survey rating:", error);
            const errorMessage = error instanceof Error ? error.message : "Ocurrió un error inesperado.";
            setResult({ success: false, message: `Error: ${errorMessage}` });
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <div className="flex flex-col gap-6 max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold">Página de Diagnóstico de Encuestas</h1>
            
            <Alert>
                <Terminal className="h-4 w-4" />
                <AlertTitle>¿Para qué sirve esta página?</AlertTitle>
                <AlertDescription>
                   Esta herramienta simula el clic de un cliente en un enlace de encuesta. Le permite probar la lógica de guardado de calificaciones directamente. Utilice el ID numérico del documento del ticket (no el código SOP-xxxx).
                </AlertDescription>
            </Alert>
            
            <Card>
                <CardHeader>
                    <CardTitle>Probar Guardado de Calificación</CardTitle>
                    <CardDescription>
                        Ingrese el ID numérico de un ticket existente y seleccione una calificación para simular la respuesta de un cliente.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="grid gap-6">
                        <div className="grid gap-2">
                            <Label htmlFor="ticketId">ID del Ticket (Numérico)</Label>
                            <Input
                                id="ticketId"
                                value={ticketId}
                                onChange={(e) => setTicketId(e.target.value)}
                                placeholder="Ej: 97"
                                required
                                disabled={isLoading}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="rating">Calificación</Label>
                            <Select onValueChange={setRating} value={rating} required disabled={isLoading}>
                                <SelectTrigger id="rating">
                                    <SelectValue placeholder="Seleccionar calificación" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="3">Excelente</SelectItem>
                                    <SelectItem value="2">Bueno</SelectItem>
                                    <SelectItem value="1">Regular</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? 'Guardando...' : 'Guardar Calificación'}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {result && (
                <Card>
                    <CardHeader>
                        <CardTitle>Resultado de la Simulación</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={`p-4 rounded-md text-sm ${result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {result.message}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
