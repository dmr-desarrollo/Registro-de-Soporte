"use client"

import { useEffect, useState } from "react"
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
import { Badge } from "@/components/ui/badge"
import { Ticket, Users, CheckCircle, Clock } from "lucide-react"
import { getTicketDisplayData, getTickets, getUsers, getClients, getEquipment, getProblemTypes } from "@/lib/firestore"
import type { TicketDisplay, User } from "@/lib/types"
import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardPage() {
  const [tickets, setTickets] = useState<TicketDisplay[]>([]);
  const [totalTickets, setTotalTickets] = useState(0);
  const [resolvedTickets, setResolvedTickets] = useState(0);
  const [pendingTickets, setPendingTickets] = useState(0);
  const [activeTechnicians, setActiveTechnicians] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [allTickets, allUsers, clients, equipment, problemTypes] = await Promise.all([
          getTickets(),
          getUsers(),
          getClients(),
          getEquipment(),
          getProblemTypes()
        ]);
        
        // Sort tickets by ID descending (most recent first) and then get display data for the top 10
        allTickets.sort((a, b) => b.id - a.id);
        const recentTickets = allTickets.slice(0, 10);
        const displayTickets = await getTicketDisplayData(recentTickets, clients, allUsers, equipment, problemTypes);
        
        const technicians = allUsers.filter(u => u.role === 'tecnico');

        setTickets(displayTickets);
        setTotalTickets(allTickets.length);
        const resolved = allTickets.filter(t => t.resuelto === 'Si').length;
        setResolvedTickets(resolved);
        setPendingTickets(allTickets.length - resolved);
        setActiveTechnicians(technicians.filter(t => t.activo).length);
      } catch (error) {
          console.error("Error fetching dashboard data:", error)
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);


  const getStatusVariant = (status: string) => {
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
  
  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-1/3" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card><CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader><CardContent><Skeleton className="h-10 w-1/2" /></CardContent></Card>
          <Card><CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader><CardContent><Skeleton className="h-10 w-1/2" /></CardContent></Card>
          <Card><CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader><CardContent><Skeleton className="h-10 w-1/2" /></CardContent></Card>
          <Card><CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader><CardContent><Skeleton className="h-10 w-1/2" /></CardContent></Card>
        </div>
        <Card>
          <CardHeader><Skeleton className="h-8 w-1/4" /></CardHeader>
          <CardContent><Skeleton className="h-48 w-full" /></CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Dashboard de Soporte</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Tickets
            </CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTickets}</div>
            <p className="text-xs text-muted-foreground">
              Tickets registrados en total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tickets Resueltos</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resolvedTickets}</div>
            <p className="text-xs text-muted-foreground">
              Casos cerrados exitosamente
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tickets Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingTickets}</div>
            <p className="text-xs text-muted-foreground">
              Casos abiertos actualmente
            </p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Técnicos Activos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeTechnicians}</div>
            <p className="text-xs text-muted-foreground">
              Técnicos registrando actividad
            </p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Actividad Reciente</CardTitle>
          <CardDescription>
            Últimos tickets registrados en el sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Problema</TableHead>
                <TableHead className="text-right">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map((ticket) => (
                 <TableRow key={ticket.id}>
                  <TableCell>
                    <div className="font-medium">{ticket.client}</div>
                    <div className="text-sm text-muted-foreground">{ticket.id}</div>
                  </TableCell>
                  <TableCell>{ticket.problemType}</TableCell>
                  <TableCell className="text-right">
                     <Badge variant={'default'} className={getStatusVariant(ticket.status)}>{ticket.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
