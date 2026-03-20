CREATE TABLE `companies` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`coresignal_company_id` integer,
	`coresignal_shorthand` text,
	`industry` text DEFAULT '' NOT NULL,
	`website` text DEFAULT '' NOT NULL,
	`logo_url` text DEFAULT '' NOT NULL,
	`country` text DEFAULT '' NOT NULL,
	`employee_range` text DEFAULT '' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `company_headcount_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`headcount` integer NOT NULL,
	`recorded_at` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `chs_company_idx` ON `company_headcount_snapshots` (`company_id`);--> statement-breakpoint
CREATE INDEX `chs_company_recorded_idx` ON `company_headcount_snapshots` (`company_id`,`recorded_at`);--> statement-breakpoint
CREATE TABLE `company_news` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`url` text DEFAULT '' NOT NULL,
	`source_name` text DEFAULT '' NOT NULL,
	`published_at` text DEFAULT '' NOT NULL,
	`sentiment_score` integer DEFAULT 50 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `cn_company_idx` ON `company_news` (`company_id`);--> statement-breakpoint
CREATE INDEX `cn_company_published_idx` ON `company_news` (`company_id`,`published_at`);--> statement-breakpoint
CREATE TABLE `user_portfolio_companies` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`company_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `upc_user_idx` ON `user_portfolio_companies` (`user_id`);--> statement-breakpoint
CREATE INDEX `upc_company_idx` ON `user_portfolio_companies` (`company_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `upc_user_company_uniq` ON `user_portfolio_companies` (`user_id`,`company_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`display_name` text NOT NULL,
	`headcount_drop_threshold` integer DEFAULT 10 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);