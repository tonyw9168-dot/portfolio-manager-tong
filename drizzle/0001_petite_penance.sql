CREATE TABLE `asset_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(64) NOT NULL,
	`suggestedRatio` decimal(5,4),
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `asset_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `asset_categories_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `asset_values` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assetId` int NOT NULL,
	`snapshotId` int NOT NULL,
	`originalValue` decimal(18,2),
	`cnyValue` decimal(18,2) NOT NULL,
	`changeFromPrevious` decimal(18,2),
	`currentRatio` decimal(8,6),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `asset_values_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `assets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`categoryId` int NOT NULL,
	`name` varchar(128) NOT NULL,
	`currency` varchar(8) NOT NULL DEFAULT 'CNY',
	`suggestedRatio` decimal(5,4),
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `assets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cash_flows` (
	`id` int AUTO_INCREMENT NOT NULL,
	`flowDate` date NOT NULL,
	`flowType` enum('inflow','outflow') NOT NULL,
	`sourceAccount` varchar(64),
	`targetAccount` varchar(64),
	`assetName` varchar(128),
	`originalAmount` decimal(18,2) NOT NULL,
	`currency` varchar(8) NOT NULL DEFAULT 'CNY',
	`cnyAmount` decimal(18,2) NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cash_flows_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `exchange_rates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fromCurrency` varchar(8) NOT NULL,
	`toCurrency` varchar(8) NOT NULL DEFAULT 'CNY',
	`rate` decimal(10,4) NOT NULL,
	`effectiveDate` date NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `exchange_rates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `portfolio_summary` (
	`id` int AUTO_INCREMENT NOT NULL,
	`snapshotId` int NOT NULL,
	`totalValue` decimal(18,2) NOT NULL,
	`changeFromPrevious` decimal(18,2),
	`changeFromTwoPrevious` decimal(18,2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `portfolio_summary_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`snapshotDate` date NOT NULL,
	`label` varchar(16) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `snapshots_id` PRIMARY KEY(`id`)
);
