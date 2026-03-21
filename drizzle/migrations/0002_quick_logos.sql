ALTER TABLE `companies` ADD `logo_status` text DEFAULT 'pending' NOT NULL;
--> statement-breakpoint
ALTER TABLE `companies` ADD `logo_checked_at` integer;
--> statement-breakpoint
CREATE INDEX `companies_logo_status_idx` ON `companies` (`logo_status`);
