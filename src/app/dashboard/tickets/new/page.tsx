
"use client";

import { useRef, useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Mail, MessageCircle, PlusCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"
import { DialogTrigger } from '@radix-ui/react-dialog';
import { sendEscalationEmail, sendSurveyEmail } from './actions';
import { getClients, getEquipment, getProblemTypes, addTicket, addClient, addEquipment, addProblemType, getUsers, getNextTicketIdAndCode, updateClient } from '@/lib/firestore';
import type { Client, Equipment, ProblemType, Ticket, User } from '@/lib/types';
import { auth } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

type TicketData = {
    clientId: number;
    ticketId: string; // The code e.g., SOP-0001
    ticketDocId: number; // The numeric document ID
    clientEmail: string;
    contactPersonName: string;
    technicianName: string;
}

export default function NewTicketPage() {
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [problemTypes, setProblemTypes] = useState<ProblemType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [formKey, setFormKey] = useState(Date.now());
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  
  // States for contact info
  const [contactPerson, setContactPerson] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');

  const [selectedMarca, setSelectedMarca] = useState<string>('');
  const [selectedModeloId, setSelectedModeloId] = useState<string>('');
  const [selectedProblemaId, setSelectedProblemaId] = useState<string>('');
  const [asistenciaTipo, setAsistenciaTipo] = useState<string>('');
  const [casoResuelto, setCasoResuelto] = useState<string>('Si');
  const [accesoRemoto, setAccesoRemoto] = useState<string>('');
  
  const [isEscalationDialogOpen, setIsEscalationDialogOpen] = useState(false);
  const [escalationEmail, setEscalationEmail] = useState('');
  const [escalationNotes, setEscalationNotes] = useState('');

  const [isSurveyDialogOpen, setIsSurveyDialogOpen] = useState(false);
  const [ticketDataForSurvey, setTicketDataForSurvey] = useState<TicketData | null>(null);

  const [newClientName, setNewClientName] = useState('');
  const [newBrandName, setNewBrandName] = useState('');
  const [newModelName, setNewModelName] = useState('');
  const [newProblemDescription, setNewProblemDescription] = useState('');

  // States to control dialogs
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [isBrandDialogOpen, setIsBrandDialogOpen] = useState(false);
  const [isModelDialogOpen, setIsModelDialogOpen] = useState(false);
  const [isProblemDialogOpen, setIsProblemDialogOpen] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);
  
  useEffect(() => {
    const fetchUserAndData = async () => {
      setIsLoading(true);
      try {
        // Fetch current user profile from Firestore
        if (auth.currentUser?.email) {
            const users = await getUsers();
            const appUser = users.find(u => u.email === auth.currentUser?.email);
            setCurrentUser(appUser || null);
        }

        // Fetch other necessary data
        const [clientsData, equipmentData, problemTypesData] = await Promise.all([
          getClients(),
          getEquipment(),
          getProblemTypes()
        ]);
        setClients(clientsData);
        setEquipment(equipmentData);
        setProblemTypes(problemTypesData);

      } catch (error) {
          console.error("Error fetching form data:", error)
      } finally {
        setIsLoading(false);
      }
    }
    fetchUserAndData();
  }, []);
  
  const clientOptions: ComboboxOption[] = useMemo(() => 
    clients.map(client => ({
        value: String(client.id),
        label: client.name,
    })), [clients]);

  const marcaOptions: ComboboxOption[] = useMemo(() => {
    const marcas = new Map<string, string>();
    equipment.forEach(e => {
        const normalizedMarca = e.marca.trim().toLowerCase();
        if (!marcas.has(normalizedMarca)) {
            marcas.set(normalizedMarca, e.marca);
        }
    });
    return Array.from(marcas.values()).map(marca => ({ value: marca, label: marca }));
  }, [equipment]);

  const modeloOptions: ComboboxOption[] = useMemo(() => {
    if (!selectedMarca) return [];
    const modelos = new Map<string, { id: number; modelo: string }>();
    equipment
      .filter(e => e.marca === selectedMarca)
      .forEach(eq => {
        const normalizedModelo = eq.modelo.trim().toLowerCase();
        if (!modelos.has(normalizedModelo)) {
          modelos.set(normalizedModelo, { id: eq.id, modelo: eq.modelo });
        }
      });
    return Array.from(modelos.values()).map(m => ({ value: String(m.id), label: m.modelo }));
  }, [equipment, selectedMarca]);

  const problemaOptions: ComboboxOption[] = useMemo(() => {
    const descriptions = new Map<string, { id: number; description: string }>();
    problemTypes.forEach(current => {
      const normalizedDesc = current.description.trim().toLowerCase();
      if (!descriptions.has(normalizedDesc)) {
        descriptions.set(normalizedDesc, { id: current.id, description: current.description });
      }
    });
    return Array.from(descriptions.values()).map(p => ({ 
        value: String(p.id), 
        label: p.description.charAt(0).toUpperCase() + p.description.slice(1).toLowerCase() 
    }));
  }, [problemTypes]);
  
  const handleMarcaChange = (value: string) => {
    setSelectedMarca(value);
    setSelectedModeloId(''); // Reset model when brand changes
  };
  
  const handleClientChange = (value: string) => {
    setSelectedClientId(value);
    const client = clients.find(c => String(c.id) === value);
    if (client) {
      setContactPerson(client.persona_contacto || '');
      setContactPhone(client.phone || '');
      setClientEmail(client.email || '');
    } else {
      setContactPerson('');
      setContactPhone('');
      setClientEmail('');
    }
  };

  const resetForm = () => {
    if (formRef.current) {
        formRef.current.reset();
    }
    setSelectedClientId('');
    setContactPerson('');
    setContactPhone('');
    setClientEmail('');
    setSelectedMarca('');
    setSelectedModeloId('');
    setSelectedProblemaId('');
    setAsistenciaTipo('');
    setCasoResuelto('Si');
    setAccesoRemoto('');
    setEscalationEmail('');
    setEscalationNotes('');
    setFormKey(Date.now()); // Change key to force re-render of the form
  };

  const showTicketCreationToast = (ticketId: string) => {
    toast({
      title: "Ticket Creado Exitosamente",
      description: `El nuevo ticket ${ticketId} ha sido registrado.`,
      action: (
        <Button asChild variant="secondary">
          <Link href="/dashboard/tickets">Ver Tickets</Link>
        </Button>
      ),
    });
  }
  
  const openSurveyDialog = (ticketId: string, ticketDocId: number, clientId: number, clientEmail: string, contactPersonName: string, technicianName: string) => {
     setTicketDataForSurvey({
        clientId: clientId,
        ticketId: ticketId,
        ticketDocId: ticketDocId,
        clientEmail: clientEmail,
        contactPersonName,
        technicianName,
    });
    setIsSurveyDialogOpen(true);
  }

  const handleSave = async (formData: FormData, escalate = false) => {
    const data = Object.fromEntries(formData.entries());

    if (!currentUser) {
        toast({ title: "Error", description: "No se pudo identificar al técnico. Por favor, recargue la página.", variant: "destructive"});
        return;
    }
    
    // --- Logic to update client data ---
    const clientId = data.cliente as string;
    if (clientId) {
        const clientUpdatePayload: Partial<Client> = {};
        const formContactPerson = data.persona_contacto as string;
        const formContactPhone = data.telefono as string;
        const formClientEmail = data.email_cliente as string;

        // Populate payload only with fields that have a value
        if (formContactPerson) clientUpdatePayload.persona_contacto = formContactPerson;
        if (formContactPhone) clientUpdatePayload.phone = formContactPhone;
        if (formClientEmail) clientUpdatePayload.email = formClientEmail;
        
        if (Object.keys(clientUpdatePayload).length > 0) {
            try {
                await updateClient(clientId, clientUpdatePayload);
                // Refresh local data to reflect changes immediately in the UI if needed
                setClients(prevClients => 
                    prevClients.map(c => 
                        String(c.id) === clientId ? { ...c, ...clientUpdatePayload } : c
                    )
                );
            } catch (e) {
                console.error("Failed to update client data:", e);
                // Not showing a toast here to avoid clutter, but logging the error.
            }
        }
    }
    // --- End of client update logic ---

    const newTicketData: Omit<Ticket, 'id' | 'codigo' | 'fecha_creacion'> = {
      id_cliente: Number(data.cliente),
      persona_contacto: data.persona_contacto as string,
      id_equipo: Number(data.modelo),
      id_problema: Number(data.problema),
      id_usuario: currentUser.id,
      asistencia_tipo: data.asistencia_tipo as any,
      resuelto: escalate ? "Escalado" : (data.caso_resuelto as any),
      acceso_remoto: data.acceso_remoto as any,
      horas: Number(data.horas),
      minutes: Number(data.minutos),
      description: data.descripcion as string,
      solution: data.descripcion as string,
    };

    try {
      const { id: newTicketId, code: newTicketCode } = await getNextTicketIdAndCode();
      const newTicket = await addTicket(newTicketData, newTicketId, newTicketCode);

      showTicketCreationToast(newTicket.codigo);
      
      // Always open survey dialog unless escalating
      if (!escalate) {
          openSurveyDialog(newTicket.codigo, newTicket.id, newTicket.id_cliente, data.email_cliente as string, newTicket.persona_contacto, currentUser.name);
      } else {
          resetForm();
      }
    } catch (error) {
      console.error("Error saving new ticket:", error);
      toast({
        title: "Error al guardar el ticket",
        description: "No se pudo registrar el ticket. Por favor, intente nuevamente.",
        variant: "destructive",
      });
    }
  }

  const handleEscalate = async () => {
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    
    const data = Object.fromEntries(formData.entries());
    
    try {
      const escalationResult = await sendEscalationEmail({
        clientId: Number(data.cliente),
        contactPhone: data.telefono as string,
        problemDescription: data.descripcion as string,
        escalationEmail: escalationEmail,
        escalationNotes: escalationNotes,
      });

      if (escalationResult.success) {
        toast({
          title: "Ticket Escalado Enviado",
          description: `Correo enviado a ${escalationEmail} con los detalles del ticket.`,
        });
        // Now, save the ticket with "Escalado" state
        await handleSave(formData, true);
      } else {
         console.error("Error al escalar ticket:", escalationResult.error);
         toast({
          title: "Error al Escalar",
          description: escalationResult.error || "No se pudo enviar el correo de escalación.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Unexpected error escalating ticket:", error);
      toast({
        title: "Error al Escalar",
        description: "Ocurrió un error inesperado al escalar el ticket.",
        variant: "destructive",
      });
    } finally {
      setIsEscalationDialogOpen(false);
    }
  }

  const handleSendSurvey = async () => {
    if (!ticketDataForSurvey) return;
    setIsSurveyDialogOpen(false);
    
    // Captura la URL base actual para enviarla a la acción del servidor
    const currentBaseUrl = typeof window !== 'undefined' ? window.location.origin : undefined;

    try {
      const surveyResult = await sendSurveyEmail({
          ...ticketDataForSurvey,
          baseUrl: currentBaseUrl
      });

      if (surveyResult.success) {
           toast({
              title: "Encuesta Enviada",
              description: `Se envió la encuesta de satisfacción a ${surveyResult.clientName}.`,
          });
      } else {
        console.error("Error al enviar encuesta:", surveyResult.error);
        toast({
          title: "Atención: No se envió la encuesta",
          description: surveyResult.error || "No se pudo enviar el correo de encuesta.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Unexpected error sending survey email:", error);
      toast({
        title: "Atención: No se envió la encuesta",
        description: "Ocurrió un error inesperado al enviar el correo de encuesta.",
        variant: "destructive",
      });
    } finally {
      resetForm();
    }
  }

  const handleCloseSurveyDialog = () => {
    setIsSurveyDialogOpen(false);
    resetForm();
  }
  
  const handleWhatsappSurvey = () => {
    toast({
        title: "Función no disponible",
        description: "El envío de encuestas por WhatsApp no está implementado.",
    });
    handleCloseSurveyDialog();
  }

  const validateAndSubmit = (handler: (formData: FormData) => void) => {
    if (!formRef.current) return;
    
    if (!formRef.current.checkValidity()) {
      formRef.current.reportValidity();
      toast({
          title: "Formulario Incompleto",
          description: "Por favor, complete todos los campos obligatorios.",
          variant: "destructive",
      });
      return;
    }
    
    const formData = new FormData(formRef.current);
    handler(formData);
  }

  const handleNewItem = async (itemType: string) => {
    try {
      let newItem: any;
      if (itemType === 'Cliente') {
        if (!newClientName.trim()) return;
        const q = query(collection(db, "clients"), where("name", "==", newClientName.trim()));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            toast({ title: "Cliente Duplicado", description: "Ya existe un cliente con ese nombre.", variant: 'destructive' });
            return;
        }
        newItem = await addClient({ name: newClientName, email: 'completar@cliente.com', persona_contacto: 'No definido', phone: '00000000', company: newClientName });
        setClients(prev => [...prev, newItem]);
        setSelectedClientId(String(newItem.id));
        setIsClientDialogOpen(false);
        setNewClientName('');
      } else if (itemType === 'Marca') {
        if (!newBrandName.trim()) return;
        const exists = marcaOptions.some(m => m.label.trim().toLowerCase() === newBrandName.trim().toLowerCase());
        if (exists) {
            toast({ title: "Marca Duplicada", description: "Ya existe una marca con ese nombre.", variant: 'destructive' });
            return;
        }
        newItem = await addEquipment({ marca: newBrandName, modelo: 'Genérico' });
        const updatedEquipment = await getEquipment();
        setEquipment(updatedEquipment);
        setSelectedMarca(newBrandName);
        setSelectedModeloId(String(newItem.id));
        setIsBrandDialogOpen(false);
        setNewBrandName('');
      } else if (itemType === 'Modelo') {
         if (!newModelName.trim() || !selectedMarca) return;
         const q = query(collection(db, "equipment"), where("marca", "==", selectedMarca), where("modelo", "==", newModelName.trim()));
         const querySnapshot = await getDocs(q);
         if (!querySnapshot.empty) {
            toast({ title: "Modelo Duplicado", description: `Ya existe el modelo '${newModelName}' para la marca '${selectedMarca}'.`, variant: 'destructive' });
            return;
         }
         newItem = await addEquipment({ marca: selectedMarca, modelo: newModelName });
         setEquipment(prev => [...prev, newItem]);
         setSelectedModeloId(String(newItem.id));
         setIsModelDialogOpen(false);
         setNewModelName('');
      } else if (itemType === 'Problema') {
        if (!newProblemDescription.trim()) return;
        const q = query(collection(db, "problemTypes"), where("description", "==", newProblemDescription.trim()));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
           toast({ title: "Problema Duplicado", description: "Ya existe un tipo de problema con esa descripción.", variant: 'destructive' });
           return;
        }
        newItem = await addProblemType({ description: newProblemDescription });
        setProblemTypes(prev => [...prev, newItem]);
        setSelectedProblemaId(String(newItem.id));
        setIsProblemDialogOpen(false);
        setNewProblemDescription('');
      }
       toast({
          title: `Nuevo ${itemType} Agregado`,
          description: `El ${itemType.toLowerCase()} ha sido guardado y seleccionado.`,
      });
    } catch(error) {
       console.error(`Error al agregar ${itemType}:`, error);
       toast({
          title: `Error al agregar ${itemType}`,
          description: `No se pudo guardar el nuevo ${itemType.toLowerCase()}.`,
          variant: 'destructive',
      });
    }
  }
  
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
                <div key={i} className="grid gap-2">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
             <div className="grid gap-3 mt-6">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-24 w-full" />
             </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
    <form ref={formRef} onSubmit={(e) => e.preventDefault()} key={formKey}>
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Registro de Actividad</CardTitle>
          <CardDescription>Complete el formulario para crear un nuevo ticket de soporte.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="grid gap-3">
              <Label htmlFor="cliente">Cliente</Label>
              <div className="flex gap-2">
                 <Combobox
                    options={clientOptions}
                    value={selectedClientId}
                    onChange={handleClientChange}
                    placeholder="Buscar y seleccionar cliente"
                    searchPlaceholder="Escriba para buscar..."
                    emptyText="No se encontraron clientes."
                    name="cliente"
                    required
                 />
                <Dialog open={isClientDialogOpen} onOpenChange={setIsClientDialogOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="icon" aria-label="Agregar nuevo cliente">
                            <PlusCircle className="h-4 w-4" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                        <DialogTitle>Agregar Nuevo Cliente</DialogTitle>
                        <DialogDescription>
                           Ingrese el nombre para el nuevo cliente que desea agregar.
                        </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="client_name" className="text-right">Nombre</Label>
                                <Input id="client_name" placeholder="Ej: Mi Empresa SRL" className="col-span-3" required value={newClientName} onChange={e => setNewClientName(e.target.value)} />
                            </div>
                        </div>
                        <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="secondary">Cancelar</Button></DialogClose>
                        <Button type="button" onClick={() => handleNewItem("Cliente")}>Guardar Cliente</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
              </div>
            </div>
            <div className="grid gap-3">
              <Label htmlFor="persona_contacto">Persona de Contacto</Label>
              <Input id="persona_contacto" name="persona_contacto" type="text" placeholder="Ej: Juan Perez" required value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
            </div>
             <div className="grid gap-3">
              <Label htmlFor="telefono">Número de teléfono</Label>
              <Input 
                id="telefono" 
                name="telefono" 
                type="text" 
                placeholder="099123456" 
                required 
                maxLength={9}
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                onInput={(e) => {
                  const target = e.target as HTMLInputElement;
                  target.value = target.value.replace(/[^0-9]/g, '').slice(0, 9);
                }}
              />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="email_cliente">Correo del Cliente</Label>
              <Input id="email_cliente" name="email_cliente" type="email" placeholder="ejemplo@cliente.com" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="marca">Marca</Label>
               <div className="flex gap-2">
                <Combobox
                    options={marcaOptions}
                    value={selectedMarca}
                    onChange={handleMarcaChange}
                    placeholder="Seleccionar marca"
                    searchPlaceholder="Buscar marca..."
                    emptyText="No se encontraron marcas."
                    name="marca"
                    required
                />
                 <Dialog open={isBrandDialogOpen} onOpenChange={setIsBrandDialogOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="icon" aria-label="Agregar nueva marca">
                            <PlusCircle className="h-4 w-4" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                        <DialogTitle>Agregar Nueva Marca</DialogTitle>
                        <DialogDescription>
                            Ingrese el nombre para la nueva marca que desea agregar.
                        </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="brand_name" className="text-right">Nombre</Label>
                            <Input id="brand_name" placeholder="Ej: Apple" className="col-span-3" value={newBrandName} onChange={e => setNewBrandName(e.target.value)} />
                        </div>
                        </div>
                        <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="secondary">Cancelar</Button></DialogClose>
                        <Button type="button" onClick={() => handleNewItem("Marca")}>Guardar Marca</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
              </div>
            </div>
            <div className="grid gap-3">
              <Label htmlFor="modelo">Modelo</Label>
              <div className='flex gap-2'>
                <Combobox
                    options={modeloOptions}
                    value={selectedModeloId}
                    onChange={setSelectedModeloId}
                    placeholder="Seleccionar modelo"
                    searchPlaceholder="Buscar modelo..."
                    emptyText="No hay modelos para esta marca."
                    name="modelo"
                    required
                    disabled={!selectedMarca}
                />
                 <Dialog open={isModelDialogOpen} onOpenChange={setIsModelDialogOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="icon" aria-label="Agregar nuevo modelo" disabled={!selectedMarca}>
                            <PlusCircle className="h-4 w-4" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                        <DialogTitle>Agregar Nuevo Modelo</DialogTitle>
                        <DialogDescription>
                            Ingrese el nombre del nuevo modelo para la marca <strong>{selectedMarca}</strong>.
                        </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="model_name" className="text-right">Nombre</Label>
                            <Input id="model_name" placeholder="Ej: MacBook Pro" className="col-span-3" value={newModelName} onChange={e => setNewModelName(e.target.value)} />
                        </div>
                        </div>
                        <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="secondary">Cancelar</Button></DialogClose>
                        <Button type="button" onClick={() => handleNewItem("Modelo")}>Guardar Modelo</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
              </div>
            </div>
            <div className="grid gap-3">
              <Label htmlFor="problema">Tipo de Problema</Label>
              <div className='flex gap-2'>
                <Combobox
                    options={problemaOptions}
                    value={selectedProblemaId}
                    onChange={setSelectedProblemaId}
                    placeholder="Seleccionar problema común"
                    searchPlaceholder="Buscar problema..."
                    emptyText="No se encontraron problemas."
                    name="problema"
                    required
                />
                <Dialog open={isProblemDialogOpen} onOpenChange={setIsProblemDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="icon" aria-label="Agregar nuevo problema">
                        <PlusCircle className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Agregar Nuevo Tipo de Problema</DialogTitle>
                      <DialogDescription>
                        Ingrese la descripción para el nuevo tipo de problema que desea agregar.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="problem_description" className="text-right">Descripción</Label>
                        <Input id="problem_description" placeholder="Ej: Falla de software" className="col-span-3" value={newProblemDescription} onChange={e => setNewProblemDescription(e.target.value)} />
                      </div>
                    </div>
                    <DialogFooter>
                      <DialogClose asChild><Button type="button" variant="secondary">Cancelar</Button></DialogClose>
                      <Button type="button" onClick={() => handleNewItem("Problema")}>Guardar Problema</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
             <div className="grid gap-3">
                <Label htmlFor="asistencia_tipo">Tipo de Asistencia</Label>
                <Combobox
                    options={[
                        { value: 'Llamada', label: 'Llamada' },
                        { value: 'Whatsapp', label: 'Whatsapp' },
                        { value: 'Correo', label: 'Correo' }
                    ]}
                    value={asistenciaTipo} 
                    onChange={setAsistenciaTipo} 
                    placeholder="Seleccionar tipo"
                    name="asistencia_tipo"
                    required
                />
            </div>
             <div className="grid gap-3">
                <Label htmlFor="caso_resuelto">Caso Resuelto</Label>
                 <Combobox
                    options={[
                        { value: 'Si', label: 'Si' },
                        { value: 'No', label: 'No' }
                    ]}
                    value={casoResuelto} 
                    onChange={setCasoResuelto} 
                    name="caso_resuelto"
                    required
                />
            </div>
             <div className="grid gap-3">
                <Label htmlFor="acceso_remoto">Acceso Remoto</Label>
                <Combobox
                    options={[
                        { value: 'Si', label: 'Si' },
                        { value: 'No', label: 'No' }
                    ]}
                    value={accesoRemoto}
                    onChange={setAccesoRemoto}
                    placeholder="Seleccionar opción"
                    name="acceso_remoto"
                    required
                />
            </div>
             <div className="grid gap-3">
                <Label>Tiempo de Atención</Label>
                <div className="flex gap-2">
                    <Input id="horas" name="horas" type="number" placeholder="Horas" min="0" required defaultValue="0" />
                    <Input id="minutos" name="minutos" type="number" placeholder="Minutos" min="0" max="59" required defaultValue="0"/>
                </div>
            </div>
          </div>
          <div className="grid gap-3 mt-6">
            <Label htmlFor="descripcion">Descripción del Problema y Solución</Label>
            <Textarea id="descripcion" name="descripcion" placeholder="Describa el problema reportado y la solución aplicada..." rows={5} required />
          </div>
        </CardContent>
      </Card>
      
      <div className="flex justify-end gap-2">
        <Button variant="outline" asChild><Link href="/dashboard">Cancelar</Link></Button>
        <Button variant="secondary" onClick={() => {
            if (formRef.current && formRef.current.checkValidity()) {
                setIsEscalationDialogOpen(true);
            } else {
                validateAndSubmit(() => {}); // This will just trigger validation
            }
        }}>Escalar Ticket</Button>
        <Button onClick={() => validateAndSubmit((formData) => handleSave(formData, false))}>Guardar Ticket</Button>
      </div>
    </div>
    </form>

    <Dialog open={isEscalationDialogOpen} onOpenChange={setIsEscalationDialogOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Escalar Ticket</DialogTitle>
          <DialogDescription>
            Ingrese el correo y una nota para enviar los detalles del ticket.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="escalation_email">Email de Destino</Label>
            <Input 
              id="escalation_email" 
              type="email"
              placeholder="tecnico@ejemplo.com" 
              value={escalationEmail}
              onChange={(e) => setEscalationEmail(e.target.value)}
              required
            />
          </div>
           <div className="grid gap-2">
            <Label htmlFor="escalation_notes">Nota de Escalación</Label>
            <Textarea
              id="escalation_notes"
              placeholder="Ej: El cliente reporta que el problema persiste después de reiniciar..."
              value={escalationNotes}
              onChange={(e) => setEscalationNotes(e.target.value)}
              required
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => setIsEscalationDialogOpen(false)}>Cancelar</Button>
          <Button type="button" onClick={handleEscalate} disabled={!escalationEmail || !escalationNotes}>Confirmar Escalación</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

     <Dialog open={isSurveyDialogOpen} onOpenChange={setIsSurveyDialogOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Encuesta de Satisfacción</DialogTitle>
          <DialogDescription>
            ¿Desea enviar una encuesta de satisfacción al cliente?
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
                Seleccione el método de envío. La opción de WhatsApp no está implementada.
            </p>
            <div className="flex justify-center gap-4">
                 <Button onClick={handleSendSurvey} className="flex-1">
                    <Mail className="mr-2 h-4 w-4" />
                    Enviar por Correo
                </Button>
                <Button onClick={handleWhatsappSurvey} className="flex-1" disabled>
                     <MessageCircle className="mr-2 h-4 w-4" />
                    Enviar por WhatsApp
                </Button>
            </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={handleCloseSurveyDialog}>No Enviar y Finalizar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
