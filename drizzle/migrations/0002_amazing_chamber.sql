DROP INDEX `chs_company_recorded_idx`;--> statement-breakpoint
CREATE UNIQUE INDEX `chs_company_recorded_uniq` ON `company_headcount_snapshots` (`company_id`,`recorded_at`);--> statement-breakpoint
DROP INDEX `cno_user_company_idx`;--> statement-breakpoint
ALTER TABLE `companies` ADD `logo_status` text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `companies` ADD `logo_checked_at` integer;--> statement-breakpoint
CREATE INDEX `companies_logo_status_idx` ON `companies` (`logo_status`);