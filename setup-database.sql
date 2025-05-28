-- Complete Database Setup for AI Proactive Chat System
-- Run this entire script in your Supabase SQL Editor

-- First, let's check what tables already exist
DO $$
BEGIN
    RAISE NOTICE 'Checking existing tables...';
END $$;

-- Create Task table if it doesn't exist
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

-- Create AITrigger table if it doesn't exist
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

-- Add foreign key constraints (with error handling)
DO $$ 
BEGIN
    -- Task foreign key to User
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'Task_userId_User_id_fk'
    ) THEN
        ALTER TABLE "Task" ADD CONSTRAINT "Task_userId_User_id_fk" 
        FOREIGN KEY ("userId") REFERENCES "public"."User"("id") 
        ON DELETE no action ON UPDATE no action;
        RAISE NOTICE 'Added Task_userId_User_id_fk constraint';
    ELSE
        RAISE NOTICE 'Task_userId_User_id_fk constraint already exists';
    END IF;

    -- AITrigger foreign key to User
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'AITrigger_userId_User_id_fk'
    ) THEN
        ALTER TABLE "AITrigger" ADD CONSTRAINT "AITrigger_userId_User_id_fk" 
        FOREIGN KEY ("userId") REFERENCES "public"."User"("id") 
        ON DELETE no action ON UPDATE no action;
        RAISE NOTICE 'Added AITrigger_userId_User_id_fk constraint';
    ELSE
        RAISE NOTICE 'AITrigger_userId_User_id_fk constraint already exists';
    END IF;

    -- AITrigger foreign key to Task
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'AITrigger_taskId_Task_id_fk'
    ) THEN
        ALTER TABLE "AITrigger" ADD CONSTRAINT "AITrigger_taskId_Task_id_fk" 
        FOREIGN KEY ("taskId") REFERENCES "public"."Task"("id") 
        ON DELETE no action ON UPDATE no action;
        RAISE NOTICE 'Added AITrigger_taskId_Task_id_fk constraint';
    ELSE
        RAISE NOTICE 'AITrigger_taskId_Task_id_fk constraint already exists';
    END IF;

    -- AITrigger foreign key to Chat
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'AITrigger_chatId_Chat_id_fk'
    ) THEN
        ALTER TABLE "AITrigger" ADD CONSTRAINT "AITrigger_chatId_Chat_id_fk" 
        FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") 
        ON DELETE no action ON UPDATE no action;
        RAISE NOTICE 'Added AITrigger_chatId_Chat_id_fk constraint';
    ELSE
        RAISE NOTICE 'AITrigger_chatId_Chat_id_fk constraint already exists';
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error adding constraints: %', SQLERRM;
END $$;

-- Verify the setup
DO $$
DECLARE
    task_count INTEGER;
    trigger_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO task_count FROM information_schema.tables 
    WHERE table_name = 'Task' AND table_schema = 'public';
    
    SELECT COUNT(*) INTO trigger_count FROM information_schema.tables 
    WHERE table_name = 'AITrigger' AND table_schema = 'public';
    
    RAISE NOTICE 'Setup complete!';
    RAISE NOTICE 'Task table exists: %', CASE WHEN task_count > 0 THEN 'YES' ELSE 'NO' END;
    RAISE NOTICE 'AITrigger table exists: %', CASE WHEN trigger_count > 0 THEN 'YES' ELSE 'NO' END;
END $$;

-- Show all tables for verification
SELECT 
    table_name,
    CASE 
        WHEN table_name IN ('Task', 'AITrigger') THEN '✅ NEW'
        ELSE '📋 EXISTING'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY 
    CASE WHEN table_name IN ('Task', 'AITrigger') THEN 1 ELSE 2 END,
    table_name; 