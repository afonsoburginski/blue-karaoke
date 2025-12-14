CREATE TABLE "assinaturas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"plano" text NOT NULL,
	"status" text DEFAULT 'ativa' NOT NULL,
	"data_inicio" timestamp DEFAULT now() NOT NULL,
	"data_fim" timestamp NOT NULL,
	"valor" integer NOT NULL,
	"renovacao_automatica" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "assinaturas_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "chaves_ativacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chave" text NOT NULL,
	"user_id" uuid,
	"tipo" text NOT NULL,
	"status" text DEFAULT 'ativa' NOT NULL,
	"limite_tempo" integer,
	"data_inicio" timestamp,
	"data_expiracao" timestamp,
	"criado_por" uuid NOT NULL,
	"usado_em" timestamp,
	"ultimo_uso" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "chaves_ativacao_chave_unique" UNIQUE("chave")
);
--> statement-breakpoint
CREATE TABLE "sincronizacoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"dados" text NOT NULL,
	"status" text DEFAULT 'pendente' NOT NULL,
	"data_sincronizacao" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "user_type" text DEFAULT 'subscriber' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "assinaturas" ADD CONSTRAINT "assinaturas_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chaves_ativacao" ADD CONSTRAINT "chaves_ativacao_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chaves_ativacao" ADD CONSTRAINT "chaves_ativacao_criado_por_users_id_fk" FOREIGN KEY ("criado_por") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sincronizacoes" ADD CONSTRAINT "sincronizacoes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;