CREATE TABLE `catalogProducts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sku` varchar(100) NOT NULL,
	`name` varchar(300) NOT NULL,
	`slug` varchar(340) NOT NULL,
	`brand` varchar(120) NOT NULL,
	`category` enum('laundry','kitchen','refrigeration','dishwashing') NOT NULL,
	`productType` enum('equipment','spare_part') NOT NULL,
	`authenticity` enum('genuine_oem','compatible','alternative') NOT NULL,
	`model` varchar(160),
	`summary` text NOT NULL,
	`specifications` json,
	`priceKsh` decimal(12,2),
	`availability` enum('in_stock','on_order','quote_only') NOT NULL DEFAULT 'quote_only',
	`leadTime` varchar(120),
	`imageUrl` text,
	`datasheetUrl` text,
	`isPublished` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `catalogProducts_id` PRIMARY KEY(`id`),
	CONSTRAINT `catalogProducts_sku_unique` UNIQUE(`sku`),
	CONSTRAINT `catalogProducts_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `procurementRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reference` varchar(40) NOT NULL,
	`customerId` int,
	`requestType` enum('find_part','procurement','quick_order','rfq') NOT NULL,
	`status` enum('new','review','sourcing','quoted','approved','ordered','delivered','closed') NOT NULL DEFAULT 'new',
	`brand` varchar(120),
	`equipmentType` varchar(160),
	`model` varchar(160),
	`partNumber` varchar(160),
	`quantity` int,
	`description` text NOT NULL,
	`deliveryLocation` varchar(220),
	`requiredDeliveryDate` timestamp,
	`attachmentKeys` json,
	`internalNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `procurementRequests_id` PRIMARY KEY(`id`),
	CONSTRAINT `procurementRequests_reference_unique` UNIQUE(`reference`)
);
--> statement-breakpoint
CREATE TABLE `quotationRevisions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quotationId` int NOT NULL,
	`revisionNumber` int NOT NULL,
	`documentKey` text,
	`publicNote` text,
	`privateCostSnapshot` json NOT NULL,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `quotationRevisions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quotations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reference` varchar(40) NOT NULL,
	`customerId` int NOT NULL,
	`procurementRequestId` int,
	`status` enum('draft','sent','accepted','rejected','expired') NOT NULL DEFAULT 'draft',
	`currency` varchar(6) NOT NULL DEFAULT 'KES',
	`subtotal` decimal(12,2) NOT NULL DEFAULT '0',
	`vat` decimal(12,2) NOT NULL DEFAULT '0',
	`total` decimal(12,2) NOT NULL DEFAULT '0',
	`validUntil` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `quotations_id` PRIMARY KEY(`id`),
	CONSTRAINT `quotations_reference_unique` UNIQUE(`reference`)
);
--> statement-breakpoint
CREATE TABLE `searchEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`query` varchar(300) NOT NULL,
	`resultCount` int NOT NULL,
	`source` enum('header','catalog','part_search') NOT NULL DEFAULT 'catalog',
	`userId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `searchEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `supplierProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`supplierName` varchar(220) NOT NULL,
	`country` varchar(100),
	`contactName` varchar(160),
	`contactEmail` varchar(320),
	`leadTimeNotes` text,
	`performanceNotes` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `supplierProfiles_id` PRIMARY KEY(`id`)
);
