
export type User = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "tecnico" | "usuario";
  info_basica?: any;
  fecha_creacion?: string;
  activo?: boolean;
};

export type Client = {
  id: number;
  name: string;
  rut?: string;
  email: string;
  client_code?: string;
  persona_contacto: string;
  phone: string;
  company: string;
  creado_en?: string;
};

export type Equipment = {
  id: number;
  marca: string;
  modelo: string;
};

export type ProblemType = {
  id: number;
  description: string;
  fecha_creacion?: string;
};

export type Ticket = {
  id: number;
  codigo: string; // SOP-0001
  id_cliente: number;
  persona_contacto: string;
  id_equipo: number;
  id_problema: number;
  id_usuario: string; // Tecnico asignado
  asistencia_tipo: "Llamada" | "Whatsapp" | "Correo";
  resuelto: "Si" | "No" | "Escalado";
  acceso_remoto: "Si" | "No";
  horas: number;
  minutes: number;
  description: string;
  solution?: string;
  fecha_creacion: string;
  rating?: number; // 1 for Regular, 2 for Bueno, 3 for Excelente
  fecha_calificacion?: string;
};

// Mapeos para la UI que usan datos de las tablas principales
export type TicketDisplay = {
  id: string; // codigo: "SOP-0001"
  creationDate: string;
  technician: string;
  equipment: string; // e.g., "HP LaserJet Pro M404dn"
  problemType: string;
  description: string;
  status: "Resuelto" | "Pendiente" | "Escalado"; // Mapeado de 'resuelto'
  client: string;
};

    
