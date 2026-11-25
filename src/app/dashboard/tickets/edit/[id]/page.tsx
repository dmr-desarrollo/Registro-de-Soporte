
"use client";

import { useRef, useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { getClients, getEquipment, getProblemTypes, getUsers, getTicketByCode, updateTicket } from '@/lib/firestore';
import type { Client, Equipment, ProblemType, Ticket, User } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { auth } from '@/lib/firebase';


export default function EditTicketPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  
  const ticketCode = Array.isArray(params.id) ? params.id[0] : params.id;

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [problemTypes, setProblemTypes] = useState<ProblemType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const formRef = useRef<HTMLFormElement>(null);
  const isResolved = useMemo(() => ticket?.resuelto === 'Si', [ticket]);

  // Form state
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [selectedMarca, setSelectedMarca] = useState('');
  const [selectedModeloId, setSelectedModeloId] = useState('');
  const [selectedProblemaId, setSelectedProblemaId] = useState('');
  const [asistenciaTipo, setAsistenciaTipo] = useState('');
  const [casoResuelto, setCasoResuelto] = useState('');
  const [accesoRemoto, setAccesoRemoto] = useState('');
  const [horas, setHoras] = useState(0);
  const [minutos, setMinutos] = useState(0);
  const [description, setDescription] = useState('');
  const [solution, setSolution] = useState('');
  
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        if (!ticketCode) return;
        
        const [ticketData, clientsData, equipmentData, problemTypesData, usersData] = await Promise.all([
          getTicketByCode(ticketCode),
          getClients(),
          getEquipment(),
          getProblemTypes(),
          getUsers()
        ]);
        
        setTicket(ticketData);
        setClients(clientsData);
        setEquipment(equipmentData);
        setProblemTypes(problemTypesData);

        const activeUser = usersData.find(u => u.email === auth.currentUser?.email);
        setCurrentUser(activeUser || null);

        if (ticketData) {
            setSelectedClientId(String(ticketData.id_cliente));
            setContactPerson(ticketData.persona_contacto);
            
            const ticketEquipment = equipmentData.find(e => e.id === ticketData.id_equipo);
            if(ticketEquipment) {
                setSelectedMarca(ticketEquipment.marca);
                setSelectedModeloId(String(ticketEquipment.id));
            }
            
            setSelectedProblemaId(String(ticketData.id_problema));
            setAsistenciaTipo(ticketData.asistencia_tipo);
            setCasoResuelto(ticketData.resuelto);
            setAccesoRemoto(ticketData.acceso_remoto);
            setHoras(ticketData.horas);
            setMinutos(ticketData.minutes);
            setDescription(ticketData.description);
            setSolution(ticketData.solution || '');

            const clientData = clientsData.find(c => c.id === ticketData.id_cliente);
            if(clientData){
                 setContactPhone(clientData.phone || '');
            }
        }

      } catch (error) {
          console.error("Error fetching form data:", error)
          toast({ title: "Error", description: "No se pudieron cargar los datos del ticket.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }
    fetchInitialData();
  }, [ticketCode]);

  const clientOptions: ComboboxOption[] = useMemo(() => clients.map(client => ({ value: String(client.id), label: client.name })), [clients]);
  const marcaOptions: ComboboxOption[] = useMemo(() => [...new Set(equipment.map(e => e.marca))].map(marca => ({ value: marca, label: marca })), [equipment]);
  const modeloOptions: ComboboxOption[] = useMemo(() => {
    if (!selectedMarca) return [];
    return equipment.filter(e => e.marca === selectedMarca).map(m => ({ value: String(m.id), label: m.modelo }));
  }, [equipment, selectedMarca]);
  const problemaOptions: ComboboxOption[] = useMemo(() => problemTypes.map(p => ({ value: String(p.id), label: p.description })), [problemTypes]);


  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRef.current?.checkValidity()) {
      formRef.current?.reportValidity();
      toast({ title: "Formulario Incompleto", description: "Por favor, complete todos los campos obligatorios.", variant: "destructive" });
      return;
    }
    if (!ticket || isResolved) return;

    setIsSaving(true);
    try {
        const updatedData: Partial<Ticket> = {
            id_cliente: Number(selectedClientId),
            persona_contacto: contactPerson,
            id_equipo: Number(selectedModeloId),
            id_problema: Number(selectedProblemaId),
            asistencia_tipo: asistenciaTipo as any,
            resuelto: casoResuelto as any,
            acceso_remoto: accesoRemoto as any,
            horas: Number(horas),
            minutes: Number(minutos),
            description: description,
            solution: solution,
        };

      await updateTicket(String(ticket.id), updatedData);

      toast({
        title: "Ticket Actualizado",
        description: `El ticket ${ticket.codigo} ha sido guardado correctamente.`,
      });
      router.push('/dashboard/tickets');
    } catch (error) {
        console.error("Error updating ticket:", error);
        toast({ title: "Error", description: "No se pudo guardar los cambios en el ticket.", variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="grid gap-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
              ))}
            </div>
             <div className="grid gap-3 mt-6"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-24 w-full" /></div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!ticket) {
    return <Card><CardHeader><CardTitle>Ticket no encontrado</CardTitle><CardDescription>No se encontró ningún ticket con el código {ticketCode}.</CardDescription></CardHeader></Card>
  }

  return (
    <form ref={formRef} onSubmit={handleUpdate}>
    <div className="grid gap-6">
      {isResolved && (
        <Alert variant="default" className="bg-yellow-50 border-yellow-200 text-yellow-800">
          <AlertCircle className="h-4 w-4 !text-yellow-600" />
          <AlertTitle>Ticket Resuelto</AlertTitle>
          <AlertDescription>
            Este ticket ya ha sido marcado como resuelto y no puede ser modificado. Toda la información se muestra en modo de solo lectura.
          </AlertDescription>
        </Alert>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Editando Ticket: {ticket.codigo}</CardTitle>
          <CardDescription>Modifique la información del ticket de soporte.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="grid gap-3">
              <Label htmlFor="cliente">Cliente</Label>
               <Combobox options={clientOptions} value={selectedClientId} onChange={setSelectedClientId} name="cliente" required disabled={isResolved}/>
            </div>
            <div className="grid gap-3">
              <Label htmlFor="persona_contacto">Persona de Contacto</Label>
              <Input id="persona_contacto" name="persona_contacto" type="text" placeholder="Ej: Juan Perez" required value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} disabled={isResolved}/>
            </div>
             <div className="grid gap-3">
              <Label htmlFor="telefono">Número de teléfono</Label>
              <Input id="telefono" name="telefono" type="text" placeholder="099123456" required maxLength={9} value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} onInput={(e) => { (e.target as HTMLInputElement).value = (e.target as HTMLInputElement).value.replace(/[^0-9]/g, '').slice(0, 9); }} disabled={isResolved} />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="marca">Marca</Label>
                <Combobox options={marcaOptions} value={selectedMarca} onChange={(v) => { setSelectedMarca(v); setSelectedModeloId(''); }} name="marca" required disabled={isResolved} />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="modelo">Modelo</Label>
              <Combobox options={modeloOptions} value={selectedModeloId} onChange={setSelectedModeloId} name="modelo" required disabled={isResolved || !selectedMarca}/>
            </div>
            <div className="grid gap-3">
              <Label htmlFor="problema">Tipo de Problema</Label>
                <Combobox options={problemaOptions} value={selectedProblemaId} onChange={setSelectedProblemaId} name="problema" required disabled={isResolved} />
            </div>
             <div className="grid gap-3">
                <Label htmlFor="asistencia_tipo">Tipo de Asistencia</Label>
                <Combobox options={[{ value: 'Llamada', label: 'Llamada' }, { value: 'Whatsapp', label: 'Whatsapp' }, { value: 'Correo', label: 'Correo' }]} value={asistenciaTipo} onChange={setAsistenciaTipo} name="asistencia_tipo" required disabled={isResolved}/>
            </div>
             <div className="grid gap-3">
                <Label htmlFor="caso_resuelto">Caso Resuelto</Label>
                 <Combobox options={[{ value: 'Si', label: 'Si' }, { value: 'No', label: 'No' }, { value: 'Escalado', label: 'Escalado' }]} value={casoResuelto} onChange={setCasoResuelto} name="caso_resuelto" required disabled={isResolved} />
            </div>
             <div className="grid gap-3">
                <Label htmlFor="acceso_remoto">Acceso Remoto</Label>
                <Combobox options={[{ value: 'Si', label: 'Si' }, { value: 'No', label: 'No' }]} value={accesoRemoto} onChange={setAccesoRemoto} name="acceso_remoto" required disabled={isResolved} />
            </div>
             <div className="grid gap-3">
                <Label>Tiempo de Atención</Label>
                <div className="flex gap-2">
                    <Input id="horas" name="horas" type="number" placeholder="Horas" min="0" required value={horas} onChange={(e) => setHoras(Number(e.target.value))} disabled={isResolved}/>
                    <Input id="minutos" name="minutos" type="number" placeholder="Minutos" min="0" max="59" required value={minutos} onChange={(e) => setMinutos(Number(e.target.value))} disabled={isResolved}/>
                </div>
            </div>
          </div>
          <div className="grid gap-3 mt-6">
            <Label htmlFor="descripcion">Descripción del Problema</Label>
            <Textarea id="descripcion" name="descripcion" placeholder="Describa el problema reportado..." rows={5} required value={description} onChange={(e) => setDescription(e.target.value)} disabled={isResolved}/>
          </div>
          <div className="grid gap-3 mt-6">
            <Label htmlFor="solution">Solución Aplicada</Label>
            <Textarea id="solution" name="solution" placeholder="...y la solución aplicada." rows={5} value={solution} onChange={(e) => setSolution(e.target.value)} disabled={isResolved}/>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex justify-end gap-2">
        <Button variant="outline" asChild><Link href="/dashboard/tickets">Cancelar</Link></Button>
        <Button type="submit" disabled={isSaving || isResolved}>
          {isSaving ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
      </div>
    </div>
    </form>
  );
}
