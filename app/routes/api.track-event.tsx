import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

/**
 * API endpoint for tracking attribution events
 * Used for event-based attribution to track user journey
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
      email,
      eventType, // "page_view", "add_to_cart", "checkout_started", "order_placed"
      sessionId,
      browserFingerprint,
      metadata = {},
    } = body;

    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!eventType) {
      return new Response(JSON.stringify({ error: "Event type is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const validEventTypes = [
      "page_view",
      "add_to_cart",
      "checkout_started",
      "order_placed",
    ];
    
    if (!validEventTypes.includes(eventType)) {
      return new Response(
        JSON.stringify({
          error: `Event type must be one of: ${validEventTypes.join(", ")}`,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Find the email capture record
    const emailCapture = await prisma.emailCapture.findFirst({
      where: {
        shop,
        email,
        attributionMethod: "event",
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!emailCapture) {
      return new Response(
        JSON.stringify({ error: "Email capture not found for this email" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Create attribution event
    await prisma.attributionEvent.create({
      data: {
        emailCaptureId: emailCapture.id,
        eventType,
        sessionId,
        browserFingerprint,
        metadata: JSON.stringify({
          ...metadata,
          timestamp: new Date().toISOString(),
        }),
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Attribution event tracked successfully",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error tracking attribution event:", error);
    return new Response(
      JSON.stringify({ error: "Failed to track attribution event" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
