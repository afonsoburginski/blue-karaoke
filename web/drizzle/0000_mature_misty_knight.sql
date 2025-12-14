CREATE TABLE "estatisticas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"total_usuarios" integer DEFAULT 0,
	"total_musicas" integer DEFAULT 0,
	"total_gb" integer DEFAULT 0,
	"receita_mensal" integer DEFAULT 0,
	"mes_referencia" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "historico" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"musica_id" uuid NOT NULL,
	"codigo" text NOT NULL,
	"nota" integer NOT NULL,
	"data_execucao" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "musicas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" text NOT NULL,
	"artista" text NOT NULL,
	"titulo" text NOT NULL,
	"arquivo" text NOT NULL,
	"nome_arquivo" text,
	"tamanho" integer,
	"duracao" integer,
	"user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "musicas_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"avatar" text,
	"role" text DEFAULT 'user' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_slug_unique" UNIQUE("slug"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "estatisticas" ADD CONSTRAINT "estatisticas_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historico" ADD CONSTRAINT "historico_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historico" ADD CONSTRAINT "historico_musica_id_musicas_id_fk" FOREIGN KEY ("musica_id") REFERENCES "public"."musicas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "musicas" ADD CONSTRAINT "musicas_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;