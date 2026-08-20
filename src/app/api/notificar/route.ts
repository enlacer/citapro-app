import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// Inicializa Resend usando la variable de entorno
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { email, nombre, fecha, servicio } = await request.json();

    const { data, error } = await resend.emails.send({
      from: 'CitaPro <onboarding@resend.dev>', // Usamos el dominio de pruebas por defecto de Resend
      to: [email], // El correo del cliente que hizo la reserva
      subject: `Confirmación de tu cita: ${servicio}`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
          <h2 style="color: #2563eb; text-align: center;">¡Cita Confirmada en CitaPro!</h2>
          <p>Hola <strong>${nombre}</strong>,</p>
          <p>Te confirmamos que tu cita ha sido agendada con éxito. A continuación los detalles:</p>
          <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Servicio:</strong> ${servicio}</p>
            <p style="margin: 5px 0;"><strong>Fecha y Hora:</strong> ${fecha}</p>
          </div>
          <p style="font-size: 14px; color: #666;">Si necesitas cancelar o reprogramar, por favor comunícate con nosotros.</p>
          <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;" />
          <p style="font-size: 12px; text-align: center; color: #999;">CitaPro - Sistema de Gestión de Citas</p>
        </div>
      `,
    });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error enviando correo con Resend:', error);
    return NextResponse.json({ error: error.message || 'Error interno al enviar correo' }, { status: 500 });
  }
}