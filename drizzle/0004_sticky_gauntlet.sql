ALTER TABLE `quotations` ADD `customerName` varchar(180) NOT NULL;--> statement-breakpoint
ALTER TABLE `quotations` ADD `customerName` varchar(180) NOT NULL DEFAULT 'Unassigned customer';--> statement-breakpoint
ALTER TABLE `quotations` ADD `validityNote` varchar(120) NOT NULL DEFAULT '14 days';--> statement-breakpoint
ALTER TABLE `quotations` ADD `leadTime` varchar(120);--> statement-breakpoint
ALTER TABLE `quotations` ADD `deliveryNote` text;
