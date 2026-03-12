import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

interface LoaderData {
  stats: {
    totalCaptures: number;
    codeBasedCaptures: number;
    eventBasedCaptures: number;
    totalOrders: number;
    attributedOrders: number;
    codeAttributedOrders: number;
    eventAttributedOrders: number;
    totalRevenue: number;
    attributedRevenue: number;
    codeAttributedRevenue: number;
    eventAttributedRevenue: number;
    attributionRate: number;
    codeAttributionRate: number;
    eventAttributionRate: number;
  };
  captures: Array<{
    id: string;
    email: string;
    attributionMethod: string;
    discountCode: string | null;
    createdAt: Date;
    revenue: number;
    orderCount: number;
    eventCount: number;
  }>;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  // Get attribution statistics
  const [
    totalCaptures,
    codeBasedCaptures,
    eventBasedCaptures,
    totalOrders,
    attributedOrders,
    codeAttributedOrders,
    eventAttributedOrders,
  ] = await Promise.all([
    prisma.emailCapture.count({ where: { shop } }),
    prisma.emailCapture.count({
      where: { shop, attributionMethod: "code" },
    }),
    prisma.emailCapture.count({
      where: { shop, attributionMethod: "event" },
    }),
    prisma.order.count({ where: { shop } }),
    prisma.order.count({
      where: { shop, emailCaptureId: { not: null } },
    }),
    prisma.order.count({
      where: {
        shop,
        emailCaptureId: { not: null },
        emailCapture: { attributionMethod: "code" },
      },
    }),
    prisma.order.count({
      where: {
        shop,
        emailCaptureId: { not: null },
        emailCapture: { attributionMethod: "event" },
      },
    }),
  ]);

  // Calculate revenue by attribution method
  const orders = await prisma.order.findMany({
    where: { shop },
    include: { emailCapture: true },
  });

  const totalRevenue = orders.reduce((sum, order) => sum + order.totalPrice, 0);
  const attributedRevenue = orders
    .filter((order) => order.emailCaptureId)
    .reduce((sum, order) => sum + order.totalPrice, 0);

  const codeAttributedRevenue = orders
    .filter(
      (order) =>
        order.emailCapture?.attributionMethod === "code" &&
        order.emailCaptureId
    )
    .reduce((sum, order) => sum + order.totalPrice, 0);

  const eventAttributedRevenue = orders
    .filter(
      (order) =>
        order.emailCapture?.attributionMethod === "event" &&
        order.emailCaptureId
    )
    .reduce((sum, order) => sum + order.totalPrice, 0);

  // Get recent captures with revenue
  const recentCaptures = await prisma.emailCapture.findMany({
    where: { shop },
    include: {
      orders: true,
      _count: {
        select: { orders: true, events: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const capturesWithRevenue = recentCaptures.map((capture) => {
    const revenue = capture.orders.reduce(
      (sum, order) => sum + order.totalPrice,
      0
    );
    return {
      id: capture.id,
      email: capture.email,
      attributionMethod: capture.attributionMethod,
      discountCode: capture.discountCode,
      createdAt: capture.createdAt,
      revenue,
      orderCount: capture._count.orders,
      eventCount: capture._count.events,
    };
  });

  const stats = {
    totalCaptures,
    codeBasedCaptures,
    eventBasedCaptures,
    totalOrders,
    attributedOrders,
    codeAttributedOrders,
    eventAttributedOrders,
    totalRevenue,
    attributedRevenue,
    codeAttributedRevenue,
    eventAttributedRevenue,
    attributionRate:
      totalOrders > 0 ? (attributedOrders / totalOrders) * 100 : 0,
    codeAttributionRate:
      codeBasedCaptures > 0
        ? (codeAttributedOrders / codeBasedCaptures) * 100
        : 0,
    eventAttributionRate:
      eventBasedCaptures > 0
        ? (eventAttributedOrders / eventBasedCaptures) * 100
        : 0,
  };

  return {
    stats,
    captures: capturesWithRevenue,
  };
};

export default function AttributionAnalytics() {
  const data = useLoaderData<LoaderData>();
  const stats = data?.stats || {};
  const captures = data?.captures || [];

  return (
    <s-page heading="Revenue Attribution Analytics">
      <s-section heading="Overview">
        <s-stack direction="block" gap="base">
          <s-paragraph>
            Track how your email capture widget drives revenue through both
            code-based and event-based attribution methods.
          </s-paragraph>
        </s-stack>
      </s-section>

      <s-section heading="Attribution Statistics">
        <s-stack direction="block" gap="base">
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-stack direction="block" gap="small">
              <s-text>Total Email Captures: {stats.totalCaptures || 0}</s-text>
              <s-text>Code-based: {stats.codeBasedCaptures || 0} | Event-based: {stats.eventBasedCaptures || 0}</s-text>
            </s-stack>
          </s-box>

          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-stack direction="block" gap="small">
              <s-text>Total Orders: {stats.totalOrders || 0}</s-text>
              <s-text>Attributed: {stats.attributedOrders || 0} ({(stats.attributionRate || 0).toFixed(1)}%)</s-text>
            </s-stack>
          </s-box>

          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-stack direction="block" gap="small">
              <s-text>Total Revenue: ${(stats.totalRevenue || 0).toFixed(2)}</s-text>
              <s-text>Attributed: ${(stats.attributedRevenue || 0).toFixed(2)}</s-text>
            </s-stack>
          </s-box>
        </s-stack>
      </s-section>

      <s-section heading="Attribution Method Comparison">
        <s-stack direction="block" gap="base">
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-stack direction="block" gap="small">
              <s-text>Code-Based Attribution</s-text>
              <s-text>
                Orders: {stats.codeAttributedOrders || 0} (
                {(stats.codeAttributionRate || 0).toFixed(1)}% of captures)
              </s-text>
              <s-text>
                Revenue: ${(stats.codeAttributedRevenue || 0).toFixed(2)}
              </s-text>
              <s-paragraph>
                ✅ Pros: High confidence, direct correlation
                <br />
                ⚠️ Cons: Undercounts (not all customers use the code)
              </s-paragraph>
            </s-stack>
          </s-box>

          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-stack direction="block" gap="small">
              <s-text>Event-Based Attribution</s-text>
              <s-text>
                Orders: {stats.eventAttributedOrders || 0} (
                {(stats.eventAttributionRate || 0).toFixed(1)}% of captures)
              </s-text>
              <s-text>
                Revenue: ${(stats.eventAttributedRevenue || 0).toFixed(2)}
              </s-text>
              <s-paragraph>
                ✅ Pros: Higher coverage, captures more conversions
                <br />
                ⚠️ Cons: Less precise, privacy constraints
              </s-paragraph>
            </s-stack>
          </s-box>
        </s-stack>
      </s-section>

      <s-section heading="Recent Email Captures">
        {captures.length === 0 ? (
          <s-paragraph>No email captures yet.</s-paragraph>
        ) : (
          <s-stack direction="block" gap="small">
            {captures.map((capture) => (
              <s-box
                key={capture.id}
                padding="base"
                borderWidth="base"
                borderRadius="base"
              >
                <s-stack direction="block" gap="small">
                  <s-text>{capture.email}</s-text>
                  <s-text>
                    Method: {capture.attributionMethod} |{" "}
                    {capture.discountCode
                      ? `Code: ${capture.discountCode}`
                      : "No code"}
                  </s-text>
                  <s-text>
                    Orders: {capture.orderCount} | Revenue: $
                    {capture.revenue.toFixed(2)}
                  </s-text>
                  {capture.attributionMethod === "event" && (
                    <s-text>
                      Events tracked: {capture.eventCount}
                    </s-text>
                  )}
                  <s-text>
                    Captured: {new Date(capture.createdAt).toLocaleString()}
                  </s-text>
                </s-stack>
              </s-box>
            ))}
          </s-stack>
        )}
      </s-section>

      <s-section heading="Implementation Notes">
        <s-stack direction="block" gap="base">
          <s-paragraph>
            What I shipped: A hybrid approach supporting both attribution methods
          </s-paragraph>
          <s-unordered-list>
            <s-list-item>
              Code-based attribution: Generate unique discount codes per email capture. High confidence tracking when customers use the code.
            </s-list-item>
            <s-list-item>
              Event-based attribution: Track user sessions, browser fingerprints, and email matches. Better coverage but requires privacy considerations.
            </s-list-item>
          </s-unordered-list>
          <s-paragraph>
            What I learned: Use code-based for direct ROI proof and event-based for
            understanding the full customer journey. Combining both methods
            gives the most complete picture.
          </s-paragraph>
        </s-stack>
      </s-section>
    </s-page>
  );
}
