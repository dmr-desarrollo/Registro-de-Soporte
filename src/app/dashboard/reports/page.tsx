
"use client"

import { useState, useEffect } from "react"
import type { DateRange } from "react-day-picker"
import { format, startOfYear, endOfYear, startOfMonth, endOfMonth } from "date-fns"
import { es } from 'date-fns/locale';
import { Bar, BarChart, CartesianGrid, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend, Line, LineChart, Cell } from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar as CalendarIcon, Download, Search } from "lucide-react"
import { getTickets, getUsers, getProblemTypes, getClients, getEquipment } from "@/lib/firestore"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Ticket, User, ProblemType, Client, Equipment } from "@/lib/types";

const PIE_COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

const processData = (
  tickets: Ticket[],
  problemTypes: ProblemType[],
  users: User[]
) => {
  if (!tickets || tickets.length === 0) {
    return { ticketsByPeriod: [], problemData: [], timeData: [], techData: [] };
  }
    
  const problemMap = new Map(problemTypes.map(p => [p.id, p.description]));
  const userMap = new Map(users.map(u => [u.id, u.name]));

  const ticketsByPeriod = tickets.reduce((acc, ticket) => {
      const month = format(new Date(ticket.fecha_creacion), 'MMM', { locale: es });
      const existing = acc.find(item => item.name === month);
      if (existing) {
          existing.tickets++;
      } else {
          acc.push({ name: month, tickets: 1 });
      }
      return acc;
  }, [] as { name: string, tickets: number }[]).sort((a,b) => new Date(a.name + " 1, 2024").getMonth() - new Date(b.name + " 1, 2024").getMonth());

  const problemData = tickets.reduce((acc, ticket) => {
      const problemDesc = problemMap.get(ticket.id_problema) || "Otro";
      const existing = acc.find(item => item.name === problemDesc);
      if (existing) {
          existing.value++;
      } else {
          acc.push({ name: problemDesc, value: 1 });
      }
      return acc;
  }, [] as { name: string, value: number }[]);

  const timeData = tickets.reduce((acc, ticket) => {
       const problemDesc = problemMap.get(ticket.id_problema) || "Otro";
       const totalMinutes = (ticket.horas * 60) + ticket.minutes;
       const existing = acc.find(item => item.problem === problemDesc);
       if(existing) {
          existing.totalTime += totalMinutes;
          existing.count++;
       } else {
          acc.push({ problem: problemDesc, totalTime: totalMinutes, count: 1 });
       }
       return acc;
  }, [] as {problem: string, totalTime: number, count: number}[])
  .map(item => ({ problem: item.problem, time: Math.round(item.totalTime / item.count) }));

  const techData = tickets.reduce((acc, ticket) => {
      const techName = userMap.get(ticket.id_usuario) || "Desconocido";
      let tech = acc.find(t => t.name === techName);
      if(!tech) {
          tech = { name: techName, resueltos: 0, pendientes: 0 };
          acc.push(tech);
      }
      if (ticket.resuelto === "Si") tech.resueltos++;
      else tech.pendientes++;
      return acc;
  }, [] as { name: string, resueltos: number, pendientes: number }[]);

  return { ticketsByPeriod, problemData, timeData, techData };
};

const years = [new Date().getFullYear(), new Date().getFullYear() - 1];
const months = [
    { value: "0", label: "Enero" }, { value: "1", label: "Febrero" }, { value: "2", label: "Marzo" },
    { value: "3", label: "Abril" }, { value: "4", label: "Mayo" }, { value: "5", label: "Junio" },
    { value: "6", label: "Julio" }, { value: "7", label: "Agosto" }, { value: "8", label: "Septiembre" },
    { value: "9", label: "Octubre" }, { value: "10", label: "Noviembre" }, { value: "11", label: "Diciembre" }
];

export default function ReportsPage() {
  const [allTickets, setAllTickets] = useState<Ticket[]>([]);
  const [allProblemTypes, setAllProblemTypes] = useState<ProblemType[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [allEquipment, setAllEquipment] = useState<Equipment[]>([]);

  const [chartData, setChartData] = useState(processData([], [], []));
  const [filteredTicketsForExport, setFilteredTicketsForExport] = useState<Ticket[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));
  const [selectedMonth, setSelectedMonth] = useState<string>('todos');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  
  // Effect to fetch all data only once
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tickets, pTypes, users, clients, equipment] = await Promise.all([
          getTickets(),
          getProblemTypes(),
          getUsers(),
          getClients(),
          getEquipment()
        ]);
        setAllTickets(tickets);
        setAllProblemTypes(pTypes);
        setAllUsers(users);
        setAllClients(clients);
        setAllEquipment(equipment);
      } catch (error) {
          console.error("Error fetching report data:", error)
      }
    };
    fetchData();
  }, []);

  // Effect to run the initial filter once all data is loaded
  useEffect(() => {
    if (allTickets.length > 0) {
        const year = new Date().getFullYear();
        const fromDate = startOfYear(new Date(year, 0));
        const toDate = endOfYear(new Date(year, 0));
        toDate.setHours(23, 59, 59, 999);

        const initialFiltered = allTickets.filter(t => {
            const ticketDate = new Date(t.fecha_creacion);
            return ticketDate >= fromDate && ticketDate <= toDate;
        });

        setFilteredTicketsForExport(initialFiltered);
        setChartData(processData(initialFiltered, allProblemTypes, allUsers));
    }
  }, [allTickets, allProblemTypes, allUsers]);

  // Use a separate function for filtering logic, called only by user action
  const runFilter = () => {
    let fromDate: Date | undefined;
    let toDate: Date | undefined;

    if (dateRange?.from) {
        fromDate = dateRange.from;
        toDate = dateRange.to ?? dateRange.from;
    } else {
        const year = parseInt(selectedYear);
        if (selectedMonth !== 'todos' && selectedYear) {
            const month = parseInt(selectedMonth);
            fromDate = startOfMonth(new Date(year, month));
            toDate = endOfMonth(new Date(year, month));
        } else if (selectedYear) {
            fromDate = startOfYear(new Date(year, 0));
            toDate = endOfYear(new Date(year, 0));
        }
    }
    
    if (!fromDate || allTickets.length === 0) {
        setChartData(processData([], [], []));
        setFilteredTicketsForExport([]);
        return;
    }
    
    const finalToDate = toDate ? toDate : fromDate;
    finalToDate.setHours(23, 59, 59, 999);
    
    const filtered = allTickets.filter(t => {
        const ticketDate = new Date(t.fecha_creacion);
        return ticketDate >= fromDate! && ticketDate <= finalToDate;
    });

    setFilteredTicketsForExport(filtered);
    setChartData(processData(filtered, allProblemTypes, allUsers));
  };


  const clearCustomDate = (value: string) => {
    if (value) {
      setDateRange(undefined);
    }
  }
  
  const clearYearMonth = () => {
      setSelectedYear('');
      setSelectedMonth('todos');
  }

  const convertToCSV = (data: Ticket[]) => {
    const clientMap = new Map(allClients.map(c => [c.id, c.name]));
    const userMap = new Map(allUsers.map(u => [u.id, u.name]));
    const equipmentMap = new Map(allEquipment.map(e => [e.id, `${e.marca} ${e.modelo}`]));
    const problemMap = new Map(allProblemTypes.map(p => [p.id, p.description]));

    const headers = ["Código", "Fecha Creación", "Cliente", "Técnico", "Equipo", "Problema", "Estado", "Horas", "Minutos", "Descripción", "Solución"];
    const rows = data.map(ticket => {
        return [
            `"${ticket.codigo}"`,
            `"${ticket.fecha_creacion}"`,
            `"${clientMap.get(ticket.id_cliente) || "N/A"}"`,
            `"${userMap.get(ticket.id_usuario) || "N/A"}"`,
            `"${equipmentMap.get(ticket.id_equipo) || "N/A"}"`,
            `"${problemMap.get(ticket.id_problema) || "N/A"}"`,
            `"${ticket.resuelto}"`,
            ticket.horas,
            ticket.minutes,
            `"${ticket.description.replace(/"/g, '""')}"`,
            `"${(ticket.solution || "").replace(/"/g, '""')}"`,
        ].join(',');
    });
    return [headers.join(','), ...rows].join('\n');
  }

  const handleExport = () => {
    const csvData = convertToCSV(filteredTicketsForExport);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8,' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'reporte_actividades.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  return (
    <div className="flex flex-col gap-6">
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-2xl font-bold">Reportes de Actividades</h1>
            <p className="text-muted-foreground">Analice el rendimiento y las tendencias del soporte técnico.</p>
        </div>
         <div className="flex flex-wrap items-center gap-2">
            <Select value={selectedYear} onValueChange={(v) => { setSelectedYear(v); clearCustomDate(v); }}>
                <SelectTrigger className="w-full sm:w-[120px]">
                    <SelectValue placeholder="Año" />
                </SelectTrigger>
                <SelectContent>
                    {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
            </Select>

            <Select value={selectedMonth} onValueChange={(v) => { setSelectedMonth(v); clearCustomDate(v); }}>
                <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Mes" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="todos">Todos los meses</SelectItem>
                    {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
            </Select>
            
            <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant={"outline"}
                    className={cn("w-full sm:w-[300px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}
                    onClick={clearYearMonth}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (dateRange.to ? (<>{format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}</>) : (format(dateRange.from, "LLL dd, y"))) : (<span>Rango personalizado</span>)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2}/>
                </PopoverContent>
            </Popover>
            
            <Button onClick={runFilter}>
                <Search className="mr-2 h-4 w-4" />
                Buscar
            </Button>
            <Button variant="outline" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Exportar
            </Button>
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tickets por Período</CardTitle>
            <CardDescription>Volumen de tickets de soporte gestionados.</CardDescription>
          </CardHeader>
          <CardContent>
             {chartData.ticketsByPeriod.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData.ticketsByPeriod}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="tickets" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
                </ResponsiveContainer>
             ) : (
                <div className="flex items-center justify-center h-[300px]">
                    <p>No hay datos para mostrar en este período.</p>
                </div>
             )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Tipos de Problemas Comunes</CardTitle>
            <CardDescription>Distribución de los tipos de problemas más frecuentes.</CardDescription>
          </CardHeader>
          <CardContent>
             {chartData.problemData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                    <Pie data={chartData.problemData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                        {chartData.problemData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px]">
                    <p>No hay datos para mostrar en este período.</p>
                </div>
             )}
          </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>Tiempo Promedio de Atención por Caso</CardTitle>
                <CardDescription>Tiempo en minutos dedicado a cada tipo de problema.</CardDescription>
            </CardHeader>
            <CardContent>
                 {chartData.timeData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={chartData.timeData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="problem" tick={false} />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="time" stroke="hsl(var(--primary))" strokeWidth={2} name="Minutos"/>
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex items-center justify-center h-[300px]">
                        <p>No hay datos para mostrar en este período.</p>
                    </div>
                )}
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>Rendimiento de Técnicos</CardTitle>
                <CardDescription>Comparativa de tickets atendidos por cada técnico.</CardDescription>
            </CardHeader>
            <CardContent>
                {chartData.techData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={chartData.techData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="resueltos" stackId="a" fill="hsl(var(--primary))" name="Resueltos" radius={[4, 4, 0, 0]}/>
                            <Bar dataKey="pendientes" stackId="a" fill="hsl(var(--accent))" name="Pendientes" radius={[4, 4, 0, 0]}/>
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex items-center justify-center h-[300px]">
                        <p>No hay datos para mostrar en este período.</p>
                    </div>
                )}
            </CardContent>
        </Card>
      </div>
    </div>
  )
}

    