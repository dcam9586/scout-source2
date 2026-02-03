import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

/**
 * API endpoint for processing orders and attributing revenue
 * This should be called by a webhook when an order is placed
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  let shop: string;
  try {
    const { session } = await authenticate.admin(request);
    shop = session.shop;
  } catch (error) {
    const url = new URL(request.url);
    shop = url.searchParams.get("shop") || "test-shop.myshopify.com";
  }
  
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await request.json();
    const {
      orderId,
      customerEmail,
      discountCode,
      totalPrice,
      currency,
      orderNumber,
      sessionId,
      browserFingerprint,
    } = body;

    if (!orderId || !totalPrice) {
      return new Response(
        JSON.stringify({ error: "Order ID and total price are required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    let emailCaptureId = null;

    // Code-based attribution: match by discount code
    if (discountCode) {
      const emailCapture = await prisma.emailCapture.findFirst({
        where: {
          shop,
          discountCode,
          attributionMethod: "code",
        },
      });

      if (emailCapture) {
        emailCaptureId = emailCapture.id;
      }
    }

    // Event-based attribution: match by customer email, session, or browser fingerprint
    if (!emailCaptureId && (customerEmail || sessionId || browserFingerprint)) {
      const emailCapture = await prisma.emailCapture.findFirst({
        where: {
          shop,
          attributionMethod: "event",
          OR: [
            customerEmail ? { email: customerEmail } : {},
            sessionId ? { sessionId } : {},
            browserFingerprint ? { browserFingerprint } : {},
          ].filter(condition => Object.keys(condition).length > 0),
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (emailCapture) {
        emailCaptureId = emailCapture.id;
        
        // Track the order_placed event
        await prisma.attributionEvent.create({
          data: {
            emailCaptureId: emailCapture.id,
            eventType: "order_placed",
            sessionId,
            browserFingerprint,
            metadata: JSON.stringify({
              orderId,
              totalPrice,
              currency,
              timestamp: new Date().toISOString(),
            }),
          },
        });
      }
    }

    // Create order record
    const order = await prisma.order.create({
      data: {
        shop,
        orderId,
        customerEmail,
        discountCode,
        totalPrice,
        currency,
        orderNumber,
        emailCaptureId,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        orderId: order.id,
        attributed: !!emailCaptureId,
        attributionMethod: emailCaptureId
          ? (await prisma.emailCapture.findUnique({
              where: { id: emailCaptureId },
            }))?.attributionMethod
          : null,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error processing order:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process order" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
