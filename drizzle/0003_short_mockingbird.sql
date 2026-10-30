CREATE TABLE `evidence_grants` (
	`candidate_id` text PRIMARY KEY NOT NULL,
	`url` text NOT NULL,
	`allow_fetch` integer NOT NULL,
	`allow_ai` integer NOT NULL,
	`independent` integer NOT NULL,
	`rights_basis` text NOT NULL,
	`independence_basis` text NOT NULL,
	`expires_at` integer,
	FOREIGN KEY (`candidate_id`) REFERENCES `news_candidates`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `shadow_debates` (
	`run_id` text NOT NULL,
	`issue_id` text NOT NULL,
	`debate` text NOT NULL,
	`generated_at` text NOT NULL,
	`model` text NOT NULL,
	`editorial_version` integer NOT NULL,
	PRIMARY KEY(`run_id`, `issue_id`),
	FOREIGN KEY (`run_id`) REFERENCES `cluster_runs`(`id`) ON UPDATE no action ON DELETE no action
);
