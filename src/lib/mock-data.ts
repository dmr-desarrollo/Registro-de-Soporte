import type { Ticket, User, Client, ProblemType, Equipment } from "./types";

// --- INSTRUCCIONES ---
// Se han limpiado los datos de ejemplo a petición del usuario.
// La base de datos se puede poblar directamente desde la aplicación.

export const mockUsers: User[] = [
  { id: "1", name: "Admin General", email: "desarrollo@dmr.com.uy", role: "admin", activo: true, fecha_creacion: "2024-01-01" },
];

export const mockClients: Client[] = [];

export const mockEquipment: Equipment[] = [];

export const mockProblemTypes: ProblemType[] = [];

export const mockTickets: Ticket[] = [];
