-- CreateTable
CREATE TABLE "daily_canvas" (
    "date" DATE NOT NULL,
    "content" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_canvas_pkey" PRIMARY KEY ("date")
);
