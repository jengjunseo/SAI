CREATE TABLE `cluster_decisions` (
	`run_id` text NOT NULL,
	`candidate_id` text NOT NULL,
	`issue_id` text NOT NULL,
	`representative_id` text NOT NULL,
	`score` integer NOT NULL,
	`decision` text NOT NULL,
	`signals` text NOT NULL,
	`matcher_version` text NOT NULL,
	`method` text NOT NULL,
	PRIMARY KEY(`run_id`, `candidate_id`, `issue_id`),
	FOREIGN KEY (`run_id`) REFERENCES `cluster_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`candidate_id`) REFERENCES `news_candidates`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`representative_id`) REFERENCES `news_candidates`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `cluster_decision_state_idx` ON `cluster_decisions` (`run_id`,`decision`);--> statement-breakpoint
CREATE TABLE `cluster_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`matcher_version` text NOT NULL,
	`started_at` integer NOT NULL,
	`completed_at` integer,
	`status` text NOT NULL,
	`candidate_count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `shadow_cluster_members` (
	`run_id` text NOT NULL,
	`candidate_id` text NOT NULL,
	`issue_id` text NOT NULL,
	`representative_id` text NOT NULL,
	PRIMARY KEY(`run_id`, `candidate_id`),
	FOREIGN KEY (`run_id`) REFERENCES `cluster_runs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`candidate_id`) REFERENCES `news_candidates`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`representative_id`) REFERENCES `news_candidates`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `shadow_member_issue_idx` ON `shadow_cluster_members` (`run_id`,`issue_id`);