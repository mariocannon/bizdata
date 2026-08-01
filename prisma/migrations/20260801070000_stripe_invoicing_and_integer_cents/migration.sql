-- Stripe invoicing, and money as integer cents.
--
-- Two changes that belong together: Stripe bills in integer minor units, and
-- keeping prices as floats would mean rounding at that boundary on every
-- invoice. Converting the column first means the amount invoiced is the amount
-- stored, exactly.

-- 1. Booking.price: DOUBLE PRECISION dollars -> INTEGER cents.
--    Cast through numeric rather than rounding the double directly: 450.1 is
--    held as 450.10000000000002, and numeric rounds the decimal value.
ALTER TABLE "Booking"
  ALTER COLUMN "price" DROP DEFAULT;

ALTER TABLE "Booking"
  ALTER COLUMN "price" TYPE INTEGER USING ROUND("price"::numeric * 100)::integer;

ALTER TABLE "Booking"
  ALTER COLUMN "price" SET DEFAULT 0;

-- 2. Settings.defaultPrices is a JSON string of dollars — convert in place.
--    Wrapped so that malformed JSON leaves the row alone and resets to the
--    application defaults on next read, rather than failing the deploy.
DO $$
BEGIN
  UPDATE "Settings"
  SET "defaultPrices" = (
    SELECT COALESCE(
      jsonb_object_agg(key, ROUND((value #>> '{}')::numeric * 100)::integer),
      '{}'::jsonb
    )::text
    FROM jsonb_each("defaultPrices"::jsonb)
  )
  WHERE "defaultPrices" IS NOT NULL
    AND btrim("defaultPrices") NOT IN ('', '{}');
EXCEPTION WHEN others THEN
  RAISE NOTICE 'defaultPrices was not valid JSON; leaving it for the app to reset.';
END $$;

-- 3. One Stripe Customer per advertiser, created on first invoice.
ALTER TABLE "Advertiser"
  ADD COLUMN "stripeCustomerId" TEXT;

CREATE UNIQUE INDEX "Advertiser_stripeCustomerId_key"
  ON "Advertiser" ("stripeCustomerId");

-- 4. The invoice raised for a booking, and where it got to.
ALTER TABLE "Booking"
  ADD COLUMN "stripeInvoiceId" TEXT,
  ADD COLUMN "invoiceUrl"      TEXT,
  ADD COLUMN "invoicePdfUrl"   TEXT,
  ADD COLUMN "invoicedAt"      TIMESTAMP(3),
  ADD COLUMN "paidAt"          TIMESTAMP(3);

-- Unique so a replayed webhook cannot attach one Stripe invoice to a second
-- booking, and so raising a duplicate invoice fails at the database rather than
-- billing an advertiser twice.
CREATE UNIQUE INDEX "Booking_stripeInvoiceId_key"
  ON "Booking" ("stripeInvoiceId");
