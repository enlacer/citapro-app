import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// Pon tu API key real en tu archivo .env.local: RESEND_API_KEY=re_123456...
const resend = new Resend(process.env.RESEND_API_KEY || 'TU_API_KEY_AQUI');

export async function POST(request: Request) {
  try {
    const { email, nombre, fecha, servicio } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'No se proporcionó email' }, { status: 400 });
    }

    const data = await resend.emails.send({
      from: 'CitaPro <onboarding@resend.dev>', // Cambia esto cuando verifiques tu dominio
      to: [email],
      subject: `Confirmación de tu cita: ${servicio} en CitaPro`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h1 style="color: #2563eb;">¡Hola ${nombre}!</h1>
          <p>Tu cita ha sido reservada con éxito en <strong>CitaPro</strong>.</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Servicio:</strong> ${servicio}</p>
            <p><strong>Fecha y Hora:</strong> ${fecha}</p>
          </div>
          <p>Si necesitas cancelar o reprogramar, por favor contáctanos con anticipación.</p>
          <p>¡Te esperamos!</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ error: 'Error enviando el correo' }, { status: 500 });
  }
}