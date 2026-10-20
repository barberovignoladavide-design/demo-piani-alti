CREATE TABLE `orders` (
	`code` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`size` text NOT NULL,
	`quantity` integer NOT NULL,
	`unit_price` integer NOT NULL,
	`total` integer NOT NULL,
	`payment` text NOT NULL,
	`payment_status` text DEFAULT 'pending' NOT NULL,
	`production_status` text DEFAULT 'queued' NOT NULL
);
