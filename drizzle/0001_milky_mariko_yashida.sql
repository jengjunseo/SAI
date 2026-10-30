CREATE TABLE `feed_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`source_key` text NOT NULL,
	`started_at` integer NOT NULL,
	`finished_at` integer,
	`status` text NOT NULL,
	`candidates_count` integer DEFAULT 0 NOT NULL,
	`error_code` text
);
--> statement-breakpoint
CREATE INDEX `feed_runs_source_idx` ON `feed_runs` (`source_key`,`started_at`);--> statement-breakpoint
CREATE TABLE `issue_candidates` (
	`issue_id` text NOT NULL,
	`candidate_id` text NOT NULL,
	`match_score` integer NOT NULL,
	PRIMARY KEY(`issue_id`, `candidate_id`),
	FOREIGN KEY (`issue_id`) REFERENCES `news_issues`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`candidate_id`) REFERENCES `news_candidates`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `issue_candidate_lookup_idx` ON `issue_candidates` (`candidate_id`);--> statement-breakpoint
CREATE TABLE `news_candidates` (
	`id` text PRIMARY KEY NOT NULL,
	`source_key` text NOT NULL,
	`publisher` text NOT NULL,
	`publisher_group` text NOT NULL,
	`discovery_url` text NOT NULL,
	`canonical_url` text,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`category` text NOT NULL,
	`published_at` text NOT NULL,
	`discovered_at` integer NOT NULL,
	`resolution_status` text DEFAULT 'metadata_only' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `candidate_time_idx` ON `news_candidates` (`published_at`);--> statement-breakpoint
CREATE INDEX `candidate_url_idx` ON `news_candidates` (`canonical_url`);--> statement-breakpoint
CREATE TABLE `news_issues` (
	`id` text PRIMARY KEY NOT NULL,
	`headline` text NOT NULL,
	`category` text NOT NULL,
	`status` text DEFAULT 'discovered' NOT NULL,
	`rank_score` integer DEFAULT 0 NOT NULL,
	`anchor_article_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`anchor_article_id`) REFERENCES `articles`(`id`) ON UPDATE no action ON DELETE no action
);
