-- CreateTable
CREATE TABLE "EmailCapture" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "sessionId" TEXT,
    "browserFingerprint" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "referrer" TEXT,
    "discountCode" TEXT,
    "attributionMethod" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "customerEmail" TEXT,
    "discountCode" TEXT,
    "totalPrice" REAL NOT NULL,
    "currency" TEXT NOT NULL,
    "orderNumber" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "emailCaptureId" TEXT,
    CONSTRAINT "Order_emailCaptureId_fkey" FOREIGN KEY ("emailCaptureId") REFERENCES "EmailCapture" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AttributionEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "emailCaptureId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "sessionId" TEXT,
    "browserFingerprint" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AttributionEvent_emailCaptureId_fkey" FOREIGN KEY ("emailCaptureId") REFERENCES "EmailCapture" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailCapture_discountCode_key" ON "EmailCapture"("discountCode");

-- CreateIndex
CREATE INDEX "EmailCapture_shop_idx" ON "EmailCapture"("shop");

-- CreateIndex
CREATE INDEX "EmailCapture_email_idx" ON "EmailCapture"("email");

-- CreateIndex
CREATE INDEX "EmailCapture_discountCode_idx" ON "EmailCapture"("discountCode");

-- CreateIndex
CREATE INDEX "Order_shop_idx" ON "Order"("shop");

-- CreateIndex
CREATE INDEX "Order_orderId_idx" ON "Order"("orderId");

-- CreateIndex
CREATE INDEX "Order_customerEmail_idx" ON "Order"("customerEmail");

-- CreateIndex
CREATE INDEX "Order_discountCode_idx" ON "Order"("discountCode");

-- CreateIndex
CREATE INDEX "AttributionEvent_emailCaptureId_idx" ON "AttributionEvent"("emailCaptureId");

-- CreateIndex
CREATE INDEX "AttributionEvent_sessionId_idx" ON "AttributionEvent"("sessionId");
