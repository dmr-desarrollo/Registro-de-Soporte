
"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getTicketDisplayData, getTickets, getUsers, getClients, getEquipment, getProblemTypes } from "@/lib/firestore"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, MoreHorizontal, Search, X } from "lucide-react"
import type { TicketDisplay, User } from "@/lib/types"
import { Skeleton } from "@/components/ui/skeleton"

export default function TicketsPage() {
  const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  
  const [allDisplayTickets, setAllDisplayTickets] = useState<TicketDisplay[]>([]);
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("todos");
  const [selectedTechnician, setSelectedTechnician] = useState("todos");
  const [filteredTickets, setFilteredTickets] = useState<TicketDisplay[]>([]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [ticketsData, usersData, clientsData, equipmentData, problemTypesData] = await Promise.all([
          getTickets(),
          getUsers(),
          getClients(),
          getEquipment(),
          getProblemTypes(),
        ]);
        
        const displayData = await getTicketDisplayData(ticketsData, clientsData, usersData, equipmentData, problemTypesData);
        const sortedDisplayData = displayData.sort((a, b) => parseInt(b.id.split('-')[1], 10) - parseInt(a.id.split('-')[1], 10));

        setAllDisplayTickets(sortedDisplayData);
        setFilteredTickets(sortedDisplayData);
        setTechnicians(usersData.filter(u => u.role === 'tecnico'));
      } catch (error) {
          console.error("Error fetching ticket data:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage);
  const paginatedTickets = filteredTickets.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getBadgeVariant = (status: string) => {
    switch (status) {
      case 'Resuelto':
        return 'bg-green-500';
      case 'Pendiente':
        return 'bg-yellow-500';
      case 'Escalado':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  }

  const handleSearch = () => {
    let tickets = [...allDisplayTickets];

    if (searchQuery) {
      tickets = tickets.filter(ticket => 
        ticket.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.id.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (selectedMonth && selectedMonth !== 'todos') {
        const monthIndex = months.findIndex(m => m.toLowerCase() === selectedMonth);
        if(monthIndex > -1){
             tickets = tickets.filter(ticket => {
                const ticketMonth = new Date(ticket.creationDate).getMonth();
                return ticketMonth === monthIndex;
            });
        }
    }

    if (selectedTechnician && selectedTechnician !== 'todos') {
      const tech = technicians.find(u => String(u.id) === selectedTechnician);
      if(tech){
         tickets = tickets.filter(ticket => ticket.technician === tech.name);
      }
    }

    setFilteredTickets(tickets);
    setCurrentPage(1); // Reset to first page
  }

  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedMonth("todos");
    setSelectedTechnician("todos");
    setFilteredTickets(allDisplayTickets);
    setCurrentPage(1);
  };

  const convertToCSV = (data: TicketDisplay[]) => {
    const headers = ["Código", "Fecha", "Cliente", "Técnico", "Equipo", "Problema", "Estado"];
    const rows = data.map(ticket => 
      [
        `"${ticket.id}"`,
        `"${ticket.creationDate}"`,
        `"${ticket.client}"`,
        `"${ticket.technician}"`,
        `"${ticket.equipment}"`,
        `"${ticket.problemType.replace(/"/g, '""')}"`,
        `"${ticket.status}"`
      ].join(',')
    );
    return [headers.join(','), ...rows].join('\n');
  }

  const handleExport = () => {
    const csvData = convertToCSV(filteredTickets);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-s-8,' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'actividades_atendidas.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Actividades Atendidas</CardTitle>
          <CardDescription>
            Una lista de todos los tickets de soporte registrados en el sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
              <Input 
                  placeholder="Buscar por cliente o código..." 
                  className="flex-1"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch();
                    }
                  }}
              />
              <Button onClick={handleSearch}>
                  <Search className="mr-2 h-4 w-4" />
                  Buscar
              </Button>
              <Button variant="outline" onClick={handleClearFilters}>
                  <X className="mr-2 h-4 w-4" />
                  Limpiar
              </Button>
          </div>
           <div className="flex flex-col sm:flex-row flex-wrap items-center justify-between gap-4 py-4">
              <div className="flex flex-wrap items-center gap-2">
                 <Select onValueChange={setSelectedMonth} value={selectedMonth}>
                    <SelectTrigger className="w-full sm:w-auto">
                        <SelectValue placeholder="Filtrar por mes" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="todos">Todos los meses</SelectItem>
                        {months.map(month => <SelectItem key={month} value={month.toLowerCase()}>{month}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select onValueChange={setSelectedTechnician} value={selectedTechnician}>
                    <SelectTrigger className="w-full sm:w-auto">
                        <SelectValue placeholder="Filtrar por técnico" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="todos">Todos los técnicos</SelectItem>
                        {technicians.map(tech => <SelectItem key={tech.id} value={String(tech.id)}>{tech.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Button variant="outline" onClick={handleExport}>
                    <Download className="mr-2 h-4 w-4" />
                    Exportar a CSV
                </Button>
              </div>

              <div className="flex items-center space-x-2">
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
          </div>
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Técnico</TableHead>
                <TableHead>Problema</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                 Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                 ))
              ) : paginatedTickets.length > 0 ? (
                  paginatedTickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                      <TableCell className="font-medium">{ticket.id}</TableCell>
                      <TableCell>{ticket.creationDate}</TableCell>
                      <TableCell>{ticket.client}</TableCell>
                      <TableCell>{ticket.technician}</TableCell>
                      <TableCell className="max-w-xs truncate">{ticket.problemType}</TableCell>
                      <TableCell>
                        <Badge variant={ticket.status === 'Resuelto' ? 'default' : 'secondary'} className={getBadgeVariant(ticket.status)}>{ticket.status}</Badge>
                      </TableCell>
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
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/tickets/edit/${ticket.id}`}>Editar Ticket</Link>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                  </TableRow>
                  ))
              ) : (
                  <TableRow>
                      <TableCell colSpan={7} className="text-center">No se encontraron tickets con los filtros aplicados.</TableCell>
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
    </>
  )
}
