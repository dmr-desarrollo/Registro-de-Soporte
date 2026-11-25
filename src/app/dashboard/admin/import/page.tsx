
"use client";

import { useState } from 'react';
import Papa from 'papaparse';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { addClientBatch, addEquipmentBatch, addProblemTypeBatch } from '@/lib/firestore';
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Client, Equipment, ProblemType } from '@/lib/types';
import { UploadCloud, FileText } from 'lucide-react';

type CsvData = (Omit<Client, 'id'> | Omit<Equipment, 'id'> | Omit<ProblemType, 'id'>)[];

// Helper function to get value from object with multiple possible keys.
// This version is more robust against casing and spacing issues.
const getValue = (obj: any, keys: string[]): any => {
    // Create a new object with all keys from the original object converted to lowercase and trimmed.
    const lowerCaseObj: { [key: string]: any } = {};
    for (const originalKey in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, originalKey)) {
            lowerCaseObj[originalKey.toLowerCase().trim()] = obj[originalKey];
        }
    }

    // Now, iterate through the desired keys, convert them to lowercase, and check against our cleaned object.
    for (const key of keys) {
        const lowerCaseKey = key.toLowerCase().trim();
        if (lowerCaseObj[lowerCaseKey] !== undefined) {
            return lowerCaseObj[lowerCaseKey];
        }
    }
    
    return ''; // Return empty string if no match is found
};


const detectDataType = (headers: string[]): 'clients' | 'equipment' | 'problems' | null => {
    const lowerCaseHeaders = headers.map(h => h.toLowerCase().trim());
    const clientKeywords = ['nombre cliente', 'name', 'cliente', 'email', 'empresa', 'company'];
    const equipmentKeywords = ['marca', 'brand', 'modelo', 'model'];
    const problemKeywords = ['description', 'problema', 'descripcion'];

    const hasClientKeywords = clientKeywords.some(keyword => lowerCaseHeaders.includes(keyword));
    const hasEquipmentKeywords = equipmentKeywords.some(keyword => lowerCaseHeaders.includes(keyword));
    const hasProblemKeywords = problemKeywords.some(keyword => lowerCaseHeaders.includes(keyword));

    if (hasClientKeywords) return 'clients';
    if (hasEquipmentKeywords) return 'equipment';
    if (hasProblemKeywords) return 'problems';
    return null;
}

export default function ImportPage() {
    const { toast } = useToast();
    const [file, setFile] = useState<File | null>(null);
    const [fileName, setFileName] = useState("Ningún archivo seleccionado");
    const [dataType, setDataType] = useState<'clients' | 'equipment' | 'problems' | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [parsedData, setParsedData] = useState<CsvData>([]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            const selectedFile = event.target.files[0];
            if (selectedFile.type !== 'text/csv') {
                toast({
                    title: "Archivo no válido",
                    description: "Por favor, selecciona un archivo con formato .csv",
                    variant: "destructive",
                });
                return;
            }
            setFile(selectedFile);
            setFileName(selectedFile.name);
            // Reset previous preview
            setParsedData([]);
            setDataType(null);
        }
    };

    const processCsv = () => {
        if (!file) {
            toast({ title: "Error", description: "Por favor, selecciona un archivo CSV primero.", variant: "destructive" });
            return;
        }
        setIsProcessing(true);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                if (!results.data || results.data.length === 0 || !results.meta.fields) {
                     toast({
                        title: "Archivo vacío o inválido",
                        description: "El archivo CSV seleccionado no contiene datos o cabeceras.",
                        variant: "destructive",
                    });
                    setIsProcessing(false);
                    return;
                }
                
                const detectedType = detectDataType(results.meta.fields);
                setDataType(detectedType);

                if (!detectedType) {
                    toast({
                        title: "No se pudo detectar el tipo de datos",
                        description: "Asegúrate de que tu archivo CSV tenga columnas como 'Nombre Cliente' para clientes, 'Marca' y 'Modelo' para equipos, o 'Description' para problemas.",
                        variant: "destructive"
                    });
                    setIsProcessing(false);
                    return;
                }
                
                let typeName = '';
                if (detectedType === 'clients') typeName = 'clientes';
                else if (detectedType === 'equipment') typeName = 'equipos';
                else if (detectedType === 'problems') typeName = 'problemas';

                setParsedData(results.data as CsvData);
                setIsProcessing(false);
                toast({ title: "Archivo Procesado", description: `Se detectaron datos de ${typeName}. Se encontraron ${results.data.length} registros. Revisa la vista previa y haz clic en "Subir" para guardar.` });
            },
            error: (error) => {
                console.error("Error parsing CSV file:", error);
                toast({ title: "Error al leer el archivo", description: error.message, variant: "destructive" });
                setIsProcessing(false);
            }
        });
    };

    const handleUpload = async () => {
        if (!dataType || parsedData.length === 0) {
            toast({ title: "Error", description: "No hay datos procesados para subir.", variant: "destructive" });
            return;
        }

        setIsUploading(true);
        setProgress(0);

        try {
            let importedCount = 0;
            if (dataType === 'clients') {
                 const clientData = parsedData.map(item => {
                    const name = getValue(item, ['Nombre Cliente', 'name', 'Name', 'Cliente', 'Razon Social']);
                    return {
                        name: name,
                        email: getValue(item, ['email', 'Email', 'Correo', 'Correo Electrónico']),
                        persona_contacto: getValue(item, ['persona_contacto', 'Persona Contacto', 'Contacto', 'Persona de Contacto']),
                        phone: getValue(item, ['phone', 'Phone', 'Telefono', 'Teléfono']),
                        company: getValue(item, ['company', 'Company', 'Empresa']) || name,
                    };
                }).filter(client => client.name && String(client.name).trim() !== ''); // Filter out rows without a valid name
                
                if (clientData.length === 0) {
                     toast({ title: "No hay datos válidos", description: "No se encontraron clientes con un nombre válido para importar. Asegúrate de tener una columna como 'Nombre Cliente'.", variant: "destructive" });
                } else {
                    importedCount = await addClientBatch(clientData, setProgress);
                    toast({ title: "Éxito", description: `Se importaron ${importedCount} registros de clientes correctamente.` });
                }

            } else if (dataType === 'equipment') {
                 const equipmentData = parsedData.map(item => {
                    return {
                        marca: getValue(item, ['marca', 'Marca']),
                        modelo: getValue(item, ['modelo', 'Modelo']),
                    }
                }).filter(eq => eq.marca && String(eq.marca).trim() !== '' && eq.modelo && String(eq.modelo).trim() !== ''); // Filter rows without brand or model
                
                if (equipmentData.length === 0) {
                    toast({ title: "No hay datos válidos", description: "No se encontraron equipos con marca y modelo válidos. Asegúrate de tener las columnas 'Marca' y 'Modelo'.", variant: "destructive" });
                } else {
                    importedCount = await addEquipmentBatch(equipmentData, setProgress);
                    toast({ title: "Éxito", description: `Se importaron ${importedCount} registros de equipos correctamente.` });
                }
            } else if (dataType === 'problems') {
                const problemData = parsedData.map(item => ({
                    description: getValue(item, ['description', 'Description', 'Problema', 'descripcion']),
                })).filter(p => p.description && String(p.description).trim() !== '');

                if (problemData.length === 0) {
                    toast({ title: "No hay datos válidos", description: "No se encontraron problemas con una descripción válida. Asegúrate de tener una columna como 'Description'.", variant: "destructive" });
                } else {
                    importedCount = await addProblemTypeBatch(problemData, setProgress);
                    toast({ title: "Éxito", description: `Se importaron ${importedCount} registros de problemas correctamente.` });
                }
            }
        } catch (error) {
            console.error("Error importing CSV data:", error);
            const errorMessage = error instanceof Error ? error.message : "Ocurrió un error desconocido.";
            toast({ title: "Error en la importación", description: errorMessage, variant: "destructive" });
        } finally {
            setIsUploading(false);
            setProgress(100);
            setFile(null);
            setFileName("Ningún archivo seleccionado");
            setParsedData([]);
            setDataType(null);
        }
    };
    
    const renderPreviewTable = () => {
        if (parsedData.length === 0) return null;

        const headers = Object.keys(parsedData[0]);

        return (
            <div className='mt-6'>
                <h3 className="text-lg font-semibold mb-2">Vista Previa de Datos ({parsedData.length} filas)</h3>
                 <ScrollArea className="h-72 w-full rounded-md border">
                    <Table>
                        <TableHeader className="sticky top-0 bg-background">
                            <TableRow>
                                {headers.map(header => <TableHead key={header}>{header}</TableHead>)}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {parsedData.slice(0, 100).map((row, index) => ( // Show first 100 rows
                                <TableRow key={index}>
                                    {headers.map(header => (
                                        <TableCell key={header}>{(row as any)[header]}</TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-2xl font-bold">Importación de Datos desde CSV</h1>
            <Card>
                <CardHeader>
                    <CardTitle>Paso 1: Seleccionar Archivo</CardTitle>
                    <CardDescription>
                        Elige el archivo .csv que deseas importar. La aplicación detectará automáticamente si son clientes, equipos o tipos de problemas.
                        <br />
                        <b>Para Clientes:</b> Usa cabeceras como <code>Nombre Cliente</code>, <code>Persona de Contacto</code>, <code>Email</code>, <code>Telefono</code>, y <code>Empresa</code>.
                        <br />
                        <b>Para Equipos:</b> Asegúrate de tener las columnas 'Marca' y 'Modelo'.
                        <br />
                        <b>Para Problemas:</b> Asegúrate de tener la columna 'Description' o 'Problema'.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                     <div className="flex flex-col items-center justify-center w-full">
                        <label htmlFor="csv-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-border transition-colors">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <UploadCloud className="w-8 h-8 mb-2 text-muted-foreground" />
                                <p className="mb-1 text-sm text-muted-foreground">
                                    <span className="font-semibold">Haz clic para buscar</span> o arrastra y suelta el archivo
                                </p>
                                <p className="text-xs text-muted-foreground">Solo archivos .CSV</p>
                            </div>
                            <Input id="csv-upload" type="file" className="hidden" accept=".csv" onChange={handleFileChange} />
                        </label>
                    </div>
                     {fileName !== "Ningún archivo seleccionado" && (
                        <div className="mt-4 flex items-center justify-center p-3 rounded-md bg-muted border text-sm">
                            <FileText className="w-4 h-4 mr-2 text-muted-foreground" />
                            <span className="font-medium">{fileName}</span>
                        </div>
                    )}
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>Paso 2: Procesar y Subir</CardTitle>
                    <CardDescription>
                        Procesa el archivo para generar una vista previa y detectar el tipo de datos. Luego, sube los datos a la base de datos.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row gap-4">
                       <div className='flex-1 space-y-4'>
                         <div className="flex gap-2">
                             <Button onClick={processCsv} disabled={!file || isProcessing || isUploading} className="w-full">
                                {isProcessing ? "Procesando..." : "Procesar Archivo"}
                            </Button>
                         </div>
                         <Button onClick={handleUpload} disabled={parsedData.length === 0 || isUploading} className="w-full">
                           {isUploading ? "Subiendo..." : `Subir ${dataType || ''}`}
                         </Button>
                       </div>
                    </div>
                     {isUploading && (
                        <div className="mt-4 space-y-2">
                            <Label>Progreso de Carga</Label>
                            <Progress value={progress} />
                            <p className="text-sm text-muted-foreground text-center">{progress}% completado</p>
                        </div>
                    )}
                    {renderPreviewTable()}
                </CardContent>
            </Card>
        </div>
    );
}

    