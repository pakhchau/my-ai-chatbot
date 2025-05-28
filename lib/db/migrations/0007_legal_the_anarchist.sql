CREATE TABLE IF NOT EXISTS "AITrigger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"taskId" uuid,
	"triggerType" varchar(50) NOT NULL,
	"triggerTime" timestamp NOT NULL,
	"isExecuted" boolean DEFAULT false,
	"message" text,
	"chatId" uuid,
	"createdAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Task" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"dueDate" timestamp,
	"priority" varchar(20) DEFAULT 'medium',
	"status" varchar(20) DEFAULT 'pending',
	"createdAt" timestamp NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "AITrigger" ADD CONSTRAINT "AITrigger_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "AITrigger" ADD CONSTRAINT "AITrigger_taskId_Task_id_fk" FOREIGN KEY ("taskId") REFERENCES "public"."Task"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "AITrigger" ADD CONSTRAINT "AITrigger_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Task" ADD CONSTRAINT "Task_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
