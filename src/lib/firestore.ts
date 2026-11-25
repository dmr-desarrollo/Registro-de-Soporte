
import { collection, getDocs, doc, setDoc, updateDoc, query, getDoc, writeBatch, where, runTransaction, Firestore, deleteDoc, orderBy, limit } from "firebase/firestore";
import { db } from "./firebase";
import type { Ticket, User, Client, ProblemType, Equipment, TicketDisplay } from "./types";

export const getUsers = async (): Promise<User[]> => {
    try {
        const q = query(collection(db, "users"));
        const querySnapshot = await getDocs(q);
        const data: User[] = [];
        querySnapshot.forEach((doc) => {
            data.push(doc.data() as User);
        });
        return data;
    } catch (error) {
        console.error(`Error fetching users:`, error);
        return [];
    }
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
    try {
        const q = query(collection(db, "users"), where("email", "==", email));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            return null;
        }
        const userDoc = querySnapshot.docs[0];
        return { id: userDoc.id, ...userDoc.data() } as User;
    } catch (error) {
        console.error("Error fetching user by email:", error);
        return null;
    }
};

export const getTechnicians = async (): Promise<User[]> => {
    try {
        const q = query(collection(db, "users"), where("role", "==", "tecnico"));
        const querySnapshot = await getDocs(q);
        const technicians: User[] = [];
        querySnapshot.forEach((doc) => {
            technicians.push({ id: doc.id, ...doc.data() } as User);
        });
        return technicians;
    } catch (error) {
        console.error("Error fetching technicians:", error);
        return [];
    }
};

export const getClients = async (): Promise<Client[]> => {
    try {
        const q = query(collection(db, "clients"));
        const querySnapshot = await getDocs(q);
        const data: Client[] = [];
        querySnapshot.forEach((doc) => {
            const docData = doc.data();
            data.push({
                 ...docData,
                 id: Number(docData.id), // Ensure ID is a number for matching
            } as Client);
        });
        return data.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    } catch (error) {
        console.error(`Error fetching clients:`, error);
        return [];
    }
};

export const getEquipment = async (): Promise<Equipment[]> => {
    try {
        const q = query(collection(db, "equipment"));
        const querySnapshot = await getDocs(q);
        const data: Equipment[] = [];
        querySnapshot.forEach((doc) => {
            data.push(doc.data() as Equipment);
        });
        return data;
    } catch (error) {
        console.error(`Error fetching equipment:`, error);
        return [];
    }
};

export const getProblemTypes = async (): Promise<ProblemType[]> => {
    try {
        const q = query(collection(db, "problemTypes"));
        const querySnapshot = await getDocs(q);
        const data: ProblemType[] = [];
        querySnapshot.forEach((doc) => {
            data.push(doc.data() as ProblemType);
        });
        return data;
    } catch (error) {
        console.error(`Error fetching problemTypes:`, error);
        return [];
    }
};

export const getTickets = async (): Promise<Ticket[]> => {
    try {
        const q = query(collection(db, "tickets"));
        const querySnapshot = await getDocs(q);
        const data: Ticket[] = [];
        querySnapshot.forEach((doc) => {
            data.push(doc.data() as Ticket);
        });
        return data;
    } catch (error) {
        console.error(`Error fetching tickets:`, error);
        return [];
    }
};

export async function getTicketByCode(code: string): Promise<Ticket | null> {
    try {
        const q = query(collection(db, "tickets"), where("codigo", "==", code));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            return null;
        }
        const ticketDoc = querySnapshot.docs[0];
        return ticketDoc.data() as Ticket;
    } catch (error) {
        console.error("Error fetching ticket by code:", error);
        return null;
    }
}


export async function addUser(userData: Omit<User, 'fecha_creacion'>) {
    try {
        const userRef = doc(db, "users", userData.id);
        const newUser = {
            ...userData,
            fecha_creacion: new Date().toISOString(),
        };
        await setDoc(userRef, newUser, { merge: true });
        return newUser;
    } catch (error) {
        console.error("Error adding user:", error);
        throw error;
    }
}


export async function updateUser(userId: string, data: Partial<User>) {
    try {
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, data);
    } catch (error) {
        console.error("Error updating user:", error);
        throw error;
    }
}

export async function updateClient(clientId: string, data: Partial<Client>) {
    try {
        const clientRef = doc(db, "clients", String(clientId));
        await updateDoc(clientRef, data);
    } catch (error) {
        console.error("Error updating client:", error);
        throw error;
    }
}

export async function deleteUser(userId: string) {
    try {
        const userRef = doc(db, "users", userId);
        await deleteDoc(userRef);
    } catch (error) {
        console.error("Error deleting user:", error);
        throw error;
    }
}


async function getNextNumericId(collectionName: string): Promise<number> {
    try {
        const q = query(collection(db, collectionName));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            return 1;
        }
        let maxId = 0;
        snapshot.forEach(doc => {
            const docId = Number(doc.data().id);
            if (!isNaN(docId) && docId > maxId) {
                maxId = docId;
            }
        });
        return maxId + 1;
    } catch (error) {
        console.error(`Error getting next numeric ID for ${collectionName}:`, error);
        throw error;
    }
}

export async function getNextTicketIdAndCode(): Promise<{ id: number; code: string }> {
    try {
        const nextId = await getNextNumericId("tickets");
        const code = `SOP-${String(nextId).padStart(4, '0')}`;
        return { id: nextId, code };
    } catch (error) {
        console.error("Error getting next ticket ID and code:", error);
        throw error;
    }
}


export async function addTicket(ticketData: Omit<Ticket, 'id' | 'codigo' | 'fecha_creacion'>, ticketId?: number, ticketCode?: string) {
    try {
        let newTicketId = ticketId;
        let newTicketCode = ticketCode;
        if (newTicketId === undefined || newTicketCode === undefined) {
            const next = await getNextTicketIdAndCode();
            newTicketId = next.id;
            newTicketCode = next.code;
        }
        const newDocRef = doc(db, "tickets", String(newTicketId));
        
        const newTicket: Ticket = {
            ...ticketData,
            id: newTicketId,
            codigo: newTicketCode,
            fecha_creacion: new Date().toISOString().split('T')[0],
        };
        
        await setDoc(newDocRef, newTicket);
        return newTicket;
    } catch (error) {
        console.error("Error adding ticket:", error);
        throw error;
    }
}

export async function updateTicket(ticketId: string, data: Partial<Ticket>) {
    try {
        const ticketRef = doc(db, "tickets", ticketId);
        await updateDoc(ticketRef, data);
    } catch (error) {
        console.error("Error updating ticket:", error);
        throw error;
    }
}

const addDocument = async <T extends { id: number; [key: string]: any }>(collectionName: string, data: Omit<T, 'id'>): Promise<T> => {
    try {
        const nextId = await getNextNumericId(collectionName);
        const newDocRef = doc(db, collectionName, String(nextId));
        const newData = { ...data, id: nextId };
        await setDoc(newDocRef, newData);
        return newData as T;
    } catch (error) {
        console.error(`Error adding document to ${collectionName}:`, error);
        throw error;
    }
};

export const addClient = (clientData: Omit<Client, 'id'>) => addDocument<Client>("clients", clientData);
export const addEquipment = (equipmentData: Omit<Equipment, 'id'>) => addDocument<Equipment>("equipment", equipmentData);
export const addProblemType = (problemData: Omit<ProblemType, 'id'>) => addDocument<ProblemType>("problemTypes", problemData);

async function addBatch<T extends { id: number; [key: string]: any }>(
    collectionName: string,
    data: Omit<T, 'id'>[],
    progressCallback: (percentage: number) => void
): Promise<number> {
    try {
        let currentId = await getNextNumericId(collectionName);
        const totalRecords = data.length;
        let recordsProcessed = 0;

        for (let i = 0; i < totalRecords; i += 500) {
            const batch = writeBatch(db);
            const chunk = data.slice(i, i + 500);
            
            for (const item of chunk) {
                const docId = currentId;
                const docRef = doc(db, collectionName, String(docId));
                batch.set(docRef, { ...item, id: docId });
                currentId++;
            }
            
            await batch.commit();
            recordsProcessed += chunk.length;
            
            const progress = Math.round((recordsProcessed / totalRecords) * 100);
            progressCallback(progress);
        }

        return recordsProcessed;
    } catch (error) {
        console.error(`Error adding batch to ${collectionName}:`, error);
        throw error;
    }
}

export const addClientBatch = (
    clients: Omit<Client, 'id'>[],
    progressCallback: (p: number) => void
) => addBatch<Client>('clients', clients, progressCallback);

export const addEquipmentBatch = (
    equipment: Omit<Equipment, 'id'>[],
    progressCallback: (p: number) => void
) => addBatch<Equipment>('equipment', equipment, progressCallback);

export const addProblemTypeBatch = (
    problems: Omit<ProblemType, 'id'>[],
    progressCallback: (p: number) => void
) => addBatch<ProblemType>('problems', problems, progressCallback);


export const getTicketDisplayData = async (
    tickets: Ticket[],
    clients?: Client[],
    users?: User[],
    allEquipment?: Equipment[],
    problemTypes?: ProblemType[]
): Promise<TicketDisplay[]> => {
    try {
        if (!tickets || tickets.length === 0) return [];
        
        // Ensure all dependent data is available, fetching if not provided.
        const [clientsData, usersData, equipmentData, problemTypesData] = await Promise.all([
            clients || getClients(),
            users || getUsers(),
            allEquipment || getEquipment(),
            problemTypes || getProblemTypes(),
        ]);

        const clientMap = new Map(clientsData.map(c => [c.id, c.name]));
        const userMap = new Map(usersData.map(u => [u.id, u.name]));
        const equipmentMap = new Map(equipmentData.map(e => [e.id, `${e.marca} ${e.modelo}`]));
        const problemMap = new Map(problemTypesData.map(p => [p.id, p.description]));

        return tickets.map(ticket => {
            let status: "Resuelto" | "Pendiente" | "Escalado" = "Pendiente";
            if (ticket.resuelto === "Si") status = "Resuelto";
            if (ticket.resuelto === "Escalado") status = "Escalado";

            return {
                id: ticket.codigo,
                creationDate: ticket.fecha_creacion,
                client: clientMap.get(ticket.id_cliente) || "Desconocido",
                technician: userMap.get(String(ticket.id_usuario)) || "Desconocido",
                equipment: equipmentMap.get(ticket.id_equipo) || "Desconocido",
                problemType: problemMap.get(ticket.id_problema) || "Desconocido",
                description: ticket.description,
                status: status
            }
        });
    } catch (error) {
        console.error("Error building ticket display data:", error);
        return [];
    }
};

export async function updateTicketRating(ticketId: string, rating: number): Promise<{ success: boolean; error?: string }> {
  try {
    if (!ticketId) {
      return { success: false, error: "ID de ticket no proporcionado." };
    }
    const ticketRef = doc(db, "tickets", ticketId);

    // An unauthenticated user will attempt this update.
    // The security rules MUST allow this specific operation.
    await updateDoc(ticketRef, {
      rating: rating,
      fecha_calificacion: new Date().toISOString(),
    });

    return { success: true };
  } catch (error) {
    console.error("Error updating ticket rating:", error);
    // Provide a generic error that covers permissions issues.
    return { success: false, error: "Missing or insufficient permissions." };
  }
}

export async function updateMultipleClients(updates: { id: string; data: Partial<Client> }[]): Promise<void> {
    try {
        const batch = writeBatch(db);
        updates.forEach(update => {
            const clientRef = doc(db, "clients", update.id);
            batch.update(clientRef, update.data);
        });
        await batch.commit();
    } catch (error) {
        console.error("Error updating multiple clients:", error);
        throw error;
    }
}
