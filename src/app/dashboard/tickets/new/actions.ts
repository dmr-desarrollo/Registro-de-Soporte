
"use server";

import nodemailer from "nodemailer";
import { getClients } from "@/lib/firestore";
import { firebaseConfig } from "@/lib/firebase";

// Configuración ajustada para máxima compatibilidad con servidores SMTP estrictos como Office 365.
const transporter = nodemailer.createTransport({
    host: "smtp.office365.com",
    port: 587,
    secure: false, // Inicia la conexión en texto plano y luego la actualiza a TLS (STARTTLS)
    auth: {
        user: "Soporte@dmr.com.uy",
        pass: "Convenio-828",
    },
    tls: {
        // Es crucial para entornos que usan certificados autofirmados o tienen configuraciones específicas
        rejectUnauthorized: false
    }
});


export async function sendEscalationEmail(data: { clientId: number; contactPhone: string; problemDescription: string; escalationEmail: string; escalationNotes: string; }) {
    let clientName = "No encontrado";
    try {
        const clients = await getClients();
        clientName = clients.find(c => c.id === data.clientId)?.name || "No encontrado";
        await transporter.sendMail({
            from: `Sistema de Soporte <Soporte@dmr.com.uy>`,
            to: data.escalationEmail,
            subject: `Nuevo Ticket Escalado - Cliente: ${clientName}`,
            html: `
                <h1>Ticket de Soporte Escalado</h1>
                <p>Se ha registrado un nuevo ticket que requiere escalación.</p>
                
                <h2>Notas de Escalación:</h2>
                <pre style="background-color: #fffbe6; padding: 10px; border-radius: 5px; border: 1px solid #f0c000;">${data.escalationNotes}</pre>

                <h2>Detalles del Ticket:</h2>
                <ul>
                    <li><strong>Cliente:</strong> ${clientName}</li>
                    <li><strong>Teléfono de Contacto:</strong> ${data.contactPhone}</li>
                    <li><strong>Descripción del Problema:</strong></li>
                </ul>
                <pre style="background-color: #f4f4f4; padding: 10px; border-radius: 5px;">${data.problemDescription}</pre>
                <p><em>Este es un correo generado automáticamente por el Sistema de Registro de Soporte.</em></p>
            `,
        });

        console.log("Correo de escalación enviado a:", data.escalationEmail);
        return { success: true, clientName };

    } catch (error) {
        console.error("--- ERROR AL ENVIAR CORREO DE ESCALACIÓN ---");
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : "Error desconocido al enviar correo.";
        return { success: false, error: `No se pudo enviar el correo. ${errorMessage}`, clientName };
    }
}


export async function sendSurveyEmail(data: { 
    clientEmail: string, 
    clientId: number, 
    ticketId: string, 
    ticketDocId: number, 
    contactPersonName: string, 
    technicianName: string,
    baseUrl?: string // Nueva propiedad opcional para la URL base
}) {
    if (!data.clientEmail || data.clientEmail === "completar@cliente.com") {
        console.error("Error al enviar encuesta: el cliente no tiene un email registrado o válido.", { clientId: data.clientId, ticketId: data.ticketId });
        return { success: false, error: "El cliente no tiene un email registrado o válido." };
    }

    let client: Awaited<ReturnType<typeof getClients>>[number] | undefined;
    try {
        const clients = await getClients();
        client = clients.find(c => c.id === data.clientId);

        const clientNameForGreeting = data.contactPersonName || client?.name || 'Estimado Cliente';
        const technicianNameToDisplay = data.technicianName || 'nuestro equipo';

        // Prioriza la URL base proporcionada (del cliente) o usa la de Firebase Hosting por defecto.
        const appUrl = data.baseUrl || `https://${firebaseConfig.projectId}.firebaseapp.com`;

        await transporter.sendMail({
            from: `Sistema de Soporte <Soporte@dmr.com.uy>`,
            to: data.clientEmail,
            subject: `¿Cómo fue su experiencia con nuestro soporte técnico? (Ticket ${data.ticketId})`,
            html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 20px auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
                    <div style="background-color: #f4f4f4; padding: 20px; text-align: center;">
                        <h1 style="margin: 0; color: #0056b3;">Valore su experiencia de soporte</h1>
                    </div>
                    <div style="padding: 20px 30px;">
                        <p>Hola <strong>${clientNameForGreeting}</strong>,</p>
                        <p>
                            Recientemente ha recibido asistencia de <strong>${technicianNameToDisplay}</strong> para el ticket de soporte N° <strong>${data.ticketId}</strong>.
                        </p>
                        <p>
                            Su opinión es muy importante para nosotros. Por favor, tómese un momento para calificar la calidad del servicio que recibió haciendo clic en una de las siguientes opciones:
                        </p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${appUrl}/survey/thanks?rating=3&ticket=${data.ticketDocId}" style="text-decoration: none; color: white; background-color: #28a745; padding: 12px 22px; border-radius: 5px; margin: 5px; font-size: 16px; display: inline-block;">Excelente</a>
                            <a href="${appUrl}/survey/thanks?rating=2&ticket=${data.ticketDocId}" style="text-decoration: none; color: white; background-color: #ffc107; padding: 12px 22px; border-radius: 5px; margin: 5px; font-size: 16px; display: inline-block;">Bueno</a>
                            <a href="${appUrl}/survey/thanks?rating=1&ticket=${data.ticketDocId}" style="text-decoration: none; color: white; background-color: #dc3545; padding: 12px 22px; border-radius: 5px; margin: 5px; font-size: 16px; display: inline-block;">Regular</a>
                        </div>
                        <p>¡Gracias por ayudarnos a mejorar!</p>
                        <p><em>- El equipo de Soporte Técnico</em></p>
                    </div>
                    <div style="background-color: #f9f9f9; padding: 15px; text-align: center; font-size: 12px; color: #777;">
                        Este es un correo generado automáticamente. Por favor, no responda a este mensaje.
                    </div>
                </div>
            `,
        });

        console.log("Correo de encuesta enviado a:", data.clientEmail);
        return { success: true, clientName: client?.name || "Cliente" };

    } catch (error) {
        console.error("--- ERROR AL ENVIAR CORREO DE ENCUESTA ---");
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : "Error desconocido al enviar la encuesta.";
        return { success: false, error: `No se pudo enviar la encuesta. ${errorMessage}`, clientName: client?.name || "Cliente" };
    }
}
