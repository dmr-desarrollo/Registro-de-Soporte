
"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getClients, getTickets, updateMultipleClients, updateClient } from "@/lib/firestore"
import { Download, RefreshCw, MoreHorizontal } from "lucide-react"
import type { Client } from "@/lib/types"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"


export default function ClientsPage() {
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecovering, setIsRecovering] = useState(false);
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  // State for editing
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editFormData, setEditFormData] = useState({
      name: '',
      persona_contacto: '',
      phone: '',
      email: '',
  });


  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const clientsData = await getClients();
      const sortedClients = clientsData.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      setAllClients(sortedClients);
    } catch (error) {
        console.error("Error fetching clients data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [])

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  // Reset to first page when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const filteredClients = useMemo(() => {
    if (!searchQuery) {
        return allClients;
    }
    return allClients.filter(client =>
      (client.name && client.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (client.persona_contacto && client.persona_contacto.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (client.phone && client.phone.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [allClients, searchQuery]);
  
  const totalPages = useMemo(() => {
    return Math.ceil(filteredClients.length / itemsPerPage);
  }, [filteredClients, itemsPerPage]);

  const paginatedClients = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredClients.slice(startIndex, endIndex);
  }, [filteredClients, currentPage, itemsPerPage]);


  const handleRecoverData = async () => {
    setIsRecovering(true);
    try {
        const allTickets = await getTickets();
        const currentClients = await getClients();

        const latestContacts = new Map<number, string>();

        const sortedTickets = [...allTickets].sort((a, b) => new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime());

        for (const ticket of sortedTickets) {
            if (!latestContacts.has(ticket.id_cliente) && ticket.persona_contacto && ticket.persona_contacto.trim() !== '') {
                latestContacts.set(ticket.id_cliente, ticket.persona_contacto);
            }
        }

        const updates: { id: string; data: Partial<Client> }[] = [];
        
        for (const client of currentClients) {
            const latestContact = latestContacts.get(client.id);
            if (latestContact && (!client.persona_contacto || client.persona_contacto === 'No definido' || client.persona_contacto.trim() === '')) {
                updates.push({ id: String(client.id), data: { persona_contacto: latestContact } });
            }
        }

        if (updates.length > 0) {
            await updateMultipleClients(updates);
            toast({
                title: "Recuperación Exitosa",
                description: `Se actualizaron los datos de contacto para ${updates.length} clientes.`,
            });
            await fetchData();
        } else {
            toast({
                title: "No hay datos para recuperar",
                description: "Todos los clientes aplicables ya tienen una persona de contacto.",
            });
        }

    } catch (error) {
        console.error("Error recovering data:", error);
        toast({ title: "Error", description: "Ocurrió un error durante la recuperación de datos.", variant: "destructive" });
    } finally {
        setIsRecovering(false);
    }
  };

  const convertToCSV = (data: Client[]) => {
    const headers = ["Nombre Cliente", "Persona de Contacto", "Teléfono", "Email", "Empresa"];
    const rows = data.map(client =>
      [
        `"${(client.name || '').replace(/"/g, '""')}"`,
        `"${(client.persona_contacto || '').replace(/"/g, '""')}"`,
        `"${client.phone || ''}"`,
        `"${client.email || ''}"`,
        `"${(client.company || '').replace(/"/g, '""')}"`,
      ].join(',')
    );
    return [headers.join(','), ...rows].join('\n');
  }

  const handleExport = () => {
    const csvData = convertToCSV(filteredClients);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8,' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'lista_clientes.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  const handleEditClick = (client: Client) => {
    setEditingClient(client);
    setEditFormData({
        name: client.name || '',
        persona_contacto: client.persona_contacto || '',
        phone: client.phone || '',
        email: client.email || '',
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;

    try {
        await updateClient(String(editingClient.id), editFormData);
        toast({ title: "Cliente Actualizado", description: "Los datos del cliente han sido guardados." });
        setIsEditDialogOpen(false);
        setEditingClient(null);
        fetchData(); // Refetch data to update the table
    } catch (error) {
        console.error("Error updating client:", error);
        toast({ title: "Error", description: "No se pudo actualizar el cliente.", variant: "destructive" });
    }
  };


  return (
    <>
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Listado de Clientes</CardTitle>
          <CardDescription>
            Aquí puede ver, buscar y editar los clientes registrados en el sistema. Use el botón de recuperar para poblar datos de contacto desde los tickets.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row flex-wrap gap-2 mb-4">
              <Input
                  placeholder="Buscar por cliente, contacto, teléfono..."
                  className="flex-1 min-w-[200px]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Button variant="outline" onClick={handleExport}>
                  <Download className="mr-2 h-4 w-4" />
                  Exportar a CSV
              </Button>
              <Button variant="outline" onClick={handleRecoverData} disabled={isRecovering}>
                  {isRecovering ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Recuperar Contactos
              </Button>
          </div>
          <div className="flex items-center justify-end space-x-2 py-4">
              <span className="text-sm text-muted-foreground">
                  Página {currentPage} de {totalPages > 0 ? totalPages : 1}
              </span>
              <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
              >
                  Anterior
              </Button>
              <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages || totalPages === 0}
              >
                  Siguiente
              </Button>
          </div>
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre Cliente</TableHead>
                <TableHead>Persona de Contacto</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Email</TableHead>
                <TableHead><span className="sr-only">Acciones</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                 Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                 ))
              ) : paginatedClients.length > 0 ? (
                  paginatedClients.map((client) => (
                  <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell>{client.persona_contacto}</TableCell>
                      <TableCell>{client.phone}</TableCell>
                      <TableCell>{client.email}</TableCell>
                      <TableCell className="text-right">
                          <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                  <Button size="icon" variant="ghost">
                                      <MoreHorizontal className="h-4 w-4" />
                                      <span className="sr-only">Abrir menú</span>
                                  </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                  <DropdownMenuItem onClick={() => handleEditClick(client)}>
                                      Editar
                                  </DropdownMenuItem>
                              </DropdownMenuContent>
                          </DropdownMenu>
                      </TableCell>
                  </TableRow>
                  ))
              ) : (
                  <TableRow>
                      <TableCell colSpan={5} className="text-center">
                        {searchQuery ? "No se encontraron clientes con su búsqueda." : "No se encontraron clientes."}
                      </TableCell>
                  </TableRow>
              )}
            </TableBody>
          </Table>
          </div>
           <div className="flex items-center justify-end space-x-2 py-4">
              <span className="text-sm text-muted-foreground">
                  Página {currentPage} de {totalPages > 0 ? totalPages : 1}
              </span>
              <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
              >
                  Anterior
              </Button>
              <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages || totalPages === 0}
              >
                  Siguiente
              </Button>
          </div>
        </CardContent>
      </Card>
    </div>
    
    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Editar Cliente</DialogTitle>
                <DialogDescription>
                    Modifique los datos del cliente. Haga clic en guardar cuando haya terminado.
                </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdateClient}>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="edit-name">Nombre del Cliente</Label>
                        <Input
                            id="edit-name"
                            value={editFormData.name}
                            onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                            required
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="edit-contact">Persona de Contacto</Label>
                        <Input
                            id="edit-contact"
                            value={editFormData.persona_contacto}
                            onChange={(e) => setEditFormData({ ...editFormData, persona_contacto: e.target.value })}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="edit-phone">Teléfono</Label>
                        <Input
                            id="edit-phone"
                            value={editFormData.phone}
                            onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="edit-email">Email</Label>
                        <Input
                            id="edit-email"
                            type="email"
                            value={editFormData.email}
                            onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="secondary">Cancelar</Button>
                    </DialogClose>
                    <Button type="submit">Guardar Cambios</Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>
    </>
  )
}
