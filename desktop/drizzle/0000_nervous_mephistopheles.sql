CREATE TABLE `historico` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`codigo` text NOT NULL,
	`nota` integer NOT NULL,
	`data_execucao` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `musicas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`codigo` text NOT NULL,
	`artista` text NOT NULL,
	`titulo` text NOT NULL,
	`arquivo` text NOT NULL,
	`nome_arquivo` text,
	`criado_em` integer NOT NULL,
	`atualizado_em` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `musicas_codigo_unique` ON `musicas` (`codigo`);