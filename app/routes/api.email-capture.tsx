import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import crypto from "crypto";

/**
 * API endpoint for capturing emails with optional discount code generation
 * Supports both code-based and event-based attribution methods
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  // For storefront API, we might not need full admin authentication
  // In production, this should be secured with storefront API tokens
  let shop: string;
  try {
    const { session } = await authenticate.admin(request);
    shop = session.shop;
  } catch (error) {
    // If admin auth fails, try to get shop from request params or headers
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
      attributionMethod = "code", // "code" or "event"
      generateDiscountCode = true,
      sessionId,
      browserFingerprint,
      referrer,
    } = body;

    if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return new Response(JSON.stringify({ error: "Valid email is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!["code", "event"].includes(attributionMethod)) {
      return new Response(
        JSON.stringify({ error: "Attribution method must be 'code' or 'event'" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Generate unique discount code if requested
    let discountCode = null;
    if (attributionMethod === "code" && generateDiscountCode) {
      discountCode = `EMAIL-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    }

    // Get request metadata
    const ipAddress = request.headers.get("x-forwarded-for") || 
                      request.headers.get("x-real-ip") || 
                      "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    // Create email capture record
    const emailCapture = await prisma.emailCapture.create({
      data: {
        shop,
        email,
        sessionId,
        browserFingerprint,
        ipAddress,
        userAgent,
        referrer,
        discountCode,
        attributionMethod,
      },
    });

    // For event-based attribution, create initial capture event
    if (attributionMethod === "event") {
      await prisma.attributionEvent.create({
        data: {
          emailCaptureId: emailCapture.id,
          eventType: "email_captured",
          sessionId,
          browserFingerprint,
          metadata: JSON.stringify({
            referrer,
            timestamp: new Date().toISOString(),
          }),
        },
      });
    }

    // In a real implementation, we would create the discount code in Shopify
    // using the Shopify Admin API
    if (discountCode) {
      // TODO: Create discount code in Shopify via GraphQL API
      // const discountCodeCreated = await createShopifyDiscountCode(shop, discountCode);
    }

    return new Response(
      JSON.stringify({
        success: true,
        captureId: emailCapture.id,
        discountCode,
        attributionMethod,
        message: discountCode
          ? `Email captured! Use code ${discountCode} for your discount.`
          : "Email captured successfully!",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error capturing email:", error);
    return new Response(
      JSON.stringify({ error: "Failed to capture email" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
